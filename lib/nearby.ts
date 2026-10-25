import { createClient } from "@supabase/supabase-js";
import type { Coords } from "@/lib/geocode";
import { saveShows } from "@/lib/shows-import";
import { forgetCachedSnapshot } from "@/lib/store";
import { ticketmasterNear } from "@/lib/ticketmaster";

/**
 * Shows for wherever the viewer is. The seeded data only covers Northern California, so when a
 * viewer has few shows nearby, the Shows route calls this after responding: it imports upcoming
 * Ticketmaster events within 60 miles and saves them like any other import.
 */

/** Fewer upcoming shows than this within 100 km and we fetch the area. */
export const NEARBY_ENOUGH = 15;
/** How long an area counts as fetched (per server instance). */
const FETCHED_FOR_MS = 6 * 60 * 60 * 1000;

const fetched = new Map<string, number>(); // area cell -> when we last fetched it
const inFlight = new Set<string>();

/** ~50 km cells, so nearby viewers share one fetch. */
function cell({ lat, lng }: Coords): string {
  return `${Math.round(lat * 2) / 2},${Math.round(lng * 2) / 2}`;
}

export function nearbyImportConfigured(): boolean {
  return Boolean(process.env.TICKETMASTER_KEY?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** True if this area is being fetched now or should be: the caller then schedules importShowsNear. */
export function shouldImportNear(origin: Coords): boolean {
  if (!nearbyImportConfigured()) return false;
  const key = cell(origin);
  if (inFlight.has(key)) return true;
  const last = fetched.get(key);
  return !last || Date.now() - last > FETCHED_FOR_MS;
}

/** Imports upcoming music events around `origin`. Safe to call repeatedly; returns shows saved. */
export async function importShowsNear(origin: Coords): Promise<number> {
  const key = cell(origin);
  if (inFlight.has(key)) return 0;
  inFlight.add(key);
  try {
    const rows = await ticketmasterNear(origin.lat, origin.lng);
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
    const db = createClient(url!, process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), { auth: { persistSession: false } });
    const saved = await saveShows(db, rows);
    fetched.set(key, Date.now());
    forgetCachedSnapshot(); // so the next Shows request sees them
    return saved.length;
  } catch (error) {
    console.error("Nearby show import failed:", error instanceof Error ? error.message : error);
    return 0;
  } finally {
    inFlight.delete(key);
  }
}
