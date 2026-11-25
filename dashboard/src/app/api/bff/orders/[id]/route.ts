import { proxyJson } from "@/lib/server/bff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyJson(`/api/orders/${id}`);
}
