UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-trellis2-q8-pbr.glb',
    `status`='published',
    `source_type`='generated_trellis2_q8',
    `validation_message`='TRELLIS.2 Q8: цельная геометрия проверена в круговом превью; 277 718 граней; встроенные PBR-текстуры 2048 px; масштаб нормализован до 64 × 86 × 90 см для каталога 62 × 86 × 90 см',
    `quality_score`=98,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990'
);
--> statement-breakpoint
UPDATE `product_variants`
SET `glb_url`='/catalog/alba-chair-trellis2-q8-pbr.glb',
    `model_status`='published',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990'
);
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='review',
    `result_glb_url`='/catalog/alba-chair-trellis2-q8-pbr.glb',
    `error_code`=NULL,
    `error_message`='TRELLIS.2 Q8 GLB получен, PBR и круговая геометрия проверены, опубликован как модель Alba',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
