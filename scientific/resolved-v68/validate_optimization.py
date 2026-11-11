"""Actual unchanged FiPy gates and old/new production witnesses; safe-dev only."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

import numpy as np

ROOT = Path.cwd()


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


electrical = module('scientific/transient-v67/electrical.py', 'static_electrical_v67')
coupled = module('scientific/current-v66/check_coupled.py', 'independent_coupled_v68')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


folder = Path(sys.argv[1]); folder.mkdir(exist_ok=False)
before_path, after_path = map(Path, sys.argv[2:4])
before, after = [json.loads(path.read_bytes()) for path in (before_path, after_path)]
gates = []


def gate(name, difference, scale):
    value = electrical.audit.ratio(difference, scale)
    gates.append({'name': name, 'value': value, 'limit': 1e-9,
                  'passed': value is not None and value <= 1e-9})


if [row['nz'] for row in before['cases']] != [row['nz'] for row in after['cases']]:
    raise ValueError('Changed profile case identity')
for a, b in zip(before['cases'], after['cases']):
    if a['spec'] != b['spec']:
        raise ValueError('Changed physical profile input')
    spec = a['spec']; left, right = a['result'], b['result']; label = str(a['nz'])
    scale = abs(left['electrodePowerW'])+left['jouleW']+abs(left['mechanicalW'])
    for key in ('jouleW', 'mechanicalW', 'electrodePowerW'):
        gate(label+' '+key, right[key]-left[key], scale)
    gate(label+' torque L1', np.sum(abs(np.array(right['torqueNm'])-left['torqueNm'])), np.sum(abs(np.array(left['torqueNm']))))
    gate(label+' Joule L1', np.sum(abs(np.array(right['jouleByCellW'])-left['jouleByCellW'])), left['jouleW'])
    voltages = [v for key in ('innerVoltageV','outerVoltageV','lowerVoltageV','upperVoltageV') for v in spec[key] if v is not None]
    potential_scale = max(voltages)-min(voltages)+abs(spec['magneticT'])*max(map(abs,spec['omegaRadS']))*spec['radialEdgesM'][-1]**2/2
    gate(label+' relative potential', np.max(abs(np.array(right['relativePotentialV'])-left['relativePotentialV'])), potential_scale)

a, b = before['coupled'], after['coupled']
if a['setup'] != b['setup'] or a['state'] != b['state'] or a['dtS'] != b['dtS']:
    raise ValueError('Changed coupled profile input')
for key in ('lightMass','heavyMass','omegaRadS','gasEnergyJ','linerEnergyJ'):
    left, right = np.asarray(a['result']['state'][key]), np.asarray(b['result']['state'][key])
    gate('coupled '+key, np.max(abs(left-right)), np.max(abs(left)))
coupled_audits = []
for label, profile in (('before', before), ('after', after)):
    row = profile['coupled']
    packet = {'sourceSHA256': profile['sourceSHA256'], 'cases': [{'id': label, 'setup': row['setup'],
        'initialState': row['state'], 'requestedSteps': 1, 'steps': [{'dtS':row['dtS'],'result':row['result']}]}]}
    audit = coupled.audit_packet(packet); audit['negativeControls'] = coupled.negative_controls(packet)
    (folder/(label+'-coupled-audit.json')).write_text(json.dumps(audit,indent=2)+'\n')
    coupled_audits.append({'label':label,'allPassed':audit['allPassed']})

original = Path('/work/home/transient67-electrical')
command = ['node_modules/.bin/tsx','scientific/current-v66/campaign.ts',str(original/'cases.json'),str(folder/'production.json')]
result = subprocess.run(command,capture_output=True,text=True,timeout=180)
(folder/'production.log').write_text(result.stdout+'\n'+result.stderr)
if result.returncode:
    raise ValueError('Actual production static electrical run failed')
inputs, production, reference = [json.loads(path.read_bytes()) for path in (original/'cases.json', folder/'production.json', original/'fipy.json')]
electrical.audit.validate_links(inputs, production, reference, digest(original/'cases.json'))
static = electrical.analyze(inputs, production, reference)
(folder/'static-analysis.json').write_text(json.dumps(static,indent=2)+'\n')
report = {'equivalenceGates':gates, 'allEquivalenceGatesPassed':all(row['passed'] for row in gates),
          'staticElectricalGates':len(static['gates']), 'allStaticElectricalGatesPassed':static['allElectricalGatesPassed'],
          'actualFiPyReexecuted':False, 'actualFiPyCasesCompared':len(reference['cases']),
          'coupledAudits':coupled_audits, 'matchedStepSeconds':{'before':a['seconds'],'after':b['seconds']},
          'inputSHA256':{str(path):digest(path) for path in (before_path,after_path,original/'cases.json',original/'fipy.json',folder/'production.json')},
          'sourceFilesSHA256':{name:digest(ROOT/name) for name in ('src/fuel-current.ts','src/fuel-spatial-operation.ts','scientific/resolved-v68/profile.ts','scientific/resolved-v68/validate_optimization.py')},
          'productionCommand':command, 'productionExitCode':result.returncode}
(folder/'analysis.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({key:value for key,value in report.items() if key not in ('equivalenceGates','inputSHA256','sourceFilesSHA256')},indent=2))
if not report['allEquivalenceGatesPassed'] or not report['allStaticElectricalGatesPassed']:
    raise SystemExit(1)
