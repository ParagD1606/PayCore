import { describe, expect, it } from "vitest";

import { formatAmount, formatDateTime, shortenId } from "@/lib/format";

describe("formatAmount", () => {
  it("formats minor units as currency", () => {
    expect(formatAmount(50000, "INR")).toContain("500.00");
  });

  it("handles invalid values", () => {
    expect(formatAmount("abc")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats ISO timestamps", () => {
    expect(formatDateTime("2026-11-25T10:15:00.000Z")).toMatch(/25 Nov 2026/);
  });

  it("handles empty values", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("shortenId", () => {
  it("shortens long identifiers", () => {
    expect(shortenId("1234567890abcdef1234")).toBe("12345678…1234");
  });
});
