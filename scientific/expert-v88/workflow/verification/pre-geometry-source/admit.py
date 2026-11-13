"""Always admit cached final outputs before this DAG reports success."""
import json
from pathlib import Path
import sys
from seals import read, sha


field, f = read(sys.argv[1])
audit, a = read(sys.argv[2])
report, r = read(sys.argv[3])
qualification, q = read(sys.argv[4])
if (audit['fieldSHA256'] != f or report['fieldSHA256'] != f
        or report['assessmentSHA256'] != a or report['assessment'] != audit
        or qualification['reportSHA256'] != r):
    raise ValueError('Stale final evidence binding')
for record, code in ((audit,'assess.py'),(report,'report.py'),(qualification,'qualify.py')):
    if record['sourceSHA256'] != sha(Path(code).read_bytes()):
        raise ValueError('Stale final evidence source: '+code)
if (audit['assessment'] != 'pass' or qualification['pilotControlQualified'] is not True
        or any(record['globalQualification'] is not False or
               record['experimentalQualification'] is not False
               for record in (field,audit,report,qualification))):
    raise ValueError('Final control scope or qualification changed')
print(json.dumps(dict(cachedInputsAdmitted=True,fieldSHA256=f,assessmentSHA256=a,
    reportSHA256=r,qualificationSHA256=q,globalQualification=False)))
