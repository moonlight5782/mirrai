UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-hunyuan2mv-pbr.glb',
    `status`='published',
    `source_type`='generated_multiview',
    `validation_message`='Hunyuan3D-2mv: геометрия восстановлена по трём ракурсам; отдельные PBR-материалы VIC и матового металла; масштаб 62 × 86 × 90 см',
    `quality_score`=99,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `status`='review',
    `result_glb_url`='/catalog/alba-chair-hunyuan2mv-pbr.glb',
    `error_code`=NULL,
    `error_message`='Многовидовая геометрия проверена с четырёх сторон, облегчена до 184 054 граней и опубликована после PBR-подготовки',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
