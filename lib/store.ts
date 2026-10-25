import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dominantColorFromImage } from "@/lib/color";
import { distanceKm, type Coords } from "@/lib/geocode";
import { isStoreError, StoreError } from "@/lib/errors";
import { buildMatches, icebreakerFor, summarizeTaste } from "@/lib/matching";
import { demoAutoReply, icebreakerPrompts, icebreakerText } from "@/lib/icebreakers";
import { normalizeName, normalizeQuery } from "@/lib/normalize";
import { createSeed } from "@/lib/seed";
import type {
  ArtistInput,
  CreateUserBody,
  CreatedUser,
  CrowdResponse,
  DataSnapshot,
  InterestResponse,
  MatchesResponse,
  MatchPerson,
  RsvpResponse,
  RsvpStatus,
  SearchArtist,
  SendIcebreakerResponse,
  ShareResponse,
  ShowDetail,
  ShowListOptions,
  ShowListResponse,
  ShowReason,
  ShowSummary,
  SkipResponse,
  StoredArtist,
  StoredIcebreaker,
  StoredInterest,
  StoredLink,
  StoredRsvp,
  StoredShare,
  StoredShow,
  StoredSkip,
  StoredUser,
  UpdateUserBody,
  UserProfile,
} from "@/lib/types";

type Repo = {
  load(): Promise<DataSnapshot>;
  save(before: DataSnapshot, after: DataSnapshot): Promise<void>;
  userIdForToken(token: string): Promise<string | null>;
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
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    city: user.city,
    age: user.age,
    ageMin: user.ageMin,
    ageMax: user.ageMax,
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
  const user = snapshot.users.find((entry) => entry.id === userId);
  const person = toPeople(snapshot).find((entry) => entry.id === userId);
  if (!user || !person) return null;
  return {
    id: person.id,
    name: person.name,
    handle: person.handle,
    city: person.city,
    age: person.age,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    ageMin: user.ageMin,
    ageMax: user.ageMax,
    cityLat: user.cityLat,
    cityLng: user.cityLng,
    cityPlaceId: user.cityPlaceId,
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

function requireAge(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StoreError(400, `${label} is required`);
  }
  const age = Math.round(value);
  if (age < 18 || age > 99) throw new StoreError(400, `${label} must be between 18 and 99`);
  return age;
}

function optionalCoord(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function showSummary(
  show: StoredShow,
  rsvp: RsvpStatus | null,
  artistsByName: Map<string, StoredArtist>,
): ShowSummary {
  const key = show.normalizedArtistName || normalizeName(show.artistName);
  const artist = artistsByName.get(key);
  return {
    id: show.id,
    artistName: show.artistName,
    venue: show.venue,
    city: show.city,
    startsAt: show.startsAt,
    ticketUrl: show.ticketUrl,
    // Prefer Deezer artist portraits (next/image + sizedPortraitUrl); Ticketmaster/show as fallback.
    imageUrl: artist?.imageUrl ?? show.imageUrl,
    color: artist?.dominantColorHex ?? null,
    rsvp,
  };
}

function artistsByNormalizedName(snapshot: DataSnapshot): Map<string, StoredArtist> {
  return new Map(snapshot.artists.map((artist) => [artist.normalizedName, artist]));
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
  // A profile signs in with a verified phone number or a verified Google account
  const authUserId = body.authUserId?.trim() || null;
  const phone = authUserId ? body.phone?.trim() || null : required(body.phone, "Phone", 20);
  if (phone && snapshot.users.some((row) => row.phone === phone)) {
    throw new StoreError(409, "An account already exists for this phone number");
  }
  if (authUserId && snapshot.users.some((row) => row.authUserId === authUserId)) {
    throw new StoreError(409, "An account already exists for this Google account");
  }
  const name = required(body.name, "Name", 80);
  const handle = required(body.handle, "Handle", 32);
  const city = required(body.city, "City", 80);
  const age = requireAge(body.age, "Age");
  const ageMin = requireAge(body.ageMin, "Youngest age");
  const ageMax = requireAge(body.ageMax, "Oldest age");
  if (ageMin > ageMax) throw new StoreError(400, "Age range is backwards");
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    handle,
    phone,
    email: body.email?.trim().slice(0, 254) || null,
    authUserId,
    avatarUrl: authUserId ? body.avatarUrl?.trim() || null : null,
    city,
    cityLat: optionalCoord(body.cityLat),
    cityLng: optionalCoord(body.cityLng),
    cityPlaceId: typeof body.cityPlaceId === "string" ? body.cityPlaceId.trim().slice(0, 120) || null : null,
    age,
    ageMin,
    ageMax,
    instagram: cleanSocial(body.instagram),
    tiktok: cleanSocial(body.tiktok),
    snapchat: cleanSocial(body.snapchat),
    isDemo: false,
    createdAt: new Date().toISOString(),
    token: crypto.randomUUID(),
  };
  snapshot.users.push(user);
  await replaceArtists(snapshot, user.id, body.artists);
  return user.id;
}

async function patchUser(snapshot: DataSnapshot, id: string, body: UpdateUserBody) {
  const user = snapshot.users.find((row) => row.id === id);
  if (!user) throw new StoreError(404, "User not found");
  if (body.name !== undefined) user.name = required(body.name, "Name", 80);
  if (body.handle !== undefined) user.handle = required(body.handle, "Handle", 32);
  if (body.city !== undefined) user.city = required(body.city, "City", 80);
  if (body.cityLat !== undefined) user.cityLat = optionalCoord(body.cityLat);
  if (body.cityLng !== undefined) user.cityLng = optionalCoord(body.cityLng);
  if (body.cityPlaceId !== undefined) {
    user.cityPlaceId =
      typeof body.cityPlaceId === "string" ? body.cityPlaceId.trim().slice(0, 120) || null : null;
  }
  if (body.age !== undefined) user.age = requireAge(body.age, "Age");
  if (body.ageMin !== undefined) user.ageMin = requireAge(body.ageMin, "Youngest age");
  if (body.ageMax !== undefined) user.ageMax = requireAge(body.ageMax, "Oldest age");
  if (user.ageMin != null && user.ageMax != null && user.ageMin > user.ageMax) {
    throw new StoreError(400, "Age range is backwards");
  }
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
    snapshot.icebreakers,
    snapshot.shares.map((edge) => ({ userId: edge.userId, otherUserId: edge.otherUserId })),
  );
}

function listShowsOf(snapshot: DataSnapshot, userId: string, options: ShowListOptions = {}): ShowListResponse {
  const matches = matchesOf(snapshot, userId);
  if (!matches) return { shows: [], total: 0, hasMore: false };
  const people = toPeople(snapshot);
  // Every upcoming show is listed; this only labels why a show is relevant to you, strongest first
  const reasons = new Map<string, ShowReason>();
  const label = (name: string, reason: ShowReason) => {
    if (name && !reasons.has(name)) reasons.set(name, reason);
  };
  const self = people.find((person) => person.id === userId);
  for (const artist of self?.artists ?? []) label(normalizeName(artist.name), "your_artist");
  const matchIds = new Set(matches.matches.map((match) => match.userId));
  for (const person of people) {
    if (!matchIds.has(person.id)) continue;
    for (const artist of person.artists) label(normalizeName(artist.name), "match_artist");
  }
  // Your scene: artists related to yours, in either direction
  const mine = new Set((self?.artists ?? []).map((artist) => artist.id));
  const byId = new Map(snapshot.artists.map((artist) => [artist.id, artist.normalizedName]));
  for (const edge of snapshot.related) {
    const other = mine.has(edge.artistId) ? edge.relatedArtistId : mine.has(edge.relatedArtistId) ? edge.artistId : null;
    const name = other ? byId.get(other) : undefined;
    if (name) label(name, "scene");
  }
  const rsvps = new Map(
    snapshot.rsvps.filter((rsvp) => rsvp.userId === userId).map((rsvp) => [rsvp.showId, rsvp.status]),
  );
  const artistsByName = artistsByNormalizedName(snapshot);
  // Where the viewer is: their city's coordinates, else a show in a city with the same name
  const me = snapshot.users.find((user) => user.id === userId);
  let origin: Coords | null = me?.cityLat != null && me?.cityLng != null ? { lat: me.cityLat, lng: me.cityLng } : null;
  if (!origin && me?.city) {
    const key = me.city.trim().toLowerCase();
    const sameCity = snapshot.shows.find((s) => s.city?.trim().toLowerCase() === key && s.lat != null && s.lng != null);
    if (sameCity) origin = { lat: sameCity.lat!, lng: sameCity.lng! };
  }
  const distanceTo = (show: StoredShow) =>
    origin && show.lat != null && show.lng != null ? distanceKm(origin, { lat: show.lat, lng: show.lng }) : null;

  // Every word of the search must appear in the artist, venue or city
  const words = normalizeName(options.q ?? "").split(" ").filter(Boolean);
  const matchesSearch = (show: StoredShow) =>
    words.length === 0 ||
    words.every((word) => normalizeName(`${show.artistName} ${show.venue ?? ""} ${show.city ?? ""}`).includes(word));

  // Keep shows that started in the last few hours (people are still there), drop older ones
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  const time = (show: StoredShow) => (show.startsAt ? Date.parse(show.startsAt) : Number.POSITIVE_INFINITY);
  // Nearest first, in rings: everything within 25 km sorts by date, then the next 25 km, and so on.
  // Pure distance would bury a show 15 km away tonight under every show in your own city next year.
  const ring = (km: number | null) => (km == null ? Number.POSITIVE_INFINITY : Math.floor(km / SHOW_RING_KM));
  const ranked = snapshot.shows
    .filter((show) => (!show.startsAt || Date.parse(show.startsAt) >= cutoff) && matchesSearch(show))
    .map((show) => ({ show, km: distanceTo(show) }))
    .sort((a, b) => ring(a.km) - ring(b.km) || time(a.show) - time(b.show));

  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = options.limit == null ? ranked.length : Math.min(100, Math.max(1, Math.floor(options.limit)));
  const shows = ranked.slice(offset, offset + limit).map(({ show, km }) => ({
    ...showSummary(show, rsvps.get(show.id) ?? null, artistsByName),
    forYou: reasons.get(show.normalizedArtistName || normalizeName(show.artistName)) ?? null,
    distanceKm: km == null ? null : Math.round(km),
  }));
  return { shows, total: ranked.length, hasMore: offset + shows.length < ranked.length };
}

/** Width of each distance ring when sorting shows (see listShowsOf). */
const SHOW_RING_KM = 25;

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
    ...showSummary(show, rsvp, artistsByNormalizedName(snapshot)),
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
        if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
      } else {
        snapshot.shows.push({
          id: crypto.randomUUID(),
          artistName: (explicitArtist ?? name).trim(),
          normalizedArtistName: normalized,
          venue,
          city,
          startsAt,
          ticketUrl,
          imageUrl,
          source: "apify",
          updatedAt: new Date().toISOString(),
          lat: null,
          lng: null,
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

  async userIdForToken(token: string): Promise<string | null> {
    const snapshot = await this.load();
    return snapshot.users.find((user) => user.token === token)?.id ?? null;
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

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    name: text(row.name) ?? "",
    handle: text(row.handle) ?? "",
    phone: text(row.phone),
    email: text(row.email),
    authUserId: text(row.auth_user_id),
    avatarUrl: text(row.avatar_url),
    city: text(row.city) ?? "",
    cityLat: num(row.city_lat),
    cityLng: num(row.city_lng),
    cityPlaceId: text(row.city_place_id),
    age: num(row.age),
    ageMin: num(row.age_min),
    ageMax: num(row.age_max),
    instagram: text(row.instagram),
    tiktok: text(row.tiktok),
    snapchat: text(row.snapchat),
    isDemo: row.is_demo === true,
    createdAt: text(row.created_at) ?? new Date().toISOString(),
    token: text(row.token),
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
    imageUrl: text(row.image_url),
    source: text(row.source) ?? "supabase",
    updatedAt: text(row.updated_at) ?? new Date().toISOString(),
    lat: num(row.lat),
    lng: num(row.lng),
  };
}

function userRow(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    phone: user.phone,
    email: user.email,
    auth_user_id: user.authUserId,
    avatar_url: user.avatarUrl,
    city: user.city,
    city_lat: user.cityLat,
    city_lng: user.cityLng,
    city_place_id: user.cityPlaceId,
    age: user.age,
    age_min: user.ageMin,
    age_max: user.ageMax,
    instagram: user.instagram,
    tiktok: user.tiktok,
    snapchat: user.snapchat,
    is_demo: user.isDemo,
    created_at: user.createdAt,
    token: user.token,
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
    image_url: show.imageUrl,
    source: show.source,
    updated_at: show.updatedAt,
    lat: show.lat,
    lng: show.lng,
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
    before.name !== after.name ||
    before.handle !== after.handle ||
    before.phone !== after.phone ||
    before.email !== after.email ||
    before.authUserId !== after.authUserId ||
    before.avatarUrl !== after.avatarUrl ||
    before.city !== after.city ||
    before.cityLat !== after.cityLat ||
    before.cityLng !== after.cityLng ||
    before.cityPlaceId !== after.cityPlaceId ||
    before.age !== after.age ||
    before.ageMin !== after.ageMin ||
    before.ageMax !== after.ageMax ||
    before.instagram !== after.instagram ||
    before.tiktok !== after.tiktok ||
    before.snapchat !== after.snapchat ||
    before.isDemo !== after.isDemo ||
    before.token !== after.token
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
    before.imageUrl !== after.imageUrl ||
    before.source !== after.source ||
    before.lat !== after.lat ||
    before.lng !== after.lng
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

  /**
   * Supabase caps a select at 1000 rows, so read in pages, ordered so pages never overlap.
   * The first page also returns the total, then the remaining pages load in parallel.
   */
  private async rows(table: string, orderBy: string[]): Promise<Record<string, unknown>[]> {
    const PAGE = 1000;
    const page = async (from: number, withCount: boolean) => {
      let query = this.client.from(table).select("*", withCount ? { count: "exact" } : undefined);
      for (const column of orderBy) query = query.order(column);
      const { data, error, count } = await query.range(from, from + PAGE - 1);
      if (error) fail(error.message);
      return { rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [], count: count ?? 0 };
    };
    const first = await page(0, true);
    const rest = await Promise.all(
      Array.from({ length: Math.ceil(first.count / PAGE) - 1 }, (_, i) => page((i + 1) * PAGE, false)),
    );
    return [first, ...rest].flatMap((p) => p.rows);
  }

  private async write(table: string, action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    if (error) fail(error.message);
  }

  async load(): Promise<DataSnapshot> {
    const [users, artists, links, related, shows, rsvps, interests, skips, shares, icebreakers] = await Promise.all([
      this.rows("users", ["id"]),
      this.rows("artists", ["id"]),
      this.rows("user_artists", ["user_id", "artist_id"]),
      this.rows("artist_related", ["artist_id", "related_artist_id"]),
      this.rows("shows", ["id"]),
      this.rows("show_rsvps", ["user_id", "show_id"]),
      this.rows("match_interest", ["user_id", "other_user_id"]),
      this.rows("match_skip", ["user_id", "other_user_id"]),
      this.rows("match_share", ["user_id", "other_user_id"]),
      this.rows("match_icebreaker", ["id"]),
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
      shares: shares.map((row) => {
        const edge: StoredShare = {
          userId: String(row.user_id),
          otherUserId: String(row.other_user_id),
          createdAt: text(row.created_at) ?? new Date().toISOString(),
        };
        return edge;
      }),
      icebreakers: icebreakers.map((row) => {
        const entry: StoredIcebreaker = {
          id: String(row.id),
          senderId: String(row.sender_id),
          recipientId: String(row.recipient_id),
          promptId: text(row.prompt_id) ?? "",
          promptText: text(row.prompt_text) ?? "",
          replyToId: text(row.reply_to_id),
          createdAt: text(row.created_at) ?? new Date().toISOString(),
        };
        return entry;
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

    const beforeShares = new Set(before.shares.map(interestKey));
    const afterShares = new Set(after.shares.map(interestKey));
    for (const edge of before.shares) {
      if (afterShares.has(interestKey(edge))) continue;
      await this.write(
        "match_share",
        this.client.from("match_share").delete().eq("user_id", edge.userId).eq("other_user_id", edge.otherUserId),
      );
    }
    const shareRows = after.shares
      .filter((edge) => !beforeShares.has(interestKey(edge)))
      .map((edge) => ({
        user_id: edge.userId,
        other_user_id: edge.otherUserId,
        created_at: edge.createdAt,
      }));
    if (shareRows.length) await this.write("match_share", this.client.from("match_share").insert(shareRows));

    const knownIcebreakers = new Set(before.icebreakers.map((row) => row.id));
    const icebreakerRows = after.icebreakers
      .filter((row) => !knownIcebreakers.has(row.id))
      .map((row) => ({
        id: row.id,
        sender_id: row.senderId,
        recipient_id: row.recipientId,
        prompt_id: row.promptId,
        prompt_text: row.promptText,
        reply_to_id: row.replyToId,
        created_at: row.createdAt,
      }));
    if (icebreakerRows.length) {
      await this.write("match_icebreaker", this.client.from("match_icebreaker").insert(icebreakerRows));
    }
  }

  async userIdForToken(token: string): Promise<string | null> {
    const { data, error } = await this.client.from("users").select("id").eq("token", token).maybeSingle();
    if (error) fail(error.message);
    return data ? String(data.id) : null;
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

const globalStore = globalThis as typeof globalThis & {
  __resonateRepo?: Repo;
  __resonateSnapshot?: { at: number; data: DataSnapshot };
};
let queue: Promise<unknown> = Promise.resolve();

/**
 * Reads reuse a snapshot for this long instead of reloading every table per request.
 * Writes always load fresh and refresh it, so your own changes show up at once;
 * other server instances can lag by up to this much.
 */
const READ_CACHE_MS = 10_000;
let inflight: Promise<DataSnapshot> | null = null;

async function cachedSnapshot(): Promise<DataSnapshot> {
  const cached = globalStore.__resonateSnapshot;
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return cached.data;
  // Requests arriving together share one load
  inflight ??= repo()
    .load()
    .then((data) => {
      globalStore.__resonateSnapshot = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

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
  if (!Array.isArray(snapshot.icebreakers)) snapshot.icebreakers = [];
  if (!Array.isArray(snapshot.shares)) snapshot.shares = [];
  for (const user of snapshot.users) {
    if (typeof user.name !== "string") user.name = user.handle || "";
    if (user.phone === undefined) user.phone = null;
    if (user.cityLat === undefined) user.cityLat = null;
    if (user.cityLng === undefined) user.cityLng = null;
    if (user.cityPlaceId === undefined) user.cityPlaceId = null;
    if (user.age === undefined) user.age = null;
    if (user.ageMin === undefined) user.ageMin = null;
    if (user.ageMax === undefined) user.ageMax = null;
  }
  return snapshot;
}

async function edit<T>(run: (snapshot: DataSnapshot) => Promise<T>): Promise<T> {
  const job = queue.then(async () => {
    const store = repo();
    const before = filled(await store.load());
    const next = structuredClone(before);
    const result = await run(next);
    await store.save(before, next);
    globalStore.__resonateSnapshot = { at: Date.now(), data: next };
    return result;
  });
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

async function read<T>(run: (snapshot: DataSnapshot) => T): Promise<T> {
  return run(filled(await cachedSnapshot()));
}

/**
 * Like read, for requests about one user. The cached snapshot can predate that user's signup
 * (made seconds ago, maybe on another server instance); then load fresh instead of "not found".
 */
async function readFor<T>(userId: string, run: (snapshot: DataSnapshot) => T): Promise<T> {
  let snapshot = filled(await cachedSnapshot());
  if (!snapshot.users.some((user) => user.id === userId)) {
    const data = await repo().load();
    globalStore.__resonateSnapshot = { at: Date.now(), data };
    snapshot = filled(data);
  }
  return run(snapshot);
}

export async function createUser(body: CreateUserBody): Promise<CreatedUser> {
  try {
    return await edit(async (snapshot) => {
      const id = await insertUser(snapshot, body);
      const profile = profileOf(snapshot, id);
      const token = snapshot.users.find((user) => user.id === id)?.token;
      if (!profile || !token) throw new StoreError(500, "Could not create user");
      return { ...profile, token };
    });
  } catch (error) {
    throw wrap(error);
  }
}

/** Which user owns this token, or null if none does. */
export async function userIdForToken(token: string): Promise<string | null> {
  try {
    return await repo().userIdForToken(token);
  } catch (error) {
    throw wrap(error);
  }
}

export async function findUserByPhone(phone: string): Promise<UserProfile | null> {
  try {
    const normalized = phone.trim();
    if (!normalized) return null;
    return await read((snapshot) => {
      const user = snapshot.users.find((row) => row.phone === normalized);
      return user ? profileOf(snapshot, user.id) : null;
    });
  } catch (error) {
    throw wrap(error);
  }
}

/**
 * Log a verified phone number into its profile: returns the profile and its token, or null if
 * no profile has that number. Only call after the number's ownership is proven (SMS code).
 * Uses a fresh load, not the read cache, so a signup from another server instance is found.
 */
export async function loginByPhone(phone: string): Promise<{ profile: UserProfile; token: string } | null> {
  try {
    return await edit(async (snapshot) => {
      const user = snapshot.users.find((row) => row.phone === phone.trim());
      if (!user) return null;
      user.token ??= crypto.randomUUID();
      const profile = profileOf(snapshot, user.id);
      return profile ? { profile, token: user.token } : null;
    });
  } catch (error) {
    throw wrap(error);
  }
}

/**
 * Log a verified Google sign-in into its profile: returns the profile and its token, or null if
 * no profile is linked to that Supabase Auth user. Fresh load, like loginByPhone.
 */
export async function loginByAuthUser(
  authUserId: string,
  avatarUrl: string | null = null,
): Promise<{ profile: UserProfile; token: string } | null> {
  try {
    return await edit(async (snapshot) => {
      const user = snapshot.users.find((row) => row.authUserId === authUserId);
      if (!user) return null;
      user.token ??= crypto.randomUUID();
      // Keep the picture in step with the Google account (people change it)
      if (avatarUrl) user.avatarUrl = avatarUrl;
      const profile = profileOf(snapshot, user.id);
      return profile ? { profile, token: user.token } : null;
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
    return await readFor(id, (snapshot) => profileOf(snapshot, id));
  } catch (error) {
    throw wrap(error);
  }
}

export async function getMatches(userId: string): Promise<MatchesResponse | null> {
  try {
    return await readFor(userId, (snapshot) => matchesOf(snapshot, userId));
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

      // Demo profiles also send an icebreaker back, so the receiving-end UI is demoable solo.
      if (mutual && other?.isDemo) {
        const alreadySent = snapshot.icebreakers.some(
          (row) => row.senderId === otherUserId && row.recipientId === userId,
        );
        if (!alreadySent) {
          const topShared =
            matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId)?.sharedArtists[0]
              ?.name ?? null;
          const [prompt] = icebreakerPrompts(topShared);
          if (prompt) {
            snapshot.icebreakers.push({
              id: crypto.randomUUID(),
              senderId: otherUserId,
              recipientId: userId,
              promptId: prompt.id,
              promptText: prompt.text,
              replyToId: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
      return { mutual, socials: match?.socials ?? null, match };
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

/**
 * Choosing to share your socials with a match. Requires mutual interest first. Socials only
 * actually unlock once BOTH sides have independently chosen to share, on top of that — one
 * person sharing never reveals anything to or about the other on its own.
 */
export async function setShare(
  userId: string,
  otherUserId: string,
  shared: boolean,
): Promise<ShareResponse | null> {
  try {
    if (userId === otherUserId) throw new StoreError(400, "Choose someone else");
    return await edit(async (snapshot) => {
      if (!snapshot.users.some((user) => user.id === userId)) return null;
      const other = snapshot.users.find((user) => user.id === otherUserId);
      if (!other) return null;

      const mutual =
        snapshot.interests.some((edge) => edge.userId === userId && edge.otherUserId === otherUserId) &&
        snapshot.interests.some((edge) => edge.userId === otherUserId && edge.otherUserId === userId);
      if (!mutual) throw new StoreError(403, "You can share once you're both interested");

      const same = (edge: { userId: string; otherUserId: string }) =>
        edge.userId === userId && edge.otherUserId === otherUserId;
      if (shared) {
        if (!snapshot.shares.some(same)) {
          snapshot.shares.push({ userId, otherUserId, createdAt: new Date().toISOString() });
        }
        // Demo profiles share back immediately, so the mutual-share state is reachable solo.
        const answered = snapshot.shares.some(
          (edge) => edge.userId === otherUserId && edge.otherUserId === userId,
        );
        if (other.isDemo && !answered) {
          snapshot.shares.push({ userId: otherUserId, otherUserId: userId, createdAt: new Date().toISOString() });
        }
      } else {
        snapshot.shares = snapshot.shares.filter((edge) => !same(edge));
      }

      const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
      return {
        youShared: shared,
        socialsUnlocked: Boolean(match?.socialsUnlocked),
        socials: match?.socials ?? null,
      };
    });
  } catch (error) {
    throw wrap(error);
  }
}

/**
 * Sends an icebreaker to a mutual match: a preset promptId, or free-form text that either
 * opens a custom ask (no open round) or replies to the open round. Same gate as socials:
 * only works once both sides have tapped interested.
 *
 * Prompts and replies form rounds: a prompt opens a round, and only the recipient of that
 * prompt can close it by replying. Nobody can open a new round while one is already open.
 * Demo profiles auto-reply to whatever you send them, so a solo demo never gets stuck waiting.
 */
export async function sendIcebreaker(
  userId: string,
  otherUserId: string,
  promptId: string | null,
  customText: string | null,
): Promise<SendIcebreakerResponse | null> {
  try {
    if (userId === otherUserId) throw new StoreError(400, "Choose someone else");
    return await edit(async (snapshot) => {
      if (!snapshot.users.some((user) => user.id === userId)) return null;
      const other = snapshot.users.find((user) => user.id === otherUserId);
      if (!other) return null;

      const mutual =
        snapshot.interests.some((edge) => edge.userId === userId && edge.otherUserId === otherUserId) &&
        snapshot.interests.some((edge) => edge.userId === otherUserId && edge.otherUserId === userId);
      if (!mutual) throw new StoreError(403, "You can send an icebreaker once you're both interested");

      // One open prompt per pair at a time, whoever sent it: once either side asks, nobody
      // (including the asker) can ask again until the recipient answers it.
      const state = icebreakerFor(userId, otherUserId, true, snapshot.icebreakers)!;
      const openRound = state.rounds[state.rounds.length - 1];
      const isOpen = Boolean(openRound && !openRound.reply);

      // Preset prompts open a round; custom text can open a round (no open round) or reply.
      let text: string | null;
      let finalPromptId: string;
      let replyToId: string | null;
      if (promptId) {
        if (isOpen) throw new StoreError(403, "Wait for the open prompt to be answered first.");
        const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
        const topShared = match?.sharedArtists[0]?.name ?? null;
        text = icebreakerText(promptId, topShared);
        finalPromptId = promptId;
        replyToId = null;
        if (!text) throw new StoreError(400, "Pick a different prompt");
      } else if (isOpen) {
        if (openRound.promptFromMe) throw new StoreError(400, "Nothing to answer yet");
        text = customText?.trim().slice(0, 240) || null;
        finalPromptId = "custom";
        replyToId = openRound.id;
        if (!text) throw new StoreError(400, "Answer in your own words");
      } else {
        // No open round + free-form text ⇒ open a custom ask (same one-open-round rule).
        text = customText?.trim().slice(0, 240) || null;
        finalPromptId = "custom";
        replyToId = null;
        if (!text) throw new StoreError(400, "Ask something in your own words");
      }
      const sent: StoredIcebreaker = {
        id: crypto.randomUUID(),
        senderId: userId,
        recipientId: otherUserId,
        promptId: finalPromptId,
        promptText: text,
        replyToId,
        createdAt: new Date().toISOString(),
      };
      snapshot.icebreakers.push(sent);

      // Demo asking you something new: prefers a prompt neither side has opened with yet in
      // this conversation (not just ones the demo itself asked — otherwise it can immediately
      // re-ask the exact question you just asked it), cycling back once they run out.
      const demoAsksSomethingNew = () => {
        const askedBefore = snapshot.icebreakers.filter(
          (row) =>
            !row.replyToId &&
            ((row.senderId === otherUserId && row.recipientId === userId) ||
              (row.senderId === userId && row.recipientId === otherUserId)),
        );
        const alreadyAsked = new Set(askedBefore.map((row) => row.promptId));
        const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
        const topShared = match?.sharedArtists[0]?.name ?? null;
        const candidates = icebreakerPrompts(topShared);
        if (candidates.length === 0) return;
        const next =
          candidates.find((candidate) => !alreadyAsked.has(candidate.id)) ??
          candidates[askedBefore.length % candidates.length];
        snapshot.icebreakers.push({
          id: crypto.randomUUID(),
          senderId: otherUserId,
          recipientId: userId,
          promptId: next.id,
          promptText: next.text,
          replyToId: null,
          createdAt: new Date().toISOString(),
        });
      };

      if (!replyToId && other.isDemo) {
        // A new round opened on a demo profile: they reply immediately so you're never stuck waiting.
        const match = matchesOf(snapshot, userId)?.matches.find((card) => card.userId === otherUserId) ?? null;
        const topShared = match?.sharedArtists[0]?.name ?? null;
        snapshot.icebreakers.push({
          id: crypto.randomUUID(),
          senderId: otherUserId,
          recipientId: userId,
          promptId: "custom",
          promptText: demoAutoReply(sent.promptId, topShared, snapshot.icebreakers.length),
          replyToId: sent.id,
          createdAt: new Date().toISOString(),
        });
        // About half the time they also turn around and ask you something themselves, so
        // they keep getting chances to be the asker instead of just answering forever.
        if (Math.random() < 0.5) demoAsksSomethingNew();
      }

      if (replyToId && other.isDemo && Math.random() < 0.5) {
        // You just answered a question the demo asked: about half the time they ask
        // something new right back, and the rest of the time they leave it open so you get
        // to be the one who asks next.
        demoAsksSomethingNew();
      }

      return { icebreaker: icebreakerFor(userId, otherUserId, true, snapshot.icebreakers)! };
    });
  } catch (error) {
    throw wrap(error);
  }
}

export async function listShows(userId: string, options: ShowListOptions = {}): Promise<ShowListResponse> {
  try {
    return await readFor(userId, (snapshot) => listShowsOf(snapshot, userId, options));
  } catch (error) {
    throw wrap(error);
  }
}

export async function getShow(showId: string, userId: string): Promise<ShowDetail | null> {
  try {
    return await readFor(userId, (snapshot) => showDetailOf(snapshot, showId, userId));
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
