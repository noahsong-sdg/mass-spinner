"""Display computed gates without replacing the complete retained results."""
import json
from pathlib import Path
import sys

for name in sys.argv[1:]:
    data = json.loads(Path(name).read_text())
    print(name)
    for row in data['comparisons']:
        print(row['coarseID'], '->', row['fineID'], row['axis'])
        for gate in row['gates']:
            maximum = row['maxima'][gate['name']]
            print(json.dumps({'metric': gate['name'], 'value': gate['value'], 'limit': gate['limit'],
                              'passed': gate['passed'], 'raw': maximum['rawDifference'], 'timeS': maximum['worstTimeS']}))
        print('secondary liner', json.dumps(row['causalLocalLinerTemperatureSecondaryAssessment']))
        print('causal gas', json.dumps(row['causalLocalGasTemperatureDiagnostics']))
