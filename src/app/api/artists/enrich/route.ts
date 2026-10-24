// POST /api/artists/enrich { artistId }
// TODO (phase 4, optional): start an Apify artist run for an artist we know little about.
export async function POST() {
  return Response.json({ started: false, reason: "not built yet" });
}
