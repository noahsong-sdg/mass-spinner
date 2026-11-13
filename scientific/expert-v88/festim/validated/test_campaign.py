"""Adversarial integration checks against the completed native FESTIM campaign."""
import copy
import json
from pathlib import Path
import unittest
import numpy as np
import campaign as c
from oracle import profiles


class NativeLimits(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.results = json.loads(Path("results.json").read_text())
        cls.runs = cls.results["runs"]

    def test_frozen_snapshot_and_native_stack(self):
        self.assertEqual(c.sha("protocol.json"), c.PROTOCOL_SHA)
        self.assertEqual(self.results["provenance"]["festim"], "2.2")
        self.assertEqual(self.results["provenance"]["dolfinx"], "0.11.0")
        self.assertEqual(self.results["provenance"]["mpiSize"], 1)
        self.assertEqual(len(self.runs), 36)
        for name, digest in self.results["provenance"]["moduleSHA256"].items():
            self.assertEqual(c.sha(name), digest)

    def test_initial_state_is_real_initial_condition(self):
        for run in self.runs:
            expected = profiles(run["kind"], c.GRID, 0.)
            for name, values in expected.items():
                # Mesh interpolation is O(h^2); vertices must match exactly.
                step = 256//run["cells"]
                np.testing.assert_allclose(np.array(run["states"][0]["fields"][name])[::step],
                                           values[::step], atol=1e-10, rtol=0)

    def test_recompute_isotope_inventory_from_raw_integrals(self):
        for run in self.runs:
            start = run["states"][0]["integrals"]
            for state in run["states"]:
                actual = state["integrals"]
                for isotope in ["D", "T"]:
                    if isotope in actual:
                        original = start[isotope]+start.get(isotope+"_trapped", 0)
                        current = actual[isotope]+actual.get(isotope+"_trapped", 0)
                        self.assertLess(abs(original-current), 1e-9)

    def test_time_axis_is_actual_solver_time(self):
        for run in self.runs:
            times = [s["time"] for s in run["states"]]
            self.assertEqual(len(times), round(.1/run["dt"])+1)
            np.testing.assert_allclose(np.diff(times), run["dt"], rtol=0, atol=1e-14)
            np.testing.assert_allclose(run["actualTimes"], .1, rtol=0, atol=1e-12)

    def test_closed_heating_energy_balance(self):
        for run in self.runs:
            if run["kind"] == "thermal-diffusion-coupling":
                for state in run["states"]:
                    self.assertLess(abs(state["integrals"]["thermalEnergy"]
                                        -300-1000*state["time"]), 1e-8)

    def test_thermal_coupling_changes_the_transport(self):
        get = lambda kind: next(r for r in self.runs
                 if r["kind"] == kind and r["cells"] == 64 and r["dt"] == .0025)
        warm = np.array(get("thermal-diffusion-coupling")["states"][-1]["fields"]["D"])
        cold = np.array(get("sealed-dt-diffusion")["states"][-1]["fields"]["D"])
        self.assertGreater(np.max(abs(warm-cold)), .03)

    def test_conservation_and_positivity_mutants_fail(self):
        for field, value, gate in [("isotopeResidual", .001, "/inventory"),
                                   ("minimumPopulation", -.01, "/positivity"),
                                   ("minimumVacancy", -.01, "/vacancy")]:
            runs = copy.deepcopy(self.runs)
            target = next(r for r in runs if r["kind"] == "isotope-shared-trap")
            target[field] = value
            failed = [x for x in c.qualify(runs) if not x["passed"]]
            self.assertTrue(any(x["name"].endswith(gate) for x in failed))

    def test_wrong_reference_profile_fails(self):
        runs = copy.deepcopy(self.runs)
        target = next(r for r in runs if r["cells"] == 64 and r["dt"] == .0025)
        target["normalizedErrors"]["D"] = .02
        self.assertTrue(any(not x["passed"] and x["name"].endswith("/profile")
                            for x in c.qualify(runs)))

    def test_saved_qualification_recomputes(self):
        self.assertEqual(c.qualify(self.runs), self.results["checks"])
        self.assertTrue(all(x["passed"] for x in self.results["checks"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
