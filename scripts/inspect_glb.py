from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


def read_glb(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or length != len(data):
        raise ValueError("Not a valid GLB 2.0 file")
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            return json.loads(chunk.rstrip(b" \0"))
    raise ValueError("GLB has no JSON chunk")


def main() -> None:
    for filename in sys.argv[1:]:
        doc = read_glb(Path(filename))
        print(filename)
        print(" meshes", len(doc.get("meshes", [])), "nodes", len(doc.get("nodes", [])))
        print(" materials", len(doc.get("materials", [])), "textures", len(doc.get("textures", [])), "images", len(doc.get("images", [])))
        for mesh_index, mesh in enumerate(doc.get("meshes", [])):
            for primitive_index, primitive in enumerate(mesh.get("primitives", [])):
                attrs = primitive.get("attributes", {})
                counts = {name: doc["accessors"][index]["count"] for name, index in attrs.items()}
                index_accessor = primitive.get("indices")
                triangles = doc["accessors"][index_accessor]["count"] // 3 if index_accessor is not None else None
                print(f"  mesh {mesh_index} primitive {primitive_index}: attrs={counts}, triangles={triangles}, material={primitive.get('material')}")


if __name__ == "__main__":
    main()
