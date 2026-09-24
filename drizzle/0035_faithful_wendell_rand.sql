CREATE TABLE `commerce_pricing` (
	`id` integer PRIMARY KEY NOT NULL,
	`monthly_minor` integer,
	`supplied_model_minor` integer,
	`generated_model_minor` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchant_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`shop_id` integer,
	`shop_name` text NOT NULL,
	`website_url` text NOT NULL,
	`supplied_count` integer NOT NULL,
	`generated_count` integer NOT NULL,
	`quote_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`operator_note` text DEFAULT '' NOT NULL,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_merchant_requests_user_created` ON `merchant_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_merchant_requests_status` ON `merchant_requests` (`status`);