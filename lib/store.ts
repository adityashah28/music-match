import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dominantColorFromImage } from "@/lib/color";
import { isStoreError, StoreError } from "@/lib/errors";
import { buildMatches, socialsFor, summarizeTaste } from "@/lib/matching";
import { normalizeName, normalizeQuery } from "@/lib/normalize";
import { createSeed } from "@/lib/seed";
import type {
  ArtistInput,
  CreateUserBody,
  CrowdResponse,
  DataSnapshot,
  InterestResponse,
  MatchesResponse,
  MatchPerson,
  RsvpResponse,
  RsvpStatus,
  SearchArtist,
  ShowDetail,
  ShowListResponse,
  ShowSummary,
  SkipResponse,
  StoredArtist,
  StoredInterest,
  StoredLink,
  StoredRsvp,
  StoredShow,
  StoredSkip,
  StoredUser,
  UpdateUserBody,
  UserProfile,
} from "@/lib/types";

type Repo = {
  load(): Promise<DataSnapshot>;
  save(before: DataSnapshot, after: DataSnapshot): Promise<void>;
  getCachedSearch(query: string): Promise<SearchArtist[] | null>;
  setCachedSearch(query: string, artists: SearchArtist[]): Promise<void>;
};

function wrap(error: unknown): StoreError {
  if (isStoreError(error)) return error;
  console.error(error instanceof Error ? error.message : "Database request failed");
  return new StoreError(500, "Database request failed");
}

function fail(message: string): never {
  console.error(message);
  throw new StoreError(500, "Database request failed");
}

function required(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new StoreError(400, `${label} is required`);
  }
  return value.trim().slice(0, max);
}

function cleanSocial(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^@+/, "");
  return trimmed ? trimmed.slice(0, 80) : null;
}

function isStatus(value: string): value is RsvpStatus {
  return value === "going" || value === "maybe" || value === "not_going";
}

function takeInputs(inputs: ArtistInput[] | null | undefined): ArtistInput[] {
  const seen = new Set<string>();
  const picked: ArtistInput[] = [];
  for (const input of inputs ?? []) {
    if (!input || typeof input.name !== "string") continue;
    const name = input.name.trim();
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const genres = Array.isArray(input.genres)
      ? input.genres.filter((genre): genre is string => typeof genre === "string" && genre.trim().length > 0)
      : [];
    picked.push({
      name,
      imageUrl: input.imageUrl ?? null,
      spotifyId: input.spotifyId ?? null,
      deezerId: input.deezerId ?? null,
      genres,
    });
    if (picked.length === 5) break;
  }
  return picked;
}

function toPeople(snapshot: DataSnapshot): MatchPerson[] {
  const artists = new Map(snapshot.artists.map((artist) => [artist.id, artist]));
  return snapshot.users.map((user) => ({
    id: user.id,
    handle: user.handle,
    city: user.city,
    isDemo: user.isDemo,
    instagram: user.instagram,
    tiktok: user.tiktok,
    snapchat: user.snapchat,
    artists: snapshot.links
      .filter((link) => link.userId === user.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((link) => {
        const artist = artists.get(link.artistId);
        if (!artist) return [];
        return [
          {
            id: artist.id,
            name: artist.name,
            imageUrl: artist.imageUrl,
            color: artist.dominantColorHex,
            genres: artist.genres,
            position: link.position,
          },
        ];
      }),
  }));
}

function profileOf(snapshot: DataSnapshot, userId: string): UserProfile | null {
  const person = toPeople(snapshot).find((entry) => entry.id === userId);
  if (!person) return null;
  return {
    id: person.id,
    handle: person.handle,
    city: person.city,
    instagram: person.instagram,
    tiktok: person.tiktok,
    snapchat: person.snapchat,
    isDemo: person.isDemo,
    artists: person.artists.map((artist) => ({
      name: artist.name,
      imageUrl: artist.imageUrl,
      color: artist.color,
      spotifyId: snapshot.artists.find((row) => row.id === artist.id)?.spotifyId ?? null,
      genres: artist.genres,
      position: artist.position,
    })),
  };
}

function showSummary(show: StoredShow, rsvp: RsvpStatus | null): ShowSummary {
  return {
    id: show.id,
    artistName: show.artistName,
    venue: show.venue,
    city: show.city,
    startsAt: show.startsAt,
    ticketUrl: show.ticketUrl,
    rsvp,
  };
}

async function ensureArtist(artists: StoredArtist[], input: ArtistInput): Promise<StoredArtist> {
  const key = normalizeName(input.name);
  const spotifyId = input.spotifyId?.trim() || null;
  let artist =
    artists.find((row) => (spotifyId && row.spotifyId === spotifyId) || row.normalizedName === key) ??
    null;
  const genres = (input.genres ?? []).map((genre) => genre.trim()).filter(Boolean);
  const imageUrl = input.imageUrl?.trim() || null;

  if (!artist) {
    artist = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      normalizedName: key,
      imageUrl,
      dominantColorHex: imageUrl ? await dominantColorFromImage(imageUrl) : null,
      monthlyListeners: null,
      genres,
      spotifyId,
      source: spotifyId ? "spotify" : input.deezerId ? "deezer" : "user",
      updatedAt: new Date().toISOString(),
    };
    artists.push(artist);
    return artist;
  }

  let changed = false;
  if (!artist.imageUrl && imageUrl) {
    artist.imageUrl = imageUrl;
    changed = true;
  }
  if (!artist.dominantColorHex && artist.imageUrl) {
    artist.dominantColorHex = await dominantColorFromImage(artist.imageUrl);
    changed = true;
  }
  if (!artist.spotifyId && spotifyId) {
    artist.spotifyId = spotifyId;
    changed = true;
  }
  if (artist.genres.length === 0 && genres.length > 0) {
    artist.genres = genres;
    changed = true;
  }
  if (changed) artist.updatedAt = new Date().toISOString();
  return artist;
}

async function replaceArtists(snapshot: DataSnapshot, userId: string, inputs: ArtistInput[]) {
  const picked = takeInputs(inputs);
  if (picked.length === 0) throw new StoreError(400, "Pick at least one artist");
  snapshot.links = snapshot.links.filter((link) => link.userId !== userId);
  for (let index = 0; index < picked.length; index += 1) {
    const artist = await ensureArtist(snapshot.artists, picked[index]);
    snapshot.links.push({ userId, artistId: artist.id, position: index + 1 });
  }
}

async function insertUser(snapshot: DataSnapshot, body: CreateUserBody): Promise<string> {
  const handle = required(body.handle, "Handle", 32);
  const city = required(body.city, "City", 80);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    handle,
    city,
    instagram: cleanSocial(body.instagram),
    tiktok: cleanSocial(body.tiktok),
    snapchat: cleanSocial(body.snapchat),
    isDemo: false,
    createdAt: new Date().toISOString(),
  };
  snapshot.users.push(user);
  await replaceArtists(snapshot, user.id, body.artists);
  return user.id;
}

async function patchUser(snapshot: DataSnapshot, id: string, body: UpdateUserBody) {
  const user = snapshot.users.find((row) => row.id === id);
  if (!user) throw new StoreError(404, "User not found");
  if (body.handle !== undefined) user.handle = required(body.handle, "Handle", 32);
  if (body.city !== undefined) user.city = required(body.city, "City", 80);
  if (body.instagram !== undefined) user.instagram = cleanSocial(body.instagram);
  if (body.tiktok !== undefined) user.tiktok = cleanSocial(body.tiktok);
  if (body.snapchat !== undefined) user.snapchat = cleanSocial(body.snapchat);
  if (body.artists) await replaceArtists(snapshot, id, body.artists);
}

function matchesOf(snapshot: DataSnapshot, userId: string): MatchesResponse | null {
  return buildMatches(
    userId,
    toPeople(snapshot),
    snapshot.related,
    snapshot.interests.map((edge) => ({ userId: edge.userId, otherUserId: edge.otherUserId })),
    snapshot.skips.map((edge) => ({ userId: edge.userId, otherUserId: edge.otherUserId })),
    {
      shows: snapshot.shows,
      going: snapshot.rsvps.filter((rsvp) => rsvp.status === "going"),
      now: Date.now(),
    },
  );
}

function listShowsOf(snapshot: DataSnapshot, userId: string): ShowListResponse {
  const matches = matchesOf(snapshot, userId);
  if (!matches) return { shows: [] };
  const people = toPeople(snapshot);
  const names = new Set<string>();
  const self = people.find((person) => person.id === userId);
  for (const artist of self?.artists ?? []) names.add(normalizeName(artist.name));
  const matchIds = new Set(matches.matches.map((match) => match.userId));
  for (const person of people) {
    if (!matchIds.has(person.id)) continue;
    for (const artist of person.artists) names.add(normalizeName(artist.name));
  }
  const rsvps = new Map(
    snapshot.rsvps.filter((rsvp) => rsvp.userId === userId).map((rsvp) => [rsvp.showId, rsvp.status]),
  );
  const shows = snapshot.shows
    .filter((show) => names.has(show.normalizedArtistName || normalizeName(show.artistName)))
    .sort((a, b) => {
      const left = a.startsAt ? Date.parse(a.startsAt) : Number.POSITIVE_INFINITY;
      const right = b.startsAt ? Date.parse(b.startsAt) : Number.POSITIVE_INFINITY;
      return left - right;
    })
    .map((show) => showSummary(show, rsvps.get(show.id) ?? null));
  return { shows };
}

function showDetailOf(snapshot: DataSnapshot, showId: string, userId: string): ShowDetail | null {
  const show = snapshot.shows.find((row) => row.id === showId);
  if (!show) return null;
  const goingIds = new Set(
    snapshot.rsvps
      .filter((rsvp) => rsvp.showId === showId && rsvp.status === "going")
      .map((rsvp) => rsvp.userId),
  );
  const names: string[] = [];
  for (const person of toPeople(snapshot)) {
    if (!goingIds.has(person.id)) continue;
    for (const artist of person.artists) names.push(artist.name);
  }
  const rsvp = snapshot.rsvps.find((row) => row.userId === userId && row.showId === showId)?.status ?? null;
  return {
    ...showSummary(show, rsvp),
    crowd: {
      going: goingIds.size,
      taste: summarizeTaste(names),
    },
  };
}

function crowdOf(snapshot: DataSnapshot): CrowdResponse {
  const counts = new Map<string, number>();
  for (const link of snapshot.links) {
    counts.set(link.artistId, (counts.get(link.artistId) ?? 0) + 1);
  }
  const artists = new Map(snapshot.artists.map((artist) => [artist.id, artist]));
  const topArtists = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (artists.get(a[0])?.name ?? "").localeCompare(artists.get(b[0])?.name ?? ""))
    .slice(0, 8)
    .flatMap(([artistId, count]) => {
      const artist = artists.get(artistId);
      if (!artist) return [];
      return [
        {
          name: artist.name,
          imageUrl: artist.imageUrl,
          color: artist.dominantColorHex,
          count,
        },
      ];
    });
  return {
    joined: snapshot.users.filter((user) => !user.isDemo).length,
    demoCount: snapshot.users.filter((user) => user.isDemo).length,
    topArtists,
    going: snapshot.rsvps.filter((rsvp) => rsvp.status === "going").length,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseListeners(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[, ]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

function parseNames(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) names.push(item.trim());
    else if (item && typeof item === "object" && "name" in item && typeof item.name === "string" && item.name.trim()) {
      names.push(item.name.trim());
    }
  }
  return names;
}

function collectItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : [];
    });
  }
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of ["items", "data", "results"]) {
    if (Array.isArray(record[key])) return collectItems(record[key]);
  }
  return [record];
}

async function namedArtist(
  snapshot: DataSnapshot,
  name: string,
  patch: {
    imageUrl?: string | null;
    spotifyId?: string | null;
    genres?: string[];
    monthlyListeners?: number | null;
    source: string;
  },
): Promise<StoredArtist> {
  const key = normalizeName(name);
  const spotifyId = patch.spotifyId?.trim() || null;
  let artist =
    snapshot.artists.find((row) => row.normalizedName === key || (spotifyId && row.spotifyId === spotifyId)) ??
    null;
  const imageUrl = patch.imageUrl?.trim() || null;
  if (!artist) {
    artist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      normalizedName: key,
      imageUrl,
      dominantColorHex: imageUrl ? await dominantColorFromImage(imageUrl) : null,
      monthlyListeners: patch.monthlyListeners ?? null,
      genres: patch.genres ?? [],
      spotifyId,
      source: patch.source,
      updatedAt: new Date().toISOString(),
    };
    snapshot.artists.push(artist);
    return artist;
  }
  let changed = false;
  if (!artist.imageUrl && imageUrl) {
    artist.imageUrl = imageUrl;
    changed = true;
  }
  if (!artist.dominantColorHex && artist.imageUrl) {
    artist.dominantColorHex = await dominantColorFromImage(artist.imageUrl);
    changed = true;
  }
  if (patch.monthlyListeners != null) {
    artist.monthlyListeners = patch.monthlyListeners;
    changed = true;
  }
  if (!artist.spotifyId && spotifyId) {
    artist.spotifyId = spotifyId;
    changed = true;
  }
  if (artist.genres.length === 0 && patch.genres && patch.genres.length > 0) {
    artist.genres = patch.genres;
    changed = true;
  }
  if (changed) artist.updatedAt = new Date().toISOString();
  return artist;
}

async function absorbApify(snapshot: DataSnapshot, payload: unknown) {
  for (const record of collectItems(payload)) {
    const venue = pickString(record, ["venue", "venueName", "venue_name"]);
    const startsAt = pickString(record, ["startsAt", "starts_at", "datetime", "date", "startDate", "start_date"]);
    const explicitArtist = pickString(record, ["artistName", "artist_name", "headliner"]);
    const name = explicitArtist ?? pickString(record, ["name", "artist"]);
    const listeners = parseListeners(record.monthlyListeners ?? record.monthly_listeners ?? record.listeners);
    const related = parseNames(record.relatedArtists ?? record.related_artists ?? record.similarArtists).slice(0, 8);
    const genres = parseNames(record.genres);
    const imageUrl = pickString(record, ["imageUrl", "image_url", "image", "picture", "avatar"]);
    const spotifyId = pickString(record, ["spotifyId", "spotify_id", "spotifyArtistId"]);
    const looksLikeArtist = Boolean(listeners != null || related.length || genres.length || imageUrl || spotifyId);

    if (name && looksLikeArtist && !venue) {
      const artist = await namedArtist(snapshot, name, {
        imageUrl,
        spotifyId,
        genres,
        monthlyListeners: listeners,
        source: "apify",
      });
      for (let index = 0; index < related.length; index += 1) {
        const other = await namedArtist(snapshot, related[index], { source: "apify" });
        if (other.id === artist.id) continue;
        const exists = snapshot.related.some(
          (edge) => edge.artistId === artist.id && edge.relatedArtistId === other.id,
        );
        if (!exists) {
          snapshot.related.push({ artistId: artist.id, relatedArtistId: other.id, rank: index + 1 });
        }
      }
    }

    if (name && (venue || startsAt)) {
      const normalized = normalizeName(explicitArtist ?? name);
      const city = pickString(record, ["city", "location"]);
      const ticketUrl = pickString(record, ["ticketUrl", "ticket_url", "ticketLink", "url"]);
      const existing = snapshot.shows.find(
        (show) =>
          show.normalizedArtistName === normalized && show.venue === venue && show.startsAt === startsAt,
      );
      if (existing) {
        if (!existing.ticketUrl && ticketUrl) existing.ticketUrl = ticketUrl;
        if (!existing.city && city) existing.city = city;
      } else {
        snapshot.shows.push({
          id: crypto.randomUUID(),
          artistName: (explicitArtist ?? name).trim(),
          normalizedArtistName: normalized,
          venue,
          city,
          startsAt,
          ticketUrl,
          source: "apify",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

function cacheKey(query: string): string {
  return normalizeQuery(query);
}

function readArtists(value: unknown): SearchArtist[] | null {
  if (!Array.isArray(value)) return null;
  const artists: SearchArtist[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record || typeof record.name !== "string" || !record.name.trim()) continue;
    const genres = Array.isArray(record.genres)
      ? record.genres.filter((genre): genre is string => typeof genre === "string")
      : [];
    artists.push({
      name: record.name,
      imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : null,
      spotifyId: typeof record.spotifyId === "string" ? record.spotifyId : null,
      deezerId: typeof record.deezerId === "string" ? record.deezerId : null,
      genres,
    });
  }
  return artists;
}

class MemoryRepo implements Repo {
  private snapshot: DataSnapshot | null = null;
  private cache = new Map<string, SearchArtist[]>();

  async load(): Promise<DataSnapshot> {
    if (!this.snapshot) this.snapshot = structuredClone(createSeed());
    return this.snapshot;
  }

  async save(_before: DataSnapshot, after: DataSnapshot): Promise<void> {
    this.snapshot = after;
  }

  async getCachedSearch(query: string): Promise<SearchArtist[] | null> {
    const key = cacheKey(query);
    if (!key) return null;
    const hit = this.cache.get(key);
    return hit ? structuredClone(hit) : null;
  }

  async setCachedSearch(query: string, artists: SearchArtist[]): Promise<void> {
    const key = cacheKey(query);
    if (!key) return;
    this.cache.set(key, structuredClone(artists));
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    handle: text(row.handle) ?? "",
    city: text(row.city) ?? "",
    instagram: text(row.instagram),
    tiktok: text(row.tiktok),
    snapchat: text(row.snapchat),
    isDemo: row.is_demo === true,
    createdAt: text(row.created_at) ?? new Date().toISOString(),
  };
}

function mapArtist(row: Record<string, unknown>): StoredArtist {
  const genres = Array.isArray(row.genres)
    ? row.genres.filter((genre): genre is string => typeof genre === "string")
    : [];
  return {
    id: String(row.id),
    name: text(row.name) ?? "",
    normalizedName: text(row.normalized_name) ?? normalizeName(text(row.name) ?? ""),
    imageUrl: text(row.image_url),
    dominantColorHex: text(row.dominant_color_hex),
    monthlyListeners: typeof row.monthly_listeners === "number" ? row.monthly_listeners : null,
    genres,
    spotifyId: text(row.spotify_id),
    source: text(row.source) ?? "supabase",
    updatedAt: text(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapLink(row: Record<string, unknown>): StoredLink {
  return {
    userId: String(row.user_id),
    artistId: String(row.artist_id),
    position: typeof row.position === "number" ? row.position : 1,
  };
}

function mapShow(row: Record<string, unknown>): StoredShow {
  return {
    id: String(row.id),
    artistName: text(row.artist_name) ?? "",
    normalizedArtistName: text(row.normalized_artist_name) ?? normalizeName(text(row.artist_name) ?? ""),
    venue: text(row.venue),
    city: text(row.city),
    startsAt: text(row.starts_at),
    ticketUrl: text(row.ticket_url),
    source: text(row.source) ?? "supabase",
    updatedAt: text(row.updated_at) ?? new Date().toISOString(),
  };
}

function userRow(user: StoredUser) {
  return {
    id: user.id,
    handle: user.handle,
    city: user.city,
    instagram: user.instagram,
    tiktok: user.tiktok,
    snapchat: user.snapchat,
    is_demo: user.isDemo,
    created_at: user.createdAt,
  };
}

function artistRow(artist: StoredArtist) {
  return {
    id: artist.id,
    name: artist.name,
    normalized_name: artist.normalizedName,
    image_url: artist.imageUrl,
    dominant_color_hex: artist.dominantColorHex,
    monthly_listeners: artist.monthlyListeners,
    genres: artist.genres,
    spotify_id: artist.spotifyId,
    source: artist.source,
    updated_at: artist.updatedAt,
  };
}

function showRow(show: StoredShow) {
  return {
    id: show.id,
    artist_name: show.artistName,
    normalized_artist_name: show.normalizedArtistName,
    venue: show.venue,
    city: show.city,
    starts_at: show.startsAt,
    ticket_url: show.ticketUrl,
    source: show.source,
    updated_at: show.updatedAt,
  };
}

function artistChanged(before: StoredArtist, after: StoredArtist): boolean {
  return (
    before.name !== after.name ||
    before.imageUrl !== after.imageUrl ||
    before.dominantColorHex !== after.dominantColorHex ||
    before.monthlyListeners !== after.monthlyListeners ||
    before.spotifyId !== after.spotifyId ||
    before.source !== after.source ||
    before.genres.join("|") !== after.genres.join("|")
  );
}

function userChanged(before: StoredUser, after: StoredUser): boolean {
  return (
    before.handle !== after.handle ||
    before.city !== after.city ||
    before.instagram !== after.instagram ||
    before.tiktok !== after.tiktok ||
    before.snapchat !== after.snapchat ||
    before.isDemo !== after.isDemo
  );
}

function showChanged(before: StoredShow, after: StoredShow): boolean {
  return (
    before.artistName !== after.artistName ||
    before.normalizedArtistName !== after.normalizedArtistName ||
    before.venue !== after.venue ||
    before.city !== after.city ||
    before.startsAt !== after.startsAt ||
    before.ticketUrl !== after.ticketUrl ||
    before.source !== after.source
  );
}

function linksFor(snapshot: DataSnapshot, userId: string): StoredLink[] {
  return snapshot.links
    .filter((link) => link.userId === userId)
    .sort((a, b) => a.position - b.position);
}

function sameLinks(before: StoredLink[], after: StoredLink[]): boolean {
  return (
    before.length === after.length &&
    before.every((link, index) => link.artistId === after[index]?.artistId && link.position === after[index]?.position)
  );
}

class SupabaseRepo implements Repo {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  private async rows(table: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client.from(table).select("*");
    if (error) fail(error.message);
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  }

  private async write(table: string, action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    if (error) fail(error.message);
  }

  async load(): Promise<DataSnapshot> {
    const [users, artists, links, related, shows, rsvps, interests, skips] = await Promise.all([
      this.rows("users"),
      this.rows("artists"),
      this.rows("user_artists"),
      this.rows("artist_related"),
      this.rows("shows"),
      this.rows("show_rsvps"),
      this.rows("match_interest"),
      this.rows("match_skip"),
    ]);
    return {
      users: users.map(mapUser),
      artists: artists.map(mapArtist),
      links: links.map(mapLink),
      related: related.map((row) => ({
        artistId: String(row.artist_id),
        relatedArtistId: String(row.related_artist_id),
        rank: typeof row.rank === "number" ? row.rank : 1,
      })),
      shows: shows.map(mapShow),
      rsvps: rsvps.flatMap((row) => {
        const status = text(row.status);
        if (status !== "going" && status !== "maybe" && status !== "not_going") return [];
        const rsvp: StoredRsvp = {
          userId: String(row.user_id),
          showId: String(row.show_id),
          status,
        };
        return [rsvp];
      }),
      interests: interests.map((row) => {
        const edge: StoredInterest = {
          userId: String(row.user_id),
          otherUserId: String(row.other_user_id),
          createdAt: text(row.created_at) ?? new Date().toISOString(),
        };
        return edge;
      }),
      skips: skips.map((row) => {
        const edge: StoredSkip = {
          userId: String(row.user_id),
          otherUserId: String(row.other_user_id),
          createdAt: text(row.created_at) ?? new Date().toISOString(),
        };
        return edge;
      }),
    };
  }

  async save(before: DataSnapshot, after: DataSnapshot): Promise<void> {
    const previousArtists = new Map(before.artists.map((artist) => [artist.id, artist]));
    const artistRows = after.artists
      .filter((artist) => {
        const previous = previousArtists.get(artist.id);
        return !previous || artistChanged(previous, artist);
      })
      .map(artistRow);
    if (artistRows.length) await this.write("artists", this.client.from("artists").upsert(artistRows));

    const previousUsers = new Map(before.users.map((user) => [user.id, user]));
    const userRows = after.users
      .filter((user) => {
        const previous = previousUsers.get(user.id);
        return !previous || userChanged(previous, user);
      })
      .map(userRow);
    if (userRows.length) await this.write("users", this.client.from("users").upsert(userRows));

    const userIds = new Set([
      ...before.links.map((link) => link.userId),
      ...after.links.map((link) => link.userId),
    ]);
    for (const userId of userIds) {
      const previous = linksFor(before, userId);
      const next = linksFor(after, userId);
      if (sameLinks(previous, next)) continue;
      await this.write("user_artists", this.client.from("user_artists").delete().eq("user_id", userId));
      if (next.length) {
        await this.write(
          "user_artists",
          this.client.from("user_artists").insert(
            next.map((link) => ({
              user_id: link.userId,
              artist_id: link.artistId,
              position: link.position,
            })),
          ),
        );
      }
    }

    const relatedKey = (edge: { artistId: string; relatedArtistId: string }) =>
      `${edge.artistId}|${edge.relatedArtistId}`;
    const knownRelated = new Set(before.related.map(relatedKey));
    const relatedRows = after.related
      .filter((edge) => !knownRelated.has(relatedKey(edge)))
      .map((edge) => ({
        artist_id: edge.artistId,
        related_artist_id: edge.relatedArtistId,
        rank: edge.rank,
      }));
    if (relatedRows.length) await this.write("artist_related", this.client.from("artist_related").insert(relatedRows));

    const previousShows = new Map(before.shows.map((show) => [show.id, show]));
    const showRows = after.shows
      .filter((show) => {
        const previous = previousShows.get(show.id);
        return !previous || showChanged(previous, show);
      })
      .map(showRow);
    if (showRows.length) await this.write("shows", this.client.from("shows").upsert(showRows));

    const rsvpKey = (rsvp: StoredRsvp) => `${rsvp.userId}|${rsvp.showId}`;
    const previousRsvps = new Map(before.rsvps.map((rsvp) => [rsvpKey(rsvp), rsvp]));
    const rsvpRows = after.rsvps
      .filter((rsvp) => previousRsvps.get(rsvpKey(rsvp))?.status !== rsvp.status)
      .map((rsvp) => ({ user_id: rsvp.userId, show_id: rsvp.showId, status: rsvp.status }));
    if (rsvpRows.length) {
      await this.write(
        "show_rsvps",
        this.client.from("show_rsvps").upsert(rsvpRows, { onConflict: "user_id,show_id" }),
      );
    }

    const interestKey = (edge: StoredInterest) => `${edge.userId}|${edge.otherUserId}`;
    const beforeInterest = new Set(before.interests.map(interestKey));
    const afterInterest = new Set(after.interests.map(interestKey));
    for (const edge of before.interests) {
      if (afterInterest.has(interestKey(edge))) continue;
      await this.write(
        "match_interest",
        this.client.from("match_interest").delete().eq("user_id", edge.userId).eq("other_user_id", edge.otherUserId),
      );
    }
    const interestRows = after.interests
      .filter((edge) => !beforeInterest.has(interestKey(edge)))
      .map((edge) => ({
        user_id: edge.userId,
        other_user_id: edge.otherUserId,
        created_at: edge.createdAt,
      }));
    if (interestRows.length) await this.write("match_interest", this.client.from("match_interest").insert(interestRows));

    const beforeSkips = new Set(before.skips.map(interestKey));
    const afterSkips = new Set(after.skips.map(interestKey));
    for (const edge of before.skips) {
      if (afterSkips.has(interestKey(edge))) continue;
      await this.write(
        "match_skip",
        this.client.from("match_skip").delete().eq("user_id", edge.userId).eq("other_user_id", edge.otherUserId),
      );
    }
    const skipRows = after.skips
      .filter((edge) => !beforeSkips.has(interestKey(edge)))
      .map((edge) => ({
        user_id: edge.userId,
        other_user_id: edge.otherUserId,
        created_at: edge.createdAt,
      }));
    if (skipRows.length) await this.write("match_skip", this.client.from("match_skip").insert(skipRows));
  }

  async getCachedSearch(query: string): Promise<SearchArtist[] | null> {
    const key = cacheKey(query);
    if (!key) return null;
    const { data, error } = await this.client
      .from("search_cache")
      .select("results")
      .eq("query", key)
      .maybeSingle();
    if (error) fail(error.message);
    if (!data || typeof data !== "object") return null;
    return readArtists((data as { results?: unknown }).results);
  }

  async setCachedSearch(query: string, artists: SearchArtist[]): Promise<void> {
    const key = cacheKey(query);
    if (!key) return;
    await this.write(
      "search_cache",
      this.client.from("search_cache").upsert({
        query: key,
        results: artists,
        created_at: new Date().toISOString(),
      }),
    );
  }
}

const globalStore = globalThis as typeof globalThis & { __resonateRepo?: Repo };
let queue: Promise<unknown> = Promise.resolve();

function supabaseConfig(): { url: string; key: string } | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  if (!url) return null;
  return { url, key };
}

function repo(): Repo {
  if (!globalStore.__resonateRepo) {
    const config = supabaseConfig();
    globalStore.__resonateRepo = config ? new SupabaseRepo(config.url, config.key) : new MemoryRepo();
  }
  return globalStore.__resonateRepo;
}

/** Snapshots held in memory across dev reloads can predate newer fields. */
function filled(snapshot: DataSnapshot): DataSnapshot {
  if (!Array.isArray(snapshot.skips)) snapshot.skips = [];
  return snapshot;
}

async function edit<T>(run: (snapshot: DataSnapshot) => Promise<T>): Promise<T> {
  const job = queue.then(async () => {
    const store = repo();
    const before = filled(await store.load());
    const next = structuredClone(before);
    const result = await run(next);
    await store.save(before, next);
    return result;
  });
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

async function read<T>(run: (snapshot: DataSnapshot) => T): Promise<T> {
  return run(filled(await repo().load()));
}

export async function createUser(body: CreateUserBody): Promise<UserProfile> {
  try {
    return await edit(async (snapshot) => {
      const id = await insertUser(snapshot, body);
      const profile = profileOf(snapshot, id);
      if (!profile) throw new StoreError(500, "Could not create user");
      return profile;
    });
  } catch (error) {
    throw wrap(error);
  }
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<UserProfile> {
  try {
    return await edit(async (snapshot) => {
      await patchUser(snapshot, id, body);
      const profile = profileOf(snapshot, id);
      if (!profile) throw new StoreError(404, "User not found");
      return profile;
    });
  } catch (error) {
    throw wrap(error);
  }
}

export async function getUser(id: string): Promise<UserProfile | null> {
  try {
    return await read((snapshot) => profileOf(snapshot, id));
  } catch (error) {
    throw wrap(error);
  }
}

export async function getMatches(userId: string): Promise<MatchesResponse | null> {
  try {
    return await read((snapshot) => matchesOf(snapshot, userId));
  } catch (error) {
    throw wrap(error);
  }
}

export async function setInterest(userId: string, otherUserId: string): Promise<InterestResponse | null> {
  try {
    if (userId === otherUserId) throw new StoreError(400, "Choose someone else");
    return await edit(async (snapshot) => {
      if (!snapshot.users.some((user) => user.id === userId)) return null;
      if (!snapshot.users.some((user) => user.id === otherUserId)) return null;
      const index = snapshot.interests.findIndex(
        (edge) => edge.userId === userId && edge.otherUserId === otherUserId,
      );
      if (index >= 0) snapshot.interests.splice(index, 1);
      else {
        const createdAt = new Date().toISOString();
        snapshot.interests.push({ userId, otherUserId, createdAt });
        snapshot.skips = snapshot.skips.filter(
          (edge) => !(edge.userId === userId && edge.otherUserId === otherUserId),
        );
        const demo = snapshot.users.some((user) => user.id === otherUserId && user.isDemo);
        const answered = snapshot.interests.some(
          (edge) => edge.userId === otherUserId && edge.otherUserId === userId,
        );
        // Seeded demo profiles always tap back so the mutual state is reachable in a demo.
        if (demo && !answered) {
          snapshot.interests.push({ userId: otherUserId, otherUserId: userId, createdAt });
        }
      }
      const mutual =
        snapshot.interests.some((edge) => edge.userId === userId && edge.otherUserId === otherUserId) &&
        snapshot.interests.some((edge) => edge.userId === otherUserId && edge.otherUserId === userId);
      const other = toPeople(snapshot).find((person) => person.id === otherUserId);
      const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
      return { mutual, socials: other ? socialsFor(other, mutual) : null, match };
    });
  } catch (error) {
    throw wrap(error);
  }
}

/** Hides otherUserId from userId's matches and withdraws userId's interest. The other side sees no change. */
export async function setSkip(
  userId: string,
  otherUserId: string,
  skipped: boolean,
): Promise<SkipResponse | null> {
  try {
    if (userId === otherUserId) throw new StoreError(400, "Choose someone else");
    return await edit(async (snapshot) => {
      if (!snapshot.users.some((user) => user.id === userId)) return null;
      if (!snapshot.users.some((user) => user.id === otherUserId)) return null;
      const same = (edge: { userId: string; otherUserId: string }) =>
        edge.userId === userId && edge.otherUserId === otherUserId;
      if (skipped) {
        if (!snapshot.skips.some(same)) {
          snapshot.skips.push({ userId, otherUserId, createdAt: new Date().toISOString() });
        }
        snapshot.interests = snapshot.interests.filter((edge) => !same(edge));
      } else {
        snapshot.skips = snapshot.skips.filter((edge) => !same(edge));
      }
      return { skipped };
    });
  } catch (error) {
    throw wrap(error);
  }
}

export async function listShows(userId: string): Promise<ShowListResponse> {
  try {
    return await read((snapshot) => listShowsOf(snapshot, userId));
  } catch (error) {
    throw wrap(error);
  }
}

export async function getShow(showId: string, userId: string): Promise<ShowDetail | null> {
  try {
    return await read((snapshot) => showDetailOf(snapshot, showId, userId));
  } catch (error) {
    throw wrap(error);
  }
}

export async function setRsvp(
  userId: string,
  showId: string,
  status: RsvpStatus,
): Promise<RsvpResponse | null> {
  try {
    if (!isStatus(status)) throw new StoreError(400, "Status must be going, maybe, or not_going");
    return await edit(async (snapshot) => {
      if (!snapshot.users.some((user) => user.id === userId)) return null;
      if (!snapshot.shows.some((show) => show.id === showId)) return null;
      const existing = snapshot.rsvps.find((rsvp) => rsvp.userId === userId && rsvp.showId === showId);
      if (existing) existing.status = status;
      else snapshot.rsvps.push({ userId, showId, status });
      return { userId, showId, status };
    });
  } catch (error) {
    throw wrap(error);
  }
}

export async function getCrowd(): Promise<CrowdResponse> {
  try {
    return await read(crowdOf);
  } catch (error) {
    throw wrap(error);
  }
}

export async function getCachedSearch(query: string): Promise<SearchArtist[] | null> {
  try {
    return await repo().getCachedSearch(query);
  } catch (error) {
    throw wrap(error);
  }
}

export async function setCachedSearch(query: string, artists: SearchArtist[]): Promise<void> {
  try {
    await repo().setCachedSearch(query, artists);
  } catch (error) {
    throw wrap(error);
  }
}

export async function upsertFromApify(payload: unknown): Promise<{ ok: true }> {
  try {
    await edit(async (snapshot) => {
      await absorbApify(snapshot, payload);
      return { ok: true as const };
    });
    return { ok: true };
  } catch (error) {
    throw wrap(error);
  }
}
