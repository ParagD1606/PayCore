
import { describe, it, expect, beforeEach } from "vitest";

const SimulatedPaymentProvider = require(
  "../src/modules/providers/simulated-payment.provider"
);

describe("Simulated Payment Provider", () => {
  let provider;

  beforeEach(() => {
    provider = new SimulatedPaymentProvider();
  });

  it("authorizes a successful payment", async () => {
    const result = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("authorized");
    expect(result.providerReference).toBeTruthy();
  });

  it("declines a payment", async () => {
    const result = await provider.authorize({
      amount: 50000,
      currency: "INR",
      outcome: "decline",
    });

    expect(result.success).toBe(false);
    expect(result.failureCode).toBe("CARD_DECLINED");
  });

  it("simulates provider timeout", async () => {
    const result = await provider.authorize({
      amount: 50000,
      currency: "INR",
      outcome: "timeout",
    });

    expect(result.status).toBe("unknown");
    expect(result.failureCode).toBe("PROVIDER_TIMEOUT");
  });

  it("rejects invalid amounts", async () => {
    await expect(
      provider.authorize({
        amount: -100,
        currency: "INR",
      })
    ).rejects.toThrow("Invalid authorization amount");
  });

  it("captures an authorized payment", async () => {
    const authorization = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    const result = await provider.capture(
      authorization.providerReference,
      50000
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("captured");
  });

  it("prevents capturing an authorization twice", async () => {
    const authorization = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    await provider.capture(authorization.providerReference, 50000);

    const secondCapture = await provider.capture(
      authorization.providerReference,
      50000
    );

    expect(secondCapture.success).toBe(false);
  });

  it("voids an authorization", async () => {
    const authorization = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    const result = await provider.void(
      authorization.providerReference
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("voided");
  });

  it("supports partial refunds", async () => {
    const authorization = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    await provider.capture(authorization.providerReference, 50000);

    const firstRefund = await provider.refund(
      authorization.providerReference,
      10000
    );

    const secondRefund = await provider.refund(
      authorization.providerReference,
      15000
    );

    expect(firstRefund.success).toBe(true);
    expect(secondRefund.success).toBe(true);
    expect(secondRefund.refundedAmount).toBe(15000);
  });

  it("prevents over-refunding", async () => {
    const authorization = await provider.authorize({
      amount: 50000,
      currency: "INR",
    });

    await provider.capture(authorization.providerReference, 50000);
    await provider.refund(authorization.providerReference, 40000);

    const result = await provider.refund(
      authorization.providerReference,
      20000
    );

    expect(result.success).toBe(false);
    expect(result.failureCode).toBe("INVALID_REFUND_AMOUNT");
  });
});
