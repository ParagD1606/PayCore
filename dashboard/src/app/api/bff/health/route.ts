import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/server/bff";
import { gatewayHealthFetch } from "@/lib/server/gateway";

export async function GET() {
  try {
    const data = await gatewayHealthFetch<{ status: string; message: string }>();
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
