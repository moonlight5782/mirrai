/** Merchant workflow copy. Catalog names and merchant-entered content stay original. */
export const merchantRows = `
MIRRAI — мебель в вашем пространстве|MIRRAI — mobilier în spațiul tău|MIRRAI — furniture in your space
Фотореалистичный AR-виджет для мебельных интернет-магазинов: реальный масштаб, адаптация света и запуск из карточки товара.|Widget AR fotorealist pentru magazine de mobilier: scară reală, iluminare adaptivă și lansare din pagina produsului.|Photorealistic AR widget for furniture stores: real scale, adaptive lighting and launch from the product page.
Посмотрите мебель у себя до покупки — прямо из карточки товара.|Vezi mobilierul acasă înainte de cumpărare — direct din pagina produsului.|See furniture in your space before buying — directly from the product page.
HUGGE × MIRRAI — рабочая AR-витрина|HUGGE × MIRRAI — catalog AR funcțional|HUGGE × MIRRAI — working AR storefront
Реальные товары каталога HUGGE с подключённым AR-виджетом MIRRAI.|Produse reale din catalogul HUGGE cu widgetul AR MIRRAI.|Real HUGGE catalogue products with the MIRRAI AR widget.
Реальный каталог HUGGE и статусы 3D-моделей.|Catalogul real HUGGE și starea modelelor 3D.|Real HUGGE catalogue and 3D model status.
Вход — MIRRAI|Autentificare — MIRRAI|Sign in — MIRRAI
Регистрация — MIRRAI|Înregistrare — MIRRAI|Register — MIRRAI
Подключить магазин — MIRRAI|Conectează magazinul — MIRRAI|Connect your store — MIRRAI
Обновить|Actualizează|Refresh
Отправляем…|Se trimite…|Sending…
Загружаем…|Se încarcă…|Loading…
Ткань, матовый металл|Țesătură, metal mat|Fabric, matte metal
Выбрать {name}|Selectează {name}|Select {name}
Открыть фотографию {number}|Deschide fotografia {number}|Open photo {number}
Импортировано: {count}. {error}|Importate: {count}. {error}|Imported: {count}. {error}
Нет модели|Fără model|No model
В очереди|În coadă|Queued
Создаётся|În curs de creare|Generating
Нужна проверка|Necesită verificare|Needs review
Готова|Gata|Ready
Опубликована|Publicat|Published
Ошибка|Eroare|Error
Опубликованы|Publicate|Published
В работе|În lucru|In progress
На проверке|În verificare|In review
Без модели|Fără model|No model
Ошибки|Erori|Errors
Не удалось загрузить каталог. Обновите страницу.|Catalogul nu a putut fi încărcat. Reîncarcă pagina.|Could not load the catalogue. Refresh the page.
Для публикации нужен GLB-файл.|Publicarea necesită un fișier GLB.|A GLB file is required to publish.
Изменения не сохранены.|Modificările nu au fost salvate.|Changes were not saved.
В CSV обязательны колонки SKU и name/название.|Fișierul CSV trebuie să conțină coloanele SKU și name/название.|CSV must include SKU and name/название columns.
Не удалось импортировать CSV.|Fișierul CSV nu a putut fi importat.|Could not import CSV.
Сайт магазина недоступен по защищённому HTTPS. Для hugge.md нужно продлить сертификат.|Site-ul magazinului nu este disponibil prin HTTPS securizat. Certificatul hugge.md trebuie reînnoit.|The store is unavailable over secure HTTPS. The hugge.md certificate needs renewal.
Не удалось синхронизировать каталог сайта.|Catalogul site-ului nu a putut fi sincronizat.|Could not sync the website catalogue.
Файл не загружен. Допустимы GLB/USDZ до 50 МБ.|Fișierul nu a fost încărcat. Sunt acceptate GLB/USDZ de până la 50 MB.|File not uploaded. GLB/USDZ files up to 50 MB are accepted.
Фото не загружено. Используйте JPG, PNG или WebP до 12 МБ.|Fotografia nu a fost încărcată. Folosește JPG, PNG sau WebP de până la 12 MB.|Photo not uploaded. Use JPG, PNG or WebP up to 12 MB.
Такой SKU уже есть в каталоге.|Acest SKU există deja în catalog.|This SKU already exists in the catalogue.
Не удалось добавить товар.|Produsul nu a putut fi adăugat.|Could not add the product.
Очередь готова. Для запуска подключите Hugging Face ZeroGPU или собственный 3D-сервер.|Coada este pregătită. Conectează Hugging Face ZeroGPU sau propriul server 3D pentru a începe.|Queue ready. Connect Hugging Face ZeroGPU or your own 3D server to start.
Не удалось обновить очередь генерации.|Coada de generare nu a putut fi actualizată.|Could not update the generation queue.
Товары добавлены, но запуск заблокирован: проверьте источник фотографий и подключение 3D-сервера.|Produsele au fost adăugate, dar pornirea este blocată: verifică sursa fotografiilor și conexiunea serverului 3D.|Products added, but generation is blocked: check the photo source and 3D server connection.
Заявка отправлена команде MIRRAI. Мы проверим фотографии перед запуском.|Cererea a fost trimisă echipei MIRRAI. Vom verifica fotografiile înainte de a începe.|Request sent to MIRRAI. We will review the photos before starting.
КАТАЛОГ / 3D-ПОКРЫТИЕ|CATALOG / DISPONIBILITATE 3D|CATALOGUE / 3D COVERAGE
Модели товаров|Modelele produselor|Product models
＋ Добавить товар|＋ Adaugă produs|＋ Add product
Синхронизируем…|Sincronizare…|Syncing…
Обновить с сайта|Actualizează de pe site|Update from website
Шаблон CSV|Șablon CSV|CSV template
Импортируем…|Importare…|Importing…
Импорт CSV|Importă CSV|Import CSV
Открыть демо ↗|Deschide demo ↗|Open demo ↗
ручной каталог|catalog manual|manual catalogue
Источник недоступен|Sursă indisponibilă|Source unavailable
Подписка активна|Abonament activ|Subscription active
Всего SKU|Total SKU|Total SKUs
Фото найдено|Fotografii găsite|Photos found
Готовы к AR|Gata pentru AR|AR ready
В обработке|În procesare|Processing
каталога доступно покупателям в AR|din catalog este disponibil în AR|of the catalogue is available in AR
ПАКЕТНАЯ ГЕНЕРАЦИЯ 3D|GENERARE 3D ÎN LOT|BATCH 3D GENERATION
ЗАЯВКА НА 3D-МОДЕЛИ|CERERE DE MODELE 3D|3D MODEL REQUEST
Подготовить модели из фотографий|Pregătește modele din fotografii|Prepare models from photos
3D-сервер подключён. Сначала создаём GLB, затем проверяем масштаб и материалы.|Serverul 3D este conectat. Creăm GLB, apoi verificăm scara și materialele.|3D server connected. First we create GLB, then verify scale and materials.
Очередь работает, но генератор пока не подключён.|Coada funcționează, dar generatorul nu este încă conectat.|The queue works, but the generator is not connected yet.
Выберите товары с фотографиями. MIRRAI проверит исходники и подготовит модели после согласования.|Selectează produse cu fotografii. MIRRAI verifică sursele și pregătește modelele după aprobare.|Select products with photos. MIRRAI reviews the sources and prepares models after approval.
Выбрано|Selectate|Selected
Заявки / очередь|Cereri / coadă|Requests / queue
Одобрить и поставить в очередь|Aprobă și adaugă în coadă|Approve and queue
Запустить / проверить|Pornește / verifică|Start / check
Запросить подготовку 3D|Solicită pregătirea 3D|Request 3D preparation
Поиск по товару или SKU|Caută după produs sau SKU|Search by product or SKU
Габариты|Dimensiuni|Dimensions
Файлы|Fișiere|Files
Статус|Stare|Status
Не указаны|Nespecificate|Not specified
Фото и 3D|Fotografii și 3D|Photos and 3D
Загружаем каталог…|Se încarcă catalogul…|Loading catalogue…
НОВЫЙ ТОВАР|PRODUS NOU|NEW PRODUCT
Добавить в каталог|Adaugă în catalog|Add to catalogue
Категория|Categorie|Category
Цена|Preț|Price
Ссылка на товар|Link către produs|Product link
Материал|Material|Material
Ширина, см|Lățime, cm|Width, cm
Глубина, см|Adâncime, cm|Depth, cm
Высота, см|Înălțime, cm|Height, cm
После сохранения откройте товар и добавьте фотографии или готовую 3D-модель.|După salvare, deschide produsul și adaugă fotografii sau un model 3D existent.|After saving, open the product and add photos or an existing 3D model.
Добавляем…|Se adaugă…|Adding…
Добавить товар|Adaugă produs|Add product
МОДЕЛЬ ТОВАРА|MODELUL PRODUSULUI|PRODUCT MODEL
фото|fotografii|photos
Открыть товар ↗|Deschide produsul ↗|Open product ↗
Добавить фотографии товара|Adaugă fotografii ale produsului|Add product photos
JPG, PNG или WebP до 12 МБ|JPG, PNG sau WebP de până la 12 MB|JPG, PNG or WebP up to 12 MB
Загрузить GLB|Încarcă GLB|Upload GLB
Загрузка…|Se încarcă…|Uploading…
Загружен ✓|Încărcat ✓|Uploaded ✓
До 50 МБ|Până la 50 MB|Up to 50 MB
Загрузить USDZ|Încarcă USDZ|Upload USDZ
Для iPhone|Pentru iPhone|For iPhone
USDZ URL для iPhone|URL USDZ pentru iPhone|USDZ URL for iPhone
Результат проверки|Rezultatul verificării|Review result
После загрузки модель получает статус «Нужна проверка». Публикация выполняется после проверки масштаба и материалов.|După încărcare, modelul primește starea „Necesită verificare”. Publicarea are loc după verificarea scării și materialelor.|Uploaded models are marked “Needs review”. They are published after scale and materials are checked.
Сохранить модель|Salvează modelul|Save model
Свой сайт|Site propriu|Custom website
Другая платформа|Altă platformă|Other platform
Не удалось загрузить настройку.|Setările nu au putut fi încărcate.|Could not load settings.
Нет соединения. Повторите загрузку настройки.|Fără conexiune. Încearcă să încarci setările din nou.|No connection. Try loading settings again.
Этот домен уже связан с другим магазином. Обратитесь в поддержку.|Acest domeniu este deja asociat altui magazin. Contactează asistența.|This domain is linked to another store. Contact support.
Проверьте адрес сайта и попробуйте ещё раз.|Verifică adresa site-ului și încearcă din nou.|Check the website address and try again.
Нет соединения. Изменения не подтверждены — повторите попытку.|Fără conexiune. Modificările nu sunt confirmate — încearcă din nou.|No connection. Changes are not confirmed — try again.
Браузер запретил копирование. Выделите код и скопируйте вручную.|Browserul a blocat copierea. Selectează codul și copiază-l manual.|The browser blocked copying. Select the code and copy it manually.
БЫСТРЫЙ СТАРТ / 3 ШАГА|START RAPID / 3 PAȘI|QUICK START / 3 STEPS
Подключение магазина|Conectarea magazinului|Store setup
Посмотреть пример ↗|Vezi exemplul ↗|View example ↗
Готовность магазина|Pregătirea magazinului|Store readiness
Что нужно для работающей кнопки|Ce este necesar pentru un buton funcțional|What the button needs to work
Домен:|Domeniu:|Domain:
сохранён|salvat|saved
укажите адрес сайта|introdu adresa site-ului|enter the website address
. Модели:|. Modele:|. Models:
нужно опубликовать хотя бы одну|publică cel puțin un model|publish at least one
. Скрипт:|. Script:|. Script:
обнаружен|detectat|detected
ещё не обнаружен|încă nedetectat|not detected yet
Доступ:|Acces:|Access:
активен|activ|active
неактивен — кнопка не откроет модель|inactiv — butonul nu va deschide modelul|inactive — the button will not open the model
Проверить подписку →|Verifică abonamentul →|Check subscription →
Последний шаг: откройте товар на сайте магазина, запустите 3D и AR, затем проверьте событие в|Ultimul pas: deschide un produs pe site, pornește 3D și AR, apoi verifică evenimentul în|Last step: open a product on the store website, launch 3D and AR, then check the event in
статистике|statistici|analytics
. Сигнал скрипта не подтверждает качество модели или работу камеры.|. Semnalul scriptului nu confirmă calitatea modelului sau funcționarea camerei.|. A script signal does not confirm model quality or camera operation.
Один универсальный коннектор|Un singur conector universal|One universal connector
MIRRAI определит магазин по домену, распознает платформу, найдёт SKU и добавит кнопку только к товарам с готовой моделью. Для нестандартной темы можно явно передать SKU.|MIRRAI identifică magazinul după domeniu, recunoaște platforma, găsește SKU și adaugă butonul doar produselor cu un model gata. Pentru teme personalizate poți specifica SKU explicit.|MIRRAI identifies the store by domain, detects the platform, finds the SKU and adds a button only to products with a ready model. Custom themes can supply an explicit SKU.
Виджет подключён|Widget conectat|Widget connected
Обычно занимает 10 минут|De obicei durează 10 minute|Usually takes 10 minutes
Расскажите о магазине|Despre magazinul tău|Tell us about your store
Адрес нужен, чтобы виджет работал только на вашем сайте.|Adresa asigură funcționarea widgetului doar pe site-ul tău.|The address ensures the widget works only on your website.
Готово ✓|Gata ✓|Done ✓
Сейчас|Acum|Now
На чём работает сайт?|Pe ce platformă rulează site-ul?|What platform does your site use?
Сохранить изменения|Salvează modificările|Save changes
Продолжить|Continuă|Continue
Проверьте каталог|Verifică catalogul|Check the catalogue
Кнопка появится только у товаров с опубликованной 3D-моделью.|Butonul apare doar la produsele cu un model 3D publicat.|The button appears only for products with a published 3D model.
Нужна модель|Este necesar un model|Model needed
товаров доступны в AR|produse disponibile în AR|products available in AR
Открыть каталог моделей →|Deschide catalogul de modele →|Open model catalogue →
Установите одну вставку|Adaugă un singur fragment de cod|Install one snippet
Её достаточно для всего магазина. Новые модели появятся автоматически.|Este suficient pentru întregul magazin. Modelele noi apar automat.|One snippet covers the entire store. New models appear automatically.
Подключено ✓|Conectat ✓|Connected ✓
Финальный шаг|Ultimul pas|Final step
Скопировать код|Copiază codul|Copy code
Установка MIRRAI для|Instalarea MIRRAI pentru|MIRRAI installation for
Добавьте этот код в общий шаблон сайта:|Adaugă acest cod în șablonul general al site-ului:|Add this code to the shared website template:
Отправить разработчику|Trimite dezvoltatorului|Send to developer
Скопировано ✓|Copiat ✓|Copied ✓
Добавьте скрипт один раз|Adaugă scriptul o singură dată|Add the script once
В общий шаблон сайта перед закрывающим тегом страницы.|În șablonul general al site-ului, înainte de eticheta de închidere a paginii.|In the shared website template, before the closing page tag.
Проверьте автоматическое распознавание|Verifică detectarea automată|Check automatic detection
На стандартной теме коннектор сам найдёт платформу, SKU и место рядом с покупкой.|Într-o temă standard, conectorul detectează platforma, SKU și poziția de lângă butonul de cumpărare.|On standard themes, the connector finds the platform, SKU and placement next to the purchase button.
Откройте страницу товара|Deschide pagina produsului|Open a product page
После загрузки скрипта появится отметка подключения. Затем откройте 3D и AR у товара с готовой моделью.|După încărcarea scriptului apare confirmarea conectării. Apoi deschide 3D și AR pentru un produs cu model gata.|A connection indicator appears after the script loads. Then open 3D and AR for a product with a ready model.
Если тема магазина нестандартная или SKU не найден|Dacă tema este personalizată sau SKU nu este găsit|If the theme is custom or SKU is not found
Добавьте контейнер|Adaugă containerul|Add the container
в шаблон карточки товара. Это самый надёжный резервный режим: кнопка появится именно рядом с этим контейнером.|în șablonul paginii produsului. Acesta este modul alternativ cel mai sigur: butonul apare lângă acest container.|to the product page template. This is the most reliable fallback: the button appears next to this container.
используйте только когда URL каждой карточки стабильно заканчивается артикулом.|folosește doar când URL-ul fiecărui produs se termină întotdeauna cu SKU.|use only when every product URL consistently ends with its SKU.
Скрипт обнаружен|Script detectat|Script detected
Ожидаем первое открытие|Se așteaptă prima deschidere|Waiting for first visit
После установки откройте любой товар на своём сайте, затем обновите эту страницу.|După instalare, deschide un produs pe site-ul tău, apoi reîncarcă această pagină.|After installation, open a product on your website, then refresh this page.
Проверить снова|Verifică din nou|Check again
Требуется расчёт|Necesită calcul|Quote required
На рассмотрении|În examinare|Pending review
Расчёт рассмотрен|Calcul verificat|Quote reviewed
Отклонена|Respinsă|Rejected
Подписка / месяц|Abonament / lună|Subscription / month
Подготовка моделей / разово|Pregătirea modelelor / o singură dată|Model preparation / one-time
Первый месяц + подготовка|Prima lună + pregătire|First month + preparation
Не удалось загрузить заявки. Проверьте соединение и повторите.|Cererile nu au putut fi încărcate. Verifică conexiunea și încearcă din nou.|Could not load requests. Check your connection and try again.
Цены обновились. Проверьте новый расчёт и отправьте ещё раз.|Prețurile s-au actualizat. Verifică noul calcul și trimite din nou.|Prices changed. Review the new quote and submit again.
Укажите неотрицательные цены. Создание модели должно стоить дороже проверки готовой.|Introdu prețuri nenegative. Crearea unui model trebuie să coste mai mult decât verificarea unuia existent.|Enter non-negative prices. Creating a model must cost more than reviewing an existing one.
Недостаточно прав для этого действия.|Nu ai permisiunea pentru această acțiune.|You do not have permission for this action.
Укажите публичный адрес сайта магазина.|Introdu adresa publică a site-ului magazinului.|Enter the store's public website address.
Слишком много запросов. Попробуйте позже.|Prea multe cereri. Încearcă mai târziu.|Too many requests. Try again later.
Не удалось сохранить. Проверьте поля и повторите.|Salvarea a eșuat. Verifică câmpurile și încearcă din nou.|Could not save. Check the fields and try again.
Заявка сохранена. Оператор увидит её в своём кабинете. Деньги не списывались.|Cererea a fost salvată. Operatorul o va vedea în cont. Nu s-a efectuat nicio plată.|Request saved. The operator will see it in their dashboard. No payment was taken.
Изменения сохранены.|Modificările au fost salvate.|Changes saved.
Нет соединения. Повторная отправка той же заявки не создаст дубликат.|Fără conexiune. Retrimiterea aceleiași cereri nu va crea un duplicat.|No connection. Resubmitting the same request will not create a duplicate.
ПОДКЛЮЧЕНИЕ И СТОИМОСТЬ|CONECTARE ȘI COSTURI|SETUP AND PRICING
Тарифы и заявки|Tarife și cereri|Pricing and requests
Заявки и расчёт|Cereri și calcul|Requests and quotes
Онлайн-оплата пока не подключена. Это предварительный расчёт и запрос на согласование, не оплаченный счёт. Окончательный объём работ подтверждается после проверки файлов.|Plata online nu este încă disponibilă. Acesta este un calcul preliminar și o cerere de aprobare, nu o factură achitată. Volumul final se confirmă după verificarea fișierelor.|Online payments are not connected yet. This is a preliminary quote and approval request, not a paid invoice. The final scope is confirmed after reviewing the files.
Загружаем данные…|Se încarcă datele…|Loading data…
Ваши цены в MDL|Prețurile tale în MDL|Your prices in MDL
Готовая модель: проверка и подготовка. Новая модель: создание и подготовка. Старые заявки сохраняют прежний расчёт.|Model existent: verificare și pregătire. Model nou: creare și pregătire. Cererile anterioare păstrează calculul inițial.|Existing model: review and preparation. New model: creation and preparation. Previous requests keep their original quotes.
Подписка в месяц|Abonament lunar|Monthly subscription
Одна готовая модель — разово|Un model existent — o singură dată|One existing model — one-time
Создание одной модели — разово|Crearea unui model — o singură dată|Creating one model — one-time
Сохранить тарифы|Salvează tarifele|Save pricing
Запросить подключение магазина|Solicită conectarea magazinului|Request store setup
Можно отправить заявку на ещё один магазин. Отправка не включает подписку и не запускает платную генерацию.|Poți trimite o cerere pentru încă un magazin. Trimiterea nu activează abonamentul și nu pornește generarea cu plată.|You can request another store. Submitting does not activate a subscription or start paid generation.
Сколько готовых 3D-моделей|Câte modele 3D existente|Number of existing 3D models
Для скольких товаров нужно создать модель|Câte produse necesită un model nou|Products needing a new model
Укажите от 1 до 10 000 моделей суммарно.|Introdu între 1 și 10.000 de modele în total.|Enter between 1 and 10,000 models in total.
Отправить заявку на расчёт|Trimite cererea de calcul|Request a quote
Загрузить готовые модели в существующий магазин →|Încarcă modele într-un magazin existent →|Upload models to an existing store →
Заявки клиентов|Cererile clienților|Customer requests
Мои заявки|Cererile mele|My requests
Заявок пока нет.|Nu există cereri încă.|No requests yet.
Готовых моделей:|Modele existente:|Existing models:
. Создать:|. De creat:|. To create:
Ответ MIRRAI:|Răspuns MIRRAI:|MIRRAI reply:
Открыть каталог магазина →|Deschide catalogul magazinului →|Open store catalogue →
Создать магазин для автора заявки и включить бесплатный пилот на 14 дней? Это не подтверждение оплаты.|Creezi un magazin pentru solicitant și activezi un pilot gratuit de 14 zile? Aceasta nu confirmă plata.|Create a store for the requester and activate a free 14-day pilot? This does not confirm payment.
Подключить магазин · пилот 14 дней|Conectează magazinul · pilot de 14 zile|Connect store · 14-day pilot
Ответ клиенту|Răspuns pentru client|Reply to customer
Сохранить ответ|Salvează răspunsul|Save reply
Показаны последние 100 заявок. Статус рассмотрения не означает оплату или активацию магазина.|Sunt afișate ultimele 100 de cereri. Starea examinării nu înseamnă plată sau activarea magazinului.|Showing the latest 100 requests. Review status does not indicate payment or store activation.
{count} дн.|{count} zile|{count} days
{count} доступны|{count} disponibile|{count} available
{count} готовы ✓|{count} gata ✓|{count} ready ✓
до {date}|până la {date}|until {date}
Последний сигнал скрипта: {date}|Ultimul semnal al scriptului: {date}|Last script signal: {date}
Удалить {name} из избранного|Elimină {name} din favorite|Remove {name} from favourites
Уменьшить количество {name}|Redu cantitatea pentru {name}|Decrease quantity of {name}
Увеличить количество {name}|Mărește cantitatea pentru {name}|Increase quantity of {name}
{name}, фото {number}|{name}, fotografia {number}|{name}, photo {number}
{name}, миниатюра {number}|{name}, miniatura {number}|{name}, thumbnail {number}
{name}, увеличенное фото {number}|{name}, fotografia mărită {number}|{name}, enlarged photo {number}
{color} — 3D готовится|{color} — 3D în pregătire|{color} — 3D in preparation
{color}: 3D-модель ещё не готова|{color}: modelul 3D nu este încă gata|{color}: 3D model not ready yet
3D-модель {name}|Model 3D: {name}|3D model: {name}
цвет {color}|culoare {color}|colour {color}
`;
