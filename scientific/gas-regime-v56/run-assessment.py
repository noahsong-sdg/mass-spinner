"""Reproducible regime assessment using actual Cantera and attributed data. Safe-dev only."""
from pathlib import Path
import hashlib
import json
import math
import platform
import sys
import importlib.metadata
import cantera as ct
from assessment import assess
from transport import properties, hydrogen_isotopes, HELIUM

source, output = map(Path, sys.argv[1:3])
packet = json.loads(source.read_text())
gas = hydrogen_isotopes()
assert ct.__version__ == '3.1.0'
assert all(abs(a-b) < 1e-12 for a,b in zip(gas.molecular_weights,[2.014101778,3.016049282]))
checks = []
for fraction, rows in HELIUM.items():
    for temperature, _, _ in rows:
        checks.append({'pair':'helium','temperatureK':temperature,'lightFraction':fraction,
                       'properties':properties('helium',temperature,fraction)})
for temperature in (300,500,1000,2000):
    for fraction in (0.,.5,1.):
        checks.append({'pair':'dt','temperatureK':temperature,'lightFraction':fraction,
                       'properties':properties('dt',temperature,fraction)})
    checks.append({'pair':'lithium','temperatureK':temperature,'lightFraction':.0759,
                   'properties':properties('lithium',temperature,.0759)})
    d, tr = properties('dt',temperature,1.), properties('dt',temperature,0.)
    assert abs(d['muPaS']/tr['muPaS']-math.sqrt(2.014101778/3.016049282)) < 1e-10
    assert abs(d['kWMK']/tr['kWMK']-math.sqrt(3.016049282/2.014101778)) < 1e-10
records = []
for case in packet['cases']:
    record = assess(case, properties)
    record['family'] = case['family']
    records.append(record)
assert all(r['qualified'] is False for r in records)
counts = {}
for case, record in zip(packet['cases'],records):
    key = case['family']
    counts.setdefault(key,{'cases':0,'atomic':0,'unknownGlobalTransport':0,
                           'wallReferenceExceeded':0,'conductionLumpingNotExcluded':0})
    row = counts[key];row['cases']+=1
    if record['supported']:
        row['atomic']+=1
        row['unknownGlobalTransport']+=record['transport']['globalProperties'] is None
        row['wallReferenceExceeded']+=record['screens']['wallReference']=='exceeds-local-Maxwellian-reference'
        row['conductionLumpingNotExcluded']+=record['screens']['conductionLumpingNotExcluded'] is True
atom = next(s for s in ct.Species.list_from_file('gri30.yaml') if s.name=='H')
data_file = next(Path(p)/'gri30.yaml' for p in ct.get_data_directories() if (Path(p)/'gri30.yaml').is_file())
hash_file = lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result = {'schemaVersion':1,'executionChecksPass':True,'allCasesPhysicallyQualified':False,
          'cases':records,'dataChecks':checks,'counts':counts,'exportFailures':packet['failures'],
          'inputSHA256':hash_file(source),
          'sources':{str(p.name):hash_file(p) for p in Path(__file__).parent.glob('*.py')},
          'cantera':{'version':ct.__version__,'isotopeMolecularWeights':gas.molecular_weights.tolist(),
                     'atomicHTransport':dict(atom.transport.input_data),'sourceYAMLSHA256':hash_file(data_file)},
          'environment':{'python':sys.version,'platform':platform.platform(),
                          'packages':{p:importlib.metadata.version(p) for p in ('cantera','numpy','scipy','matplotlib')}},
          'limits':['No gas PDE/kinetic evolution or measured accommodation is added.',
                    'Acoustic times use bulk frozen-composition ideal sound speed, not stratified eigenmodes.',
                    'Gas diffusion and Bi screens use bulk uniform properties, not a resolved stratified thermal field.',
                    'Stress relaxation mu/p and viscosity mean-free-path convention are not measured collision counts.',
                    'Actual ion collisionHz and mass diffusivity are never reused as neutral thermal transport.',
                    'Thermal gradient Kn and forcing/deposition homogenization remain unresolved.',
                    'Charged-particle energy, dissociation/recombination and lithium phase kinetics are not solved.']}
output.write_text(json.dumps(result,allow_nan=False)+'\n')
gas.write_yaml(str(output.with_name('cantera-isotopes.yaml')))
output.with_name('gri30-source.yaml').write_bytes(data_file.read_bytes())
summary = {'executionChecksPass':True,'counts':counts,'exportFailures':packet['failures'],
           'inputSHA256':result['inputSHA256'],'resultSHA256':hash_file(output),'cantera':result['cantera'],
           'initialAndConditional':[r for r in records if r['family'] in ('initial-pair-reference','fast55-conditional-species')]}
output.with_name('summary.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='initialAndConditional'},indent=2))
