import { errorResponse } from "@/lib/errors";
import { listShows } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const shows = await listShows(userId);
    if (!shows) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(shows);
  } catch (error) {
    return errorResponse(error);
  }
}
