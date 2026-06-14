export type UserSegment = "individual" | "msme";

export type FinancialInput = {
  segment: UserSegment;
  monthlyIncome: number;
  fixedExpense: number;
  variableExpense: number;
  savingsAsset: number;
  physicalAsset: number;
  investmentValue: number;
  debt: number;
  biRate: number;
  inflationRate: number;
  incomeShock: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
};

export type RiskStatus = "Resilient" | "Near Crisis" | "Bankrupt";

export type FinancialSnapshot = {
  stressedIncome: number;
  totalExpense: number;
  inventoryValue: number;
  totalAssets: number;
  liquidAssets: number;
  netWorth: number;
  monthlySurplus: number;
  debtRatio: number;
  cashRunway: number;
  realPurchasingPower: number;
  financialScore: number;
  riskStatus: RiskStatus;
  statusReason: string;
};
