import { forwardSearchParams, proxyJson } from "@/lib/server/bff";

export async function GET(request: Request) {
  const query = forwardSearchParams(request, [
    "page",
    "limit",
    "transaction_type",
  ]);
  return proxyJson(`/api/ledger/transactions${query}`);
}
