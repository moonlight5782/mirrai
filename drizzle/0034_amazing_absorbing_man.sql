CREATE TABLE `auth_action_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`credential_version` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_auth_action_expiry` ON `auth_action_tokens` (`expires_at`);