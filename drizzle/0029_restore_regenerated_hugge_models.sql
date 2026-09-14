-- These three single-photo reconstructions were regenerated with TRELLIS.2 Q8
-- and manually compared with the corresponding HUGGE catalog photographs.
UPDATE `product_models`
SET `glb_url`='/catalog/hugge-' || (
      SELECT p.`external_id` FROM `products` p WHERE p.`id`=`product_models`.`product_id`
    ) || '-trellis2-q8-pbr.glb',
    `status`='published',
    `source_type`='generated_trellis2_q8',
    `quality_score`=CASE
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-100326' THEN 92
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-107376' THEN 91
      ELSE 92 END,
    `validation_message`=CASE
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-100326' THEN 'Повторная QA: форма стола и тёмная керамическая фактура сопоставлены с фото; размер 240 × 97 × 75 см встроен в GLB'
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-107376' THEN 'Повторная QA: силуэт, подлокотники, утяжка и бежевая ткань сопоставлены с фото; размер 191 × 84 × 78 см встроен в GLB'
      ELSE 'Повторная QA: X-образный каркас, перемычки и чёрная отделка сопоставлены с фото; размер 120 × 60 × 75 см встроен в GLB' END,
    `version`=`version`+1,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-100326','HUGGE-107376','HUGGE-35348')
);
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='review',
    `result_glb_url`='/catalog/hugge-' || (
      SELECT p.`external_id` FROM `products` p WHERE p.`id`=`generation_jobs`.`product_id`
    ) || '-trellis2-q8-pbr.glb',
    `external_job_id`=NULL,
    `error_code`=NULL,
    `error_message`='TRELLIS.2 Q8: повторная генерация прошла визуальную QA и опубликована',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-100326','HUGGE-107376','HUGGE-35348')
) AND `status` IN ('blocked','queued','submitting','processing','review','ready','failed');
--> statement-breakpoint
PRAGMA optimize;
