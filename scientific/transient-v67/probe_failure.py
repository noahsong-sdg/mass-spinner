"""Instrument a COPY of the exact failing production step, inside safe-dev only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

packet = Path(sys.argv[1]); output = Path(sys.argv[2]); output.mkdir(exist_ok=False)
root = Path.cwd(); data = json.loads(packet.read_bytes())
case = next(row for row in data['cases'] if row['id'] == sys.argv[3])
if not case.get('failure'):
    raise ValueError('Need a retained incomplete trajectory')
thermal = (root/'src/fuel-gas-thermal.ts').read_text()
old = "let values=[...oldValues],accepted=evaluate(values);"
assert thermal.count(old) == 1
thermal = thermal.replace(old, old+"\n const trace:any[]=[];")
old = 'next=evaluate(nextValues);'
assert thermal.count(old) == 1
thermal = thermal.replace(old, old+"trace.push({iteration,search,damping,merit:next.merit,maxRatio:Math.max(...next.residual.map((r,i)=>Math.abs(r)/next!.tolerance[i]))});")
old = "if(!next)throw new RangeError('Coupled mixture energy iteration stalled; refine the time step.');"
assert thermal.count(old) == 1
thermal = thermal.replace(old, "if(!next){console.error(JSON.stringify({probe:'stalled',values,increment,merit:accepted.merit,residual:accepted.residual,tolerance:accepted.tolerance,scales:accepted.scales,trace}));throw new RangeError('Coupled mixture energy iteration stalled; refine the time step.');}")
operation = (root/'src/fuel-spatial-operation.ts').read_text().replace("'./fuel-gas-thermal.js'", "'./v67-thermal-probe.js'")
paths = {'src/v67-thermal-probe.ts': thermal, 'src/v67-operation-probe.ts': operation}
for name, content in paths.items():
    (root/name).write_text(content)
    (output/Path(name).name).write_text(content)
k = len(case['steps']); n = case['requestedSteps']
dt = .001*(((k+1)/n)**2-(k/n)**2)
request = {'setup': case['setup'], 'state': case['steps'][-1]['result']['state'], 'dtS': dt}
(output/'request.json').write_text(json.dumps(request))
runner = f"""import{{readFileSync}}from'node:fs';
import{{advanceFuelSpatialOperation}}from'{root}/src/v67-operation-probe.ts';
const r=JSON.parse(readFileSync('{output}/request.json','utf8'));
try{{const result=advanceFuelSpatialOperation(r.setup,r.state,r.dtS);console.log(JSON.stringify({{unexpectedSuccess:true,iterations:result.thermal.iterations}}));}}
catch(error){{console.log(String(error));process.exitCode=1;}}
"""
(output/'runner.ts').write_text(runner)
result = subprocess.run([str(root/'node_modules/.bin/tsx'),str(output/'runner.ts')],capture_output=True,text=True,timeout=120)
(output/'stdout.log').write_text(result.stdout); (output/'stderr.log').write_text(result.stderr)
(output/'receipt.json').write_text(json.dumps({'command': ['tsx', 'runner.ts'], 'exitCode': result.returncode,
    'packetSHA256': hashlib.sha256(packet.read_bytes()).hexdigest(), 'sourceSHA256': data['sourceSHA256'],
    'caseID': case['id'], 'acceptedStepsBeforeFailure': k, 'dtS': dt,
    'instrumentedSHA256': {name:hashlib.sha256(content.encode()).hexdigest() for name,content in paths.items()}},indent=2))
print(result.stdout, result.stderr[-1800:])
raise SystemExit(result.returncode)
