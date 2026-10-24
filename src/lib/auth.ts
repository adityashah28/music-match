// Who is making this request? The frontend sends the token it got at signup as
// "Authorization: Bearer <token>". No token or a wrong token means no user.
import "server-only";
import { supabase } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUserFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !UUID.test(token)) return null;

  const { data } = await supabase
    .from("users")
    .select("id, handle, city, instagram, tiktok, snapchat, is_demo")
    .eq("token", token)
    .maybeSingle();

  return data;
}

export function unauthorized() {
  return Response.json({ error: "Missing or invalid token. Sign up again." }, { status: 401 });
}
