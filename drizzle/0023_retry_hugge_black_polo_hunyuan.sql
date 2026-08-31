UPDATE `generation_jobs`
SET `status`='failed',
    `error_code`='superseded',
    `error_message`='Заменено чистым заданием Hunyuan3D-2.1 после исправления локального источника',
    `completed_at`=CURRENT_TIMESTAMP,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-90315'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `generation_jobs`
(`id`,`shop_id`,`product_id`,`status`,`priority`,`attempt`,`max_attempts`,`source_images`,`error_message`)
SELECT 'hugge-hunyuan-retry-90315',p.`shop_id`,p.`id`,'queued',99,0,3,p.`image_urls`,
       'Чистый повторный запуск Hunyuan3D-2.1 по локально сохранённой фотографии'
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-90315';
--> statement-breakpoint
UPDATE `product_models`
SET `status`='queued',
    `glb_url`=NULL,
    `usdz_url`=NULL,
    `source_type`='website_photo',
    `validation_message`='Повторно поставлено в очередь Hunyuan3D-2.1 по локально сохранённой фотографии',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-90315'
);
