"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

declare global { interface Window { MirraiWidget?: { mount: (config: Record<string, string>) => unknown } } }

export function DemoStore() {
  const [event, setEvent] = useState("Виджет готов");

  useEffect(() => {
    const onEvent = (message: Event) => {
      const detail = (message as CustomEvent<{ event?: string }>).detail;
      const labels: Record<string, string> = { widget_open: "Покупатель открыл виджет", model_ready: "3D-модель загружена", ar_open: "Покупатель запустил AR", object_placed: "Товар размещён в комнате" };
      if (detail?.event) setEvent(labels[detail.event] || detail.event);
    };
    window.addEventListener("mirrai:event", onEvent);
    const script = document.createElement("script");
    script.src = "/mirrai-widget.js";
    script.dataset.auto = "false";
    script.onload = () => window.MirraiWidget?.mount({ target: "#mirrai-demo-slot", shopId: "nordform", sku: "CLOUD-001" });
    document.body.appendChild(script);
    return () => { window.removeEventListener("mirrai:event", onEvent); script.remove(); };
  }, []);

  return <main className="store-demo">
    <nav className="store-nav"><Link href="/" className="store-logo">NORD<span>FORM</span></Link><div><span>Новинки</span><span>Гостиная</span><span>Спальня</span></div><Link href="/">MIRRAI ↗</Link></nav>
    <section className="store-product">
      <div className="store-gallery"><div className="store-room"><i/><b/><span>НОВАЯ КОЛЛЕКЦИЯ</span></div><div className="store-swatches"><button aria-label="Бежевый цвет"/><button aria-label="Серый цвет"/><button aria-label="Терракотовый цвет"/></div></div>
      <div className="store-info"><p className="store-category">КРЕСЛА / CLOUD</p><h1>Кресло Cloud</h1><p className="store-description">Мягкое кресло с глубокой посадкой и тактильной обивкой букле. Создано для спокойных вечеров и светлых интерьеров.</p><strong className="store-price">67 000 ₽</strong><div className="store-specs"><span><small>Материал</small>Букле</span><span><small>Размер</small>84 × 82 × 76 см</span><span><small>Доставка</small>от 3 дней</span></div><button className="store-cart">Добавить в корзину</button><div id="mirrai-demo-slot" className="mirrai-demo-slot"/><p className="store-note">AR открывается на телефоне в новой вкладке, на компьютере — в окне поверх магазина.</p><div className="store-event"><i/><span>{event}</span></div></div>
    </section>
    <section className="integration-card"><div><p>ДЕМОНСТРАЦИЯ ДЛЯ МАГАЗИНА</p><h2>Так MIRRAI выглядит<br/>в реальной карточке товара.</h2></div><div><p>Магазин передаёт SKU, 3D-файлы и габариты. Виджет возвращает события запуска и размещения для аналитики.</p><code>&lt;script src=&quot;https://mirrai…/mirrai-widget.js&quot;<br/> data-product-id=&quot;cloud-chair-001&quot; …&gt;&lt;/script&gt;</code></div></section>
  </main>;
}
