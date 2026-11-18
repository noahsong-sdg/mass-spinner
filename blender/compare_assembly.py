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
    # Blender's numeric duplicate-name suffixes can be allocated in a new order.
    # Match geometric instances by semantic role, ancestor pose and material.
    parents = {}
    for i, parent in enumerate(doc["nodes"]):
        for child in parent.get("children", []):
            assert child not in parents, "Multiple parents are outside the canonical assembly contract"
            parents[child] = i
    groups = {}
    for i, node in enumerate(doc["nodes"]):
        if "mesh" not in node:
            continue
        extras = node["extras"]
        assert all(isinstance(extras.get(key), str) and extras[key] for key in
                   ("componentId", "renderName", "materialBasis", "geometryBasis"))
        primitives = doc["meshes"][node["mesh"]]["primitives"]
        values = []
        for primitive in primitives:
            position = doc["accessors"][primitive["attributes"]["POSITION"]]
            values.extend(position["min"] + position["max"])
        chain = []
        while True:
            item = doc["nodes"][i]
            assert "matrix" not in item, "Unexpected canonical assembly transform representation"
            q = item.get("rotation", [0, 0, 0, 1])
            if q[-1] < 0:
                q = [-value for value in q]
            values.extend(item.get("translation", [0, 0, 0]) + q + item.get("scale", [1, 1, 1]))
            chain.append(item.get("extras", {}) if "mesh" not in item else {})
            if i not in parents:
                break
            i = parents[i]
        key = json.dumps([extras, chain, [doc["materials"][p["material"]]["name"] for p in primitives]], sort_keys=True)
        groups.setdefault(key, []).append(values)
    return {key: sorted(instances) for key, instances in groups.items()}


def compare(old, new):
    assert old.keys() == new.keys(), "Component ownership, ancestry or material assignment changed"
    for key, before in old.items():
        after = new[key]
        assert len(before) == len(after), "Selectable instance count changed"
        for a, b in zip(before, after):
            assert len(a) == len(b) and max(abs(x-y) for x, y in zip(a, b)) < 1e-6, key + ": SI geometry changed"


if __name__ == "__main__":
    old, new = [signature(document(path)) for path in sys.argv[1:]]
    compare(old, new)
    print(f"{sum(map(len, new.values()))} selectable mesh nodes preserve metadata, material ownership and SI bounds to 1 micrometre")
