import { errorResponse, readJson } from "@/lib/errors";
import { setInterest } from "@/lib/store";

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
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const interest = await setInterest(userId, otherId);
    if (!interest) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(interest);
  } catch (error) {
    return errorResponse(error);
  }
}
