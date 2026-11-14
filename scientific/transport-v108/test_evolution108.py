"""Finite-time stress MMS; analytical forcing, never a discrete residual source.

Frozen before execution: g=1-t/tau, T=4 us, tau=10 us; n=8/16/32 with 64 steps,
then 128 steps at n=16. Exact trace/momentum accounting is asserted. Spatial
contraction and time-halving deltas are reported, not substituted for V107 gates.
Linear g makes its exact derivative compatible with endpoint backward Euler;
no numerical stiffness residual or artificial temporal correction is forced.
"""
import json
import unittest

import numpy as np
from test_independent108 import manufactured, relative_rms, R, H, MU

FINAL, TAU, STEPS = 4e-6, 1e-5, 64


def boundary_integrals():
    """Integral of actual traction, including the lower-z symmetry plane.

    Cylindrical radial momentum also has -integral(tau_tt/r)dV. It is a
    geometric stress term, not an unexplained momentum leak or wall traction.
    """
    a, b, c = 1/(R*H**2), 1/(H*R**2), 1e4/(R**2*H**2)
    wall = np.pi*MU*np.array([
        -32*a*R**3*H**3/9-8*a*H*R**5/15,
        -b*R**2*H**4-2*b*H**2*R**4,
        -8*c*R**4*H**3/3-c*H*R**6/3])
    geometry = np.array([-32*np.pi*MU*a*R**3*H**3/27, 0., 0.])
    return wall, geometry


def fixed_endwall_overlap(f):
    # A fixed physical region, not a shrinking final row or node-count mask.
    radial = np.maximum(0., np.minimum(f.r[1:], .75*R)**2
                        -np.maximum(f.r[:-1], .25*R)**2)/np.diff(f.r**2)
    axial = np.maximum(0., np.minimum(f.z[1:], H)
                       -np.maximum(f.z[:-1], .9*H))/np.diff(f.z)
    return axial[:, None]*radial[None, :]


def evolve(n, steps):
    f, d, q0, _, force = manufactured(n)
    q = q0.copy(); dt = FINAL/steps
    capacities = np.asarray([q0[0], q0[0], q0[0]*f.mean_r2])
    stress = np.zeros(3); body = np.zeros(3)
    constrained = np.zeros(3); physical_wall = np.zeros(3); geometry = np.zeros(3)
    nodal_components = d.velocity.nodal_dofs
    r, z = d.mesh.p
    physical_boundary = ((r == R) | (z == H) | (z == 0.))
    physical_dofs = nodal_components[:, physical_boundary].ravel()
    for step in range(steps):
        endpoint = (step+1)*dt; g = 1-endpoint/TAU
        # Integral of rho*u_dot - div(tau), or the corresponding torque.
        # No K, stiffness action or computed numerical force enters this source.
        applied = -dt*(q0[1:4]/TAU+g*force*f.volume)
        incoming = q.copy(); thermal = f.primitive(q)['thermalJ']
        incoming[1:4] += applied
        kinetic = .5*np.sum(incoming[1:4]**2/capacities, axis=0)
        incoming[4] = thermal+kinetic
        before = incoming.copy()
        out, receipt = d.advance(incoming, dt)
        np.testing.assert_array_equal(incoming, before)
        np.testing.assert_array_equal(out[[0, 5]], q0[[0, 5]])
        action = d.stiffness@np.asarray(receipt['velocityTrace'])
        for j, dofs in enumerate(nodal_components):
            fixed = np.intersect1d(dofs, d.fixed)
            constrained[j] += dt*action[fixed].sum()
            physical_wall[j] += dt*action[np.intersect1d(fixed, physical_dofs)].sum()
            geometry[j] -= dt*action[dofs].sum()
        body += applied.sum(axis=(1, 2))
        stress += (out[1:4]-incoming[1:4]).sum(axis=(1, 2))
        q = out
    exact = (1-FINAL/TAU)*q0[1:4]
    wall0, geometry0 = boundary_integrals()
    endpoint_integral = dt*(1-dt*np.arange(1, steps+1)/TAU).sum()
    exact_integral = FINAL-FINAL**2/(2*TAU)
    closure = stress-constrained-geometry
    scale = np.abs(stress)+np.abs(constrained)+np.abs(geometry)
    total_closure = (q[1:4]-q0[1:4]).sum(axis=(1, 2))-body-stress
    row = dict(nr=f.nr, nz=f.nz, steps=steps, dtS=dt,
        wholeDomainRelativeRMS=relative_rms(f, q[1:4]/capacities, exact/capacities,
                                          np.ones(f.volume.shape)),
        fixedEndwallRelativeRMS=relative_rms(f, q[1:4]/capacities, exact/capacities,
                                           fixed_endwall_overlap(f)),
        stressImpulse=stress.tolist(), bodyImpulse=body.tolist(),
        constrainedTraceImpulse=constrained.tolist(), physicalBoundaryTraceImpulse=physical_wall.tolist(),
        axisConstraintImpulse=(constrained-physical_wall).tolist(),
        radialGeometricImpulse=geometry.tolist(),
        analyticEndpointWallImpulse=(endpoint_integral*wall0).tolist(),
        analyticEndpointGeometricImpulse=(endpoint_integral*geometry0).tolist(),
        analyticContinuousWallImpulse=(exact_integral*wall0).tolist(),
        analyticContinuousStressImpulse=(exact_integral*(wall0+geometry0)).tolist(),
        momentumTraceBudgetRelativeResidual=(np.abs(closure)/scale).tolist(),
        totalMomentumClosure=total_closure.tolist(),
        totalMomentumRelativeResidual=(np.abs(total_closure)/(np.abs(body)+np.abs(stress))).tolist())
    return row, q, capacities, f


class FiniteTimeStressControls(unittest.TestCase):
    def test_analytic_boundary_and_geometric_integrals_match_exact_volume_force(self):
        f, _, _, _, force = manufactured(8)
        wall, geometry = boundary_integrals()
        np.testing.assert_allclose((force*f.volume).sum(axis=(1, 2)), wall+geometry,
                                   rtol=2e-13, atol=0.)

    def test_finite_time_manufactured_evolution_and_actual_trace_budgets(self):
        evolved = [evolve(n, STEPS) for n in (8, 16, 32)]
        rows = [value[0] for value in evolved]
        half, half_q, capacity, f = evolve(16, 2*STEPS)
        errors = np.asarray([r['wholeDomainRelativeRMS'] for r in rows])
        report = dict(scope='Finite-time analytical stress MMS, not qualification',
            finalTimeS=FINAL, linearAmplitudeTimeS=TAU,
            forcing='g=1-t/tau; analytical derivative/stress at BE endpoint',
            fixedEndwallRegionM=dict(r=[.25*R, .75*R], z=[.9*H, H]),
            spatial=rows, spatialContractsByComponent=np.all(errors[1:] < errors[:-1], axis=0).tolist(),
            halfStep=half, timeHalvingDifferenceRelativeRMS=relative_rms(f,
                evolved[1][1][1:4]/capacity, half_q[1:4]/capacity, np.ones(f.volume.shape)))
        print('FINITE_TIME_STRESS108 '+json.dumps(report, allow_nan=False), flush=True)
        for row in rows+[half]:
            self.assertTrue(np.all(np.asarray(row['momentumTraceBudgetRelativeResidual']) < 1e-8))
            self.assertTrue(np.all(np.asarray(row['totalMomentumRelativeResidual']) < 1e-11))


if __name__ == '__main__':
    unittest.main(verbosity=2)
