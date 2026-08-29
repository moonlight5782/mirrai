UPDATE `generation_jobs`
SET `status`='queued',`attempt`=0,`max_attempts`=3,`external_job_id`=NULL,`error_code`=NULL,
    `error_message`='Повторная генерация через сессионную очередь Stable Fast 3D',
    `started_at`=NULL,`updated_at`=CURRENT_TIMESTAMP,`completed_at`=NULL
WHERE `id`='hugge-alba-89990-textured';

UPDATE `product_models`
SET `status`='queued',`validation_message`='Создаём текстурированную модель Stable Fast 3D',`updated_at`=CURRENT_TIMESTAMP
WHERE `product_id`=(SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku`='HUGGE-89990');
