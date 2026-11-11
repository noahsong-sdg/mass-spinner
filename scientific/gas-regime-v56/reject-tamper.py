"""Demonstrate independent audit rejection of material result corruption. Safe-dev only."""
from pathlib import Path
import copy
import json
import subprocess
import sys

packet, results, directory = map(Path,sys.argv[1:4])
original = json.loads(results.read_text())
auditor = Path(__file__).with_name('audit-independent.py')
records = []
for name in ('capacity-percent','wrong-effusive-energy','nist-conductivity-percent'):
    data = copy.deepcopy(original)
    first = next(r for r in data['cases'] if r['supported'])
    if name=='capacity-percent':
        first['neutralCapacityJK'] *= 1.01
    elif name=='wrong-effusive-energy':
        first['wall']['maxwellReferenceWK'] *= .75  # 3kT/2 instead of 2kT per incident atom
    else:
        next(p for p in data['dataChecks'] if p['pair']=='helium')['properties']['kWMK'] *= 1.01
    altered = directory/(name+'.json')
    assert not altered.exists()
    altered.write_text(json.dumps(data,allow_nan=False)+'\n')
    output = directory/(name+'-audit.json')
    command = [sys.executable,str(auditor),str(packet),str(altered),str(output)]
    result = subprocess.run(command,capture_output=True,text=True,timeout=30)
    (directory/(name+'.log')).write_text(result.stdout+result.stderr)
    assert result.returncode==1 and 'AssertionError' in result.stderr and not output.exists(),name
    records.append({'name':name,'exitCode':result.returncode,'rejected':True,'command':command})
target=directory/'negative-controls.json'
assert not target.exists()
target.write_text(json.dumps({'allPass':True,'controls':records},indent=2)+'\n')
print(target.read_text())
