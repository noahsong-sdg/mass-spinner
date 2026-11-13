"""Independent stdlib analytic comparison; failed gates are retained data."""
import math
from pathlib import Path
import sys
from seals import read, sha, write


def main():
    field, digest = read(sys.argv[1])
    for name, expected in field['sourceSHA256'].items():
        if sha(Path(name).read_bytes()) != expected:
            raise ValueError('Stale physical source/configuration: '+name)
    c = field['config']
    expected_x = [(i+.5)*c['lengthM']/c['cells'] for i in range(c['cells'])]
    if len(field['finalK']) != c['cells'] or any(
            abs(x-y) > 1e-14*c['lengthM'] for x,y in zip(field['xM'],expected_x)):
        raise ValueError('Unexpected field geometry')
    amplitude = c['amplitudeK']*math.exp(-c['diffusivityM2S']*math.pi**2*c['durationS']/c['lengthM']**2)
    exact = [amplitude*math.cos(math.pi*x/c['lengthM']) for x in expected_x]
    relative = math.sqrt(sum((t-c['baseK']-e)**2 for t,e in zip(field['finalK'],exact))/sum(e*e for e in exact))
    inventory = abs(sum(field['finalK'])-sum(field['initialK']))/sum(field['initialK'])
    gates = dict(analyticRMS=relative < .002, inventory=inventory < 1e-12,
                 passiveBounds=all(200-1e-10 <= t <= 400+1e-10 for t in field['finalK']))
    write(sys.argv[2], dict(fieldSHA256=digest, sourceSHA256=sha(Path(__file__).read_bytes()),
        relativePerturbationRMS=relative, relativeInventoryDrift=inventory,
        gates=gates, assessment='pass' if all(gates.values()) else 'gate_fail',
        globalQualification=False, experimentalQualification=False))


if __name__ == '__main__':
    main()
