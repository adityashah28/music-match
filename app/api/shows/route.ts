import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { listShows } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/shows?userId=&q=&limit=&offset=
 * Upcoming shows nearest the viewer first. q searches artist, venue and city across all shows;
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
    const shows = await listShows(userId, {
      q: params.get("q")?.slice(0, 100) ?? "",
      limit: number("limit"),
      offset: number("offset"),
    });
    if (!shows) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(shows);
  } catch (error) {
    return errorResponse(error);
  }
}
