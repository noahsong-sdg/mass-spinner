"""Compare LU orderings on actual coupled viscous/thermal timestep matrices."""
import hashlib
import importlib.util
import json
from pathlib import Path
import resource
import sys
import time
import numpy as np
from scipy.sparse.linalg import norm, splu, spsolve


def main():
    root, output = (Path(v).resolve() for v in sys.argv[1:3])
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    if n not in (2, 4):
        raise ValueError('Ordering probe requires n=2 or n=4')
    spec = importlib.util.spec_from_file_location('ordering_campaign99', root/'scientific/coupled-v99/campaign99.py')
    campaign = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(campaign)
    seals = campaign.sources()
    packet = json.loads((root/'scientific/boundary-v84/results/predictions.json').read_bytes())
    f, diffusion, electro, q = campaign.initialize(packet['scenarios'][0], packet['manifest'], n)
    captured = []
    def capture(matrix, rhs, free):
        reduced = matrix[free][:, free].tocsc()
        answer = spsolve(reduced, rhs[free])
        captured.append((reduced, rhs[free].copy(), answer.copy()))
        full = np.zeros(len(rhs)); full[free] = answer
        return full
    diffusion.solve = capture
    dt, _ = campaign.step_size(f, q, .1, 1e-7)
    q, _ = f.advance_with_receipt(q, dt)
    q, _ = electro.advance(q, dt)
    diffusion.advance(q, dt)
    if len(captured) != 2:
        raise ValueError('Expected exactly mechanical and thermal solves')
    rows = []
    for name, (matrix, rhs, expected) in zip(('mechanical', 'thermal'), captured):
        asymmetry = float(norm(matrix-matrix.T)/max(norm(matrix), np.finfo(float).tiny))
        for repeat in range(3):
            orderings = ('COLAMD', 'MMD_AT_PLUS_A')
            for ordering in orderings if repeat % 2 == 0 else orderings[::-1]:
                started = time.perf_counter()
                factor = splu(matrix, permc_spec=ordering)
                factored = time.perf_counter()
                answer = factor.solve(rhs)
                solved = time.perf_counter()
                difference = float(np.linalg.norm(answer-expected)/max(np.linalg.norm(expected), np.finfo(float).tiny))
                residual = float(np.linalg.norm(matrix@answer-rhs, np.inf)/max(
                    norm(matrix, np.inf)*np.linalg.norm(answer, np.inf)+np.linalg.norm(rhs, np.inf), np.finfo(float).tiny))
                if difference > 1e-10 or residual > 1e-12:
                    raise ArithmeticError('Ordering changed the numerical solution')
                row = dict(operator=name, ordering=ordering, repeat=repeat,
                    rows=matrix.shape[0], matrixNonzeros=matrix.nnz,
                    factorNonzeros=factor.L.nnz+factor.U.nnz, relativeAsymmetry=asymmetry,
                    factorSeconds=factored-started, solveSeconds=solved-factored,
                    relativeSolutionDifference=difference, backwardResidual=residual)
                rows.append(row); print(json.dumps(row), flush=True)
                del factor
    if campaign.sources() != seals:
        raise ValueError('Probe inputs changed during execution')
    result = dict(refinement=n, dtS=dt, sourceSHA256=seals, rows=rows,
        workerPeakRssKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        helperSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    with output.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)


if __name__ == '__main__':
    main()
