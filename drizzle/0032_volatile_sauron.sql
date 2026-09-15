ALTER TABLE `auth_users` ADD `email_verified_at` text;--> statement-breakpoint
ALTER TABLE `shop_invites` ADD `token_hash` text;--> statement-breakpoint
ALTER TABLE `shop_invites` ADD `expires_at` text;--> statement-breakpoint
ALTER TABLE `shop_invites` ADD `accepted_by_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shop_invites_token_hash` ON `shop_invites` (`token_hash`);