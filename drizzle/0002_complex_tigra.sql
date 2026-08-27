CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`product_id` integer,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assets_storage_key` ON `assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_assets_shop_created` ON `assets` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `platform_operators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_platform_operators_user` ON `platform_operators` (`user_id`);--> statement-breakpoint
CREATE TABLE `shop_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shop_invites_shop_email` ON `shop_invites` (`shop_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_shop_invites_email` ON `shop_invites` (`email`);--> statement-breakpoint
CREATE TABLE `shop_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shop_members_shop_user` ON `shop_members` (`shop_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_shop_members_user` ON `shop_members` (`user_id`);--> statement-breakpoint
ALTER TABLE `product_models` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `plan` text DEFAULT 'pilot' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `trial_ends_at` text;