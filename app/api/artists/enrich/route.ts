export const dynamic = "force-dynamic";

function skipped(reason: string) {
  return Response.json({ skipped: true, reason });
}

export async function GET() {
  if (!process.env.APIFY_TOKEN?.trim()) {
    return skipped("APIFY_TOKEN is unset");
  }
  return skipped("Artist enrich runs outside this request");
}

export async function POST() {
  return GET();
}
