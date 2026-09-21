import asyncio
import base64
import os
import secrets
import sqlite3
import time
import uuid
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

ROOT = Path(os.getenv("MIRRAI_DATA_DIR", "/data"))
INPUTS, OUTPUTS = ROOT / "inputs", ROOT / "outputs"
INPUTS.mkdir(parents=True, exist_ok=True)
OUTPUTS.mkdir(parents=True, exist_ok=True)
HUNYUAN_URL = os.getenv("HUNYUAN_URL", "http://hunyuan:8081")
MAX_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
API_TOKEN = os.getenv("API_TOKEN", "").strip()
APP_ENV = os.getenv("MIRRAI_ENV", "production").strip().lower()
MAX_CONCURRENT_JOBS = max(1, int(os.getenv("MAX_CONCURRENT_JOBS", "1")))
MAX_PENDING_JOBS = max(MAX_CONCURRENT_JOBS, int(os.getenv("MAX_PENDING_JOBS", "8")))
ASSET_TTL_HOURS = max(1, int(os.getenv("ASSET_TTL_HOURS", "72")))

if APP_ENV != "development" and not API_TOKEN:
    raise RuntimeError("API_TOKEN is required outside development")

app = FastAPI(title="MIRRAI reconstruction gateway", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])
DB_PATH = ROOT / "jobs.sqlite3"
GENERATION_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_JOBS)


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def update_job(job_id: str, **values):
    fields = ", ".join(f"{key} = ?" for key in values)
    with connect_db() as connection:
        connection.execute(f"UPDATE jobs SET {fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [*values.values(), job_id])


def require_token(authorization: str | None = Header(default=None)):
    expected = f"Bearer {API_TOKEN}"
    if API_TOKEN and not secrets.compare_digest(authorization or "", expected):
        raise HTTPException(401, "Invalid API token")


def valid_image(payload: bytes, suffix: str) -> bool:
    if suffix in {".jpg", ".jpeg"}:
        return payload.startswith(b"\xff\xd8\xff")
    if suffix == ".png":
        return payload.startswith(b"\x89PNG\r\n\x1a\n")
    if suffix == ".webp":
        return len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP"
    return False


def cleanup_expired() -> None:
    cutoff = time.time() - ASSET_TTL_HOURS * 3600
    with connect_db() as connection:
        expired = connection.execute(
            "SELECT id FROM jobs WHERE updated_at < datetime('now', ?)",
            (f"-{ASSET_TTL_HOURS} hours",),
        ).fetchall()
        connection.execute(
            "DELETE FROM jobs WHERE updated_at < datetime('now', ?)",
            (f"-{ASSET_TTL_HOURS} hours",),
        )
    for row in expired:
        for source in INPUTS.glob(f"{row['id']}.*"):
            source.unlink(missing_ok=True)
        (OUTPUTS / f"{row['id']}.glb").unlink(missing_ok=True)
    for folder in (INPUTS, OUTPUTS):
        for path in folder.iterdir():
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)


with connect_db() as connection:
    connection.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, kind TEXT NOT NULL, model_url TEXT, error TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    connection.execute("UPDATE jobs SET status = 'failed', error = 'Service restarted during generation' WHERE status IN ('queued', 'generating')")
cleanup_expired()


async def generate(job_id: str, source: Path) -> None:
    async with GENERATION_SEMAPHORE:
        update_job(job_id, status="generating", error=None)
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
                        update_job(job_id, status="ready", model_url=f"/v1/models/{job_id}.glb")
                        return
                    if status.get("status") in {"failed", "error"}:
                        raise RuntimeError(status.get("error", "Hunyuan generation failed"))
                raise TimeoutError("Generation timed out")
        except Exception as error:
            update_job(job_id, status="failed", error=str(error)[:300])
        finally:
            source.unlink(missing_ok=True)
            cleanup_expired()


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "Hunyuan3D-2.1"}


@app.post("/v1/assets", status_code=202, dependencies=[Depends(require_token)])
async def create_asset(background: BackgroundTasks, file: UploadFile = File(...), kind: str = Form("object")):
    suffix = Path(file.filename or "asset").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(415, "Only JPG, PNG and WEBP images are accepted")
    payload = await file.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise HTTPException(413, "File is too large")
    if not valid_image(payload, suffix):
        raise HTTPException(415, "File signature does not match its extension")
    with connect_db() as connection:
        pending = connection.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued', 'generating')").fetchone()[0]
    if pending >= MAX_PENDING_JOBS:
        raise HTTPException(429, "Generation queue is full", headers={"Retry-After": "300"})
    job_id = uuid.uuid4().hex
    source = INPUTS / f"{job_id}{suffix}"
    source.write_bytes(payload)
    with connect_db() as connection:
        connection.execute("INSERT INTO jobs (id, status, kind) VALUES (?, 'queued', ?)", (job_id, kind))
    background.add_task(generate, job_id, source)
    return {"id": job_id, "status": "queued", "kind": kind}


@app.get("/v1/assets/{job_id}", dependencies=[Depends(require_token)])
async def get_asset(job_id: str):
    with connect_db() as connection:
        row = connection.execute("SELECT id, status, kind, model_url, error, created_at, updated_at FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Unknown asset")
    return dict(row)


@app.get("/v1/models/{filename}", dependencies=[Depends(require_token)])
async def get_model(filename: str):
    if not filename.endswith(".glb") or Path(filename).name != filename:
        raise HTTPException(404)
    target = OUTPUTS / filename
    if not target.exists():
        raise HTTPException(404)
    return FileResponse(target, media_type="model/gltf-binary", filename=filename)
