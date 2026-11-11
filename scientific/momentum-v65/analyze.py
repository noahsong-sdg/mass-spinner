"""Prospective momentum gates and reproducible figures; offline safe-dev only."""
import hashlib
import json
import math
from pathlib import Path
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import NullLocator
import numpy as np
from scipy.special import j1
from diagnostic_reference import core_chord


def validate_packet_links(packets, hashes, marker_hash):
    production, audit, diagnostic = (packets[k] for k in ('production', 'audit', 'diagnostic'))
    if (production['inputSHA256'] != hashes['cases'] or audit['sourceSHA256'] != hashes['cases'] or
            packets['fipy']['sourceSHA256'] != hashes['cases'] or
            audit['predictionSHA256'] != hashes['production'] or
            diagnostic['statesFileSHA256'] != hashes['production'] or
            diagnostic['markersFileSHA256'] != marker_hash):
        raise ValueError('Stale or mismatched qualification artifact hashes')
    expected = [c['id'] for c in packets['cases']['cases']]
    ids = [c['spec']['id'] for c in production['cases']]
    if not ids or len(set(ids)) != len(ids) or ids != expected:
        raise ValueError('Frozen input/production case inventory mismatch')
    for packet, key in ((audit, 'cases'), (packets['fipy'], 'cases'), (diagnostic, 'spatialCases')):
        if [c['id'] for c in packet[key]] != ids:
            raise ValueError('Qualification case identity/order mismatch')


def exact(spec, time):
    edges = np.asarray(spec['edgesM'])
    r = (edges[:-1]+edges[1:])/2
    if spec['kind'] == 'couette-material':
        interface = spec['viscosityInterfaceM']
        left_mu, right_mu = spec['innerViscosityPaS'], spec['outerViscosityPaS']
        def resistance(at):
            return np.where(at < interface, (at**-2-interface**-2)/(2*left_mu)+(interface**-2-edges[-1]**-2)/(2*right_mu),
                            (at**-2-edges[-1]**-2)/(2*right_mu))
        return spec['outerWallRadS']+(spec['innerWallRadS']-spec['outerWallRadS'])*resistance(r)/resistance(edges[0])
    if spec['kind'].startswith('couette'):
        b = (spec['innerWallRadS']-spec['outerWallRadS'])/(edges[0]**-2-edges[-1]**-2)
        return spec['outerWallRadS']+b*(r**-2-edges[-1]**-2)
    if spec['kind'] == 'core-annulus':
        a, radius = spec['driveInnerRadiusM'], edges[-1]
        k = sum(spec['torqueNm'])/(2*math.pi*spec['lengthM']*spec['viscosityPaS'][0]*(radius**2-a**2))
        at = np.maximum(a, r)
        return k*(np.log(radius/at)+a*a/2*(radius**-2-at**-2))
    if spec['kind'] == 'bessel':
        k = spec['eigenvalue']
        nu = spec['viscosityPaS'][0]/spec['densityKgM3'][0]
        return 2*j1(k*r)/(k*r)*np.exp(-nu*k*k*time)
    return None


def analyze(production, fipy, independent, diagnostic):
    reference = {c['id']: c for c in fipy['cases']}
    if len(reference) != len(production['cases']) or len(independent['cases']) != len(reference):
        raise ValueError('Reference case inventory mismatch')
    rows, gates = [], []
    for case in production['cases']:
        spec = case['spec']
        states, ref = case['states'], reference[spec['id']]['states']
        if len(states) != len(ref):
            raise ValueError('Observation count mismatch')
        times = np.array([s['timeS'] for s in states])
        if not np.allclose(times, [s['timeS'] for s in ref], rtol=1e-13, atol=0):
            raise ValueError('Shared observation times required')
        values = np.array([s['omegaRadS'] for s in states])
        other = np.array([s['omegaRadS'] for s in ref])
        if values.shape != other.shape or not np.isfinite(values).all() or not np.isfinite(other).all():
            raise ValueError('Finite shared state grids required')
        analytical = exact(spec, times[-1])
        # Normalization is an exact physical peak where available, never the difference itself.
        peak = float(np.max(np.abs(analytical))) if analytical is not None else max(abs(w) for w in spec['initialOmegaRadS'])
        if spec['kind'] == 'bessel':
            peak = float(np.max(np.abs(exact(spec, 0))))
        row = {'id': spec['id'], 'kind': spec['kind'], 'cells': len(spec['initialOmegaRadS']),
               'dtS': spec['dtS'], 'steps': spec['steps'], 'normalizingPeakRadS': peak,
               'crossCodeAllTimesMaxOverPeak': float(np.max(np.abs(values-other))/peak)}
        if analytical is not None:
            row.update({'kernelFinalErrorOverPeak': float(np.max(np.abs(values[-1]-analytical))/peak),
                        'fipyFinalErrorOverPeak': float(np.max(np.abs(other[-1]-analytical))/peak)})
        rows.append(row)
    for family in ('couette', 'couette-stretched', 'couette-material', 'core-annulus', 'variable', 'variable-shifted', 'bessel'):
        family_rows = [r for r in rows if r['kind'] == family]
        finest = min(family_rows, key=lambda r: r['dtS']) if family == 'bessel' else max(family_rows, key=lambda r: r['cells'])
        gates.append({'name': family+' finest cross-code, all shared times', 'value': finest['crossCodeAllTimesMaxOverPeak'], 'limit': .005})
        if not family.startswith('variable'):
            for code in ('kernel', 'fipy'):
                gates.append({'name': family+' finest '+code+' analytical reference', 'value': finest[code+'FinalErrorOverPeak'], 'limit': .005})
    maxima = {key: max(c['maxima'][key] for c in independent['cases']) for key in independent['cases'][0]['maxima']}
    gates += [{'name': 'independent '+key, 'value': value, 'limit': 1e-9} for key, value in maxima.items()]
    projected = [c for c in diagnostic['spatialCases'] if 'cells' in c]
    finest_projection = max(projected, key=lambda c: c['cells'])
    gates.append({'name': 'finest analytical Doppler projection', 'value': finest_projection['chordMaxErrorOverExactPeak'], 'limit': .005})
    timestep_differences = []
    bessel = [c for c in production['cases'] if c['spec']['kind'] == 'bessel']
    for coarse, fine in zip(bessel, bessel[1:]):
        amplitude = max(abs(w) for w in coarse['spec']['initialOmegaRadS'])
        difference = max(abs(a-b) for a, b in zip(coarse['states'][-1]['omegaRadS'], fine['states'][-1]['omegaRadS']))/amplitude
        timestep_differences.append({'coarse': coarse['spec']['id'], 'fine': fine['spec']['id'], 'finalDifferenceOverInitialAmplitude': difference})
    for gate in gates:
        gate['passed'] = math.isfinite(gate['value']) and gate['value'] <= gate['limit']
    return {'schemaVersion': 1, 'versions': fipy['versions'], 'cases': rows, 'gates': gates,
            'allNumericalGatesPassed': all(g['passed'] for g in gates),
            'independentMaxima': maxima, 'besselTimestepDifferences': timestep_differences,
            'profileChallenge': diagnostic['profileChallenge'], 'pressureChallenge': diagnostic['pressureChallenge'],
            'experimentalValidation': False,
            'liveBackendChanged': False,
            'scope': 'Prescribed density and viscosity; standalone neutral momentum kernel. No coupled species or thermal evolution.'}


def figures(summary, production, fipy, folder):
    plt.rcParams.update({'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
    fig, axes = plt.subplots(1, 3, figsize=(13, 3.8), constrained_layout=True)
    for ax, family in zip(axes, ('couette', 'core-annulus', 'variable')):
        cases = [c for c in production['cases'] if c['spec']['kind'] == family]
        c = cases[-1]; spec = c['spec']; e = np.array(spec['edgesM']); r = (e[:-1]+e[1:])/2
        ref = next(v for v in fipy['cases'] if v['id'] == spec['id'])
        ax.plot(r, c['states'][-1]['omegaRadS'], label='Integrated resistance')
        ax.plot(r, ref['states'][-1]['omegaRadS'], '--', label='NIST FiPy')
        analytical = exact(spec, c['states'][-1]['timeS'])
        if analytical is not None:
            ax.plot(r, analytical, ':', color='black', label='Analytical steady state')
        ax.set(title=family, xlabel='Radius (m)', ylabel='Angular speed (rad/s)'); ax.legend(fontsize=8)
    fig.savefig(folder/'momentum-profiles.png', dpi=180); plt.close(fig)
    fig, axes = plt.subplots(1, 2, figsize=(10, 4), constrained_layout=True)
    for family in ('couette', 'core-annulus', 'variable'):
        rows = [r for r in summary['cases'] if r['kind'] == family]
        axes[0].loglog([r['cells'] for r in rows], [r['crossCodeAllTimesMaxOverPeak'] for r in rows], 'o-', label=family)
    axes[0].axhline(.005, color='black', ls=':', label='Frozen gate')
    axes[0].set(xlabel='Radial cells', ylabel='Maximum cross-code difference / peak'); axes[0].legend()
    axes[0].set_xticks([16, 32, 64, 128, 256, 512], ['16', '32', '64', '128', '256', '512'])
    axes[0].xaxis.set_minor_locator(NullLocator())
    rows = [r for r in summary['cases'] if r['kind'] == 'bessel']
    for code in ('kernel', 'fipy'):
        axes[1].loglog([1000*r['dtS'] for r in rows], [r[code+'FinalErrorOverPeak'] for r in rows], 'o-', label=code)
    axes[1].axhline(.005, color='black', ls=':'); axes[1].set(xlabel='Timestep (ms)', ylabel='Final Bessel error / initial peak'); axes[1].legend()
    axes[1].set_xticks([.125, .25, .5, 1], ['0.125', '0.25', '0.5', '1'])
    axes[1].xaxis.set_minor_locator(NullLocator())
    fig.savefig(folder/'momentum-convergence.png', dpi=180); plt.close(fig)
    fig, ax = plt.subplots(figsize=(7, 4), constrained_layout=True)
    points = summary['profileChallenge']['points']
    for split in ('train', 'test'):
        p = [p for p in points if p['split'] == split]
        ax.errorbar([v['rCm'] for v in p], [v['vMS'] for v in p], xerr=[v['rHalfWidthCm'] for v in p],
                    yerr=[v['vHalfWidthMS'] for v in p], fmt='o', label=split+' markers')
    fit = summary['profileChallenge']; chords = np.linspace(.00001, fit['radiusM']-.00001, 300)
    ax.plot(100*chords, [core_chord(x, fit['innerDriveRadiusM'], fit['radiusM'], fit['fitScalePerS']) for x in chords],
            label='Viscous candidate; one fitted amplitude')
    ax.set(xlabel='Apparent Doppler chord (cm)', ylabel='Apparent speed (m/s)', title='Conditional historical profile challenge'); ax.legend(fontsize=8)
    fig.savefig(folder/'historical-profile-challenge.png', dpi=180); plt.close(fig)


if __name__ == '__main__':
    folder = Path(sys.argv[1])
    files = {name: folder/(name+'.json') for name in ('cases', 'production', 'fipy', 'audit', 'diagnostic')}
    packets = {name: json.loads(path.read_text()) for name, path in files.items()}
    hashes = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in files.items()}
    marker_hash = hashlib.sha256(Path('scientific/experimental-v64/data/markers-corrected.json').read_bytes()).hexdigest()
    validate_packet_links(packets, hashes, marker_hash)
    result = analyze(packets['production'], packets['fipy'], packets['audit'], packets['diagnostic'])
    result['inputsSHA256'] = hashes
    figures(result, packets['production'], packets['fipy'], folder)
    with (folder/'analysis.json').open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({key: result[key] for key in ('gates', 'allNumericalGatesPassed', 'besselTimestepDifferences')}, indent=2))
