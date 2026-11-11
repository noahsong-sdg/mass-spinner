"""Admission tests use conserved synthetic fields, never the production solver."""
import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
import numpy as np
from analyze import analyze
from verify import verify, digest, requested, source_hashes, OBS, SERIES
from endpoint_admission import canonical_initial, expected_observables
from mixcheck import graph

HERE = Path(__file__).resolve().parent
KB, U = 1.380649e-23, 1.66053906892e-27


def analytical(diffusion=False):
    meshes = [6, 12, 24, 48, 96]
    report = dict(schemaVersion=1, meshes=meshes, passed=True, gates=[])
    specs = [('tagged', ('normalizedRms',)), ('rotating', ('normalizedMaxSpeciesDensityRate',))] if diffusion else [
        ('acoustic', ('density', 'pressure', 'axialVelocity')),
        ('rotating', ('density', 'radialVelocity', 'temperature', 'angularSpeed'))]
    for name, fields in specs:
        rows = []
        for n in meshes:
            row = dict(n=n, relativeLedgerResidual=dict(mass=0., speciesMass=0., angularMomentum=0., energy=0.))
            row.update({field: 0. for field in fields} if diffusion else dict(normalizedRms={field: 0. for field in fields}))
            row['rotationInvariantNormalizedFlux'] = 0.
            rows.append(row)
            ending = 'noExtraRotationForce' if diffusion and name == 'rotating' else 'closedLedgers'
            report['gates'].append(dict(name=f'{name}:{n}:{ending}', passed=True))
        report[name] = rows
        for field in fields:
            prefix = name if diffusion else name+':'+field
            report['gates'].extend([dict(name=prefix+':finest', value=0., passed=True),
                                    dict(name=prefix+':decreasing', values=[0.]*5, passed=True)])
    return report


def trajectory(m, nr, nz, nt, mode):
    r, z = np.linspace(0, m['radiusM'], nr+1), np.linspace(0, m['lengthM'], nz+1)
    w = np.linspace(r[-1], r[-1]+m['linerThicknessM'], max(2, nr//3)+1)
    setup = dict(r=r.tolist(), z=z.tolist(), wall=w.tolist(), masses=[36*U, 40*U],
                 contactH=m['contactH'], coolingH=m['coolingH'], bathK=m['bathK'],
                 walls=dict(outer=0., lower=0., upper=0.))
    setup['electrical'] = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(), magneticT=m['magneticT'],
        sigmaPerpSM=[m['sigmaPerpSM']]*nr*nz, sigmaParallelSM=[m['sigmaParallelSM']]*nr*nz,
        innerVoltageV=[None]*nz, lowerVoltageV=[0.]*nr, upperVoltageV=[0.]*nr,
        outerVoltageV=(m['outerVoltageV']*np.sin(np.pi*(z[:-1]+z[1:])/(2*z[-1]))).tolist())
    transport = dict(maxLocalScore=0., minimumDensityKgM3=.001, minimumInternalJ=1.)
    source = dict(energy=dict(residual=0., exchangeScale=0., storageAllowance=0.),
                  numericalLossJ=0., electrodeJ=0., bathJ=0., wallWorkJ=0., angularImpulseKgM2S=0.)
    magnetic = dict(jouleJ=0., externalWorkJ=0., angularImpulseKgM2S=0.)
    checks = dict(hydro=transport, diffusion=deepcopy(transport), magnetic=magnetic, source=source)
    q, solid = canonical_initial(dict(setup=setup), m)
    initial = dict(q=q.tolist(), solidK=solid.tolist())
    observables = expected_observables(dict(setup=setup), initial, graph)
    return dict(nr=nr, nz=nz, nt=nt, mode=mode, setup=setup, initialQ=initial['q'], initialSolidK=initial['solidK'],
        cases=[dict(timeS=t, q=deepcopy(initial['q']), solidK=deepcopy(initial['solidK']),
                    observables=deepcopy(observables)) for t in m['timesS']],
        stepChecks=[dict(step=i, timeS=i*max(m['timesS'])/nt, checks=deepcopy(checks)) for i in range(1, nt+1)],
        integrals=dict(electrodeJ=0., wallWorkJ=0., bathJ=0., numericalLossJ=0., radialMotionalJouleJ=0.))


class Admission(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root/'scientific/mixture-axial-v75'
        self.source.mkdir(parents=True)
        for relative in ('scientific/coupled-axial-v74/bridge.py', 'scientific/coupled-axial-v74/bridge.ts',
                         'scientific/coupled-axial-v74/coupled.py', 'scientific/coupled-axial-v74/thermal.py',
                         'scientific/coupled-axial-v74/independent_check.py', 'scientific/axial-v73/torsion.py',
                         'src/fuel-current.ts', 'src/fuel-neutral-transport.ts', 'src/fuel-thermal.ts',
                         'src/fuel-momentum.ts', 'package.json', 'package-lock.json'):
            path = self.root/relative
            path.parent.mkdir(exist_ok=True, parents=True)
            path.write_text('frozen source\n')
        for name in ('run.py', 'analyze.py', 'controls.py', 'flow.py', 'diffusion_controls.py', 'diffusion.py', 'verify.py', 'PROTOCOL.md', 'requirements.txt'):
            (self.source/name).write_text('frozen source\n')
        m = json.loads((HERE/'manifest.json').read_text())
        # Fixed spatial mesh keeps this synthetic, static history's profile
        # differences zero. These fixtures exercise evidence admission, not
        # physical refinement; real coupled/analytic controls test the latter.
        m.update(joint=[[4, 4, 4], [4, 4, 8], [4, 4, 16]],
                 spatial=[[4, 4, 4], [4, 4, 8]], temporal=[[4, 4, 4], [4, 4, 8], [4, 4, 16]],
                 radial=[[4, 4, 4], [4, 4, 8]], axial=[[4, 4, 4], [4, 4, 8]],
                 tighterTolerance=[4, 4, 8], referenceSmallerDt=[4, 4, 32], referenceSpatial=[4, 4, 64])
        (self.source/'manifest.json').write_text(json.dumps(m))
        self.raw = dict(manifest=m, failures=[], sourceHashes=source_hashes(self.source, self.root),
                        preRunRuntime={key: 'test fixture' for key in ('python', 'numpy', 'scipy', 'fipy')},
                        cases=[trajectory(m, *key) for key in sorted(requested(m))])
        self.conv = analyze(self.raw)
        self.conv.update(manifestHash=digest(self.source/'manifest.json'), sourceHashes={'analyze.py': digest(self.source/'analyze.py')})
        self.controls, self.diff = analytical(), analytical(True)
        for report, files in ((self.controls, ('controls.py', 'flow.py')),
                              (self.diff, ('diffusion_controls.py', 'diffusion.py', 'flow.py', 'controls.py'))):
            report['sourceHashes'] = {name: digest(self.source/name) for name in files}
        self.audit = dict(manifest=m, passed=True, sourceHashes=self.raw['sourceHashes'],
                          positiveChecks=deepcopy(self.raw['cases'][0]['stepChecks'][0]['checks']),
                          negativeControls=[dict(name=name, rejected=True) for name in
                                            ('mass', 'species', 'angularMomentum', 'energy', 'enthalpyFlux', 'sourceNumericalHeat')])
        self.paths = [self.root/name for name in ('raw.json', 'convergence.json', 'controls.json', 'diffusion.json', 'audit.json')]

    def save(self, rebind=True):
        self.paths[0].write_text(json.dumps(self.raw))
        if rebind:
            self.conv['inputHashes'] = {self.paths[0].name: digest(self.paths[0])}
        for path, value in zip(self.paths[1:], (self.conv, self.controls, self.diff, self.audit)):
            path.write_text(json.dumps(value))

    def check(self, rebind=True):
        self.save(rebind)
        return verify(*self.paths, source_dir=self.source, projectroot=self.root)

    def reject(self, mutate, pattern=None):
        mutate()
        with self.assertRaisesRegex((AssertionError, KeyError, ValueError, TypeError), pattern or '.'):
            self.check()

    def test_full_frozen_evidence_admitted_without_physical_or_live_claim(self):
        result = self.check()
        self.assertTrue(result['passed'])
        self.assertEqual(result['trajectoryCount'], len(requested(self.raw['manifest'])))
        self.assertFalse(result['experimentalQualified'])
        self.assertFalse(result['liveQualified'])
        self.assertEqual(set(result['artifactHashes']), {'raw', 'convergence', 'controls', 'diffusionControls', 'audit'})
        self.assertEqual(sum(len(s['gates']) for s in self.conv['series'].values()), 615)

    def test_missing_density_or_species_evolution_gate_rejected(self):
        original = deepcopy(self.conv['series']['joint']['gates'])
        for field in ('densityChange', 'YChange'):
            with self.subTest(field=field):
                self.conv['series']['joint']['gates'] = [g for g in original if field not in g['name']]
                with self.assertRaisesRegex(AssertionError, 'refinement gate'):
                    self.check()

    def test_stale_pre_migration_manifest_rejected(self):
        self.raw['manifest'] = deepcopy(self.raw['manifest'])
        self.reject(lambda: self.raw['manifest'].update(schemaVersion=0), 'migrated')

    def test_missing_and_extra_source_hash_rejected(self):
        self.reject(lambda: self.raw['sourceHashes'].update(untracked='bad'), 'source hashes')

    def test_dependency_edited_after_run_rejected(self):
        self.reject(lambda: (self.root/'src/fuel-current.ts').write_text('edited\n'), 'source hashes')

    def test_incomplete_trajectory_or_duplicate_rejected(self):
        for mutation in ('missing', 'duplicate', 'extra'):
            with self.subTest(mutation=mutation):
                saved = deepcopy(self.raw['cases'])
                if mutation == 'missing':
                    self.raw['cases'].pop()
                else:
                    self.raw['cases'].append(deepcopy(saved[0]))
                    if mutation == 'extra':
                        self.raw['cases'][-1]['mode'] = 'invented'
                with self.assertRaisesRegex(AssertionError, 'trajectory'):
                    self.check()
                self.raw['cases'] = saved

    def test_missing_step_wrong_time_and_missing_stage_rejected(self):
        t = self.raw['cases'][0]
        saved = deepcopy(t['stepChecks'])
        for mutation in ('step', 'time', 'kind', 'finite', 'score'):
            with self.subTest(mutation=mutation):
                t['stepChecks'] = deepcopy(saved)
                if mutation == 'step': t['stepChecks'].pop()
                if mutation == 'time': t['stepChecks'][0]['timeS'] *= 2
                if mutation == 'kind': del t['stepChecks'][0]['checks']['magnetic']
                if mutation == 'finite': t['stepChecks'][0]['checks']['hydro']['maxLocalScore'] = float('nan')
                if mutation == 'score': t['stepChecks'][0]['checks']['hydro']['maxLocalScore'] = 2.
                with self.assertRaises((AssertionError, KeyError)):
                    self.check()

    def test_rebound_green_report_cannot_hide_mass_species_angular_or_energy_defect(self):
        endpoint = self.raw['cases'][0]['cases'][0]
        saved = deepcopy(endpoint['q'])
        for component in (0, 5, 3, 4):
            with self.subTest(component=component):
                endpoint['q'] = deepcopy(saved)
                endpoint['q'][component][0][0] *= 1.000001
                with self.assertRaisesRegex(AssertionError, 'inventory|angular|energy'):
                    self.check()

    def test_changed_raw_rejects_unchanged_green_convergence_report(self):
        self.check()
        self.raw['cases'][0]['harmlessNewMetadata'] = 1
        with self.assertRaisesRegex(AssertionError, 'binding'):
            self.check(rebind=False)

    def test_invalid_primitive_temperature_and_species_domain_rejected(self):
        endpoint = self.raw['cases'][0]['cases'][0]
        saved = deepcopy(endpoint)
        for mutation in ('species', 'solid', 'gas'):
            with self.subTest(mutation=mutation):
                endpoint.update(deepcopy(saved))
                if mutation == 'species': endpoint['q'][5][0][0] = -1.
                if mutation == 'solid': endpoint['solidK'][0][0] = 299.
                if mutation == 'gas': endpoint['q'][4][0][0] *= 10.
                with self.assertRaises(AssertionError):
                    self.check()

    def test_false_refinement_and_tolerance_gate_rejected(self):
        self.conv['series']['joint']['gates'][0]['value'] = 10.
        with self.assertRaisesRegex(AssertionError, 'threshold'):
            self.check()
        self.conv['series']['joint']['gates'][0]['value'] = 0.
        self.conv['bothTolerances']['cases'][0]['profiles']['gas']['rmsNormalized'] = .005
        with self.assertRaisesRegex(AssertionError, 'threshold'):
            self.check()

    def test_true_control_flag_does_not_override_failed_numeric_control(self):
        self.controls['acoustic'][-1]['normalizedRms']['density'] = .1
        with self.assertRaisesRegex(AssertionError, 'analytical error'):
            self.check()

    def test_stale_control_and_missing_corruption_control_rejected(self):
        self.diff['sourceHashes']['diffusion.py'] = 'stale'
        with self.assertRaisesRegex(AssertionError, 'Stale control'):
            self.check()
        self.diff['sourceHashes']['diffusion.py'] = digest(self.source/'diffusion.py')
        self.audit['negativeControls'].pop()
        with self.assertRaisesRegex(AssertionError, 'corruption controls'):
            self.check()

    def test_cumulative_source_integral_must_match_step_receipts(self):
        self.raw['cases'][0]['integrals']['numericalLossJ'] = 1.
        with self.assertRaisesRegex(AssertionError, 'Cumulative'):
            self.check()


if __name__ == '__main__':
    unittest.main()
