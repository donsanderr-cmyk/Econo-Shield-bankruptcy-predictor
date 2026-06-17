import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const macroIndicator = sqliteTable(
  "macro_indicator",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seriesKey: text("series_key").notNull(),
    indicator: text("indicator", {
      enum: ["bi_rate", "inflation_mtm", "loan_rate"]
    }).notNull(),
    period: text("period").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    region: text("region"),
    category: text("category"),
    value: real("value").notNull(),
    unit: text("unit").notNull().default("percent"),
    isEstimated: integer("is_estimated", { mode: "boolean" }).notNull().default(false),
    method: text("method").notNull().default("source"),
    sampleSize: integer("sample_size"),
    sourceFile: text("source_file").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (table) => [
    uniqueIndex("macro_series_key_unique").on(table.seriesKey),
    index("macro_indicator_period_idx").on(table.indicator, table.period),
    index("macro_region_idx").on(table.region)
  ]
);

export const minimumWage = sqliteTable(
  "minimum_wage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    province: text("province").notNull(),
    year: integer("year").notNull(),
    amount: real("amount").notNull(),
    sourceFile: text("source_file").notNull()
  },
  (table) => [uniqueIndex("minimum_wage_province_year_unique").on(table.province, table.year)]
);

export const datasetImport = sqliteTable("dataset_import", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dataset: text("dataset").notNull().unique(),
  sourceFiles: integer("source_files").notNull(),
  actualRows: integer("actual_rows").notNull(),
  estimatedRows: integer("estimated_rows").notNull(),
  missingPeriods: integer("missing_periods").notNull(),
  notes: text("notes").notNull(),
  importedAt: integer("imported_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
});

export const financialRecord = sqliteTable(
  "financial_record",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    segment: text("segment", { enum: ["individual", "msme"] }).notNull(),
    monthlyIncome: real("monthly_income").notNull(),
    fixedExpense: real("fixed_expense").notNull(),
    variableExpense: real("variable_expense").notNull(),
    savingsAsset: real("savings_asset").notNull(),
    physicalAsset: real("physical_asset").notNull(),
    investmentValue: real("investment_value").notNull(),
    debt: real("debt").notNull(),
    monthlyDebtPayment: real("monthly_debt_payment").notNull(),
    incomeShock: real("income_shock").notNull(),
    province: text("province"),
    resultJson: text("result_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (table) => [index("financial_record_user_idx").on(table.userId, table.createdAt)]
);

export const inventoryItem = sqliteTable(
  "inventory_item",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id")
      .notNull()
      .references(() => financialRecord.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: real("quantity").notNull(),
    unitCost: real("unit_cost").notNull()
  },
  (table) => [index("inventory_record_idx").on(table.recordId)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  financialRecords: many(financialRecord)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const financialRecordRelations = relations(financialRecord, ({ one, many }) => ({
  user: one(user, { fields: [financialRecord.userId], references: [user.id] }),
  inventoryItems: many(inventoryItem)
}));

export const inventoryItemRelations = relations(inventoryItem, ({ one }) => ({
  record: one(financialRecord, {
    fields: [inventoryItem.recordId],
    references: [financialRecord.id]
  })
}));

export const schema = {
  user,
  session,
  account,
  verification,
  macroIndicator,
  minimumWage,
  datasetImport,
  financialRecord,
  inventoryItem,
  userRelations,
  sessionRelations,
  accountRelations,
  financialRecordRelations,
  inventoryItemRelations
};
