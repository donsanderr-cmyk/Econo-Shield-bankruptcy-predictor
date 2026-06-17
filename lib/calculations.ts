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
  const baseExpense = input.fixedExpense + input.variableExpense;
  const inflationAdjustedExpense = baseExpense * (1 + input.inflationRate / 100);
  const estimatedMonthlyInterest = input.debt * (input.loanRate / 100 / 12);
  const monthlyDebtService = Math.max(input.monthlyDebtPayment, estimatedMonthlyInterest);
  const totalExpense = inflationAdjustedExpense + monthlyDebtService;
  const inventoryValue = input.segment === "msme" ? calculateInventoryValue(inventoryItems) : 0;
  const liquidAssets = input.savingsAsset + input.investmentValue;
  const totalAssets = liquidAssets + input.physicalAsset + inventoryValue;
  const netWorth = totalAssets - input.debt;
  const monthlySurplus = stressedIncome - totalExpense;
  const debtRatio = stressedIncome > 0 ? monthlyDebtService / stressedIncome : 1;
  const leverageRatio = totalAssets > 0 ? input.debt / totalAssets : input.debt > 0 ? 1 : 0;
  const cashRunway = liquidAssets / Math.max(totalExpense, 1);
  const realPurchasingPower = stressedIncome / (1 + input.inflationRate / 100);

  const surplusMargin = monthlySurplus / Math.max(stressedIncome, 1);
  const cashFlowScore = clamp((surplusMargin + 0.25) / 0.5, 0, 1) * 30;
  const runwayScore = clamp(cashRunway / 6, 0, 1) * 25;
  const debtServiceScore = clamp(1 - debtRatio / 0.5, 0, 1) * 25;
  const solvencyScore = clamp(1 - leverageRatio, 0, 1) * 15;
  const macroPressure = input.inflationRate / 15 + input.loanRate / 20 + input.biRate / 12;
  const macroScore = clamp(1 - macroPressure / 3, 0, 1) * 5;
  const financialScore = Math.round(
    clamp(
      cashFlowScore + runwayScore + debtServiceScore + solvencyScore + macroScore,
      0,
      100
    )
  );

  const { riskStatus, statusReason } = classifyRisk({
    cashRunway,
    debtRatio,
    totalAssets,
    liquidAssets,
    debt: input.debt,
    monthlySurplus,
    financialScore
  });

  return {
    stressedIncome,
    baseExpense,
    inflationAdjustedExpense,
    monthlyDebtService,
    totalExpense,
    inventoryValue,
    totalAssets,
    liquidAssets,
    netWorth,
    monthlySurplus,
    debtRatio,
    leverageRatio,
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
  totalAssets: number;
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

  if (
    args.monthlySurplus <= 0 ||
    args.cashRunway <= 3 ||
    args.debtRatio >= 0.5 ||
    args.debt > args.totalAssets ||
    args.financialScore < 55
  ) {
    return {
      riskStatus: "Near Crisis",
      statusReason: "Arus kas, runway, solvabilitas, atau rasio cicilan sudah mendekati batas krisis."
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
