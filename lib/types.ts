export type RsvpStatus = "going" | "maybe" | "not_going";

export type ArtistInput = {
  name: string;
  imageUrl?: string | null;
  spotifyId?: string | null;
  deezerId?: string | null;
  genres?: string[] | null;
};

export type SearchArtist = {
  name: string;
  imageUrl: string | null;
  spotifyId: string | null;
  deezerId: string | null;
  genres: string[];
};

export type SearchResponse = {
  artists: SearchArtist[];
};

export type UserArtist = {
  name: string;
  imageUrl: string | null;
  color: string | null;
  spotifyId: string | null;
  genres: string[];
  position: number;
};

export type UserPublic = {
  id: string;
  handle: string;
  city: string;
  artists: UserArtist[];
};

export type UserProfile = UserPublic & {
  instagram: string | null;
  tiktok: string | null;
  snapchat: string | null;
  isDemo: boolean;
};

export type CreateUserBody = {
  handle: string;
  city: string;
  instagram?: string | null;
  tiktok?: string | null;
  snapchat?: string | null;
  artists: ArtistInput[];
};

/** Signup response: the profile plus the token the browser must keep and send back. */
export type CreatedUser = UserProfile & { token: string };

export type UpdateUserBody = {
  handle?: string | null;
  city?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  snapchat?: string | null;
  artists?: ArtistInput[];
};

export type RealSocials = {
  instagram: string | null;
  tiktok: string | null;
  snapchat: string | null;
};

export type DemoSocials = {
  placeholder: true;
  kind: "demo";
};

export type Socials = null | RealSocials | DemoSocials;

export type SharedArtist = {
  name: string;
  imageUrl: string | null;
  color: string | null;
};

/** Who from the pair has RSVP'd going. */
export type ShowGoing = "both" | "them" | "you" | null;

export type MatchShow = {
  id: string;
  artistName: string;
  venue: string | null;
  city: string | null;
  startsAt: string | null;
  going: ShowGoing;
};

/** One prompt from the fixed list, filled in with a shared artist if the template needs one. */
export type IcebreakerPrompt = { id: string; text: string };

export type IcebreakerReply = {
  /** true if you sent it, false if they did. */
  fromMe: boolean;
  text: string;
  createdAt: string;
};

/**
 * One prompt and (once answered) its reply. A round stays open — blocking either side from
 * starting a new one — until the recipient of the prompt replies to it.
 */
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

export type MatchCard = {
  userId: string;
  handle: string;
  city: string;
  isDemo: boolean;
  label: string;
  score: number;
  why: string;
  sharedArtists: SharedArtist[];
  /** Soonest upcoming show tied to this pair, for the card. */
  show: MatchShow | null;
  /** Show to go to together. Only set once the match is mutual. */
  suggestedShow: MatchShow | null;
  interested: boolean;
  mutual: boolean;
  /** Whether you've chosen to share your socials with them. Doesn't require mutual sharing. */
  youShared: boolean;
  /** True once you've both independently chosen to share, on top of mutual interest. The
   * authoritative signal — don't infer this from whether `socials` looks empty, since a demo's
   * placeholder and "not shared yet" can normalize to the same-looking empty shape. */
  socialsUnlocked: boolean;
  socials: Socials;
  /** Only set once the match is mutual, same gate as interest (not tied to sharing). */
  icebreaker: IcebreakerState | null;
};

export type MatchesResponse = {
  early: boolean;
  matches: MatchCard[];
};

export type InterestResponse = {
  mutual: boolean;
  socials: Socials;
  match: MatchCard | null;
};

export type SkipResponse = {
  skipped: boolean;
};

export type ShareResponse = {
  youShared: boolean;
  socialsUnlocked: boolean;
  socials: Socials;
};

export type SendIcebreakerResponse = {
  icebreaker: IcebreakerState;
};

export type ShowSummary = {
  id: string;
  artistName: string;
  venue: string | null;
  city: string | null;
  startsAt: string | null;
  ticketUrl: string | null;
  rsvp: RsvpStatus | null;
};

export type ShowListResponse = {
  shows: ShowSummary[];
};

export type ShowDetail = ShowSummary & {
  crowd: {
    going: number;
    taste: string;
  };
};

export type RsvpResponse = {
  showId: string;
  userId: string;
  status: RsvpStatus;
};

export type CrowdArtist = {
  name: string;
  imageUrl: string | null;
  color: string | null;
  count: number;
};

export type CrowdResponse = {
  joined: number;
  demoCount: number;
  topArtists: CrowdArtist[];
  going: number;
};

export type MatchPerson = {
  id: string;
  handle: string;
  city: string;
  isDemo: boolean;
  instagram: string | null;
  tiktok: string | null;
  snapchat: string | null;
  artists: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    color: string | null;
    genres: string[];
    position: number;
  }>;
};

export type InterestEdge = {
  userId: string;
  otherUserId: string;
};

export type StoredUser = {
  id: string;
  handle: string;
  city: string;
  instagram: string | null;
  tiktok: string | null;
  snapchat: string | null;
  isDemo: boolean;
  createdAt: string;
  /** Proves a request comes from this user. Only ever sent back by signup. */
  token: string | null;
};

export type StoredArtist = {
  id: string;
  name: string;
  normalizedName: string;
  imageUrl: string | null;
  dominantColorHex: string | null;
  monthlyListeners: number | null;
  genres: string[];
  spotifyId: string | null;
  source: string;
  updatedAt: string;
};

export type StoredLink = {
  userId: string;
  artistId: string;
  position: number;
};

export type StoredRelated = {
  artistId: string;
  relatedArtistId: string;
  rank: number;
};

export type StoredShow = {
  id: string;
  artistName: string;
  normalizedArtistName: string;
  venue: string | null;
  city: string | null;
  startsAt: string | null;
  ticketUrl: string | null;
  source: string;
  updatedAt: string;
};

export type StoredRsvp = {
  userId: string;
  showId: string;
  status: RsvpStatus;
};

export type StoredInterest = {
  userId: string;
  otherUserId: string;
  createdAt: string;
};

export type StoredSkip = {
  userId: string;
  otherUserId: string;
  createdAt: string;
};

export type StoredShare = {
  userId: string;
  otherUserId: string;
  createdAt: string;
};

export type StoredIcebreaker = {
  id: string;
  senderId: string;
  recipientId: string;
  promptId: string;
  promptText: string;
  /** Null if this opens a new round; otherwise the id of the prompt it answers. */
  replyToId: string | null;
  createdAt: string;
};

export type DataSnapshot = {
  users: StoredUser[];
  artists: StoredArtist[];
  links: StoredLink[];
  related: StoredRelated[];
  shows: StoredShow[];
  rsvps: StoredRsvp[];
  interests: StoredInterest[];
  skips: StoredSkip[];
  shares: StoredShare[];
  icebreakers: StoredIcebreaker[];
};
