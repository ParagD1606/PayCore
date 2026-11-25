import "server-only";

import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api-error";
import { gatewayFetch } from "@/lib/server/gateway";

export async function proxyJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  try {
    const data = await gatewayFetch<T>(path, init);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.status }
    );
  }

  console.error("BFF proxy error:", error);
  return NextResponse.json(
    { error: "Unexpected dashboard proxy error" },
    { status: 500 }
  );
}

export function forwardSearchParams(
  request: Request,
  allowed: string[]
): string {
  const incoming = new URL(request.url).searchParams;
  const outgoing = new URLSearchParams();

  for (const key of allowed) {
    const value = incoming.get(key);
    if (value) outgoing.set(key, value);
  }

  const query = outgoing.toString();
  return query ? `?${query}` : "";
}
