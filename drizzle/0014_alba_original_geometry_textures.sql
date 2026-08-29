UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-original-textured-v3.glb',
    `validation_message`='Исходная геометрия сохранена полностью: 402264 грани; добавлены только UV, нормали и PBR-материалы',
    `quality_score`=95,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `result_glb_url`='/catalog/alba-chair-original-textured-v3.glb',
    `error_message`='Texture-only: исходные вершины и грани сохранены, геометрия не регенерировалась',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
