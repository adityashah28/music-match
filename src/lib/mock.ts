// Fake responses so the frontend can build before the real routes exist.
// Each route swaps its mock for real data as it gets built; delete this file once none use it.
import type { Artist, Match, Show, ShowDetailResponse } from "./types";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/500/500`;

export const mockArtists: Artist[] = [
  { id: 1, name: "Mitski", imageUrl: img("mitski"), color: "#7a3b5e" },
  { id: 2, name: "Phoebe Bridgers", imageUrl: img("phoebe"), color: "#3a5f8c" },
  { id: 3, name: "Japanese Breakfast", imageUrl: img("jbrekkie"), color: "#c76b3a" },
  { id: 4, name: "Frank Ocean", imageUrl: img("frank"), color: "#4f7a3b" },
  { id: 5, name: "SZA", imageUrl: img("sza"), color: "#b5894a" },
  { id: 6, name: "Fred again..", imageUrl: img("fred"), color: "#2f6f73" },
  { id: 7, name: "Clairo", imageUrl: img("clairo"), color: "#8c6a9e" },
  { id: 8, name: "Kendrick Lamar", imageUrl: img("kendrick"), color: "#5c4a3a" },
];

const [mitski, phoebe, jbrekkie, frank, sza, fred, clairo, kendrick] = mockArtists;

export const mockShows: Show[] = [
  {
    id: 101,
    artistName: "Japanese Breakfast",
    artist: jbrekkie,
    venue: "The Fox Theater",
    city: "Oakland",
    startsAt: "2026-11-06T20:00:00-08:00",
    ticketUrl: "https://example.com/tickets/101",
    imageUrl: jbrekkie.imageUrl,
    reason: "your_artist",
    tasteGoingCount: 4,
    yourStatus: null,
  },
  {
    id: 102,
    artistName: "Clairo",
    artist: clairo,
    venue: "The Warfield",
    city: "San Francisco",
    startsAt: "2026-11-14T19:30:00-08:00",
    ticketUrl: "https://example.com/tickets/102",
    imageUrl: clairo.imageUrl,
    reason: "match_artist",
    tasteGoingCount: 2,
    yourStatus: "maybe",
  },
  {
    id: 103,
    artistName: "Fred again..",
    artist: fred,
    venue: "Bill Graham Civic Auditorium",
    city: "San Francisco",
    startsAt: "2026-12-02T21:00:00-08:00",
    ticketUrl: "https://example.com/tickets/103",
    imageUrl: fred.imageUrl,
    reason: "scene",
    tasteGoingCount: 0,
    yourStatus: null,
  },
];

export const mockMatches: Match[] = [
  {
    userId: "00000000-0000-4000-8000-000000000001",
    handle: "lowlight_lena",
    isDemo: true,
    score: 92,
    label: "Strong match",
    why: "You both listed Mitski and Phoebe Bridgers.",
    sharedArtists: [mitski, phoebe],
    theirArtists: [mitski, phoebe, jbrekkie, clairo, sza],
    sharedShows: [mockShows[0]],
    youInterested: false,
    mutual: false,
    socials: null,
  },
  {
    userId: "00000000-0000-4000-8000-000000000002",
    handle: "nightdrive.sam",
    isDemo: true,
    score: 71,
    label: "Good match",
    why: "You both listed Frank Ocean.",
    sharedArtists: [frank],
    theirArtists: [frank, kendrick, sza, fred, clairo],
    sharedShows: [],
    youInterested: true,
    mutual: true,
    socials: { instagram: "demo_profile", tiktok: null, snapchat: null },
  },
  {
    userId: "00000000-0000-4000-8000-000000000003",
    handle: "b-side.ari",
    isDemo: true,
    score: 38,
    label: "Some overlap",
    why: "Your artists sit in the same scene.",
    sharedArtists: [],
    theirArtists: [clairo, jbrekkie, fred, sza, kendrick],
    sharedShows: [mockShows[1]],
    youInterested: false,
    mutual: false,
    socials: null,
  },
];

export const mockShowDetail: ShowDetailResponse = {
  show: mockShows[0],
  going: 4,
  maybe: 3,
  crowd: {
    totalPeople: 7,
    topArtists: [
      { artist: mitski, count: 5 },
      { artist: phoebe, count: 4 },
      { artist: clairo, count: 3 },
      { artist: sza, count: 2 },
    ],
  },
};
