import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { getMatches } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireUser(request, id);
    const matches = await getMatches(id);
    if (!matches) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(matches);
  } catch (error) {
    return errorResponse(error);
  }
}
