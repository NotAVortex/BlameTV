import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function ok(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) return fail(err.message, err.status);
  if (err instanceof ZodError) {
    return fail(
      err.issues
        .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
        .join("; "),
      422
    );
  }
  console.error(err);
  return fail("Internal server error", 500);
}
