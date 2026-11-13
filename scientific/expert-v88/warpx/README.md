# WarpX rotating-transport reference

Status: actual WarpX26.10 RZ backend installed and executed in safe-dev;12 frozen
cases, a separately frozen warm collision-off control and9 regression/negative tests completed. Spatial collision transport
remains unqualified. Raw results and every failed gate are retained.

The existing WarpX references deliberately set `do_not_push=1` and
`do_not_gather=1`. They test homogeneous collision relaxation, so they cannot test
spatial orbit transport, rotating momentum, or cell-local collision errors.
This adapter uses the actual pinned WarpX26.10 RZ backend with prescribed
Cartesian particle fields `E=(κx,κy,0)` and `B=(0,0,Bz)`, active Boris pushing,
and explicitly selected Bobylev/Nanbu collision laws and subcycling. It does not
implement a new PIC or collision solver.

The frozen protocol separates collision-off analytic orbits from a warm rotating
two-ion mixture. Radial boundaries reflect only normal velocity; axial boundaries
are periodic. Physical exit number is therefore zero; the measured inventory
ledger must verify it. Absorbing collectors are not qualified by this experiment.

Mechanical angular momentum is `Lz=Σw m(x uy−y ux)`, where `u=γv` is proper
velocity. It need not remain constant in a prescribed magnetic field. The exact
axisymmetric invariant is `Pθ=Lz+Σw q Bz r²/2`. The output retains both and the
expected Lorentz angular impulse. Likewise it retains kinetic energy and
electrostatic work separately and checks `K−Σw q κr²/2`. Values are SI, summed
over the represented physical particles. Stored RZ radius and theta are converted
to Cartesian coordinates before computing these ledgers.

`protocol.json` is frozen before the campaign. `reference.py campaign` records
its SHA256 and launches each actual external solver run in a separate process.
`analyze.py` rejects stale schema, changed protocol, changed runner, and changed
input decks before reporting pass/fail. Raw initial/final phase-space arrays,
weights and IDs remain in each case's `raw.npz`.

The small timestep/grid/law/subcycle checks are feasibility diagnostics. They
cannot establish a joint particle/cell continuum limit, full distribution
convergence, self-consistent field response, or agreement with measurements.
In particular, finite-cell binary scattering can conserve pair energy and
linear momentum while changing physical angular momentum; failed gates must
remain failed.

Exact environment replay uses the previously exported82-distribution lock from
`scientific/warpx/installation.json`, including conda-forge WarpX26.10 build
`np2py312hded7337_0`, SHA256
`a442e121ea53b32cdd6443fd1aa413247496ab7b34da756bd067363e65b4348c`.
The upstream runtime banner can say `Unknown`; the package/build/hash supplies
distribution provenance, not a recovered source commit.

Primary references:

- [WarpX26.10 parameters](https://warpx.readthedocs.io/en/26.10/usage/parameters.html): particle external fields, RZ boundary conditions, explicit cumulative-scattering laws and `ndt_subcycle`.
- [Tagged particle wrapper](https://github.com/BLAST-WarpX/warpx/blob/26.10/Python/pywarpx/particle_containers.py): RZ radius/theta and proper-velocity arrays.

Measured results are in `summary.json`, with per-case raw arrays, decks, sampled
ledgers and source/config hashes in `results/`. Position error contracts
4.009×/4.005× and velocity error4.0002×/4.0002× when the orbit timestep halves.
The finest relative errors are1.674e-7 in position and3.531e-6 in velocity. The
collision-off prescribed-field orbit is independent of this diagnostic grid.

Six of seven warm collision cases exceed the0.001 raw canonical-angular screen:
0.001736–0.003891. A single finer-grid case gives0.00038698, but fixed particle
number, sparse cells, missing six-seed uncertainty and absent axial/alignment
studies prevent continuum qualification. All twelve preserve physical inventory.
The inherited strict1e-10 energy screen fails11/12 cases; only the zero-field
free-flight control passes. The separate0.001 prescribed-field energy feasibility
screen passes; it does not replace the strict failed screen. Warm collision-off
attribution is recorded separately, without changing the original frozen family.
Its energy residual is7.731e-6 and canonical residual1.8746e-4, with exact
inventory. The control shows that pusher/boundary error contributes to the warm
ledgers; collisional residuals cannot be interpreted as an exactly isolated
collision torque. Its stored unbounded analytic-orbit errors are **inapplicable**
to reflected trajectories and are retained without scoring as Lorentz failures.
The saved eligibility witness verifies all16 initial arrays match the collision
baseline exactly; only the collision law differs. The no-wall analytic endpoint
puts55 heavy particles outside the actual0.06m reflecting cylinder.

The [independent audit](../review/README.md) reran all9 tests and reproduced
`summary.json` byte-for-byte. Tagged native source plus an actual synchronization
on/off probe verify that default `Evolve` endpoint snapshots synchronize velocity
with position; the negative control exposes the half-step velocity lag.
`qualification.json` states the remaining physical failures explicitly.

The installed native interface required four narrow corrections: read the actual
RZ `r` component because the deprecated radius wrapper requests missing `x`;
copy velocity columns before passing them through a binding that assumes
contiguous memory; use particle-field parser names containing `_particle_`;
and use uppercase collision enums plus repeated species names for self-pairs.
These match the actual pinned binary rather than silently changing the physics.
Every rejected integration pilot remains in `preliminary-*`.

Execution used only `safe-dev-9400816a26de3d80`, source copied from
`/private/tmp/mass-spinner-warpx-v88-20261112`, with no host mounts. Downloads
were confined to exact binary-package replay. The native environment remains
under `/work/home/warpx88-env`; it is not exported. Canonical new non-test Python
is294lines, excluding retained historical pilot snapshots.

Commands run inside safe-dev:

```sh
python3 install.py
/work/home/warpx88-env/bin/python -m unittest -v test_reference
/work/home/warpx88-env/bin/python reference.py campaign
/work/home/warpx88-env/bin/python analyze.py
```

Before a fresh installation, copy `scientific/warpx/installation.json` to the
isolated staging directory as `previous-installation.json`. The installer
converts that82-package URL/SHA256 record into a true conda explicit lock;
`installation.json` records the new actual resolution and installer digest.
Runner SHA256: `e684b3c7dc0e4d71914a6fe22df34400a46a6fd34e41a36c26a94a63d8a852fc`.
Frozen protocol SHA256: `a07907e9ae2714b0ee0e27dc015b4b8bc2505115799633ef8b978d5dc1253edb`.
