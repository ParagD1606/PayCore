
import { describe, it, expect } from "vitest";

const {
  canTransition,
  validateTransition,
} = require("../src/modules/payments/payment.state-machine");

describe("Payment State Machine", () => {
  it("allows payment to enter processing", () => {
    expect(
      canTransition("requires_payment_method", "processing")
    ).toBe(true);
  });

  it("allows successful payment", () => {
    expect(
      canTransition("processing", "succeeded")
    ).toBe(true);
  });

  it("allows failed payment retry", () => {
    expect(
      canTransition("failed", "processing")
    ).toBe(true);
  });

  it("allows cancellation before payment", () => {
    expect(
      canTransition("requires_payment_method", "cancelled")
    ).toBe(true);
  });

  it("prevents capturing a cancelled payment", () => {
    expect(
      canTransition("cancelled", "succeeded")
    ).toBe(false);
  });

  it("prevents modifying a successful payment", () => {
    expect(
      canTransition("succeeded", "processing")
    ).toBe(false);
  });

  it("throws for invalid transitions", () => {
    expect(() =>
      validateTransition("succeeded", "failed")
    ).toThrow("Invalid payment transition");
  });
});
