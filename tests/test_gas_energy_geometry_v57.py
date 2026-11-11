"""Regress cumulative-shell export roundoff; execute only in safe-dev."""
import importlib.util
import json
import math
from pathlib import Path
import unittest

import numpy as np

SPEC = importlib.util.spec_from_file_location('gas_energy_independent_audit',
    Path(__file__).resolve().parents[1]/'scientific/gas-energy-v57/audit-independent.py')
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


def fine_shell_states():
    # Match the real output path: fixed particles -> pV=NkT -> cumulative
    # volumes -> sqrt radii -> serialized radii -> shell-volume differences.
    length, radius, cells = .8, .12, 512
    reference = np.linspace(0., radius, cells+1)
    volume = math.pi*length*radius**2
    number = 1000*math.pi*length*np.diff(reference**2)/(audit.KB*500)
    rng = np.random.default_rng(571)
    for unused in range(16):
        old = 500+rng.uniform(-1., 1., cells)
        new = old+rng.uniform(-.001, .001, cells)
        def state(t):
            p = audit.KB*float(np.dot(number, t))/volume
            ideal = number*audit.KB*t/p
            edges = np.sqrt(np.r_[0., np.cumsum(ideal)]/(math.pi*length))
            reconstructed = math.pi*length*np.diff(edges)*(edges[:-1]+edges[1:])
            return p, edges, reconstructed
        yield number, new, old, state(new), state(old), length


class FineGeometryRoundoff(unittest.TestCase):
    def test_fine_export_pressure_work_identity_has_propagated_edge_budget(self):
        for number, new, old, after, before, length in fine_shell_states():
            p, edges, vi = after
            pold, oldedges, vold = before
            audit.check_pressure_work_identity(number, new, old, p, pold, vi, vold, edges, oldedges, length)

    def test_actual_512_shell_failure_has_correct_geometric_roundoff_budget(self):
        fixture = json.loads((Path(__file__).with_name('fixtures')/'gas57-geometry-roundoff-512.json').read_text())
        self.assertEqual(fixture['gasCells'], 512)
        self.assertEqual(fixture['resultsSHA256'], '91755ba914e0df83a0c7472fa59429a24785149b177a5d7c426137618c4326cb')
        number, new, old = (np.asarray([fixture[key]]) for key in ('number', 'newK', 'oldK'))
        edges, oldedges = np.asarray(fixture['newEdgesM']), np.asarray(fixture['oldEdgesM'])
        length, p, pold = fixture['lengthM'], fixture['newPressurePa'], fixture['oldPressurePa']
        vi = math.pi*length*np.diff(edges)*(edges[:-1]+edges[1:])
        vold = math.pi*length*np.diff(oldedges)*(oldedges[:-1]+oldedges[1:])
        result = audit.check_pressure_work_identity(number, new, old, p, pold, vi, vold, edges, oldedges, length)
        self.assertGreater(result['storedEnergyOnlyBudgetRatio'], 1., 'Actual failed record must reproduce the old budget error')
        self.assertLessEqual(result['geometryBudgetRatio'], 1.)

    def test_real_geometry_corruption_is_not_hidden_by_roundoff_budget(self):
        number, new, old, after, before, length = next(fine_shell_states())
        p, edges, unused = after
        pold, oldedges, vold = before
        changed = edges.copy()
        changed[-2] *= 1.000001
        self.assertTrue(np.all(np.diff(changed)>0))
        corrupted = math.pi*length*np.diff(changed)*(changed[:-1]+changed[1:])
        with self.assertRaises(AssertionError):
            audit.check_pressure_work_identity(number, new, old, p, pold, corrupted, vold, changed, oldedges, length)


if __name__ == '__main__':
    unittest.main()
