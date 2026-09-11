-- Product metadata is aligned with the photographed HUGGE variants.
UPDATE `products`
SET `name`=CASE `sku`
      WHEN 'HUGGE-85345' THEN 'Стол письменный Actona Neptun, белый цвет'
      ELSE `name` END,
    `color`=CASE `sku`
      WHEN 'HUGGE-89990' THEN '#56585e'
      WHEN 'HUGGE-111240' THEN '#c7bbaa'
      WHEN 'HUGGE-109553' THEN '#cbbcac'
      WHEN 'HUGGE-107376' THEN '#cbbcac'
      WHEN 'HUGGE-100326' THEN '#3c3733'
      WHEN 'HUGGE-98600' THEN '#242321'
      WHEN 'HUGGE-100489' THEN '#1c1c1b'
      WHEN 'HUGGE-35348' THEN '#191919'
      WHEN 'HUGGE-85345' THEN '#f3f3f1'
      WHEN 'HUGGE-89099' THEN '#66686b'
      WHEN 'HUGGE-90157' THEN '#175438'
      WHEN 'HUGGE-71939' THEN '#181818'
      WHEN 'HUGGE-108501' THEN '#817a78'
      WHEN 'HUGGE-98232' THEN '#ded3bf'
      WHEN 'HUGGE-102923' THEN '#f2f2f0'
      WHEN 'HUGGE-90315' THEN '#171717'
      ELSE `color` END,
    `material`=CASE `sku`
      WHEN 'HUGGE-89990' THEN 'бархат VIC 28, матовый чёрный металл'
      WHEN 'HUGGE-111240' THEN 'бежевая ткань букле, чёрный металл'
      WHEN 'HUGGE-109553' THEN 'бежевая ткань, ножки из каучукового дерева (чёрные)'
      WHEN 'HUGGE-107376' THEN 'бежевая ткань, ножки из каучукового дерева (чёрные)'
      WHEN 'HUGGE-100326' THEN 'чёрная керамика и стекло, чёрная сталь'
      WHEN 'HUGGE-98600' THEN 'шпон чёрного дуба, каучуковое дерево'
      WHEN 'HUGGE-100489' THEN 'лакированный шпон чёрного дуба, каучуковое дерево'
      WHEN 'HUGGE-35348' THEN 'лакированный шпон чёрного дуба, каучуковое дерево'
      WHEN 'HUGGE-85345' THEN 'белый меламин, белый металл'
      WHEN 'HUGGE-89099' THEN 'серый велюр VIC, матовый чёрный металл'
      WHEN 'HUGGE-90157' THEN 'зелёный велюр VIC, матовый чёрный металл'
      WHEN 'HUGGE-71939' THEN 'чёрная экокожа, сталь с порошковым покрытием'
      WHEN 'HUGGE-108501' THEN 'ткань Basel светло-серо-коричневая, чёрная сталь'
      WHEN 'HUGGE-98232' THEN 'ткань Monza кремовая, матовый чёрный металл'
      WHEN 'HUGGE-102923' THEN 'белый MDF с PU-покрытием, матовый чёрный металл'
      WHEN 'HUGGE-90315' THEN 'чёрный MDF с PU-покрытием, матовый чёрный металл'
      ELSE `material` END,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `shop_id`=(SELECT `id` FROM `shops` WHERE `slug`='hugge-md');
--> statement-breakpoint
UPDATE `product_variants`
SET `color_name`=CASE `external_id`
      WHEN '89990-vic-28' THEN 'Тёмно-серый VIC 28'
      WHEN '90157-green' THEN 'Зелёный'
      WHEN '89099-grey' THEN 'Серый'
      WHEN '102923-white' THEN 'Белый'
      WHEN '90315-black' THEN 'Чёрный'
      ELSE `color_name` END,
    `color_hex`=CASE `external_id`
      WHEN '89990-vic-28' THEN '#56585e'
      WHEN '90157-green' THEN '#175438'
      WHEN '89099-grey' THEN '#66686b'
      WHEN '102923-white' THEN '#f2f2f0'
      WHEN '90315-black' THEN '#171717'
      ELSE `color_hex` END,
    `material`=CASE `external_id`
      WHEN '89990-vic-28' THEN 'бархат VIC 28, матовый чёрный металл'
      WHEN '90157-green' THEN 'зелёный велюр VIC, матовый чёрный металл'
      WHEN '89099-grey' THEN 'серый велюр VIC, матовый чёрный металл'
      WHEN '102923-white' THEN 'белый MDF с PU-покрытием, матовый чёрный металл'
      WHEN '90315-black' THEN 'чёрный MDF с PU-покрытием, матовый чёрный металл'
      ELSE `material` END,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md'
);
--> statement-breakpoint
-- Single-photo reconstruction did not preserve these products closely enough.
UPDATE `product_models`
SET `status`='review',
    `quality_score`=CASE
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-100326' THEN 68
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-107376' THEN 61
      ELSE 54 END,
    `validation_message`=CASE
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-100326' THEN 'Снято с публикации: фактура керамической столешницы недостаточно соответствует фото товара'
      WHEN (SELECT p.`sku` FROM `products` p WHERE p.`id`=`product_models`.`product_id`)='HUGGE-107376' THEN 'Снято с публикации: форма подлокотников и рисунок утяжки требуют повторной генерации'
      ELSE 'Снято с публикации: X-образный деревянный каркас не соответствует фото товара' END,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku` IN ('HUGGE-100326','HUGGE-107376','HUGGE-35348')
);
--> statement-breakpoint
-- Keep the accepted reconstructions published, but replace the blanket QA claim.
UPDATE `product_models`
SET `validation_message`='Визуальная QA: геометрия и цвет сопоставлены с фотографией товара; текстура встроена в GLB; масштаб задан по каталогу',
    `quality_score`=90,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `product_id` IN (
  SELECT p.`id` FROM `products` p INNER JOIN `shops` s ON s.`id`=p.`shop_id`
  WHERE s.`slug`='hugge-md' AND p.`sku` NOT IN ('HUGGE-100326','HUGGE-107376','HUGGE-35348')
) AND `status`='published';
--> statement-breakpoint
PRAGMA optimize;
