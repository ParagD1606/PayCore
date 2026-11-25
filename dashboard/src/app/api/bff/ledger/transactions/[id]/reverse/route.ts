import { toErrorResponse } from "@/lib/server/bff";
import { gatewayFetch } from "@/lib/server/gateway";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await gatewayFetch(`/api/ledger/transactions/${id}/reverse`, {
      method: "POST",
    });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
