import { errorResponse, readJson } from "@/lib/errors";
import { setRsvp } from "@/lib/store";
import type { RsvpStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function rsvpStatus(value: unknown): RsvpStatus | null {
  if (value === "going" || value === "maybe" || value === "not_going") return value;
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const record = body && typeof body === "object" ? body : null;
    const userId =
      record && "userId" in record && typeof record.userId === "string" ? record.userId.trim() : "";
    const status = record && "status" in record ? rsvpStatus(record.status) : null;

    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (!status) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const saved = await setRsvp(userId, id, status);
    if (!saved) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true, ...saved });
  } catch (error) {
    return errorResponse(error);
  }
}
