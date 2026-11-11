"""Additional controls for the frozen producer; run only in safe-dev."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import json
import multiprocessing
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow
from independent import check_hydro
from controls import acoustic
from wall_resolution import wall_edges


class GradedMUSCL(unittest.TestCase):
    def setUp(self):
        x = np.linspace(0., 1., 17)
        self.flow = Flow(.06*np.tanh(2*x)/np.tanh(2), wall_edges(12, .14, 2.5),
                         np.array([36., 40.])*1.66053906892e-27)

    def test_linear_radial_contact_uses_volume_centroid_on_graded_grid(self):
        f = self.flow
        rho = .001*(1+.2*f.mean_r/.06)
        q = f.state(rho, 350*.001/rho, .4, 0., vr=3.)
        fr, _ = f.fluxes(q)
        expected = .001*(1+.2*f.r[2:-2]/.06)*3*f.radial_area[:, 2:-2]
        np.testing.assert_allclose(fr[0, :, 2:-2], expected, rtol=3e-13, atol=0)

    def test_uniform_spin_has_no_metric_jump_energy_diffusion(self):
        f = self.flow
        q = f.state(.001, 350., .4, 900.)
        fr, fz = f.fluxes(q)
        sound = float(np.max(f.primitive(q)['soundMPS']))
        area = max(f.radial_area.max(), f.axial_area.max())
        for flux in (fr, fz):
            for component in (0, 3, 4, 5):
                # Integrated storage/EOS round trips leave only raw face
                # arithmetic error, not physical mass or energy transfer.
                allowance = 128*np.finfo(float).eps*np.max(abs(q[component]/f.volume))*sound*area
                self.assertLessEqual(float(abs(flux[component]).max()), allowance)

    def test_asymmetric_graded_flow_matches_independent_reconstruction(self):
        f = self.flow
        rng = np.random.default_rng(76)
        a = rng.uniform(size=(f.nz, f.nr))
        q = f.state(.001*(1+.1*a), 350+2*a, .3+.2*a, 800+100*a,
                    2*np.sin(np.pi*f.mean_r/.06), 3*np.sin(np.pi*(f.z[:-1]+f.z[1:])[:, None]/.28))
        setup = dict(r=f.r, z=f.z, masses=f.masses)
        totals = q.sum(axis=(1, 2))
        for _ in range(10):
            dt = .2*f.stable_dt(q)
            updated = f.advance(q, dt)
            check_hydro(setup, q, updated, dt)
            q = updated
        np.testing.assert_allclose(q.sum(axis=(1, 2))[[0, 3, 4, 5]], totals[[0, 3, 4, 5]], rtol=3e-14)

    def test_smooth_wave_improves_faster_than_first_order(self):
        coarse, fine = acoustic(24), acoustic(48)
        for name in ('density', 'pressure', 'axialVelocity'):
            self.assertGreater(coarse['normalizedRms'][name]/fine['normalizedRms'][name], 3.)

    def test_worker_process_preserves_serial_physical_endpoints_exactly(self):
        from run import trajectory
        source = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
        m = json.loads((source/'manifest.json').read_text())
        serial = trajectory(m, 6, 6, 32)
        with ProcessPoolExecutor(max_workers=1, mp_context=multiprocessing.get_context('spawn')) as pool:
            parallel = pool.submit(trajectory, m, 6, 6, 32).result()
        for a, b in zip(serial['cases'], parallel['cases']):
            np.testing.assert_array_equal(a['q'], b['q'])
            np.testing.assert_array_equal(a['solidK'], b['solidK'])
            self.assertEqual(a['observables'], b['observables'])


if __name__ == '__main__':
    unittest.main()
