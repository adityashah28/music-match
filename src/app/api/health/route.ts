// GET /api/health — checks the app can reach Supabase. Open it in a browser after setting .env.local.
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { count, error } = await supabase.from("artists").select("*", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  // A wrong URL can 404 without an error object; a real table always returns a number
  if (count === null) {
    return Response.json(
      { ok: false, error: "No count returned. Check SUPABASE_URL is just https://<id>.supabase.co" },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, artists: count });
}
