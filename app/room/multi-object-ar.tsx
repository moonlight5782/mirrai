"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export type ARSceneItem = { key: string; name: string; model: string; width: number; height: number; depth: number; x: number; z: number; rotation: number };

type Props = { items: ARSceneItem[]; onFallback: () => Promise<void>; onStatus: (message: string) => void };

export function MultiObjectAR({ items, onFallback, onStatus }: Props) {
  const [active, setActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [selectedKey, setSelectedKey] = useState(items[0]?.key || "");
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const reticleMatrix = useRef<THREE.Matrix4 | null>(null);
  const compositionRef = useRef<THREE.Group | null>(null);
  const objectsRef = useRef(new Map<string, THREE.Object3D>());

  useEffect(() => () => { void sessionRef.current?.end(); }, []);
  const activeSelectedKey = items.some(item => item.key === selectedKey) ? selectedKey : items[0]?.key || "";

  async function start() {
    if (!items.length) return;
    const xr = navigator.xr;
    if (!xr) { await onFallback(); return; }
    const root = overlayRef.current;
    const host = canvasHostRef.current;
    if (!root || !host) return;
    let session: XRSession;
    try {
      // Request the session before model loading so the browser still sees the user's tap.
      session = await xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"], optionalFeatures: ["dom-overlay", "light-estimation"], domOverlay: { root } });
    } catch { await onFallback(); return; }
    sessionRef.current = session; setActive(true); setPlaced(false); onStatus("Наведите камеру на пол и нажмите «Разместить»");
    try {
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
      renderer.xr.enabled = true;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      host.replaceChildren(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
      const directional = new THREE.DirectionalLight(0xffffff, 1.4); directional.position.set(2, 5, 3); scene.add(directional);
      const composition = new THREE.Group(); composition.visible = false; scene.add(composition); compositionRef.current = composition;
      const loader = new GLTFLoader(); const draco = new DRACOLoader(); draco.setDecoderPath("/draco/"); loader.setDRACOLoader(draco); objectsRef.current.clear();
      for (const item of items) {
        let gltf;
        try { gltf = await loader.loadAsync(new URL(item.model, location.origin).toString()); }
        catch { continue; }
        const object = gltf.scene.clone(true);
        const sourceSize = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
        object.scale.set(item.width / Math.max(sourceSize.x, .001), item.height / Math.max(sourceSize.y, .001), item.depth / Math.max(sourceSize.z, .001));
        object.rotation.y = THREE.MathUtils.degToRad(item.rotation);
        const box = new THREE.Box3().setFromObject(object); const center = box.getCenter(new THREE.Vector3());
        object.position.set(item.x - center.x, -box.min.y, item.z - center.z); object.name = item.name; object.userData.roomKey = item.key;
        object.traverse(node => { node.userData.roomKey = item.key; });
        composition.add(object); objectsRef.current.set(item.key, object);
      }
      draco.dispose();
      if (!composition.children.length) throw new Error("no_models_loaded");
      const reticle = new THREE.Mesh(new THREE.RingGeometry(.09, .12, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb8ff31 }));
      reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
      await renderer.xr.setSession(session);
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const referenceSpace = await session.requestReferenceSpace("local");
      const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
      renderer.setAnimationLoop((_time, frame) => {
        if (frame && hitTestSource && !composition.visible) {
          const hit = frame.getHitTestResults(hitTestSource)[0];
          if (hit) { const pose = hit.getPose(referenceSpace); if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); reticleMatrix.current = reticle.matrix.clone(); } }
          else reticle.visible = false;
        }
        renderer.render(scene, camera);
      });
      session.addEventListener("end", () => { renderer.setAnimationLoop(null); renderer.dispose(); hitTestSource?.cancel(); sessionRef.current = null; compositionRef.current = null; objectsRef.current.clear(); setActive(false); setPlaced(false); onStatus("AR закрыт — композиция сохранена"); }, { once: true });
    } catch { await session.end().catch(() => undefined); setActive(false); onStatus("Многoобъектный AR не запустился — открываем системный режим"); await onFallback(); }
  }

  function place() {
    if (!compositionRef.current || !reticleMatrix.current) return;
    const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3();
    reticleMatrix.current.decompose(position, quaternion, scale);
    compositionRef.current.position.copy(position); compositionRef.current.quaternion.copy(quaternion); compositionRef.current.visible = true;
    setPlaced(true); onStatus("Композиция размещена — выберите предмет и двигайте его отдельно");
  }
  function move(dx: number, dz: number, rotate = 0) {
    const object = objectsRef.current.get(activeSelectedKey); if (!object) return;
    object.position.x += dx; object.position.z += dz; object.rotation.y += THREE.MathUtils.degToRad(rotate);
  }
  async function exitAR() { await sessionRef.current?.end(); }

  return <>
    <button type="button" className="room-ar-button" onClick={start} disabled={!items.length}>Открыть многoобъектный AR <span>↗</span></button>
    <div ref={overlayRef} className={`multi-ar-overlay ${active ? "active" : ""}`}>
      <div ref={canvasHostRef} className="multi-ar-canvas"/>
      {active && <div className="multi-ar-ui"><header><b>MIRR<span>AI</span> · КОМНАТА</b><button type="button" onClick={exitAR}>Закрыть ×</button></header>{!placed ? <button type="button" className="place-composition" onClick={place}>Разместить композицию</button> : <div className="ar-object-controls"><div>{items.map(item => <button type="button" key={item.key} className={activeSelectedKey === item.key ? "active" : ""} onClick={() => setSelectedKey(item.key)}>{item.name}</button>)}</div><p>Двигайте выбранный предмет по полу</p><section><button type="button" onClick={() => move(0, -.15)}>↑</button><button type="button" onClick={() => move(-.15, 0)}>←</button><button type="button" onClick={() => move(0, .15)}>↓</button><button type="button" onClick={() => move(.15, 0)}>→</button><button type="button" onClick={() => move(0, 0, -15)}>↶</button><button type="button" onClick={() => move(0, 0, 15)}>↷</button></section></div>}</div>}
    </div>
  </>;
}
