// Seeds demo profiles (is_demo = true) so the first real users see good matches.
// Each profile has 4 artists from one scene (2 big, 2 smaller) and 1 from a neighboring scene.
// Handles are made-up word pairs, never real people's names. No socials.
//
// Run: npm run seed:demo   (after seed:artists)
// Safe to re-run: deletes the old demo profiles and recreates the same ones.
import { supabase } from "./lib/db";

const PROFILES_PER_SCENE: Record<string, number> = {
  indie: 5, hiphop: 4, pop: 4, electronic: 4, rnb: 4, rock: 3, latin: 2, kpop: 3,
};

// Scenes whose fans plausibly overlap; the 5th artist comes from one of these
const NEIGHBORS: Record<string, string[]> = {
  indie: ["rock", "pop", "rnb", "electronic"],
  hiphop: ["rnb", "electronic"],
  pop: ["indie", "rnb", "latin", "kpop"],
  electronic: ["indie", "hiphop", "pop"],
  rnb: ["hiphop", "pop", "indie"],
  rock: ["indie", "electronic"],
  latin: ["pop", "rnb"],
  kpop: ["pop", "rnb"],
};

const WORDS_A = [
  "lowlight", "velvet", "midnight", "neon", "analog", "static", "golden", "quiet", "loud",
  "sunset", "lofi", "hazy", "electric", "slow", "late", "b-side", "silver", "faded", "warm",
];
const WORDS_B = [
  "reverb", "tape", "vinyl", "echo", "fader", "chorus", "bassline", "encore", "cassette",
  "feedback", "synth", "backbeat", "falsetto", "radio", "setlist", "headliner", "drift", "loop",
];
const CITIES = ["San Francisco", "San Francisco", "San Francisco", "Oakland", "Berkeley", "San Jose"];

// Small seeded random generator, so every run produces the same profiles
function makeRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = makeRandom(42);
const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
function pickSome<T>(list: T[], n: number, exclude: Set<T>): T[] {
  const pool = list.filter((x) => !exclude.has(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

type SeedArtist = { id: string; name: string; genres: string[]; fan_count: number | null };

async function main() {
  const { data: artists, error } = await supabase
    .from("artists")
    .select("id, name, genres, fan_count")
    .neq("genres", "{}")
    .not("image_url", "is", null);
  if (error) throw new Error(error.message);
  if (!artists.length) throw new Error("No seeded artists found. Run `npm run seed:artists` first.");

  // Artists per scene, most fans first
  const byScene = new Map<string, SeedArtist[]>();
  for (const a of artists as SeedArtist[]) {
    for (const g of a.genres) byScene.set(g, [...(byScene.get(g) ?? []), a]);
  }
  for (const list of byScene.values()) list.sort((a, b) => (b.fan_count ?? 0) - (a.fan_count ?? 0));

  // Start fresh: deleting demo users also deletes their picks, RSVPs and interest (cascade)
  const { error: delError } = await supabase.from("users").delete().eq("is_demo", true);
  if (delError) throw new Error(delError.message);

  const usedHandles = new Set<string>();
  let created = 0;

  for (const [scene, count] of Object.entries(PROFILES_PER_SCENE)) {
    const sceneArtists = byScene.get(scene) ?? [];
    if (sceneArtists.length < 6) {
      console.log(`Skipping ${scene}: only ${sceneArtists.length} artists seeded`);
      continue;
    }
    const big = sceneArtists.slice(0, 12);
    const smaller = sceneArtists.slice(12);

    for (let i = 0; i < count; i++) {
      const chosen = new Set<SeedArtist>();
      pickSome(big, 2, chosen).forEach((a) => chosen.add(a));
      pickSome(smaller.length >= 2 ? smaller : big, 2, chosen).forEach((a) => chosen.add(a));
      const neighbor = byScene.get(pick(NEIGHBORS[scene])) ?? big;
      pickSome(neighbor, 1, chosen).forEach((a) => chosen.add(a));

      let handle = "";
      do {
        const sep = pick(["_", ".", ""]);
        const num = random() < 0.3 ? String(Math.floor(random() * 90) + 10) : "";
        handle = `${pick(WORDS_A)}${sep}${pick(WORDS_B)}${num}`;
      } while (usedHandles.has(handle.replace(/[._]/g, "")));  // "a_b" and "a.b" look like the same person
      usedHandles.add(handle.replace(/[._]/g, ""));

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({ handle, city: pick(CITIES), is_demo: true })
        .select("id")
        .single();
      if (userError) throw new Error(`${handle}: ${userError.message}`);

      const picks = [...chosen].map((a, idx) => ({ user_id: user.id, artist_id: a.id, position: idx + 1 }));
      const { error: picksError } = await supabase.from("user_artists").insert(picks);
      if (picksError) throw new Error(`${handle} picks: ${picksError.message}`);

      created++;
      console.log(`${scene.padEnd(10)} ${handle.padEnd(22)} ${[...chosen].map((a) => a.name).join(", ")}`);
    }
  }

  console.log(`\nCreated ${created} demo profiles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
