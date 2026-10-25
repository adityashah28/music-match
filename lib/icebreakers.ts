// Icebreaker prompts: presets the sender can tap; free-form asks are also allowed via the store.
// Templates that need an artist only show up once a match has a shared artist to plug in.

export type IcebreakerPrompt = { id: string; text: string };

type Template = {
  id: string;
  needsArtist: boolean;
  text: (artist: string | null) => string;
};

const TEMPLATES: Template[] = [
  {
    id: "deep-cut",
    needsArtist: true,
    text: (artist) => `What's your favorite ${artist} deep cut?`,
  },
  {
    id: "surprise-show",
    needsArtist: true,
    text: (artist) => `If ${artist} announced a surprise show tomorrow, are you in?`,
  },
  {
    id: "first-listen",
    needsArtist: true,
    text: (artist) => `What's the first ${artist} song that hooked you?`,
  },
  {
    id: "concert-story",
    needsArtist: false,
    text: () => "Best concert you've ever been to — go.",
  },
  {
    id: "desert-island",
    needsArtist: false,
    text: () => "One artist forever, no skips: who is it?",
  },
];

/** Prompts available for this pair, given their top shared artist (if any). */
export function icebreakerPrompts(sharedArtistName: string | null): IcebreakerPrompt[] {
  return TEMPLATES.filter((template) => !template.needsArtist || sharedArtistName).map(
    (template) => ({ id: template.id, text: template.text(sharedArtistName) }),
  );
}

/** The canonical text for a prompt id, recomputed server-side so the client can't send arbitrary text. */
export function icebreakerText(promptId: string, sharedArtistName: string | null): string | null {
  const template = TEMPLATES.find((candidate) => candidate.id === promptId);
  if (!template) return null;
  if (template.needsArtist && !sharedArtistName) return null;
  return template.text(sharedArtistName);
}

// Keyed by prompt id so the reply actually answers what was asked, not just a generic yes.
// Unknown / custom prompt ids fall through to FALLBACK_REPLIES.
const DEMO_REPLIES: Record<string, (artist: string | null) => string[]> = {
  "deep-cut": (artist) => [
    `Honestly, anything off their early stuff — ${artist ?? "them"} deep cuts hit different.`,
    "Hard to pick, but the one nobody else seems to know about.",
    "A quieter one most people skip past.",
  ],
  "surprise-show": () => ["Yes, absolutely.", "Haha, for sure — count me in.", "100%, I'd drop everything."],
  "first-listen": (artist) => [
    `A friend played me ${artist ?? "them"} years ago and that was it.`,
    "Honestly can't remember, it's been too long.",
    "One of the bigger singles — hooked immediately.",
  ],
  "concert-story": () => [
    "A tiny venue show a few years back — unreal energy.",
    "A festival set where the whole crowd lost it.",
    "A hometown show that still gives me chills thinking about it.",
  ],
  "desert-island": () => [
    "Honestly, probably this one, no contest.",
    "Impossible to pick, but leaning this way.",
    "This artist — not even close for me.",
  ],
};

const FALLBACK_REPLIES = ["Yes, absolutely.", "Haha, for sure.", "Honestly same."];

/** A demo profile's canned reply to a specific prompt, so it actually answers what was asked. */
export function demoAutoReply(promptId: string, artist: string | null, seed: number): string {
  const pool = DEMO_REPLIES[promptId]?.(artist) ?? FALLBACK_REPLIES;
  return pool[seed % pool.length];
}
