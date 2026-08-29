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
    """Fast box projection that preserves the reconstructed mesh byte-for-byte.

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


def clean_steel_frame(material: trimesh.visual.material.Material) -> trimesh.Trimesh:
    """Build the simple welded tube frame visible in the three product photos."""
    paths: list[list[tuple[float, float, float]]] = []
    for x in (-0.62, 0.62):
        paths.append([
            (x, -0.30, -0.16),
            (x, -0.94, -0.77),
            (x, -0.94, 0.67),
            (x, -0.31, 0.54),
        ])
    paths.extend([
        [(-0.62, -0.91, -0.70), (0.62, -0.91, 0.61)],
        [(0.62, -0.91, -0.70), (-0.62, -0.91, 0.61)],
        [(-0.62, -0.94, 0.67), (0.62, -0.94, 0.67)],
    ])
    parts: list[trimesh.Trimesh] = []
    for path in paths:
        for start, end in zip(path, path[1:]):
            parts.append(trimesh.creation.cylinder(radius=0.021, sections=20, segment=[start, end]))
        for point in path[1:-1]:
            joint = trimesh.creation.icosphere(subdivisions=2, radius=0.0225)
            joint.apply_translation(point)
            parts.append(joint)
    frame = trimesh.util.concatenate(parts)
    frame.visual = trimesh.visual.TextureVisuals(material=material)
    return frame


def main() -> None:
    source, destination = map(Path, sys.argv[1:3])
    mesh = trimesh.load(source, force="mesh", process=False)
    source_bounds = mesh.bounds.copy()

    # The generated file contains a two-triangle parasite attached through a
    # non-manifold edge. Keeping only the 402k-face body removes that defect.
    components = mesh.split(only_watertight=False)
    mesh = max(components, key=lambda part: len(part.faces))
    mesh.update_faces(mesh.nondegenerate_faces(height=1e-10))
    mesh.remove_unreferenced_vertices()
    mesh.fix_normals(multibody=True)

    edge_use = np.bincount(mesh.edges_unique_inverse)
    if not mesh.is_watertight or np.any(edge_use != 2):
        raise RuntimeError("Topology repair failed: output must be closed and manifold")
    if not np.allclose(source_bounds, mesh.bounds, atol=2e-4):
        raise RuntimeError("Repair changed the product silhouette")

    face_centres = mesh.triangles_center
    # In the reconstruction Y is vertical. Everything clearly below the soft
    # seat shell is the welded black steel frame.
    metal_mask = face_centres[:, 1] < -0.285
    upholstery = mesh.submesh([np.flatnonzero(~metal_mask)], append=True, repair=False)
    reconstructed_metal = mesh.submesh([np.flatnonzero(metal_mask)], append=True, repair=False)

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
    metal = clean_steel_frame(metal_material)
    scene = trimesh.Scene()
    scene.add_geometry(textured_upholstery, node_name="Alba upholstery", geom_name="Alba upholstery")
    scene.add_geometry(metal, node_name="Alba steel frame", geom_name="Alba steel frame")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(scene.export(file_type="glb"))
    print({
        "output": str(destination),
        "source_vertices": 201125,
        "repaired_vertices": len(mesh.vertices),
        "repaired_faces": len(mesh.faces),
        "upholstery_faces": len(upholstery.faces),
        "metal_faces": len(metal.faces),
        "replaced_reconstruction_frame_faces": len(reconstructed_metal.faces),
        "watertight": mesh.is_watertight,
        "bounds_preserved": bool(np.allclose(source_bounds, mesh.bounds, atol=2e-4)),
    })


if __name__ == "__main__":
    main()
