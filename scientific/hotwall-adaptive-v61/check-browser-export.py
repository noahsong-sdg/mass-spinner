"""VM-only streaming audit of an actual startup UI download, plain or gzip.

Reconstruct gas fields and global ledgers independently from accepted data.
Solid cell enthalpy/temperature inversion and local flux accuracy are not audited.
"""
import gzip
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import sys

import ijson


def native_numbers(value):
    # Parse JSON integers without a 64-bit ceiling, then restore binary64
    # arithmetic only for the bounded metadata record or checkpoint in use.
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [native_numbers(item) for item in value]
    if isinstance(value, dict):
        return {key: native_numbers(item) for key, item in value.items()}
    return value


def finite(value):
    assert isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    return value


def close(actual, expected, scale=None, tolerance=2e-12):
    finite(actual)
    finite(expected)
    assert abs(actual - expected) <= tolerance * max(abs(actual), abs(expected), scale or 0.)


def audit(path, root=Path('/work/home/fix-v43-source')):
    path = Path(path)
    opener = gzip.open if path.suffix == '.gz' else open

    def read(prefix):
        with opener(path, 'rb') as stream:
            return native_numbers(next(ijson.items(stream, prefix)))

    assert read('model') == 'marathon-centrifuge'
    config = read('result.config')
    cells = read('result.transport.cells')
    steps = read('result.transport.steps')
    control = read('result.transport.timeControl')
    operation = read('result.transport.operation')
    mechanics = read('result.transport.mechanics')
    masses = read('result.transport.speciesMassKg')
    liner = read('result.transport.thermalLiner')
    identity = read('producingCode')
    assert cells == 256 and steps == 512
    assert control['method'] == 'BE step doubling'
    assert control['relativeTolerance'] == 6.25e-7 and control['temperatureToleranceK'] == 1e-7
    assert 0 <= finite(control['maxErrorRatio']) <= 1
    assert type(control['acceptedPairs']) is int and control['acceptedPairs'] > 0
    assert type(control['rejectedSteps']) is int and control['rejectedSteps'] >= 0
    assert control['startTimeS'] == 0 and not operation['events']
    thermal = operation['thermal']
    assert thermal['enabled'] and thermal['spatial']['material'] == 'tungsten'
    assert thermal['spatial']['cells'] == 16 and thermal['gas']['accuracy'] == {
        'relativeTolerance': control['relativeTolerance'], 'temperatureToleranceK': control['temperatureToleranceK']}
    assert identity['schemaVersion'] == 1 and identity['algorithm'] == 'sha256'
    encoded = json.dumps(identity['sourceFiles'], separators=(',', ':'), ensure_ascii=False).encode()
    assert hashlib.sha256(encoded).hexdigest() == identity['sourceHash']
    assert 'src/fuel-time-control.ts' in identity['sourceFiles']
    for name, digest in identity['sourceFiles'].items():
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name

    k = 1.380649e-23
    volume = math.pi * config['radiusM']**2 * config['lengthM']
    number = config['pressurePa'] * volume / (k * config['gasK'])
    fraction = config['lightFraction']
    weight = fraction * masses[0] / (fraction*masses[0] + (1-fraction)*masses[1])
    initial_energy = None
    count = 0
    previous = None
    maxima = {'species': 0., 'angular': 0., 'mechanical': 0., 'thermal': 0.}
    exported_maxima = {'angular': 0., 'mechanical': 0., 'thermal': 0.}
    first_nonzero = None
    with opener(path, 'rb') as stream:
        # Exhaust the iterator through EOF, including the enclosing root and any
        # trailing data. Never stop after the last checkpoint or metadata match.
        for parsed in ijson.items(stream, 'result.transport.checkpoints.item'):
            state = native_numbers(parsed)
            time = finite(state['timeS'])
            if previous is None:
                assert time == 0
            else:
                dt = time - previous['timeS']
                assert dt > 0
                for species in ('ion', 'neutral'):
                    phase = species + 'PhaseRad'
                    close(state[phase] - previous[phase], dt * state[species + 'RadS'],
                          scale=max(1e-20, abs(state[phase])), tolerance=1e-9)
                if first_nonzero is None:
                    first_nonzero = {name: state[name] for name in ('timeS', 'ionRadS', 'neutralRadS')}
            gas = state['thermal']['gas']
            for key in ('temperatureK', 'pressurePa', 'cellEnergyJ', 'radiusM'):
                assert len(gas[key]) == cells
                assert all(finite(value) > 0 for value in gas[key])
            assert len(gas['speciesEnergyJ']) == 2
            assert all(len(row) == cells for row in gas['speciesEnergyJ'])
            for key in ('lightMass', 'heavyMass'):
                row = state[key]
                assert len(row) == cells and all(finite(value) >= 0 for value in row)
                maxima['species'] = max(maxima['species'], abs(math.fsum(row) - 1))
                if previous is None:
                    for value in row:
                        close(value, 1/cells)
            for i in range(cells):
                light = number * fraction * state['lightMass'][i]
                heavy = number * (1-fraction) * state['heavyMass'][i]
                particles = light + heavy
                assert particles > 0
                energy = 1.5 * k * particles * gas['temperatureK'][i]
                close(gas['cellEnergyJ'][i], energy)
                close(gas['pressurePa'][i], k * particles * gas['temperatureK'][i] / (volume/cells))
                close(gas['radiusM'][i], config['radiusM'] * math.sqrt((i+.5)/cells))
                for species, population in enumerate((light, heavy)):
                    close(gas['speciesEnergyJ'][species][i], energy * population/particles)
            gas_energy = math.fsum(gas['cellEnergyJ'])
            mean = gas_energy / (1.5*k*number)
            close(gas['energyJ'], gas_energy)
            close(gas['meanK'], mean)
            close(gas['minK'], min(gas['temperatureK']))
            close(gas['maxK'], max(gas['temperatureK']))
            close(state['thermal']['gasK'], mean)
            close(state['thermal']['gasEnergyJ'], gas_energy)
            close(state['thermal']['pressurePa'], config['pressurePa']*mean/config['gasK'])
            solid = state['thermal']['spatial']
            assert len(solid['cellEnergyJ']) == len(liner['massesKg']) == 16
            assert all(finite(value) >= 0 for value in solid['cellEnergyJ'])
            assert len(solid['temperatureK']) == len(solid['radiusM']) == 16
            assert all(300 <= finite(value) <= 1900 for value in solid['temperatureK'])
            for actual, expected in zip(solid['radiusM'], liner['radiusCentersM']):
                close(actual, expected)
            wall_energy = math.fsum(solid['cellEnergyJ'])
            close(solid['energyJ'], wall_energy)
            close(state['thermal']['linerEnergyJ'], wall_energy)
            close(solid['meanK'], math.fsum(t*m for t, m in zip(solid['temperatureK'], liner['massesKg']))/math.fsum(liner['massesKg']))
            close(state['thermal']['linerK'], solid['meanK'])
            for key, expected in (('minK', min(solid['temperatureK'])), ('maxK', max(solid['temperatureK'])),
                                  ('innerK', solid['temperatureK'][0]), ('outerK', solid['temperatureK'][-1])):
                close(solid[key], expected)
            if previous is None:
                for value in gas['temperatureK']:
                    close(value, config['gasK'])
                for value in solid['temperatureK']:
                    close(value, config['linerK'])
                initial_energy = 1.5*k*number*config['gasK'] + wall_energy

            moment = lambda row: math.fsum(value*(i+.5)/cells for i, value in enumerate(row))
            inertia = 2*mechanics['nn']*(weight*moment(state['lightMass']) + (1-weight)*moment(state['heavyMass']))
            close(state['neutralInertiaKgM2'], inertia)
            close(state['neutralInertiaRatio'], inertia/mechanics['nn'])
            li, ln = finite(state['ionAngularMomentumKgM2S']), finite(state['neutralAngularMomentumKgM2S'])
            close(state['ionRadS'], li/mechanics['ii'])
            close(state['neutralRadS'], ln/inertia)
            kinetic = .5*(li**2/mechanics['ii'] + ln**2/inertia)
            close(state['energy']['kineticJ'], kinetic)
            energy, impulse, heat = state['energy'], state['angularMomentum'], state['thermal']
            for key in ('slipDissipationJ', 'dragDissipationJ', 'numericalDissipationJ'):
                assert finite(energy[key]) >= 0
            assert finite(heat['ohmicEnergyJ']) >= 0
            for values, keys in ((energy, ('driveWorkJ', 'slipDissipationJ', 'dragDissipationJ', 'redistributionWorkJ', 'numericalDissipationJ')),
                                 (impulse, ('driveImpulseKgM2S', 'dragImpulseKgM2S')),
                                 (heat, ('ohmicEnergyJ', 'coolingEnergyJ'))):
                for key in keys:
                    finite(values[key])
                    if previous is None:
                        assert values[key] == 0
            if previous is None:
                assert li == ln == state['ionPhaseRad'] == state['neutralPhaseRad'] == 0
            residuals = {
                'angular': (li+ln-impulse['driveImpulseKgM2S']+impulse['dragImpulseKgM2S'],
                            abs(li)+abs(ln)+abs(impulse['driveImpulseKgM2S'])+abs(impulse['dragImpulseKgM2S'])),
                'mechanical': (kinetic-energy['driveWorkJ']+energy['slipDissipationJ']+energy['dragDissipationJ']+energy['redistributionWorkJ']+energy['numericalDissipationJ'],
                               kinetic+abs(energy['driveWorkJ'])+energy['slipDissipationJ']+energy['dragDissipationJ']+abs(energy['redistributionWorkJ'])+energy['numericalDissipationJ']),
                'thermal': (kinetic+gas_energy+wall_energy-initial_energy-energy['driveWorkJ']-heat['ohmicEnergyJ']+heat['coolingEnergyJ']+energy['numericalDissipationJ'],
                            initial_energy+abs(energy['driveWorkJ'])+heat['ohmicEnergyJ']+abs(heat['coolingEnergyJ'])+kinetic)}
            for name, (residual, scale) in residuals.items():
                values = {'angular': impulse, 'mechanical': energy, 'thermal': heat}[name]
                reported = finite(values['relativeResidual'])
                assert reported >= 0
                close(values['residualKgM2S' if name == 'angular' else 'residualJ'], residual,
                      scale=scale, tolerance=2e-11)
                relative = abs(residual)/scale if scale > 0 else 0. if residual == 0 else math.inf
                maxima[name] = max(maxima[name], relative)
                exported_maxima[name] = max(exported_maxima[name], reported)
            assert all(math.isfinite(value) and value < 2e-8 for value in (*maxima.values(), *exported_maxima.values()))
            previous = state
            count += 1
        assert stream.read(1) == b''
    assert previous and previous['timeS'] == config['durationS']
    assert count == 2*control['acceptedPairs'] + 1
    return {'passed': True, 'acceptedKnots': count, 'cells': cells, 'nominalIntervals': steps,
            'timeControl': control, 'reconstructedMaxima': maxima, 'exportedMaxima': exported_maxima,
            'firstNonzero': first_nonzero, 'sourceFiles': len(identity['sourceFiles']), 'sourceHash': identity['sourceHash'],
            'checks': {'completeJsonStreamConsumed': True, 'canonicalGasFields': True,
                       'massWeightedRotorState': True, 'endpointPhaseQuadratures': True,
                       'globalLedgersRelativeToInitialCellEnergy': True,
                       'solidEnthalpyInversion': False, 'localFluxAccuracy': False},
            'parser': {'package': 'ijson', 'version': ijson.__version__}}


if __name__ == '__main__':
    print(json.dumps(audit(Path(sys.argv[1])), indent=2))
