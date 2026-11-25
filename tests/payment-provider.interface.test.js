
import { describe, it, expect } from "vitest";

const PaymentProvider = require(
  "../src/modules/providers/payment-provider.interface"
);

describe("Payment Provider Interface", () => {
  const provider = new PaymentProvider();

  it("requires authorize implementation", async () => {
    await expect(
      provider.authorize({})
    ).rejects.toThrow("authorize() must be implemented");
  });

  it("requires capture implementation", async () => {
    await expect(
      provider.capture("ref_123", 50000)
    ).rejects.toThrow("capture() must be implemented");
  });

  it("requires void implementation", async () => {
    await expect(
      provider.void("ref_123")
    ).rejects.toThrow("void() must be implemented");
  });

  it("requires refund implementation", async () => {
    await expect(
      provider.refund("ref_123", 10000)
    ).rejects.toThrow("refund() must be implemented");
  });
});
