CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`external_id` text,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`color_name` text NOT NULL,
	`color_hex` text DEFAULT '#777777' NOT NULL,
	`material` text DEFAULT '' NOT NULL,
	`image_url` text,
	`glb_url` text,
	`usdz_url` text,
	`model_status` text DEFAULT 'missing' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_variants_product_sku` ON `product_variants` (`product_id`,`sku`);
--> statement-breakpoint
CREATE INDEX `idx_product_variants_product_active_sort` ON `product_variants` (`product_id`,`active`,`sort_order`);
--> statement-breakpoint
INSERT INTO `product_variants` (`product_id`,`external_id`,`sku`,`name`,`color_name`,`color_hex`,`material`,`image_url`,`glb_url`,`model_status`,`is_default`,`sort_order`)
SELECT p.`id`,'89990-vic-28','HUGGE-89990-VIC-28','VIC 28','Тёмно-серый VIC 28','#56585e','ткань VIC 28, матовый чёрный металл','/catalog-sources/hugge-md/alba-89990-1.jpg','/catalog/alba-chair-hunyuan2mv-pbr.glb','published',true,0
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990';
--> statement-breakpoint
UPDATE `products`
SET `price`='6 600 Lei', `material`='ткань VIC 28, матовый чёрный металл', `color`='#56585e', `updated_at`=CURRENT_TIMESTAMP
WHERE `id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');
--> statement-breakpoint
PRAGMA optimize;
