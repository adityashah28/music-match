import { errorResponse } from "@/lib/errors";
import { isHandleAvailable } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/users/handle?handle=maya → { available }. Onboarding checks this before moving on. */
export async function GET(request: Request) {
  try {
    const handle = new URL(request.url).searchParams.get("handle")?.trim().replace(/^@+/, "").slice(0, 32) ?? "";
    if (!handle) return Response.json({ error: "Add a username" }, { status: 400 });
    return Response.json({ available: await isHandleAvailable(handle) });
  } catch (error) {
    return errorResponse(error);
  }
}
