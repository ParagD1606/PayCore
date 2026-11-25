import { forwardSearchParams, proxyJson, toErrorResponse } from "@/lib/server/bff";
import { gatewayFetch } from "@/lib/server/gateway";

export async function GET(request: Request) {
  const query = forwardSearchParams(request, ["page", "limit", "q", "status"]);
  return proxyJson(`/api/orders${query}`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await gatewayFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
