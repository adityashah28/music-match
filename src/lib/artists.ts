// Saving artists into our own database, and turning database rows into the API's Artist shape.
import "server-only";
import { Vibrant } from "node-vibrant/node";
import { supabase } from "./supabase";
import { normalizeName } from "./normalize";
import { realImage, type DeezerArtist } from "./deezer";
import type { Artist } from "./types";

export const ARTIST_COLUMNS = "id, name, normalized_name, image_url, dominant_color_hex";

type ArtistRow = {
  id: number;
  name: string;
  normalized_name: string;
  image_url: string | null;
  dominant_color_hex: string | null;
};

export function toArtist(row: ArtistRow): Artist {
  return { id: row.id, name: row.name, imageUrl: row.image_url, color: row.dominant_color_hex };
}

// Insert new artists or refresh existing ones, matched on normalized name.
// Returns them as Artists in the same order they came in (Deezer's relevance order).
export async function saveDeezerArtists(found: DeezerArtist[]): Promise<Artist[]> {
  // Two Deezer results can normalize to the same name: keep the one with more fans
  const byName = new Map<string, DeezerArtist>();
  for (const a of found) {
    const key = normalizeName(a.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing || a.nb_fan > existing.nb_fan) byName.set(key, a);
  }

  const rows = [...byName].map(([normalized_name, a]) => ({
    name: a.name,
    normalized_name,
    deezer_id: a.id,
    image_url: realImage(a.picture_big),
    fan_count: a.nb_fan,
    source: "deezer",
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return [];

  let saved: ArtistRow[] = [];
  const { data, error } = await supabase
    .from("artists")
    .upsert(rows, { onConflict: "normalized_name" })
    .select(ARTIST_COLUMNS);

  if (!error) {
    saved = data;
  } else {
    // One bad row (e.g. a Deezer id already used by a differently named artist) fails the whole batch,
    // so fall back to saving one at a time and skipping the ones that conflict.
    console.error("Batch artist upsert failed, retrying one by one:", error.message);
    for (const row of rows) {
      const one = await supabase
        .from("artists")
        .upsert(row, { onConflict: "normalized_name" })
        .select(ARTIST_COLUMNS)
        .single();
      if (one.data) saved.push(one.data);
    }
  }

  const order = rows.map((r) => r.normalized_name);
  return saved
    .sort((a, b) => order.indexOf(a.normalized_name) - order.indexOf(b.normalized_name))
    .map(toArtist);
}

// Search our own table. Used when Deezer is down, so search keeps working during the demo.
export async function searchSavedArtists(query: string, limit = 10): Promise<Artist[]> {
  const q = normalizeName(query);
  if (!q) return [];
  const { data, error } = await supabase
    .from("artists")
    .select(ARTIST_COLUMNS)
    .ilike("normalized_name", `%${q}%`)
    .order("fan_count", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(toArtist);
}

// Pick the color the background gradient uses. Takes about 100-300ms per image,
// so it runs after the response is sent, never while the user waits.
export async function fillMissingColors(ids: number[]) {
  if (ids.length === 0) return;
  const { data } = await supabase
    .from("artists")
    .select("id, image_url")
    .in("id", ids)
    .is("dominant_color_hex", null)
    .not("image_url", "is", null);

  for (const row of data ?? []) {
    try {
      // The 250px version is plenty for picking a color, and faster to download
      const small = row.image_url!.replace("500x500", "250x250");
      const palette = await Vibrant.from(small).getPalette();
      const swatch = palette.Vibrant ?? palette.DarkVibrant ?? palette.Muted ?? palette.DarkMuted;
      if (swatch) {
        await supabase.from("artists").update({ dominant_color_hex: swatch.hex }).eq("id", row.id);
      }
    } catch (err) {
      console.error(`Color extraction failed for artist ${row.id}:`, err);
    }
  }
}
