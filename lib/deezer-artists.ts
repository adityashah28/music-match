// Saving Deezer artists into the artists table, for the seed scripts and artist enrichment (lib/enrich.ts).
// Uses the app's normalizeName and color helper so seeded rows look exactly like ones the app creates.
import { dominantColorFromImage } from "@/lib/color";
import { normalizeName } from "@/lib/normalize";
import type { SupabaseClient } from "@supabase/supabase-js";
import { realImage, type DeezerArtist } from "@/lib/deezer";

export type SavedArtist = { id: string; name: string; normalized_name: string };

const COLUMNS = "id, name, normalized_name";

// Insert new artists or refresh existing ones, matched on normalized name.
// Returns them in the same order they came in (Deezer's relevance order).
export async function saveDeezerArtists(supabase: SupabaseClient, found: DeezerArtist[]): Promise<SavedArtist[]> {
  // Two Deezer results can normalize to the same name: keep the one with more fans
  const byName = new Map<string, DeezerArtist>();
  for (const a of found) {
    const key = normalizeName(a.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing || a.nb_fan > existing.nb_fan) byName.set(key, a);
  }
  if (byName.size === 0) return [];

  // A name we already have stays with the more popular artist: an obscure "Ghost"
  // must not replace the photo of the famous Ghost already in the table
  const { data: existing, error: lookupError } = await supabase
    .from("artists")
    .select("normalized_name, deezer_id, fan_count")
    .in("normalized_name", [...byName.keys()]);
  if (lookupError) throw new Error(lookupError.message);
  const keep = new Set(
    existing
      .filter((e) => {
        const incoming = byName.get(e.normalized_name)!;
        return e.deezer_id !== String(incoming.id) && (e.fan_count ?? 0) > incoming.nb_fan;
      })
      .map((e) => e.normalized_name),
  );

  const rows = [...byName].filter(([name]) => !keep.has(name)).map(([normalized_name, a]) => ({
    name: a.name,
    normalized_name,
    deezer_id: String(a.id),
    image_url: realImage(a.picture_big),
    fan_count: a.nb_fan,
    source: "deezer",
    updated_at: new Date().toISOString(),
  }));

  const saved: SavedArtist[] = [];
  if (keep.size > 0) {
    const { data } = await supabase.from("artists").select(COLUMNS).in("normalized_name", [...keep]);
    saved.push(...(data ?? []));
  }

  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("artists")
      .upsert(rows, { onConflict: "normalized_name" })
      .select(COLUMNS);
    if (!error) {
      saved.push(...data);
    } else {
      // One bad row (e.g. a Deezer id already used by a differently named artist) fails the whole batch,
      // so fall back to saving one at a time and skipping the ones that conflict.
      console.error("Batch artist upsert failed, retrying one by one:", error.message);
      for (const row of rows) {
        const one = await supabase
          .from("artists")
          .upsert(row, { onConflict: "normalized_name" })
          .select(COLUMNS)
          .single();
        if (one.data) saved.push(one.data);
      }
    }
  }

  const order = [...byName.keys()];
  return saved.sort((a, b) => order.indexOf(a.normalized_name) - order.indexOf(b.normalized_name));
}

// Fill in the background-gradient color for artists that have a photo but no color yet
export async function fillMissingColors(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  const { data } = await supabase
    .from("artists")
    .select("id, image_url")
    .in("id", ids)
    .is("dominant_color_hex", null)
    .not("image_url", "is", null);

  for (const row of data ?? []) {
    // The 250px version is plenty for picking a color, and faster to download
    const color = await dominantColorFromImage(row.image_url.replace("500x500", "250x250"));
    if (color) await supabase.from("artists").update({ dominant_color_hex: color }).eq("id", row.id);
  }
}
