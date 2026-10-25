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
  phone: string;
  phoneVerified: boolean;
  /** From /api/auth/verify; signup sends it back to prove the number. Expires after about an hour. */
  phoneProof: string;
  /** From Google sign-in (/api/auth/google); signup sends it back instead of a phone proof. Expires after about an hour. */
  authProof: string;
  name: string;
  artists: DraftArtist[];
  handle: string;
  city: string;
  cityLat: number | null;
  cityLng: number | null;
  cityPlaceId: string | null;
  age: number | null;
  ageMin: number;
  ageMax: number;
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

export type IcebreakerReply = {
  /** true if you sent it, false if they did. */
  fromMe: boolean;
  text: string;
  createdAt: string;
};

export type IcebreakerRound = {
  id: string;
  promptFromMe: boolean;
  promptText: string;
  promptAt: string;
  reply: IcebreakerReply | null;
};

export type IcebreakerState = {
  /** All rounds exchanged with this match, oldest first. The last one may still be open. */
  rounds: IcebreakerRound[];
};

export type MatchPerson = {
  userId: string;
  name: string;
  handle: string;
  city: string;
  age: number | null;
  isDemo: boolean;
  label: string;
  score?: number;
  why: string;
  sharedArtists: DraftArtist[];
  show: MatchShowItem | null;
  suggestedShow: MatchShowItem | null;
  interested: boolean;
  mutual: boolean;
  /** Whether you've chosen to share your socials with them. */
  youShared: boolean;
  /** True once you've both chosen to share. Authoritative — don't infer from `socials`. */
  socialsUnlocked: boolean;
  socials: Socials;
  icebreaker: IcebreakerState | null;
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
  name: string;
  handle: string;
  city: string;
  age: number | null;
  ageMin: number | null;
  ageMax: number | null;
  cityLat: number | null;
  cityLng: number | null;
  cityPlaceId: string | null;
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

/** Store handles without a leading @. UI shows @ as a fixed prefix; links re-add it when needed. */
export function normalizeSocialHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
}

export function normalizeSocials(value: unknown): Socials {
  const row = record(value);
  if (!row) return emptySocials();
  const nested = record(row.socials) ?? row;
  return {
    instagram: normalizeSocialHandle(text(nested.instagram) ?? ""),
    tiktok: normalizeSocialHandle(text(nested.tiktok) ?? ""),
    snapchat: normalizeSocialHandle(text(nested.snapchat) ?? ""),
  };
}

export function hasSocial(socials: Socials) {
  return Boolean(socials.instagram || socials.tiktok || socials.snapchat);
}

function socialHref(value: string, base: string): string | null {
  const handle = normalizeSocialHandle(value);
  if (!handle) return null;
  if (/^https?:\/\//i.test(handle)) return handle;
  return `${base}${handle}`;
}

export function socialLinks(socials: Socials): { label: string; href: string }[] {
  const link = (value: string, label: string, base: string) => {
    const href = socialHref(value, base);
    return href ? [{ label, href }] : [];
  };
  return [
    ...link(socials.instagram, "Instagram", "https://instagram.com/"),
    ...link(socials.tiktok, "TikTok", "https://www.tiktok.com/@"),
    ...link(socials.snapchat, "Snapchat", "https://www.snapchat.com/add/"),
  ];
}

export function primarySocial(socials: Socials): { label: string; href: string } | null {
  const link = (value: string, label: string, base: string) => {
    const href = socialHref(value, base);
    return href ? { label, href } : null;
  };

  return (
    link(socials.instagram, "Open Instagram", "https://instagram.com/") ||
    link(socials.tiktok, "Open TikTok", "https://www.tiktok.com/@") ||
    link(socials.snapchat, "Open Snapchat", "https://www.snapchat.com/add/")
  );
}

function blankDraft(): Draft {
  return {
    phone: "",
    phoneVerified: false,
    phoneProof: "",
    authProof: "",
    name: "",
    artists: [],
    handle: "",
    city: "",
    cityLat: null,
    cityLng: null,
    cityPlaceId: null,
    age: null,
    ageMin: 18,
    ageMax: 99,
    instagram: "",
    tiktok: "",
    snapchat: "",
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      phoneVerified: parsed.phoneVerified === true,
      phoneProof: typeof parsed.phoneProof === "string" ? parsed.phoneProof : "",
      authProof: typeof parsed.authProof === "string" ? parsed.authProof : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      artists,
      handle: typeof parsed.handle === "string" ? parsed.handle : "",
      city: text(parsed.city) ?? "",
      cityLat: numberOrNull(parsed.cityLat),
      cityLng: numberOrNull(parsed.cityLng),
      cityPlaceId: text(parsed.cityPlaceId) ?? null,
      age: numberOrNull(parsed.age),
      ageMin: numberOr(parsed.ageMin, 18),
      ageMax: numberOr(parsed.ageMax, 99),
      instagram: typeof parsed.instagram === "string" ? normalizeSocialHandle(parsed.instagram) : "",
      tiktok: typeof parsed.tiktok === "string" ? normalizeSocialHandle(parsed.tiktok) : "",
      snapchat: typeof parsed.snapchat === "string" ? normalizeSocialHandle(parsed.snapchat) : "",
    };
  } catch {
    return blankDraft();
  }
}

export function setDraft(draft: Draft) {
  const next: Draft = {
    ...draft,
    artists: draft.artists.slice(0, 5),
    city: draft.city.trim(),
    instagram: normalizeSocialHandle(draft.instagram),
    tiktok: normalizeSocialHandle(draft.tiktok),
    snapchat: normalizeSocialHandle(draft.snapchat),
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

/** Has this draft proven who it is, by Google sign-in or by an SMS code? Gate onboarding steps on this. */
export function isVerified(draft: Draft = getDraft()): boolean {
  return Boolean(draft.authProof) || (draft.phoneVerified && Boolean(draft.phone));
}

/** Next unfinished onboarding step for a guest draft. */
export function onboardingHref(draft: Draft = getDraft()): string {
  // Google is primary; /phone and /verify still work if opened directly.
  if (!isVerified(draft)) return "/";
  if (!draft.name.trim() || !draft.handle.trim() || !draft.city.trim()) return "/about";
  if (draft.age == null) return "/age";
  if (draft.artists.length < 1) return "/pick";
  return "/socials";
}

export function userPayload(draft: Draft) {
  const socials = {
    instagram: normalizeSocialHandle(draft.instagram),
    tiktok: normalizeSocialHandle(draft.tiktok),
    snapchat: normalizeSocialHandle(draft.snapchat),
  };
  return {
    phone: draft.phone.trim(),
    phoneProof: draft.phoneProof,
    authProof: draft.authProof,
    name: draft.name.trim(),
    handle: draft.handle.trim(),
    city: draft.city.trim(),
    cityLat: draft.cityLat,
    cityLng: draft.cityLng,
    cityPlaceId: draft.cityPlaceId,
    age: draft.age,
    ageMin: draft.ageMin,
    ageMax: draft.ageMax,
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
  // Dead session only — never bounce unauthenticated login/OTP flows home on 401.
  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    (getUserToken() || getUserId())
  ) {
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

function normalizeIcebreakerReply(value: unknown): IcebreakerReply | null {
  const row = record(value);
  if (!row) return null;
  const content = text(row.text);
  if (!content) return null;
  return { fromMe: row.fromMe === true, text: content, createdAt: text(row.createdAt) ?? "" };
}

function normalizeIcebreaker(value: unknown): IcebreakerState | null {
  const row = record(value);
  if (!row) return null;
  const raw = Array.isArray(row.rounds) ? row.rounds : [];
  const rounds = raw
    .map((item) => {
      const round = record(item);
      if (!round) return null;
      const id = text(round.id);
      const promptText = text(round.promptText);
      if (!id || !promptText) return null;
      return {
        id,
        promptFromMe: round.promptFromMe === true,
        promptText,
        promptAt: text(round.promptAt) ?? "",
        reply: normalizeIcebreakerReply(round.reply),
      };
    })
    .filter((round): round is IcebreakerRound => round !== null);
  return { rounds };
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
    name: text(row.name) ?? text(row.handle) ?? "Someone",
    handle: text(row.handle) ?? "Someone",
    city: text(row.city) ?? "",
    age: typeof row.age === "number" ? row.age : null,
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
    youShared: row.youShared === true || row.you_shared === true,
    socialsUnlocked: row.socialsUnlocked === true || row.socials_unlocked === true,
    socials: normalizeSocials(socialSource),
    icebreaker: normalizeIcebreaker(row.icebreaker),
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
    name: text(row.name) ?? "",
    handle: text(row.handle) ?? "",
    city: text(row.city) ?? "",
    age: typeof row.age === "number" ? row.age : null,
    ageMin: typeof row.ageMin === "number" ? row.ageMin : typeof row.age_min === "number" ? row.age_min : null,
    ageMax: typeof row.ageMax === "number" ? row.ageMax : typeof row.age_max === "number" ? row.age_max : null,
    cityLat:
      typeof row.cityLat === "number" ? row.cityLat : typeof row.city_lat === "number" ? row.city_lat : null,
    cityLng:
      typeof row.cityLng === "number" ? row.cityLng : typeof row.city_lng === "number" ? row.city_lng : null,
    cityPlaceId: text(row.cityPlaceId) ?? text(row.city_place_id) ?? null,
    socials: normalizeSocials(record(row.socials) ?? row),
    artists,
  };
}

export async function searchCities(query: string): Promise<
  Array<{ id: string; label: string; city: string; lat: number; lng: number }>
> {
  const data = await fetchJson(`/api/cities/search?q=${encodeURIComponent(query)}`);
  const row = record(data);
  const raw = Array.isArray(data) ? data : row && Array.isArray(row.cities) ? row.cities : [];
  return raw
    .map((item) => {
      const city = record(item);
      if (!city) return null;
      const id = text(city.id);
      const label = text(city.label);
      const name = text(city.city);
      const lat = typeof city.lat === "number" ? city.lat : null;
      const lng = typeof city.lng === "number" ? city.lng : null;
      if (!id || !label || !name || lat == null || lng == null) return null;
      return { id, label, city: name, lat, lng };
    })
    .filter((item): item is { id: string; label: string; city: string; lat: number; lng: number } => item !== null);
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

/** Choosing to share your socials with a match. Requires mutual interest first. */
export async function sendShare(
  me: string,
  otherId: string,
  shared = true,
): Promise<{ youShared: boolean; socialsUnlocked: boolean; socials: Socials }> {
  const data = await fetchJson(`/api/matches/${encodeURIComponent(otherId)}/share`, {
    method: shared ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: me }),
  });
  const row = record(data);
  return {
    youShared: row?.youShared === true,
    socialsUnlocked: row?.socialsUnlocked === true,
    socials: normalizeSocials(record(row?.socials) ?? {}),
  };
}

/**
 * Sends an icebreaker: either one of the fixed prompts (promptId) or your own text.
 * Only works once the match is mutual.
 */
export async function sendIcebreaker(
  me: string,
  otherId: string,
  promptId: string,
  text?: string,
): Promise<IcebreakerState> {
  const data = await fetchJson(`/api/matches/${encodeURIComponent(otherId)}/icebreaker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: me, promptId, text }),
  });
  const row = record(data);
  return normalizeIcebreaker(row?.icebreaker) ?? { rounds: [] };
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

/**
 * "Continue with Google": leaves the app for Google, which returns to /auth/callback.
 * Throws if Google sign-in isn't configured; show a message and offer another way in.
 */
export async function startGoogleSignIn(): Promise<void> {
  const { startGoogle } = await import("./supabase-browser");
  await startGoogle();
}

/**
 * Call once on /auth/callback. Returns "existing" when the Google account already has a
 * profile (now logged in on this device: go to /matches) or "new" (the draft now holds the
 * Google proof and a prefilled name: continue to onboardingHref()). Throws if sign-in failed.
 */
export async function completeGoogleSignIn(): Promise<"existing" | "new"> {
  const { finishGoogle } = await import("./supabase-browser");
  const accessToken = await finishGoogle();
  const data = await fetchJson("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const row = record(data);
  const user = record(row?.user);
  const userId = text(user?.id);
  const token = text(row?.token);
  if (row?.isNew === false && userId && token) {
    setUserId(userId);
    setUserToken(token);
    clearDraft();
    return "existing";
  }
  const authProof = text(row?.authProof);
  if (!authProof) throw new Error("Google sign-in didn't finish");
  const draft = getDraft();
  setDraft({ ...draft, authProof, name: draft.name || text(row?.name) || "" });
  return "new";
}
