// POST /api/shows/[id]/rsvp { status } — needs "Authorization: Bearer <token>".
// TODO (phase 3): upsert into show_rsvps, return fresh counts.
import type { RsvpRequest, RsvpResponse } from "@/lib/types";

export async function POST(req: Request) {
  const { status } = (await req.json()) as RsvpRequest;
  return Response.json({ status, going: 4, maybe: 3 } satisfies RsvpResponse);
}
