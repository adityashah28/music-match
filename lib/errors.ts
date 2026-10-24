export class StoreError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StoreError";
    this.status = status;
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return (
    error instanceof Error &&
    error.name === "StoreError" &&
    "status" in error &&
    typeof (error as StoreError).status === "number"
  );
}

export function errorResponse(error: unknown): Response {
  if (isStoreError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error instanceof Error ? error.message : "request failed");
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
