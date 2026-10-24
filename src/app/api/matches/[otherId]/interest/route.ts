// POST /api/matches/[otherId]/interest — needs "Authorization: Bearer <token>".
// TODO (phase 3): insert into match_interest, check for the reverse row.
import type { InterestResponse } from "@/lib/types";

export async function POST() {
  return Response.json({ mutual: false, socials: null } satisfies InterestResponse);
}
