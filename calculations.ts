import type { FinancialInput, FinancialSnapshot, InventoryItem, RiskStatus } from "@/lib/types";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function calculateInventoryValue(items: InventoryItem[]) {
  return items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
}

export function calculateFinancialSnapshot(
  input: FinancialInput,
  inventoryItems: InventoryItem[]
): FinancialSnapshot {
  const stressedIncome = input.monthlyIncome * (1 - input.incomeShock / 100);
  const totalExpense = input.fixedExpense + input.variableExpense;
  const inventoryValue = input.segment === "msme" ? calculateInventoryValue(inventoryItems) : 0;
  const liquidAssets = input.savingsAsset + input.investmentValue;
  const totalAssets = liquidAssets + input.physicalAsset + inventoryValue;
  const netWorth = totalAssets - input.debt;
  const monthlySurplus = stressedIncome - totalExpense;
  const debtRatio = stressedIncome > 0 ? input.debt / (stressedIncome * 12) : 1;
  const monthlyBurn = monthlySurplus < 0 ? Math.abs(monthlySurplus) : Math.max(totalExpense, 1);
  const cashRunway = liquidAssets / monthlyBurn;
  const realPurchasingPower = stressedIncome / (1 + input.inflationRate / 100);

  const scoreParts = [
    clamp((monthlySurplus / Math.max(stressedIncome, 1)) * 35, -35, 35),
    clamp((cashRunway / 6) * 30, 0, 30),
    clamp((1 - debtRatio / 0.5) * 25, -25, 25),
    clamp(((input.biRate <= 6 ? 6 - input.biRate : 6 - input.biRate) / 6) * 10, -10, 10)
  ];
  const financialScore = Math.round(clamp(50 + scoreParts.reduce((sum, part) => sum + part, 0), 0, 100));

  const { riskStatus, statusReason } = classifyRisk({
    cashRunway,
    debtRatio,
    liquidAssets,
    debt: input.debt,
    monthlySurplus,
    financialScore
  });

  return {
    stressedIncome,
    totalExpense,
    inventoryValue,
    totalAssets,
    liquidAssets,
    netWorth,
    monthlySurplus,
    debtRatio,
    cashRunway,
    realPurchasingPower,
    financialScore,
    riskStatus,
    statusReason
  };
}

function classifyRisk(args: {
  cashRunway: number;
  debtRatio: number;
  liquidAssets: number;
  debt: number;
  monthlySurplus: number;
  financialScore: number;
}): { riskStatus: RiskStatus; statusReason: string } {
  if (args.monthlySurplus < 0 && args.debt > args.liquidAssets && args.cashRunway < 1) {
    return {
      riskStatus: "Bankrupt",
      statusReason: "Cash flow negatif, utang melewati aset likuid, dan runway kurang dari 1 bulan."
    };
  }

  if (args.cashRunway <= 3 || args.debtRatio >= 0.5 || args.financialScore < 55) {
    return {
      riskStatus: "Near Crisis",
      statusReason: "Cadangan kas atau rasio utang sudah mendekati batas krisis."
    };
  }

  if (args.debtRatio < 0.3 && args.cashRunway > 6 && args.financialScore >= 70) {
    return {
      riskStatus: "Resilient",
      statusReason: "Rasio utang sehat, cadangan kas kuat, dan skor finansial stabil."
    };
  }

  return {
    riskStatus: "Near Crisis",
    statusReason: "Kondisi cukup berjalan, tetapi belum memenuhi ambang tangguh."
  };
}
