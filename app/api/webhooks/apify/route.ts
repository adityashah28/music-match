import { errorResponse, readJson } from "@/lib/errors";
import { upsertFromApify } from "@/lib/store";

export const dynamic = "force-dynamic";

function skipped(reason: string) {
  return Response.json({ skipped: true, reason });
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
    const payload = await readJson(request);
    await upsertFromApify(payload);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
