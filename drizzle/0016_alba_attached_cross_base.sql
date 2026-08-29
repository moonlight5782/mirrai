UPDATE `product_models`
SET `glb_url`='/catalog/alba-chair-cross-base-v5.glb',
    `validation_message`='Обивка сохранена; все четыре конца перекрестного основания совмещены с нижней поверхностью сиденья, свисающих и отсоединенных труб нет',
    `quality_score`=98,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');

UPDATE `generation_jobs`
SET `result_glb_url`='/catalog/alba-chair-cross-base-v5.glb',
    `error_message`='Исправлен боковой ракурс: задние концы рамы подняты и совмещены с нижней поверхностью сиденья',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990-textured';
