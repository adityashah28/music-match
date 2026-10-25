import { normalizeName } from "./normalize";
import type {
  DataSnapshot,
  StoredArtist,
  StoredLink,
  StoredRelated,
  StoredRsvp,
  StoredShow,
  StoredUser,
} from "./types";

const SEEDED_AT = "2026-10-01T19:00:00.000Z";

type Scene = {
  genre: string;
  color: string;
  names: string[];
};

const SCENES: Scene[] = [
  {
    genre: "indie",
    color: "#c4622d",
    names: [
      "Mitski",
      "Phoebe Bridgers",
      "Boygenius",
      "Clairo",
      "Big Thief",
      "Japanese Breakfast",
      "Snail Mail",
      "Soccer Mommy",
    ],
  },
  {
    genre: "hip-hop",
    color: "#1f6f4a",
    names: [
      "Kendrick Lamar",
      "Tyler the Creator",
      "Vince Staples",
      "Earl Sweatshirt",
      "Little Simz",
      "Noname",
    ],
  },
  {
    genre: "pop",
    color: "#e23b78",
    names: [
      "Charli XCX",
      "Chappell Roan",
      "Sabrina Carpenter",
      "Olivia Rodrigo",
      "Dua Lipa",
    ],
  },
  {
    genre: "electronic",
    color: "#2f6fe0",
    names: ["Fred again..", "Bicep", "Four Tet", "Jamie xx", "Overmono"],
  },
  {
    genre: "rock",
    color: "#c23b2e",
    names: [
      "Fontaines D.C.",
      "Turnstile",
      "IDLES",
      "The Strokes",
      "Arctic Monkeys",
    ],
  },
  {
    genre: "r&b",
    color: "#6d3d99",
    names: [
      "SZA",
      "Frank Ocean",
      "Daniel Caesar",
      "Giveon",
      "Steve Lacy",
      "Brent Faiyaz",
    ],
  },
];

const PROFILES: Array<{
  name?: string;
  handle: string;
  city: string;
  age?: number;
  ageMin?: number;
  ageMax?: number;
  artists: string[];
}> = [
  {
    name: "Maya",
    handle: "bay-indie-1",
    city: "Berkeley",
    age: 24,
    artists: ["Mitski", "Phoebe Bridgers", "Boygenius", "Clairo", "Big Thief"],
  },
  {
    name: "Jules",
    handle: "bay-indie-2",
    city: "Oakland",
    age: 26,
    artists: [
      "Phoebe Bridgers",
      "Snail Mail",
      "Soccer Mommy",
      "Japanese Breakfast",
      "Mitski",
    ],
  },
  {
    name: "Sam",
    handle: "bay-indie-3",
    city: "San Francisco",
    age: 23,
    artists: ["Big Thief", "Clairo", "Boygenius", "Soccer Mommy", "Snail Mail"],
  },
  {
    name: "Riley",
    handle: "bay-indie-4",
    city: "Berkeley",
    age: 27,
    artists: [
      "Japanese Breakfast",
      "Mitski",
      "Clairo",
      "Phoebe Bridgers",
      "The Strokes",
    ],
  },
  {
    name: "Kai",
    handle: "bay-hiphop-1",
    city: "Oakland",
    age: 25,
    artists: [
      "Kendrick Lamar",
      "Tyler the Creator",
      "Vince Staples",
      "Earl Sweatshirt",
      "Little Simz",
    ],
  },
  {
    name: "Noah",
    handle: "bay-hiphop-2",
    city: "San Francisco",
    age: 24,
    artists: [
      "Vince Staples",
      "Earl Sweatshirt",
      "Noname",
      "Little Simz",
      "Kendrick Lamar",
    ],
  },
  {
    name: "Avery",
    handle: "bay-hiphop-3",
    city: "Berkeley",
    age: 22,
    artists: [
      "Tyler the Creator",
      "Kendrick Lamar",
      "Earl Sweatshirt",
      "Noname",
      "Steve Lacy",
    ],
  },
  {
    name: "Quinn",
    handle: "bay-hiphop-4",
    city: "Oakland",
    age: 28,
    artists: [
      "Little Simz",
      "Noname",
      "Vince Staples",
      "Earl Sweatshirt",
      "Tyler the Creator",
    ],
  },
  {
    name: "Harper",
    handle: "bay-pop-1",
    city: "San Francisco",
    age: 21,
    artists: [
      "Charli XCX",
      "Chappell Roan",
      "Sabrina Carpenter",
      "Olivia Rodrigo",
      "Dua Lipa",
    ],
  },
  {
    name: "Reese",
    handle: "bay-pop-2",
    city: "Oakland",
    age: 23,
    artists: [
      "Chappell Roan",
      "Sabrina Carpenter",
      "Olivia Rodrigo",
      "Dua Lipa",
      "Fred again..",
    ],
  },
  {
    name: "Parker",
    handle: "bay-pop-3",
    city: "Berkeley",
    age: 25,
    artists: ["Charli XCX", "Chappell Roan", "Olivia Rodrigo", "Dua Lipa", "SZA"],
  },
  {
    name: "Casey",
    handle: "bay-pop-4",
    city: "San Francisco",
    age: 22,
    artists: [
      "Charli XCX",
      "Chappell Roan",
      "Sabrina Carpenter",
      "Olivia Rodrigo",
      "Clairo",
    ],
  },
  {
    name: "Drew",
    handle: "bay-electronic-1",
    city: "Oakland",
    age: 29,
    artists: ["Fred again..", "Bicep", "Four Tet", "Jamie xx", "Overmono"],
  },
  {
    name: "Cameron",
    handle: "bay-electronic-2",
    city: "San Francisco",
    age: 27,
    artists: ["Bicep", "Four Tet", "Jamie xx", "Overmono", "Charli XCX"],
  },
  {
    name: "Rowan",
    handle: "bay-electronic-3",
    city: "Berkeley",
    age: 26,
    artists: ["Fred again..", "Bicep", "Jamie xx", "Overmono", "Dua Lipa"],
  },
  {
    name: "Skyler",
    handle: "bay-electronic-4",
    city: "Oakland",
    age: 24,
    artists: ["Fred again..", "Four Tet", "Jamie xx", "Bicep", "Charli XCX"],
  },
  {
    name: "Jordan",
    handle: "bay-rock-1",
    city: "San Francisco",
    age: 30,
    artists: [
      "Fontaines D.C.",
      "Turnstile",
      "IDLES",
      "The Strokes",
      "Arctic Monkeys",
    ],
  },
  {
    name: "Taylor",
    handle: "bay-rock-2",
    city: "Oakland",
    age: 28,
    artists: [
      "Turnstile",
      "IDLES",
      "Fontaines D.C.",
      "Arctic Monkeys",
      "Phoebe Bridgers",
    ],
  },
  {
    name: "Morgan",
    handle: "bay-rock-3",
    city: "Berkeley",
    age: 25,
    artists: [
      "The Strokes",
      "Arctic Monkeys",
      "Fontaines D.C.",
      "IDLES",
      "Mitski",
    ],
  },
  {
    name: "Alex",
    handle: "bay-rock-4",
    city: "San Francisco",
    age: 23,
    artists: [
      "Arctic Monkeys",
      "The Strokes",
      "Turnstile",
      "IDLES",
      "Boygenius",
    ],
  },
  {
    name: "Blair",
    handle: "bay-rnb-1",
    city: "Oakland",
    age: 26,
    artists: ["SZA", "Frank Ocean", "Daniel Caesar", "Giveon", "Steve Lacy"],
  },
  {
    name: "Devon",
    handle: "bay-rnb-2",
    city: "San Francisco",
    age: 24,
    artists: ["Frank Ocean", "Daniel Caesar", "Giveon", "Brent Faiyaz", "SZA"],
  },
  {
    name: "Emery",
    handle: "bay-rnb-3",
    city: "Berkeley",
    age: 22,
    artists: [
      "Steve Lacy",
      "Brent Faiyaz",
      "Giveon",
      "Daniel Caesar",
      "Tyler the Creator",
    ],
  },
  {
    name: "Finley",
    handle: "bay-rnb-4",
    city: "Oakland",
    age: 27,
    artists: [
      "Brent Faiyaz",
      "SZA",
      "Steve Lacy",
      "Frank Ocean",
      "Kendrick Lamar",
    ],
  },
];

const SHOW_ROWS: Array<{
  artistName: string;
  venue: string;
  city: string;
  startsAt: string;
}> = [
  {
    artistName: "Chappell Roan",
    venue: "Greek Theatre Berkeley",
    city: "Berkeley",
    startsAt: "2026-10-28T19:00:00-07:00",
  },
  {
    artistName: "Clairo",
    venue: "The Independent",
    city: "San Francisco",
    startsAt: "2026-10-30T20:00:00-07:00",
  },
  {
    artistName: "Mitski",
    venue: "The Fillmore",
    city: "San Francisco",
    startsAt: "2026-11-06T20:00:00-08:00",
  },
  {
    artistName: "Fontaines D.C.",
    venue: "The Independent",
    city: "San Francisco",
    startsAt: "2026-11-08T20:00:00-08:00",
  },
  {
    artistName: "Turnstile",
    venue: "The Fillmore",
    city: "San Francisco",
    startsAt: "2026-11-13T20:00:00-08:00",
  },
  {
    artistName: "Phoebe Bridgers",
    venue: "Greek Theatre Berkeley",
    city: "Berkeley",
    startsAt: "2026-11-14T19:30:00-08:00",
  },
  {
    artistName: "Tyler the Creator",
    venue: "Fox Theater Oakland",
    city: "Oakland",
    startsAt: "2026-11-18T20:00:00-08:00",
  },
  {
    artistName: "Charli XCX",
    venue: "Bill Graham Civic",
    city: "San Francisco",
    startsAt: "2026-11-20T20:00:00-08:00",
  },
  {
    artistName: "Little Simz",
    venue: "The Independent",
    city: "San Francisco",
    startsAt: "2026-11-22T20:00:00-08:00",
  },
  {
    artistName: "Arctic Monkeys",
    venue: "Greek Theatre Berkeley",
    city: "Berkeley",
    startsAt: "2026-11-27T19:30:00-08:00",
  },
  {
    artistName: "Four Tet",
    venue: "The Fillmore",
    city: "San Francisco",
    startsAt: "2026-12-02T20:00:00-08:00",
  },
  {
    artistName: "Kendrick Lamar",
    venue: "Chase Center",
    city: "San Francisco",
    startsAt: "2026-12-04T20:00:00-08:00",
  },
  {
    artistName: "Fred again..",
    venue: "Bill Graham Civic",
    city: "San Francisco",
    startsAt: "2026-12-11T21:00:00-08:00",
  },
  {
    artistName: "SZA",
    venue: "Chase Center",
    city: "San Francisco",
    startsAt: "2026-12-12T20:00:00-08:00",
  },
  {
    artistName: "Frank Ocean",
    venue: "Fox Theater Oakland",
    city: "Oakland",
    startsAt: "2027-01-23T20:00:00-08:00",
  },
];

const GOING: Array<{ handle: string; artistName: string }> = [
  { handle: "bay-indie-1", artistName: "Mitski" },
  { handle: "bay-indie-2", artistName: "Mitski" },
  { handle: "bay-indie-4", artistName: "Mitski" },
  { handle: "bay-pop-1", artistName: "Chappell Roan" },
  { handle: "bay-pop-2", artistName: "Chappell Roan" },
  { handle: "bay-pop-3", artistName: "Chappell Roan" },
  { handle: "bay-hiphop-1", artistName: "Kendrick Lamar" },
  { handle: "bay-hiphop-2", artistName: "Kendrick Lamar" },
  { handle: "bay-rnb-4", artistName: "Kendrick Lamar" },
  { handle: "bay-electronic-1", artistName: "Four Tet" },
  { handle: "bay-electronic-2", artistName: "Four Tet" },
  { handle: "bay-rock-1", artistName: "Fontaines D.C." },
  { handle: "bay-rock-3", artistName: "Fontaines D.C." },
  { handle: "bay-rnb-1", artistName: "SZA" },
  { handle: "bay-rnb-2", artistName: "SZA" },
  { handle: "bay-pop-3", artistName: "SZA" },
];

const CITIES = new Set(["Berkeley", "Oakland", "San Francisco"]);
const VENUES = new Set([
  "The Fillmore",
  "Fox Theater Oakland",
  "Greek Theatre Berkeley",
  "Bill Graham Civic",
  "The Independent",
  "Chase Center",
]);

function stableId(prefix: "a1000000" | "b2000000" | "c3000000", n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function mustArtist(byName: Map<string, StoredArtist>, name: string): StoredArtist {
  const artist = byName.get(normalizeName(name));
  if (!artist) throw new Error(`Unknown seed artist: ${name}`);
  return artist;
}

/** In-memory demo snapshot. Ids stay the same across calls. */
export function createSeed(): DataSnapshot {
  const artists: StoredArtist[] = [];
  const sceneOf = new Map<string, Scene>();
  let artistNumber = 1;
  for (const scene of SCENES) {
    for (const name of scene.names) {
      const normalizedName = normalizeName(name);
      if (sceneOf.has(normalizedName)) {
        throw new Error(`Duplicate seed artist: ${name}`);
      }
      sceneOf.set(normalizedName, scene);
      artists.push({
        id: stableId("a1000000", artistNumber),
        name,
        normalizedName,
        imageUrl: null,
        dominantColorHex: scene.color,
        monthlyListeners: null,
        genres: [scene.genre],
        spotifyId: null,
        source: "seed",
        updatedAt: SEEDED_AT,
      });
      artistNumber += 1;
    }
  }
  const byName = new Map(artists.map((artist) => [artist.normalizedName, artist]));

  const related: StoredRelated[] = [];
  for (const scene of SCENES) {
    for (const name of scene.names) {
      const from = mustArtist(byName, name);
      let rank = 1;
      for (const other of scene.names) {
        if (other === name) continue;
        const to = mustArtist(byName, other);
        related.push({
          artistId: from.id,
          relatedArtistId: to.id,
          rank,
        });
        rank += 1;
      }
    }
  }

  const users: StoredUser[] = [];
  const links: StoredLink[] = [];
  const handles = new Set<string>();
  PROFILES.forEach((profile, index) => {
    if (handles.has(profile.handle)) {
      throw new Error(`Duplicate seed handle: ${profile.handle}`);
    }
    handles.add(profile.handle);
    if (!CITIES.has(profile.city)) {
      throw new Error(`Unexpected city for ${profile.handle}`);
    }
    if (profile.artists.length !== 5 || new Set(profile.artists).size !== 5) {
      throw new Error(`${profile.handle} needs 5 different artists`);
    }
    const age = profile.age ?? 24;
    const user: StoredUser = {
      id: stableId("b2000000", index + 1),
      name: profile.name ?? profile.handle,
      handle: profile.handle,
      phone: null,
      city: profile.city,
      cityLat: null,
      cityLng: null,
      cityPlaceId: null,
      age,
      ageMin: profile.ageMin ?? 18,
      ageMax: profile.ageMax ?? 99,
      instagram: null,
      tiktok: null,
      snapchat: null,
      isDemo: true,
      createdAt: SEEDED_AT,
      token: null,
      email: null,
      authUserId: null,
    };
    users.push(user);
    profile.artists.forEach((name, position) => {
      links.push({
        userId: user.id,
        artistId: mustArtist(byName, name).id,
        position: position + 1,
      });
    });
  });

  const shows: StoredShow[] = SHOW_ROWS.map((show, index) => {
    const artist = mustArtist(byName, show.artistName);
    if (!VENUES.has(show.venue)) throw new Error(`Unexpected venue: ${show.venue}`);
    if (Date.parse(show.startsAt) <= Date.parse("2026-10-24T23:59:59-07:00")) {
      throw new Error(`Show for ${show.artistName} is not after 2026-10-24`);
    }
    return {
      id: stableId("c3000000", index + 1),
      artistName: show.artistName,
      normalizedArtistName: artist.normalizedName,
      venue: show.venue,
      city: show.city,
      startsAt: show.startsAt,
      ticketUrl: null,
      source: "seed",
      updatedAt: SEEDED_AT,
    };
  });

  const userByHandle = new Map(users.map((user) => [user.handle, user]));
  const showByArtist = new Map(shows.map((show) => [show.normalizedArtistName, show]));
  const rsvps: StoredRsvp[] = GOING.map((row) => {
    const user = userByHandle.get(row.handle);
    const show = showByArtist.get(normalizeName(row.artistName));
    if (!user || !show) throw new Error(`Bad RSVP for ${row.handle} / ${row.artistName}`);
    const listed = links.some(
      (link) => link.userId === user.id && link.artistId === mustArtist(byName, row.artistName).id,
    );
    if (!listed) throw new Error(`${row.handle} does not list ${row.artistName}`);
    return { userId: user.id, showId: show.id, status: "going" };
  });

  return { users, artists, links, related, shows, rsvps, interests: [], skips: [], shares: [], icebreakers: [] };
}
