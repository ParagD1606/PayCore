const { validateLedgerEntries } = require("../src/modules/ledger/ledger.validation");

describe("Ledger Validation", () => {
  it("should accept balanced entries", () => {
    const entries = [
      { entryType: "debit", amount: 50000 },
      { entryType: "credit", amount: 50000 },
    ];

    expect(validateLedgerEntries(entries)).toBe(true);
  });

  it("should reject unbalanced entries", () => {
    const entries = [
      { entryType: "debit", amount: 50000 },
      { entryType: "credit", amount: 40000 },
    ];

    expect(() => validateLedgerEntries(entries))
      .toThrow("Ledger transaction is not balanced");
  });

  it("should reject fewer than two entries", () => {
    const entries = [
      { entryType: "debit", amount: 50000 },
    ];

    expect(() => validateLedgerEntries(entries))
      .toThrow("At least two ledger entries are required");
  });

  it("should reject invalid amounts", () => {
    const entries = [
      { entryType: "debit", amount: -500 },
      { entryType: "credit", amount: -500 },
    ];

    expect(() => validateLedgerEntries(entries))
      .toThrow("Ledger amount must be a positive safe integer");
  });
});