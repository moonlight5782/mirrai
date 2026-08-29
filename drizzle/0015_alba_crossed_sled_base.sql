UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-cross-base-v4.glb',
    `validation_message`='Обивка исходной модели сохранена без изменений; поврежденные фрагменты ножек заменены цельным перекрестным основанием Alba из двух непрерывных стальных полозьев',
    `quality_score`=97,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `result_glb_url`='/catalog/alba-chair-cross-base-v4.glb',
    `error_message`='Исправлено основание: удалены разорванные реконструированные ножки, восстановлены две цельные перекрестные U-образные трубы',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
