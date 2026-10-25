// Fills in genres for shows saved before shows had genres (new imports get them automatically).
// Ticketmaster: looks events up by id in batches (free). Songkick: re-reads the last Apify run's
// results (no new run, no cost). Everything: adds the artist's scene tags.
//
// Run: npm run genres:shows   (safe to re-run)
import { fromScenes, fromSongkickGenres, fromTicketmasterClassifications, type GenreId } from "@/lib/genres";
import { supabase } from "./lib/db";

const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY?.trim();
const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();
const SONGKICK_ACTOR = "aitorsm~songkick-events";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ShowRow = { id: string; source: string; source_id: string | null; normalized_artist_name: string; genres: string[] };

async function all<T>(query: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function ticketmasterGenres(ids: string[]): Promise<Map<string, GenreId[]>> {
  const found = new Map<string, GenreId[]>();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const query = new URLSearchParams({ apikey: TICKETMASTER_KEY!, id: batch.join(","), size: "50" });
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`);
    if (!res.ok) throw new Error(`Ticketmaster returned ${res.status}`);
    const body = await res.json();
    for (const e of body._embedded?.events ?? []) found.set(e.id, fromTicketmasterClassifications(e.classifications));
    await sleep(250); // Ticketmaster allows 5 requests per second
  }
  return found;
}

async function songkickGenres(): Promise<Map<string, GenreId[]>> {
  const found = new Map<string, GenreId[]>();
  const runs = await fetch(`https://api.apify.com/v2/acts/${SONGKICK_ACTOR}/runs?desc=true&limit=10&status=SUCCEEDED`, {
    headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
  }).then((r) => r.json());
  for (const run of runs.data?.items ?? []) {
    const items = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true`, {
      headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
    }).then((r) => r.json());
    for (const e of Array.isArray(items) ? items : []) {
      if (e.eventId != null && !found.has(String(e.eventId))) found.set(String(e.eventId), fromSongkickGenres(e.performers?.[0]?.genres));
    }
  }
  return found;
}

async function main() {
  if (!TICKETMASTER_KEY || !APIFY_TOKEN) throw new Error("Set TICKETMASTER_KEY and APIFY_TOKEN in .env.local");

  const shows = await all<ShowRow>((from) =>
    supabase.from("shows").select("id, source, source_id, normalized_artist_name, genres").order("id").range(from, from + 999),
  );
  const scenes = await all<{ normalized_name: string; genres: string[] }>((from) =>
    supabase.from("artists").select("normalized_name, genres").neq("genres", "{}").order("id").range(from, from + 999),
  );
  const scenesByName = new Map(scenes.map((a) => [a.normalized_name, a.genres]));

  console.log(`Looking up genres for ${shows.length} shows...`);
  const tm = await ticketmasterGenres(shows.filter((s) => s.source === "ticketmaster" && s.source_id).map((s) => s.source_id!));
  console.log(`  Ticketmaster: ${tm.size} events found`);
  const sk = await songkickGenres();
  console.log(`  Songkick: ${sk.size} events in past Apify runs`);

  // Group shows by their new genres so each distinct set is one update
  const groups = new Map<string, string[]>();
  for (const show of shows) {
    const fromSource = show.source === "ticketmaster" ? tm.get(show.source_id ?? "") : show.source === "songkick" ? sk.get(show.source_id ?? "") : undefined;
    const genres = [...new Set([...(show.genres as GenreId[]), ...(fromSource ?? []), ...fromScenes(scenesByName.get(show.normalized_artist_name))])].sort();
    if (genres.join() === [...show.genres].sort().join()) continue;
    const key = genres.join(",");
    groups.set(key, [...(groups.get(key) ?? []), show.id]);
  }
  for (const [key, ids] of groups) {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("shows").update({ genres: key ? key.split(",") : [] }).in("id", ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
    }
  }

  const after = await all<{ genres: string[] }>((from) => supabase.from("shows").select("genres").order("id").range(from, from + 999));
  const counts: Record<string, number> = {};
  for (const s of after) for (const g of s.genres) counts[g] = (counts[g] ?? 0) + 1;
  const withGenre = after.filter((s) => s.genres.length > 0).length;
  console.log(`\nDone. ${withGenre}/${after.length} shows have at least one genre.`);
  console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g}: ${n}`).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
