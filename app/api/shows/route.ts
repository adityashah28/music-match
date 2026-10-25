import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { after } from "next/server";
import { importShowsNear, NEARBY_ENOUGH, shouldImportNear } from "@/lib/nearby";
import { listShows, viewerLocation } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/shows?userId=&q=&genre=&mine=&limit=&offset=
 * Upcoming shows nearest the viewer first. q searches artist, venue and city across all shows;
 * mine=1 limits to shows the viewer marked Going or Maybe (soonest first);
 * limit/offset page through them (no limit returns every match).
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId")?.trim() ?? "";
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    await requireUser(request, userId);

    const number = (key: string) => {
      const value = Number(params.get(key));
      return params.has(key) && Number.isFinite(value) ? value : undefined;
    };
    const mine = params.get("mine") === "1" || params.get("mine") === "true";
    const shows = await listShows(userId, {
      q: params.get("q")?.slice(0, 100) ?? "",
      genre: params.get("genre")?.trim() || undefined,
      mine,
      limit: number("limit"),
      offset: number("offset"),
    });
    if (!shows) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Few shows near this viewer (anywhere outside the seeded Bay Area): fetch their area from
    // Ticketmaster after responding; the page asks again while searchingNearby is true
    if (!mine && shows.nearbyCount < NEARBY_ENOUGH) {
      const origin = await viewerLocation(userId);
      if (origin && shouldImportNear(origin)) {
        after(() => importShowsNear(origin));
        shows.searchingNearby = true;
      }
    }
    return Response.json(shows);
  } catch (error) {
    return errorResponse(error);
  }
}
