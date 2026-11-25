import { forwardSearchParams, proxyJson, toErrorResponse } from "@/lib/server/bff";
import { gatewayFetch } from "@/lib/server/gateway";

export async function GET(request: Request) {
  const query = forwardSearchParams(request, ["page", "limit", "q", "status"]);
  return proxyJson(`/api/payment-intents${query}`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idempotencyKey = request.headers.get("Idempotency-Key");

    if (!idempotencyKey) {
      return Response.json(
        { error: "A valid Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const data = await gatewayFetch("/api/payment-intents", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
