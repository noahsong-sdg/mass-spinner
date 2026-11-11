"""Independent canonical initialization and saved-endpoint observations.

No production Flow, coupling or observer helpers are imported. The caller
first admits the manifest-bound setup and primitive domain, then supplies the
sealed independent v74 graph module.
"""
import numpy as np
from scipy.special import roots_legendre

KB, EPS = 1.380649e-23, np.finfo(float).eps


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def canonical_initial(trajectory, manifest):
    c = trajectory['setup']
    r, z, masses = [np.asarray(c[k], dtype=float) for k in ('r', 'z', 'masses')]
    # Separate quadrature implementation/order; no production initializer.
    nodes, weights = roots_legendre(16)
    radii = r[:-1, None]+np.diff(r)[:, None]*(nodes+1)/2
    heights = z[:-1, None]+np.diff(z)[:, None]*(nodes+1)/2
    rr, zz = radii[None, :, None, :]/r[-1], heights[:, None, :, None]/z[-1]
    pattern = np.cos(np.pi*rr)*np.cos(np.pi*zz)
    rho = manifest['densityKgM3']*(1+.04*pattern)
    temperature = manifest['initialGasK']+2*np.cos(np.pi*zz)*(1-rr*rr)
    y = .5+.06*pattern
    omega = manifest['initialOmegaRadS']*(1-rr*rr)*np.sin(np.pi*zz)**2
    vr, vz = 2*np.sin(np.pi*rr)*np.cos(np.pi*zz), np.cos(np.pi*rr)*np.sin(np.pi*zz)
    energy = rho*(1.5*KB*(y/masses[0]+(1-y)/masses[1])*temperature
                  +.5*(vr*vr+vz*vz+(r[-1]*rr*omega)**2))
    fields = (rho, rho*vr, rho*vz, rho*omega*(r[-1]*rr)**2, energy, rho*y)
    jacobian = np.pi/2*np.diff(z)[:, None, None, None]*np.diff(r)[None, :, None, None]*radii[None, :, None, :]
    q = np.array([np.einsum('zrji,j,i->zr', f*jacobian, weights, weights) for f in fields])
    wall = np.full((len(z)-1, len(c['wall'])-1), float(manifest['initialLinerK']))
    return q, wall


def check_initial(trajectory, manifest):
    expected_q, expected_wall = canonical_initial(trajectory, manifest)
    actual_q = np.asarray(trajectory['initialQ'], dtype=float)
    actual_wall = np.asarray(trajectory['initialSolidK'], dtype=float).reshape(expected_wall.shape)
    require(actual_q.shape == expected_q.shape and np.all(np.isfinite(actual_q)),
            'Invalid canonical initial conserved state')
    # Near a velocity node, trig argument/reduction roundoff is absolute in
    # the prescribed speed, not relative to its vanishing cell integral.
    mass = expected_q[0]
    envelopes = np.array([mass, 2*mass, mass,
        abs(manifest['initialOmegaRadS'])*manifest['radiusM']**2*mass, expected_q[4], mass])
    tolerance = 128*EPS*np.maximum(np.maximum(abs(expected_q), abs(actual_q)), envelopes)
    require(np.all(abs(actual_q-expected_q) <= tolerance),
            'Initial conserved fields differ from canonical study')
    require(np.all(np.isfinite(actual_wall)) and np.array_equal(actual_wall, expected_wall),
            'Initial solid temperature differs from canonical study')


def expected_observables(trajectory, endpoint, graph):
    c, q = trajectory['setup'], np.asarray(endpoint['q'], dtype=float)
    r, z, masses = [np.asarray(c[k], dtype=float) for k in ('r', 'z', 'masses')]
    volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    a2 = (r[:-1]**2+r[1:]**2)/2
    mass, mr, mz, angular, energy, light = q
    inertia = mass*a2
    kinetic = (mr*mr+mz*mz)/(2*mass)+angular*angular/(2*inertia)
    number = light/masses[0]+(mass-light)/masses[1]
    temperature = (energy-kinetic)/(1.5*KB*number)
    wall = np.asarray(endpoint['solidK'], dtype=float).ravel()
    omega = angular/inertia
    # The source admits a global max-norm speed mismatch bounded by
    # 5e-10*max(1,max|Omega|), not a per-cell relative bound. Reconstruct at
    # saved Omega; the graph-observable allowance is tested separately.
    current = graph.current_graph(c['electrical'], omega.ravel())
    props = graph.independent_properties(temperature.ravel(), wall)
    mechanics = graph.torsion_graph(r, z, (mass/volume).ravel(), props['mu'],
                                   omega.ravel(), c['walls'])
    mean_r = 2*np.diff(r**3)/(3*np.diff(r*r))
    mean_z = (z[:-1]+z[1:])/2
    radii, heights = np.meshgrid(mean_r, mean_z)
    heavy = mass-light
    require(float(light.sum()) > 0 and float(heavy.sum()) > 0,
            'Species centroid requires positive species inventory')
    sigma = np.asarray(c['electrical']['sigmaPerpSM'], dtype=float).reshape(volume.shape)
    radial_joule = sigma*c['electrical']['magneticT']**2*(mr/mass)**2*volume
    expected = dict(
        currentA=float(np.sum(abs(current['boundaryCurrentsA']))/2),
        jouleW=current['jouleW'], shearW=float(np.sum(mechanics['shearByCellW'])),
        gasPeakK=float(temperature.max()), wallPeakK=float(wall.max()),
        meridionalKineticJ=float(np.sum(.5*(mr*mr+mz*mz)/mass)),
        lightRadialMomentM=float(np.sum(light*radii)/np.sum(light)),
        heavyRadialMomentM=float(np.sum(heavy*radii)/np.sum(heavy)),
        lightAxialMomentM=float(np.sum(light*heights)/np.sum(light)),
        heavyAxialMomentM=float(np.sum(heavy*heights)/np.sum(heavy)),
        radialMotionalJouleW=float(np.sum(radial_joule)))
    expected.update({'torque_'+name: value for name, value in mechanics['boundaryTorqueNm'].items()})
    require(all(np.isfinite(v) for v in expected.values()), 'Nonfinite reconstructed endpoint observable')
    return {name: float(value) for name, value in expected.items()}


def check_observables(trajectory, endpoint, graph):
    expected = expected_observables(trajectory, endpoint, graph)
    actual = endpoint['observables']
    require(set(actual) == set(expected), 'Missing or extra reconstructed observable')
    errors = {}
    for name, value in expected.items():
        require(type(actual[name]) in (int, float) and np.isfinite(actual[name]),
                'Nonfinite reported endpoint observable '+name)
        physical_graph = name in ('currentA', 'jouleW', 'shearW') or name.startswith('torque_')
        # This admission allowance is not the physical refinement threshold,
        # nor a universal consequence of the source's speed-mismatch bound.
        rtol = 1e-7 if physical_graph else 128*EPS
        floor = 1e-18 if name == 'shearW' or name.startswith('torque_') else 1e-15
        scale = max(floor, abs(value)) if physical_graph else abs(value)
        tolerance = rtol*scale+64*EPS*max(abs(actual[name]), abs(value))
        require(abs(actual[name]-value) <= tolerance, 'Endpoint observable mismatch '+name)
        errors[name] = float(abs(actual[name]-value)/max(scale, 1e-300))
    return errors
