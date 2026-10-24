import { StoreError } from "@/lib/errors";
import { userIdForToken } from "@/lib/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks that the request carries the token of the user it acts for ("Authorization: Bearer <token>").
 * User ids appear in other people's match lists, so an id alone proves nothing; the token does.
 */
export async function requireUser(request: Request, claimedUserId: string): Promise<string> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const userId = UUID.test(token) ? await userIdForToken(token) : null;
  if (!userId || userId !== claimedUserId) {
    throw new StoreError(401, "This device isn't signed in as that profile. Set up your profile again.");
  }
  return userId;
}
