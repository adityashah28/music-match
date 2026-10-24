import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { getShow } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    await requireUser(request, userId);

    const show = await getShow(id, userId);
    if (!show) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }

    return Response.json({
      ...show,
      goingCount: show.crowd.going,
      tasteSummary: show.crowd.taste,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
