"""Frozen v67 axial electrical study. Execute only inside parent's safe-dev.

Usage: python electrical.py ACCEPTED_V66_COUPLED.json NEW_OUTPUT_DIRECTORY
Actual FiPy and production run on the same twenty frozen cases. No live change.
"""
import hashlib
import importlib.metadata
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
V66 = ROOT/'scientific/current-v66'
SOURCE_PACKET_SHA = 'a92320f3dd5fa7b043d82ced94bb0f0c504b78df8f72c44406174e38d706335d'
SOURCE_CODE_SHA = 'ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c'
LEVELS = (4, 8, 16, 32, 64)
SNAPSHOTS = (('initial', None), ('step0', 0), ('step31', 31), ('step63', 63))


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


audit = load_module(V66/'analyze.py', 'v66_independent_electrical_audit')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(path, value):
    with Path(path).open('x') as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write('\n')


def validate_source(raw, expected_hash=SOURCE_PACKET_SHA):
    if digest(raw) != expected_hash:
        raise ValueError('Accepted coupled packet SHA256 differs from frozen source')
    packet = json.loads(raw)
    if packet.get('sourceSHA256') != SOURCE_CODE_SHA:
        raise ValueError('Accepted coupled packet source-code identity differs')
    return packet


def freeze_cases(packet):
    selected = [case for case in packet['cases'] if case['id'] == 'mixture-n64-t64']
    if len(selected) != 1:
        raise ValueError('Need exactly one accepted mixture-n64-t64 trajectory')
    case = selected[0]
    if case.get('failure') or case['requestedSteps'] != 64 or len(case['steps']) != 64:
        raise ValueError('Frozen source trajectory is incomplete')
    setup, base = case['setup'], case['setup']['electrical']
    r = base['radialEdgesM']; nr = len(r)-1
    if nr != 64 or setup['radiusM'] != .01 or setup['lengthM'] != .1:
        raise ValueError('Frozen physical geometry changed')
    np.testing.assert_allclose(r, .01*np.sqrt(np.arange(65)/64), rtol=0, atol=1e-17)
    for key, expected in (('sigmaPerpSM', .01), ('sigmaParallelSM', .1)):
        if not all(value == expected for value in base[key]):
            raise ValueError('Frozen prescribed conductivity changed')
    if base['magneticT'] != .5 or base['upperVoltageV'] != [0.]*32+[None]*32:
        raise ValueError('Frozen field or physical electrode patch changed')
    if (any(value is not None for value in base['innerVoltageV']+base['lowerVoltageV']) or
            any(value != .01 for value in base['outerVoltageV'])):
        raise ValueError('Frozen electrode voltages/insulation changed')
    dt = [step['dtS'] for step in case['steps']]
    if not all(value == 1e-3/64 for value in dt):
        raise ValueError('Frozen source time partition changed')
    output = []
    for label, index in SNAPSHOTS:
        state = case['initialState'] if index is None else case['steps'][index]['result']['state']
        omega = np.asarray(state['omegaRadS'], dtype=float)
        if omega.shape != (64,) or not np.isfinite(omega).all():
            raise ValueError('Frozen accepted spin has invalid shape/value')
        time = 0. if index is None else math.fsum(dt[:index+1])
        for nz in LEVELS:
            output.append({'id': f'{label}-nz{nz}', 'kind': 'v67-frozen-axial',
                           'snapshot': label, 'timeS': time, 'radialCells': nr, 'axialCells': nz,
                           'radialEdgesM': list(r), 'axialEdgesM': np.linspace(0, .1, nz+1).tolist(),
                           'sigmaPerpSM': [.01]*(nr*nz), 'sigmaParallelSM': [.1]*(nr*nz),
                           'omegaRadS': np.tile(omega, nz).tolist(), 'magneticT': .5,
                           'innerVoltageV': [None]*nz, 'outerVoltageV': [.01]*nz,
                           'lowerVoltageV': [None]*nr, 'upperVoltageV': [0.]*32+[None]*32})
    return {'sourceCoupledPacketSHA256': SOURCE_PACKET_SHA,
            'sourceCodeSHA256': SOURCE_CODE_SHA, 'selectedSourceCase': case['id'], 'cases': output}


def projected_fields(spec, reconstructed, mode):
    nr, nz = len(spec['radialEdgesM'])-1, len(spec['axialEdgesM'])-1
    heat = reconstructed['heat'].reshape(nz, nr).copy()
    torque = reconstructed['torque'].reshape(nz, nr).copy()
    if mode == 'fipy':
        r, z = np.asarray(spec['radialEdgesM']), np.asarray(spec['axialEdgesM'])
        centers = audit.radial_centers(r, 'fipy')
        sigma = np.asarray(spec['sigmaPerpSM']).reshape(nz, nr)
        for j in range(nz):
            for face in range(nr+1):
                if face == 0 and spec['innerVoltageV'][j] is None:
                    continue
                if face == nr and spec['outerVoltageV'][j] is None:
                    continue
                indices = ([face-1] if face else [])+([face] if face < nr else [])
                widths = [abs(r[face]-centers[i]) for i in indices]
                area = 2*math.pi*r[face]*(z[j+1]-z[j])
                current = reconstructed['radial'][j, face]
                for k, i in enumerate(indices):
                    heat[j, i] += current**2*widths[k]/(sigma[j, i]*area)
                    # Adjoint of native arithmetic-face Ω, not a fitted torque.
                    weight = widths[1-k] if len(indices) == 2 else widths[k]
                    torque[j, i] -= current*spec['magneticT']*r[face]*weight
    radial, axial = reconstructed['radial'], reconstructed['axial']
    terminals = {'inner': -float(radial[:, 0].sum()), 'outer': float(radial[:, -1].sum()),
                 'lower': -float(axial[0].sum()), 'upper': float(axial[-1].sum())}
    return {'torqueNm': torque.sum(axis=0), 'jouleByCellW': heat.sum(axis=0),
            'terminalCurrentA': terminals}


def compare_fields(left, right):
    power_scale = max(left['powerScaleW'], right['powerScaleW'])
    return {'powers': {key: audit.ratio(left[key]-right[key], power_scale)
                       for key in ('jouleW', 'mechanicalW', 'electrodePowerW')},
            'torqueL1': audit.ratio(np.sum(abs(left['torqueNm']-right['torqueNm'])),
                                    max(np.sum(abs(left['torqueNm'])), np.sum(abs(right['torqueNm'])))),
            'jouleProfileL1': audit.ratio(np.sum(abs(left['jouleByCellW']-right['jouleByCellW'])),
                                         max(left['jouleW'], right['jouleW'])),
            'terminals': {key: audit.ratio(left['terminalCurrentA'][key]-right['terminalCurrentA'][key],
                                           max(left['currentScaleA'], right['currentScaleA']))
                          for key in left['terminalCurrentA']}}


def analyze(inputs, production, reference):
    rows, gates, reconstructions = [], [], {}
    def gate(name, value, limit):
        gates.append({'name': name, 'value': float(value) if math.isfinite(value) else None,
                      'limit': limit, 'passed': math.isfinite(value) and value <= limit})
    for spec, prod, ref in zip(inputs['cases'], production['cases'], reference['cases']):
        row = {key: spec[key] for key in ('id', 'snapshot', 'timeS', 'radialCells', 'axialCells')}
        for label, result, mode in (('kernel', prod, 'integrated'), ('fipy', ref, 'fipy')):
            derived = audit.reconstruct(spec, result, mode)
            fields = projected_fields(spec, derived, mode)
            current_scale, power_scale = derived['currentScale'], derived['powerScale']
            prefix = spec['id']+' '+label+' '
            for key in ('jouleW', 'mechanicalW', 'electrodePowerW'):
                gate(prefix+'reconstructed '+key, audit.ratio(result[key]-derived[key], power_scale), 1e-9)
            gate(prefix+'cell charge', audit.ratio(np.max(abs(derived['cellResidual'])), current_scale), 1e-9)
            gate(prefix+'boundary charge', audit.ratio(math.fsum(derived['boundary']), current_scale), 1e-9)
            gate(prefix+'reported cell charge', audit.ratio(result['maxCellCurrentResidualA']-np.max(abs(derived['cellResidual'])), current_scale), 1e-9)
            gate(prefix+'reported boundary charge', audit.ratio(result['netBoundaryCurrentA']-math.fsum(derived['boundary']), current_scale), 1e-9)
            gate(prefix+'work identity', audit.ratio(derived['electrodePowerW']-derived['jouleW']-derived['mechanicalW'], power_scale), 1e-9)
            gate(prefix+'projected heat identity', audit.ratio(fields['jouleByCellW'].sum()-derived['jouleW'], power_scale), 1e-9)
            omega = np.asarray(spec['omegaRadS'])[:spec['radialCells']]
            gate(prefix+'projected mechanical identity', audit.ratio(np.dot(fields['torqueNm'], omega)-derived['mechanicalW'], power_scale), 1e-9)
            if label == 'kernel':
                for key, source in (('torqueNm', derived['torque']), ('jouleByCellW', derived['heat'])):
                    scale = max(abs(source)) if key == 'torqueNm' else power_scale
                    gate(prefix+'reported '+key, audit.ratio(np.max(abs(np.asarray(result[key])-source)), scale), 1e-9)
            else:
                for key, source in (('radialCurrentA', derived['radial']), ('axialCurrentA', derived['axial'])):
                    gate(prefix+'exported '+key, audit.ratio(np.max(abs(np.asarray(result[key]).reshape(source.shape)-source)), current_scale), 1e-9)
                gate(prefix+'insulating current', audit.ratio(result['maxInsulatingCurrentA'], current_scale), 1e-9)
            if derived['jouleW'] < 0 or np.any(fields['jouleByCellW'] < 0):
                raise ValueError('Negative Joule heat')
            values = {key: derived[key] for key in ('jouleW', 'mechanicalW', 'electrodePowerW')}
            values.update(fields, currentScaleA=current_scale, powerScaleW=power_scale)
            reconstructions[(spec['id'], label)] = values
            row[label] = {key: value.tolist() if isinstance(value, np.ndarray) else value for key, value in values.items()}
        kernel, fipy = (reconstructions[(spec['id'], label)] for label in ('kernel', 'fipy'))
        differences = compare_fields(kernel, fipy)
        finite = [v for key in ('innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV') for v in spec[key] if v is not None]
        motional = abs(spec['magneticT'])*max(map(abs, spec['omegaRadS']))*(spec['radialEdgesM'][-1]**2-spec['radialEdgesM'][0]**2)/2
        p, _ = audit.canonical_potential(spec, prod)
        potential_error = audit.ratio(np.max(abs(p-audit.collocated_reference_potential(spec, ref))), max(finite)-min(finite)+motional)
        differences['potential'] = potential_error; row['crossCode'] = differences
        gate(spec['id']+' cross-code potential', potential_error, .01)
        for key, value in differences['powers'].items():
            gate(spec['id']+' cross-code '+key, value, .02)
        rows.append(row)
    axial = []
    for snapshot, _ in SNAPSHOTS:
        for label in ('kernel', 'fipy'):
            for coarse, fine in zip(LEVELS, LEVELS[1:]):
                left, right = (reconstructions[(f'{snapshot}-nz{level}', label)] for level in (coarse, fine))
                differences = compare_fields(left, right)
                axial.append({'snapshot': snapshot, 'solver': label, 'coarseAxialCells': coarse,
                              'fineAxialCells': fine, 'differences': differences})
                if (coarse, fine) == (32, 64):
                    prefix = f'{snapshot} {label} finest axial '
                    for key, value in differences['powers'].items():
                        gate(prefix+key, value, .02)
                    gate(prefix+'torque L1', differences['torqueL1'], .02)
                    gate(prefix+'Joule profile L1', differences['jouleProfileL1'], .02)
                    for key, value in differences['terminals'].items():
                        gate(prefix+'terminal '+key, value, .02)
    return {'cases': rows, 'axialComparisons': axial, 'gates': gates,
            'allElectricalGatesPassed': all(item['passed'] for item in gates),
            'finestAxialPair': [32, 64], 'actualFiPyCasesRun': [item['id'] for item in inputs['cases']],
            'experimentalValidation': False, 'liveBackendChanged': False}


def run(source, output):
    raw_source = Path(source).read_bytes(); packet = validate_source(raw_source)
    output = Path(output).resolve(); output.mkdir(exist_ok=False)
    inputs = freeze_cases(packet)
    write_json(output/'cases.json', inputs)
    raw_inputs = (output/'cases.json').read_bytes(); input_hash = digest(raw_inputs)
    source_paths = [Path(__file__), V66/'analyze.py', V66/'reference_fipy.py', V66/'campaign.ts', ROOT/'src/fuel-current.ts']
    write_json(output/'source-inputs.json', {'coupledPacketSHA256': digest(raw_source),
               'sourceFilesSHA256': {str(path.relative_to(ROOT)): digest(path.read_bytes()) for path in source_paths}})
    command = [str(ROOT/'node_modules/.bin/tsx'), str(V66/'campaign.ts'), str(output/'cases.json'), str(output/'production.json')]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=600)
    (output/'production.log').write_text(result.stdout+'\n'+result.stderr)
    write_json(output/'production-command.json', {'command': command, 'exitCode': result.returncode})
    if result.returncode:
        raise RuntimeError('Production electrical campaign failed; see retained log')
    oracle = load_module(V66/'reference_fipy.py', 'v66_actual_fipy_oracle')
    reference = {'sourceSHA256': input_hash,
                 'versions': {key: importlib.metadata.version(key) for key in ('fipy', 'numpy', 'scipy')}, 'cases': []}
    for spec in inputs['cases']:
        reference['cases'].append(oracle.solve_case(spec))
        (output/'fipy-progress.json').write_text(json.dumps(reference, allow_nan=False)+'\n')
        print(json.dumps({'actualFiPyCase': spec['id']}), flush=True)
    write_json(output/'fipy.json', reference)
    production = json.loads((output/'production.json').read_bytes())
    audit.validate_links(inputs, production, reference, input_hash)
    report = analyze(inputs, production, reference)
    report['inputsSHA256'] = {name: digest((output/name).read_bytes()) for name in ('cases.json', 'production.json', 'fipy.json')}
    report['sourceCoupledPacketSHA256'] = digest(raw_source)
    report['versions'] = reference['versions']
    write_json(output/'analysis.json', report)
    lines = ['| Snapshot | Solver | nz | Joule W | Lorentz W | Electrode W | Total torque Nm |',
             '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
    for row in report['cases']:
        for label in ('kernel', 'fipy'):
            values = row[label]
            lines.append(f"| {row['snapshot']} | {label} | {row['axialCells']} | {values['jouleW']:.9g} | {values['mechanicalW']:.9g} | {values['electrodePowerW']:.9g} | {sum(values['torqueNm']):.9g} |")
    (output/'table.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'cases': len(inputs['cases']), 'gates': len(report['gates']),
                      'allElectricalGatesPassed': report['allElectricalGatesPassed'],
                      'failed': [item for item in report['gates'] if not item['passed']]}), flush=True)
    if not report['allElectricalGatesPassed']:
        raise SystemExit(1)


if __name__ == '__main__':
    run(*sys.argv[1:])
