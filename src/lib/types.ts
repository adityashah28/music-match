// The API contract: the exact JSON shapes every route returns.
// Frontend and backend both import from here, so if a shape changes, TypeScript flags every place that breaks.

export type Artist = {
  id: number;
  name: string;
  imageUrl: string | null;
  color: string | null; // dominant color, e.g. "#3a5f8c"
};

export type Socials = {
  instagram: string | null;
  tiktok: string | null;
  snapchat: string | null;
};

export type RsvpStatus = "going" | "maybe" | "not_going";

export type ShowSummary = {
  id: number;
  artistName: string;
  artist: Artist | null;
  venue: string | null;
  city: string | null;
  startsAt: string | null; // ISO date string
  ticketUrl: string | null;
  imageUrl: string | null;
};

// GET /api/artists/search?q=
export type SearchArtistsResponse = { artists: Artist[] };

// POST /api/users
export type CreateUserRequest = {
  handle: string;
  city: string;
  artistIds: number[]; // 1 to 5, in the user's order, ids from search results
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
};
export type CreateUserResponse = { id: string; token: string; handle: string };

// GET /api/users/[id]/matches
export type MatchLabel = "Strong match" | "Good match" | "Some overlap";
export type Match = {
  userId: string;
  handle: string;
  isDemo: boolean;
  score: number; // 0 to 100
  label: MatchLabel;
  why: string; // "You both listed Mitski and Phoebe Bridgers."
  sharedArtists: Artist[];
  theirArtists: Artist[];
  sharedShows: ShowSummary[]; // up to 3 upcoming shows you could both go to
  youInterested: boolean;
  mutual: boolean; // true only when both tapped interested
  socials: Socials | null; // null unless mutual
};
export type MatchesResponse = {
  matches: Match[];
  isEarly: boolean; // few real users yet: show "You're one of the first here"
};

// POST /api/matches/[otherId]/interest
export type InterestResponse = { mutual: boolean; socials: Socials | null };

// GET /api/shows
export type ShowReason = "your_artist" | "match_artist" | "scene";
export type Show = ShowSummary & {
  reason: ShowReason;
  tasteGoingCount: number; // "4 people with your taste are going"
  yourStatus: RsvpStatus | null;
};
export type ShowsResponse = { shows: Show[] };

// GET /api/shows/[id]
export type ShowDetailResponse = {
  show: Show;
  going: number;
  maybe: number;
  crowd: {
    totalPeople: number;
    topArtists: { artist: Artist; count: number }[];
  };
};

// POST /api/shows/[id]/rsvp
export type RsvpRequest = { status: RsvpStatus };
export type RsvpResponse = { status: RsvpStatus; going: number; maybe: number };

// Any route, on failure
export type ApiError = { error: string };
