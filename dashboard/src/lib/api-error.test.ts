import { describe, expect, it } from "vitest";

import { ApiError, parseApiError } from "@/lib/api-error";

describe("parseApiError", () => {
  it("parses JSON error bodies", async () => {
    const response = new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });

    const error = await parseApiError(response);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Order not found");
  });

  it("falls back when body is not JSON", async () => {
    const response = new Response("nope", { status: 500 });
    const error = await parseApiError(response);
    expect(error.message).toBe("Request failed (500)");
  });
});
