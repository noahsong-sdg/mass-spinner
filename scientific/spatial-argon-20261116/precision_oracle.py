"""Independent 80-digit BE solve of the declared SG operator, not continuum data.

Exact binary64 input values are lifted with Decimal.from_float. No production
coefficients, factors or mass/transfer results enter the reference evolution.
"""
from decimal import Decimal as D, localcontext
import hashlib
import json
from pathlib import Path
import sys


def decimal(value):
    return D.from_float(value) if isinstance(value, float) else D(value)


def advance(mass, sample, case):
    temperature = list(map(decimal, sample['temperatureK']))
    omega = list(map(decimal, sample['omegaRadS']))
    n = len(mass)
    dt, diffusivity, radius, species = map(decimal, (
        case['dtS'], case['diffusivityM2S'], case['radiusM'], case['speciesMassKg']))
    kb = decimal(1.380649e-23)
    outward, inward = [], []
    for i in range(n-1):
        inverse = (1/temperature[i] + 1/temperature[i+1])/2
        z = species*radius**2*(omega[i]**2+omega[i+1]**2)*inverse/(4*kb*n)
        b = z/(z.exp()-1) if z else D(1)
        scale = dt*4*diffusivity*(i+1)*n*inverse/radius**2
        outward.append(scale*temperature[i]*(b+z))
        inward.append(scale*temperature[i+1]*b)
    diagonal = [D(1)+(inward[i-1] if i else 0)+(outward[i] if i<n-1 else 0) for i in range(n)]
    rhs = list(mass)
    for i in range(1, n):
        factor = -outward[i-1]/diagonal[i-1]
        diagonal[i] += factor*inward[i-1]
        rhs[i] -= factor*rhs[i-1]
    result = [D(0)]*n
    result[-1] = rhs[-1]/diagonal[-1]
    for i in range(n-2, -1, -1):
        result[i] = (rhs[i]+inward[i]*result[i+1])/diagonal[i]
    transfers = [outward[i]*result[i]-inward[i]*result[i+1] for i in range(n-1)]
    return result, transfers


def assess(packet):
    rows = []
    with localcontext() as context:
        context.prec = 80
        for case in packet['cases']:
            initial = list(map(decimal, case['initial']))
            mass = initial
            error, response, transfer_error, transfer_scale = D(0), D(0), D(0), D(0)
            clocks = []
            for step, sample in enumerate(case['samples'], 1):
                mass, transfers = advance(mass, sample, case)
                scale = max(abs(a-b) for a, b in zip(mass, initial))
                mass_error = max(abs(decimal(a)-b) for a, b in zip(sample['mass'], mass))
                face_error = max(abs(decimal(a)-b) for a, b in zip(sample['faceTransfers'], transfers))
                face_scale = max(map(abs, transfers))
                response, error = max(response, scale), max(error, mass_error)
                transfer_error, transfer_scale = max(transfer_error, face_error), max(transfer_scale, face_scale)
                clocks.append({'step': step, 'massResponse': float(scale), 'maximumMassError': float(mass_error),
                               'maximumTransferError': float(face_error), 'maximumTransfer': float(face_scale)})
            rows.append({'id': case['id'], 'amplitude': case['amplitude'], 'massResponse': float(response),
                         'maximumMassError': float(error), 'relativeMassResponseError': float(error/response),
                         'maximumTransferError': float(transfer_error), 'maximumTransfer': float(transfer_scale),
                         'relativeTransferError': float(transfer_error/transfer_scale), 'clocks': clocks})
    return {'kind': '80-digit-discrete-transport-replay', 'sourceHash': packet['sourceHash'],
            'retainedSourceHash': packet['retainedSourceHash'], 'retainedHistoriesSha256': packet['retainedHistoriesSha256'], 'cases': rows,
            'numericallyQualified': False, 'experimentallyQualified': False}


if __name__ == '__main__':
    path = Path(sys.argv[1])
    data = path.read_bytes()
    result = assess(json.loads(data))
    result['inputSha256'] = hashlib.sha256(data).hexdigest()
    result['oracleSha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    with path.with_name('precision-assessment.json').open('x') as output:
        json.dump(result, output, indent=2, allow_nan=False)
        output.write('\n')
    print(json.dumps(result, allow_nan=False))
