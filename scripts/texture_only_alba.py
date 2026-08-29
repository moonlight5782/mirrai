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


def main() -> None:
    source, destination = map(Path, sys.argv[1:3])
    mesh = trimesh.load(source, force="mesh", process=False)
    source_bounds = mesh.bounds.copy()
    source_vertices = len(mesh.vertices)
    source_faces = len(mesh.faces)

    face_centres = mesh.triangles_center
    # Material assignment only: every original face goes to exactly one output
    # primitive. No geometry is removed, repaired, remeshed or regenerated.
    metal_mask = face_centres[:, 1] < -0.285
    upholstery = mesh.submesh([np.flatnonzero(~metal_mask)], append=True, repair=False)
    metal = mesh.submesh([np.flatnonzero(metal_mask)], append=True, repair=False)
    if len(upholstery.faces) + len(metal.faces) != source_faces:
        raise RuntimeError("Texture-only export lost source faces")

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
    metal.visual = trimesh.visual.TextureVisuals(material=metal_material)
    scene = trimesh.Scene()
    scene.add_geometry(textured_upholstery, node_name="Alba upholstery", geom_name="Alba upholstery")
    scene.add_geometry(metal, node_name="Alba original steel frame", geom_name="Alba original steel frame")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(scene.export(file_type="glb"))
    output_bounds = np.vstack((textured_upholstery.bounds, metal.bounds))
    bounds_preserved = np.allclose(source_bounds[0], output_bounds.min(axis=0), atol=1e-7) and np.allclose(source_bounds[1], output_bounds.max(axis=0), atol=1e-7)
    if not bounds_preserved:
        raise RuntimeError("Texture-only export changed source bounds")
    print({
        "output": str(destination),
        "source_vertices": source_vertices,
        "source_faces": source_faces,
        "output_faces": len(upholstery.faces) + len(metal.faces),
        "upholstery_faces": len(upholstery.faces),
        "metal_faces": len(metal.faces),
        "geometry_changed": False,
        "bounds_preserved": bool(bounds_preserved),
    })


if __name__ == "__main__":
    main()
