// Seeds upcoming Bay Area shows from Apify (Bandsintown, Songkick) and Ticketmaster.
// The same artist on the same day from two sources is kept once (Ticketmaster wins: real ticket links).
// Then looks up each new show artist on Deezer, so shows can match through related artists.
//
// Run: npm run seed:shows   (after seed:artists; costs about $5 of Apify credit)
// Safe to re-run: shows are updated in place and never deleted, so RSVPs survive.
import { normalizeName } from "@/lib/normalize";
import { supabase } from "./lib/db";
import { getDeezerRelated, searchDeezerArtists } from "./lib/deezer";
import { fillMissingColors, saveDeezerArtists } from "./lib/artists";

const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY?.trim();
const BAY_AREA_DMA = 382; // Ticketmaster's market id for San Francisco / Oakland / San Jose
const BANDSINTOWN_CITIES: Record<string, string> = {
  "san-francisco-ca": "San Francisco",
  "oakland-ca": "Oakland",
  "san-jose-ca": "San Jose",
};
const SOURCE_PRIORITY = ["ticketmaster", "bandsintown", "songkick"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ShowRow = {
  source: string;
  source_id: string;
  artist_name: string;
  normalized_artist_name: string;
  venue: string | null;
  city: string | null;
  starts_at: string;
  ticket_url: string | null;
  image_url: string | null;
  updated_at: string;
};

// Bandsintown and Songkick give local Bay Area times without an offset ("2026-11-05T19:00:00").
// Attach the correct Pacific offset for that date (PST or PDT).
function pacific(local: string): string {
  const base = local.slice(0, 19);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${base}Z`))
    .find((p) => p.type === "timeZoneName")
    ?.value.replace("GMT", "");
  return `${base}${offset || "-08:00"}`;
}

// Same artist, same local day = same show
function dedupeKey(row: Pick<ShowRow, "normalized_artist_name" | "starts_at">): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(row.starts_at));
  return `${row.normalized_artist_name}|${day}`;
}

function show(fields: Omit<ShowRow, "normalized_artist_name" | "updated_at">): ShowRow | null {
  const normalized = normalizeName(fields.artist_name);
  if (!normalized || !fields.starts_at || Number.isNaN(Date.parse(fields.starts_at))) return null;
  if (Date.parse(fields.starts_at) < Date.now()) return null;
  return { ...fields, normalized_artist_name: normalized, updated_at: new Date().toISOString() };
}

async function runApify(actor: string, input: object): Promise<Record<string, unknown>[]> {
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=300`, {
    method: "POST",
    headers: { Authorization: `Bearer ${APIFY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actor} returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fromBandsintown(): Promise<ShowRow[]> {
  const rows: ShowRow[] = [];
  for (const [citySlug, city] of Object.entries(BANDSINTOWN_CITIES)) {
    // maxItems 0 is documented as "no limit" but returns nothing, so cap it explicitly
    const items = await runApify("aitorsm~bandsintown-events", { citySlug, maxItems: 150 });
    for (const e of items as Record<string, string>[]) {
      const row = show({
        source: "bandsintown",
        source_id: String(e.eventId),
        artist_name: e.artistName,
        venue: e.venueName ?? null,
        city,
        starts_at: e.startsAt ? pacific(e.startsAt) : "",
        ticket_url: e.ticketUrl ?? e.eventUrl ?? null,
        image_url: e.imageUrl ?? null,
      });
      if (row) rows.push(row);
    }
    console.log(`  Bandsintown ${city}: ${items.length} events`);
  }
  return rows;
}

async function fromSongkick(): Promise<ShowRow[]> {
  type SongkickEvent = {
    eventId: string; url?: string; image?: string; startDate?: string;
    venueName?: string; addressLocality?: string; performers?: { name: string }[];
  };
  const items = (await runApify("aitorsm~songkick-events", { city: "San Francisco", maxItems: 200 })) as SongkickEvent[];
  console.log(`  Songkick: ${items.length} events`);
  return items.flatMap((e) => {
    const headliner = e.performers?.[0]?.name;
    const row = headliner
      ? show({
          source: "songkick",
          source_id: String(e.eventId),
          artist_name: headliner,
          venue: e.venueName ?? null,
          city: e.addressLocality ?? "San Francisco",
          starts_at: e.startDate ? pacific(e.startDate) : "",
          ticket_url: e.url ?? null,
          image_url: e.image ?? null,
        })
      : null;
    return row ? [row] : [];
  });
}

type TicketmasterEvent = {
  id: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  images?: { url: string; ratio?: string; width?: number }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string } }[]; attractions?: { name: string }[] };
};

function ticketmasterRow(e: TicketmasterEvent, artistName: string): ShowRow | null {
  const start = e.dates?.start;
  const startsAt = start?.dateTime ?? (start?.localDate ? pacific(`${start.localDate}T${start.localTime ?? "20:00:00"}`) : "");
  const image = (e.images ?? []).filter((i) => i.ratio === "16_9").sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  const venue = e._embedded?.venues?.[0];
  return show({
    source: "ticketmaster",
    source_id: e.id,
    artist_name: artistName,
    venue: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    starts_at: startsAt,
    ticket_url: e.url ?? null,
    image_url: image?.url ?? null,
  });
}

async function ticketmaster(params: Record<string, string | number>): Promise<TicketmasterEvent[]> {
  const query = new URLSearchParams({
    apikey: TICKETMASTER_KEY!,
    classificationName: "music",
    dmaId: String(BAY_AREA_DMA),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`);
  if (!res.ok) throw new Error(`Ticketmaster returned ${res.status}`);
  const body = await res.json();
  return body._embedded?.events ?? [];
}

async function fromTicketmaster(seededNames: string[]): Promise<ShowRow[]> {
  const rows: ShowRow[] = [];
  const perArtist: ShowRow[] = [];

  // 1. The Bay Area's soonest music events (Ticketmaster allows paging through the first 1000)
  for (let page = 0; page < 5; page++) {
    const events = await ticketmaster({ size: 200, page, sort: "date,asc" });
    for (const e of events) {
      const headliner = e._embedded?.attractions?.[0]?.name;
      const row = headliner ? ticketmasterRow(e, headliner) : null;
      if (row) rows.push(row);
    }
    if (events.length < 200) break;
    await sleep(250);
  }
  console.log(`  Ticketmaster Bay Area: ${rows.length} events`);

  // 2. Each seeded artist by name, so later dates and smaller venues aren't missed.
  // Only keep events where that exact artist is on the bill (keyword search is fuzzy).
  let found = 0;
  for (const name of seededNames) {
    try {
      const key = normalizeName(name);
      for (const e of await ticketmaster({ keyword: name, size: 20 })) {
        if (!(e._embedded?.attractions ?? []).some((a) => normalizeName(a.name) === key)) continue;
        const row = ticketmasterRow(e, name);
        if (row) {
          perArtist.push(row);
          found++;
        }
      }
    } catch (err) {
      console.log(`  Ticketmaster lookup failed for ${name}: ${(err as Error).message}`);
    }
    await sleep(250); // Ticketmaster allows 5 requests per second
  }
  console.log(`  Ticketmaster per artist: ${found} events for ${seededNames.length} seeded artists`);
  // Per-artist first: if an event is in both lists, keep the version named after the seeded artist,
  // who may be the opener rather than the headliner
  return [...perArtist, ...rows];
}

async function main() {
  if (!APIFY_TOKEN || !TICKETMASTER_KEY) throw new Error("Set APIFY_TOKEN and TICKETMASTER_KEY in .env.local");

  const { data: seeded, error } = await supabase.from("artists").select("name").neq("genres", "{}");
  if (error) throw new Error(error.message);
  if (!seeded.length) throw new Error("No seeded artists found. Run `npm run seed:artists` first.");

  console.log("Fetching shows...");
  const results = await Promise.allSettled([fromBandsintown(), fromSongkick(), fromTicketmaster(seeded.map((a) => a.name))]);
  const candidates = results.flatMap((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.log(`  ${["Bandsintown", "Songkick", "Ticketmaster"][i]} failed: ${r.reason}`);
    return [];
  });

  // Shows already in the table win their slot, so re-runs never create a second copy from another source
  const { data: existing } = await supabase.from("shows").select("source, source_id, normalized_artist_name, starts_at");
  const taken = new Map<string, string>(); // dedupe key -> "source|source_id" that owns it
  for (const s of existing ?? []) {
    if (s.starts_at) taken.set(dedupeKey(s), `${s.source}|${s.source_id}`);
  }

  // Stable sort keeps each source's own order (Ticketmaster per-artist matches stay ahead of its general list)
  const winners = new Map<string, ShowRow>();
  const usedEvents = new Set<string>(); // one row per source event, even if listed under two artist names
  for (const row of candidates.sort((a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source))) {
    const key = dedupeKey(row);
    const event = `${row.source}|${row.source_id}`;
    const owner = taken.get(key);
    if (owner && owner !== event) continue;
    if (winners.has(key) || usedEvents.has(event)) continue;
    winners.set(key, row);
    usedEvents.add(event);
  }
  const rows = [...winners.values()];

  for (let i = 0; i < rows.length; i += 200) {
    const { error: upsertError } = await supabase
      .from("shows")
      .upsert(rows.slice(i, i + 200), { onConflict: "source,source_id" });
    if (upsertError) throw new Error(upsertError.message);
  }
  console.log(`\nSaved ${rows.length} shows (${candidates.length} found before removing duplicates).`);

  // Look up show artists we don't know yet, so they get photos and related artists
  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("artists").select("normalized_name").range(from, from + 999);
    if (!data?.length) break;
    data.forEach((a) => known.add(a.normalized_name));
  }
  const unknown = [...new Map(rows.map((r) => [r.normalized_artist_name, r.artist_name])).entries()].filter(
    ([key]) => !known.has(key),
  );
  console.log(`\nLooking up ${unknown.length} new show artists on Deezer...`);

  const newIds: string[] = [];
  for (const [key, name] of unknown) {
    try {
      const exact = (await searchDeezerArtists(name, 50))
        .filter((r) => normalizeName(r.name) === key)
        .sort((a, b) => b.nb_fan - a.nb_fan)[0];
      if (exact) {
        const [saved] = await saveDeezerArtists([exact]);
        const related = (await saveDeezerArtists(await getDeezerRelated(exact.id, 10))).filter((r) => r.id !== saved.id);
        if (related.length) {
          await supabase
            .from("artist_related")
            .upsert(related.map((r, i) => ({ artist_id: saved.id, related_artist_id: r.id, rank: i + 1 })), {
              onConflict: "artist_id,related_artist_id",
            });
        }
        await supabase.from("artists").update({ related_fetched_at: new Date().toISOString() }).eq("id", saved.id);
        newIds.push(saved.id);
        process.stdout.write(".");
      }
    } catch (err) {
      console.log(`\n  lookup failed for ${name}: ${(err as Error).message}`);
    }
    await sleep(300); // two Deezer calls per artist
  }
  for (let i = 0; i < newIds.length; i += 5) {
    await Promise.all(newIds.slice(i, i + 5).map((id) => fillMissingColors([id])));
  }

  // How useful is this for matching? Count shows by artists someone could actually pick.
  const { data: seededNames } = await supabase.from("artists").select("normalized_name").neq("genres", "{}");
  const seededSet = new Set((seededNames ?? []).map((a) => a.normalized_name));
  const seededShows = rows.filter((r) => seededSet.has(r.normalized_artist_name));
  console.log(
    `\n\nDone. ${rows.length} upcoming shows; ${seededShows.length} by seeded artists ` +
      `(${new Set(seededShows.map((r) => r.normalized_artist_name)).size} different artists); ` +
      `${newIds.length} new artists added from shows.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
