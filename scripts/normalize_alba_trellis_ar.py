"""Bake Alba's catalog dimensions and floor origin into its verified TRELLIS mesh."""

from pathlib import Path
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "public/catalog/alba-chair-trellis2-q8-pbr.glb"
TARGET = np.array([0.62, 0.90, 0.86], dtype=np.float64)  # X width, Y height, Z depth

scene = trimesh.load(MODEL, force="scene", process=False)
source = scene.extents.astype(np.float64)
if np.any(source <= 0):
    raise RuntimeError(f"Invalid Alba bounds: {source}")
scale = np.eye(4)
scale[:3, :3] = np.diag(TARGET / source)
scene.apply_transform(scale)
bounds = scene.bounds
move = np.eye(4)
move[:3, 3] = [-(bounds[0, 0] + bounds[1, 0]) / 2, -bounds[0, 1], -(bounds[0, 2] + bounds[1, 2]) / 2]
scene.apply_transform(move)
MODEL.write_bytes(scene.export(file_type="glb"))
check = trimesh.load(MODEL, force="scene", process=False)
if not np.allclose(check.extents, TARGET, atol=.002) or abs(check.bounds[0, 1]) > .002:
    raise RuntimeError(f"Alba AR normalization failed: {check.extents}, floor={check.bounds[0, 1]}")
print(f"Normalized {MODEL.name}: {check.extents} m, floor={check.bounds[0, 1]:.6f} m")
