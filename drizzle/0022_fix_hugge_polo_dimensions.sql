UPDATE `products`
SET `width_cm`=40,
    `depth_cm`=40,
    `height_cm`=51,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `sku`='HUGGE-102923'
  AND `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
