// GET /api/shows/[id] — show detail plus the crowd taste summary.
// TODO (phase 3): load the show, count RSVPs, aggregate artists of everyone going.
import { mockShowDetail } from "@/lib/mock";
import type { ShowDetailResponse } from "@/lib/types";

export async function GET() {
  return Response.json(mockShowDetail satisfies ShowDetailResponse);
}
