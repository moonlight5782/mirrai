"""Prepare the Hunyuan Alba mesh for web AR without changing its geometry."""

from pathlib import Path

import numpy as np
import trimesh
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/catalog/alba-chair-hunyuan2mv-candidate.glb"
OUTPUT = ROOT / "public/catalog/alba-chair-hunyuan2mv-pbr.glb"
TARGET_EXTENTS = np.array([0.62, 0.90, 0.86], dtype=np.float64)
REFERENCE = ROOT / "public/catalog-sources/hugge-md/alba-89990-2.jpg"


def rgba(rgb: np.ndarray) -> np.ndarray:
    alpha = np.full((len(rgb), 1), 255, dtype=np.uint8)
    return np.concatenate((np.clip(rgb, 0, 255).astype(np.uint8), alpha), axis=1)


def main() -> None:
    mesh = trimesh.load(SOURCE, force="mesh", process=False)
    source_min, source_max = mesh.bounds

    # Hunyuan exports an arbitrary scale. Bake the exact product dimensions and
    # place the lowest point on the floor so model-viewer uses a true 1:1 size.
    mesh.vertices = (mesh.vertices - source_min) * (TARGET_EXTENTS / (source_max - source_min))
    mesh.vertices[:, 0] -= TARGET_EXTENTS[0] / 2
    mesh.vertices[:, 2] -= TARGET_EXTENTS[2] / 2

    centers = mesh.triangles_center
    height = centers[:, 1] / TARGET_EXTENTS[1]
    outer = np.abs(centers[:, 0]) / (TARGET_EXTENTS[0] / 2)

    # Project the straight product photo onto face centers only for material
    # classification. The dark metal can then be separated from the grey
    # upholstery without cutting or regenerating the mesh.
    reference = np.asarray(Image.open(REFERENCE).convert("RGB"), dtype=np.float32)
    non_white = np.mean(reference, axis=2) < 245.0
    yy, xx = np.where(non_white)
    x0, x1 = int(xx.min()), int(xx.max())
    y0, y1 = int(yy.min()), int(yy.max())
    u = np.clip(centers[:, 0] / TARGET_EXTENTS[0] + 0.5, 0.0, 1.0)
    v = np.clip(1.0 - centers[:, 1] / TARGET_EXTENTS[1], 0.0, 1.0)
    px = np.rint(x0 + u * (x1 - x0)).astype(int)
    py = np.rint(y0 + v * (y1 - y0)).astype(int)
    sampled = reference[py, px]
    luminance = sampled @ np.array([0.2126, 0.7152, 0.0722])

    # The tubular base occupies the lower third of the model and reaches the
    # underside of the seat only near the outer mounting points. Keeping this
    # selection spatial avoids remeshing or damaging the verified thin rods.
    metal_faces = (
        ((height < 0.50) & (luminance < 54.0))
        | (height < 0.11)
        | ((height < 0.42) & (outer > 0.90))
    )
    fabric_faces = ~metal_faces

    fabric = mesh.submesh([fabric_faces], append=True, repair=False)
    metal = mesh.submesh([metal_faces], append=True, repair=False)

    # Fine deterministic variation gives the upholstery a velvet-like response
    # without a heavy bitmap texture. Vertex colors are multiplied by PBR base.
    v = fabric.vertices
    n = fabric.vertex_normals
    weave = (
        np.sin(v[:, 0] * 360.0)
        + np.sin(v[:, 1] * 420.0 + 0.7)
        + np.sin(v[:, 2] * 380.0 + 1.4)
    ) / 3.0
    velvet = 0.92 + 0.07 * weave + 0.05 * np.clip(np.abs(n[:, 2]), 0.0, 1.0)
    fabric_rgb = np.array([92.0, 94.0, 97.0])[None, :] * velvet[:, None]
    fabric.visual = trimesh.visual.ColorVisuals(mesh=fabric, vertex_colors=rgba(fabric_rgb))
    fabric.visual.material = trimesh.visual.material.PBRMaterial(
        name="Alba grey velvet",
        baseColorFactor=[0.72, 0.73, 0.75, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.88,
    )

    metal_rgb = np.tile(np.array([[43, 45, 49]], dtype=np.uint8), (len(metal.vertices), 1))
    _ = metal.vertex_normals
    metal.visual = trimesh.visual.ColorVisuals(mesh=metal, vertex_colors=rgba(metal_rgb))
    metal.visual.material = trimesh.visual.material.PBRMaterial(
        name="Alba matte black metal",
        baseColorFactor=[0.24, 0.25, 0.27, 1.0],
        metallicFactor=0.78,
        roughnessFactor=0.34,
    )

    scene = trimesh.Scene()
    scene.add_geometry(fabric, node_name="Alba_Upholstery", geom_name="Alba_Upholstery")
    scene.add_geometry(metal, node_name="Alba_Metal_Base", geom_name="Alba_Metal_Base")
    OUTPUT.write_bytes(scene.export(file_type="glb"))

    loaded = trimesh.load(OUTPUT, force="scene", process=False)
    extents = loaded.bounds[1] - loaded.bounds[0]
    if not np.allclose(extents, TARGET_EXTENTS, atol=0.002):
        raise RuntimeError(f"Unexpected exported dimensions: {extents}")
    print(f"Wrote {OUTPUT.name}: {OUTPUT.stat().st_size} bytes, extents={extents}")


if __name__ == "__main__":
    main()
