#!/usr/bin/env python3
"""Independent, streaming accounting audit; never a physical qualification.

Run only in the bounded offline scientific runner. Input is the frozen-source
probe's assessment and concatenated-gzip JSONL streams. No simulator imports.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys
from decimal import Decimal, localcontext

K = 1.380649e-23
EPS = sys.float_info.epsilon
SOURCE_LEVELS = (8, 16, 32, 64, 128, 256)
GAS_LEVELS = (*SOURCE_LEVELS, 512, 1024, 2048, 4096)
TIME_LEVELS = (256, 512, 1024)
JOINT_LEVELS = (1024, 2048, 4096)


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def finite(value, name):
    require(type(value) in (int, float) and math.isfinite(value),
            f'{name}: finite numeric value required')
    return value


def array(value, length, name, positive=False):
    require(isinstance(value, list) and len(value) == length,
            f'{name}: expected {length} entries')
    for entry in value:
        finite(entry, name)
        require(entry > 0 if positive else True, f'{name}: positive value required')
    return value


def read_json(text):
    def refuse(token):
        raise ValueError(f'Nonfinite JSON constant: {token}')
    return json.loads(text, parse_constant=refuse)


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65536), b''):
            checksum.update(block)
    return checksum.hexdigest()


def confined(root, name):
    require(isinstance(name, str), 'Source/file name must be a string')
    path = (root / name).resolve()
    require(path.is_relative_to(root.resolve()), f'Path outside supplied root: {name}')
    return path


def ratio(value, denominator):
    # No denominator floor: a zero input does not establish relative accuracy.
    if denominator == 0:
        return None
    answer = value / denominator
    require(math.isfinite(answer), 'Nonrepresentable diagnostic ratio')
    return answer


def delta(new, old):
    # Subtract each nearby stored energy first, then faithfully sum. This avoids
    # cancellation of whole large background sums. Storage quantization remains.
    return math.fsum(a - b for a, b in zip(new, old))


def projection(sources, history):
    """Exact Decimal lifting separates projection arithmetic from source error."""
    n = history['n']
    actual = array(history['powerW'], n, 'projected power', positive=True)
    source = sources[n] if history['mode'] == 'native' else sources[256]
    max_defect = 0.0
    with localcontext() as context:
        context.prec = 80
        lifted = [Decimal.from_float(float(v)) for v in source]
        for i, value in enumerate(actual):
            if n <= len(source):
                count = len(source) // n
                terms = lifted[i * count:(i + 1) * count]
                expected = sum(terms, Decimal(0))
                # Forward-error bound for the producer's positive ordered sum.
                gamma = Decimal.from_float((count - 1) * EPS / (1 - (count - 1) * EPS))
                bound = gamma * sum(map(abs, terms), Decimal(0))
            else:
                expected = lifted[i * len(source) // n] / (n // len(source))
                bound = Decimal(0)  # Binary power-of-two child splitting is exact here.
            defect = abs(Decimal.from_float(float(value)) - expected)
            require(defect <= bound, f'Nonconservative source mapping at {history["file"]} cell {i}')
            max_defect = max(max_defect, float(defect))
        total_defect = float(sum(map(Decimal.from_float, map(float, actual)), Decimal(0)) - sum(lifted, Decimal(0)))
    return {'maxCellMappingDefectW': max_defect,
            'totalPowerMappingDefectW': total_defect,
            'totalPowerMappingDefectRelative': ratio(total_defect, math.fsum(source)),
            'reference': 'same native grid' if history['mode'] == 'native' else 'finite r256 source'}


def audit_case(root, history, conditions, sources):
    n, steps = history['n'], history['steps']
    require(type(n) is int and n >= 2 and type(steps) is int and steps > 0,
            'Positive integer grid/step counts required')
    path = confined(root, history['file'])
    checksum = digest(path)
    require(checksum == history['sha256'], f'Compressed-byte identity mismatch: {path.name}')
    mapping = projection(sources, history)
    number = conditions['totalParticles']
    duration = conditions['durationS']
    dt = duration / steps
    power = math.fsum(history['powerW'])
    peaks = dict.fromkeys(('inventoryDefect', 'cellContinuityDefect', 'depositedScheduleDefectJ',
                          'gasStepDefectJ', 'linerStepDefectJ', 'totalStepDefectJ',
                          'gasPrefixDefectJ', 'linerPrefixDefectJ', 'totalPrefixDefectJ',
                          'nativeTemperatureMismatchK', 'maximumRowResidualJ'), 0.0)
    deposited = wall = 0.0
    first = previous = last = None
    count = 0
    minimum_mass = math.inf
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        for line in stream:
            row = read_json(line)
            require(row.get('step') == count, f'Missing/duplicate accepted step: {path.name}')
            require(count <= steps, f'Too many accepted rows: {path.name}')
            expected_time = duration if count == steps else count * dt
            require(finite(row['timeS'], 'time') == expected_time,
                    f'Accepted clock mismatch: {path.name} step {count}')
            mass = array(row['mass'], n, 'mass', positive=True)
            minimum_mass = min(minimum_mass, min(mass))
            gas = array(row['gasEnergyJ'], n, 'gas energy', positive=True)
            liner = array(row['linerEnergyJ'], 3, 'liner energy')
            native_t = array(row['solveTemperatureK'], n, 'native temperature', positive=True)
            transfers = array(row['faceTransfers'], n - 1, 'face transfers')
            heat = finite(row['intervalWallHeatJ'], 'interval wall heat')
            heat_input = finite(row['intervalDepositedJ'], 'interval deposited heat')
            residual = finite(row['maximumRowResidualJ'], 'thermal row residual')
            require(residual >= 0, 'Negative maximum residual')
            inv_defect = abs(math.fsum(mass) - 1)
            require(inv_defect <= 2e-8, 'Existing normalized-inventory invariant failed')
            peaks['inventoryDefect'] = max(peaks['inventoryDefect'], inv_defect)
            peaks['maximumRowResidualJ'] = max(peaks['maximumRowResidualJ'], residual)
            temperature_mismatch = max(abs(t - u / (1.5 * K * number * p))
                                       for t, u, p in zip(native_t, gas, mass))
            peaks['nativeTemperatureMismatchK'] = max(peaks['nativeTemperatureMismatchK'], temperature_mismatch)
            if count == 0:
                require(heat == heat_input == 0 and all(v == 0 for v in transfers),
                        'Initial sample cannot transport/deposit energy')
                require(all(p == 1 / n for p in mass), 'Unexpected initial inventory')
                first = row
            else:
                defects = []
                for i, p in enumerate(mass):
                    change = (transfers[i - 1] if i else 0) - (transfers[i] if i < n - 1 else 0)
                    defect = abs(p - previous['mass'][i] - change)
                    require(defect <= 2e-10 * max(1, abs(change)),
                            'Existing accepted species-transfer invariant failed')
                    defects.append(defect)
                peaks['cellContinuityDefect'] = max(peaks['cellContinuityDefect'], max(defects))
                schedule = heat_input - dt * power
                peaks['depositedScheduleDefectJ'] = max(peaks['depositedScheduleDefectJ'], abs(schedule))
                dg = delta(gas, previous['gasEnergyJ'])
                dl = delta(liner, previous['linerEnergyJ'])
                gas_defect = math.fsum((dg, heat, -heat_input))
                liner_defect = dl - heat
                total_defect = math.fsum((dg, dl, -heat_input))
                for name, value in [('gasStepDefectJ', gas_defect), ('linerStepDefectJ', liner_defect),
                                    ('totalStepDefectJ', total_defect)]:
                    peaks[name] = max(peaks[name], abs(value))
                deposited = math.fsum((deposited, heat_input))
                wall = math.fsum((wall, heat))
                dg0 = delta(gas, first['gasEnergyJ'])
                dl0 = delta(liner, first['linerEnergyJ'])
                for name, value in [('gasPrefixDefectJ', math.fsum((dg0, wall, -deposited))),
                                    ('linerPrefixDefectJ', dl0 - wall),
                                    ('totalPrefixDefectJ', math.fsum((dg0, dl0, -deposited)))]:
                    peaks[name] = max(peaks[name], abs(value))
            previous = last = row
            count += 1
    require(count > 0, 'Empty accepted stream')
    complete = history.get('failure') is None
    require(count == steps + 1 if complete else count <= steps + 1,
            f'Accepted-row count inconsistent with failure status: {path.name}')
    total_delta = math.fsum((delta(last['gasEnergyJ'], first['gasEnergyJ']),
                            delta(last['linerEnergyJ'], first['linerEnergyJ'])))
    normalized = {name: ratio(value, abs(deposited)) for name, value in peaks.items()
                  if name.endswith('J')}
    return {'file': history['file'], 'sha256': checksum, 'n': n, 'steps': steps,
            'acceptedRows': count, 'complete': complete, 'failure': history.get('failure'),
            'projection': mapping, 'minimumInventory': minimum_mass, 'peaks': peaks,
            'energyPeaksRelativeToActualDeposited': normalized,
            'actualDepositedJ': deposited, 'actualWallHeatJ': wall,
            'finalTotalEnergyChangeJ': total_delta,
            'finalTotalEnergyDefectJ': total_delta - deposited,
            'finalTotalEnergyDefectRelativeToActualDeposited': ratio(total_delta - deposited, abs(deposited))}


def audit(root, source_root=None):
    root = root.resolve()
    packet_path = root / 'source-assessment.json'
    packet = read_json(packet_path.read_text())
    require(packet.get('schemaVersion') == 2, 'Source assessment schemaVersion 2 required')
    require(packet.get('kind') == 'frozen-zero-rotation-radial-source-probe', 'Unknown packet')
    require(packet.get('numericallyQualified') is False and packet.get('experimentallyQualified') is False,
            'Probe must not claim qualification')
    conditions = packet['conditions']
    for name in ('totalParticles', 'durationS', 'R', 'L', 'T0', 'D'):
        require(finite(conditions[name], name) > 0, f'{name} must be positive')
    require(tuple(conditions['gasLevels']) == GAS_LEVELS and tuple(conditions['timeLevels']) == TIME_LEVELS,
            'Unexpected prospectively declared grid/time plan')
    sources = {}
    for source in packet['sources']:
        n = source['n']
        require(n not in sources, 'Duplicate native source')
        sources[n] = array(source['powerW'], n, 'native source', positive=True)
    require(tuple(sorted(sources)) == SOURCE_LEVELS, 'Missing/unexpected native source grids')
    expected = {('native', n, 256) for n in SOURCE_LEVELS}
    expected |= {('common-fine', n, 256) for n in GAS_LEVELS}
    expected |= {('common-fine', n, t) for n in JOINT_LEVELS for t in TIME_LEVELS[1:]}
    seen = [(h['mode'], h['n'], h['steps']) for h in packet['histories']]
    require(len(seen) == len(set(seen)) and set(seen) == expected,
            'Missing/duplicate/unexpected prescribed trajectory')
    files = [h['file'] for h in packet['histories']]
    require(len(files) == len(set(files)), 'A stream cannot represent multiple trajectories')
    verified_sources = {}
    if source_root is not None:
        for name, claimed in packet['sourceFiles'].items():
            actual = digest(confined(source_root, name))
            require(actual == claimed, f'Producer source mismatch: {name}')
            verified_sources[name] = actual
    cases = [audit_case(root, history, conditions, sources) for history in packet['histories']]
    return {'kind': 'independent-frozen-source-accounting-audit',
            'assessmentSha256': digest(packet_path), 'auditCodeSha256': digest(Path(__file__)),
            'sourceFilesCheckedAgainstSuppliedRoot': verified_sources,
            'sourceIdentityLimitation': 'Byte identity does not authenticate measurements or physical applicability.',
            'structuralChecksPassed': True,
            'allTrajectoriesComplete': all(c['complete'] for c in cases), 'cases': cases,
            'numericallyQualified': False, 'experimentallyQualified': False,
            'energyAcceptanceThreshold': None,
            'scope': 'Structural invariants and raw finite-source accounting only. No continuum, timestep, rotating-model or experimental qualification. Stored-energy quantization remains.'}


def self_test():
    import tempfile
    import unittest

    class Tests(unittest.TestCase):
        def fixture(self, directory):
            number = 1 / K
            old = [750., 750.]
            rows = []
            for step in (0, 1):
                energy = [u + .25 * step for u in old]
                rows.append(dict(step=step, timeS=step, mass=[.5, .5], gasEnergyJ=energy,
                                 linerEnergyJ=[1 + .5 * step, 2., 3.], intervalWallHeatJ=.5 * step,
                                 intervalDepositedJ=step, solveTemperatureK=[u / (1.5 * K * number * .5) for u in energy],
                                 faceTransfers=[0.], maximumRowResidualJ=0.))
            path = directory / 'case.jsonl.gz'
            path.write_bytes(b''.join(gzip.compress((json.dumps(row) + '\n').encode()) for row in rows))
            return dict(n=2, steps=1, mode='native', powerW=[.5, .5], file=path.name,
                        sha256=digest(path), failure=None), dict(totalParticles=number, durationS=1.)

        def test_concatenated_members_accounting(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                history, conditions = self.fixture(root)
                result = audit_case(root, history, conditions, {2: [.5, .5]})
                self.assertEqual(result['acceptedRows'], 2)
                self.assertEqual(result['finalTotalEnergyDefectJ'], 0)
                self.assertEqual(result['peaks']['gasStepDefectJ'], 0)
                self.assertEqual(result['peaks']['linerStepDefectJ'], 0)

        def test_changed_stream_and_path_refuse(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                history, conditions = self.fixture(root)
                (root / history['file']).write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                    audit_case(root, history, conditions, {2: [.5, .5]})
                with self.assertRaisesRegex(ValueError, 'outside'):
                    confined(root, '../escape')

        def test_zero_denominator_and_projection_refusal(self):
            self.assertIsNone(ratio(0, 0))
            with self.assertRaisesRegex(ValueError, 'Nonconservative'):
                projection({2: [.5, .5]}, dict(n=2, mode='native', powerW=[.6, .5], file='bad'))

        def test_stale_schema_and_inconsistent_transfers_refuse(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                (root / 'source-assessment.json').write_text('{"schemaVersion":1}')
                with self.assertRaisesRegex(ValueError, 'schemaVersion 2'):
                    audit(root)
                history, conditions = self.fixture(root)
                path = root / history['file']
                with gzip.open(path, 'rt') as stream:
                    rows = [read_json(line) for line in stream]
                rows[1]['faceTransfers'] = [.001]
                path.write_bytes(b''.join(gzip.compress((json.dumps(row) + '\n').encode()) for row in rows))
                history['sha256'] = digest(path)
                with self.assertRaisesRegex(ValueError, 'species-transfer'):
                    audit_case(root, history, conditions, {2: [.5, .5]})

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Tests)
    return unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path)
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return 0 if self_test() else 1
    require(args.directory is not None, 'A source-output directory is required')
    result = audit(args.directory, args.source_root)
    encoded = json.dumps(result, indent=2, allow_nan=False) + '\n'
    if args.output:
        with args.output.open('x') as stream:
            stream.write(encoded)
    else:
        print(encoded, end='')
    return 0 if result['allTrajectoriesComplete'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
