"""Strict nominal constructor/operator equivalence, in isolated child processes."""
import hashlib
import inspect
import json
import os
from pathlib import Path
import subprocess
import sys
import numpy as np


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def array_digest(value):
    a = np.asarray(value)
    header = json.dumps([a.dtype.str, a.shape], separators=(',', ':')).encode()
    return digest(header+b'\0'+a.tobytes(order='C'))


def worker(root, output):
    sys.path.insert(0, str(root/'scientific/spatial-v101'))
    import campaign101 as c
    seals = c.sources()
    c.old.mesh = lambda n: c.mesh(n, 'smooth-source-aligned')
    data = c.campaign100.baseline()
    constructors = {}
    for n in (1, 2, 4):
        f, d, electro, q = c.old.initialize(data['scenarios'][0], data['manifest'], n)
        arrays = {name: array_digest(getattr(d, name)) for name in
            ('rnodes', 'znodes', 'nodes', 'vdofs', 'tdofs', 'fixed', 'free', 'wall_nodes',
             'component_dofs', 'quadrature_cells', 'quadrature_weight', 'quadrature_mu', 'mu', 'conductivity')}
        arrays['initialQ'] = array_digest(q)
        for name in ('stiffness', 'thermal_stiffness', 'prolongation'):
            matrix = getattr(d, name)
            for part in ('shape', 'data', 'indices', 'indptr'):
                arrays[name+'.'+part] = array_digest(getattr(matrix, part))
        for name in ('integration', 'velocity', 'heat'):
            basis = getattr(d, name)
            for part in ('N', 'nodal_dofs', 'element_dofs'):
                arrays[name+'.'+part] = array_digest(getattr(basis, part))
        basis = d.integration
        for part in ('X', 'W', 'dx'):
            arrays['quadrature.'+part] = array_digest(getattr(basis, part))
        arrays['quadrature.coordinates'] = array_digest(basis.global_coordinates())
        for i, fields in enumerate(basis.basis):
            for j, field in enumerate(fields):
                arrays[f'basis.{i}.{j}.value'] = array_digest(field)
                arrays[f'basis.{i}.{j}.grad'] = array_digest(field.grad)
        constructors[str(n)] = arrays
        del f, d, electro, q, basis
    cls = c.old.Diffusion
    module = sys.modules[cls.__module__]
    operators = {name: digest(inspect.getsource(getattr(cls, name)).encode()) for name in
                 ('advance', 'dissipation_cells', 'solve', 'coefficient', 'nodal_velocity')}
    operators.update({name: digest(inspect.getsource(getattr(module, name)).encode()) for name in
                      ('strains', 'deviatoric_product', 'argon_conductivity')})
    c.old.TIMES = (0., 3e-7)
    state = c.old.evolve(data['scenarios'][0], data['manifest'], 2, .1)
    if c.sources() != seals:
        raise ValueError('Worker inputs changed')
    result = dict(root=str(root), sources=seals, constructors=constructors, operators=operators,
        stateSHA256=digest(json.dumps(state, separators=(',', ':'), allow_nan=False).encode()),
        stepCount=len(state['history']), helperSHA256=digest(Path(__file__).read_bytes()))
    with output.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)


if __name__ == '__main__':
    if sys.argv[1] == '--worker':
        worker(Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve())
    else:
        roots, output = sys.argv[1:3], Path(sys.argv[3]).resolve()
        packets = []
        for i, root in enumerate(roots):
            path = output.with_name(output.stem+f'-worker{i}.json')
            subprocess.run([sys.executable, str(Path(__file__).resolve()), '--worker', root, str(path)],
                check=True, env=dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1'))
            packets.append(json.loads(path.read_bytes()))
        comparable = [{k: v for k, v in p.items() if k not in ('root', 'sources')} for p in packets]
        unchanged = [{k: v for k, v in p['sources'].items() if not k.endswith('/diffusion86.py')} for p in packets]
        exact = comparable[0] == comparable[1] and unchanged[0] == unchanged[1]
        with output.open('x') as stream:
            json.dump(dict(exactNominalEquivalence=exact, workers=packets,
                scope='Constant-viscosity nominal constructor/operators only; original full-study source identity retained.'), stream, indent=2)
        if not exact:
            raise ArithmeticError('Strict nominal equivalence failed; inspect retained worker packets')
