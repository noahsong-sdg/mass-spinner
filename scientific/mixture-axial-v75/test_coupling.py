import unittest
from unittest.mock import Mock, patch
import numpy as np
from flow import Flow, KB
from coupling import Coupled
from mixcheck import check_source

U = 1.66053906892e-27


def configuration(n=4):
    r, z = np.linspace(0, .06, n+1), np.linspace(0, .14, n+1)
    flow = Flow(r, z, [36*U, 40*U])
    c = dict(r=r.tolist(), z=z.tolist(), masses=flow.masses.tolist(), wall=[.06, .0615, .063],
             contactH=100., coolingH=100., bathK=350., walls=dict(outer=0., lower=0., upper=0.))
    c['electrical'] = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(),
        sigmaPerpSM=[.03]*n*n, sigmaParallelSM=[.3]*n*n, magneticT=.2,
        innerVoltageV=[None]*n, outerVoltageV=(np.sin(np.pi*(z[:-1]+z[1:])/(2*z[-1]))).tolist(),
        lowerVoltageV=[0.]*n, upperVoltageV=[0.]*n)
    return flow, c


class CouplingTests(unittest.TestCase):
    def test_wall_mesh_subcycling_audits_each_real_transport_endpoint(self):
        import json
        from pathlib import Path
        from run import configuration
        from independent import check_hydro, check_diffusion
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        f, c, q, wall = configuration(m, 12, 12)
        dt = 3*f.stable_dt(q)
        seen = {'hydro': [], 'diffusion': []}
        def audit(kind, old, new, local_dt, *extra):
            if kind in seen:
                (check_hydro if kind == 'hydro' else check_diffusion)(c, old, new, local_dt)
                seen[kind].append(local_dt)
        with Coupled(f, c['wall'], c['electrical'], q) as model:
            out, _, receipt = model.step(q, wall, dt, audit=audit)
        self.assertGreater(len(seen['hydro']), 1)
        for kind in seen:
            self.assertAlmostEqual(sum(seen[kind]), dt, delta=1e-20)
            self.assertEqual(receipt[kind]['substepCount'], len(seen[kind]))
        np.testing.assert_allclose(out.sum(axis=(1, 2))[[0, 5]], q.sum(axis=(1, 2))[[0, 5]], rtol=1e-14)

    def test_constructor_rejects_unsourced_gas_before_starting_bridge(self):
        flow, c = configuration()
        for temperature in (299., 419.):
            state = flow.state(.001, temperature, .5, 900.)
            with patch('coupling.Bridge', side_effect=AssertionError('Bridge must not start')):
                with self.assertRaisesRegex(ValueError, '300--418 K'):
                    Coupled(flow, c['wall'], c['electrical'], state)

    def test_each_accepted_substep_admits_composite_temperature_domain(self):
        flow, c = configuration()
        valid = flow.state(.001, 350., .5, 900.)
        invalid = flow.state(.001, 419., .5, 900.)
        solid = np.full(2*flow.nz, 350.)
        for stage in ('hydro', 'diffusion', 'magnetic', 'source'):
            model = Coupled.__new__(Coupled)
            model.flow, model.sigma, model.magnetic_t = flow, np.ones((flow.nz, flow.nr)), .2
            model.source = Mock(return_value=(invalid if stage == 'source' else valid, solid, {}))
            with patch.object(flow, 'advance_with_receipt', return_value=(invalid if stage == 'hydro' else valid, {})), \
                 patch('coupling.diffusion.advance_with_receipt', return_value=(invalid if stage == 'diffusion' else valid, {})), \
                 patch('coupling.magnetic.advance', return_value=(invalid if stage == 'magnetic' else valid, {})):
                with self.assertRaisesRegex(ValueError, '300--418 K'):
                    model.step(valid, solid, 1e-7)

    def test_direct_source_rejects_unsourced_input_before_accessing_workspace(self):
        flow, c = configuration()
        model = Coupled.__new__(Coupled)
        model.flow = flow
        for temperature in (299., 419.):
            with self.assertRaisesRegex(ValueError, '300--418 K'):
                model.source(flow.state(.001, temperature, .5, 900.), np.full(2*flow.nz, 350.), 1e-7)

    def test_hot_wall_source_cannot_return_above_mixture_diffusion_domain(self):
        flow, c = configuration()
        q = flow.state(.001, 417., .5, 900.)
        solid = np.full(2*flow.nz, 650.)
        with Coupled(flow, c['wall'], c['electrical'], q) as model:
            with self.assertRaisesRegex(ValueError, '300--418 K'):
                model.source(q, solid, 1e-4)

    def test_independent_source_check_rejects_real_unsourced_endpoint(self):
        flow, c = configuration()
        q = flow.state(.001, 417., .5, 900.)
        solid = np.full(2*flow.nz, 650.)
        with Coupled(flow, c['wall'], c['electrical'], q) as model:
            # Reproduce the former admission gap using the actual source solve.
            with patch.object(model, 'checked_primitive', side_effect=flow.primitive):
                out, wall, result = model.source(q, solid, 1e-4)
        self.assertGreater(np.max(flow.primitive(out)['temperatureK']), 418.)
        with self.assertRaisesRegex(AssertionError, '300--418 K domain'):
            check_source(c, q, out, 1e-4, solid, wall, result)

    def test_density_feedback_enters_current_through_evolved_rotation(self):
        flow, c = configuration()
        a = flow.state(.001, 350., .5, 900.)
        b = flow.state(.002, 350., .5, 900.)
        wall = np.full(2*flow.nz, 350.)
        results = []
        for state in (a, b):
            with Coupled(flow, c['wall'], c['electrical'], state) as model:
                initial_current = model.bridge.current(flow.primitive(state)['omegaRadS'].ravel())
                out, solid, source = model.source(state, wall, 1e-5)
                check_source(c, state, out, 1e-5, wall, solid, source)
                results.append((initial_current, source))
        np.testing.assert_array_equal(results[0][0]['torqueNm'], results[1][0]['torqueNm'])
        self.assertGreater(np.max(abs(np.asarray(results[0][1]['mechanical']['omegaRadS'])
                                     -results[1][1]['mechanical']['omegaRadS'])), .1)
        self.assertGreater(np.max(abs(np.asarray(results[0][1]['mechanical']['current']['torqueNm'])
                                     -results[1][1]['mechanical']['current']['torqueNm'])), 1e-12)

    def test_species_capacity_counts_particles_not_natural_argon_mass(self):
        flow, c = configuration()
        q = flow.state(.001, 350., .2, 500.)
        with Coupled(flow, c['wall'], c['electrical'], q) as model:
            m = model.thermal
            cv0 = m.gas_cv.copy()
            updated = flow.state(.002, 350., .8, 500.)
            m.set_inventory(flow, updated)
            expected = 1.5*KB*(updated[5]/flow.masses[0]+(updated[0]-updated[5])/flow.masses[1])
            np.testing.assert_allclose(m.gas_cv, expected.ravel(), rtol=2e-15)
            self.assertGreater(np.max(abs(m.gas_cv-2*cv0)), 1e-12)

    def test_updated_density_refreshes_fipy_storage_and_true_inertia(self):
        flow, c = configuration()
        original = flow.state(.001, 350., .2, 500.)
        updated = flow.state(.001*np.linspace(1, 2, flow.count).reshape(flow.nz, flow.nr),
                             350., .8, 500.)
        solid = np.full(2*flow.nz, 355.)
        with Coupled(flow, c['wall'], c['electrical'], original) as reused:
            a, wall, result = reused.source(updated, solid, 1e-7)
            np.testing.assert_allclose(reused.stepper.model.inertia,
                                       (updated[0]*flow.mean_r2).ravel(), rtol=2e-15)
            check_source(c, updated, a, 1e-7, solid, wall, result)
        with Coupled(flow, c['wall'], c['electrical'], updated) as fresh:
            b, wall_b, _ = fresh.source(updated, solid, 1e-7)
        np.testing.assert_allclose(a, b, rtol=2e-13, atol=1e-25)
        np.testing.assert_allclose(wall, wall_b, rtol=2e-14)

    def test_source_audit_rejects_changed_species_and_numerical_heat(self):
        flow, c = configuration()
        q = flow.state(.001, 350., .5, 900.)
        solid = np.full(2*flow.nz, 355.)
        with Coupled(flow, c['wall'], c['electrical'], q) as model:
            out, wall, result = model.source(q, solid, 1e-7)
        check_source(c, q, out, 1e-7, solid, wall, result)
        bad = out.copy()
        bad[5, 0, 0] *= 1.01
        with self.assertRaises(AssertionError):
            check_source(c, q, bad, 1e-7, solid, wall, result)
        bad = out.copy()
        bad[4, 0, 0] += 1e-6
        with self.assertRaises(AssertionError):
            check_source(c, q, bad, 1e-7, solid, wall, result)


if __name__ == '__main__':
    unittest.main()
