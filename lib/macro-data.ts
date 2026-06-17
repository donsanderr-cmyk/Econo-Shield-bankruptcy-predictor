import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { macroIndicator, minimumWage } from "@/lib/db/schema";
import type { UserSegment } from "@/lib/types";

export type MacroContext = {
  biRate: number;
  biRatePeriod: string;
  inflationRate: number;
  inflationPeriod: string;
  inflationUsesEstimates: boolean;
  loanRate: number;
  loanRatePeriod: string;
  loanCategory: string;
};

export async function getLatestMacroContext(
  segment: UserSegment
): Promise<MacroContext> {
  const loanCategory =
    segment === "msme" ? "Bank Umum - Modal Kerja" : "Bank Umum - Konsumsi";

  const [biRate] = await db
    .select()
    .from(macroIndicator)
    .where(eq(macroIndicator.indicator, "bi_rate"))
    .orderBy(desc(macroIndicator.period))
    .limit(1);

  const inflationRows = await db
    .select()
    .from(macroIndicator)
    .where(
      and(
        eq(macroIndicator.indicator, "inflation_mtm"),
        eq(macroIndicator.region, "NATIONAL_PROXY")
      )
    )
    .orderBy(desc(macroIndicator.period))
    .limit(12);

  const [loanRate] = await db
    .select()
    .from(macroIndicator)
    .where(
      and(
        eq(macroIndicator.indicator, "loan_rate"),
        eq(macroIndicator.category, loanCategory)
      )
    )
    .orderBy(desc(macroIndicator.period))
    .limit(1);

  if (!biRate || inflationRows.length === 0 || !loanRate) {
    throw new Error(
      "Dataset makro belum siap. Jalankan npm run db:setup terlebih dahulu."
    );
  }

  const compoundedInflation =
    (inflationRows.reduce((factor, row) => factor * (1 + row.value / 100), 1) -
      1) *
    100;

  return {
    biRate: biRate.value,
    biRatePeriod: biRate.period,
    inflationRate: Number(compoundedInflation.toFixed(4)),
    inflationPeriod: inflationRows[0].period,
    inflationUsesEstimates: inflationRows.some((row) => row.isEstimated),
    loanRate: loanRate.value,
    loanRatePeriod: loanRate.period,
    loanCategory
  };
}

export async function getMinimumWages() {
  return db
    .select()
    .from(minimumWage)
    .orderBy(minimumWage.province);
}
