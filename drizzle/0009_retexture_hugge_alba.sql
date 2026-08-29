INSERT OR IGNORE INTO `generation_jobs` (`id`,`shop_id`,`product_id`,`status`,`priority`,`attempt`,`max_attempts`,`source_images`,`error_code`,`error_message`)
SELECT 'hugge-alba-89990-textured',p.`shop_id`,p.`id`,'queued',110,0,3,p.`image_urls`,NULL,'Повторная генерация: обязательны геометрия и текстура'
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990';

UPDATE `product_models`
SET `status`='queued',`validation_message`='Создаём текстурированную модель; нетекстурированный результат не будет принят',`updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');
