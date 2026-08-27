ALTER TABLE `shops` ADD `website_url` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `allowed_domains` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `platform` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `installation_status` text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `installation_checked_at` text;