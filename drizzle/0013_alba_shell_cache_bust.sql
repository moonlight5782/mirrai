UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-repaired-pbr-v2.glb',
    `validation_message`='Цельная оболочка проверена с бокового и нижнего ракурсов; добавлены PBR-велюр и матовый металлический каркас',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `result_glb_url`='/catalog/alba-chair-repaired-pbr-v2.glb',
    `error_message`='Проверка боковой и нижней оболочки пройдена; URL обновлён для сброса кэша',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
