CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`external_job_id` text,
	`source_images` text DEFAULT '[]' NOT NULL,
	`result_glb_url` text,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_shop_status_priority` ON `generation_jobs` (`shop_id`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_product_created` ON `generation_jobs` (`product_id`,`created_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-alba-89990',p.`shop_id`,p.`id`,'blocked',100,p.`image_urls`,'service_not_configured','Очередь подготовлена; подключите 3D-сервер и восстановите HTTPS источника' FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990';
--> statement-breakpoint
INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-ria-109553',p.`shop_id`,p.`id`,'blocked',90,p.`image_urls`,'service_not_configured','Очередь подготовлена; подключите 3D-сервер и восстановите HTTPS источника' FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-109553';
--> statement-breakpoint
INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-ria-107376',p.`shop_id`,p.`id`,'blocked',85,p.`image_urls`,'service_not_configured','Очередь подготовлена; подключите 3D-сервер и восстановите HTTPS источника' FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-107376';
--> statement-breakpoint
INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-blackburn-100326',p.`shop_id`,p.`id`,'blocked',80,p.`image_urls`,'service_not_configured','Очередь подготовлена; подключите 3D-сервер и восстановите HTTPS источника' FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-100326';
