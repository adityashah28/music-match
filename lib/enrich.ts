import { createClient } from "@supabase/supabase-js";
import { getDeezerRelated, searchDeezerArtists } from "@/lib/deezer";
import { saveDeezerArtists } from "@/lib/deezer-artists";
import { normalizeName } from "@/lib/normalize";
import { forgetCachedSnapshot } from "@/lib/store";

/**
 * Fetches Deezer's similar artists for any of these artists that don't have them yet, so
 * matching's neighbor credit works for every artist people pick, not just the seeded ones.
 * Runs after signup and Profile saves (next/server after), never while the person waits.
 * Returns how many artists got a similar-artist list.
 */
export async function enrichArtists(names: string[]): Promise<number> {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const keys = [...new Set(names.map(normalizeName).filter(Boolean))];
  if (!url || !key || keys.length === 0) return 0;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: todo, error } = await db
    .from("artists")
    .select("id, name, normalized_name, deezer_id")
    .in("normalized_name", keys)
    .is("related_fetched_at", null);
  if (error || !todo?.length) return 0;

  let enriched = 0;
  for (const artist of todo) {
    try {
      // Same exact-name rule as the seed: never attach another artist's similar list
      let deezerId = artist.deezer_id ? Number(artist.deezer_id) : null;
      if (!deezerId) {
        const exact = (await searchDeezerArtists(artist.name, 50))
          .filter((r) => normalizeName(r.name) === artist.normalized_name)
          .sort((a, b) => b.nb_fan - a.nb_fan)[0];
        if (!exact) continue;
        deezerId = exact.id;
        await db.from("artists").update({ deezer_id: String(exact.id), fan_count: exact.nb_fan }).eq("id", artist.id);
      }

      const related = (await saveDeezerArtists(db, await getDeezerRelated(deezerId, 10))).filter((r) => r.id !== artist.id);
      if (related.length) {
        await db
          .from("artist_related")
          .upsert(related.map((r, i) => ({ artist_id: artist.id, related_artist_id: r.id, rank: i + 1 })), {
            onConflict: "artist_id,related_artist_id",
          });
      }
      await db.from("artists").update({ related_fetched_at: new Date().toISOString() }).eq("id", artist.id);
      enriched++;
      await new Promise((r) => setTimeout(r, 200)); // Deezer allows ~50 requests per 5 seconds
    } catch (err) {
      console.error(`Enriching ${artist.name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  if (enriched) forgetCachedSnapshot(); // so the next matches use the new links
  return enriched;
}
