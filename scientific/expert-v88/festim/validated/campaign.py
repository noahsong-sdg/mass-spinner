"""Real FESTIM 2.2 limit adapters; execute only in the nonroot safe-dev guest."""
import hashlib
import importlib.metadata as metadata
import inspect
import json
import os
from pathlib import Path
import platform
import time

import dolfinx
from dolfinx import fem
import festim as F
from mpi4py import MPI
import numpy as np
from petsc4py import PETSc
import scipy
import ufl
from oracle import profiles, fv_reference_check

ROOT = Path(__file__).resolve().parent
PROTOCOL = json.loads((ROOT/"protocol.json").read_text())
PROTOCOL_SHA = "be8b8542dcc565f9ef600e551034eebb1b69148a0c985ddf0ed26b432831fa00"
GRID = np.linspace(0, 1, 257)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def settings(dt):
    return F.Settings(atol=PROTOCOL["newton"]["atol"], rtol=PROTOCOL["newton"]["rtol"],
                      max_iterations=PROTOCOL["newton"]["maxIterations"], final_time=.1, stepsize=dt)


def sample(field):
    coordinates = field.function_space.tabulate_dof_coordinates()[:, 0]
    indices = np.argsort(coordinates)
    return np.interp(GRID, coordinates[indices], field.x.array.real[indices])


def integral(field):
    return float(MPI.COMM_WORLD.allreduce(fem.assemble_scalar(fem.form(field*ufl.dx))))


def run_case(kind, n, dt):
    mesh = F.Mesh1D(vertices=np.linspace(0, 1, n+1))
    material = F.Material(D_0=4 if kind == "thermal-diffusion-coupling" else .1,
                          E_D=.05 if kind == "thermal-diffusion-coupling" else 0.)
    material.thermal_conductivity = .1
    material.density = material.heat_capacity = 1.
    volume = F.VolumeSubdomain1D(id=1, borders=[0., 1.], material=material)
    left, right = F.SurfaceSubdomain1D(id=1, x=0.), F.SurfaceSubdomain1D(id=2, x=1.)
    domains = [left, right, volume]
    hydrogen, heat, species = None, None, []
    if kind != "heat-eigenmode":
        species = [F.Species("D"), F.Species("T")]
        if kind == "isotope-shared-trap":
            species += [F.Species("D_trapped", mobile=False),
                        F.Species("T_trapped", mobile=False)]
        initial = profiles(kind, GRID, 0.)
        conditions = []
        for sp in species:
            if kind == "isotope-shared-trap":
                value = float(initial[sp.name][0])
            elif sp.name == "D":
                value = lambda x: .6+.2*ufl.cos(np.pi*x[0])
            else:
                value = lambda x: .4-.2*ufl.cos(np.pi*x[0])
            conditions.append(F.InitialConcentration(value=value, species=sp, volume=volume))
        reactions = []
        if kind == "isotope-shared-trap":
            vacant = F.ImplicitSpecies(n=.3, others=species[2:], name="vacant")
            reactions = [F.ArrheniusReaction(reactant=[mobile, vacant], product=trapped,
                         k_0=2., E_k=0., p_0=.5, E_p=0., volume=volume)
                         for mobile, trapped in zip(species[:2], species[2:])]
        hydrogen = F.HydrogenTransportProblem(mesh=mesh, subdomains=domains,
                     species=species, temperature=300., reactions=reactions,
                     initial_conditions=conditions, settings=settings(dt))
        hydrogen.show_progress_bar = False
    if kind in ["heat-eigenmode", "thermal-diffusion-coupling"]:
        value = ((lambda x: 300.+50.*ufl.sin(np.pi*x[0]))
                 if kind == "heat-eigenmode" else 300.)
        bcs = ([F.FixedTemperatureBC(subdomain=s, value=300.) for s in [left, right]]
               if kind == "heat-eigenmode" else [])
        sources = ([] if kind == "heat-eigenmode" else [F.HeatSource(value=1000., volume=volume)])
        heat = F.HeatTransferProblem(mesh=mesh, subdomains=domains,
                 initial_condition=F.InitialTemperature(value=value, volume=volume),
                 boundary_conditions=bcs, sources=sources, settings=settings(dt))
        heat.show_progress_bar = False
    engine = (F.CoupledTransientHeatTransferHydrogenTransport(heat, hydrogen)
              if heat is not None and hydrogen is not None else heat or hydrogen)
    engine.initialise()
    states = []
    for k in range(round(.1/dt)+1):
        now = k*dt
        arrays, totals = {}, {}
        for sp in species:
            field = (hydrogen.u_n if k == 0 else hydrogen.u).sub(species.index(sp)).collapse()
            arrays[sp.name], totals[sp.name] = sample(field), integral(field)
        if heat is not None:
            arrays["temperature"] = sample(heat.u_n if k == 0 else heat.u)
            totals["thermalEnergy"] = integral(heat.u_n if k == 0 else heat.u)
        states.append({"time": now, "fields": {key: a.tolist() for key, a in arrays.items()},
                       "integrals": totals})
        if k < round(.1/dt):
            engine.iterate()
    actual_times = [float(p.t) for p in [hydrogen, heat] if p is not None]
    if max(abs(t-.1) for t in actual_times) > 1e-12:
        raise ArithmeticError("Wrong actual solver endpoint")
    exact = profiles(kind, GRID, .1)
    errors = {name: float(max(abs(np.array(states[-1]["fields"][name])-a)))
              / (50. if name == "temperature" else 1.) for name, a in exact.items()}
    initial_totals = states[0]["integrals"]
    residual = 0.
    for state in states:
        totals = state["integrals"]
        for isotope in ["D", "T"]:
            if isotope in totals:
                total = totals[isotope]+totals.get(isotope+"_trapped", 0.)
                original = initial_totals[isotope]+initial_totals.get(isotope+"_trapped", 0.)
                residual = max(residual, abs(total-original))
    populations = [v for s in states for name, a in s["fields"].items()
                   if name != "temperature" for v in a]
    vacancy = min([.3-a-b for s in states for a, b in
                  zip(s["fields"]["D_trapped"], s["fields"]["T_trapped"])], default=.3) \
                  if kind == "isotope-shared-trap" else None
    return {"kind": kind, "cells": n, "dt": dt, "actualTimes": actual_times,
            "states": states, "normalizedErrors": errors, "isotopeResidual": residual,
            "minimumPopulation": min(populations, default=0.), "minimumVacancy": vacancy}


def difference(a, b):
    return max(max(abs(np.array(a["states"][-1]["fields"][key])
                       -np.array(b["states"][-1]["fields"][key])))
               /(50 if key == "temperature" else 1)
               for key in a["states"][-1]["fields"])


def qualify(runs):
    checks = []
    gate = PROTOCOL["gates"]
    def check(name, value, limit):
        checks.append({"name": name, "value": float(value), "limit": float(limit),
                       "passed": bool(np.isfinite(value) and value <= limit)})
    for run in runs:
        label = f'{run["kind"]}/{run["cells"]}/{run["dt"]}'
        check(label+"/inventory", run["isotopeResidual"], gate["isotopeInventoryAbsoluteTolerance"])
        check(label+"/positivity", -min(0., run["minimumPopulation"]), gate["positivityTolerance"])
        if run["minimumVacancy"] is not None:
            check(label+"/vacancy", -min(0., run["minimumVacancy"]), gate["sharedTrapVacancyTolerance"])
    for case in PROTOCOL["cases"]:
        kind = case["id"]
        def get(n, dt):
            return next(r for r in runs if r["kind"] == kind and r["cells"] == n and r["dt"] == dt)
        spatial = [difference(get(16, .0025), get(32, .0025)),
                   difference(get(32, .0025), get(64, .0025))]
        temporal = [difference(get(64, .01), get(64, .005)),
                    difference(get(64, .005), get(64, .0025))]
        if kind == "isotope-shared-trap":
            check(kind+"/uniform-spatial", max(spatial), gate["uniformTrapSpatialDifferenceTolerance"])
        else:
            check(kind+"/spatial-contraction", spatial[1]/spatial[0], gate["spatialDifferenceContraction"])
        check(kind+"/time-contraction", temporal[1]/temporal[0], gate["timeDifferenceContraction"])
        check(kind+"/profile", max(get(64, .0025)["normalizedErrors"].values()),
              gate["finestNormalizedProfileError"])
        if kind == "thermal-diffusion-coupling":
            check(kind+"/heat", get(64, .0025)["normalizedErrors"]["temperature"]*50,
                  gate["heatCouplingTemperatureAbsoluteTolerance"])
    return checks


def provenance():
    records = [json.loads(p.read_text()) for p in Path(".venv/conda-meta").glob("*.json")]
    package_fields = ["name", "version", "build", "url", "sha256", "md5", "license"]
    packages = [{k: r.get(k) for k in package_fields} for r in records]
    sources = {}
    for folder in [Path(F.__file__).parent, Path(dolfinx.__file__).parent]:
        for path in sorted(folder.rglob("*.py")):
            sources[str(path.relative_to(folder.parent))] = sha(path)
    return {"python": platform.python_version(), "platform": platform.platform(),
            "festim": F.__version__, "dolfinx": dolfinx.__version__, "petsc": PETSc.Sys.getVersion(),
            "scipy": scipy.__version__, "uid": os.getuid(), "mpiSize": MPI.COMM_WORLD.size,
            "conda": packages, "sourceSHA256": sources,
            "moduleSHA256": {p.name: sha(p) for p in ROOT.glob("*.py")},
            "licenses": {"FESTIM": "Apache-2.0", "dolfinx": "LGPL-3.0-or-later",
                         "PETSc": "BSD-2-Clause", "SciPy": "BSD-3-Clause",
                         "io4dolfinx": "MIT"},
            "limitations": ["Constant Cp verification only; FESTIM heat residual is not exact enthalpy at variable Cp.",
                           "Thermal coupling is one-way sequential heat then hydrogen, not reaction-heat feedback.",
                           "All coefficients manufactured; no LiT/Marathon experimental qualification."]}


def main():
    if os.getuid() != 1000 or Path.cwd() != Path("/work/project") or MPI.COMM_WORLD.size != 1:
        raise RuntimeError("Run only in the isolated one-rank nonroot safe-dev project")
    if sha(ROOT/"protocol.json") != PROTOCOL_SHA or F.__version__ != "2.2" or dolfinx.__version__ != "0.11.0":
        raise RuntimeError("Frozen protocol or pinned runtime drift")
    start = time.time()
    result = {"schemaVersion": 1, "protocolSHA256": PROTOCOL_SHA,
              "scope": PROTOCOL["scope"], "sampleCoordinates": GRID.tolist(),
              "oracles": fv_reference_check(), "provenance": provenance(), "runs": []}
    for case in PROTOCOL["cases"]:
        for n in PROTOCOL["meshCells"]:
            for dt in PROTOCOL["timesteps"]:
                print(case["id"], n, dt, flush=True)
                result["runs"].append(run_case(case["id"], n, dt))
                Path("results.json").write_text(json.dumps(result, indent=2)+"\n")
    result["checks"] = qualify(result["runs"])
    result["qualified"] = all(c["passed"] for c in result["checks"])
    result["wallSeconds"] = time.time()-start
    Path("results.json").write_text(json.dumps(result, indent=2)+"\n")
    response = {k: result[k] for k in ["schemaVersion", "protocolSHA256", "scope", "sampleCoordinates", "qualified"]}
    response["runs"] = [{k: r[k] for k in ["kind", "cells", "dt", "states"]}
                        for r in result["runs"] if r["cells"] == 64 and r["dt"] == .0025]
    Path("response.json").write_text(json.dumps(response, indent=2)+"\n")
    print(json.dumps({"qualified": result["qualified"], "runs": len(result["runs"]),
                      "checks": len(result["checks"]), "failed": [c for c in result["checks"] if not c["passed"]]}))
    if not result["qualified"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
