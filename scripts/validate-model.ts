import assert from "node:assert/strict";
import { calculateFinancialSnapshot, calculateInventoryValue } from "../lib/calculations";
import type { FinancialInput, InventoryItem } from "../lib/types";

const inventory: InventoryItem[] = [
  { id: "a", name: "A", quantity: 10, unitCost: 25_000 },
  { id: "b", name: "B", quantity: 4, unitCost: 50_000 }
];

assert.equal(calculateInventoryValue(inventory), 450_000);

const healthyInput: FinancialInput = {
  segment: "msme",
  monthlyIncome: 50_000_000,
  fixedExpense: 10_000_000,
  variableExpense: 5_000_000,
  savingsAsset: 150_000_000,
  physicalAsset: 100_000_000,
  investmentValue: 50_000_000,
  debt: 20_000_000,
  monthlyDebtPayment: 2_000_000,
  biRate: 5,
  inflationRate: 3,
  loanRate: 8,
  incomeShock: 0
};

const healthy = calculateFinancialSnapshot(healthyInput, inventory);
assert.equal(healthy.inventoryValue, 450_000);
assert.equal(healthy.debtRatio, 2_000_000 / 50_000_000);
assert.equal(healthy.riskStatus, "Resilient");
assert.ok(healthy.financialScore >= 70);

const distressed = calculateFinancialSnapshot(
  {
    ...healthyInput,
    monthlyIncome: 10_000_000,
    fixedExpense: 14_000_000,
    variableExpense: 4_000_000,
    savingsAsset: 1_000_000,
    investmentValue: 0,
    physicalAsset: 0,
    debt: 50_000_000,
    monthlyDebtPayment: 6_000_000,
    incomeShock: 30
  },
  []
);

assert.equal(distressed.riskStatus, "Bankrupt");
assert.ok(distressed.monthlySurplus < 0);
assert.ok(distressed.cashRunway < 1);

for (const [key, value] of Object.entries(healthy)) {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${key} harus berupa angka finite`);
  }
}

console.log("Model validation passed.");
