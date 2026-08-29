from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageFilter


def fabric_maps(size: int = 1024) -> tuple[Image.Image, Image.Image, Image.Image]:
    rng = np.random.default_rng(89990)
    coarse = rng.normal(0, 1, (size // 8, size // 8))
    coarse_image = Image.fromarray(np.uint8(np.clip((coarse + 3) / 6 * 255, 0, 255))).resize((size, size), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(4))
    coarse_array = np.asarray(coarse_image, dtype=np.float32) / 255 - 0.5
    fine = rng.normal(0, 1, (size, size)).astype(np.float32)
    # Fine vertical nap gives velvet a fabric response without baking lighting into the model.
    nap = np.zeros_like(fine)
    for offset in range(5):
        nap += np.roll(fine, offset, axis=0)
    nap /= 5
    height = np.clip(coarse_array * 0.42 + nap * 0.075, -0.5, 0.5)

    base = np.array([76, 78, 81], dtype=np.float32)
    rgb = np.clip(base + height[..., None] * np.array([25, 25, 27]), 0, 255).astype(np.uint8)

    dy, dx = np.gradient(height)
    normal = np.dstack((-dx * 2.0, -dy * 2.0, np.ones_like(height)))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    normal_rgb = np.uint8(np.clip((normal * 0.5 + 0.5) * 255, 0, 255))

    # glTF packs roughness in G and metallic in B.
    mr = np.zeros((size, size, 3), dtype=np.uint8)
    mr[..., 1] = np.uint8(np.clip(222 + height * 16, 190, 245))
    mr[..., 2] = 0
    return Image.fromarray(rgb), Image.fromarray(normal_rgb), Image.fromarray(mr)


def unwrap(mesh: trimesh.Trimesh, material: trimesh.visual.material.Material) -> trimesh.Trimesh:
    """Add UVs without moving vertices or changing faces.

    A dense 402k triangle reconstruction does not need an expensive atlas for a
    directionless velvet weave. Dominant-normal projection avoids stretching on
    the back, seat and rounded sides while keeping the original topology.
    """
    vertices = np.asarray(mesh.vertices)
    normals = np.abs(np.asarray(mesh.vertex_normals))
    bounds = mesh.bounds
    span = np.maximum(bounds[1] - bounds[0], 1e-9)
    scaled = (vertices - bounds[0]) / span
    axis = np.argmax(normals, axis=1)
    uv = np.empty((len(vertices), 2), dtype=np.float32)
    uv[axis == 0] = scaled[axis == 0][:, [2, 1]]
    uv[axis == 1] = scaled[axis == 1][:, [0, 2]]
    uv[axis == 2] = scaled[axis == 2][:, [0, 1]]
    uv *= 7.0
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)
    return mesh


def crossed_sled_base(material: trimesh.visual.material.Material) -> trimesh.Trimesh:
    """Rebuild Alba's two continuous crossed steel runners.

    The image reconstruction captured the upholstered shell well but turned
    the thin black base into four disconnected shards.  The real 89990 base is
    made from two diagonal U-shaped tubes which cross below the seat.  Keeping
    each runner as one continuous polyline prevents floating ends in AR.
    """
    runners = [
        [
            (-0.58, -0.30, -0.30),
            (-0.71, -0.96, 0.54),
            (0.71, -0.96, -0.54),
            (0.58, -0.31, 0.48),
        ],
        [
            (0.58, -0.30, -0.30),
            (0.71, -0.96, 0.54),
            (-0.71, -0.96, -0.54),
            (-0.58, -0.31, 0.48),
        ],
    ]
    parts: list[trimesh.Trimesh] = []
    tube_radius = 0.018
    for runner in runners:
        for start, end in zip(runner, runner[1:]):
            parts.append(
                trimesh.creation.cylinder(
                    radius=tube_radius,
                    sections=24,
                    segment=[start, end],
                )
            )
        # Round the two floor bends so the base reads as bent tubing instead
        # of three cylinders meeting at a hard, broken-looking corner.
        for bend in runner[1:-1]:
            joint = trimesh.creation.icosphere(subdivisions=2, radius=tube_radius * 1.02)
            joint.apply_translation(bend)
            parts.append(joint)

    frame = trimesh.util.concatenate(parts)
    frame.visual = trimesh.visual.TextureVisuals(material=material)
    return frame


def main() -> None:
    source, destination = map(Path, sys.argv[1:3])
    mesh = trimesh.load(source, force="mesh", process=False)
    source_bounds = mesh.bounds.copy()
    source_vertices = len(mesh.vertices)
    source_faces = len(mesh.faces)

    face_centres = mesh.triangles_center
    # Keep the successful reconstructed upholstery untouched.  Only the area
    # clearly below the seat is replaced; this is where the source contains
    # disconnected leg fragments instead of Alba's real crossed sled base.
    damaged_frame_mask = face_centres[:, 1] < -0.32
    upholstery = mesh.submesh([np.flatnonzero(~damaged_frame_mask)], append=True, repair=False)
    damaged_frame_faces = int(damaged_frame_mask.sum())
    if damaged_frame_faces > 25_000:
        raise RuntimeError("Frame cut reached the upholstered shell")

    base, normal, metallic_roughness = fabric_maps()
    fabric_material = trimesh.visual.material.PBRMaterial(
        name="Alba grey velvet VIC",
        baseColorTexture=base,
        normalTexture=normal,
        metallicRoughnessTexture=metallic_roughness,
        baseColorFactor=[255, 255, 255, 255],
        metallicFactor=0.0,
        roughnessFactor=1.0,
    )
    metal_material = trimesh.visual.material.PBRMaterial(
        name="Alba matte black steel",
        baseColorFactor=[12, 13, 15, 255],
        metallicFactor=0.35,
        roughnessFactor=0.62,
    )

    textured_upholstery = unwrap(upholstery, fabric_material)
    metal = crossed_sled_base(metal_material)
    scene = trimesh.Scene()
    scene.add_geometry(textured_upholstery, node_name="Alba upholstery", geom_name="Alba upholstery")
    scene.add_geometry(metal, node_name="Alba crossed sled base", geom_name="Alba crossed sled base")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(scene.export(file_type="glb"))
    print({
        "output": str(destination),
        "source_vertices": source_vertices,
        "source_faces": source_faces,
        "preserved_upholstery_faces": len(upholstery.faces),
        "replaced_damaged_frame_faces": damaged_frame_faces,
        "upholstery_faces": len(upholstery.faces),
        "metal_faces": len(metal.faces),
        "upholstery_geometry_changed": False,
        "base_rebuilt": True,
        "source_bounds": source_bounds.tolist(),
    })


if __name__ == "__main__":
    main()
