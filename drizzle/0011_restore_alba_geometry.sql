UPDATE `product_models`
SET `status`='review',
    `glb_url`='/api/assets/fbb61c25-5942-4deb-a892-9e241f436279',
    `source_type`='generated',
    `validation_message`='Геометрия восстановлена; требуется texture-only обработка без изменения формы',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `status`='review',
    `result_glb_url`='/api/assets/fbb61c25-5942-4deb-a892-9e241f436279',
    `error_code`=NULL,
    `error_message`='Сохранена прежняя геометрия; ожидается отдельное текстурирование',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
