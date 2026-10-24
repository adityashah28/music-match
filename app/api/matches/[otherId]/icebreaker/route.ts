import { requireUser } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/errors";
import { sendIcebreaker } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ otherId: string }> },
) {
  try {
    const { otherId } = await params;
    const body = await readJson(request);
    const userId =
      body && typeof body === "object" && "userId" in body && typeof body.userId === "string"
        ? body.userId.trim()
        : "";
    const promptId =
      body && typeof body === "object" && "promptId" in body && typeof body.promptId === "string"
        ? body.promptId.trim()
        : "";
    const text =
      body && typeof body === "object" && "text" in body && typeof body.text === "string"
        ? body.text.trim()
        : "";
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (!promptId && !text) {
      return Response.json({ error: "Pick a prompt or write something to send" }, { status: 400 });
    }
    await requireUser(request, userId);

    const result = await sendIcebreaker(userId, otherId, promptId || null, text || null);
    if (!result) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
