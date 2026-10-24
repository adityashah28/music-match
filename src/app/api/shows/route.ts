// GET /api/shows — needs "Authorization: Bearer <token>".
// TODO (phase 3): shows for your artists, your matches' artists, then your scene.
import { mockShows } from "@/lib/mock";
import type { ShowsResponse } from "@/lib/types";

export async function GET() {
  return Response.json({ shows: mockShows } satisfies ShowsResponse);
}
