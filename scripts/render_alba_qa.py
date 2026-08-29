"""Small deterministic orthographic renderer for Alba material QA."""

from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "public/catalog/alba-chair-hunyuan2mv-pbr.glb"
OUTPUT = ROOT / ".tmp-alba-pbr-qa.png"
VIEW_SIZE = (600, 500)


def render_view(scene: trimesh.Scene, angle: float) -> Image.Image:
    width, height = VIEW_SIZE
    theta = np.deg2rad(angle)
    right = np.array([np.cos(theta), 0.0, -np.sin(theta)])
    camera = np.array([np.sin(theta), 0.0, np.cos(theta)])
    light = camera * 0.7 + np.array([0.0, 0.7, 0.0])
    light /= np.linalg.norm(light)

    triangles = []
    for name, geom in scene.geometry.items():
        verts = geom.vertices
        faces = geom.faces
        tri = verts[faces]
        centers = tri.mean(axis=1)
        normals = geom.face_normals
        base = np.array([82, 84, 88] if "Upholstery" in name else [31, 33, 37], dtype=float)
        diffuse = 0.55 + 0.45 * np.abs(normals @ light)
        colors = np.clip(base[None, :] * diffuse[:, None], 0, 255).astype(np.uint8)
        triangles.append((tri, centers @ camera, colors))

    tri = np.concatenate([item[0] for item in triangles])
    depth = np.concatenate([item[1] for item in triangles])
    colors = np.concatenate([item[2] for item in triangles])
    order = np.argsort(depth)

    projected_x = tri @ right
    projected_y = tri[:, :, 1]
    margin = 38
    span_x = max(projected_x.max() - projected_x.min(), 1e-6)
    span_y = max(projected_y.max() - projected_y.min(), 1e-6)
    scale = min((width - margin * 2) / span_x, (height - margin * 2) / span_y)
    x = (projected_x - (projected_x.min() + projected_x.max()) / 2) * scale + width / 2
    y = height - ((projected_y - projected_y.min()) * scale + margin)

    image = Image.new("RGB", VIEW_SIZE, (235, 231, 222))
    draw = ImageDraw.Draw(image)
    for index in order:
        points = [(float(x[index, i]), float(y[index, i])) for i in range(3)]
        draw.polygon(points, fill=tuple(int(value) for value in colors[index]))
    draw.text((18, 16), f"{int(angle)}°", fill=(30, 30, 30))
    return image


def main() -> None:
    scene = trimesh.load(MODEL, force="scene", process=False)
    canvas = Image.new("RGB", (VIEW_SIZE[0] * 2, VIEW_SIZE[1] * 2), (220, 216, 208))
    for index, angle in enumerate((0, 90, 180, 270)):
        canvas.paste(render_view(scene, angle), ((index % 2) * VIEW_SIZE[0], (index // 2) * VIEW_SIZE[1]))
    canvas.save(OUTPUT, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
