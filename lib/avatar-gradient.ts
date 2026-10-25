/**
 * Soft header washes derived from a profile photo (or a stable initials tone).
 * Client-only: samples a downscaled image via canvas, caches by URL.
 */

export type AvatarPalette = {
  /** 1–2 hex colors for the wash */
  colors: [string] | [string, string];
  /** Solid chip color when there is no photo */
  chip: string;
};

const FALLBACK_TONE = "#9aa3b2";
const SAMPLE_SIZE = 48;
/** Module cache: photo URL → palette (or null after a failed / CORS-blocked extract). */
const paletteCache = new Map<string, AvatarPalette | null>();
const inflight = new Map<string, Promise<AvatarPalette | null>>();

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toHex(r: number, g: number, b: number): string {
  const h = (channel: number) =>
    Math.round(clamp(channel, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const n = Number.parseInt(cleaned.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(200, 206, 216, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Soft art-print wash over the card's neutral header fill. */
export function softGradient(colors: [string] | [string, string]): string {
  const a = colors[0];
  const b = colors[1] ?? colors[0];
  return `linear-gradient(155deg, ${rgba(a, 0.34)} 0%, ${rgba(b, 0.14)} 48%, transparent 100%)`;
}

/**
 * Stable muted hue from a name/handle so initials avatars (and their wash)
 * stay unique per person without a photo.
 */
export function toneFromSeed(seed: string): string {
  const text = seed.trim().toLowerCase() || "?";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  // Muted mid-chroma — readable as a chip fill, soft enough for a wash.
  return hslToHex(hue, 42, 48);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Lighten / desaturate a bit so header text stays readable on the wash. */
function soften(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return FALLBACK_TONE;
  const mix = 0.28;
  return toHex(
    rgb.r + (255 - rgb.r) * mix,
    rgb.g + (255 - rgb.g) * mix,
    rgb.b + (255 - rgb.b) * mix,
  );
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Same-origin Next image optimizer URL so canvas sampling is not CORS-tainted
 * for remote Google / Supabase avatars listed in next.config remotePatterns.
 * data:/blob: URLs are used as-is.
 */
export function sampleableUrl(avatarUrl: string): string {
  const url = avatarUrl.trim();
  if (!url) return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) {
    return url;
  }
  // w must be in Next's default imageSizes / deviceSizes (16–384 / 640+).
  return `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("avatar image failed to load"));
    img.src = src;
  });
}

function quantizeChannel(value: number): number {
  // 32-step buckets keep memory tiny while preserving hue identity.
  return Math.round(value / 32) * 32;
}

function extractFromImageData(data: ImageData): [string] | [string, string] | null {
  const counts = new Map<string, { r: number; g: number; b: number; n: number }>();
  const { data: pixels } = data;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3] ?? 0;
    if (a < 200) continue;
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const lum = luminance(r, g, b);
    // Skip near-white / near-black / gray noise that washes out identity.
    if (lum > 0.92 || lum < 0.08) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18) continue;
    const qr = quantizeChannel(r);
    const qg = quantizeChannel(g);
    const qb = quantizeChannel(b);
    const key = `${qr},${qg},${qb}`;
    const prev = counts.get(key);
    if (prev) {
      prev.r += r;
      prev.g += g;
      prev.b += b;
      prev.n += 1;
    } else {
      counts.set(key, { r, g, b, n: 1 });
    }
  }

  const ranked = [...counts.values()]
    .map((entry) => ({
      hex: soften(
        toHex(entry.r / entry.n, entry.g / entry.n, entry.b / entry.n),
      ),
      n: entry.n,
    }))
    .sort((left, right) => right.n - left.n);

  if (ranked.length === 0) return null;
  const first = ranked[0]!.hex;
  const second = ranked.find((entry) => entry.hex !== first)?.hex;
  return second ? [first, second] : [first];
}

async function samplePalette(avatarUrl: string): Promise<AvatarPalette | null> {
  if (typeof window === "undefined") return null;
  try {
    const img = await loadImage(sampleableUrl(avatarUrl));
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const colors = extractFromImageData(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE));
    if (!colors) return null;
    return { colors, chip: colors[0] };
  } catch {
    return null;
  }
}

/** Cached extract; resolves null on CORS / load failure so callers can fall back. */
export function paletteFromAvatar(avatarUrl: string): Promise<AvatarPalette | null> {
  const key = avatarUrl.trim();
  if (!key) return Promise.resolve(null);
  if (paletteCache.has(key)) return Promise.resolve(paletteCache.get(key) ?? null);
  const pending = inflight.get(key);
  if (pending) return pending;
  const work = samplePalette(key).then((palette) => {
    paletteCache.set(key, palette);
    inflight.delete(key);
    return palette;
  });
  inflight.set(key, work);
  return work;
}

export function fallbackPalette(seed: string): AvatarPalette {
  const chip = toneFromSeed(seed) || FALLBACK_TONE;
  const second = soften(chip);
  return { colors: [soften(chip), second], chip };
}
