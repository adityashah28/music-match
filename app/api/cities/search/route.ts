import { searchCities } from "@/lib/cities";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const cities = await searchCities(q);
    return Response.json({ cities });
  } catch (error) {
    return errorResponse(error);
  }
}
