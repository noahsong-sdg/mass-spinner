"""Independent closed-cavity linear gas mode audit; run only in safe-dev.

Imports neither model nor FiPy. The nonuniform, mean-zero mode has Cp,
whereas the uniform closed-vessel mode has Cv. NIST He4 TableA1 500K:
https://nvlpubs.nist.gov/nistpubs/jres/105/5/j55hur.pdf .
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np
from scipy.special import j1, jn_zeros


def audit(path):
    payload = Path(path).read_bytes()
    rows = json.loads(gzip.decompress(payload))['cases']
    conductivity = .221707  # W/(m K), independent exact table transcription.
    amplitude = .001
    zero = float(jn_zeros(1, 1)[0])
    answers = []
    for cells, steps in ((16, 80), (32, 160), (64, 320)):
        matches = [r for r in rows if r['name'] == f'eigen-{cells}']
        assert len(matches) == 1, ('Missing/duplicate eigenmode case', cells)
        row = matches[0]
        c = row['config']
        assert row['caseKind'] == 'exact-neumann-small-amplitude'
        assert c['gas'] == 'helium4' and c['constantTransport'] is True
        assert c['alpha'] == 0 and c['gasCells'] == cells and c['steps'] == steps
        assert c['referenceK'] == 500. and c['pressurePa'] == 1000.
        assert c['durationS'] == .01 and c['radiusM'] == .12
        radius, tref, pref = c['radiusM'], c['referenceK'], c['pressurePa']
        # Original material labels, before thermal adjustment moves gas shells.
        edges = np.linspace(0., radius, cells+1)
        weights = np.diff(edges**2)/radius**2
        wave = zero/radius
        mode = 2*np.diff(edges*j1(wave*edges))/(wave*np.diff(edges**2))
        initial = tref+amplitude*mode
        states = row['states']
        assert len(states) == steps+1
        assert np.max(np.abs(np.asarray(states[0]['gasK'])-initial)) < 1e-12
        # Derivation: (Cpvol I - n*k*mean) theta_t = k*Laplacian(theta).
        # This Neumann J0 mode has zero volume mean, so Cpvol=5*p/(2*T).
        cp_volume = 2.5*pref/tref
        cv_volume = 1.5*pref/tref
        rate_cp = conductivity*wave**2/cp_volume
        rate_cv = conductivity*wave**2/cv_volume
        worst = worst_cv = mean_error = 0.
        end_rms = end_cv = 0.
        for index, state in enumerate(states):
            time = state['timeS']
            assert math.isfinite(time) and abs(time-index*c['durationS']/steps) < 1e-15
            actual = np.asarray(state['gasK'])
            assert actual.shape == (cells,) and np.all(np.isfinite(actual))
            expected = tref+amplitude*math.exp(-rate_cp*time)*mode
            wrong_cv = tref+amplitude*math.exp(-rate_cv*time)*mode
            error = math.sqrt(float(np.dot(weights, (actual-expected)**2)))/amplitude
            error_cv = math.sqrt(float(np.dot(weights, (actual-wrong_cv)**2)))/amplitude
            worst, worst_cv = max(worst, error), max(worst_cv, error_cv)
            mean_error = max(mean_error, abs(float(np.dot(weights, actual))-tref))
            assert state['interfaceEnergyJ'] == 0., 'Insulated gas exchanged wall heat'
            if index == steps:
                end_rms, end_cv = error, error_cv
        assert mean_error < 1e-8, ('Uniform Cv/inventory conservation failure', mean_error)
        answers.append({'name': row['name'], 'cells': cells, 'steps': steps,
                        'decayRateCpSInverse': rate_cp,
                        'wrongCvRateSInverse': rate_cv,
                        'maximumRmsErrorOverInitialAmplitude': worst,
                        'endpointRmsErrorOverInitialAmplitude': end_rms,
                        'wrongCvMaximumRmsErrorOverInitialAmplitude': worst_cv,
                        'wrongCvEndpointRmsErrorOverInitialAmplitude': end_cv,
                        'maximumParticleWeightedMeanErrorK': mean_error})
    errors = [r['maximumRmsErrorOverInitialAmplitude'] for r in answers]
    assert errors[2] < errors[1] < errors[0], ('Noncontracting joint refinement', errors)
    assert errors[2] < .01, ('Finest normalized mode error exceeds 1%', errors[2])
    assert answers[-1]['wrongCvMaximumRmsErrorOverInitialAmplitude'] > 10*errors[-1], (
        'Incorrect Cv control not distinguishable', answers[-1])
    return {'pass': True, 'resultsSHA256': hashlib.sha256(payload).hexdigest(),
            'scope': 'Independent small-amplitude Neumann mode, fixed particle labels; no finite-amplitude, Robin or device calibration claim',
            'derivation': 'Mean-zero closed-vessel mode uses Cpvol=5*p_ref/(2*T_ref); rate=k*zeta1^2/(Cpvol*R^2)',
            'gasConductivityWMK': conductivity, 'initialAmplitudeK': amplitude,
            'normalization': 'Volume-weighted RMS temperature error divided by initial coefficient 0.001K',
            'cases': answers}


if __name__ == '__main__':
    result = audit(sys.argv[1])
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2, allow_nan=False))
    print(json.dumps(result, indent=2, allow_nan=False))
