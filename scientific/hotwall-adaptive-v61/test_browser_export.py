"""VM-only controls for the streaming browser-download auditor."""
import copy
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import tempfile
import unittest

import ijson

spec = importlib.util.spec_from_file_location('browser_audit', Path(__file__).with_name('check-browser-export.py'))
auditor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auditor)


class BrowserAuditTest(unittest.TestCase):
    def test_canonical_budget_and_stream_controls(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'src').mkdir()
            (root/'src/fuel-time-control.ts').write_text('test source identity')
            files = {'src/fuel-time-control.ts': hashlib.sha256((root/'src/fuel-time-control.ts').read_bytes()).hexdigest()}
            identity = {'schemaVersion': 1, 'algorithm': 'sha256', 'sourceFiles': files,
                        'sourceHash': hashlib.sha256(json.dumps(files, separators=(',', ':')).encode()).hexdigest()}
            config = {'radiusM': .12, 'lengthM': .8, 'pressurePa': 10., 'gasK': 500., 'linerK': 1000.,
                      'lightFraction': .5, 'durationS': 1.}
            cells = 256
            number = 10*math.pi*.12**2*.8/(1.380649e-23*500)
            unit_energy = 1.5*1.380649e-23*(number/cells)*500
            gas = {'cellEnergyJ': [unit_energy]*cells, 'temperatureK': [500.]*cells, 'pressurePa': [10.]*cells,
                   'radiusM': [.12*math.sqrt((i+.5)/cells) for i in range(cells)],
                   'speciesEnergyJ': [[unit_energy/2]*cells, [unit_energy/2]*cells],
                   'energyJ': unit_energy*cells, 'meanK': 500., 'minK': 500., 'maxK': 500.}
            radii = [.12+(i+.5)*.001/16 for i in range(16)]
            solid = {'cellEnergyJ': [1.]*16, 'temperatureK': [1000.]*16, 'radiusM': radii,
                     'energyJ': 16., 'meanK': 1000., 'minK': 1000., 'maxK': 1000., 'innerK': 1000., 'outerK': 1000.}
            state = {'timeS': 0., 'lightMass': [1/cells]*cells, 'heavyMass': [1/cells]*cells,
                     'ionAngularMomentumKgM2S': 0., 'neutralAngularMomentumKgM2S': 0., 'ionRadS': 0., 'neutralRadS': 0.,
                     'neutralInertiaKgM2': 1., 'neutralInertiaRatio': 1., 'ionPhaseRad': 0., 'neutralPhaseRad': 0.,
                     'angularMomentum': {'driveImpulseKgM2S': 0., 'dragImpulseKgM2S': 0., 'residualKgM2S': 0., 'relativeResidual': 0.},
                     'energy': dict.fromkeys(('kineticJ', 'driveWorkJ', 'slipDissipationJ', 'dragDissipationJ', 'redistributionWorkJ', 'numericalDissipationJ', 'residualJ', 'relativeResidual'), 0.),
                     'thermal': {'gas': gas, 'spatial': solid, 'gasK': 500., 'linerK': 1000., 'gasEnergyJ': gas['energyJ'],
                                 'linerEnergyJ': 16., 'pressurePa': 10., 'ohmicEnergyJ': 0., 'coolingEnergyJ': 0., 'residualJ': 0., 'relativeResidual': 0.}}
            control = {'method': 'BE step doubling', 'relativeTolerance': 6.25e-7, 'temperatureToleranceK': 1e-7,
                       'maxErrorRatio': 0., 'acceptedPairs': 1, 'rejectedSteps': 0, 'startTimeS': 0.}
            data = {'model': 'marathon-centrifuge', 'result': {'config': config,
                'fuelCycle': {'burnTritonsS': 354631197412543370000}, 'transport': {
                'cells': cells, 'steps': 512, 'timeControl': control, 'operation': {'events': [], 'thermal': {
                    'enabled': True, 'spatial': {'material': 'tungsten', 'cells': 16}, 'gas': {'accuracy': {
                        'relativeTolerance': 6.25e-7, 'temperatureToleranceK': 1e-7}}}},
                'mechanics': {'ii': 1., 'nn': 1.}, 'speciesMassKg': [1., 2.],
                'thermalLiner': {'massesKg': [1.]*16, 'radiusCentersM': radii},
                'checkpoints': [{**copy.deepcopy(state), 'timeS': time} for time in (0., .5, 1.)]}}, 'producingCode': identity}
            path = root/'download.json'
            path.write_text(json.dumps(data))
            self.assertEqual(auditor.audit(path, root)['acceptedKnots'], 3)
            compressed = root/'download.json.gz'
            with gzip.open(compressed, 'wt') as stream:
                json.dump(data, stream)
            self.assertEqual(auditor.audit(compressed, root)['acceptedKnots'], 3)
            for corruption in ('negative_residual', 'species_energy', 'independent_ledger', 'truncated', 'trailing'):
                damaged = copy.deepcopy(data)
                last = damaged['result']['transport']['checkpoints'][-1]
                if corruption == 'negative_residual':
                    last['thermal']['relativeResidual'] = -1.
                elif corruption == 'species_energy':
                    last['thermal']['gas']['speciesEnergyJ'][0][0] *= 2
                elif corruption == 'independent_ledger':
                    last['angularMomentum']['driveImpulseKgM2S'] = 1.
                text = json.dumps(damaged)
                if corruption == 'truncated':
                    text = text[:-1]
                elif corruption == 'trailing':
                    text += '{}'
                path.write_text(text)
                with self.subTest(corruption=corruption), self.assertRaises((AssertionError, ijson.JSONError)):
                    auditor.audit(path, root)


if __name__ == '__main__':
    unittest.main()
