"""Small-amplitude cylindrical acoustic control; execute only in safe-dev.

J1(kR)=0 imposes a reflecting outer wall. Exact J0 cell integrals avoid
initial sampling error. Linear acoustics is accurate to O(amplitude).
"""
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import sys
import numpy as np
from scipy.special import j1, jn_zeros

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow


def measure(r, time=1e-5, amplitude=1e-4, cfl=.15):
    f = Flow(r, np.linspace(0., .14, 3), np.array([36., 40.])*1.66053906892e-27)
    rho, temperature = .001, 350.
    gas_constant = 1.380649e-23*np.sum(.5/f.masses)
    sound = np.sqrt(5/3*gas_constant*temperature)
    k = jn_zeros(1, 1)[0]/r[-1]
    average = 2*np.diff(r*j1(k*r))/(k*np.diff(r*r))
    initial_rho = rho*(1+amplitude*average)
    pressure = rho*gas_constant*temperature*(1+5/3*amplitude*average)
    q = f.state(initial_rho, pressure/(initial_rho*gas_constant), .5, 0.)
    elapsed, steps = 0., 0
    initial = q.copy()
    while elapsed < time:
        dt = min(time-elapsed, f.stable_dt(q, cfl))
        q = f.advance(q, dt)
        elapsed += dt
        steps += 1
    change = q[0]/f.volume-initial_rho
    exact_change = rho*amplitude*average*(np.cos(sound*k*time)-1)
    error = change-exact_change
    scale = np.max(abs(exact_change))
    weights = f.volume/f.volume.sum()
    return dict(n=len(r)-1, timeS=time, amplitude=amplitude, cfl=cfl, steps=steps,
        minimumCellM=float(np.diff(r).min()), axisCellM=float(r[1]),
        normalizedRms=float(np.sqrt(np.sum(weights*error*error))/scale),
        normalizedMax=float(abs(error).max()/scale), axisError=float(abs(error[0, 0])/scale),
        massResidualKg=float((q[0]-initial[0]).sum()))


if __name__ == '__main__':
    rows = []
    for n in (24, 48, 96):
        x = np.linspace(0., 1., n+1)
        for name, r in (('wall', .06*np.tanh(2*x)/np.tanh(2)),
                        ('symmetric', .03*(1+np.tanh(2*(2*x-1))/np.tanh(2)))):
            rows.append(dict(grid=name, **measure(r)))
    x = np.linspace(0., 1., 49)
    r = .03*(1+np.tanh(2*(2*x-1))/np.tanh(2))
    auxiliary = [measure(r, amplitude=5e-5), measure(r, cfl=.075)]
    baseline = next(row for row in rows if row['n'] == 48 and row['grid'] == 'symmetric')
    checks = [dict(name=name, difference=abs(row['axisError']-baseline['axisError']),
                   passed=abs(row['axisError']-baseline['axisError']) < .002)
              for name, row in zip(('halfAmplitude', 'halfCfl'), auxiliary)]
    output = Path(sys.argv[1])
    sources = (Path(__file__), Path(__file__).resolve().parents[1]/'mixture-axial-v75/flow.py')
    report = dict(rows=rows, auxiliary=auxiliary, checks=checks,
        sourceHashes={p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
        runtime={name: version(name) for name in ('numpy', 'scipy')},
        scope='Linear acoustic control, not coupled qualification')
    output.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(dict(rows=rows, checks=checks)), flush=True)
    raise SystemExit(0 if all(row['passed'] for row in checks) else 1)
