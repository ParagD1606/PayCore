import { describe, expect, it } from "vitest";

import { createOrderFormSchema, toMinorUnits } from "@/lib/schemas";

describe("createOrderFormSchema", () => {
  it("accepts a valid order payload", () => {
    const result = createOrderFormSchema.safeParse({
      merchant_order_reference: "ORD-1001",
      amount_rupees: "500.50",
      currency: "INR",
      description: "Demo",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty reference and invalid amounts", () => {
    const result = createOrderFormSchema.safeParse({
      merchant_order_reference: "",
      amount_rupees: "0",
      currency: "inr",
    });

    expect(result.success).toBe(false);
  });
});

describe("toMinorUnits", () => {
  it("converts major units to integer minor units", () => {
    expect(toMinorUnits("500")).toBe(50000);
    expect(toMinorUnits("500.5")).toBe(50050);
    expect(toMinorUnits("500.50")).toBe(50050);
  });
});
