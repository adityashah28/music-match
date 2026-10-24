const USER_KEY = "resonate_user_id";
const TOKEN_KEY = "resonate_user_token";
const DRAFT_KEY = "resonate_draft";

export type DraftArtist = {
  name: string;
  imageUrl?: string;
  spotifyId?: string;
  deezerId?: string;
  genres: string[];
  color?: string;
};

export type Socials = {
  instagram: string;
  tiktok: string;
  snapchat: string;
};

export type Draft = {
  artists: DraftArtist[];
  handle: string;
  city: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
};

export type RsvpStatus = "going" | "maybe" | "not_going";

export type MatchShowItem = {
  id: string;
  artistName: string;
  venue: string;
  city: string;
  startsAt: string;
  going: "both" | "them" | "you" | null;
};

export type MatchPerson = {
  userId: string;
  handle: string;
  city: string;
  isDemo: boolean;
  label: string;
  score?: number;
  why: string;
  sharedArtists: DraftArtist[];
  show: MatchShowItem | null;
  suggestedShow: MatchShowItem | null;
  interested: boolean;
  mutual: boolean;
  socials: Socials;
};

export type ShowItem = {
  id: string;
  artistName: string;
  venue: string;
  city: string;
  startsAt: string;
  ticketUrl?: string;
  rsvp: RsvpStatus | null;
  goingCount?: number;
  tasteSummary?: string;
};

export type Profile = {
  id: string;
  handle: string;
  city: string;
  socials: Socials;
  artists: DraftArtist[];
};

export type CrowdSnapshot = {
  joined?: number;
  demoCount?: number;
  topArtists: { name: string; imageUrl?: string }[];
  goingCount?: number;
  goingPeople: { label: string }[];
};

const emptySocials = (): Socials => ({
  instagram: "",
  tiktok: "",
  snapchat: "",
});

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(USER_KEY)?.trim();
  return id ? id : null;
}

export function setUserId(id: string) {
  const trimmed = id.trim();
  if (!trimmed) return;
  localStorage.setItem(USER_KEY, trimmed);
}

/** Saved at signup. fetchJson sends it with every API call so the server knows it's really you. */
export function setUserToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return;
  localStorage.setItem(TOKEN_KEY, trimmed);
}

function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY)?.trim() || null;
}

/** Forget this device's profile, e.g. after the server rejects its token. */
export function clearUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function artistKey(artist: Pick<DraftArtist, "name" | "spotifyId" | "deezerId">) {
  return (artist.spotifyId || artist.deezerId || artist.name).trim().toLowerCase();
}

export function normalizeArtist(value: unknown): DraftArtist | null {
  const row = record(value);
  if (!row) return null;
  const name = text(row.name);
  if (!name) return null;

  let genres: string[] = [];
  if (Array.isArray(row.genres)) {
    genres = row.genres.filter((genre): genre is string => typeof genre === "string" && genre.trim().length > 0);
  } else {
    const single = text(row.genres);
    if (single) genres = [single];
  }

  return {
    name,
    imageUrl: text(row.imageUrl) ?? text(row.image_url) ?? text(row.image),
    spotifyId: text(row.spotifyId) ?? text(row.spotify_id),
    deezerId: text(row.deezerId) ?? text(row.deezer_id),
    genres,
    color: text(row.color) ?? text(row.dominantColor) ?? text(row.dominant_color_hex),
  };
}

export function normalizeSocials(value: unknown): Socials {
  const row = record(value);
  if (!row) return emptySocials();
  const nested = record(row.socials) ?? row;
  return {
    instagram: text(nested.instagram) ?? "",
    tiktok: text(nested.tiktok) ?? "",
    snapchat: text(nested.snapchat) ?? "",
  };
}

export function hasSocial(socials: Socials) {
  return Boolean(socials.instagram || socials.tiktok || socials.snapchat);
}

export function socialLinks(socials: Socials): { label: string; href: string }[] {
  const link = (value: string, label: string, base: string) => {
    if (!value) return [];
    if (/^https?:\/\//i.test(value)) return [{ label, href: value }];
    return [{ label, href: `${base}${value.replace(/^@/, "")}` }];
  };
  return [
    ...link(socials.instagram, "Instagram", "https://instagram.com/"),
    ...link(socials.tiktok, "TikTok", "https://www.tiktok.com/@"),
    ...link(socials.snapchat, "Snapchat", "https://www.snapchat.com/add/"),
  ];
}

export function primarySocial(socials: Socials): { label: string; href: string } | null {
  const link = (value: string, label: string, base: string) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return { label, href: value };
    return { label, href: `${base}${value.replace(/^@/, "")}` };
  };

  return (
    link(socials.instagram, "Open Instagram", "https://instagram.com/") ||
    link(socials.tiktok, "Open TikTok", "https://www.tiktok.com/@") ||
    link(socials.snapchat, "Open Snapchat", "https://www.snapchat.com/add/")
  );
}

function blankDraft(): Draft {
  return {
    artists: [],
    handle: "",
    city: "Berkeley",
    instagram: "",
    tiktok: "",
    snapchat: "",
  };
}

export function getDraft(): Draft {
  if (typeof window === "undefined") return blankDraft();
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return blankDraft();
    const parsed = record(JSON.parse(raw));
    if (!parsed) return blankDraft();
    const artists = Array.isArray(parsed.artists)
      ? parsed.artists
          .map(normalizeArtist)
          .filter((artist): artist is DraftArtist => artist !== null)
          .slice(0, 5)
      : [];
    return {
      artists,
      handle: typeof parsed.handle === "string" ? parsed.handle : "",
      city: text(parsed.city) ?? "Berkeley",
      instagram: typeof parsed.instagram === "string" ? parsed.instagram : "",
      tiktok: typeof parsed.tiktok === "string" ? parsed.tiktok : "",
      snapchat: typeof parsed.snapchat === "string" ? parsed.snapchat : "",
    };
  } catch {
    return blankDraft();
  }
}

export function setDraft(draft: Draft) {
  const next: Draft = {
    ...draft,
    artists: draft.artists.slice(0, 5),
    city: draft.city.trim() || "Berkeley",
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

export function userPayload(draft: Draft) {
  const socials = {
    instagram: draft.instagram.trim(),
    tiktok: draft.tiktok.trim(),
    snapchat: draft.snapchat.trim(),
  };
  return {
    handle: draft.handle.trim(),
    city: draft.city.trim() || "Berkeley",
    instagram: socials.instagram,
    tiktok: socials.tiktok,
    snapchat: socials.snapchat,
    socials,
    artists: draft.artists,
  };
}

export async function fetchJson(input: string, init?: RequestInit): Promise<unknown> {
  const token = getUserToken();
  const headers = new Headers(init?.headers);
  if (token && input.startsWith("/api/")) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  // The server doesn't recognize this device's profile: start onboarding again
  if (response.status === 401 && typeof window !== "undefined") {
    clearUser();
    window.location.href = "/";
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error("request failed");
  }
  return data;
}

export function createdUserToken(value: unknown): string | null {
  const row = record(value);
  return row ? (text(row.token) ?? null) : null;
}

export function createdUserId(value: unknown): string | null {
  const row = record(value);
  if (!row) return null;
  const nested = record(row.user);
  return text(row.id) ?? (nested ? text(nested.id) : undefined) ?? null;
}

function percentLabel(score: number) {
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${pct}% match`;
}

function normalizeMatchShow(value: unknown): MatchShowItem | null {
  const row = record(value);
  if (!row) return null;
  const id = text(row.id);
  const artistName = text(row.artistName);
  if (!id || !artistName) return null;
  const going = row.going === "both" || row.going === "them" || row.going === "you" ? row.going : null;
  return {
    id,
    artistName,
    venue: text(row.venue) ?? "",
    city: text(row.city) ?? "",
    startsAt: text(row.startsAt) ?? "",
    going,
  };
}

export function normalizeMatch(value: unknown): MatchPerson | null {
  const row = record(value);
  if (!row) return null;
  const userId = text(row.userId) ?? text(row.user_id) ?? text(row.id);
  if (!userId) return null;
  const score = typeof row.score === "number" ? row.score : undefined;
  const sharedRaw = Array.isArray(row.sharedArtists)
    ? row.sharedArtists
    : Array.isArray(row.shared_artists)
      ? row.shared_artists
      : [];
  const socialSource = record(row.socials) ?? row;
  return {
    userId,
    handle: text(row.handle) ?? "Someone",
    city: text(row.city) ?? "",
    isDemo: row.isDemo === true || row.is_demo === true,
    label: text(row.label) ?? (score !== undefined ? percentLabel(score) : "Match"),
    score,
    why: text(row.why) ?? text(row.whyText) ?? text(row.why_text) ?? "You share similar artists.",
    sharedArtists: sharedRaw
      .map(normalizeArtist)
      .filter((artist): artist is DraftArtist => artist !== null),
    show: normalizeMatchShow(row.show),
    suggestedShow: normalizeMatchShow(row.suggestedShow),
    interested: row.interested === true,
    mutual: row.mutual === true,
    socials: normalizeSocials(socialSource),
  };
}

export function normalizeMatches(value: unknown): { early: boolean; matches: MatchPerson[] } {
  if (Array.isArray(value)) {
    return {
      early: false,
      matches: value.map(normalizeMatch).filter((match): match is MatchPerson => match !== null),
    };
  }
  const row = record(value);
  const raw = row && Array.isArray(row.matches) ? row.matches : [];
  return {
    early: row?.early === true,
    matches: raw.map(normalizeMatch).filter((match): match is MatchPerson => match !== null),
  };
}

export function normalizeShow(value: unknown): ShowItem | null {
  const row = record(value);
  if (!row) return null;
  const id = text(row.id);
  if (!id) return null;
  const rsvpRaw = text(row.rsvp) ?? text(row.status);
  const rsvp: RsvpStatus | null =
    rsvpRaw === "going" || rsvpRaw === "maybe" || rsvpRaw === "not_going" ? rsvpRaw : null;
  const crowd = record(row.crowd);
  const goingCount = [row.goingCount, row.going_count, crowd?.goingCount, crowd?.going_count].find(
    (count): count is number => typeof count === "number",
  );
  return {
    id,
    artistName: text(row.artistName) ?? text(row.artist_name) ?? "Show",
    venue: text(row.venue) ?? "",
    city: text(row.city) ?? "",
    startsAt: text(row.startsAt) ?? text(row.starts_at) ?? "",
    ticketUrl: text(row.ticketUrl) ?? text(row.ticket_url),
    rsvp,
    goingCount,
    tasteSummary:
      text(row.tasteSummary) ??
      text(row.taste_summary) ??
      (crowd ? text(crowd.tasteSummary) ?? text(crowd.taste_summary) : undefined),
  };
}

export function normalizeShows(value: unknown): ShowItem[] {
  const row = record(value);
  const raw = Array.isArray(value) ? value : row && Array.isArray(row.shows) ? row.shows : [];
  return raw.map(normalizeShow).filter((show): show is ShowItem => show !== null);
}

export function normalizeProfile(value: unknown, fallbackId: string): Profile | null {
  const root = record(value);
  if (!root) return null;
  const row = record(root.user) ?? root;
  const artists = Array.isArray(row.artists)
    ? row.artists
        .map(normalizeArtist)
        .filter((artist): artist is DraftArtist => artist !== null)
        .slice(0, 5)
    : [];
  return {
    id: text(row.id) ?? fallbackId,
    handle: text(row.handle) ?? "",
    city: text(row.city) ?? "Berkeley",
    socials: normalizeSocials(record(row.socials) ?? row),
    artists,
  };
}

export function normalizeCrowd(value: unknown): CrowdSnapshot {
  const row = record(value) ?? {};
  const topRaw = Array.isArray(row.topArtists)
    ? row.topArtists
    : Array.isArray(row.top_artists)
      ? row.top_artists
      : [];
  const topArtists = topRaw
    .map((item) => {
      if (typeof item === "string" && item.trim()) return { name: item.trim() };
      const artist = normalizeArtist(item);
      return artist ? { name: artist.name, imageUrl: artist.imageUrl } : null;
    })
    .filter((artist): artist is { name: string; imageUrl?: string } => artist !== null);

  const going = row.going ?? row.goingCount ?? row.going_count;
  let goingCount: number | undefined;
  let goingPeople: { label: string }[] = [];
  if (typeof going === "number") {
    goingCount = going;
  } else if (Array.isArray(going)) {
    goingPeople = going
      .map((item) => {
        if (typeof item === "string" && item.trim()) return { label: item.trim() };
        const person = record(item);
        if (!person) return null;
        const label =
          text(person.handle) ??
          text(person.name) ??
          text(person.artistName) ??
          text(person.artist_name);
        return label ? { label } : null;
      })
      .filter((person): person is { label: string } => person !== null);
    goingCount = goingPeople.length;
  }

  return {
    joined: typeof row.joined === "number" ? row.joined : undefined,
    demoCount:
      typeof row.demoCount === "number"
        ? row.demoCount
        : typeof row.demo_count === "number"
          ? row.demo_count
          : undefined,
    topArtists,
    goingCount,
    goingPeople,
  };
}

export function readInterest(value: unknown): {
  mutual: boolean;
  socials: Socials;
  match: MatchPerson | null;
} {
  const row = record(value);
  if (!row) return { mutual: false, socials: emptySocials(), match: null };
  const socials = record(row.socials) ? normalizeSocials(row.socials) : emptySocials();
  return { mutual: row.mutual === true, socials, match: normalizeMatch(row.match) };
}

/** Marks interest and returns the refreshed match (mutual, socials, suggested show). */
export async function sendInterest(me: string, otherId: string) {
  const data = await fetchJson(`/api/matches/${encodeURIComponent(otherId)}/interest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: me }),
  });
  return readInterest(data);
}

export async function sendSkip(me: string, otherId: string, skipped = true) {
  await fetchJson(`/api/matches/${encodeURIComponent(otherId)}/skip`, {
    method: skipped ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: me }),
  });
}

export function formatDay(value: string) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

export function showLine(show: Pick<MatchShowItem, "artistName" | "venue" | "startsAt">) {
  return [show.artistName, show.venue, formatDay(show.startsAt)].filter(Boolean).join(" · ");
}

export function goingNote(going: MatchShowItem["going"]) {
  if (going === "both") return "You're both going";
  if (going === "them") return "They're going";
  if (going === "you") return "You're going";
  return null;
}

export function formatWhen(value: string) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export async function searchArtists(query: string): Promise<DraftArtist[]> {
  const data = await fetchJson(`/api/artists/search?q=${encodeURIComponent(query)}`);
  const row = record(data);
  const raw = Array.isArray(data) ? data : row && Array.isArray(row.artists) ? row.artists : [];
  return raw.map(normalizeArtist).filter((artist): artist is DraftArtist => artist !== null);
}
