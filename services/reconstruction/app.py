import asyncio
import base64
import os
import uuid
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

ROOT = Path(os.getenv("MIRRAI_DATA_DIR", "/data"))
INPUTS, OUTPUTS = ROOT / "inputs", ROOT / "outputs"
INPUTS.mkdir(parents=True, exist_ok=True)
OUTPUTS.mkdir(parents=True, exist_ok=True)
HUNYUAN_URL = os.getenv("HUNYUAN_URL", "http://hunyuan:8081")
MAX_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if x.strip()]

app = FastAPI(title="MIRRAI reconstruction gateway", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])
jobs: dict[str, dict] = {}


async def generate(job_id: str, source: Path) -> None:
    jobs[job_id]["status"] = "generating"
    try:
        mime = "jpeg" if source.suffix.lower() in {".jpg", ".jpeg"} else source.suffix.lstrip(".")
        encoded = base64.b64encode(source.read_bytes()).decode("ascii")
        async with httpx.AsyncClient(timeout=1800) as client:
            submitted = await client.post(f"{HUNYUAN_URL}/send", json={
                "image": f"data:image/{mime};base64,{encoded}",
                "remove_background": True, "texture": True, "type": "glb"
            })
            submitted.raise_for_status()
            upstream_id = submitted.json()["uid"]
            for _ in range(600):
                await asyncio.sleep(3)
                response = await client.get(f"{HUNYUAN_URL}/status/{upstream_id}")
                response.raise_for_status()
                status = response.json()
                if status.get("status") == "completed":
                    target = OUTPUTS / f"{job_id}.glb"
                    target.write_bytes(base64.b64decode(status["model_base64"]))
                    jobs[job_id].update(status="ready", model_url=f"/v1/models/{job_id}.glb")
                    return
                if status.get("status") in {"failed", "error"}:
                    raise RuntimeError(status.get("error", "Hunyuan generation failed"))
            raise TimeoutError("Generation timed out")
    except Exception as error:
        jobs[job_id].update(status="failed", error=str(error)[:300])


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "Hunyuan3D-2.1"}


@app.post("/v1/assets", status_code=202)
async def create_asset(background: BackgroundTasks, file: UploadFile = File(...), kind: str = Form("object")):
    suffix = Path(file.filename or "asset").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
        raise HTTPException(415, "Only JPG, PNG, WEBP and HEIC images are accepted")
    payload = await file.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise HTTPException(413, "File is too large")
    job_id = uuid.uuid4().hex
    source = INPUTS / f"{job_id}{suffix}"
    source.write_bytes(payload)
    jobs[job_id] = {"id": job_id, "status": "queued", "kind": kind}
    background.add_task(generate, job_id, source)
    return jobs[job_id]


@app.get("/v1/assets/{job_id}")
async def get_asset(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Unknown asset")
    return jobs[job_id]


@app.get("/v1/models/{filename}")
async def get_model(filename: str):
    if not filename.endswith(".glb") or Path(filename).name != filename:
        raise HTTPException(404)
    target = OUTPUTS / filename
    if not target.exists():
        raise HTTPException(404)
    return FileResponse(target, media_type="model/gltf-binary", filename=filename)
