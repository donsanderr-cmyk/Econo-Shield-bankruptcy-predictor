CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `dataset_import` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dataset` text NOT NULL,
	`source_files` integer NOT NULL,
	`actual_rows` integer NOT NULL,
	`estimated_rows` integer NOT NULL,
	`missing_periods` integer NOT NULL,
	`notes` text NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_import_dataset_unique` ON `dataset_import` (`dataset`);--> statement-breakpoint
CREATE TABLE `financial_record` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`segment` text NOT NULL,
	`monthly_income` real NOT NULL,
	`fixed_expense` real NOT NULL,
	`variable_expense` real NOT NULL,
	`savings_asset` real NOT NULL,
	`physical_asset` real NOT NULL,
	`investment_value` real NOT NULL,
	`debt` real NOT NULL,
	`monthly_debt_payment` real NOT NULL,
	`income_shock` real NOT NULL,
	`province` text,
	`result_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `financial_record_user_idx` ON `financial_record` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `inventory_item` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_cost` real NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `financial_record`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inventory_record_idx` ON `inventory_item` (`record_id`);--> statement-breakpoint
CREATE TABLE `macro_indicator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`series_key` text NOT NULL,
	`indicator` text NOT NULL,
	`period` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`region` text,
	`category` text,
	`value` real NOT NULL,
	`unit` text DEFAULT 'percent' NOT NULL,
	`is_estimated` integer DEFAULT false NOT NULL,
	`method` text DEFAULT 'source' NOT NULL,
	`sample_size` integer,
	`source_file` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `macro_series_key_unique` ON `macro_indicator` (`series_key`);--> statement-breakpoint
CREATE INDEX `macro_indicator_period_idx` ON `macro_indicator` (`indicator`,`period`);--> statement-breakpoint
CREATE INDEX `macro_region_idx` ON `macro_indicator` (`region`);--> statement-breakpoint
CREATE TABLE `minimum_wage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`province` text NOT NULL,
	`year` integer NOT NULL,
	`amount` real NOT NULL,
	`source_file` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `minimum_wage_province_year_unique` ON `minimum_wage` (`province`,`year`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);