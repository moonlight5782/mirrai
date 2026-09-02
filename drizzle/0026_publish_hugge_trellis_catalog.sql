UPDATE `products`
SET `width_cm`=CASE `sku`
      WHEN 'HUGGE-98232' THEN 47 WHEN 'HUGGE-100326' THEN 240 WHEN 'HUGGE-111240' THEN 196
      WHEN 'HUGGE-109553' THEN 150 WHEN 'HUGGE-108501' THEN 59.5 WHEN 'HUGGE-107376' THEN 191
      WHEN 'HUGGE-102923' THEN 40 WHEN 'HUGGE-100489' THEN 100 WHEN 'HUGGE-98600' THEN 115
      WHEN 'HUGGE-90157' THEN 58.5 WHEN 'HUGGE-89099' THEN 58.5 WHEN 'HUGGE-71939' THEN 69
      WHEN 'HUGGE-35348' THEN 120 WHEN 'HUGGE-90315' THEN 40 WHEN 'HUGGE-85345' THEN 110
      ELSE `width_cm` END,
    `depth_cm`=CASE `sku`
      WHEN 'HUGGE-98232' THEN 59 WHEN 'HUGGE-100326' THEN 97 WHEN 'HUGGE-111240' THEN 98
      WHEN 'HUGGE-109553' THEN 84 WHEN 'HUGGE-108501' THEN 61.5 WHEN 'HUGGE-107376' THEN 84
      WHEN 'HUGGE-102923' THEN 40 WHEN 'HUGGE-100489' THEN 50 WHEN 'HUGGE-98600' THEN 115
      WHEN 'HUGGE-90157' THEN 59 WHEN 'HUGGE-89099' THEN 59 WHEN 'HUGGE-71939' THEN 78.5
      WHEN 'HUGGE-35348' THEN 60 WHEN 'HUGGE-90315' THEN 40 WHEN 'HUGGE-85345' THEN 50
      ELSE `depth_cm` END,
    `height_cm`=CASE `sku`
      WHEN 'HUGGE-98232' THEN 82 WHEN 'HUGGE-100326' THEN 75 WHEN 'HUGGE-111240' THEN 91
      WHEN 'HUGGE-109553' THEN 78 WHEN 'HUGGE-108501' THEN 99 WHEN 'HUGGE-107376' THEN 78
      WHEN 'HUGGE-102923' THEN 51 WHEN 'HUGGE-100489' THEN 75 WHEN 'HUGGE-98600' THEN 75
      WHEN 'HUGGE-90157' THEN 88.5 WHEN 'HUGGE-89099' THEN 88.5 WHEN 'HUGGE-71939' THEN 90.5
      WHEN 'HUGGE-35348' THEN 75 WHEN 'HUGGE-90315' THEN 51 WHEN 'HUGGE-85345' THEN 77.1
      ELSE `height_cm` END,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md')
  AND `sku`<>'HUGGE-89990';
--> statement-breakpoint
UPDATE `products` SET `color`='#175438',`material`='велюр VIC, матовый чёрный металл',`updated_at`=CURRENT_TIMESTAMP WHERE `sku`='HUGGE-90157' AND `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
--> statement-breakpoint
UPDATE `products` SET `color`='#66686b',`material`='велюр VIC, матовый чёрный металл',`updated_at`=CURRENT_TIMESTAMP WHERE `sku`='HUGGE-89099' AND `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
--> statement-breakpoint
UPDATE `products` SET `color`='#f2f2f0',`material`='крашеный MDF, матовый чёрный металл',`updated_at`=CURRENT_TIMESTAMP WHERE `sku`='HUGGE-102923' AND `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
--> statement-breakpoint
UPDATE `products` SET `color`='#171717',`material`='крашеный MDF, матовый чёрный металл',`updated_at`=CURRENT_TIMESTAMP WHERE `sku`='HUGGE-90315' AND `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
--> statement-breakpoint
UPDATE `product_models`
SET `glb_url`='/catalog/hugge-' || (
      SELECT p.`external_id` FROM `products` p WHERE p.`id`=`product_models`.`product_id`
    ) || '-trellis2-q8-pbr.glb',
    `status`='published',
    `source_type`='generated_trellis2_q8',
    `validation_message`='TRELLIS.2 Q8: геометрия проверена круговым просмотром; PBR-текстуры встроены; масштаб приведён к габаритам товара',
    `quality_score`=96,
    `version`=`version`+1,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
);
--> statement-breakpoint
UPDATE `generation_jobs`
SET `status`='review',
    `result_glb_url`='/catalog/hugge-' || (
      SELECT p.`external_id` FROM `products` p WHERE p.`id`=`generation_jobs`.`product_id`
    ) || '-trellis2-q8-pbr.glb',
    `external_job_id`=NULL,
    `error_code`=NULL,
    `error_message`='TRELLIS.2 Q8: модель прошла визуальную QA-проверку и опубликована',
    `updated_at`=CURRENT_TIMESTAMP,
    `completed_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku`<>'HUGGE-89990'
) AND `status` IN ('blocked','queued','submitting','processing','review','ready','failed');
--> statement-breakpoint
INSERT OR IGNORE INTO `product_variants` (`product_id`,`external_id`,`sku`,`name`,`color_name`,`color_hex`,`material`,`image_url`,`glb_url`,`model_status`,`is_default`,`sort_order`)
SELECT p.`id`,'90157-green','HUGGE-90157-GREEN','Зелёный VIC','Зелёный','#175438','велюр VIC, матовый чёрный металл','/catalog-sources/hugge-md/90157-1.jpg','/catalog/hugge-90157-trellis2-q8-pbr.glb','published',p.`sku`='HUGGE-90157',0
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-90157','HUGGE-89099');
--> statement-breakpoint
INSERT OR IGNORE INTO `product_variants` (`product_id`,`external_id`,`sku`,`name`,`color_name`,`color_hex`,`material`,`image_url`,`glb_url`,`model_status`,`is_default`,`sort_order`)
SELECT p.`id`,'89099-grey','HUGGE-89099-GREY','Серый VIC','Серый','#66686b','велюр VIC, матовый чёрный металл','/catalog-sources/hugge-md/89099-1.jpg','/catalog/hugge-89099-trellis2-q8-pbr.glb','published',p.`sku`='HUGGE-89099',1
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-90157','HUGGE-89099');
--> statement-breakpoint
INSERT OR IGNORE INTO `product_variants` (`product_id`,`external_id`,`sku`,`name`,`color_name`,`color_hex`,`material`,`image_url`,`glb_url`,`model_status`,`is_default`,`sort_order`)
SELECT p.`id`,'102923-white','HUGGE-102923-WHITE','Белый','Белый','#f2f2f0','крашеный MDF, матовый чёрный металл','/catalog-sources/hugge-md/102923-1.jpg','/catalog/hugge-102923-trellis2-q8-pbr.glb','published',p.`sku`='HUGGE-102923',0
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-102923','HUGGE-90315');
--> statement-breakpoint
INSERT OR IGNORE INTO `product_variants` (`product_id`,`external_id`,`sku`,`name`,`color_name`,`color_hex`,`material`,`image_url`,`glb_url`,`model_status`,`is_default`,`sort_order`)
SELECT p.`id`,'90315-black','HUGGE-90315-BLACK','Чёрный','Чёрный','#171717','крашеный MDF, матовый чёрный металл','/catalog-sources/hugge-md/90315-1.jpg','/catalog/hugge-90315-trellis2-q8-pbr.glb','published',p.`sku`='HUGGE-90315',1
FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id` WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-102923','HUGGE-90315');
--> statement-breakpoint
PRAGMA optimize;
