"""Independent cylindrical Neumann heat controls; execute only in safe-dev.

J0(alpha*r) has zero radial wall flux when J1(alpha*R)=0. With constant
rho/cv/kappa, its amplitude is exp(-chi*alpha**2*t), independent of z.
The reference uses exact annular averages, not centroid-point samples.
These controls do not replace any frozen coupled-study gate.
"""
import json
from pathlib import Path
import sys
import unittest

import numpy as np
from scipy.special import j0, j1, jn_zeros

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
from flow import Flow
sys.path.insert(0, str(SCIENCE/'meridional-v86'))
from diffusion86 import Diffusion, KB, M_AR, argon_conductivity

Method = Diffusion  # Root may bind the heat-only candidate before loading tests.
R, H, RHO, MU = .06, .24, 2e-4, 1.14e-4
BASE, AMPLITUDE = 3000., 500.
ALPHA = float(jn_zeros(1, 1)[0])/R
KAPPA = argon_conductivity(MU)
CHI = KAPPA/(1.5*KB*RHO/M_AR)
DECAY = CHI*ALPHA**2


def fixture(n, graded=False):
    r = np.linspace(0., R, 8*n+1)
    z = H*np.linspace(0., 1., 2*n+1)**(1.7 if graded else 1.)
    f = Flow(r, z, [M_AR, M_AR])
    mode = 2*np.diff(r*j1(ALPHA*r))/(ALPHA*np.diff(r*r))
    initial = BASE+AMPLITUDE*mode
    q = f.state(RHO, initial, .4, 0.)
    return f, Method(f, MU, conductivity=KAPPA), q, mode


def evolve(f, d, initial, time, steps):
    q = initial.copy()
    for _ in range(steps):
        q, receipt = d.advance(q, time/steps)
    np.testing.assert_array_equal(q[[0, 5]], initial[[0, 5]])
    np.testing.assert_allclose(q[4].sum(), initial[4].sum(), rtol=2e-12, atol=0.)
    temperature = f.primitive(q)['temperatureK']
    if np.min(temperature) <= 0:
        raise AssertionError('Heat evolution left the positive-temperature domain')
    return temperature


def error(f, temperature, mode, time):
    initial = BASE+AMPLITUDE*mode
    expected = AMPLITUDE*mode*np.expm1(-DECAY*time)
    difference = temperature-initial-expected
    reference = float(np.sum(f.volume*expected**2))
    return float(np.sqrt(np.sum(f.volume*difference**2)/reference))


def report(name, rows):
    print('HEAT_CONTROL '+json.dumps(dict(name=name,
        backend=Method.__module__+'.'+Method.__name__, rows=rows), allow_nan=False), flush=True)


class CylindricalHeatControls(unittest.TestCase):
    def test_reused_operator_anchors_changed_energy_and_mixture_capacity_to_incoming_state(self):
        unit = 1.66053906660e-27
        f = Flow(np.linspace(0., R, 9), np.linspace(0., .12, 17), [36*unit, 40*unit])
        r, z = np.meshgrid(f.mean_r, (f.z[:-1]+f.z[1:])/2)
        repeated = Method(f, MU, conductivity=KAPPA)

        def checked_step(operator, q, dt):
            capacity = 1.5*KB*(q[5]/f.masses[0]+(q[0]-q[5])/f.masses[1])
            before = f.primitive(q)['temperatureK']
            initial_entropy = float(np.sum(capacity*np.log(before)))
            out, _ = operator.advance(q, dt)
            temperature = f.primitive(out)['temperatureK']
            np.testing.assert_array_equal(out[[0, 5]], q[[0, 5]])
            np.testing.assert_allclose(out[4].sum(), q[4].sum(), rtol=2e-12, atol=0.)
            self.assertGreater(np.min(temperature), 0.)
            final_entropy = float(np.sum(capacity*np.log(temperature)))
            self.assertGreaterEqual(final_entropy, initial_entropy-2e-12*abs(initial_entropy))
            self.assertGreater(np.max(abs(temperature-before)), 1e-4)
            return out

        first = f.state(RHO*(1+.15*r/R),
            BASE+250*np.cos(np.pi*r/R)+120*np.cos(np.pi*z/.12),
            .25+.2*r/R, 0.)
        checked_step(repeated, first, 1e-5)
        # Replace the incoming state, as upstream transport and source
        # operators do. Old heat results are no longer valid temperatures or
        # capacities, even though the geometry and scalar kappa are unchanged.
        incoming = f.state(RHO*(1.5+.2*np.sin(np.pi*z/.12))*(1-.25*r/R),
            2600-300*np.cos(np.pi*r/R)+200*np.cos(2*np.pi*z/.12),
            .8-.6*r/R+.05*np.cos(np.pi*z/.12), 0.)
        actual = checked_step(repeated, incoming, 2e-5)
        fresh = checked_step(Method(f, MU, conductivity=KAPPA), incoming, 2e-5)
        np.testing.assert_allclose(actual, fresh, rtol=2e-11, atol=1e-22)

    def test_radial_heat_flow_remains_axially_uniform_on_uniform_and_graded_tensor_grids(self):
        rows = []
        for graded in (False, True):
            with self.subTest(graded=graded):
                f, d, q, mode = fixture(2, graded)
                temperature = evolve(f, d, q, 1e-6, 1)
                change = temperature-f.primitive(q)['temperatureK']
                rows.append(dict(graded=graded,
                    maximumAxialSpreadK=float(np.max(np.ptp(temperature, axis=0))),
                    maximumRadialTemperatureChangeK=float(np.max(abs(change)))))
                report('axial-separability', rows[-1:])
                self.assertGreater(np.max(abs(change)), 1e-4)
                np.testing.assert_allclose(temperature,
                    np.broadcast_to(temperature[:1], temperature.shape), rtol=0., atol=2e-8)

    def test_joint_spatial_refinement_converges_to_independent_bessel_mode(self):
        rows = []
        # Refine z together with r: the old massless FE caps must not be
        # silently assumed to preserve a radial mode on a fixed z2 grid.
        for n in (1, 2, 4, 8):
            f, d, q, mode = fixture(n)
            temperature = evolve(f, d, q, 1e-6, 64)
            rows.append(dict(n=n, nr=f.nr, nz=f.nz,
                relativeTemperatureIncrementRMS=error(f, temperature, mode, 1e-6)))
        report('joint-spatial-bessel-reference', rows)
        errors = [row['relativeTemperatureIncrementRMS'] for row in rows]
        self.assertTrue(all(b < a for a, b in zip(errors[:-1], errors[1:])))
        self.assertLess(errors[-1], .05)
        self.assertGreater(np.log2(errors[-2]/errors[-1]), 1.5)

    def test_backward_euler_temporal_refinement_converges_to_exact_bessel_decay(self):
        f, d, q, mode = fixture(8)
        time = 1/DECAY
        rows = []
        for steps in (4, 8, 16, 32):
            temperature = evolve(f, d, q, time, steps)
            rows.append(dict(steps=steps, dtS=time/steps,
                relativeTemperatureIncrementRMS=error(f, temperature, mode, time)))
        report('temporal-bessel-reference', rows)
        errors = [row['relativeTemperatureIncrementRMS'] for row in rows]
        self.assertTrue(all(b < a for a, b in zip(errors[:-1], errors[1:])))
        self.assertLess(errors[-1], .05)
        order = np.log2(errors[-2]/errors[-1])
        self.assertGreater(order, .7)
        self.assertLess(order, 1.3)


if __name__ == '__main__':
    unittest.main(verbosity=2)
