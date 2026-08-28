UPDATE `products`
SET `image_urls`='["https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-1.jpg","https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-2.jpg","https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-3.jpg"]',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md') AND `sku`='HUGGE-89990';
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='queued',
    `source_images`='["https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-1.jpg","https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-2.jpg","https://mirrai-try-on.moonlight-5782.chatgpt.site/catalog-sources/hugge-md/alba-89990-3.jpg"]',
    `error_code`=NULL,
    `error_message`='Фотографии сохранены в MIRRAI; товар готов к генерации',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990' AND `status`='blocked';
