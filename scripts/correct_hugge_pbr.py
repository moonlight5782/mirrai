"""Apply product-specific, non-destructive PBR corrections to TRELLIS GLBs."""

import argparse
from pathlib import Path

import trimesh


# TRELLIS reproduced the geometry well but introduced a warm magenta cast on
# the two neutral beige Ria fabrics. Reducing only the red multiplier restores
# the neutral catalog tone while retaining the generated texture detail.
BASE_COLOR_TINTS = {
    "109553": [235, 255, 255, 255],
    "107376": [235, 255, 255, 255],
}


def correct(source: Path, destination: Path, sku: str) -> None:
    scene = trimesh.load(source, force="scene", process=False)
    tint = BASE_COLOR_TINTS.get(sku)
    if tint is not None:
        for geometry in scene.geometry.values():
            geometry.visual.material.baseColorFactor = tint
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(trimesh.exchange.gltf.export_glb(scene, include_normals=True))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--sku", required=True)
    args = parser.parse_args()
    correct(args.source, args.destination, args.sku)
