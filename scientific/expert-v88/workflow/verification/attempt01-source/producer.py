"""Actual FiPy insulated conduction solve; no analysis/scoring imports."""
from importlib.metadata import version
import json
import platform
from pathlib import Path
import sys
import numpy as np
from fipy import CellVariable, Grid1D, TransientTerm, DiffusionTerm
from seals import sha, write

DEPENDENCIES = ('producer.py', 'seals.py', 'config.json', 'PROTOCOL.md',
                'requirements-lock.txt')


def main():
    config = json.loads(Path(sys.argv[1]).read_text())
    n, steps = config['cells'], config['steps']
    if n < 2 or steps < 1 or config['lengthM'] <= 0 or config['durationS'] <= 0:
        raise ValueError('Positive geometry/time and at least two cells required')
    mesh = Grid1D(nx=n, dx=config['lengthM']/n)
    x = np.asarray(mesh.cellCenters[0])
    initial = config['baseK']+config['amplitudeK']*np.cos(np.pi*x/config['lengthM'])
    temperature = CellVariable(mesh=mesh, value=initial, hasOld=True)
    equation = TransientTerm() == DiffusionTerm(coeff=config['diffusivityM2S'])
    dt = config['durationS']/steps
    for _ in range(steps):
        temperature.updateOld()
        equation.solve(var=temperature, dt=dt)
    write(sys.argv[2], dict(config=config, xM=x.tolist(), initialK=initial.tolist(),
        finalK=np.asarray(temperature.value).tolist(), acceptedDtS=[dt]*steps,
        sourceSHA256={name: sha(Path(name).read_bytes()) for name in DEPENDENCIES},
        runtime=dict(python=platform.python_version(),
                     **{name: version(name) for name in ('FiPy','numpy','scipy')}),
        model='FiPy finite-volume insulated conduction; backward Euler',
        globalQualification=False, experimentalQualification=False))


if __name__ == '__main__':
    main()
