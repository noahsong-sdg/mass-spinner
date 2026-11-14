"""Retain supplementary error arrays without changing qualification gates."""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import scipy
import test_pressure104 as controls
from reconstruction101 import M_AR

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scientific/spatial-v100'))
import independent100
from flow import Flow as BaselineFlow


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(baseline, candidate, destination):
    destination.mkdir(exist_ok=False)
    source_files = ('reconstruction-v104/pressure104.py',
        'reconstruction-v104/test_pressure104.py', 'reconstruction-v104/analyze104.py',
        'mixture-axial-v75/flow.py', 'spatial-v101/reconstruction101.py',
        'spatial-v100/independent100.py')
    result = dict(scope='Supplemental arrays, not replacement gates',
        versions=dict(python=sys.version, executable=sys.executable,
                      numpy=np.__version__, scipy=scipy.__version__),
        experimentalQualification=False, sourceSHA256={name: sha(ROOT/'scientific'/name)
            for name in source_files}, smoothMaximum=[], signedBump=[], initialMassFlux=[],
        initialStateIdentity=[])
    for kind in ('original', 'smooth-source-aligned'):
        for n in (1, 2, 4, 8):
            f = controls.Flow(*controls.mesh(n, kind), (36*controls.U, 40*controls.U))
            radius, center = f.r[-1], .5*f.r[-1]
            curvature = -30./radius**2
            pressure = 230.+curvature*(f.mean_r2-2*center*f.mean_r+center*center)
            q = controls.pressure_state(f, pressure)
            left, right = f._face_states(f.primitive(q), 2)
            expected = 230.+curvature*(f.r[2:-2]-center)**2
            observed = np.array([left[1, :, 2:-2], right[1, :, 2:-2]])
            error = float(np.max(abs(observed-expected)))
            result['smoothMaximum'].append(dict(mesh=kind, n=n, nr=f.nr, nz=f.nz,
                scope='interior faces 2:-2', maximumAbsoluteErrorPa=error,
                maximumNormalizedError=error/230., minimumTracePa=float(observed.min()),
                maximumTracePa=float(observed.max())))
    for amplitude in (-.05, .05):
        for n in (1, 2, 4, 8):
            f = controls.Flow(*controls.mesh(n, 'smooth-source-aligned'),
                              (36*controls.U, 40*controls.U))
            omega, temperature, fraction = 7000., 3000., .35
            radius = f.r[-1]
            c2 = controls.specific_constant(f, fraction)*temperature
            density = lambda r: .001*np.exp(omega**2*(r*r-radius*radius)/(2*c2))
            bump = lambda r: np.sin(np.pi*r/radius)**2
            rho = controls.average(f, density)
            pressure = controls.average(f, lambda r: c2*density(r)*(1+amplitude*bump(r)))
            q = controls.pressure_state(f, pressure, rho, fraction, omega)
            expected = controls.average(f, lambda r: -amplitude*density(r)*(
                c2*np.pi/radius*np.sin(2*np.pi*r/radius)+omega**2*r*bump(r)))/rho
            acceleration = f.rate(q)[1]/q[0]
            error, reference = controls.rms(f, acceleration-expected), controls.rms(f, expected)
            left = (f.mean_r > .15*radius) & (f.mean_r < .4*radius)
            right = (f.mean_r > .6*radius) & (f.mean_r < .85*radius)
            result['signedBump'].append(dict(amplitude=amplitude, n=n, nr=f.nr, nz=f.nz,
                scope='all-cell volume RMS; signed means on declared interior bands',
                absoluteRMSMPS2=error, expectedRMSMPS2=reference, relativeRMS=error/reference,
                signedLeftMeanMPS2=float(amplitude*np.mean(acceleration[:, left])),
                signedRightMeanMPS2=float(amplitude*np.mean(acceleration[:, right]))))
    states = independent100.load(baseline/'predictions.json')
    initial_hashes = {}
    for n in (1, 2, 4):
        state = states[n, .1]
        q = np.asarray(state['snapshots'][0]['q'])
        initial_hashes[n] = hashlib.sha256(q.tobytes()).hexdigest()
        for name, cls in (('V103', BaselineFlow), ('V104', controls.Flow)):
            f = cls(state['radialEdgesM'], state['axialEdgesM'], (M_AR,)*2)
            rate = f.rate(q)[0]/f.volume
            result['initialMassFlux'].append(dict(n=n, method=name,
                densityRateRMSKgM3S=controls.rms(f, rate)))
    del states
    states = independent100.load(candidate/'predictions.json')
    for n in (1, 2, 4):
        q0 = np.asarray(states[n, .1]['snapshots'][0]['q'])
        digest = hashlib.sha256(q0.tobytes()).hexdigest()
        if digest != initial_hashes[n]:
            raise ValueError('Pressure candidate changed initial conserved state')
        result['initialStateIdentity'].append(dict(n=n, float64SHA256=digest, exactMatch=True))
    del states
    for label, directory in (('baseline', baseline), ('candidate', candidate)):
        result[label] = dict(predictionSHA256=sha(directory/'predictions.json'),
            summarySHA256=sha(directory/'summary.json'),
            summary=json.loads((directory/'summary.json').read_bytes()))
    if not all(np.isfinite(row['relativeRMS']) for row in result['signedBump']):
        raise ValueError('Nonfinite supplementary errors')
    (destination/'analysis.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main(*map(Path, sys.argv[1:]))
