"""Bake verified HUGGE product dimensions into TRELLIS GLBs for 1:1 AR."""

import argparse

from pathlib import Path

import numpy as np
import trimesh


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = ROOT / ".tmp-hugge-previews"
DEFAULT_OUTPUT_DIR = ROOT / "public" / "catalog"

# Width, depth, height in centimetres. Values are product specifications, not
# dimensions inferred from the generated mesh or the source photograph.
PRODUCT_DIMENSIONS_CM = {
    "98232": (47.0, 59.0, 82.0),
    "100326": (240.0, 97.0, 75.0),
    "111240": (196.0, 98.0, 91.0),
    "109553": (150.0, 84.0, 78.0),
    "108501": (59.5, 61.5, 99.0),
    "107376": (191.0, 84.0, 78.0),
    "102923": (40.0, 40.0, 51.0),
    "100489": (100.0, 50.0, 75.0),
    "98600": (115.0, 115.0, 75.0),
    "90157": (58.5, 59.0, 88.5),
    "89099": (58.5, 59.0, 88.5),
    "71939": (69.0, 78.5, 90.5),
    "35348": (120.0, 60.0, 75.0),
    "90315": (40.0, 40.0, 51.0),
    "85345": (110.0, 50.0, 77.1),
}


def target_xyz(extents: np.ndarray, dimensions_cm: tuple[float, float, float]) -> np.ndarray:
    """Use glTF's project convention: X=width, Y=height and Z=depth."""
    _ = extents
    width, depth, height = np.asarray(dimensions_cm, dtype=np.float64) / 100.0
    return np.array([width, height, depth], dtype=np.float64)


def materialize(
    sku: str,
    dimensions_cm: tuple[float, float, float],
    source_dir: Path,
    output_dir: Path,
) -> Path:
    corrected = source_dir / f"hugge-{sku}-trellis2-q8-pbr-corrected.glb"
    source = corrected if corrected.exists() else source_dir / f"hugge-{sku}-trellis2-q8-pbr.glb"
    if not source.exists():
        raise FileNotFoundError(source)

    scene = trimesh.load(source, force="scene", process=False)
    extents = scene.extents.astype(np.float64)
    target = target_xyz(extents, dimensions_cm)
    if np.any(extents <= 0):
        raise RuntimeError(f"{sku}: invalid source extents {extents}")

    scale = np.eye(4)
    scale[:3, :3] = np.diag(target / extents)
    scene.apply_transform(scale)

    bounds = scene.bounds
    translate = np.eye(4)
    translate[:3, 3] = [
        -(bounds[0, 0] + bounds[1, 0]) / 2.0,
        -bounds[0, 1],
        -(bounds[0, 2] + bounds[1, 2]) / 2.0,
    ]
    scene.apply_transform(translate)

    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"hugge-{sku}-trellis2-q8-pbr.glb"
    output.write_bytes(scene.export(file_type="glb"))

    check = trimesh.load(output, force="scene", process=False)
    if not np.allclose(check.extents, target, atol=0.002):
        raise RuntimeError(f"{sku}: exported {check.extents}, expected {target}")
    if abs(check.bounds[0, 1]) > 0.002:
        raise RuntimeError(f"{sku}: model is not on the floor: y={check.bounds[0, 1]}")
    print(f"{sku}: {output.name}, extents={check.extents.round(3)} m")
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--skus",
        nargs="+",
        choices=sorted(PRODUCT_DIMENSIONS_CM),
        default=list(PRODUCT_DIMENSIONS_CM),
        help="Only materialize the listed HUGGE product IDs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for sku in args.skus:
        materialize(
            sku,
            PRODUCT_DIMENSIONS_CM[sku],
            args.source_dir.resolve(),
            args.output_dir.resolve(),
        )


if __name__ == "__main__":
    main()
