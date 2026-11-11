"""Independent actual-FiPy radial gas/liner heat oracle; run only in safe-dev.

Input: {"cases": [{"name", "config", "initial", "steps"}]}.
config: radiusM,lengthM,thicknessM,cells,gasCapacityJK,gasWallWK,coolingWK,
coolantK. Optional material={kind:'constant',densityKgM3,cpJKgK,kWMK};
otherwise NIST solid tungsten Cp + Tolias2017 k, fixed rho=19250 kg/m3.
initial: {gasK,wallK:[...]}. Each step: {dtS,gasEnergyJ,linerEnergyJ}.
Optional expected states: {gasK,wallK:[...],coolingEnergyJ} on each step.

The gas is one lumped finite-volume cell occupying [0,radiusM]. The wall
has cylindrical finite volumes. Actual FiPy assembles and SciPy factorizes
the coupled system; no production solver code or matrix is imported.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import subprocess
from pathlib import Path

os.environ['FIPY_SOLVERS'] = 'scipy'
import numpy as np
import fipy
from fipy import (CellVariable, FaceVariable, CylindricalGrid1D,
                  TransientTerm, DiffusionTerm, ImplicitSourceTerm)
from fipy.solvers.scipy import LinearLUSolver

MOLAR_MASS_KG = 0.18384
RHO = 19250.0


def cp(T, material=None):
    if material is not None:
        return np.full_like(np.asarray(T, dtype=float), material['cpJKgK'])
    t = np.asarray(T, dtype=float) / 1000
    return (23.95930 + 2.639680*t + 1.257750*t*t
            - 0.254642*t**3 - 0.048407/(t*t)) / MOLAR_MASS_KG


def enthalpy(T, material=None):
    """Integral of Cp from300K, J/kg; energy is not Cp(T)*T."""
    if material is not None:
        return material['cpJKgK'] * (np.asarray(T, dtype=float) - 300)
    t = np.asarray(T, dtype=float) / 1000
    def primitive(x):
        return (23.95930*x + 2.639680*x*x/2 + 1.257750*x**3/3
                - 0.254642*x**4/4 + 0.048407/x)
    return (primitive(t) - primitive(0.3))*1000/MOLAR_MASS_KG


def conductivity(T, material=None):
    if material is not None:
        return np.full_like(np.asarray(T, dtype=float), material['kWMK'])
    T = np.asarray(T, dtype=float)
    return (149.441 - 0.045466*T + 13.193e-6*T*T
            - 1.484e-9*T**3 + 3.866e6/(T*T))


def run_case(case):
    c = case['config']
    n, ri, length, thick = c['cells'], c['radiusM'], c['lengthM'], c['thicknessM']
    material = c.get('material')
    assert n >= 1 and ri > 0 and length > 0 and thick > 0
    assert c['gasCapacityJK'] > 0 and c['gasWallWK'] >= 0 and c['coolingWK'] >= 0
    rho = material['densityKgM3'] if material is not None else RHO
    assert rho > 0
    # Keep the legacy uniform mesh arithmetic when no explicit edges are given.
    widths = np.full(n, thick/n)
    if 'radiusEdgesM' in c:
        edges = np.asarray(c['radiusEdgesM'], dtype=float)
        assert edges.shape == (n+1,) and np.all(np.isfinite(edges))
        assert edges[0] == ri and edges[-1] == ri+thick and np.all(np.diff(edges) > 0)
        widths = np.diff(edges)
    mesh = CylindricalGrid1D(dx=(ri, *widths))
    mesh_centers = np.asarray(mesh.cellCenters[0], dtype=float)
    faces = np.asarray(mesh.faceCenters[0], dtype=float)
    # Physical wall unknowns sit at geometric centers, giving exact logarithmic
    # half-shell resistances. FiPy's coefficient converts the resulting total
    # conductance to its own arithmetic-center gradient convention.
    centers = np.r_[mesh_centers[0], np.sqrt(faces[1:-1]*faces[2:])]
    geometric = 2*math.pi*length
    volumes = geometric*np.asarray(mesh.cellVolumes, dtype=float)
    masses = rho*volumes[1:]
    values = np.asarray([case['initial']['gasK'], *case['initial']['wallK']], dtype=float)
    assert values.shape == (n+1,)
    T = CellVariable(mesh=mesh, value=values, hasOld=True)
    delta = CellVariable(mesh=mesh, value=0., hasOld=True)
    cv = CellVariable(mesh=mesh, value=1.)  # no hasOld: secant applies to both endpoints
    kface = FaceVariable(mesh=mesh, value=0.)
    sink = CellVariable(mesh=mesh, value=0.)
    source = CellVariable(mesh=mesh, value=0.)
    eq = (TransientTerm(coeff=cv) == DiffusionTerm(coeff=kface)
          - ImplicitSourceTerm(coeff=sink) + source)
    lu = LinearLUSolver(tolerance=1e-13, iterations=1000)
    cooling_total = 0.
    states = []
    max_relative_balance = 0.
    max_residual = 0.
    max_expected = 0.
    time = 0.

    def energy(v):
        return np.r_[c['gasCapacityJK']*v[0], masses*enthalpy(v[1:], material)]

    def conductances(v):
        k = conductivity(v[1:], material)
        G = np.zeros(n)
        if c['gasWallWK'] > 0:
            G[0] = 1/(1/c['gasWallWK'] + math.log(centers[1]/ri)/(geometric*k[0]))
        for j in range(1, n):
            resistance = (math.log(faces[j+1]/centers[j])/(geometric*k[j-1])
                          + math.log(centers[j+1]/faces[j+1])/(geometric*k[j]))
            G[j] = 1/resistance
        outer = 0.
        if c['coolingWK'] > 0:
            outer = 1/(1/c['coolingWK'] + math.log((ri+thick)/centers[-1])/(geometric*k[-1]))
        return G, outer

    for step in case['steps']:
        dt = step['dtS']
        assert dt > 0
        old = np.asarray(T.value, dtype=float).copy()
        T.updateOld()
        delta.setValue(0.)
        delta.updateOld()
        Eold = energy(old)
        deposited = np.zeros(n+1)
        deposited[0] = step.get('gasEnergyJ', 0.)
        deposited[1] = step.get('linerEnergyJ', 0.)  # inner surface deposition assumption
        if 'cellEnergyJ' in step:
            deposited += np.asarray(step['cellEnergyJ'], dtype=float)
        for iteration in range(300):
            v = np.asarray(T.value, dtype=float).copy()
            if material is None and (np.min(v[1:]) < 300-1e-8 or np.max(v[1:]) > 1900+1e-8):
                raise ValueError(f"{case['name']}: wall left validated 300–1900 K domain: {v}")
            heatcap = np.empty(n+1)
            heatcap[0] = c['gasCapacityJK']
            dT = v[1:] - old[1:]
            # Exact enthalpy secant, derivative only at coincident temperatures.
            secant = cp(v[1:], material)
            mask = np.abs(dT) > 1e-5
            secant[mask] = (enthalpy(v[1:][mask], material)-enthalpy(old[1:][mask], material))/dT[mask]
            heatcap[1:] = masses*secant
            cv.setValue(heatcap/volumes)
            G, outer = conductances(v)
            coeff = np.zeros(n+2)
            for j in range(n):
                coeff[j+1] = G[j]*(mesh_centers[j+1]-mesh_centers[j])/(geometric*faces[j+1])
            kface.setValue(coeff)
            s = np.zeros(n+1)
            s[-1] = outer/volumes[-1]
            sink.setValue(s)
            # Solve for the step increment: absolute-temperature storage terms
            # lose small gas-row energy changes beside the massive wall.
            # This translation leaves the matrix and backward-Euler equations
            # unchanged; the old-temperature conduction moves into the RHS.
            old_flux = G*(old[:-1]-old[1:])
            forcing = np.zeros(n+1)
            forcing[:-1] -= old_flux
            forcing[1:] += old_flux
            forcing[-1] += outer*(c['coolantK']-old[-1])
            source.setValue((deposited/dt+forcing)/volumes)
            eq.solve(var=delta, dt=dt, solver=lu)
            T.setValue(old+np.asarray(delta.value))
            solved = np.asarray(T.value, dtype=float)
            Gnew, outernew = conductances(solved)
            flux = dt*Gnew*(solved[:-1]-solved[1:])
            residual = energy(solved)-Eold-deposited
            residual[:-1] += flux
            residual[1:] -= flux
            cooling = dt*outernew*(solved[-1]-c['coolantK'])
            residual[-1] += cooling
            scale = np.maximum(np.maximum(np.abs(Eold), np.abs(energy(solved))),
                               np.maximum(np.abs(deposited), 1e-9))
            relative_residual = float(np.max(np.abs(residual)/(1+scale)))
            if relative_residual < 1e-11 and np.max(np.abs(solved-v)) < 1e-8:
                break
        else:
            raise RuntimeError(f"{case['name']}: nonlinear FiPy did not converge, {relative_residual}")
        cooling_total += cooling
        time += dt
        balance = float(np.sum(energy(solved)-Eold-deposited)+cooling)
        balance_scale = 1+float(np.sum(np.abs(Eold))+np.sum(np.abs(deposited)))
        max_relative_balance = max(max_relative_balance, abs(balance)/balance_scale)
        max_residual = max(max_residual, relative_residual)
        state = {'timeS': time, 'gasK': float(solved[0]), 'wallK': solved[1:].tolist(),
                 'gasExchangeJ': float(flux[0]),
                 'coolingEnergyJ': cooling_total, 'energyResidualJ': balance,
                 'nonlinearIterations': iteration+1}
        if 'expected' in step:
            want = step['expected']
            difference = max(abs(state['gasK']-want['gasK']),
                             max(abs(a-b) for a,b in zip(state['wallK'], want['wallK'], strict=True)))
            max_expected = max(max_expected, difference)
            assert difference <= case.get('temperatureToleranceK', 2e-6), (case['name'], time, difference)
            if 'coolingEnergyJ' in want:
                assert abs(cooling_total-want['coolingEnergyJ']) <= 1e-7+1e-9*abs(cooling_total)
        states.append(state)
    assert max_relative_balance < 1e-9, (case['name'], max_relative_balance)
    return {'name': case['name'], 'states': states,
            'maximumRelativeEnergyBalance': max_relative_balance,
            'maximumNonlinearResidual': max_residual,
            'maximumProductionTemperatureDifferenceK': max_expected}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    inputs = json.loads(args.input.read_text())
    cases = inputs['cases']
    for probe in inputs.get('propertyProbes', []):
        T = probe['temperatureK']
        for key, value in [('conductivityWMK', float(conductivity(T))),
                           ('heatCapacityJKgK', float(cp(T))),
                           ('specificEnthalpyJKg', float(enthalpy(T)))]:
            assert abs(probe[key]-value) < 1e-8+1e-11*abs(value), (T,key,probe[key],value)
    results = [run_case(c) for c in cases]
    out = {'fipyVersion': fipy.__version__, 'python': platform.python_version(),
           'solver': 'actual FiPy CylindricalGrid1D + TransientTerm + DiffusionTerm + SciPy LinearLUSolver',
           'thermalClosure': 'enthalpy secant iteration; fixed material mass; gas lumped; film plus logarithmic half-shell resistance',
           'materialDomainK': [300,1900], 'cases': results, 'allPass': True,
           'independentPropertyProbes': len(inputs.get('propertyProbes', [])),
           'inputSHA256': hashlib.sha256(args.input.read_bytes()).hexdigest(),
           'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'fipyInitSHA256': hashlib.sha256(Path(fipy.__file__).read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(out,indent=2)+'\n')
    args.output.with_suffix('.freeze.txt').write_text(subprocess.check_output([os.sys.executable,'-m','pip','freeze'],text=True))
    print(json.dumps({k:v for k,v in out.items() if k != 'cases'}, indent=2))


if __name__ == '__main__':
    main()
