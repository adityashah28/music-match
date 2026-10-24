// POST /api/webhooks/apify — Apify calls this when a run finishes.
// TODO (phase 4): check APIFY_WEBHOOK_SECRET, fetch the dataset, upsert shows.
export async function POST() {
  return Response.json({ ok: true });
}
