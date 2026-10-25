import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { MatchActions } from "@/components/MatchActions";
import { MatchWhy } from "@/components/MatchWhy";
import type { MatchPerson } from "@/lib/client";
import { portraitFor } from "@/lib/portraits";

const FALLBACK_TONE = "#c8ced8";

function hexTone(value?: string | null): string {
  if (!value) return FALLBACK_TONE;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : FALLBACK_TONE;
}

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Soft art-print wash: a touch of the artist's tone fading into the card's own neutral fill. */
function lightWash(hex: string): string {
  return `linear-gradient(155deg, ${rgba(hex, 0.26)} 0%, ${rgba(hex, 0.08)} 45%, transparent 100%)`;
}

/** Darkens a tone for text use, scaling every channel equally so hue and saturation hold steady. */
function textTone(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const toHex = (channel: number) => Math.round(channel * 0.42).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function MatchCard({
  match,
  href,
  busy,
  onInterested,
  onSkip,
}: {
  match: MatchPerson;
  href: string;
  busy?: boolean;
  onInterested: () => void;
  onSkip: () => void;
}) {
  const lead = match.sharedArtists[0];
  const tone = hexTone(lead?.color ?? portraitFor(lead?.name)?.color);
  // Percentage labels read as "not quite a match" — keep those neutral; only color-code a real label.
  const strengthColor = match.label.endsWith("%") ? null : textTone(tone);

  return (
    <GlassCard className="p-0">
      <Link
        href={href}
        className="block cursor-pointer rounded-t-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foreground)]"
      >
        <div className="relative h-40 overflow-hidden bg-[var(--surface-soft)]">
          <div aria-hidden className="absolute inset-0" style={{ background: lightWash(tone) }} />
          {match.isDemo ? (
            <span className="pill absolute right-3 top-3 border border-white/40 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              <span className="chip-label">demo</span>
            </span>
          ) : null}
          <div className="absolute inset-x-4 bottom-3">
            <p className="font-display truncate text-[2rem] font-normal leading-none tracking-tight text-[var(--foreground)]">
              {match.name || match.handle}
            </p>
            <p className="mt-1 truncate text-sm font-normal text-[var(--muted)]">
              {[match.handle !== match.name ? `@${match.handle}` : null, match.age != null ? String(match.age) : null, match.city]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="px-4 pt-4">
          <MatchWhy
            label={match.label}
            labelColor={strengthColor}
            why={match.why}
            sharedArtists={match.sharedArtists}
            show={match.show}
          />
        </div>
      </Link>
      <div className="px-4 pb-4 pt-4">
        <MatchActions
          interested={match.interested}
          mutual={match.mutual}
          busy={busy}
          onInterested={onInterested}
          onSkip={onSkip}
          mutualHref={href}
        />
      </div>
    </GlassCard>
  );
}
