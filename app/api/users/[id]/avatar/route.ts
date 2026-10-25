import { requireUser } from "@/lib/auth";
import { errorResponse, StoreError } from "@/lib/errors";
import { updateUser, uploadAvatar } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_INTERVAL_MS = 4000;

// Best-effort per-instance throttle (no shared store across serverless
// instances) so one token can't hammer storage with max-size uploads back
// to back. Resets on redeploy; that's fine, this is abuse mitigation, not
// a security boundary on its own — requireUser is.
const lastUploadAt = new Map<string, number>();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireUser(request, id);

    const lastAt = lastUploadAt.get(id) ?? 0;
    const waitMs = MIN_INTERVAL_MS - (Date.now() - lastAt);
    if (waitMs > 0) {
      throw new StoreError(429, "Give it a few seconds before uploading another photo.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new StoreError(400, "Choose a photo to upload");
    }
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      throw new StoreError(400, "Choose a photo to upload");
    }
    if (file.size > MAX_BYTES) {
      throw new StoreError(400, "Photo is too large. Max 8MB.");
    }

    lastUploadAt.set(id, Date.now());
    const bytes = new Uint8Array(await file.arrayBuffer());
    const avatarUrl = await uploadAvatar(id, bytes, file.type);
    const profile = await updateUser(id, { avatarUrl });
    return Response.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
