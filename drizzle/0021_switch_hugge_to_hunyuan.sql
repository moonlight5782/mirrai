UPDATE `generation_jobs`
SET `status`='queued',
    `source_images`=(SELECT p.`image_urls` FROM `products` p WHERE p.`id`=`generation_jobs`.`product_id`),
    `attempt`=0,
    `external_job_id`=NULL,
    `result_glb_url`=NULL,
    `error_code`=NULL,
    `error_message`='Перезапущено через Hunyuan3D-2.1; результаты Stable Fast 3D отклонены',
    `started_at`=NULL,
    `completed_at`=NULL,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
);
--> statement-breakpoint
UPDATE `product_models`
SET `status`='queued',
    `glb_url`=NULL,
    `usdz_url`=NULL,
    `source_type`='website_photo',
    `validation_message`='В очереди Hunyuan3D-2.1; геометрия и текстуры будут проверены перед публикацией',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
);
