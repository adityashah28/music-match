// GET /api/artists/search?q=mitski
// TODO (phase 1): call Deezer, save results into `artists`, return them.
import { mockArtists } from "@/lib/mock";
import type { SearchArtistsResponse } from "@/lib/types";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const artists = q ? mockArtists.filter((a) => a.name.toLowerCase().includes(q)) : [];
  return Response.json({ artists } satisfies SearchArtistsResponse);
}
