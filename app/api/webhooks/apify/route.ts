import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { errorResponse, readJson } from "@/lib/errors";
import { fromBandsintownItems, fromSongkickItems, saveShows } from "@/lib/shows-import";

export const dynamic = "force-dynamic";

function skipped(reason: string) {
  return Response.json({ skipped: true, reason });
}

/** The webhook must send our shared secret in the "x-webhook-secret" header (set in the Apify webhook's headers template). */
function hasSecret(request: Request): boolean {
  const expected = process.env.APIFY_WEBHOOK_SECRET?.trim();
  const given = request.headers.get("x-webhook-secret")?.trim();
  if (!expected || !given || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** Apify webhooks describe the finished run, not its results; fetch the run's dataset items. */
async function datasetItems(payload: unknown): Promise<unknown> {
  const resource =
    payload && typeof payload === "object" && "resource" in payload ? (payload.resource as Record<string, unknown>) : null;
  const datasetId = typeof resource?.defaultDatasetId === "string" ? resource.defaultDatasetId : null;
  if (!datasetId) return payload;
  const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`, {
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN?.trim()}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Apify dataset ${datasetId} returned ${response.status}`);
  return response.json();
}

export async function GET() {
  if (!process.env.APIFY_TOKEN?.trim()) {
    return skipped("APIFY_TOKEN is unset");
  }
  return skipped("Send a POST payload");
}

export async function POST(request: Request) {
  try {
    if (!process.env.APIFY_TOKEN?.trim()) {
      return skipped("APIFY_TOKEN is unset");
    }
    if (!hasSecret(request)) {
      return Response.json({ error: "Wrong or missing webhook secret" }, { status: 401 });
    }
    const payload = await readJson(request);
    const data = await datasetItems(payload);
    const items = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

    // Same mapping and same-artist-same-day dedupe as the shows seed, so scheduled runs
    // update the seeded Bandsintown/Songkick rows instead of adding copies
    const candidates = [...fromBandsintownItems(items), ...fromSongkickItems(items)];
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return skipped("Supabase is not configured");
    const saved = await saveShows(createClient(url, key, { auth: { persistSession: false } }), candidates);

    return Response.json({ ok: true, items: items.length, saved: saved.length });
  } catch (error) {
    return errorResponse(error);
  }
}
