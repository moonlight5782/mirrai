import { accountRows } from "./translations-account.mjs";
import { merchantRows } from "./translations-merchant.mjs";
import { catalogRows } from "./translations-catalog.mjs";
/** Russian source text | Romanian | English. Keep all three columns on each line. */
const rows = `
Демонстрационный магазин MIRRAI|Magazin demonstrativ MIRRAI|MIRRAI demo store
МЕБЕЛЬ · В ДОПОЛНЕННОЙ РЕАЛЬНОСТИ|MOBILIER · ÎN REALITATE AUGMENTATĂ|FURNITURE · IN AUGMENTED REALITY
Демонстрационный каталог. Цены приведены для примера; покупки не оформляются.|Catalog demonstrativ. Prețurile sunt orientative; nu se pot plasa comenzi.|Demo catalogue. Prices are illustrative; purchases are not available.
Это демонстрация: заказ не создан и оплата не требуется.|Aceasta este o demonstrație: nu s-a creat nicio comandă și nu este necesară plata.|This is a demo: no order was created and no payment is required.
Демонстрационная корзина. Покупки и оплата недоступны.|Coș demonstrativ. Cumpărăturile și plata nu sunt disponibile.|Demo cart. Purchases and payments are unavailable.
Демонстрация технологии MIRRAI. Не является действующим интернет-магазином.|Demonstrație a tehnologiei MIRRAI. Nu este un magazin online activ.|MIRRAI technology demo. This is not an operating online store.
Демонстрационный снимок каталога. Актуальные цены — на сайте магазина.|Copie demonstrativă a catalogului. Prețurile actuale sunt pe site-ul magazinului.|Demo catalogue snapshot. Check the store website for current prices.
Язык|Limbă|Language
Язык интерфейса|Limba interfeței|Interface language
Каталог|Catalog|Catalogue
Для магазинов|Pentru magazine|For stores
На главную|Pagina principală|Home
← Назад|← Înapoi|← Back
Как работает|Cum funcționează|How it works
Кабинет|Contul meu|Dashboard
Подключить магазин|Conectează magazinul|Connect your store
Кабинет магазина|Contul magazinului|Store dashboard
Мебель — в вашем пространстве.|Mobilier — în spațiul tău.|Furniture — in your space.
AR ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ|AR PENTRU MAGAZINE DE MOBILĂ|AR FOR FURNITURE STORES
Мебель —|Mobilierul —|Furniture —
уже у вас.|deja la tine acasă.|already at home.
Покупатель открывает товар в реальном масштабе прямо из карточки магазина — с адаптацией света, оттенков и контактных теней.|Clientul vede produsul la scară reală, direct din pagina magazinului, cu adaptarea luminii, nuanțelor și umbrelor.|Shoppers view a product at real scale straight from its store page, with adaptive lighting, colour and contact shadows.
Посмотреть кресло у себя|Vezi fotoliul la tine acasă|View the armchair in your room
точный масштаб|scară exactă|accurate scale
приложений|aplicații de instalat|apps to install
Открыть интерактивное AR-превью кресла|Deschide previzualizarea AR a fotoliului|Open the interactive armchair preview
84 см|84 cm|84 cm
76 см|76 cm|76 cm
Кресло Cloud · Букле|Fotoliu Cloud · Bouclé|Cloud armchair · Bouclé
Открыть AR ↗|Deschide AR ↗|Open AR ↗
Из карточки товара — в комнату|Din pagina produsului — în cameră|From product page to your room
Не представляйте.|Nu doar îți imagina.|Don't just imagine it.
Поставьте и посмотрите.|Așază și privește.|Place it and see.
Нажать в магазине|Apasă în magazin|Tap in the store
Кнопка MIRRAI находится рядом с добавлением товара в корзину.|Butonul MIRRAI se află lângă butonul de adăugare în coș.|The MIRRAI button sits next to Add to cart.
Навести на пол|Îndreaptă camera spre podea|Point at the floor
Телефон определяет поверхность и реальный масштаб помещения.|Telefonul detectează suprafața și scara reală a camerei.|Your phone detects the surface and the room's real scale.
Принять решение|Ia o decizie|Make a decision
Материалы, свет и тени помогают оценить товар до покупки.|Materialele, lumina și umbrele te ajută să evaluezi produsul înainte de cumpărare.|Materials, light and shadows help you assess the product before buying.
Демонстрационный каталог|Catalog demonstrativ|Demo catalogue
Четыре товара.|Patru produse.|Four products.
Один клик до комнаты.|Un clic până în cameră.|One tap into your room.
Каждая карточка хранит модель, материалы и реальные габариты. В магазине эти данные автоматически приходят из товарного каталога.|Fiecare fișă include modelul, materialele și dimensiunile reale. Magazinul preia automat datele din catalogul de produse.|Each product includes its model, materials and real dimensions, supplied automatically from the store catalogue.
Сотни товаров.|Sute de produse.|Hundreds of products.
Без сотен ручных интеграций.|Fără sute de integrări manuale.|Without hundreds of manual integrations.
Посмотреть виджет в магазине|Vezi widgetul în magazin|See the widget in a store
Подключить свой магазин →|Conectează magazinul tău →|Connect your store →
Импорт каталога|Importul catalogului|Catalogue import
SKU, размеры, варианты и готовые 3D-файлы|SKU, dimensiuni, variante și fișiere 3D existente|SKUs, dimensions, variants and existing 3D files
Подготовка моделей|Pregătirea modelelor|Model preparation
GLB + USDZ, PBR-материалы и автоматический контроль|GLB + USDZ, materiale PBR și verificări automate|GLB + USDZ, PBR materials and automated checks
Виджет и аналитика|Widget și analiză|Widget and analytics
Запуски AR, размещения и путь до корзины|Porniri AR, plasări și parcursul până la coș|AR launches, placements and the path to cart
Кресла|Fotolii|Armchairs
Диваны|Canapele|Sofas
Стулья|Scaune|Chairs
Столы|Mese|Tables
Тумбы|Noptiere|Side cabinets
Все|Toate|All
Цвет|Culoare|Colour
Товар|Produs|Product
Подготавливаем точный масштаб…|Pregătim scara exactă…|Preparing accurate scale…
Загружаем выбранную модель…|Încărcăm modelul selectat…|Loading the selected model…
Проверяем размеры модели перед запуском AR…|Verificăm dimensiunile modelului înainte de AR…|Checking model dimensions before starting AR…
Не удалось проверить физические размеры модели. AR заблокирован.|Nu am putut verifica dimensiunile fizice. AR este blocat.|Could not verify physical dimensions. AR is blocked.
Размер модели не прошёл проверку 1:1. AR заблокирован.|Dimensiunile nu au trecut verificarea 1:1. AR este blocat.|Model dimensions failed the 1:1 check. AR is blocked.
основной цвет|culoarea principală|default colour
Модель не загрузилась. Проверьте GLB товара.|Modelul nu s-a încărcat. Verifică fișierul GLB.|The model did not load. Check the product GLB.
Предмет размещён в вашем пространстве|Obiectul a fost plasat în spațiul tău|The item has been placed in your space
Не удалось открыть камеру в этом браузере.|Camera nu a putut fi deschisă în acest browser.|Could not open the camera in this browser.
Медленно направляйте камеру на свободный участок пола…|Îndreaptă încet camera spre o zonă liberă a podelei…|Slowly point the camera at a clear floor area…
Проверяем доступность товара. Попробуйте через несколько секунд.|Verificăm disponibilitatea. Încearcă din nou peste câteva secunde.|Checking availability. Try again in a few seconds.
AR заблокирован: модель не прошла проверку размеров.|AR este blocat: dimensiunile modelului nu au fost validate.|AR is blocked: the model failed dimension checks.
Дождитесь проверки масштаба 1:1.|Așteaptă verificarea scării 1:1.|Wait for the 1:1 scale check.
Запускаем камеру и поиск поверхности…|Pornim camera și detectarea suprafeței…|Starting the camera and surface detection…
Камера не открылась. 3D-просмотр остаётся доступен.|Camera nu s-a deschis. Vizualizarea 3D rămâne disponibilă.|The camera did not open. 3D viewing is still available.
Нажмите и удерживайте ссылку, чтобы скопировать её.|Ține apăsat pe link pentru a-l copia.|Press and hold the link to copy it.
GLB распознан. Размер применяется из полей выше.|GLB recunoscut. Se aplică dimensiunile din câmpurile de mai sus.|GLB recognised. Dimensions are taken from the fields above.
Модель готова — проверьте масштаб и откройте AR|Modelul este gata — verifică scara și deschide AR|Model ready — check the scale and open AR
На публичной странице принимается только GLB. Фотографии загружаются в защищённом кабинете магазина.|Pagina publică acceptă doar GLB. Fotografiile se încarcă în contul securizat al magazinului.|The public page accepts GLB only. Upload photos in the secure store dashboard.
Вы прекрасно выглядите в любой одежде.|Arăți minunat în orice ținută.|You look great in any outfit.
А ваша мебель — в любом интерьере.|Iar mobilierul tău — în orice interior.|And your furniture — in any interior.
Не удалось загрузить модель|Modelul nu a putut fi încărcat|Could not load the model
Примерка временно недоступна|Vizualizarea AR este temporar indisponibilă|AR viewing is temporarily unavailable
Готовим просмотр…|Pregătim vizualizarea…|Preparing the viewer…
Проверяем доступность…|Verificăm disponibilitatea…|Checking availability…
Посмотреть у себя|Vezi la tine acasă|View in your room
Этот браузер не открыл камеру.|Acest browser nu a deschis camera.|This browser did not open the camera.
Наведите камеру на пол · размер 1:1|Îndreaptă camera spre podea · scară 1:1|Point at the floor · scale 1:1
Скопировать ссылку|Copiază linkul|Copy link
Открыть просмотр и повторить|Deschide vizualizarea și reîncearcă|Open viewer and retry
Посмотреть в 3D|Vezi în 3D|View in 3D
AR-просмотр · реальный масштаб|Vizualizare AR · scară reală|AR viewer · real scale
МАСШТАБ 1:1 ПРОВЕРЕН|SCARĂ 1:1 VERIFICATĂ|1:1 SCALE VERIFIED
AR НЕДОСТУПЕН|AR INDISPONIBIL|AR UNAVAILABLE
ПРОВЕРЯЕМ МАСШТАБ|VERIFICĂM SCARA|CHECKING SCALE
модели|modele|models
Проверяем 1:1|Verificăm 1:1|Checking 1:1
Вращайте одним пальцем · масштабируйте двумя|Rotește cu un deget · mărește cu două|Rotate with one finger · zoom with two
Пользовательская модель|Model personalizat|Custom model
Цвет на сайте магазина|Culoare pe site-ul magazinului|Colour on the store website
Доступные цвета товара|Culori disponibile|Available product colours
3D готовится|3D în pregătire|3D in preparation
В AR открывается отдельная модель выбранного магазином варианта, а не приблизительная перекраска.|AR deschide modelul separat al variantei selectate, nu o recolorare aproximativă.|AR opens the selected variant's own model, not an approximate recolouring.
Габариты · Ш × Г × В|Dimensiuni · L × A × H|Dimensions · W × D × H
Модель зафиксирована в указанном масштабе. Покупатель не может случайно изменить размер в AR.|Modelul este fixat la scara indicată. Clientul nu poate modifica accidental dimensiunea în AR.|The model is locked to the stated scale. Shoppers cannot accidentally resize it in AR.
Освещение превью|Iluminarea previzualizării|Preview lighting
Экспозиция 3D-превью|Expunerea previzualizării 3D|3D preview exposure
В системном AR свет и цвет адаптируются камерой устройства автоматически.|În AR nativ, lumina și culoarea sunt adaptate automat de camera dispozitivului.|In native AR, the device camera adapts lighting and colour automatically.
Локальная проверка готовой модели|Verificarea locală a modelului|Local model check
Ш|L|W
Г|A|D
В|H|H
, см|, cm|, cm
Выбрать готовый GLB|Selectează un GLB existent|Choose an existing GLB
Фотографии товаров загружаются в кабинете магазина, где MIRRAI безопасно отправляет их в очередь генерации.|Fotografiile produselor se încarcă în contul magazinului, de unde MIRRAI le trimite securizat în coada de generare.|Upload product photos in the store dashboard, where MIRRAI securely submits them to the generation queue.
Модель временно недоступна|Model temporar indisponibil|Model temporarily unavailable
Посмотрите у себя с телефона|Vezi la tine acasă de pe telefon|View in your room using your phone
Наведите камеру телефона на QR-код и откройте ссылку.|Scanează codul QR cu telefonul și deschide linkul.|Scan the QR code with your phone and open the link.
QR-код для открытия этого товара на телефоне|Cod QR pentru deschiderea produsului pe telefon|QR code to open this product on your phone
Откройте в|Deschide în|Open in
В меню приложения выберите «Открыть в браузере» или скопируйте ссылку. Если телефон не поддерживает AR, вы можете продолжить вращать модель здесь.|În meniul aplicației alege „Deschide în browser” sau copiază linkul. Dacă telefonul nu acceptă AR, poți roti modelul aici.|Choose “Open in browser” from the app menu or copy the link. If your phone does not support AR, you can still rotate the model here.
Открыть отдельно|Deschide separat|Open separately
Разрешите доступ к камере и медленно наведите её на свободный участок пола. MIRRAI не сохраняет изображение комнаты.|Permite accesul la cameră și îndreapt-o încet spre podea. MIRRAI nu salvează imaginile camerei tale.|Allow camera access and slowly point it at a clear floor area. MIRRAI does not save images of your room.
3D на проверке|3D în verificare|3D under review
3D готова|3D gata|3D ready
AR доступен|AR disponibil|AR available
Создаётся|Se creează|Creating
В очереди|În coadă|Queued
Нужна повторная генерация|Necesită regenerare|Regeneration needed
Размеры уточняются|Dimensiuni în curs de confirmare|Dimensions to be confirmed
Выберите товар с готовой 3D-моделью|Alege un produs cu model 3D disponibil|Choose a product with a ready 3D model
Каталог временно недоступен|Catalog temporar indisponibil|Catalogue temporarily unavailable
Покупатель открыл виджет|Clientul a deschis widgetul|Shopper opened the widget
3D-модель загружена|Modelul 3D a fost încărcat|3D model loaded
Покупатель запустил AR|Clientul a pornit AR|Shopper started AR
Товар размещён в комнате|Produs plasat în cameră|Product placed in the room
Материал уточняется|Material în curs de confirmare|Material to be confirmed
AR-виджет готов|Widget AR gata|AR widget ready
Товар добавлен в корзину|Produs adăugat în coș|Product added to cart
Рабочая демонстрация HUGGE × MIRRAI|Demonstrație funcțională HUGGE × MIRRAI|Working HUGGE × MIRRAI demo
Закрыть меню|Închide meniul|Close menu
Открыть меню|Deschide meniul|Open menu
Открыть поиск|Deschide căutarea|Open search
Открыть избранное|Deschide favoritele|Open favourites
Открыть корзину|Deschide coșul|Open cart
Корзина|Coș|Cart
Избранное (|Favorite (|Favourites (
Корзина (|Coș (|Cart (
КАТАЛОГ HUGGE · В ДОПОЛНЕННОЙ РЕАЛЬНОСТИ|CATALOG HUGGE · ÎN REALITATE AUGMENTATĂ|HUGGE CATALOGUE · IN AUGMENTED REALITY
Мебель, которую|Mobilier pe care|Furniture you can
можно увидеть дома|îl poți vedea acasă|see at home
Рассмотрите текстурированную 3D-модель со всех сторон и поставьте её в свой интерьер в реальном масштабе.|Examinează modelul 3D texturat din toate unghiurile și așază-l în interiorul tău la scară reală.|Explore the textured 3D model from every angle and place it in your interior at real scale.
Попробовать 3D|Încearcă 3D|Try 3D
Смотреть каталог|Vezi catalogul|Browse catalogue
из|din|of
товаров готовы к просмотру|produse pregătite pentru vizualizare|products ready to view
Кресло Alba|Fotoliu Alba|Alba armchair
Кресло Alba · HUGGE-89990|Fotoliu Alba · HUGGE-89990|Alba armchair · HUGGE-89990
товаров готовы в AR|produse disponibile în AR|products ready for AR
Текстурированные 3D-модели|Modele 3D texturate|Textured 3D models
Реальный масштаб|Scară reală|Real scale
iPhone и Android|iPhone și Android|iPhone and Android
Как работает дополненная реальность|Cum funcționează realitatea augmentată|How augmented reality works
КАК ЭТО РАБОТАЕТ|CUM FUNCȚIONEAZĂ|HOW IT WORKS
От карточки товара — в вашу комнату|Din pagina produsului — în camera ta|From the product page to your room
Выберите товар|Alege produsul|Choose a product
Каталог и варианты цвета синхронизированы с магазином.|Catalogul și variantele de culoare sunt sincronizate cu magazinul.|The catalogue and colour variants are synchronised with the store.
Откройте 3D|Deschide 3D|Open 3D
Вращайте модель и рассмотрите материалы со всех сторон.|Rotește modelul și examinează materialele din toate unghiurile.|Rotate the model and examine its materials from every angle.
Поставьте дома|Așază acasă|Place it at home
Камера покажет мебель в интерьере в масштабе 1:1.|Camera va arăta mobilierul în interior la scara 1:1.|The camera shows the furniture in your interior at 1:1 scale.
ВАШ ВЫБОР|ALEGEREA TA|YOUR SELECTION
КАТАЛОГ HUGGE|CATALOG HUGGE|HUGGE CATALOGUE
Избранное|Favorite|Favourites
Мебель для дома|Mobilier pentru casă|Furniture for your home
товаров|produse|products
Поиск|Căutare|Search
Название или артикул|Denumire sau SKU|Name or SKU
AR ДОСТУПЕН|AR DISPONIBIL|AR AVAILABLE
3D ГОТОВИТСЯ|3D ÎN PREGĂTIRE|3D IN PREPARATION
Цена по запросу|Preț la cerere|Price on request
Добавляйте товары сердечком — они появятся здесь.|Adaugă produse la favorite — vor apărea aici.|Tap the heart on products to see them here.
По вашему запросу товаров не найдено.|Nu s-au găsit produse pentru această căutare.|No products match your search.
← Вернуться в каталог|← Înapoi la catalog|← Back to catalogue
Фотография готовится|Fotografie în pregătire|Photo in preparation
Предыдущая фотография|Fotografia precedentă|Previous photo
Следующая фотография|Fotografia următoare|Next photo
Фотографии товара|Fotografii ale produsului|Product photos
В наличии у поставщика|Disponibil la furnizor|Available from supplier
Материал|Material|Material
Уточняется|În curs de confirmare|To be confirmed
Габариты|Dimensiuni|Dimensions
3D-модель|Model 3D|3D model
Геометрия, текстуры и масштаб проверены|Geometria, texturile și scara au fost verificate|Geometry, textures and scale checked
ПРИМЕРКА В ИНТЕРЬЕРЕ|VIZUALIZARE ÎN INTERIOR|VIEW IN YOUR INTERIOR
Посмотрите товар у себя|Vezi produsul la tine acasă|View the product in your room
На телефоне нажмите «Посмотреть у себя» и наведите камеру на пол. На компьютере можно вращать 3D-модель и открыть её на телефоне по QR-коду.|Pe telefon apasă „Vezi la tine acasă” și îndreaptă camera spre podea. Pe calculator poți roti modelul și îl poți deschide pe telefon prin codul QR.|On your phone, tap “View in your room” and point at the floor. On a computer, rotate the model or scan the QR code to open it on your phone.
AR появится после повторной проверки 3D-модели|AR va fi disponibil după reverificarea modelului|AR will be available after the model is reviewed again
Добавить в корзину|Adaugă în coș|Add to cart
Модель соответствует выбранному товару и цвету. В AR размер фиксируется по габаритам из каталога.|Modelul corespunde produsului și culorii selectate. Dimensiunea AR este fixată conform catalogului.|The model matches the selected product and colour. AR size is locked to catalogue dimensions.
Эта модель не показывается покупателю, пока геометрия и текстуры не пройдут визуальную проверку.|Modelul nu este afișat clienților până la verificarea vizuală a geometriei și texturilor.|This model is hidden from shoppers until its geometry and textures pass visual review.
О товаре|Despre produs|About the product
Оригинальный товар HUGGE из коллекции Actona. Фотографии, цена и характеристики синхронизированы с карточкой магазина; 3D-модель проходит отдельную проверку геометрии, материалов и масштаба.|Produs original HUGGE din colecția Actona. Fotografiile, prețul și caracteristicile sunt sincronizate cu magazinul; modelul 3D este verificat separat.|An original HUGGE product from the Actona collection. Photos, price and specifications are synchronised with the store; the 3D model is checked separately.
Карточка на HUGGE ↗|Produsul pe HUGGE ↗|Product on HUGGE ↗
Закрыть фотографию|Închide fotografia|Close photo
Закрыть ×|Închide ×|Close ×
Закрыть корзину|Închide coșul|Close cart
ВАШ ЗАКАЗ|COMANDA TA|YOUR ORDER
Удалить|Elimină|Remove
Итого|Total|Total
В рабочей интеграции покупатель перейдёт в обычное оформление заказа HUGGE.|În integrarea reală, clientul continuă la finalizarea comenzii HUGGE.|In a live integration, shoppers proceed to the regular HUGGE checkout.
Перейти к оформлению|Continuă spre finalizare|Proceed to checkout
Демонстрационная корзина. На сайте HUGGE используется штатное оформление заказа.|Coș demonstrativ. Site-ul HUGGE folosește propriul proces de comandă.|Demo cart. HUGGE uses its own checkout process.
Корзина пуста|Coșul este gol|Your cart is empty
Добавьте мебель из каталога, чтобы продолжить.|Adaugă mobilier din catalog pentru a continua.|Add furniture from the catalogue to continue.
Один каталог.|Un singur catalog.|One catalogue.
Один AR-виджет.|Un singur widget AR.|One AR widget.
Товары связываются по SKU. Магазин управляет каталогом как обычно, а MIRRAI автоматически показывает кнопку примерки только там, где готова и проверена соответствующая 3D-модель.|Produsele sunt asociate după SKU. Magazinul gestionează catalogul ca de obicei, iar MIRRAI afișează butonul AR doar pentru modelele pregătite și verificate.|Products are matched by SKU. The store manages its catalogue as usual; MIRRAI shows the AR button only for ready, reviewed models.
SKU → фото → GLB → проверка → AR|SKU → foto → GLB → verificare → AR|SKU → photo → GLB → review → AR
Концепт демонстрирует интеграцию MIRRAI и не является официальным сайтом магазина.|Acesta este un demo al integrării MIRRAI, nu site-ul oficial al magazinului.|This concept demonstrates MIRRAI integration and is not the store's official website.
Технология MIRRAI ↗|Tehnologia MIRRAI ↗|Powered by MIRRAI ↗
В меню приложения выберите «Открыть в {browser}». Если такого пункта нет, скопируйте ссылку.|În meniul aplicației alege „Deschide în {browser}”. Dacă opțiunea lipsește, copiază linkul.|Choose “Open in {browser}” from the app menu. If unavailable, copy the link.
Ссылка скопирована. Вставьте её в {browser}.|Link copiat. Deschide-l în {browser}.|Link copied. Paste it into {browser}.
Загружаем цвет «{color}»…|Încărcăm culoarea „{color}”…|Loading colour “{color}”…
{name} · {color} — проверено 1:1: {dimensions}|{name} · {color} — verificat 1:1: {dimensions}|{name} · {color} — verified 1:1: {dimensions}
Выбрать цвет {color}|Selectează culoarea {color}|Select colour {color}
Открыть фотографию {number} товара {name}|Deschide fotografia {number} a produsului {name}|Open photo {number} of {name}
Показать фотографию {number}|Arată fotografia {number}|Show photo {number}
Добавить {name} в избранное|Adaugă {name} la favorite|Add {name} to favourites
Добавить {name} в корзину|Adaugă {name} în coș|Add {name} to cart
Убрать {name} из избранного|Elimină {name} din favorite|Remove {name} from favourites
Фотографии товара {name}|Fotografii: {name}|Photos of {name}
КАБИНЕТ МАГАЗИНА|CONTUL MAGAZINULUI|STORE DASHBOARD
С возвращением|Bine ai revenit|Welcome back
Управляйте каталогом, 3D-моделями, установкой виджета и статистикой в одном месте.|Gestionează catalogul, modelele 3D, instalarea widgetului și statisticile într-un singur loc.|Manage your catalogue, 3D models, widget installation and analytics in one place.
Нет аккаунта?|Nu ai cont?|No account yet?
Зарегистрироваться|Înregistrează-te|Register
ПЕРВЫЙ ШАГ|PRIMUL PAS|FIRST STEP
Создайте кабинет|Creează un cont|Create your account
Создайте аккаунт с почтой, указанной в приглашении.|Creează contul cu adresa de e-mail din invitație.|Create an account using the email address in your invitation.
После регистрации добавьте магазин, загрузите каталог и получите код виджета.|După înregistrare adaugă magazinul, încarcă catalogul și obține codul widgetului.|After registering, add your store, upload your catalogue and get your widget code.
Уже есть аккаунт?|Ai deja un cont?|Already have an account?
Войти|Autentificare|Sign in
Ошибка сервера. Попробуйте позже — менять пароль из-за этой ошибки не нужно.|Eroare de server. Încearcă mai târziu — nu trebuie să schimbi parola.|Server error. Try later — you do not need to change your password.
Аккаунт с такой почтой уже существует.|Există deja un cont cu acest e-mail.|An account with this email already exists.
Слишком много попыток. Повторите позже.|Prea multe încercări. Revino mai târziu.|Too many attempts. Try again later.
Пароль: от 10 до 128 символов, хотя бы одна буква и одна цифра.|Parolă: 10–128 de caractere, cel puțin o literă și o cifră.|Password: 10–128 characters, with at least one letter and one digit.
Неверная почта или пароль.|E-mail sau parolă incorectă.|Incorrect email or password.
Проверьте имя и адрес электронной почты.|Verifică numele și adresa de e-mail.|Check your name and email address.
Нет соединения. Проверьте интернет и повторите попытку.|Fără conexiune. Verifică internetul și încearcă din nou.|No connection. Check your internet and try again.
Аккаунт создан.|Cont creat.|Account created.
Письмо для подтверждения почты отправлено. Проверьте папку «Спам», если его нет во входящих.|E-mailul de confirmare a fost trimis. Verifică și folderul Spam.|Verification email sent. Check your spam folder if it is not in your inbox.
Письмо подтверждения пока не отправлено. Повторить запрос можно в разделе «Безопасность аккаунта».|E-mailul nu a fost trimis încă. Îl poți solicita din nou în „Securitatea contului”.|The verification email has not been sent yet. Request it again under Account security.
Продолжить настройку магазина →|Continuă configurarea magazinului →|Continue store setup →
Продолжить с Google|Continuă cu Google|Continue with Google
С этой почтой уже есть аккаунт. Войдите по паролю. Автоматическое объединение аккаунтов отключено для безопасности.|Există deja un cont cu acest e-mail. Folosește parola. Asocierea automată este dezactivată din motive de securitate.|An account already uses this email. Sign in with your password. Automatic merging is disabled for security.
Не удалось войти через Google. Попробуйте ещё раз или используйте почту и пароль.|Autentificarea Google nu a reușit. Reîncearcă sau folosește e-mailul și parola.|Google sign-in failed. Try again or use email and password.
Ваше имя|Numele tău|Your name
Артур|Artur|Artur
Рабочая почта|E-mail de serviciu|Work email
Пароль|Parolă|Password
Не менее 10 символов|Cel puțin 10 caractere|At least 10 characters
От 10 до 128 символов, хотя бы одна буква и одна цифра.|10–128 de caractere, cel puțin o literă și o cifră.|10–128 characters, at least one letter and one digit.
Забыли пароль?|Ai uitat parola?|Forgot password?
Подождите…|Așteaptă…|Please wait…
Войти в кабинет|Intră în cont|Sign in to dashboard
Создать аккаунт|Creează un cont|Create account
Подключите магазин|Conectează magazinul|Connect your store
Создайте отдельный аккаунт магазина или войдите по рабочей почте.|Creează un cont de magazin sau autentifică-te cu e-mailul de serviciu.|Create a store account or sign in with your work email.
Уже есть аккаунт — войти|Am deja cont — autentificare|Already registered — sign in
Свой сайт|Site propriu|Custom website
Другая платформа|Altă platformă|Other platform
Этот сайт уже подключён к другому магазину. Обратитесь в поддержку.|Acest site este asociat altui magazin. Contactează suportul.|This website belongs to another store. Contact support.
Сервис временно недоступен. Повторите попытку — дубликат магазина не появится.|Serviciu temporar indisponibil. Reîncearcă — magazinul nu va fi duplicat.|Service temporarily unavailable. Retry — your store will not be duplicated.
Сеанс завершён. Войдите в аккаунт заново.|Sesiunea a expirat. Autentifică-te din nou.|Your session expired. Sign in again.
Проверьте название и публичный адрес сайта магазина.|Verifică denumirea și adresa publică a magazinului.|Check the store name and public website address.
ШАГ 1 ИЗ 3|PASUL 1 DIN 3|STEP 1 OF 3
Создайте пространство магазина|Creează spațiul magazinului|Create your store workspace
Мы сохраним магазин отдельно от других клиентов, проверим каталог и покажем, какие товары уже готовы к AR.|Vom păstra datele magazinului separat, vom verifica catalogul și vom arăta produsele pregătite pentru AR.|We keep your store separate from other clients, check the catalogue and show which products are AR-ready.
Данные магазина|Datele magazinului|Store details
Товары и фотографии|Produse și fotografii|Products and photos
Установка виджета|Instalarea widgetului|Widget installation
Название магазина|Denumirea magazinului|Store name
Например, NORD Home|De exemplu, NORD Home|For example, NORD Home
Адрес сайта|Adresa site-ului|Website address
На чём работает сайт?|Ce platformă folosește site-ul?|Which platform powers your website?
Что произойдёт дальше|Ce urmează|What happens next
Откроется каталог. Вы сможете импортировать CSV, добавить товары вручную, загрузить фотографии или готовые 3D-файлы.|Se va deschide catalogul. Vei putea importa CSV, adăuga produse manual și încărca fotografii sau fișiere 3D.|Your catalogue opens next. Import CSV, add products manually, and upload photos or existing 3D files.
Создаём кабинет…|Creăm contul…|Creating your dashboard…
Создать магазин|Creează magazinul|Create store
Активный магазин|Magazin activ|Active store
Выберите магазин|Selectează magazinul|Choose a store
УПРАВЛЕНИЕ|ADMINISTRARE|MANAGEMENT
Обзор|Prezentare generală|Overview
Клиенты|Clienți|Clients
Каталог моделей|Catalog de modele|Model catalogue
Установка|Instalare|Installation
Аналитика|Analiză|Analytics
Команда и доступ|Echipă și acces|Team and access
МАГАЗИН|MAGAZIN|STORE
Подписка|Abonament|Subscription
Тарифы и заявки|Tarife și cereri|Pricing and requests
Заявки и расчёт|Cereri și estimări|Requests and quotes
Демонстрация ↗|Demonstrație ↗|Demo ↗
Безопасность аккаунта|Securitatea contului|Account security
Выйти|Deconectare|Sign out
Оператор MIRRAI|Operator MIRRAI|MIRRAI operator
Владелец магазина|Proprietarul magazinului|Store owner
БЕЗОПАСНОСТЬ АККАУНТА|SECURITATEA CONTULUI|ACCOUNT SECURITY
Доступ к MIRRAI|Acces la MIRRAI|MIRRAI account access
Вернуться ко входу|Înapoi la autentificare|Back to sign in
В кабинет|În cont|Go to dashboard
`;

export const messages = Object.fromEntries([rows, accountRows, merchantRows, catalogRows].map(part => part.trim()).join("\n").split("\n").map(row => {
  const [ru, ro, en] = row.split("|");
  if (!ru || !ro || !en) throw new Error(`Incomplete translation: ${ru}`);
  return [ru, { ro, en }];
}));
