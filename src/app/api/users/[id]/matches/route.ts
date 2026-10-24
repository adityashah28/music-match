// GET /api/users/[id]/matches — needs "Authorization: Bearer <token>".
// TODO (phase 3): run lib/matching; strip socials unless mutual.
import { mockMatches } from "@/lib/mock";
import type { MatchesResponse } from "@/lib/types";

export async function GET() {
  return Response.json({ matches: mockMatches, isEarly: true } satisfies MatchesResponse);
}
