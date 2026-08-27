CREATE TABLE `product_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`status` text DEFAULT 'missing' NOT NULL,
	`glb_url` text,
	`usdz_url` text,
	`source_type` text DEFAULT 'none' NOT NULL,
	`validation_message` text,
	`quality_score` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_models_product` ON `product_models` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_product_models_status` ON `product_models` (`status`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`external_id` text,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Мебель' NOT NULL,
	`price` text DEFAULT '' NOT NULL,
	`material` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#d2bda8' NOT NULL,
	`width_cm` real,
	`height_cm` real,
	`depth_cm` real,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_shop_sku` ON `products` (`shop_id`,`sku`);--> statement-breakpoint
CREATE INDEX `idx_products_shop_active` ON `products` (`shop_id`,`active`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`subscription_status` text DEFAULT 'trial' NOT NULL,
	`owner_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shops_slug` ON `shops` (`slug`);--> statement-breakpoint
CREATE TABLE `widget_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`event` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_widget_events_shop_created` ON `widget_events` (`shop_id`,`created_at`);
--> statement-breakpoint
INSERT INTO `shops` (`slug`,`name`,`subscription_status`) VALUES ('nordform','NORDform Demo','active');
--> statement-breakpoint
INSERT INTO `products` (`shop_id`,`external_id`,`sku`,`name`,`category`,`price`,`material`,`color`,`width_cm`,`height_cm`,`depth_cm`) VALUES
((SELECT `id` FROM `shops` WHERE `slug`='nordform'),'cloud-chair-001','CLOUD-001','Кресло Cloud','Кресла','67 000 ₽','Букле, светлый беж','#d2bda8',84,76,82),
((SELECT `id` FROM `shops` WHERE `slug`='nordform'),'arc-chair-002','ARC-002','Стул Arc','Стулья','29 000 ₽','Дуб и ткань','#92765c',52,81,55),
((SELECT `id` FROM `shops` WHERE `slug`='nordform'),'halo-lamp-003','HALO-003','Торшер Halo','Освещение','18 400 ₽','Латунь, матовый металл','#d0be85',48,158,48),
((SELECT `id` FROM `shops` WHERE `slug`='nordform'),'plane-table-004','PLANE-004','Стол Plane','Столы','74 000 ₽','Натуральный дуб','#aa8763',160,75,86);
--> statement-breakpoint
INSERT INTO `product_models` (`product_id`,`status`,`glb_url`,`source_type`,`quality_score`,`validation_message`) VALUES
((SELECT `id` FROM `products` WHERE `sku`='CLOUD-001'),'published','/chair.glb','manufacturer',94,'GLB проверен, масштаб подтверждён'),
((SELECT `id` FROM `products` WHERE `sku`='ARC-002'),'processing',NULL,'photo',NULL,'Создание PBR-текстур'),
((SELECT `id` FROM `products` WHERE `sku`='HALO-003'),'review','/catalog/halo-lamp.glb','generated',78,'Требуется проверить отражения металла'),
((SELECT `id` FROM `products` WHERE `sku`='PLANE-004'),'missing',NULL,'none',NULL,'3D-модель не загружена');
--> statement-breakpoint
PRAGMA optimize;
