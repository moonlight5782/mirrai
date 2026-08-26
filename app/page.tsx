"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "home" | "clothes" | "space";
const clothes = [
  { name: "Пиджак Nocturne", type: "Премиальная шерсть", price: "24 900 ₽", color: "#242321", shape: "jacket" },
  { name: "Рубашка Air", type: "Мягкий хлопок", price: "9 600 ₽", color: "#d7dfdf", shape: "shirt" },
  { name: "Куртка Form", type: "Матовый нейлон", price: "31 500 ₽", color: "#815d3c", shape: "jacket" },
  { name: "Платье Line", type: "Шёлк", price: "28 400 ₽", color: "#762f3d", shape: "dress" },
  { name: "Худи Soft", type: "Плотный футер", price: "12 900 ₽", color: "#76756f", shape: "hoodie" },
  { name: "Тренч Rain", type: "Хлопок с пропиткой", price: "34 800 ₽", color: "#b49b72", shape: "trench" },
  { name: "Жилет Mono", type: "Костюмная шерсть", price: "16 500 ₽", color: "#39404a", shape: "vest" },
  { name: "Футболка Base", type: "Хлопок", price: "5 900 ₽", color: "#e9e5dc", shape: "tshirt" },
];
const objects = [
  { name: "Кресло Cloud", type: "3D-модель · реальный масштаб", price: "67 000 ₽", color: "#d2bda8", model: "/chair.glb" },
  { name: "Стул Arc", type: "Дерево и ткань", price: "29 000 ₽", color: "#92765c", model: "/catalog/arc-chair.glb" },
  { name: "Лампа Halo", type: "Металл", price: "18 400 ₽", color: "#d0be85", model: "/catalog/halo-lamp.glb" },
  { name: "Стол Plane", type: "Натуральный дуб", price: "74 000 ₽", color: "#aa8763", model: "/catalog/plane-table.glb" },
];

type UploadState = "idle" | "uploading" | "generating" | "ready" | "error";
const reconstructionApi = process.env.NEXT_PUBLIC_RECONSTRUCTION_API_URL ?? "";

export default function Home() {
  const [mode, setMode] = useState<Mode>("home");
  const [active, setActive] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("Модель тела готовится…");
  const [size, setSize] = useState("M");
  const [arStatus, setArStatus] = useState("3D-модель загружена");
  const [customName, setCustomName] = useState("");
  const [customPreview, setCustomPreview] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [snapshotUrl, setSnapshotUrl] = useState("");
  const [bodyRegion, setBodyRegion] = useState("Ищем человека");
  const [photoPending, setPhotoPending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<{ detectForVideo: (video: HTMLVideoElement, time: number) => { landmarks: Array<Array<{x:number;y:number;visibility?:number}>> }; close: () => void } | null>(null);
  const animationRef = useRef<number | null>(null);
  const smoothPoseRef = useRef<Array<{x:number;y:number}> | null>(null);
  const garmentImageRef = useRef<HTMLImageElement | null>(null);
  const trackingStatusRef = useRef("");
  const bodyRegionRef = useRef("");
  const arRef = useRef<HTMLElement & { activateAR?: () => Promise<void>; canActivateAR?: boolean }>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const catalog = mode === "space" ? objects : clothes;
  const isWidget = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("widget") === "1", []);
  const modelSource = customModel || (mode === "space" ? objects[active]?.model : "/chair.glb");
  const catalogCountLabel = `${catalog.length} ${catalog.length === 1 ? "предмет" : catalog.length < 5 ? "предмета" : "предметов"}`;

  function selectCatalogItem(index: number) {
    const sameReadyObject = mode === "space" && index === active && !customName;
    setActive(index);
    setCustomName("");
    setCustomPreview("");
    if (customModel.startsWith("blob:")) URL.revokeObjectURL(customModel);
    setCustomModel("");
    setUploadState("idle");
    setUploadMessage("");
    setPhotoPending(false);
    garmentImageRef.current = null;
    if (mode === "space") setArStatus(sameReadyObject ? `${objects[index].name} ${objects[index].name.startsWith("Лампа") ? "готова" : "готов"} — вращайте или откройте AR` : "Загружаем выбранную 3D-модель…");
  }

  function updateTrackingStatus(value: string) {
    if (trackingStatusRef.current === value) return;
    trackingStatusRef.current = value;
    setTrackingStatus(value);
  }

  function updateBodyRegion(value: string) {
    if (bodyRegionRef.current === value) return;
    bodyRegionRef.current = value;
    setBodyRegion(value);
  }

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode === "space" ? "environment" : "user", width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
    } catch { setCameraError("Камера недоступна. Разрешите доступ в настройках браузера."); }
  }
  function closeStudio() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; setCameraOn(false); setMode("home");
    setCustomName(""); setCustomPreview(""); setCustomModel(""); setUploadState("idle"); setUploadMessage(""); setSnapshotUrl(""); setPhotoPending(false); setBodyRegion("Ищем человека"); garmentImageRef.current = null;
  }
  async function retryCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    await startCamera();
  }
  useEffect(() => {
    import("@google/model-viewer");
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      poseRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (mode !== "space" || !arRef.current) return;
    const viewer = arRef.current;
    const productName = customName || objects[active].name;
    const readyWord = productName.startsWith("Лампа") ? "готова" : "готов";
    const placedWord = productName.startsWith("Лампа") ? "размещена" : "размещён";
    const onLoad = () => setArStatus(`${productName} ${readyWord} — вращайте или откройте AR`);
    const onError = () => setArStatus("Не удалось загрузить 3D-модель");
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{status: string}>).detail?.status;
      setArStatus(status === "object-placed" ? `${productName} ${placedWord} в пространстве` : status === "failed" ? "AR не запустился — используйте Safari на iPhone или Chrome на Android" : "Ищем поверхность…");
    };
    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);
    viewer.addEventListener("ar-status", onArStatus);
    (viewer as HTMLElement & { src?: string }).src = modelSource;
    viewer.setAttribute("src", modelSource);
    viewer.setAttribute("alt", `Объёмная 3D-модель ${productName}`);
    return () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onError);
      viewer.removeEventListener("ar-status", onArStatus);
    };
  }, [mode, active, modelSource, customName]);

  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    const playCamera = async () => {
      try {
        await video.play();
        setCameraError("");
      } catch {
        setCameraError("Браузер остановил воспроизведение камеры. Нажмите экран и включите камеру ещё раз.");
      }
    };
    if (video.readyState >= 1) playCamera();
    else video.addEventListener("loadedmetadata", playCamera, { once: true });
    return () => video.removeEventListener("loadedmetadata", playCamera);
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn || mode !== "clothes") return;
    let cancelled = false;
    async function initializeTracking() {
      try {
        updateTrackingStatus("Загружаем модель тела…");
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/pose_landmarker_lite.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (cancelled) { landmarker.close(); return; }
        poseRef.current = landmarker;
        updateTrackingStatus("Встаньте перед камерой");
        runPoseLoop();
      } catch {
        updateTrackingStatus("Не удалось запустить отслеживание тела");
      }
    }
    initializeTracking();
    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      poseRef.current?.close();
      poseRef.current = null;
      smoothPoseRef.current = null;
    };
  }, [cameraOn, mode, active]);

  function runPoseLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseRef.current;
    if (!video || !canvas || !pose) return;
    if (video.readyState >= 2 && video.videoWidth) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      }
      const result = pose.detectForVideo(video, performance.now());
      const points = result.landmarks[0];
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      if (points && context) {
        const visible = (indexes: number[]) => indexes.filter(index => (points[index]?.visibility ?? 0) > .45).length >= Math.ceil(indexes.length * .65);
        const faceVisible = visible([0,2,5,7,8]);
        const upperVisible = visible([11,12,13,14]);
        const hipsVisible = visible([23,24]);
        const legsVisible = visible([25,26,27,28]);
        const region = upperVisible && hipsVisible && legsVisible ? "Полный рост" : upperVisible && hipsVisible ? "Верх тела" : hipsVisible && legsVisible ? "Нижняя часть тела" : faceVisible ? "Лицо и плечи" : "Человек частично в кадре";
        updateBodyRegion(region);
        if (!(upperVisible && hipsVisible)) {
          updateTrackingStatus(region === "Нижняя часть тела" ? "Поднимите камеру — для этой одежды нужны плечи" : "Покажите плечи и корпус полностью");
          animationRef.current = requestAnimationFrame(runPoseLoop);
          return;
        }
        const indexes = [11,12,13,14,23,24,25,26];
        const raw = indexes.map(index => ({ x: points[index].x * canvas.width, y: points[index].y * canvas.height }));
        const previous = smoothPoseRef.current;
        const smooth = raw.map((point,index) => previous ? ({ x: previous[index].x * .72 + point.x * .28, y: previous[index].y * .72 + point.y * .28 }) : point);
        smoothPoseRef.current = smooth;
        drawGarment(context, smooth, canvas.width);
        updateTrackingStatus(`${region} отслеживается · LIVE`);
      } else { updateBodyRegion("Человек не найден"); updateTrackingStatus("Встаньте перед камерой"); }
    }
    animationRef.current = requestAnimationFrame(runPoseLoop);
  }

  function drawGarment(context: CanvasRenderingContext2D, pose: Array<{x:number;y:number}>, width: number) {
    const [leftShoulder,rightShoulder,leftElbow,rightElbow,leftHip,rightHip] = pose;
    const shoulderWidth = Math.hypot(rightShoulder.x-leftShoulder.x,rightShoulder.y-leftShoulder.y);
    const sizeScale = ({XS:.9,S:.95,M:1,L:1.06,XL:1.12} as Record<string,number>)[size];
    const padding = shoulderWidth * .16 * sizeScale;
    const sleeve = shoulderWidth * .24;
    const garment = clothes[active];
    const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const isSleeveless = garment.shape === "vest";
    const isShortSleeve = garment.shape === "tshirt";
    const hemDrop = garment.shape === "dress" ? shoulderWidth * .95 : garment.shape === "trench" ? shoulderWidth * .48 : padding;
    const hemFlare = garment.shape === "dress" ? shoulderWidth * .42 : garment.shape === "trench" ? shoulderWidth * .12 : 0;
    context.save();
    const gradient = context.createLinearGradient(leftShoulder.x,leftShoulder.y,rightHip.x,rightHip.y);
    gradient.addColorStop(0, clothes[active].color);
    gradient.addColorStop(1, active === 0 ? "#080807" : active === 1 ? "#aab8b8" : "#553c29");
    context.fillStyle = gradient;
    context.globalAlpha = .9;
    context.shadowColor = "#00000055"; context.shadowBlur = width * .012;
    context.beginPath();
    context.moveTo(leftShoulder.x-padding,leftShoulder.y-padding*.35);
    if (!isSleeveless) {
      const leftEnd = isShortSleeve ? {x:leftShoulder.x+(leftElbow.x-leftShoulder.x)*.42,y:leftShoulder.y+(leftElbow.y-leftShoulder.y)*.42} : leftElbow;
      context.lineTo(leftEnd.x-sleeve,leftEnd.y);
      context.lineTo(leftEnd.x+sleeve*.25,leftEnd.y+sleeve*.35);
    }
    context.lineTo(leftHip.x-padding*.4-hemFlare,leftHip.y+hemDrop);
    context.lineTo(rightHip.x+padding*.4+hemFlare,rightHip.y+hemDrop);
    if (!isSleeveless) {
      const rightEnd = isShortSleeve ? {x:rightShoulder.x+(rightElbow.x-rightShoulder.x)*.42,y:rightShoulder.y+(rightElbow.y-rightShoulder.y)*.42} : rightElbow;
      context.lineTo(rightEnd.x-sleeve*.25,rightEnd.y+sleeve*.35);
      context.lineTo(rightEnd.x+sleeve,rightEnd.y);
    }
    context.lineTo(rightShoulder.x+padding,rightShoulder.y-padding*.35);
    const neckDepth = garment.shape === "hoodie" ? padding*.55 : garment.shape === "shirt" ? padding*1.25 : padding*.9;
    context.quadraticCurveTo(centerX,(leftShoulder.y+rightShoulder.y)/2+neckDepth,leftShoulder.x-padding,leftShoulder.y-padding*.35);
    context.closePath(); context.fill();
    const image = garmentImageRef.current;
    if (image?.complete && image.naturalWidth) {
      context.save(); context.clip(); context.globalAlpha=.72;
      context.drawImage(image, centerX-shoulderWidth*.72, leftShoulder.y-padding, shoulderWidth*1.44, hipY-leftShoulder.y+hemDrop+padding);
      context.restore();
    }
    context.strokeStyle="#ffffff30"; context.lineWidth=Math.max(1,width*.002); context.stroke();
    context.globalAlpha=.38; context.strokeStyle="#ffffff"; context.shadowBlur=0;
    context.beginPath(); context.moveTo(centerX,(leftShoulder.y+rightShoulder.y)/2+neckDepth); context.lineTo(centerX,hipY+hemDrop*.78); context.stroke();
    if (["jacket","trench"].includes(garment.shape)) {
      context.fillStyle="#e8e3d888"; context.beginPath(); context.arc(centerX+shoulderWidth*.04,hipY-padding*.5,Math.max(2,width*.0035),0,Math.PI*2); context.fill();
      context.beginPath(); context.arc(centerX+shoulderWidth*.04,hipY+padding*.2,Math.max(2,width*.0035),0,Math.PI*2); context.fill();
    }
    if (garment.shape === "hoodie") {
      context.strokeStyle="#ffffff70"; context.lineWidth=Math.max(2,width*.004); context.beginPath(); context.arc(centerX,(leftShoulder.y+rightShoulder.y)/2-padding*.25,shoulderWidth*.27,Math.PI*.08,Math.PI*.92,true); context.stroke();
    }
    context.restore();
  }

  async function openAR() {
    if (photoPending) { setArStatus("Сначала дождитесь готовой 3D-модели"); return; }
    setArStatus("Запускаем системный AR…");
    try {
      await arRef.current?.activateAR?.();
    } catch {
      setArStatus("AR не поддерживается этим браузером. Откройте страницу в Safari или Chrome на телефоне.");
    }
  }

  function takeSnapshot() {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay || !video.videoWidth) return;
    const result = document.createElement("canvas");
    result.width = video.videoWidth; result.height = video.videoHeight;
    const context = result.getContext("2d"); if (!context) return;
    context.translate(result.width, 0); context.scale(-1, 1); context.drawImage(video, 0, 0, result.width, result.height); context.drawImage(overlay, 0, 0, result.width, result.height); context.setTransform(1,0,0,1,0,0);
    setSnapshotUrl(result.toDataURL("image/jpeg", .9));
  }

  async function handleAsset(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = file.type.startsWith("image/") || ["jpg","jpeg","png","webp","heic"].includes(extension);
    const isModel = extension === "glb" || file.type === "model/gltf-binary";
    setCustomName(file.name);
    setUploadMessage("");
    if (isModel) {
      if (mode === "clothes") {
        setUploadState("error");
        setUploadMessage("GLB распознан. Для движения одежды нужен серверный риггинг; для автономной примерки загрузите фото.");
        return;
      }
      if (customModel.startsWith("blob:")) URL.revokeObjectURL(customModel);
      setCustomModel(URL.createObjectURL(file));
      setPhotoPending(false);
      setUploadState("ready");
      setUploadMessage("3D-модель распознана и готова");
      setArStatus("Ваша модель готова — откройте AR");
      return;
    }
    if (!isImage) { setUploadState("error"); setUploadMessage("Поддерживаются JPG, PNG, WEBP, HEIC и автономный GLB"); return; }
    if (customPreview.startsWith("blob:")) URL.revokeObjectURL(customPreview);
    setCustomPreview(URL.createObjectURL(file));
    if (mode === "clothes") {
      const image = new Image(); image.onload = () => { garmentImageRef.current = image; setUploadMessage("Фото используется как текстура в автономной примерке"); }; image.src = URL.createObjectURL(file);
      setUploadState("ready"); setUploadMessage("Подготавливаем фото для примерки…");
      if (!reconstructionApi) return;
    }
    if (mode === "space") setPhotoPending(true);
    if (!reconstructionApi) {
      setUploadState("error");
      setUploadMessage("Фото принято. Для генерации нужно подключить адрес вашего GPU-сервера.");
      return;
    }
    try {
      setUploadState("uploading"); setUploadMessage("Загружаем фотографию…");
      const body = new FormData(); body.append("file", file); body.append("kind", mode === "space" ? "object" : "garment");
      const response = await fetch(`${reconstructionApi}/v1/assets`, { method: "POST", body });
      if (!response.ok) throw new Error("upload");
      const { id } = await response.json() as { id: string };
      setUploadState("generating"); setUploadMessage("Создаём объём, геометрию и текстуры…");
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const statusResponse = await fetch(`${reconstructionApi}/v1/assets/${id}`);
        if (!statusResponse.ok) throw new Error("status");
        const job = await statusResponse.json() as { status: string; model_url?: string; error?: string };
        if (job.status === "ready" && job.model_url) {
          setCustomModel(new URL(job.model_url, reconstructionApi).toString());
          setPhotoPending(false);
          setUploadState("ready"); setUploadMessage("3D-модель готова"); setArStatus("Ваша модель готова — откройте AR"); return;
        }
        if (job.status === "failed") throw new Error(job.error || "generation");
      }
      throw new Error("timeout");
    } catch { setUploadState("error"); setUploadMessage("Генерация не завершилась. Проверьте GPU-сервис и повторите."); }
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
      <section className="technology shell" id="technology"><p className="section-label">Технология MIRRAI</p><div><h2>Работает сейчас.<br/><em>Становится точнее с сервером.</em></h2><p>На устройстве уже работают отслеживание тела, разные силуэты одежды и системный AR для предметов. Собственный GPU-сервер добавит генерацию текстурированной 3D-модели из фотографии и физическую посадку ткани.</p></div><div className="tech-grid"><span><b>01</b> Body tracking<br/><small>Локально, без отправки видео</small></span><span><b>02</b> Native AR<br/><small>Реальный масштаб и поверхности</small></span><span><b>03</b> GPU reconstruction<br/><small>Подключаемый собственный сервер</small></span></div></section>
    </> : <section className="studio shell">
      <header className="studio-head"><div><button className="back" onClick={closeStudio}>← Назад</button><p>{mode === "clothes" ? "Виртуальная примерочная" : "AR-пространство"}</p><h1>{mode === "clothes" ? "Ваш образ — в движении" : "Посмотрите предмет у себя"}</h1></div><div className="live-pill"><i /> LIVE · {cameraOn ? "30 FPS" : "ГОТОВО"}</div></header>
      <div className="studio-grid">
        <aside className="catalog"><div className="catalog-title"><span>Коллекция</span><small>{catalogCountLabel}</small></div>{catalog.map((item,index)=><button key={item.name} className={`product ${active===index&&!customName?"active":""}`} onClick={()=>selectCatalogItem(index)}><i style={{background:item.color}}><b>{mode === "space" ? "▰" : "♢"}</b></i><span><strong>{item.name}</strong><small>{item.type}</small><em>{item.price}</em></span><b className="select-mark">{active===index&&!customName?"✓":"+"}</b></button>)}</aside>
        {mode === "space" ? <div className="ar-stage">
          {React.createElement("model-viewer", {
            ref: arRef,
            src: modelSource,
            alt: `Объёмная 3D-модель ${customName || objects[active].name}`,
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
            "camera-target": "auto auto auto",
            "field-of-view": "32deg",
          }, React.createElement("button", { slot: "ar-button", className: "native-ar-button" }, "Разместить у себя", React.createElement("span", null, "↗")))}
          <div className="ar-room"><i className="ar-floor"/><i className="ar-window"/><span>Проведите пальцем, чтобы осмотреть предмет со всех сторон</span></div>
          {photoPending && <div className="reconstruction-screen">{customPreview && <img src={customPreview} alt="Фотография предмета для 3D-реконструкции"/>}<p>Создание 3D-модели</p><div className="generation-steps"><span className="done">Фото принято</span><span className={uploadState === "generating" ? "active" : ""}>Геометрия</span><span>Текстуры</span><span>GLB для AR</span></div><small>{uploadMessage}</small></div>}
          <div className="camera-badges"><span>REAL 3D</span><span>AR SCALE 1:1</span></div>
        </div> : <div className={`camera ${cameraOn?"camera-on":""}`}>
          {cameraOn?<video ref={videoRef} autoPlay playsInline muted onCanPlay={(event)=>event.currentTarget.play().catch(()=>undefined)}/>:<div className="camera-placeholder"><span>◎</span><h3>Камера готова</h3><p>Встаньте так, чтобы было видно верхнюю часть тела</p></div>}
          {cameraOn&&<canvas ref={canvasRef} className="pose-canvas" aria-label="Одежда, синхронизированная с положением тела"/>}
          {cameraOn&&<div className="tracking-state"><i/><span>{trackingStatus}</span></div>}
          <div className="camera-badges"><span>AI TRACKING</span><span>{cameraOn ? bodyRegion.toUpperCase() : "AUTO BODY ZONE"}</span></div>
        </div>}
        <aside className="controls"><div><p className="control-label">Выбрано</p><h3>{customName || catalog[active].name}</h3><span className="material-dot" style={{background:catalog[active].color}}/></div>
          {!isWidget && <div className="asset-upload"><p className="control-label">Свой товар</p><label className="upload-button"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,.glb" onChange={event => handleAsset(event.target.files?.[0])}/><span>＋</span><b>{mode === "clothes" ? "Фото одежды" : "Фото или GLB-модель"}</b></label>{customPreview && <img className="upload-preview" src={customPreview} alt="Загруженный товар"/>}{uploadState !== "idle" && <div className={`asset-result ${uploadState}`}><span>{uploadState === "ready" ? "✓" : uploadState === "error" ? "!" : "•••"}</span><div><strong>{customName}</strong><small>{uploadMessage}</small></div></div>}</div>}
          {mode==="clothes"?<div><p className="control-label">Размер</p><div className="sizes">{["XS","S","M","L","XL"].map(s=><button className={size===s?"active":""} onClick={()=>setSize(s)} key={s}>{s}</button>)}</div><p className="fit-note">Выбран размер <strong>{size}</strong> · ручная настройка</p></div>:<div><p className="control-label">Настоящий AR</p><div className="ar-features"><span>Поверхности</span><span>Окклюзия</span><span>Масштаб 1:1</span><span>Тени</span></div><p className="fit-note ar-state">{arStatus}</p></div>}
          {mode === "space" ? <button className="primary" onClick={openAR} disabled={photoPending}>{photoPending ? "Ожидаем 3D-модель" : "Открыть системный AR"} <span>↗</span></button> : !cameraOn?<button className="primary" onClick={startCamera}>Включить камеру <span>→</span></button>:cameraError?<button className="primary" onClick={retryCamera}>Повторить запуск <span>↻</span></button>:<button className="primary" onClick={takeSnapshot}>Сделать снимок <span>→</span></button>}
          {snapshotUrl && <div className="snapshot-card"><img src={snapshotUrl} alt="Снимок виртуальной примерки"/><div><strong>Образ сохранён</strong><a href={snapshotUrl} download="mirrai-look.jpg">Скачать снимок</a></div></div>}
          {cameraError&&<p className="error">{cameraError}</p>}<p className="privacy">Кадры обрабатываются на вашем устройстве и не сохраняются.</p>
        </aside>
      </div>
    </section>}
    <footer className="shell"><span>MIRRAI © 2026</span><span>Попробуйте. Посмотрите. Решите.</span></footer>
  </main>;
}
