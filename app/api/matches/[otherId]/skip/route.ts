import { requireUser } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/errors";
import { setSkip } from "@/lib/store";

export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  { params }: { params: Promise<{ otherId: string }> },
  skipped: boolean,
) {
  try {
    const { otherId } = await params;
    const body = await readJson(request);
    const userId =
      body && typeof body === "object" && "userId" in body && typeof body.userId === "string"
        ? body.userId.trim()
        : "";
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    await requireUser(request, userId);

    const result = await setSkip(userId, otherId, skipped);
    if (!result) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ otherId: string }> }) {
  return handle(request, context, true);
}

export async function DELETE(request: Request, context: { params: Promise<{ otherId: string }> }) {
  return handle(request, context, false);
}
