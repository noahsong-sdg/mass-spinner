"""Verify LTS export preserves component ownership and local SI mesh bounds."""
import json
from pathlib import Path
import struct
import sys


def document(path):
    data = Path(path).read_bytes()
    magic, version, size = struct.unpack_from("<III", data)
    assert magic == 0x46546C67 and version == 2 and size == len(data)
    length, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4E4F534A
    return json.loads(data[20:20 + length])


def signature(doc):
    nodes = {}
    for node in doc["nodes"]:
        if "mesh" not in node:
            continue
        name = node["name"]
        assert name not in nodes, "Duplicate selectable mesh name"
        extras = node["extras"]
        assert all(isinstance(extras.get(key), str) and extras[key] for key in
                   ("componentId", "renderName", "materialBasis", "geometryBasis"))
        primitives = doc["meshes"][node["mesh"]]["primitives"]
        bounds = [(doc["accessors"][p["attributes"]["POSITION"]]["min"],
                   doc["accessors"][p["attributes"]["POSITION"]]["max"])
                  for p in primitives]
        nodes[name] = {"extras": extras, "bounds": bounds,
                       "translation": node.get("translation", [0, 0, 0]),
                       "rotation": node.get("rotation", [0, 0, 0, 1]),
                       "scale": node.get("scale", [1, 1, 1]),
                       "materials": [doc["materials"][p["material"]]["name"] for p in primitives]}
    return nodes


if __name__ == "__main__":
    old, new = [signature(document(path)) for path in sys.argv[1:]]
    assert old.keys() == new.keys(), "Selectable assembly parts changed"
    for name, before in old.items():
        after = new[name]
        assert before["extras"] == after["extras"], name + ": metadata changed"
        assert before["materials"] == after["materials"], name + ": material ownership changed"
        for key in ("translation", "rotation", "scale", "bounds"):
            def flat(value):
                return sum((flat(v) if isinstance(v, (list, tuple)) else [v] for v in value), [])
            a, b = flat(before[key]), flat(after[key])
            assert len(a) == len(b) and max(abs(x-y) for x, y in zip(a, b)) < 1e-6, name + ": SI geometry changed"
    print(f"{len(new)} selectable mesh nodes preserve metadata, material ownership and SI bounds to 1 micrometre")
