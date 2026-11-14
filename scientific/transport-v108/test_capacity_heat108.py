"""Active FiPy heat MMS with exact density-weighted cell energy and face flux.

Frozen before execution: V107 graded geometry levels1/2/4,64 endpoint BE steps,
4us duration, linear amplitude1-t/(10us), density modulation0/.8. Report fixed
endwall and whole-domain increment errors; require contraction and finest<5%.
These independent component controls never replace the coupled V107 gates.
"""
import gc
import json
import sys
import unittest
import numpy as np
from force105 import SourceFlow
from heat106 import FVDiffusion
from diffusion86 import KB, M_AR
from test_evolution108 import fixed_endwall_overlap

sys.path.insert(0, '/work/project/v107-candidate01/scientific/refinement-v107')
import campaign107

R, H, MU = .06, .24, 1.14e-4
FINAL, TAU, BASE, AMPLITUDE = 4e-6, 1e-5, 300000., 200000.


def radial_cosine(edges, wave):
    return np.diff(edges*np.sin(wave*edges)/wave+np.cos(wave*edges)/wave**2)


def axial_cosine(edges, wave):
    return np.diff(np.sin(wave*edges))/wave


def fields(n, contrast):
    r, z = campaign107.prior.cross.mesh(n, 'smooth-source-aligned')
    f = SourceFlow(r, z, [M_AR, M_AR], noSlipWalls=True)
    kr, kz = np.pi/R, np.pi/H
    rc = {j: radial_cosine(r, j*kr)[None, :] for j in (1, 2, 3)}
    zc = axial_cosine(z, kz)[:, None]
    zc2 = (np.diff(z)/2+np.diff(np.sin(2*kz*z))/(4*kz))[:, None]
    # rho=rho0*(1+contrast*cos(2kr*r)*cos(kz*z)); phi=cos(kr*r)*cos(kz*z).
    # All density/capacity-weighted integrals are analytic, no numerical K source.
    mass = 2e-4*(f.volume+contrast*2*np.pi*rc[2]*zc)
    capacity = 1.5*KB/M_AR*mass
    capacity_phi = 1.5*KB/M_AR*2e-4*2*np.pi*(rc[1]*zc
                            +contrast*(rc[1]+rc[3])/2*zc2)
    radial_flux = 2*np.pi*np.diff(-kr*r*np.sin(kr*r))[None, :]*zc
    axial_flux = 2*np.pi*rc[1]*np.diff(-kz*np.sin(kz*z))[:, None]
    laplacian_integral = radial_flux+axial_flux
    return f, capacity, capacity_phi, laplacian_integral


def norm(f, error, reference, mask):
    return float(np.sqrt(np.sum(f.volume*mask*error**2)
                        /np.sum(f.volume*mask*reference**2)))


def evolve(n, contrast, steps):
    f, capacity, capacity_phi, lap = fields(n, contrast)
    d = FVDiffusion(f, MU)
    kappa = float(d.conductivity)
    initial = BASE*capacity+AMPLITUDE*capacity_phi
    thermal = initial.copy(); source_total = 0.
    for i in range(steps):
        dt = FINAL/steps; g = 1-(i+1)*dt/TAU
        source = dt*AMPLITUDE*(-capacity_phi/TAU-kappa*g*lap)
        incoming = thermal+source
        if np.min(incoming/capacity) <= 0:
            raise ArithmeticError('Manufactured heat source left positive temperature')
        temperature, _ = d.conduct(incoming.ravel(), capacity.ravel(), dt)
        thermal = capacity*np.asarray(temperature).reshape(capacity.shape)
        source_total += float(source.sum())
    exact = BASE+AMPLITUDE*(1-FINAL/TAU)*capacity_phi/capacity
    actual = thermal/capacity
    increment = -AMPLITUDE*FINAL/TAU*capacity_phi/capacity
    energy_error = abs(float((thermal-initial).sum())-source_total)/float(initial.sum())
    row = dict(n=n, nr=f.nr, nz=f.nz, steps=steps, contrast=contrast,
        wholeIncrementRelativeRMS=norm(f, actual-exact, increment, 1.),
        fixedEndwallIncrementRelativeRMS=norm(f, actual-exact, increment, fixed_endwall_overlap(f)),
        energySourceRelativeResidual=energy_error, minimumTemperatureK=float(actual.min()))
    del d; gc.collect()
    return row, actual, increment, f


class CapacityHeatControls(unittest.TestCase):
    def test_analytic_integrals_preserve_inventory_and_zero_flux(self):
        for contrast in (0., .8):
            for n in (1, 2, 4):
                f, capacity, capacity_phi, lap = fields(n, contrast)
                self.assertGreater(capacity.min(), 0.)
                self.assertAlmostEqual(float(capacity.sum())/(1.5*KB/M_AR*2e-4*f.volume.sum()), 1., delta=2e-13)
                self.assertLess(abs(float(lap.sum())), 1e-12*float(abs(lap).sum()))
                self.assertLess(np.max(abs(capacity_phi/capacity)), 1.)

    def test_active_fipy_heat_converges_with_uniform_and_strongly_varying_capacity(self):
        reports = []
        for contrast in (0., .8):
            states = [evolve(n, contrast, 64) for n in (1, 2, 4)]
            half = evolve(2, contrast, 128)
            rows = [s[0] for s in states]
            errors = [r['wholeIncrementRelativeRMS'] for r in rows]
            reports.append(dict(contrast=contrast, spatial=rows, halfStep=half[0],
                timeHalvingIncrementRelativeRMS=norm(half[3], states[1][1]-half[1], half[2], 1.)))
            print('CAPACITY_HEAT108 '+json.dumps(reports[-1], allow_nan=False), flush=True)
            self.assertTrue(all(b < a for a, b in zip(errors[:-1], errors[1:])))
            self.assertLess(errors[-1], .05)
            for row in rows+[half[0]]:
                self.assertLess(row['energySourceRelativeResidual'], 2e-11)


if __name__ == '__main__':
    unittest.main(verbosity=2)
