import { z } from "zod";

const nonNegative = z.number().finite().min(0).max(1_000_000_000_000_000);

export const inventoryItemSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  quantity: nonNegative,
  unitCost: nonNegative
});

export const financialInputSchema = z.object({
  segment: z.enum(["individual", "msme"]),
  monthlyIncome: nonNegative,
  fixedExpense: nonNegative,
  variableExpense: nonNegative,
  savingsAsset: nonNegative,
  physicalAsset: nonNegative,
  investmentValue: nonNegative,
  debt: nonNegative,
  monthlyDebtPayment: nonNegative,
  incomeShock: z.number().finite().min(0).max(100),
  biRate: z.number().finite().min(0).max(30).optional(),
  inflationRate: z.number().finite().min(-20).max(100).optional(),
  loanRate: z.number().finite().min(0).max(100).optional(),
  province: z.string().trim().max(100).optional().nullable()
});

export const calculationRequestSchema = z.object({
  input: financialInputSchema,
  inventoryItems: z.array(inventoryItemSchema).max(500)
});
