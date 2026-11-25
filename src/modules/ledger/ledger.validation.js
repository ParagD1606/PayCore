function validateLedgerEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    throw new Error("At least two ledger entries are required");
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
      throw new Error("Ledger amount must be a positive safe integer");
    }

    if (entry.entryType === "debit") {
      totalDebit += entry.amount;
    } else if (entry.entryType === "credit") {
      totalCredit += entry.amount;
    } else {
      throw new Error("Invalid ledger entry type");
    }
  }

  if (
    !Number.isSafeInteger(totalDebit) ||
    !Number.isSafeInteger(totalCredit) ||
    totalDebit !== totalCredit
  ) {
    throw new Error("Ledger transaction is not balanced");
  }

  return true;
}

module.exports = {
  validateLedgerEntries,
};