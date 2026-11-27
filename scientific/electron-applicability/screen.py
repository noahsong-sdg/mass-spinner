"""Conditional B=0 energy-channel screening of retained native LoKI-B++ outputs.

VM-only scientific postprocessing. Does not evolve a discharge or alter a PDE.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re

QE = 1.602176634e-19
CHANNELS = (
    'Field', 'Elastic collisions (gain)', 'Elastic collisions (loss)',
    'CAR (gain)', 'CAR (loss)', 'Excitation inelastic collisions',
    'Excitation superelastic collisions', 'Vibrational inelastic collisions',
    'Vibrational superelastic collisions', 'Rotational inelastic collisions',
    'Rotational superelastic collisions', 'Ionization collisions',
    'Attachment collisions', 'Electron density growth',
)
GROUPS = {
    'elastic': CHANNELS[1:3], 'CAR': CHANNELS[3:5],
    'excitation': CHANNELS[5:7], 'vibration': CHANNELS[7:9],
    'rotation': CHANNELS[9:11], 'ionization': CHANNELS[11:12],
    'attachment': CHANNELS[12:13], 'densityGrowth': CHANNELS[13:14],
}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_pinned(path, expected):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError('Stale source bytes: ' + str(path))
    return json.loads(raw, parse_constant=lambda x: (_ for _ in ()).throw(
        ValueError('Nonfinite JSON constant: ' + x)))


def finite(value, name, minimum=0):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError('Invalid scalar ' + name)
    if not math.isfinite(value) or value < minimum:
        raise ValueError('Outside scalar domain: ' + name)
    return value


def confined(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Source path escapes declared root')
    return path


def native_channels(path):
    # The global first block alone is complete. Later net/gas blocks repeat it.
    first = Path(path).read_text().split('---', 1)[0]
    pairs = re.findall(r'^\s*(.*?)\s*=\s*([+\-\deE.]+)\s+\(eVm3/s\)', first, re.M)
    if len(pairs) != len(CHANNELS) or {key.strip() for key, _ in pairs} != set(CHANNELS):
        raise ValueError('Missing or duplicate native global power channel')
    values = {key.strip(): float(value) for key, value in pairs}
    if not all(math.isfinite(value) for value in values.values()) or values['Field'] <= 0:
        raise ValueError('Invalid native power coefficients')
    if abs(math.fsum(values.values())) / values['Field'] >= 1e-6:
        raise ValueError('Native global power balance fails existing diagnostic bound')
    return values


def refinement(values):
    """Reuse the original 2% plus contraction rule; retain roundoff failures."""
    if len(values) != 3 or not all(math.isfinite(value) for value in values):
        raise ValueError('Three finite refinement values required')
    a, b, c = values
    coarse, fine = abs(b - a), abs(c - b)
    relative = fine / max(abs(b), abs(c)) if b or c else 0.
    return dict(coarseDifference=coarse, fineDifference=fine,
                relativeFineDifference=relative,
                passGate=relative < .02 and (fine < coarse or fine == coarse == 0))


def authenticated_point(root, expected, td, tg):
    """Authenticate the existing chain and all three native refinement powers."""
    root = Path(root).resolve()
    admitted = read_pinned(root / 'results/bulk-admission-v2.json', expected)
    if admitted.get('schema') != 'loki-bulk-admission-v1':
        raise ValueError('Stale pre-admission schema')
    domain = admitted['domain']
    if domain['magneticFieldT'] != 0 or domain['interpolationQualified'] is not False:
        raise ValueError('Unexpected upstream domain')
    table = read_pinned(root / 'results/transport-table.json', admitted['sourceTableSHA256'])
    receipt = read_pinned(root / 'results/receipt.json', admitted['receiptSHA256'])
    for key in ('upstreamCommit', 'dataSHA256'):
        if not admitted[key] or admitted[key] != table[key] or admitted[key] != receipt[key]:
            raise ValueError('Inconsistent solver/data source identity')
    if table['receiptSHA256'] != admitted['receiptSHA256'] or table['domain'] != domain:
        raise ValueError('Inconsistent original source table')
    selected = [row for row in admitted['rows']
                if row['reducedFieldTd'] == td and row['gasTemperatureK'] == tg]
    if len(selected) != 1:
        raise ValueError('Outside executed electron-table grid')
    row = selected[0]
    if 'meanEnergyEV' not in row['qualifiedObservables']:
        raise ValueError('Mean energy is not numerically admitted')
    cases = sorted([case for case in receipt['cases']
                    if case['reducedFieldTd'] == td and case['gasTemperatureK'] == tg],
                   key=lambda case: case['cells'])
    if [case['cells'] for case in cases] != [1000, 2000, 4000]:
        raise ValueError('Incomplete original refinement')
    original = [candidate for candidate in table['rows'] if candidate['label'] == row['label']]
    if original != [cases[-1]] or any(row[key] != value for key, value in cases[-1].items()):
        raise ValueError('Admitted row differs from authenticated native case')
    powers, sources = [], []
    for case in cases:
        if not case['completed'] or case['exitCode'] != 0 or not all(case['checks'].values()):
            raise ValueError('Unaccepted original execution/diagnostics')
        power_keys = [key for key in case['nativeHashes'] if Path(key).name == 'powerBalance.txt']
        rate_keys = [key for key in case['nativeHashes'] if Path(key).name == 'rateCoefficients.txt']
        if len(power_keys) != 1 or len(rate_keys) != 1:
            raise ValueError('Ambiguous native power/rate outputs')
        folder = confined(root / 'output', case['label'])
        for key in power_keys + rate_keys:
            path = confined(folder, key)
            if digest(path) != case['nativeHashes'][key]:
                raise ValueError('Stale native power/rate bytes')
            sources.append(dict(path=str(path.relative_to(root)), sha256=digest(path)))
        powers.append(native_channels(confined(folder, power_keys[0])))
    gates = {name: refinement([power[name] for power in powers]) for name in CHANNELS}
    for group, names in GROUPS.items():
        gates['group:' + group] = refinement([math.fsum(power[name] for name in names)
                                            for power in powers])
    ion_gate = refinement([case['ionizationRateM3S'] for case in cases])
    return dict(row=row, powers=powers[-1], powerGates=gates, ionizationGate=ion_gate,
                upstreamCommit=admitted['upstreamCommit'], dataSHA256=admitted['dataSHA256'],
                admissionSHA256=expected, nativeSources=sources)


def load_state(path, expected):
    """Bind caller inputs to bytes, while preserving assumption vs measurement."""
    state = read_pinned(path, expected)
    if state.get('schema') != 'electron-applicability-state-v1':
        raise ValueError('Unsupported/stale state schema')
    required = ('neutralDensityM3', 'electronDensityM3', 'gasTemperatureK',
                'electricFieldNeutralFrameVm', 'magneticFieldT', 'durationS')
    if set(state.get('provenance', {})) != set(required):
        raise ValueError('Every state input needs explicit provenance')
    for name in required:
        source = state['provenance'][name]
        if source.get('kind') not in ('assumption', 'measurement', 'simulation'):
            raise ValueError('Unknown source kind for ' + name)
        if not isinstance(source.get('citation'), str) or not source['citation'].strip():
            raise ValueError('Missing input source citation')
        # These source bytes may contain assumptions. Identity does not certify accuracy.
        source_path = confined(Path(path).resolve().parent, source['path'])
        if digest(source_path) != source['sha256']:
            raise ValueError('Stale input source artifact')
    return state


def inverse_product(a, b):
    finite(a, 'rate-scale factor'); finite(b, 'rate-scale factor')
    if a == 0 or b == 0:
        return None
    product = a * b
    if not math.isfinite(product) or product == 0 or not math.isfinite(1 / product):
        raise ValueError('Rate scale is outside finite floating-point domain')
    return 1 / product


def ratio(a, b):
    if b is None:
        return None
    value = a / b
    if not math.isfinite(value) or a and value == 0:
        raise ValueError('Derived ratio is outside finite floating-point domain')
    return value


def assess(point, state):
    if state.get('schema') != 'electron-applicability-state-v1':
        raise ValueError('Unsupported/stale state schema')
    if state.get('fieldFrame') != 'neutral-rest':
        raise ValueError('Explicit neutral-rest field required')
    if finite(state['magneticFieldT'], 'magneticFieldT') != 0:
        raise ValueError('Magnetized use of B=0 coefficients is not supported')
    n = finite(state['neutralDensityM3'], 'neutralDensityM3', minimum=1e-300)
    ne = finite(state['electronDensityM3'], 'electronDensityM3')
    tg = finite(state['gasTemperatureK'], 'gasTemperatureK', minimum=1e-300)
    duration = finite(state['durationS'], 'durationS')
    electric = state['electricFieldNeutralFrameVm']
    if not isinstance(electric, list) or len(electric) != 3:
        raise ValueError('Three neutral-frame field components required')
    for component in electric:
        if isinstance(component, bool) or not isinstance(component, (int, float)) or not math.isfinite(component):
            raise ValueError('Finite signed electric field components required')
    row, coefficients = point['row'], point['powers']
    td = math.hypot(*electric) / n / 1e-21
    # Do not interpolate, rescale pressure, or infer neutral density from heavy rho.
    if tg != row['gasTemperatureK'] or not math.isclose(td, row['reducedFieldTd'], rel_tol=1e-12):
        raise ValueError('Outside exact executed field/temperature point')
    if not math.isclose(n, row['numberDensityM3'], rel_tol=1e-12):
        raise ValueError('Outside executed neutral-density condition')
    if not math.isfinite(ne * n * QE):
        raise ValueError('Nonfinite density normalization')
    scale = ne * n * QE
    if ne and scale == 0:
        raise ValueError('Density normalization is outside finite floating-point domain')
    signed_power = {name: value * scale for name, value in coefficients.items()}
    if any(not math.isfinite(value) or coefficients[name] and scale and value == 0
           for name, value in signed_power.items()):
        raise ValueError('Normalized power is outside finite floating-point domain')
    groups = {name: math.fsum(signed_power[key] for key in keys) for name, keys in GROUPS.items()}
    field_ok = point['powerGates']['Field']['passGate']
    elastic_ok = point['powerGates']['group:elastic']['passGate']
    # Stored energy / input power, not a kinetic relaxation eigenvalue. Derived
    # values require their own contributing channels, not every unrelated gate.
    turnover = row['meanEnergyEV'] * inverse_product(n, coefficients['Field']) if ne and field_ok else None
    if turnover is not None and not math.isfinite(turnover):
        raise ValueError('Energy-throughput time is outside finite floating-point domain')
    rate_ok = point['ionizationGate']['passGate']
    kion = row['ionizationRateM3S'] if rate_ok else None
    neutral_time = inverse_product(ne, kion) if rate_ok else None
    multiplication_time = inverse_product(n, kion) if rate_ok else None
    return dict(schema='electron-applicability-screen-v1',
        qualification=dict(experimental=False, apparatus=False, magnetized=False,
            powerChannelsNumericallyScreened=all(gate['passGate'] for gate in point['powerGates'].values()),
            ionizationRateNumericallyScreened=rate_ok),
        scope='Conditional stationary homogeneous ground-state Ar, B=0; no e-e collisions. No closure promotion.',
        derivedNumericalScreens=dict(directElasticHeavyPower=elastic_ok,
            directElasticHeavyFraction=elastic_ok and field_ok,
            electronEnergyThroughputTime=field_ok),
        inputState=state, upstreamCommit=point['upstreamCommit'], dataSHA256=point['dataSHA256'],
        admissionSHA256=point['admissionSHA256'], nativeSources=point['nativeSources'],
        signedElectronPowerWM3=signed_power, groupedSignedElectronPowerWM3=groups,
        directElasticHeavyPowerWM3=-groups['elastic'] if elastic_ok else None,
        directElasticHeavyFractionDiagnostic=-math.fsum(coefficients[key] for key in GROUPS['elastic']) / coefficients['Field'] if elastic_ok and field_ok else None,
        powerGates=point['powerGates'], ionizationGate=point['ionizationGate'],
        electronEnergyThroughputTimeS=turnover,
        durationOverElectronEnergyThroughputTime=ratio(duration, turnover),
        neutralIonizationDepletionTimeS=neutral_time,
        electronIonizationMultiplicationTimeS=multiplication_time,
        durationOverNeutralDepletionTime=ratio(duration, neutral_time),
        durationOverElectronMultiplicationTime=ratio(duration, multiplication_time),
        limitations=[
            'Power terms are signed electron gains/losses, not all immediate heavy-gas heat.',
            'Excitation/ionization energy is not automatically radiation or wall heat.',
            'Electron-density growth is a normalization term, not an extra heavy heat source.',
            'Throughput time is not relaxation time; no stationary/locality criterion follows.',
            'Ionization scales omit reverse/metastable/transport processes; no chemistry is evolved.',
            'A passed mesh screen does not validate rates or power against a measured swarm.',
            'No B=0 result can supply the magnetized centrifuge closure.',
        ])


def write_report(path, report):
    # Serialize before exclusive creation: a domain refusal must not leave a
    # partial JSON file that could be mistaken for an actual scientific result.
    serialized = json.dumps(report, indent=2, allow_nan=False) + '\n'
    with Path(path).open('x') as stream:
        stream.write(serialized)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--electron-root', type=Path, required=True)
    parser.add_argument('--admission-sha256', required=True)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--state-sha256', required=True)
    parser.add_argument('--field-td', type=float, required=True)
    parser.add_argument('--gas-temperature-k', type=float, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    state = load_state(args.state, args.state_sha256)
    point = authenticated_point(args.electron_root, args.admission_sha256,
                                args.field_td, args.gas_temperature_k)
    report = assess(point, state)
    report['stateSHA256'] = args.state_sha256
    report['producerSHA256'] = digest(__file__)
    write_report(args.output, report)


if __name__ == '__main__':
    main()
