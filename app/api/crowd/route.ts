import { errorResponse } from "@/lib/errors";
import { getCrowd } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getCrowd());
  } catch (error) {
    return errorResponse(error);
  }
}
