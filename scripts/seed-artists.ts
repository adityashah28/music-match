// Seeds the artists table: every artist in scripts/data/scenes.ts with photo, scene tags,
// background color, and their top 10 related artists.
//
// Run: npm run seed:artists
// Safe to re-run: artists that already have related artists are skipped.
import { SCENES } from "./data/scenes";
import { normalizeName } from "@/lib/normalize";
import { supabase } from "./lib/db";
import { getDeezerRelated, searchDeezerArtists } from "./lib/deezer";
import { fillMissingColors, saveDeezerArtists } from "./lib/artists";

// Deezer allows about 50 requests per 5 seconds; stay well under it
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PAUSE_MS = 150;

async function main() {
  // Collect every artist name with all the scenes it appears in
  const scenesByName = new Map<string, { name: string; scenes: string[] }>();
  for (const [scene, names] of Object.entries(SCENES)) {
    for (const name of names) {
      const key = normalizeName(name);
      const entry = scenesByName.get(key) ?? { name, scenes: [] };
      if (!entry.scenes.includes(scene)) entry.scenes.push(scene);
      scenesByName.set(key, entry);
    }
  }
  console.log(`Seeding ${scenesByName.size} artists...\n`);

  // 1. Find each artist on Deezer. Only accept an exact name match, so "Ghost" never becomes some other Ghost.
  const seededIds: string[] = [];
  const notFound: string[] = [];
  for (const [key, { name, scenes }] of scenesByName) {
    try {
      const results = await searchDeezerArtists(name, 50); // big acts can rank below the top 10 (e.g. Ghost)
      const exact = results
        .filter((r) => normalizeName(r.name) === key)
        .sort((a, b) => b.nb_fan - a.nb_fan)[0];
      if (!exact) {
        notFound.push(name);
      } else {
        const [saved] = await saveDeezerArtists([exact]);
        await supabase.from("artists").update({ genres: scenes }).eq("id", saved.id);
        seededIds.push(saved.id);
        process.stdout.write(".");
      }
    } catch (err) {
      notFound.push(`${name} (${(err as Error).message})`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`\n\nFound ${seededIds.length} artists.`);
  if (notFound.length) console.log(`Not found, skipped: ${notFound.join(", ")}`);

  // 2. Related artists, for neighbor credit in matching
  const { data: needRelated } = await supabase
    .from("artists")
    .select("id, name, deezer_id")
    .in("id", seededIds)
    .is("related_fetched_at", null);

  console.log(`\nFetching related artists for ${needRelated?.length ?? 0} artists...`);
  for (const artist of needRelated ?? []) {
    try {
      const related = await getDeezerRelated(Number(artist.deezer_id), 10);
      const saved = await saveDeezerArtists(related);
      const links = saved
        .filter((r) => r.id !== artist.id)
        .map((r, i) => ({ artist_id: artist.id, related_artist_id: r.id, rank: i + 1 }));
      if (links.length) {
        const { error } = await supabase
          .from("artist_related")
          .upsert(links, { onConflict: "artist_id,related_artist_id" });
        if (error) throw new Error(error.message);
      }
      await supabase
        .from("artists")
        .update({ related_fetched_at: new Date().toISOString() })
        .eq("id", artist.id);
      process.stdout.write(".");
    } catch (err) {
      console.log(`\n  related failed for ${artist.name}: ${(err as Error).message}`);
    }
    await sleep(PAUSE_MS);
  }

  // 3. Background colors for the seeded artists, 5 at a time.
  // Related-only artists get their color later, when someone searches for them.
  console.log("\n\nComputing background colors...");
  for (let i = 0; i < seededIds.length; i += 5) {
    await Promise.all(seededIds.slice(i, i + 5).map((id) => fillMissingColors([id])));
    process.stdout.write(".");
  }

  const { count: total } = await supabase.from("artists").select("*", { count: "exact", head: true });
  const { count: links } = await supabase.from("artist_related").select("*", { count: "exact", head: true });
  const { count: colored } = await supabase
    .from("artists")
    .select("*", { count: "exact", head: true })
    .in("id", seededIds)
    .not("dominant_color_hex", "is", null);
  console.log(`\n\nDone. ${total} artists in the table (${seededIds.length} seeded, ${colored} with colors), ${links} related links.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
