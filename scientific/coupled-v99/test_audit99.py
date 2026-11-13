"""Admission and conservation corruptions, plus independent panel integral tests."""
import copy
import gzip
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from audit99 import audit, edges, metrics, panels, primitive, sha, unit_clock, ROOT, SOURCES, JOBS, TIMES


class AuditControls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root/'result'
        (self.out/'fields').mkdir(parents=True)
        for name in SOURCES:
            path = self.root/name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT/name).read_bytes() if name == SOURCES[-1] else b'frozen source\n')
        baseline_raw = (self.root/SOURCES[-1]).read_bytes()
        baseline = json.loads(baseline_raw)
        self.data = dict(manifest=baseline['manifest'], scenario=baseline['scenarios'][0],
            timesS=list(TIMES), baselinePredictionSHA256=sha(baseline_raw),
            sourceSHA256={p: sha((self.root/p).read_bytes()) for p in SOURCES},
            targetVelocityRead=False, currentFitted=False, velocityFitted=False,
            experimentalQualification=False, conditionalRelease=True, cases=[])
        self.states = {}
        for n, cfl in sorted(JOBS):
            r, z = edges(n)
            rc = (2/3)*np.diff(r**3)/np.diff(r*r)
            zc = (z[1:]+z[:-1])/2
            rr, zz = np.meshgrid(rc, zc)
            volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
            mass = .001*(1+.1*rr/.06)*volume
            omega = 100*(1-rr/.06)*(1-zz/.24)
            inertia = mass*(r[1:]**2+r[:-1]**2)/2
            energy = 1.5*1.380649e-23*(mass/(39.948*1.66053906660e-27))*2900*(1+.1*zz/.24)+.5*inertia*omega**2
            q = np.array([mass, mass*0, mass*0, inertia*omega, energy, mass*.5])
            p = primitive(r, z, q)
            unit = unit_clock(r, z, q)
            overlap = np.maximum(0., np.minimum(r[1:], .004)**2-r[:-1]**2)
            torque = .5*.13*(100*.06**2-np.sum(100*overlap/.004**2*rc**2))
            continuum = .5*.13*100*(.06**2-.004**2/2)
            history, elapsed = [], 0.
            for target in TIMES[1:]:
                while elapsed < target:
                    dt = min(1e-7, target-elapsed, cfl*unit)
                    elapsed += dt
                    history.append(dict(timeS=elapsed, dtS=dt, unitCflStableDtS=unit, actualCfl=cfl,
                        massRelativeDrift=0., speciesRelativeDrift=0., energyRelativeDefect=0.,
                        chargeRelativeResidual=0., angularRelativeDefect=0., electricalWorkJ=0.,
                        ohmicJ=0., emNumericalHeatJ=0., viscousHeatJ=0., viscousNumericalHeatJ=0.,
                        maximumTemperatureK=float(p['temperatureK'].max()), minimumTemperatureK=float(p['temperatureK'].min()),
                        maximumTotalMach=.1, externalAngularImpulseKgM2S=torque*elapsed,
                        wallAngularImpulseKgM2S=-torque*elapsed, hydroAngularDefectKgM2S=0.))
            self.states[n, cfl] = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(), cfl=cfl,
                snapshots=[dict(timeS=t, q=q.tolist(), **{k: v.tolist() for k, v in p.items()}) for t in TIMES],
                history=history, conditionalRelease=True, thermalSteadyState=False, experimentalQualification=False,
                prescribedCurrent=True, absoluteCurrentPrediction=False, discreteTorqueNm=torque,
                continuumDiskTorqueNm=continuum, relativeTorqueFootprintError=abs(torque-continuum)/abs(continuum))
            self.data['cases'].append(dict(label=f'n{n}-c{cfl}', refinement=n, cfl=cfl, nr=16*n, nz=24*n,
                maxDtS=1e-7, anodeCenterM=.07, completed=True, stepCount=len(history), maximumTemperatureK=float(p['temperatureK'].max())))

    def run_audit(self, cfl_field='actualCfl'):
        for case in self.data['cases']:
            if case['completed']:
                state = self.states[case['refinement'], case['cfl']]
                payload = json.dumps(state).encode()
                packed = gzip.compress(payload, mtime=0)
                name = 'fields/'+case['label']+'.json.gz'
                (self.out/name).write_bytes(packed)
                case['fieldPacket'] = dict(path=name, sha256=sha(packed), rawSHA256=sha(payload))
        path = self.out/'predictions.json'
        path.write_text(json.dumps(self.data))
        return audit(path, self.root, cfl_field)

    def test_full_five_case_inventory_reconstructed(self):
        result = self.run_audit()
        self.assertTrue(result['allRequiredNumericalPass'], result['failures'][:3])
        self.assertEqual(result['caseCount'], 5)
        self.assertEqual(len(result['comparisons']), 2*4*7)
        self.assertTrue(all(g['passed'] for g in result['gates'] if g['kind'] in ('distinctClocks', 'snapshotEnergy', 'snapshotAngular')))
        self.assertFalse(result['experimentalQualification'])

    def test_missing_or_duplicate_job_rejected(self):
        saved = copy.deepcopy(self.data)
        self.data['cases'].pop()
        with self.assertRaisesRegex(ValueError, 'job matrix'):
            self.run_audit()
        self.data = saved
        self.data['cases'][-1] = self.data['cases'][0]
        with self.assertRaisesRegex(ValueError, 'job matrix'):
            self.run_audit()

    def test_source_scope_and_actual_clock_corruptions_rejected(self):
        saved = copy.deepcopy(self.data)
        self.data['experimentalQualification'] = True
        with self.assertRaisesRegex(ValueError, 'claim'):
            self.run_audit()
        self.data = saved
        (self.root/SOURCES[0]).write_bytes(b'changed source')
        with self.assertRaisesRegex(ValueError, 'Source seal'):
            self.run_audit()
        (self.root/SOURCES[0]).write_bytes(b'frozen source\n')
        self.states[2, .1]['history'][0]['unitCflStableDtS'] *= 2
        with self.assertRaisesRegex(ValueError, 'CFL'):
            self.run_audit()

    def test_nonfinite_and_recomputed_primitive_corruptions_rejected(self):
        saved = copy.deepcopy(self.states)
        self.states[1, .1]['snapshots'][0]['q'][0][0][0] = float('nan')
        with self.assertRaisesRegex(ValueError, 'conserved state'):
            self.run_audit()
        self.states = saved
        self.states[1, .1]['snapshots'][0]['temperatureK'][0][0] *= 1.1
        with self.assertRaisesRegex(ValueError, 'Corrupt primitive'):
            self.run_audit()

    def test_failed_trajectory_and_conservation_failures_preserved(self):
        self.data['cases'][0]['completed'] = False
        result = self.run_audit()
        self.assertFalse(result['allRequiredNumericalPass'])
        self.assertTrue(any(g['kind'] == 'completion' for g in result['failures']))
        self.data['cases'][0]['completed'] = True
        s = self.states[1, .1]['snapshots'][2]
        q = np.asarray(s['q'])
        q[3] *= 1.01
        s.update(q=q.tolist(), **{k: v.tolist() for k, v in primitive(*edges(1), q).items()})
        # Match the separately checked temperature summary, leaving forged zero
        # history conservation claims for the independent snapshot check to catch.
        h = next(h for h in self.states[1, .1]['history'] if h['timeS'] == s['timeS'])
        h['maximumTemperatureK'] = max(map(max, s['temperatureK']))
        result = self.run_audit()
        self.assertFalse(result['allRequiredNumericalPass'])
        self.assertTrue(any(g['kind'] == 'snapshotAngular' for g in result['failures']))

    def test_nested_geometry_and_exact_panel_integral(self):
        r, z = edges(1)
        r2, z2 = edges(2)
        np.testing.assert_allclose(r2[::2], r, rtol=0, atol=1e-16)
        np.testing.assert_allclose(z2[::2], z, rtol=0, atol=1e-16)
        a, b = self.states[1, .1], self.states[2, .1]
        values = []
        # Integrand (1+r+z+r*z)^2 is bilinear-squared; including cylindrical
        # metric has radial degree3 and axial degree2, exact at order2.
        for order in (2, 3):
            points, weight = panels(a, b, order)
            zz, rr = points.T
            values.append(float(weight@((1+rr+zz+rr*zz)**2)))
        R, L = .06, .24
        expected = 2*np.pi*(R**2/2+2*R**3/3+R**4/4)*(L+L**2+L**3/3)
        np.testing.assert_allclose(values, expected, rtol=2e-14, atol=0)
        first, second = metrics(a, b, 0, 2), metrics(a, b, 0, 3)
        for name in first:
            self.assertAlmostEqual(first[name]['errorIntegral'], second[name]['errorIntegral'], delta=1e-12)

    def test_legacy_and_renamed_configured_cfl_require_explicit_schema(self):
        result = self.run_audit()
        self.assertIn('actualCfl stores configured bound', result['cflMetadataInterpretation'])
        for state in self.states.values():
            for h in state['history']:
                h['cflBound'] = h.pop('actualCfl')
        with self.assertRaises(KeyError):
            self.run_audit()
        result = self.run_audit('cflBound')
        self.assertIn('cflBound stores configured bound', result['cflMetadataInterpretation'])

    def test_packet_and_baseline_seals_reject_tampering(self):
        self.run_audit()
        path = self.out/'predictions.json'
        packet = json.loads(path.read_text())
        packet['cases'][0]['fieldPacket']['sha256'] = '0'*64
        path.write_text(json.dumps(packet))
        with self.assertRaisesRegex(ValueError, 'Field seal'):
            audit(path, self.root)
        self.run_audit()
        (self.root/SOURCES[-1]).write_bytes(b'changed baseline')
        with self.assertRaisesRegex(ValueError, 'Baseline seal'):
            audit(path, self.root)


if __name__ == '__main__':
    unittest.main()
