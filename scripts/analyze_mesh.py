from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh


def main() -> None:
    mesh = trimesh.load(Path(sys.argv[1]), force="mesh", process=False)
    edge_use = np.bincount(mesh.edges_unique_inverse)
    components = mesh.split(only_watertight=False)
    sizes = sorted(((len(part.faces), len(part.vertices), part.is_watertight) for part in components), reverse=True)
    print({
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "bounds": mesh.bounds.tolist(),
        "extents": mesh.extents.tolist(),
        "watertight": mesh.is_watertight,
        "winding_consistent": mesh.is_winding_consistent,
        "euler_number": mesh.euler_number,
        "components": len(components),
        "boundary_edges": int(np.count_nonzero(edge_use == 1)),
        "nonmanifold_edges": int(np.count_nonzero(edge_use > 2)),
        "duplicate_faces": int(len(mesh.faces) - len(np.unique(np.sort(mesh.faces, axis=1), axis=0))),
        "degenerate_faces": int(np.count_nonzero(mesh.area_faces < 1e-12)),
        "component_sizes_top20": sizes[:20],
    })


if __name__ == "__main__":
    main()
