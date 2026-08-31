UPDATE `generation_jobs`
SET `status`='queued',`source_images`=(SELECT p.`image_urls` FROM `products` p WHERE p.`id`=`generation_jobs`.`product_id`),`external_job_id`=NULL,`error_code`=NULL,`error_message`=NULL,`completed_at`=NULL,`updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
) AND `status` IN ('blocked','queued','submitting','processing');
--> statement-breakpoint
INSERT INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-batch-' || p.`external_id`,p.`shop_id`,p.`id`,'queued',100-ROW_NUMBER() OVER (ORDER BY
  CASE p.`category` WHEN 'Тумбы' THEN 1 WHEN 'Столы' THEN 2 WHEN 'Стулья' THEN 3 WHEN 'Кресла' THEN 4 WHEN 'Диваны' THEN 5 ELSE 6 END,
  p.`external_id`
),p.`image_urls`,NULL,'Фотографии сохранены локально; товар ожидает текстурированную генерацию'
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
AND NOT EXISTS (
  SELECT 1 FROM `generation_jobs` g WHERE g.`product_id`=p.`id` AND g.`status` IN ('queued','submitting','processing','review')
);
--> statement-breakpoint
UPDATE `product_models`
SET `status`='queued',`source_type`='website_photo',`validation_message`='Добавлено в очередь текстурированной генерации',`updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
);
--> statement-breakpoint
INSERT INTO `product_models` (`product_id`,`status`,`source_type`,`validation_message`)
SELECT p.`id`,'queued','website_photo','Добавлено в очередь текстурированной генерации'
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
AND NOT EXISTS (SELECT 1 FROM `product_models` m WHERE m.`product_id`=p.`id`);
