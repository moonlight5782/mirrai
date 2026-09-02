"""Regenerate HUGGE models rejected by visual QA in a Colab GPU runtime."""

import json
import os
import pathlib
import shutil
import socket
import subprocess
import tarfile
import time

import requests


BASE = pathlib.Path("/content")
WORK = BASE / "trellis2"
OUTPUTS = BASE / "hugge-trellis2-qa"
WORK.mkdir(parents=True, exist_ok=True)
OUTPUTS.mkdir(parents=True, exist_ok=True)
subprocess.run(["nvidia-smi"], check=True)


def remote_size(url):
    response = requests.head(url, allow_redirects=True, timeout=60)
    response.raise_for_status()
    return int(response.headers.get("content-length", 0))


def download_resume(url, destination, retries=8):
    destination = pathlib.Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    expected = remote_size(url)
    if destination.exists() and expected and destination.stat().st_size == expected:
        return
    if destination.exists() and expected and destination.stat().st_size > expected:
        destination.unlink()
    for attempt in range(1, retries + 1):
        offset = destination.stat().st_size if destination.exists() else 0
        headers = {"Range": f"bytes={offset}-"} if offset else {}
        try:
            with requests.get(url, headers=headers, stream=True, allow_redirects=True, timeout=(60, 300)) as response:
                if response.status_code == 416 and expected == offset:
                    return
                response.raise_for_status()
                append = offset > 0 and response.status_code == 206
                mode = "ab" if append else "wb"
                if not append:
                    offset = 0
                with destination.open(mode) as target:
                    for chunk in response.iter_content(8 * 1024 * 1024):
                        if chunk:
                            target.write(chunk)
            if not expected or destination.stat().st_size == expected:
                print(f"downloaded: {destination.name}")
                return
            raise IOError(f"incomplete file: {destination.stat().st_size}/{expected}")
        except Exception:
            if attempt == retries:
                raise
            time.sleep(min(30, attempt * 3))


RUNTIME = WORK / "runtime"
SERVER_BIN = RUNTIME / "trellis-server"
if not SERVER_BIN.exists():
    compute_cap = subprocess.check_output(
        ["nvidia-smi", "--query-gpu=compute_cap", "--format=csv,noheader"], text=True
    ).strip().splitlines()[0]
    backend = "cuda12" if float(compute_cap) < 7.5 else "cuda"
    archive = WORK / f"trellis-{backend}-linux-x64.tar.gz"
    download_resume(
        f"https://github.com/pwilkin/trellis.cpp/releases/latest/download/trellis-{backend}-linux-x64.tar.gz",
        archive,
    )
    RUNTIME.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as bundle:
        bundle.extractall(RUNTIME)
    SERVER_BIN.chmod(0o755)

MODELS = WORK / "models"
MODEL_NAMES = [
    "birefnet.gguf", "dinov3.gguf", "ss_flow.gguf", "ss_dec.gguf",
    "shape_flow_512.gguf", "shape_flow_1024.gguf", "shape_dec.gguf",
    "tex_flow_512.gguf", "tex_flow_1024.gguf", "tex_dec.gguf",
]
for model_name in MODEL_NAMES:
    download_resume(
        f"https://huggingface.co/ilintar/trellis2-gguf/resolve/main/q8/{model_name}",
        MODELS / model_name,
    )
print("TRELLIS.2 Q8 is ready")

server = None
server_log = None
server_url = None


def stop_server():
    global server, server_log
    if server is not None and server.poll() is None:
        server.terminate()
        try:
            server.wait(timeout=20)
        except subprocess.TimeoutExpired:
            server.kill()
    if server_log is not None:
        server_log.close()
    server = None
    server_log = None


def start_server():
    global server, server_log, server_url
    stop_server()
    with socket.socket() as free_socket:
        free_socket.bind(("127.0.0.1", 0))
        port = free_socket.getsockname()[1]
    server_url = f"http://127.0.0.1:{port}"
    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = f"{RUNTIME}:{env.get('LD_LIBRARY_PATH', '')}"
    log_path = WORK / f"trellis-server-{port}.log"
    server_log = open(log_path, "w")
    server = subprocess.Popen(
        [str(SERVER_BIN), "--models", str(MODELS), "--host", "127.0.0.1", "--port", str(port), "--res", "1024", "--require-gpu"],
        stdout=server_log,
        stderr=subprocess.STDOUT,
        env=env,
    )
    for _ in range(180):
        try:
            if requests.get(f"{server_url}/health", timeout=2).ok:
                print(f"server ready: {server_url}")
                return
        except requests.RequestException:
            pass
        if server.poll() is not None:
            raise RuntimeError(log_path.read_text()[-5000:])
        time.sleep(2)
    raise TimeoutError("TRELLIS server did not become ready")


PRODUCTS = [
    ("98232", "Patricia"),
    ("108501", "Glenda"),
    ("90157", "Brooke green"),
    ("89099", "Brooke grey"),
    ("71939", "Cazar"),
]
for sku, _ in PRODUCTS:
    source = BASE / f"{sku}-single.jpg"
    if not source.exists():
        raise FileNotFoundError(f"Upload {source.name} before starting this script")

start_server()
progress = {}
for index, (sku, name) in enumerate(PRODUCTS, 1):
    source = BASE / f"{sku}-single.jpg"
    output = OUTPUTS / f"hugge-{sku}-trellis2-q8-pbr.glb"
    for attempt in range(1, 4):
        print(f"[{index}/5] {name}, attempt {attempt}/3")
        try:
            with source.open("rb") as image:
                response = requests.post(
                    f"{server_url}/generate",
                    files={"image": (source.name, image, "image/jpeg")},
                    data={"seed": sku, "resolution": "1024", "bg_removal": "birefnet"},
                    timeout=3600,
                )
            response.raise_for_status()
            output.write_bytes(response.content)
            if output.stat().st_size < 100_000:
                raise RuntimeError(f"GLB is too small: {output.stat().st_size}")
            progress[sku] = {"status": "ready", "bytes": output.stat().st_size}
            print(f"[{index}/5] ready: {output.name} ({output.stat().st_size / 1024**2:.1f} MB)")
            break
        except Exception as error:
            progress[sku] = {"status": "retrying" if attempt < 3 else "failed", "error": str(error)}
            print(f"[{index}/5] failed attempt {attempt}: {error}")
            if attempt < 3:
                start_server()
    (OUTPUTS / "progress.json").write_text(json.dumps(progress, indent=2))

archive = pathlib.Path(shutil.make_archive(str(BASE / "hugge-trellis2-qa"), "zip", OUTPUTS))
print(f"QA regeneration complete: {archive}")
from google.colab import files
files.download(str(archive))
