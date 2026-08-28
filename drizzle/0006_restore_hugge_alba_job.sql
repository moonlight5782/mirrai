INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_message`)
SELECT 'hugge-alba-89990',p.`shop_id`,p.`id`,'queued',100,p.`image_urls`,'Фотографии сохранены в MIRRAI; товар готов к генерации'
FROM `products` p
INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990';
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`=CASE WHEN `status`='blocked' THEN 'queued' ELSE `status` END,
    `source_images`=(SELECT `image_urls` FROM `products` WHERE `id`=`generation_jobs`.`product_id`),
    `error_code`=CASE WHEN `status`='blocked' THEN NULL ELSE `error_code` END,
    `error_message`=CASE WHEN `status`='blocked' THEN 'Фотографии сохранены в MIRRAI; товар готов к генерации' ELSE `error_message` END,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990';
