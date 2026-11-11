"""Isolated endwall-gradient control against the heat-equation sine series.

Execute only in safe-dev. Stress-free outer cylinder removes radial shear;
constant rho and mu make Omega_t=nu Omega_zz an exact torsional solution.
Initial Omega=900 sin²(pi z/L) satisfies no-slip but has zero wall gradient.
The developing gradient tests the same early wall layer as the mixture run.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from coupling import load

HERE = Path(__file__).resolve().parent
Torsion = load('wall_control_torsion', HERE.parent/'axial-v73/torsion.py').Torsion
R, L, RHO, MU, OMEGA = .06, .14, .001, 2.54e-5, 900.
TIMES = (10e-6, 20e-6, 40e-6)


def wall_edges(n, length, beta=0.):
    x = np.linspace(-1., 1., n+1)
    return length*(1+(np.tanh(beta*x)/np.tanh(beta) if beta else x))/2


def exact_torque(time):
    n = np.arange(1, 4000, 2, dtype=float)
    coefficients = 8/(np.pi*n*(4-n*n))
    derivative = OMEGA*np.sum(coefficients*n*np.pi/L*np.exp(-MU/RHO*(n*np.pi/L)**2*time))
    return -np.pi*MU*R**4/2*derivative


def control(n, beta, nt=256):
    r, z = np.linspace(0., R, 3), wall_edges(n, L, beta)
    model = Torsion(r, z, RHO, MU, outer=None, lower=0., upper=0.)
    center = (z[1:]+z[:-1])/2
    initial = OMEGA*(.5-.5*np.cos(2*np.pi*center/L)*np.sinc(np.diff(z)/L))
    w = np.repeat(initial, 2)
    dt, rows = TIMES[-1]/nt, []
    for i in range(1, nt+1):
        out = model.step(w, np.zeros_like(w), dt)
        w = np.asarray(out['omegaRadS'])
        if i in [round(t/dt) for t in TIMES]:
            t = i*dt
            exact = exact_torque(t)
            computed = out['boundaryTorqueNm']['lower']
            rows.append(dict(timeS=t, exactTorqueNm=exact, torqueNm=computed,
                             relativeError=abs(computed-exact)/abs(exact)))
    return dict(n=n, beta=beta, nt=nt, minimumCellM=float(np.diff(z).min()), cases=rows)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    rows = [control(n, beta) for beta in (0., 2.5) for n in (24, 48, 96)]
    result = dict(rows=rows, sourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  operatorSha256=hashlib.sha256((HERE.parent/'axial-v73/torsion.py').read_bytes()).hexdigest(),
                  experimentalQualified=False, liveQualified=False)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(result), flush=True)
