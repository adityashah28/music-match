import { agesCompatible } from "./age";
import { normalizeName } from "./normalize";
import type {
  IcebreakerState,
  InterestEdge,
  MatchCard,
  MatchPerson,
  MatchShow,
  MatchesResponse,
  Socials,
  StoredIcebreaker,
  StoredShow,
} from "./types";

/** Fewer than this many non-demo profiles means the room is still early. */
export const EARLY_NON_DEMO_LIMIT = 5;

const NEIGHBOR_FACTOR = 0.4;
const GENRE_BONUS_EACH = 0.05;
const GENRE_BONUS_CAP = 3;
const STRONG_RATIO = 0.62;
const GOOD_RATIO = 0.3;
const MAX_MATCHES = 30;
const MAX_SHARED_SHOWS = 5;

export function artistWeight(listedBy: number): number {
  return 1 / Math.log(2 + Math.max(0, listedBy));
}

type ArtistRef = MatchPerson["artists"][number];

type Side = {
  artists: ArtistRef[];
  ids: Set<string>;
  genres: Set<string>;
};

function asSide(artists: ArtistRef[]): Side {
  const ids = new Set<string>();
  const genres = new Set<string>();
  for (const artist of artists) {
    ids.add(artist.id);
    for (const genre of artist.genres) {
      const cleaned = genre.trim().toLowerCase();
      if (cleaned) genres.add(cleaned);
    }
  }
  return { artists, ids, genres };
}

function genreBonus(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const genre of a) {
    if (b.has(genre)) shared += 1;
  }
  return GENRE_BONUS_EACH * Math.min(shared, GENRE_BONUS_CAP);
}

export type PairScore = {
  raw: number;
  shared: ArtistRef[];
  neighbor: boolean;
};

/**
 * Exact overlap sums rarity weights.
 * Neighbor credit is 0.4 * w once per unordered artist pair when either
 * artist is on the other's related list. Both directions count once.
 * A small shared-genre bonus is added after that.
 */
export function scorePair(
  aArtists: ArtistRef[],
  bArtists: ArtistRef[],
  weightOf: Map<string, number>,
  related: Set<string>,
): PairScore {
  const a = asSide(aArtists);
  const b = asSide(bArtists);
  const shared = a.artists
    .filter((artist) => b.ids.has(artist.id))
    .sort(
      (left, right) =>
        (weightOf.get(right.id) ?? 0) - (weightOf.get(left.id) ?? 0) ||
        left.name.localeCompare(right.name),
    );

  let exact = 0;
  for (const artist of shared) exact += weightOf.get(artist.id) ?? 0;

  const seen = new Set<string>();
  let neighborScore = 0;
  for (const left of a.artists) {
    for (const right of b.artists) {
      if (left.id === right.id) continue;
      const key = left.id < right.id ? `${left.id}|${right.id}` : `${right.id}|${left.id}`;
      if (seen.has(key)) continue;
      const linked =
        related.has(`${left.id}|${right.id}`) || related.has(`${right.id}|${left.id}`);
      if (!linked) continue;
      seen.add(key);
      const weight = Math.max(weightOf.get(left.id) ?? 0, weightOf.get(right.id) ?? 0);
      neighborScore += NEIGHBOR_FACTOR * weight;
    }
  }

  return {
    raw: exact + neighborScore + genreBonus(a.genres, b.genres),
    shared,
    neighbor: seen.size > 0,
  };
}

export function labelFor(ratio: number): { label: string; score: number } {
  const clamped = Math.max(0, Math.min(1, ratio));
  const score = Math.round(clamped * 100);
  if (clamped >= STRONG_RATIO) return { label: "Strong match", score };
  if (clamped >= GOOD_RATIO) return { label: "Good match", score };
  return { label: `${score}%`, score };
}

export function whyLine(sharedNames: string[]): string {
  const names = sharedNames.filter(Boolean).slice(0, 3);
  if (names.length === 0) return "You share similar artists.";
  if (names.length === 1) return `You both listed ${names[0]}.`;
  if (names.length === 2) return `You both listed ${names[0]} and ${names[1]}.`;
  return `You both listed ${names[0]}, ${names[1]}, and ${names[2]}.`;
}

/** Revealed only once there's mutual interest AND both sides have independently chosen to share. */
export function socialsFor(person: MatchPerson, mutual: boolean, mutualShare: boolean): Socials {
  if (!mutual || !mutualShare) return null;
  if (person.isDemo) return { placeholder: true, kind: "demo" };
  return {
    instagram: person.instagram,
    tiktok: person.tiktok,
    snapchat: person.snapchat,
  };
}

export function icebreakerFor(
  selfId: string,
  otherId: string,
  mutual: boolean,
  icebreakers: StoredIcebreaker[],
): IcebreakerState | null {
  if (!mutual) return null;
  const between = icebreakers.filter(
    (row) =>
      (row.senderId === selfId && row.recipientId === otherId) ||
      (row.senderId === otherId && row.recipientId === selfId),
  );
  const replyByPromptId = new Map(
    between.filter((row) => row.replyToId).map((row) => [row.replyToId as string, row]),
  );
  const rounds = between
    .filter((row) => !row.replyToId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((prompt) => {
      const reply = replyByPromptId.get(prompt.id);
      return {
        id: prompt.id,
        promptFromMe: prompt.senderId === selfId,
        promptText: prompt.promptText,
        promptAt: prompt.createdAt,
        reply: reply
          ? { fromMe: reply.senderId === selfId, text: reply.promptText, createdAt: reply.createdAt }
          : null,
      };
    });
  return { rounds };
}

export type ShowContext = {
  shows: StoredShow[];
  /** Going RSVPs only. */
  going: Array<{ userId: string; showId: string }>;
  now: number;
};

type ShowPick = { show: MatchShow; tier: number; time: number };

/**
 * Tiers, best first: both going (0), shared artist with one of you going (1),
 * shared artist (2), they're going (3). Tiers 0-2 count as shared shows.
 * Past shows are dropped. Ties go to the soonest date. `shared` lists the best few shared shows.
 */
export function pickShows(
  selfId: string,
  otherId: string,
  sharedNames: Set<string>,
  context: ShowContext,
): { show: MatchShow | null; shared: MatchShow[] } {
  const picks: ShowPick[] = [];
  for (const show of context.shows) {
    const time = show.startsAt ? Date.parse(show.startsAt) : Number.NaN;
    if (Number.isFinite(time) && time < context.now) continue;
    const you = context.going.some((row) => row.userId === selfId && row.showId === show.id);
    const them = context.going.some((row) => row.userId === otherId && row.showId === show.id);
    const sharedArtist = sharedNames.has(show.normalizedArtistName || normalizeName(show.artistName));
    let tier: number;
    if (you && them) tier = 0;
    else if (sharedArtist && (you || them)) tier = 1;
    else if (sharedArtist) tier = 2;
    else if (them) tier = 3;
    else continue;
    picks.push({
      tier,
      time: Number.isFinite(time) ? time : Number.POSITIVE_INFINITY,
      show: {
        id: show.id,
        artistName: show.artistName,
        venue: show.venue,
        city: show.city,
        startsAt: show.startsAt,
        going: you && them ? "both" : them ? "them" : you ? "you" : null,
      },
    });
  }
  picks.sort((a, b) => a.tier - b.tier || a.time - b.time);
  return {
    show: picks[0]?.show ?? null,
    shared: picks
      .filter((pick) => pick.tier <= 2)
      .slice(0, MAX_SHARED_SHOWS)
      .map((pick) => pick.show),
  };
}

export function buildMatches(
  selfId: string,
  people: MatchPerson[],
  relatedPairs: Array<{ artistId: string; relatedArtistId: string }>,
  interests: InterestEdge[],
  skips: InterestEdge[] = [],
  showContext: ShowContext = { shows: [], going: [], now: Date.now() },
  icebreakers: StoredIcebreaker[] = [],
  shares: InterestEdge[] = [],
): MatchesResponse | null {
  const self = people.find((person) => person.id === selfId);
  if (!self) return null;

  const listedBy = new Map<string, number>();
  for (const person of people) {
    const seen = new Set<string>();
    for (const artist of person.artists) {
      if (seen.has(artist.id)) continue;
      seen.add(artist.id);
      listedBy.set(artist.id, (listedBy.get(artist.id) ?? 0) + 1);
    }
  }
  const weightOf = new Map<string, number>();
  for (const [artistId, count] of listedBy) {
    weightOf.set(artistId, artistWeight(count));
  }

  const related = new Set(
    relatedPairs.map((edge) => `${edge.artistId}|${edge.relatedArtistId}`),
  );
  const selfScore = scorePair(self.artists, self.artists, weightOf, related).raw;
  const outgoing = new Set(
    interests.filter((edge) => edge.userId === selfId).map((edge) => edge.otherUserId),
  );
  const incoming = new Set(
    interests.filter((edge) => edge.otherUserId === selfId).map((edge) => edge.userId),
  );

  const skipped = new Set(
    skips.filter((edge) => edge.userId === selfId).map((edge) => edge.otherUserId),
  );

  const sharedOut = new Set(
    shares.filter((edge) => edge.userId === selfId).map((edge) => edge.otherUserId),
  );
  const sharedIn = new Set(
    shares.filter((edge) => edge.otherUserId === selfId).map((edge) => edge.userId),
  );

  const ranked = people
    .filter(
      (person) =>
        person.id !== selfId &&
        !skipped.has(person.id) &&
        agesCompatible(self.age, self.ageMin, self.ageMax, person.age, person.ageMin, person.ageMax),
    )
    .map((person) => {
      const pair = scorePair(self.artists, person.artists, weightOf, related);
      // Score against the smaller of the two lists: the most overlap these two could have.
      // Dividing by your own list alone made every match shrink as you added artists.
      const otherScore = scorePair(person.artists, person.artists, weightOf, related).raw;
      const possible = Math.min(selfScore, otherScore);
      const ratio = possible > 0 ? Math.min(1, pair.raw / possible) : 0;
      return { person, pair, ratio };
    })
    .sort(
      (left, right) =>
        right.ratio - left.ratio ||
        // Equal ratios (e.g. two people whose whole lists sit inside yours): more and rarer overlap first
        right.pair.raw - left.pair.raw ||
        right.pair.shared.length - left.pair.shared.length ||
        left.person.handle.localeCompare(right.person.handle),
    );

  const connected = ranked.filter(
    (entry) =>
      entry.pair.shared.length > 0 || entry.pair.neighbor || entry.ratio >= GOOD_RATIO,
  );
  const chosen =
    connected.length > 0
      ? connected
      : ranked.filter((entry) => entry.person.isDemo).slice(0, 8);

  const matches: MatchCard[] = chosen.slice(0, MAX_MATCHES).map((entry) => {
    const { label, score } = labelFor(entry.ratio);
    const interested = outgoing.has(entry.person.id);
    const mutual = interested && incoming.has(entry.person.id);
    const youShared = sharedOut.has(entry.person.id);
    const mutualShare = youShared && sharedIn.has(entry.person.id);
    const shows = pickShows(
      selfId,
      entry.person.id,
      new Set(entry.pair.shared.map((artist) => normalizeName(artist.name))),
      showContext,
    );
    return {
      userId: entry.person.id,
      name: entry.person.name || entry.person.handle,
      handle: entry.person.handle,
      avatarUrl: entry.person.avatarUrl,
      city: entry.person.city,
      age: entry.person.age,
      isDemo: entry.person.isDemo,
      label,
      score,
      why: whyLine(entry.pair.shared.map((artist) => artist.name)),
      sharedArtists: entry.pair.shared.map((artist) => ({
        name: artist.name,
        imageUrl: artist.imageUrl,
        color: artist.color,
      })),
      show: shows.show,
      sharedShows: shows.shared,
      suggestedShow: mutual ? (shows.shared[0] ?? null) : null,
      interested,
      mutual,
      youShared,
      socialsUnlocked: mutual && mutualShare,
      socials: socialsFor(entry.person, mutual, mutualShare),
      icebreaker: icebreakerFor(selfId, entry.person.id, mutual, icebreakers),
    };
  });

  const nonDemo = people.filter((person) => !person.isDemo).length;
  return {
    early: nonDemo < EARLY_NON_DEMO_LIMIT,
    matches,
  };
}

export function summarizeTaste(names: string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);

  if (top.length === 0) return "Nobody is going yet.";
  if (top.length === 1) return `People going mostly list ${top[0]}.`;
  if (top.length === 2) return `People going also list ${top[0]} and ${top[1]}.`;
  return `People going also list ${top[0]}, ${top[1]}, and ${top[2]}.`;
}
