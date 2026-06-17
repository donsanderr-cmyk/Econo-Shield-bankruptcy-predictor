import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { db } from "../lib/db";
import {
  datasetImport,
  macroIndicator,
  minimumWage
} from "../lib/db/schema";

type Indicator = "bi_rate" | "inflation_mtm" | "loan_rate";

type MacroRow = {
  seriesKey: string;
  indicator: Indicator;
  period: string;
  year: number;
  month: number;
  region: string | null;
  category: string | null;
  value: number;
  unit: string;
  isEstimated: boolean;
  method: string;
  sampleSize: number | null;
  sourceFile: string;
};

const RAW_DIR = path.resolve("data/raw");
const MONTH_COUNT = 12;

function parseNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace("%", "");
  if (!normalized || normalized === "-") return null;
  const parsed = Number(normalized.replace(/\s/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function yearFromFile(fileName: string) {
  const match = fileName.match(/(20\d{2})\.csv$/);
  if (!match) throw new Error(`Tahun tidak ditemukan pada ${fileName}`);
  return Number(match[1]);
}

function period(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function seriesKey(
  indicator: Indicator,
  date: string,
  region: string | null,
  category: string | null
) {
  return [indicator, date, region ?? "-", category ?? "-"].join("|");
}

async function csvRows(fileName: string) {
  const content = await readFile(path.join(RAW_DIR, fileName), "utf8");
  return parse(content, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: false,
    trim: true
  }) as string[][];
}

async function parseBiRate(files: string[]) {
  const rows: MacroRow[] = [];

  for (const fileName of files) {
    const year = yearFromFile(fileName);
    const csv = await csvRows(fileName);
    const dataRow = csv.slice(4).find((row) => row[0]?.toLowerCase() === "bi rate");
    if (!dataRow) continue;

    for (let index = 0; index < MONTH_COUNT; index += 1) {
      const value = parseNumber(dataRow[index + 1]);
      if (value === null) continue;
      const month = index + 1;
      const date = period(year, month);
      rows.push({
        seriesKey: seriesKey("bi_rate", date, null, "BI Rate"),
        indicator: "bi_rate",
        period: date,
        year,
        month,
        region: null,
        category: "BI Rate",
        value,
        unit: "percent",
        isEstimated: false,
        method: "source",
        sampleSize: null,
        sourceFile: fileName
      });
    }
  }

  return rows;
}

async function parseInflation(files: string[]) {
  const sourceRows: MacroRow[] = [];
  const valuesByPeriod = new Map<string, number[]>();

  for (const fileName of files) {
    const year = yearFromFile(fileName);
    const csv = await csvRows(fileName);

    for (const row of csv.slice(4)) {
      const region = row[0]?.trim();
      if (!region) continue;

      for (let index = 0; index < MONTH_COUNT; index += 1) {
        const value = parseNumber(row[index + 1]);
        if (value === null) continue;
        const month = index + 1;
        const date = period(year, month);
        sourceRows.push({
          seriesKey: seriesKey("inflation_mtm", date, region, null),
          indicator: "inflation_mtm",
          period: date,
          year,
          month,
          region,
          category: null,
          value,
          unit: "percent",
          isEstimated: false,
          method: "source_city",
          sampleSize: null,
          sourceFile: fileName
        });
        valuesByPeriod.set(date, [...(valuesByPeriod.get(date) ?? []), value]);
      }
    }
  }

  const proxyRows: MacroRow[] = Array.from(valuesByPeriod.entries()).map(([date, values]) => {
    const [year, month] = date.split("-").map(Number);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      seriesKey: seriesKey("inflation_mtm", date, "NATIONAL_PROXY", null),
      indicator: "inflation_mtm",
      period: date,
      year,
      month,
      region: "NATIONAL_PROXY",
      category: null,
      value: Number(mean.toFixed(6)),
      unit: "percent",
      isEstimated: false,
      method: "unweighted_city_mean",
      sampleSize: values.length,
      sourceFile: "DERIVED_FROM_CITY_ROWS"
    };
  });

  return {
    rows: [...sourceRows, ...proxyRows, ...interpolateProxy(proxyRows, "inflation_mtm")],
    proxyActual: proxyRows.length
  };
}

async function parseLoanRates(files: string[]) {
  const rows: MacroRow[] = [];

  for (const fileName of files) {
    const year = yearFromFile(fileName);
    const csv = await csvRows(fileName);

    for (const row of csv.slice(4)) {
      const category = row[0]?.trim();
      if (!category) continue;

      for (let index = 0; index < MONTH_COUNT; index += 1) {
        const value = parseNumber(row[index + 1]);
        if (value === null) continue;
        const month = index + 1;
        const date = period(year, month);
        rows.push({
          seriesKey: seriesKey("loan_rate", date, null, category),
          indicator: "loan_rate",
          period: date,
          year,
          month,
          region: null,
          category,
          value,
          unit: "percent",
          isEstimated: false,
          method: "source",
          sampleSize: null,
          sourceFile: fileName
        });
      }
    }
  }

  const benchmarkActual = rows.filter(
    (row) => row.category === "Bank Umum - Modal Kerja"
  );

  return {
    rows: [...rows, ...interpolateProxy(benchmarkActual, "loan_rate")],
    benchmarkActual: benchmarkActual.length
  };
}

function interpolateProxy(actualRows: MacroRow[], indicator: Indicator) {
  if (actualRows.length < 2) return [];

  const sorted = [...actualRows].sort((a, b) => a.period.localeCompare(b.period));
  const byIndex = new Map(
    sorted.map((row) => [row.year * MONTH_COUNT + row.month - 1, row])
  );
  const firstIndex = sorted[0].year * MONTH_COUNT + sorted[0].month - 1;
  const last = sorted[sorted.length - 1];
  const lastIndex = last.year * MONTH_COUNT + last.month - 1;
  const estimated: MacroRow[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    if (byIndex.has(index)) continue;

    let previousIndex = index - 1;
    while (previousIndex >= firstIndex && !byIndex.has(previousIndex)) previousIndex -= 1;
    let nextIndex = index + 1;
    while (nextIndex <= lastIndex && !byIndex.has(nextIndex)) nextIndex += 1;
    const previous = byIndex.get(previousIndex);
    const next = byIndex.get(nextIndex);
    if (!previous || !next) continue;

    const ratio = (index - previousIndex) / (nextIndex - previousIndex);
    const value = previous.value + (next.value - previous.value) * ratio;
    const year = Math.floor(index / MONTH_COUNT);
    const month = (index % MONTH_COUNT) + 1;
    const date = period(year, month);
    const region = previous.region;
    const category = previous.category;

    estimated.push({
      seriesKey: seriesKey(indicator, date, region, category),
      indicator,
      period: date,
      year,
      month,
      region,
      category,
      value: Number(value.toFixed(6)),
      unit: "percent",
      isEstimated: true,
      method: "linear_interpolation",
      sampleSize: null,
      sourceFile: "MODEL_GENERATED"
    });
  }

  return estimated;
}

async function parseMinimumWage(fileName: string) {
  const year = yearFromFile(fileName);
  const csv = await csvRows(fileName);
  return csv
    .slice(3)
    .map((row) => ({
      province: row[0]?.trim(),
      amount: parseNumber(row[1])
    }))
    .filter(
      (row): row is { province: string; amount: number } =>
        Boolean(row.province) && row.amount !== null
    )
    .map((row) => ({
      province: row.province,
      year,
      amount: row.amount,
      sourceFile: fileName
    }));
}

async function insertBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>) {
  const batchSize = 400;
  for (let index = 0; index < rows.length; index += batchSize) {
    await insert(rows.slice(index, index + batchSize));
  }
}

function validateMacroRows(rows: MacroRow[]) {
  const keys = new Set<string>();
  const limits: Record<Indicator, [number, number]> = {
    bi_rate: [0, 30],
    inflation_mtm: [-20, 20],
    loan_rate: [0, 100]
  };

  for (const row of rows) {
    if (keys.has(row.seriesKey)) {
      throw new Error(`Duplikat seri makro: ${row.seriesKey}`);
    }
    keys.add(row.seriesKey);

    const [minimum, maximum] = limits[row.indicator];
    if (!Number.isFinite(row.value) || row.value < minimum || row.value > maximum) {
      throw new Error(
        `Nilai ${row.indicator} di luar batas valid: ${row.seriesKey}=${row.value}`
      );
    }
    if (row.month < 1 || row.month > 12 || row.period !== period(row.year, row.month)) {
      throw new Error(`Periode tidak valid: ${row.seriesKey}`);
    }
  }
}

async function main() {
  const files = await readdir(RAW_DIR);
  const biFiles = files.filter((name) => name.startsWith("BI Rate,")).sort();
  const inflationFiles = files
    .filter((name) => name.startsWith("Month-to-Month Inflation"))
    .sort();
  const loanFiles = files
    .filter((name) => name.startsWith("Suku Bunga Kredit Rupiah"))
    .sort();
  const wageFile = files.find((name) => name.startsWith("Upah Minimum Regional"));
  if (!wageFile) throw new Error("Dataset UMR tidak ditemukan.");

  const biRows = await parseBiRate(biFiles);
  const inflation = await parseInflation(inflationFiles);
  const loan = await parseLoanRates(loanFiles);
  const wageRows = await parseMinimumWage(wageFile);
  const allMacroRows = [...biRows, ...inflation.rows, ...loan.rows];
  validateMacroRows(allMacroRows);

  await db.delete(macroIndicator);
  await db.delete(minimumWage);
  await db.delete(datasetImport);

  await insertBatches(allMacroRows, (batch) => db.insert(macroIndicator).values(batch));
  await insertBatches(wageRows, (batch) => db.insert(minimumWage).values(batch));

  const estimatedInflation = inflation.rows.filter(
    (row) => row.indicator === "inflation_mtm" && row.isEstimated
  ).length;
  const estimatedLoan = loan.rows.filter((row) => row.isEstimated).length;

  await db.insert(datasetImport).values([
    {
      dataset: "BI Rate",
      sourceFiles: biFiles.length,
      actualRows: biRows.length,
      estimatedRows: 0,
      missingPeriods: 17 * 12 - biRows.length,
      notes: "Nilai sumber disimpan apa adanya; bulan setelah publikasi terakhir tidak diekstrapolasi."
    },
    {
      dataset: "Inflasi M-to-M",
      sourceFiles: inflationFiles.length,
      actualRows: inflation.rows.length - estimatedInflation,
      estimatedRows: estimatedInflation,
      missingPeriods: estimatedInflation,
      notes:
        "Proxy nasional adalah rata-rata aritmetika kota tanpa bobot. Celah di antara dua periode aktual diisi interpolasi linear dan selalu ditandai estimasi."
    },
    {
      dataset: "Suku Bunga Kredit",
      sourceFiles: loanFiles.length,
      actualRows: loan.rows.length - estimatedLoan,
      estimatedRows: estimatedLoan,
      missingPeriods: estimatedLoan,
      notes:
        "Semua kategori bank disimpan. Model UMKM memakai Bank Umum - Modal Kerja; celah internal ditandai sebagai interpolasi."
    },
    {
      dataset: "Upah Minimum Provinsi",
      sourceFiles: 1,
      actualRows: wageRows.length,
      estimatedRows: 0,
      missingPeriods: 0,
      notes:
        "Dataset hanya tersedia untuk 2020 dan dipakai sebagai baseline, bukan sebagai UMP tahun berjalan."
    }
  ]);

  console.log(
    JSON.stringify(
      {
        macroRows: allMacroRows.length,
        biRows: biRows.length,
        inflationRows: inflation.rows.length,
        loanRows: loan.rows.length,
        wageRows: wageRows.length,
        estimatedInflation,
        estimatedLoan
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
