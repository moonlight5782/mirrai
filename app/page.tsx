"use client";

import React, { useEffect, useRef, useState } from "react";

type Mode = "home" | "clothes" | "space";
const clothes = [
  { name: "Пиджак Nocturne", type: "Премиальная шерсть", price: "24 900 ₽", color: "#242321" },
  { name: "Рубашка Air", type: "Мягкий хлопок", price: "9 600 ₽", color: "#d7dfdf" },
  { name: "Куртка Form", type: "Матовый нейлон", price: "31 500 ₽", color: "#815d3c" },
];
const objects = [
  { name: "Кресло Cloud", type: "3D-модель · реальный масштаб", price: "67 000 ₽", color: "#d2bda8" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("home");
  const [active, setActive] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [size, setSize] = useState("M");
  const [arStatus, setArStatus] = useState("3D-модель загружена");
  const videoRef = useRef<HTMLVideoElement>(null);
  const arRef = useRef<HTMLElement & { activateAR?: () => Promise<void>; canActivateAR?: boolean }>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const catalog = mode === "space" ? objects : clothes;

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode === "space" ? "environment" : "user", width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream; });
    } catch { setCameraError("Камера недоступна. Разрешите доступ в настройках браузера."); }
  }
  function closeStudio() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; setCameraOn(false); setMode("home");
  }
  useEffect(() => {
    import("@google/model-viewer");
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function openAR() {
    setArStatus("Запускаем системный AR…");
    try {
      await arRef.current?.activateAR?.();
    } catch {
      setArStatus("AR не поддерживается этим браузером. Откройте страницу в Safari или Chrome на телефоне.");
    }
  }

  return <main>
    <nav className="nav shell">
      <button className="brand" onClick={closeStudio} aria-label="На главную">MIRR<span>AI</span></button>
      <div className="nav-links"><a href="#how">Как это работает</a><a href="#technology">Технология</a></div>
      <button className="nav-cta" onClick={() => setMode("clothes")}>Попробовать <span>↗</span></button>
    </nav>

    {mode === "home" ? <>
      <section className="hero shell">
        <div className="eyebrow"><i /> Пространство для ваших решений</div>
        <h1>Увидеть до того,<br />как <em>выбрать.</em></h1>
        <p className="lead">Примеряйте одежду на себе и размещайте предметы в интерьере — в реальном времени, прямо через камеру.</p>
        <div className="choice-grid">
          <button className="choice choice-dark" onClick={() => { setMode("clothes"); setActive(0); }}>
            <span className="choice-index">01</span><span className="fashion-figure"><i className="head"/><i className="torso"/><i className="leg left"/><i className="leg right"/></span>
            <span className="choice-copy"><small>Виртуальная примерочная</small><strong>Одежда</strong><span>Оцените образ на себе <b>→</b></span></span>
          </button>
          <button className="choice choice-light" onClick={() => { setMode("space"); setActive(0); }}>
            <span className="choice-index">02</span><span className="room-scene"><i className="lamp"/><i className="chair"/><i className="rug"/></span>
            <span className="choice-copy"><small>Дополненная реальность</small><strong>Предметы</strong><span>Разместите в своём пространстве <b>→</b></span></span>
          </button>
        </div>
      </section>
      <section className="how shell" id="how">
        <p className="section-label">Один взгляд вместо сомнений</p><h2>Выбирайте не по воображению.<br /><em>Выбирайте глазами.</em></h2>
        <div className="steps"><article><span>01</span><h3>Выберите</h3><p>Одежду или предмет из коллекции</p></article><article><span>02</span><h3>Откройте камеру</h3><p>Ничего скачивать не нужно</p></article><article><span>03</span><h3>Посмотрите</h3><p>Результат появляется в реальном времени</p></article></div>
      </section>
    </> : <section className="studio shell">
      <header className="studio-head"><div><button className="back" onClick={closeStudio}>← Назад</button><p>{mode === "clothes" ? "Виртуальная примерочная" : "AR-пространство"}</p><h1>{mode === "clothes" ? "Ваш образ — в движении" : "Посмотрите предмет у себя"}</h1></div><div className="live-pill"><i /> LIVE · {cameraOn ? "30 FPS" : "ГОТОВО"}</div></header>
      <div className="studio-grid">
        <aside className="catalog"><div className="catalog-title"><span>Коллекция</span><small>{catalog.length} {catalog.length === 1 ? "предмет" : "предмета"}</small></div>{catalog.map((item,index)=><button key={item.name} className={`product ${active===index?"active":""}`} onClick={()=>setActive(index)}><i style={{background:item.color}}><b>{mode === "space" ? "▰" : "♢"}</b></i><span><strong>{item.name}</strong><small>{item.type}</small><em>{item.price}</em></span><b className="select-mark">{active===index?"✓":"+"}</b></button>)}</aside>
        {mode === "space" ? <div className="ar-stage">
          {React.createElement("model-viewer", {
            ref: arRef,
            src: "/chair.glb",
            alt: "Объёмная 3D-модель кресла Cloud",
            ar: true,
            "ar-modes": "webxr scene-viewer quick-look",
            "ar-placement": "floor",
            "ar-scale": "fixed",
            "camera-controls": true,
            "touch-action": "pan-y",
            "shadow-intensity": "1.4",
            "shadow-softness": "0.8",
            exposure: "1",
            "environment-image": "neutral",
            "camera-orbit": "35deg 72deg 2.7m",
            "min-camera-orbit": "auto auto 1.5m",
            "max-camera-orbit": "auto auto 5m",
            onLoad: () => setArStatus("Модель готова — вращайте её или откройте AR"),
            onError: () => setArStatus("Не удалось загрузить 3D-модель"),
            onArStatus: (event: CustomEvent<{status: string}>) => setArStatus(event.detail.status === "object-placed" ? "Кресло размещено в пространстве" : event.detail.status === "failed" ? "AR не запустился — используйте Safari на iPhone или Chrome на Android" : "Ищем поверхность…"),
          }, React.createElement("button", { slot: "ar-button", className: "native-ar-button" }, "Разместить у себя", React.createElement("span", null, "↗")))}
          <div className="ar-room"><i className="ar-floor"/><i className="ar-window"/><span>Проведите пальцем, чтобы осмотреть кресло со всех сторон</span></div>
          <div className="camera-badges"><span>REAL 3D</span><span>AR SCALE 1:1</span></div>
        </div> : <div className={`camera ${cameraOn?"camera-on":""}`}>
          {cameraOn?<video ref={videoRef} autoPlay playsInline muted/>:<div className="camera-placeholder"><span>◎</span><h3>Камера готова</h3><p>Встаньте так, чтобы было видно верхнюю часть тела</p></div>}
          {cameraOn&&<div className="garment-overlay" style={{"--garment":catalog[active].color} as React.CSSProperties}><i/><span>{catalog[active].name}</span></div>}
          <div className="camera-badges"><span>AI TRACKING</span><span>BODY MESH</span></div>
        </div>}
        <aside className="controls"><div><p className="control-label">Выбрано</p><h3>{catalog[active].name}</h3><span className="material-dot" style={{background:catalog[active].color}}/></div>
          {mode==="clothes"?<div><p className="control-label">Размер</p><div className="sizes">{["XS","S","M","L","XL"].map(s=><button className={size===s?"active":""} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div><p className="fit-note">Рекомендуем <strong>M</strong> по вашей калибровке</p></div>:<div><p className="control-label">Настоящий AR</p><div className="ar-features"><span>Поверхности</span><span>Окклюзия</span><span>Масштаб 1:1</span><span>Тени</span></div><p className="fit-note ar-state">{arStatus}</p></div>}
          {mode === "space" ? <button className="primary" onClick={openAR}>Открыть системный AR <span>↗</span></button> : !cameraOn?<button className="primary" onClick={startCamera}>Включить камеру <span>→</span></button>:<button className="primary">Сделать снимок <span>→</span></button>}
          {cameraError&&<p className="error">{cameraError}</p>}<p className="privacy">Кадры обрабатываются на вашем устройстве и не сохраняются.</p>
        </aside>
      </div>
    </section>}
    <footer className="shell"><span>MIRRAI © 2026</span><span>Попробуйте. Посмотрите. Решите.</span></footer>
  </main>;
}
