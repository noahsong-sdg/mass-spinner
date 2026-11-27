import copy
import unittest

from compare_assembly import compare, signature


class AssemblyParityTests(unittest.TestCase):
    def fixture(self):
        extras = dict(componentId="vessel", renderName="Washer", materialBasis="Steel", geometryBasis="Illustrative")
        return {"nodes": [{"children": [1, 2], "extras": {"anchorFraction": .5}},
                          {"name": "Washer", "mesh": 0, "extras": extras, "translation": [0, 0, -.01]},
                          {"name": "Washer.001", "mesh": 0, "extras": extras, "translation": [0, 0, .01]}],
                "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "material": 0}]}],
                "accessors": [{"min": [-.001, -.001, 0], "max": [.001, .001, .001]}],
                "materials": [{"name": "Steel"}]}

    def test_duplicate_name_renumbering_preserves_semantic_geometry(self):
        old = self.fixture()
        new = copy.deepcopy(old)
        new["nodes"][1]["name"], new["nodes"][2]["name"] = "Washer.001", "Washer"
        compare(signature(old), signature(new))

    def test_real_displacement_component_change_or_missing_part_rejects(self):
        old = self.fixture()
        for edit in [lambda d: d["nodes"][1].update(translation=[0, 0, .02]),
                     lambda d: d["nodes"][1].update(extras={**d["nodes"][1]["extras"], "componentId": "coil"}),
                     lambda d: d["nodes"][2].pop("mesh")]:
            changed = copy.deepcopy(old)
            edit(changed)
            with self.assertRaises(AssertionError):
                compare(signature(old), signature(changed))
