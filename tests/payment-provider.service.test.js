
import { describe, it, expect } from "vitest";

const {
  authorizePayment,
  capturePayment,
  voidPayment,
  refundPayment,
} = require("../src/modules/providers/payment-provider.service");

describe("Payment Provider Service", () => {
  it("authorizes a payment", async () => {
    const result = await authorizePayment({
      amount: 50000,
      currency: "INR",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("authorized");
  });

  it("rejects invalid authorization", async () => {
    await expect(
      authorizePayment({
        amount: -500,
        currency: "INR",
      })
    ).rejects.toThrow("Invalid authorization amount");
  });

  it("captures an authorized payment", async () => {
    const authorization = await authorizePayment({
      amount: 50000,
      currency: "INR",
    });

    const result = await capturePayment(
      authorization.providerReference,
      50000
    );

    expect(result.success).toBe(true);
  });

  it("voids an authorization", async () => {
    const authorization = await authorizePayment({
      amount: 50000,
      currency: "INR",
    });

    const result = await voidPayment(
      authorization.providerReference
    );

    expect(result.success).toBe(true);
  });

  it("refunds a captured payment", async () => {
    const authorization = await authorizePayment({
      amount: 50000,
      currency: "INR",
    });

    await capturePayment(authorization.providerReference, 50000);

    const result = await refundPayment(
      authorization.providerReference,
      10000
    );

    expect(result.success).toBe(true);
    expect(result.refundedAmount).toBe(10000);
  });
});
