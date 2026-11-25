import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "@/lib/api-client";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON for successful requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const result = await api.listOrders({ page: 1 });
    expect(result.pagination.total).toBe(0);
    expect(fetch).toHaveBeenCalledWith(
      "/api/bff/orders?page=1",
      expect.objectContaining({ signal: undefined })
    );
  });

  it("throws ApiError for failed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      )
    );

    await expect(api.getProfile()).rejects.toBeInstanceOf(ApiError);
  });

  it("forwards idempotency headers when creating payment intents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "ok",
          payment_intent: {
            id: "1",
            order_id: "2",
            amount: 100,
            currency: "INR",
            status: "requires_payment_method",
            created_at: new Date().toISOString(),
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.createPaymentIntent({ order_id: "order-1" }, "idem-key-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/payment-intents",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
      })
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Idempotency-Key")).toBe("idem-key-123");
  });
});
