UPDATE `generation_jobs`
SET `status`='failed',
    `error_code`='published_model_preserved',
    `error_message`='Alba уже опубликована; повторная генерация отменена',
    `external_job_id`=NULL,
    `completed_at`=CURRENT_TIMESTAMP,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990'
);
--> statement-breakpoint
UPDATE `product_models`
SET `status`='published',
    `glb_url`='/catalog/alba-chair-hunyuan2mv-pbr.glb',
    `source_type`='generated_multiview',
    `validation_message`='Hunyuan3D-2mv: геометрия восстановлена по трём ракурсам; отдельные PBR-материалы VIC и матового металла; масштаб 62 × 86 × 90 см',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990'
);
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='failed',
    `error_code`='superseded',
    `error_message`='Заменено приоритетным чистым повтором Hunyuan3D-2.1',
    `external_job_id`=NULL,
    `completed_at`=CURRENT_TIMESTAMP,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-90315'
) AND `id`<>'hugge-hunyuan-retry-90315';
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='queued',
    `priority`=1000,
    `attempt`=0,
    `external_job_id`=NULL,
    `result_glb_url`=NULL,
    `error_code`=NULL,
    `error_message`='Приоритетный чистый повтор Hunyuan3D-2.1',
    `started_at`=NULL,
    `completed_at`=NULL,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-hunyuan-retry-90315';
--> statement-breakpoint
UPDATE `product_models`
SET `status`='queued',
    `glb_url`=NULL,
    `usdz_url`=NULL,
    `source_type`='website_photo',
    `validation_message`='Приоритетный повтор Hunyuan3D-2.1 по локально сохранённой фотографии',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-90315'
);
