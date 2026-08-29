UPDATE `product_models`
SET `status`='published',
    `glb_url`='/catalog/alba-chair-repaired-pbr.glb',
    `source_type`='generated',
    `validation_message`='Геометрия очищена и восстановлена; добавлены PBR-велюр и матовый металлический каркас',
    `quality_score`=92,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `status`='completed',
    `result_glb_url`='/catalog/alba-chair-repaired-pbr.glb',
    `error_code`=NULL,
    `error_message`='Сетка проверена; паразитная геометрия удалена; материалы и чистый каркас добавлены',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
