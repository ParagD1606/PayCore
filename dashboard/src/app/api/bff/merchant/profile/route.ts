import { proxyJson } from "@/lib/server/bff";

export async function GET() {
  return proxyJson("/api/merchant/profile");
}
