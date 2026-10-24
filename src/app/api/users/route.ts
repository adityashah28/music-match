// POST /api/users — signup. Body: CreateUserRequest. Returns the id + token to keep in localStorage.
// TODO (phase 3): validate, insert user + user_artists.
import type { CreateUserRequest, CreateUserResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as CreateUserRequest;
  return Response.json({
    id: "00000000-0000-4000-8000-0000000000aa",
    token: "00000000-0000-4000-8000-0000000000bb",
    handle: body.handle ?? "you",
  } satisfies CreateUserResponse);
}
