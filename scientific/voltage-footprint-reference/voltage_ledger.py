"""Keep distinct electrical observations distinct; no sheath or voltage fit."""
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
INVENTORY = ROOT/'scientific/public-data-campaign/observations.json'


def ledger(path=INVENTORY):
    raw = path.read_bytes()
    data = json.loads(raw)
    if data['apparatus']['id']!='wijnakker-1979-diffuse':
        raise ValueError('Same historical apparatus required')
    observations = {}
    for identity in ('terminal-voltage','corrected-voltage'):
        matches = [row for row in data['scalars'] if row['id']==identity]
        if len(matches)!=1:
            raise ValueError('Unique voltage observation required')
        row = matches[0]
        values = [row['value'],row['reportedPlusMinus']]
        if (row['units']!='V' or not all(type(v) in (int,float) for v in values)
                or not np.isfinite(values).all() or row['reportedPlusMinus']<0):
            raise ValueError('Finite voltage and reported range required')
        observations[identity] = dict(row,reportedValueRangeV=[row['value']-row['reportedPlusMinus'],row['value']+row['reportedPlusMinus']])
    terminal,corrected = (observations[key]['reportedValueRangeV'] for key in ('terminal-voltage','corrected-voltage'))
    return dict(sourcePath=str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else path.name,
        sourceSHA256=hashlib.sha256(raw).hexdigest(),observations=observations,
        terminalMinusCorrectedRangeV=[terminal[0]-corrected[1],terminal[1]-corrected[0]],
        rangeMeaning='Endpoint arithmetic on published plus/minus ranges; not a confidence interval or identified sheath law.',
        modelPortMappingEstablished=False,probeConversionEstablished=False,
        probeReferenceRadiusM=.05,probeRadiusRangeM=[.04,.06],
        probeModelProxy='phi(r,0)-phi(0.05,0)',
        probeSourceMeaning='Reported plasma potential from a doubly shielded floating Langmuir probe; conversion/circuit not recovered, not asserted raw floating voltage.',
        parametersRefitted=False,experimentalQualification=False)
