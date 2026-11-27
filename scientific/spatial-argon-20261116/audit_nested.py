#!/usr/bin/env python3
"""Stream the nested-grid receipt; audit accounting, not physical accuracy.

Execute in the offline bounded runner. Only stdlib and sibling audit plumbing
are used. The established convergence classifier is deliberately not copied.
"""
import argparse
import gzip
import json
import math
from pathlib import Path
from audit_source import array, confined, delta, digest, finite, ratio, read_json, require

GAS_LEVELS = (1024, 2048, 4096)
TIME_LEVELS = (64, 128, 256)


def paired_liner_changes(current, old):
    return [math.fsum((h - prior_h, low - prior_low)) for h, prior_h, low, prior_low in zip(
        current['linerCellEnergyJ'], old['linerCellEnergyJ'],
        current.get('linerCellEnergyCorrectionJ', [0.] * 3), old.get('linerCellEnergyCorrectionJ', [0.] * 3))]


def audit_case(root, case, packet):
    n, steps = case['n'], case['steps']
    conditions = packet['conditions']
    ne = conditions['electricalRadialCells']
    require(type(n) is int and type(ne) is int and ne >= 2 and n % ne == 0,
            'Nested equal-volume gas/electrical cells required')
    require(type(steps) is int and steps > 0, 'Positive integer step count required')
    number, duration = packet['totalParticles'], packet['durationS']
    dt, children = duration / steps, n // ne
    path = confined(root, case['file'])
    checksum = digest(path)
    require(checksum == case['sha256'], f'Compressed-byte identity mismatch: {path.name}')
    peaks = {}
    def peak(name, value):
        finite(value, name)
        peaks[name] = max(peaks.get(name, 0.), abs(value))
    first = previous = last = None
    work_terms, wall_terms, loss_terms, cooling_terms = [], [], [], []
    drive_terms, wall_impulse_terms, heat_terms = [], [], []
    step_relative, prefix_relative = {}, {}
    def relative_peak(target, name, defect, actual_input):
        value = ratio(abs(defect), actual_input)
        if value is not None:
            target[name] = max(target.get(name, 0.), value)
    count = incremental_rows = paired_rows = 0
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        for line in stream:
            row = read_json(line)
            s = row['snapshot']
            require(row['step'] == count and count <= steps, 'Missing/duplicate accepted row')
            require(finite(s['timeS'], 'time') == (duration if count == steps else count * dt),
                    'Accepted clock mismatch')
            light = array(s['lightMass'], n, 'light inventory', positive=True)
            heavy = array(s['heavyMass'], n, 'heavy inventory', positive=True)
            gas = array(s['gasCellEnergyJ'], n, 'gas internal energy', positive=True)
            liner = array(s['linerCellEnergyJ'], 3, 'liner internal energy')
            low_key = 'linerCellEnergyCorrectionJ'
            lows = array(s.get(low_key, [0.] * 3), 3, 'liner energy correction')
            require(all(h + low == h for h, low in zip(liner, lows)), 'Liner high/low pairs must be normalized')
            paired_rows += low_key in s
            omega = array(s['omegaRadS'], n, 'accepted angular speed')
            source_omega = array(row['sourceOmegaRadS'], n, 'source angular speed')
            inertia = array(s['inertiaKgM2'], n, 'accepted inertia', positive=True)
            torque = array(s['torqueByGasCellNm'], n, 'mapped torque')
            joule = array(s['jouleByGasCellW'], n, 'mapped Joule power')
            require(min(joule) >= 0, 'Negative Joule heat')
            transfers = row['faceTransfers']
            require(isinstance(transfers, list) and len(transfers) == 2, 'Two accepted species flux arrays required')
            for values in transfers:
                array(values, n - 1, 'accepted face transfers')
            for name in ('kineticJ', 'angularMomentumKgM2S', 'mechanicalPowerW', 'joulePowerW',
                         'electricalPowerW', 'intervalElectricalWorkJ', 'intervalGasWallHeatJ',
                         'stepMechanicalEndpointDefectJ', 'stepOmegaMismatchRadS',
                         'thermalRowResidualJ', 'electricalEnergyResidualW'):
                finite(s[name], name)
            for name in ('numericalLossJ', 'wallWorkJ', 'coolingJ', 'driveImpulse', 'wallImpulse',
                         'energyResidualJ', 'angularResidual'):
                finite(row[name], name)
            require(row['numericalLossJ'] >= 0, 'Negative native numerical dissipation')
            fields = ('thermalEnergyChangeJ', 'thermalStorageDefectJByCell', 'thermalGasSourceJ',
                      'thermalTemperatureIncrementK', 'thermalGasSolveTemperatureK')
            compensated_key = 'thermalCompensatedStorageDefectJByCell'
            if compensated_key in row:
                require(low_key in s and all(name in row for name in fields), 'Partial compensated thermal receipt')
            if any(name in row for name in fields):
                require(all(name in row for name in fields), 'Partial incremental thermal receipt')
                changes = array(row[fields[0]], n + 3, fields[0])
                storage = array(row[fields[1]], n + 3, fields[1])
                source = array(row[fields[2]], n, fields[2])
                array(row[fields[3]], n + 3, fields[3])
                solve_t = array(row[fields[4]], n, fields[4], positive=True)
                old_energy = previous['gasCellEnergyJ'] + previous['linerCellEnergyJ'] if previous else gas + liner
                stored_changes = [u - old for u, old in zip(gas + liner, old_energy)]
                peak('thermalCellStorageIdentityMismatchJ', max(abs(a - b - c) for a, b, c in zip(stored_changes, changes, storage)))
                incremental_residual = math.fsum([*changes, row['coolingJ'], *(-v for v in source)])
                stored_residual = math.fsum([*stored_changes, row['coolingJ'], *(-v for v in source)])
                peak('thermalIncrementEnergyResidualJ', incremental_residual)
                peak('thermalStoredEnergyResidualJ', stored_residual)
                peak('thermalStorageResidualIdentityMismatchJ', math.fsum((stored_residual, -incremental_residual, -math.fsum(storage))))
                if compensated_key in row:
                    compensated = array(row[compensated_key], n + 3, compensated_key)
                    paired_changes = stored_changes[:n] + paired_liner_changes(s, previous or s)
                    peak('thermalCompensatedCellStorageIdentityMismatchJ', max(abs(a - b - c) for a, b, c in zip(paired_changes, changes, compensated)))
                    paired_residual = math.fsum([*paired_changes, row['coolingJ'], *(-v for v in source)])
                    peak('thermalPairedStoredEnergyResidualJ', paired_residual)
                    peak('thermalCompensatedStorageResidualIdentityMismatchJ', math.fsum((paired_residual, -incremental_residual, -math.fsum(compensated))))
                canonical_t = [u / (1.5 * 1.380649e-23 * number * ((a + b) / 2)) for u, a, b in zip(gas, light, heavy)]
                peak('thermalNativeCanonicalGasMismatchK', max(abs(a - b) for a, b in zip(solve_t, canonical_t)))
                incremental_rows += 1
            # Independently form RΩ and the coarse source from constant children.
            coarse_work = []
            for j in range(ne):
                group = slice(j * children, (j + 1) * children)
                require(all(v == torque[j * children] for v in torque[group]) and
                        all(v == joule[j * children] for v in joule[group]),
                        'Integrated sources must be shared equally among q-volume children')
                coarse_work.append(math.fsum(torque[group]) * math.fsum(source_omega[group]) / children)
            source_work = math.fsum(t * w for t, w in zip(torque, source_omega))
            endpoint_work = math.fsum(t * w for t, w in zip(torque, omega))
            peak('adjointGroupingDefectW', source_work - math.fsum(coarse_work))
            peak('sourceMechanicalPowerDefectW', source_work - s['mechanicalPowerW'])
            peak('projectedJoulePowerDefectW', math.fsum(joule) - s['joulePowerW'])
            electrical_defect = math.fsum((s['electricalPowerW'], -s['joulePowerW'], -s['mechanicalPowerW']))
            peak('electricalPowerDefectW', electrical_defect)
            peak('nativeElectricalResidualMismatchW', electrical_defect - s['electricalEnergyResidualW'])
            peak('nativeOmegaMismatchDisagreementRadS', max(abs(a - b) for a, b in zip(omega, source_omega)) - s['stepOmegaMismatchRadS'])
            peak('nativeKineticReconstructionDefectJ', math.fsum(.5 * i * w * w for i, w in zip(inertia, omega)) - s['kineticJ'])
            peak('nativeAngularReconstructionDefect', math.fsum(i * w for i, w in zip(inertia, omega)) - s['angularMomentumKgM2S'])
            mass_kg = [number * conditions['speciesMassKg'][0] * (a + b) / 2 for a, b in zip(light, heavy)]
            expected_inertia = [m * conditions['radiusM']**2 * (i + .5) / n for i, m in enumerate(mass_kg)]
            peak('acceptedInertiaReconstructionDefectKgM2', max(abs(a - b) for a, b in zip(inertia, expected_inertia)))
            peak('thermalRowResidualJ', s['thermalRowResidualJ'])
            for inventory in (light, heavy):
                defect = abs(math.fsum(inventory) - 1)
                require(defect <= 2e-8, 'Existing normalized-inventory invariant failed')
                peak('inventoryDefect', defect)
            if count == 0:
                require(all(v == 0 for values in transfers for v in values), 'Initial sample transports species')
                require(all(row[name] == 0 for name in ('numericalLossJ', 'wallWorkJ', 'coolingJ', 'driveImpulse', 'wallImpulse')) and
                        s['intervalElectricalWorkJ'] == s['intervalGasWallHeatJ'] == 0, 'Initial sample deposits interval work')
                first = s
            else:
                for inventory, old, flux in zip((light, heavy), (previous['lightMass'], previous['heavyMass']), transfers):
                    for i, value in enumerate(inventory):
                        change = (flux[i - 1] if i else 0) - (flux[i] if i < n - 1 else 0)
                        defect = value - old[i] - change
                        require(abs(defect) <= 2e-10 * max(1, abs(change)), 'Existing accepted-transfer invariant failed')
                        peak('cellContinuityDefect', defect)
                work_terms.append(s['intervalElectricalWorkJ']); wall_terms.append(row['wallWorkJ'])
                loss_terms.append(row['numericalLossJ']); cooling_terms.append(row['coolingJ'])
                drive_terms.append(row['driveImpulse']); wall_impulse_terms.append(row['wallImpulse'])
                heat_terms.append(s['intervalGasWallHeatJ'])
                step_terms = (s['kineticJ'] - previous['kineticJ'], delta(gas, previous['gasCellEnergyJ']),
                              row['coolingJ'], -s['intervalElectricalWorkJ'], -row['wallWorkJ'], row['numericalLossJ'])
                liner_step = math.fsum(paired_liner_changes(s, previous))
                energy = math.fsum((*step_terms, liner_step))
                angular = math.fsum((s['angularMomentumKgM2S'] - previous['angularMomentumKgM2S'],
                                    -row['driveImpulse'], -row['wallImpulse']))
                prefix_terms = (s['kineticJ'] - first['kineticJ'], delta(gas, first['gasCellEnergyJ']), math.fsum(cooling_terms),
                                -math.fsum(work_terms), -math.fsum(wall_terms), math.fsum(loss_terms))
                liner_prefix = math.fsum(paired_liner_changes(s, first))
                prefix_energy = math.fsum((*prefix_terms, liner_prefix))
                prefix_angular = math.fsum((s['angularMomentumKgM2S'] - first['angularMomentumKgM2S'],
                                           -math.fsum(drive_terms), -math.fsum(wall_impulse_terms)))
                for name, value in [('stepEnergyDefectJ', energy), ('prefixEnergyDefectJ', prefix_energy),
                                    ('highOnlyStepEnergyDefectJ', math.fsum((*step_terms, delta(liner, previous['linerCellEnergyJ'])))),
                                    ('highOnlyPrefixEnergyDefectJ', math.fsum((*prefix_terms, delta(liner, first['linerCellEnergyJ'])))),
                                    ('stepAngularDefect', angular), ('prefixAngularDefect', prefix_angular),
                                    ('nativeStepEnergyResidualMismatchJ', energy - row['energyResidualJ']),
                                    ('nativeStepAngularResidualMismatch', angular - row['angularResidual']),
                                    ('linerStepDefectJ', math.fsum((liner_step, row['coolingJ'], -s['intervalGasWallHeatJ']))),
                                    ('linerPrefixDefectJ', math.fsum((liner_prefix, math.fsum(cooling_terms), -math.fsum(heat_terms)))),
                                    ('driveImpulseScheduleDefect', row['driveImpulse'] - dt * math.fsum(torque)),
                                    ('sourceWorkScheduleDefectJ', s['intervalElectricalWorkJ'] - dt * s['electricalPowerW']),
                                    ('nativeEndpointWorkDefectMismatchJ', dt * (endpoint_work - s['mechanicalPowerW']) - s['stepMechanicalEndpointDefectJ'])]:
                    peak(name, value)
                relative_peak(step_relative, 'energy', energy, abs(s['intervalElectricalWorkJ']))
                relative_peak(prefix_relative, 'energy', prefix_energy, math.fsum(map(abs, work_terms)))
                relative_peak(step_relative, 'angular', angular, abs(row['driveImpulse']) + abs(row['wallImpulse']))
                relative_peak(prefix_relative, 'angular', prefix_angular, math.fsum(map(abs, drive_terms)) + math.fsum(map(abs, wall_impulse_terms)))
            previous = last = s
            count += 1
    complete = case['failure'] is None
    require(count == case['rows'] and (count == steps + 1 if complete else count <= steps + 1), 'Declared accepted-row count mismatch')
    require(count > 0, 'No accepted initial state')
    return {'file': case['file'], 'sha256': checksum, 'n': n, 'steps': steps, 'acceptedRows': count,
            'complete': complete, 'failure': case['failure'], 'incrementalThermalRows': incremental_rows,
            'pairedLinerRows': paired_rows, 'peaks': peaks,
            'maxStepRelativeDefects': step_relative, 'maxPrefixRelativeDefects': prefix_relative,
            'actualSignedElectricalWorkJ': math.fsum(work_terms), 'actualAbsoluteElectricalWorkJ': math.fsum(map(abs, work_terms)),
            'actualNumericalLossJ': math.fsum(loss_terms), 'actualWallWorkJ': math.fsum(wall_terms),
            'actualCoolingJ': math.fsum(cooling_terms)}


def audit(root, source_root=None):
    root = root.resolve()
    path = root / 'assessment.json'
    packet = read_json(path.read_text())
    require(packet.get('schemaVersion') == 1, 'Nested assessment schemaVersion 1 required')
    require(all(packet.get(name) is False for name in ('numericallyQualified', 'experimentallyQualified', 'liveDefaultReplaced')),
            'Diagnostic cannot claim physical/default qualification')
    for name in ('durationS', 'totalParticles'):
        require(finite(packet[name], name) > 0, f'{name} must be positive')
    require(len(packet['conditions']['speciesMassKg']) == 2 and
            packet['conditions']['speciesMassKg'][0] == packet['conditions']['speciesMassKg'][1],
            'This receipt audit is restricted to the declared equal-mass argon case')
    expected = {(n, t) for n in GAS_LEVELS for t in TIME_LEVELS}
    actual = [(c['n'], c['steps']) for c in packet['cases']]
    require(len(actual) == len(set(actual)) and set(actual) == expected, 'Missing/duplicate prescribed trajectory')
    require(len({c['file'] for c in packet['cases']}) == len(actual), 'Duplicate stream path')
    frozen_config = {k: v for k, v in packet['cases'][0]['config'].items() if k not in ('radialCells', 'steps')}
    for case in packet['cases']:
        config = case['config']
        require(config.get('radialCells') == case['n'] and config.get('steps') == case['steps'] and
                config.get('axialCells') == packet['conditions']['electricalAxialCells'] and
                config.get('durationS') == packet['durationS'], 'Case/config mesh or clock declaration mismatch')
        require({k: v for k, v in config.items() if k not in ('radialCells', 'steps')} == frozen_config,
                'Refinement cases changed frozen physical/numerical inputs')
    source_hashes = {}
    require(bool(packet.get('sourceFiles')), 'Producer source identities required')
    if source_root:
        for name, claimed in packet['sourceFiles'].items():
            actual_hash = digest(confined(source_root, name))
            require(actual_hash == claimed, f'Producer source mismatch: {name}')
            source_hashes[name] = actual_hash
    cases = [audit_case(root, case, packet) for case in packet['cases']]
    return {'kind': 'independent-nested-coupling-accounting-audit', 'assessmentSha256': digest(path),
            'auditCodeSha256': digest(Path(__file__)), 'plumbingCodeSha256': digest(Path(__file__).with_name('audit_source.py')),
            'sourceFilesCheckedAgainstSuppliedRoot': source_hashes, 'structuralChecksPassed': True,
            'allTrajectoriesComplete': all(c['complete'] for c in cases), 'cases': cases,
            'energyAcceptanceThreshold': None, 'numericallyQualified': False, 'experimentallyQualified': False,
            'liveDefaultReplaced': False,
            'scope': 'Stored-row accounting (optional paired liner lows; missing means zero) and q-adjoint diagnostics at one fixed electrical mesh. High-only and paired ledgers are distinct. No convergence rescoring, wall constitutive reconstruction, continuum, local startup or experimental qualification. Zero actual-work denominators are omitted, never floored.'}


def self_test():
    import tempfile
    import unittest
    class Tests(unittest.TestCase):
        def fixture(self, root):
            omega, torque = [1., 3., 4., 6.], [2., 2., -1., -1.]
            rows = []
            for step in (0, 1):
                s = dict(timeS=.25 * step, lightMass=[.25] * 4, heavyMass=[.25] * 4,
                         gasCellEnergyJ=[10 + .5 * step] * 4, linerCellEnergyJ=[1., 2., 3.],
                         omegaRadS=omega, inertiaKgM2=[1.] * 4, torqueByGasCellNm=torque,
                         jouleByGasCellW=[2.5] * 4, kineticJ=31., angularMomentumKgM2S=14.,
                         mechanicalPowerW=-2., joulePowerW=10., electricalPowerW=8.,
                         intervalElectricalWorkJ=2. * step, intervalGasWallHeatJ=0.,
                         stepMechanicalEndpointDefectJ=0., stepOmegaMismatchRadS=0.,
                         thermalRowResidualJ=0., electricalEnergyResidualW=0.)
                rows.append(dict(step=step, snapshot=s, sourceOmegaRadS=omega,
                                 faceTransfers=[[0.] * 3, [0.] * 3], numericalLossJ=0., wallWorkJ=0.,
                                 coolingJ=0., driveImpulse=.5 * step, wallImpulse=-.5 * step,
                                 energyResidualJ=0., angularResidual=0.))
            path = root / 'case.jsonl.gz'
            path.write_bytes(b''.join(gzip.compress((json.dumps(r) + '\n').encode()) for r in rows))
            case = dict(n=4, steps=1, rows=2, file=path.name, sha256=digest(path), failure=None)
            packet = dict(totalParticles=1e19, durationS=.25,
                          conditions=dict(electricalRadialCells=2, speciesMassKg=[1., 1.], radiusM=.01))
            return rows, case, packet
        def test_adjoint_and_telescoped_ledgers(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                _, case, packet = self.fixture(root)
                result = audit_case(root, case, packet)
                self.assertEqual(result['pairedLinerRows'], 0, 'Legacy receipts have zero low words')
                for name in ('adjointGroupingDefectW', 'sourceMechanicalPowerDefectW',
                             'stepEnergyDefectJ', 'prefixEnergyDefectJ', 'stepAngularDefect'):
                    self.assertEqual(result['peaks'][name], 0.)
        def test_changed_bytes_and_unequal_source_shares_refuse(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                rows, case, packet = self.fixture(root)
                case['sha256'] = 'wrong'
                with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                    audit_case(root, case, packet)
                rows[1]['snapshot']['torqueByGasCellNm'][0] += 1
                path = root / case['file']
                path.write_bytes(b''.join(gzip.compress((json.dumps(r) + '\n').encode()) for r in rows))
                case['sha256'] = digest(path)
                with self.assertRaisesRegex(ValueError, 'shared equally'):
                    audit_case(root, case, packet)
        def test_nonzero_loss_wall_cooling_and_angular_ledger_signs(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                rows, case, packet = self.fixture(root)
                row, s = rows[1], rows[1]['snapshot']
                # Manufactured accounting scalars, not a claimed physical run.
                s.update(omegaRadS=[1.25, 3., 4., 6.], kineticJ=31.28125,
                         angularMomentumKgM2S=14.25, gasCellEnergyJ=[10.4453125] * 4,
                         intervalGasWallHeatJ=.125, stepOmegaMismatchRadS=.25,
                         stepMechanicalEndpointDefectJ=.125)
                row.update(numericalLossJ=.0625, wallWorkJ=.25, coolingJ=.125,
                           driveImpulse=.5, wallImpulse=-.25)
                path = root / case['file']
                path.write_bytes(b''.join(gzip.compress((json.dumps(r) + '\n').encode()) for r in rows))
                case['sha256'] = digest(path)
                result = audit_case(root, case, packet)
                for name in ('stepEnergyDefectJ', 'prefixEnergyDefectJ', 'stepAngularDefect',
                             'prefixAngularDefect', 'linerStepDefectJ', 'driveImpulseScheduleDefect',
                             'nativeEndpointWorkDefectMismatchJ'):
                    self.assertEqual(result['peaks'][name], 0.)
        def test_optional_increment_storage_separation_and_partial_refusal(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                rows, case, packet = self.fixture(root)
                capacity = 1.5 * 1.380649e-23 * packet['totalParticles'] / 4
                for step, row in enumerate(rows):
                    row.update(thermalEnergyChangeJ=[.625 * step] * 4 + [0.] * 3,
                               thermalStorageDefectJByCell=[-.125 * step] * 4 + [0.] * 3,
                               thermalGasSourceJ=[.625 * step] * 4,
                               thermalTemperatureIncrementK=[.625 * step / capacity] * 4 + [0.] * 3,
                               thermalGasSolveTemperatureK=[(10 + .625 * step) / capacity] * 4)
                path = root / case['file']
                def write():
                    path.write_bytes(b''.join(gzip.compress((json.dumps(r) + '\n').encode()) for r in rows))
                    case['sha256'] = digest(path)
                write()
                result = audit_case(root, case, packet)
                self.assertEqual(result['incrementalThermalRows'], 2)
                self.assertEqual(result['peaks']['thermalIncrementEnergyResidualJ'], 0.)
                self.assertEqual(result['peaks']['thermalStoredEnergyResidualJ'], .5)
                self.assertEqual(result['peaks']['thermalCellStorageIdentityMismatchJ'], 0.)
                del rows[1]['thermalGasSourceJ']
                write()
                with self.assertRaisesRegex(ValueError, 'Partial incremental'):
                    audit_case(root, case, packet)
        def test_paired_liner_carry_signed_prefix_and_partial_refusal(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                rows, case, packet = self.fixture(root)
                rows.append(json.loads(json.dumps(rows[1])))
                case.update(steps=2, rows=3); packet['durationS'] = .5
                capacity = 1.5 * 1.380649e-23 * packet['totalParticles'] / 4
                for step, row in enumerate(rows):
                    s = row['snapshot']; row['step'] = step; s['timeS'] = .25 * step
                    s['gasCellEnergyJ'] = [[10.] * 4, [10.375] * 4, [11.] * 4][step]
                    s['linerCellEnergyJ'] = [float(2**52 + (step == 1)), 2., 3.]
                    s['linerCellEnergyCorrectionJ'] = [-.25 if step == 1 else .25, 0., 0.]
                    wall_heat = [0., .5, -.5][step]
                    s['intervalGasWallHeatJ'] = wall_heat
                    gas_change = [0., .375, .625][step]
                    row.update(thermalEnergyChangeJ=[gas_change] * 4 + [wall_heat, 0., 0.],
                               thermalStorageDefectJByCell=[0.] * 4 + [wall_heat, 0., 0.],
                               thermalCompensatedStorageDefectJByCell=[0.] * 7,
                               thermalGasSourceJ=[0. if step == 0 else .5] * 4,
                               thermalTemperatureIncrementK=[0.] * 7,
                               thermalGasSolveTemperatureK=[u / capacity for u in s['gasCellEnergyJ']])
                path = root / case['file']
                def write():
                    path.write_bytes(b''.join(gzip.compress((json.dumps(r) + '\n').encode()) for r in rows))
                    case['sha256'] = digest(path)
                write(); result = audit_case(root, case, packet)
                self.assertEqual(result['pairedLinerRows'], 3)
                for name in ('stepEnergyDefectJ', 'prefixEnergyDefectJ', 'linerStepDefectJ', 'linerPrefixDefectJ',
                             'thermalCellStorageIdentityMismatchJ', 'thermalCompensatedCellStorageIdentityMismatchJ',
                             'thermalPairedStoredEnergyResidualJ', 'thermalCompensatedStorageResidualIdentityMismatchJ'):
                    self.assertEqual(result['peaks'][name], 0., name)
                self.assertEqual(result['peaks']['highOnlyStepEnergyDefectJ'], .5)
                self.assertEqual(result['peaks']['highOnlyPrefixEnergyDefectJ'], .5)
                self.assertEqual(result['peaks']['thermalStoredEnergyResidualJ'], .5)
                for bad, message in ((None, 'Partial compensated'), ([0.], 'liner energy correction'),
                                     ([.75, 0., 0.], 'normalized'), ([float('inf'), 0., 0.], 'finite')):
                    if bad is None:
                        del rows[1]['snapshot']['linerCellEnergyCorrectionJ']
                    else:
                        rows[1]['snapshot']['linerCellEnergyCorrectionJ'] = bad
                    write()
                    with self.assertRaisesRegex(ValueError, message):
                        audit_case(root, case, packet)
    return unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests)).wasSuccessful()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path)
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return 0 if self_test() else 1
    require(args.directory is not None, 'A nested-output directory is required')
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
