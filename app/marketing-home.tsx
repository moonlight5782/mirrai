"use client";

import React from "react";
import { useI18n } from "./language-provider";

const publicDemoUrl = "https://mirrai-furniture-demo.pages.dev/";

export function MarketingHome({ onPreview }: { onPreview: () => void }) {
  const { t } = useI18n();

  return (
    <main className="mirrai-home">
      <nav className="home-nav" aria-label={t("Основная навигация")}>
        <a className="home-wordmark" href="#top" aria-label="MIRRAI home">mirrai<span>.</span></a>
        <div className="home-nav-links">
          <a href="#experience">{t("Покупателям")}</a>
          <a href="#for-stores">{t("Магазинам")}</a>
        </div>
        <div className="home-nav-actions">
          <a href="/login">{t("Войти")}</a>
          <a className="home-nav-button" href="/onboarding">{t("Подключить магазин")} <span>↗</span></a>
        </div>
      </nav>

      <section className="home-hero" id="top">
        <div className="home-hero-copy">
          <p className="home-kicker"><span /> {t("ПРИМЕРКА МЕБЕЛИ В ДОПОЛНЕННОЙ РЕАЛЬНОСТИ")}</p>
          <h1>{t("Сначала увидеть дома.")}<br /><em>{t("Потом решать.")}</em></h1>
          <p className="home-intro">{t("Поставьте выбранную мебель в свою комнату до покупки. Без установки приложения и без догадок о размере.")}</p>
          <div className="home-hero-actions">
            <button onClick={onPreview}>{t("Примерить кресло")} <span>↗</span></button>
            <a href={publicDemoUrl} target="_blank" rel="noopener noreferrer">{t("Открыть демо-магазин")} <span>→</span></a>
          </div>
          <p className="home-compat">{t("Работает в браузере на совместимых iPhone и Android")}</p>
        </div>
        <div className="home-hero-scene">
          <div className="home-scene-top"><span>{t("РАБОЧЕЕ 3D-ПРЕВЬЮ")}</span><span>GLB · 3D</span></div>
          {React.createElement("model-viewer", {
            className: "home-hero-model",
            src: "/catalog/alba-chair-trellis2-q8-pbr.glb",
            alt: t("Трёхмерная модель кресла Alba из демонстрационного каталога"),
            "camera-controls": true,
            "touch-action": "pan-y",
            "shadow-intensity": ".8",
            "shadow-softness": ".9",
            "environment-image": "neutral",
            "tone-mapping": "neutral",
            exposure: "1",
            "camera-orbit": "35deg 72deg 145%",
            "field-of-view": "35deg",
            ar: true,
            "ar-modes": "webxr scene-viewer quick-look",
            "ar-placement": "floor",
            "ar-scale": "fixed",
          })}
          <div className="home-scene-caption"><div><span>{t("ДЕМО-КАТАЛОГ · КРЕСЛО")}</span><strong>Alba</strong><small>{t("Ткань VIC · 62 × 86 × 90 см")}</small></div><button onClick={onPreview} aria-label={t("Открыть просмотр в AR")}>↗</button></div>
        </div>
        <div className="home-hero-foot"><span>01 — 03</span><span>{t("Поверните модель пальцем. В AR размер фиксируется по габаритам товара.")}</span><a href="#experience">{t("Как это работает")} ↓</a></div>
      </section>

      <section className="home-experience" id="experience">
        <header><p className="home-section-label">{t("ДЛЯ ПОКУПАТЕЛЯ")}</p><h2>{t("Понятно, как будет выглядеть.")}<br /><em>{t("Ещё до доставки.")}</em></h2><p>{t("Откройте пример в магазине, разрешите камеру и разместите предмет в комнате. Снимок комнаты не загружается на сервер.")}</p></header>
        <div className="home-steps">
          <article><span>01</span><div><h3>{t("Откройте товар")}</h3><p>{t("Примерка запускается кнопкой рядом с товаром в интернет-магазине.")}</p></div></article>
          <article><span>02</span><div><h3>{t("Наведите камеру на пол")}</h3><p>{t("Браузер попросит доступ к камере и найдёт поверхность для размещения.")}</p></div></article>
          <article><span>03</span><div><h3>{t("Оцените размер и место")}</h3><p>{t("Модель размещается с габаритами товара; её можно передвинуть и осмотреть.")}</p></div></article>
        </div>
      </section>

      <section className="home-for-stores" id="for-stores">
        <div className="home-store-copy"><p className="home-section-label">{t("ДЛЯ МЕБЕЛЬНЫХ МАГАЗИНОВ")}</p><h2>{t("Ваш каталог.")}<br /><em>{t("С понятной примеркой.")}</em></h2><p>{t("MIRRAI подключает товары, варианты и 3D-модели магазина к одному виджету. Если модели уже есть — используем их. Если нет — согласуем подготовку отдельно.")}</p><div className="home-store-actions"><a href="/onboarding">{t("Запросить подключение")} <span>↗</span></a><a href={publicDemoUrl} target="_blank" rel="noopener noreferrer">{t("Посмотреть демо-магазин")} →</a></div></div>
        <div className="home-store-list"><article><span>01</span><div><strong>{t("Каталог")}</strong><p>{t("Товары, варианты и ссылки импортируются из магазина.")}</p></div><b>↗</b></article><article><span>02</span><div><strong>{t("3D-модели")}</strong><p>{t("Загрузите готовые GLB/USDZ или обсудите создание моделей.")}</p></div><b>↗</b></article><article><span>03</span><div><strong>{t("Виджет")}</strong><p>{t("Получите инструкцию установки и проверяйте работу из кабинета.")}</p></div><b>↗</b></article></div>
      </section>

      <footer className="home-footer"><a className="home-wordmark" href="#top">mirrai<span>.</span></a><p>{t("Визуализация мебели в пространстве покупателя.")}</p><div><a href={publicDemoUrl} target="_blank" rel="noopener noreferrer">{t("Демо")}</a><a href="/login">{t("Войти в кабинет магазина")}</a><a href="/onboarding">{t("Для магазинов")}</a><a href="/admin">{t("Вход оператора")}</a></div><small>© MIRRAI 2026</small></footer>
    </main>
  );
}
