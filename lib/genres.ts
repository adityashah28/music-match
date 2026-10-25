/**
 * The genres people can filter shows by. Every source's own labels (Ticketmaster
 * classifications, Songkick tags, our artist scenes) are mapped onto this one list,
 * so the filter offers clean options instead of each site's vocabulary.
 */
export const GENRES = [
  { id: "pop", label: "Pop" },
  { id: "hiphop", label: "Hip-Hop" },
  { id: "rnb", label: "R&B" },
  { id: "rock", label: "Rock" },
  { id: "indie", label: "Indie & Alt" },
  { id: "electronic", label: "Electronic" },
  { id: "latin", label: "Latin" },
  { id: "kpop", label: "K-Pop" },
  { id: "country", label: "Country" },
  { id: "jazz", label: "Jazz & Blues" },
  { id: "metal", label: "Metal" },
  { id: "folk", label: "Folk" },
  { id: "classical", label: "Classical" },
  { id: "world", label: "World & Reggae" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

const IDS = new Set<string>(GENRES.map((genre) => genre.id));

export function isGenre(value: string): value is GenreId {
  return IDS.has(value);
}

// Ticketmaster Discovery genre and sub-genre names (lowercased)
const TICKETMASTER: Record<string, GenreId> = {
  pop: "pop",
  "hip-hop/rap": "hiphop",
  "r&b": "rnb",
  rock: "rock",
  alternative: "indie",
  "alternative rock": "indie",
  "indie rock": "indie",
  "indie pop": "indie",
  "dance/electronic": "electronic",
  latin: "latin",
  "k-pop": "kpop",
  "j-pop": "pop",
  country: "country",
  jazz: "jazz",
  blues: "jazz",
  metal: "metal",
  "hard rock": "metal",
  folk: "folk",
  classical: "classical",
  world: "world",
  reggae: "world",
};

// Songkick's genre keys
const SONGKICK: Record<string, GenreId> = {
  pop: "pop",
  hip_hop: "hiphop",
  funk_soul: "rnb",
  rnb: "rnb",
  rock: "rock",
  indie_alternative: "indie",
  electronic: "electronic",
  latin: "latin",
  country: "country",
  jazz_blues: "jazz",
  jazz: "jazz",
  blues: "jazz",
  metal: "metal",
  folk: "folk",
  classical: "classical",
  reggae: "world",
  world: "world",
};

function unique(ids: (GenreId | undefined)[]): GenreId[] {
  return [...new Set(ids.filter((id): id is GenreId => Boolean(id)))];
}

/** Ticketmaster event classifications -> genres ("Other" / "Undefined" give nothing). */
export function fromTicketmasterClassifications(
  classifications: { genre?: { name?: string }; subGenre?: { name?: string } }[] | undefined,
): GenreId[] {
  return unique(
    (classifications ?? []).flatMap((c) => [
      TICKETMASTER[c.subGenre?.name?.toLowerCase() ?? ""],
      TICKETMASTER[c.genre?.name?.toLowerCase() ?? ""],
    ]),
  );
}

/** Songkick performer genre keys -> genres. */
export function fromSongkickGenres(keys: unknown): GenreId[] {
  return unique((Array.isArray(keys) ? keys : []).map((key) => SONGKICK[String(key).toLowerCase()]));
}

/** Our artist scene tags (scripts/data/scenes.ts) already use these ids. */
export function fromScenes(scenes: string[] | undefined): GenreId[] {
  return unique((scenes ?? []).map((scene) => (isGenre(scene) ? scene : undefined)));
}
