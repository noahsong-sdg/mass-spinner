# PETSc exact two-ion adaptation and qualification

7 November 2026 UTC. The all-species SI setup, independent isotropic driver,
coefficient/normalization checks and initial-rate probe execute successfully.
All eight frozen cases completed, including the full 0.5-ms mesh, timestep and
domain comparisons. Fine moments converge within the prospective budget, but
the enlarged domain has observed negative values and the common-temperature
control fails the entropy diagnostic budget. **Reference acceptance remains UNKNOWN.**

## Root cause and smallest coherent adaptation

The upstream `ex1.c` calls `DMPlexLandauCreateVelocitySpace`, which calls
`ProcessOptions` in `plexland.c`. That setup forces species zero to electron mass,
uses rounded physical constants and electron-oriented option conventions, then
derives thermal speeds, normalization scales and cached collision coefficients.
`ex1.c` additionally initializes a bi-Maxwellian with perpendicular temperature
1.3 times the configured parallel temperature and has an electron-specific NRL
comparison. Thus merely relabeling species and changing an ion-mass input cannot
produce an isotropic 40 u / 84 u case. In plain terms, the first slot stays an
electron and the supplied example creates a different distribution.

`twoion_setup.h` adds an optional, complete all-species SI branch immediately
after legacy charge/mass conversion and **before** thermal speeds, Coulomb logs,
normalization, meshes and `CreateStaticData`. It requires masses in kilograms,
charges in coulombs, temperatures in eV and a positive fixed Coulomb logarithm;
uses exact Boltzmann/elementary-charge constants and the production epsilon-zero
convention; and explicitly restricts normalization to species/grid zero.
Partial or nonfinite input fails. Without SI options it returns before changing
any state. A real regression compiles the unmodified upstream example both with
and without the source override, runs five steps and compares printed setup and
temperature histories exactly.

`patch_setup.py` verifies upstream source SHA256 before applying one insertion
and one helper include. `build_twoion.sh` compiles that translation unit against
the pinned PETSc 3.26.1 distribution. The collision kernel is unchanged; no source
tree is patched in place and no dummy electron is introduced. A separate
`twoion.c` driver initializes isotropic Maxwellians, starts physical time at zero,
uses PETSc's implicit Landau residual/Jacobian and exports actual physical moments.

This setup-boundary change was chosen over modifying masses after construction:
post-setup changes would leave cached coefficients/normalization inconsistent.
A dummy electron would change the physical and numerical problem. Reimplementing
the operator would discard the independent method we need for validation.

## Exact physical case and normalization

- Species masses 6.6421562664e-26 and 1.394852815944e-25 kg (40 u and 84 u).
- Both charges +1.602176634e-19 C; density 5e17/m3 per species.
- Initial isotropic 2/10 eV, fixed lnLambda=12, no fields or spatial transport.
- Reference speed **2196.4213183796646 m/s**, reference time
  **2.3297516212599038e-5 s**, reference mass 40 u and density 5e17/m3.
- Physical time is normalized time times t0. Distribution is
  F=f_physical*v0^3/n0; its velocity-space integral is n_species/n0.
- The axisymmetric velocity calculation represents three physical velocity
  components. Moment integrals use **2*pi*v_perp**, not a Cartesian 2D measure.

The initialized-context diffusion matrix is [[1,1],[(40/84)^2,(40/84)^2]],
friction matrix [[1,40/84],[40/84,(40/84)^2]]. A separate `probe_cached.c`
reads the CPU alpha, beta, inverse-mass and Coulomb-log arrays actually consumed
by assembly; its products agree with this independently derived matrix to 1e-14
relative tolerance. This distinguishes formula recomputation from cached-state
evidence. The cached probe's raw output is retained with the cases.

## Prospective plan and executed evidence

`scientific/petsc/twoion-plan-v12.json` was frozen before the first dynamics.
Primary horizons are 0.1, 0.25 and 0.5 ms. Meshes have 4x8, 8x16 and 12x24
quadrilateral cells per species, degree-two elements; timesteps are independently
10, 5 and 2.5 microseconds at 12x24. Domain R=6 initial component thermal standard
deviations extends to R=8 with 16x32 cells, preserving spacing relative to the
12x24/R6 comparison. A common-5-eV control and a 10-ns initial-rate probe complete
the eight planned cases. Radii in physical m/s are exported for each species.

Frozen projection budgets: relative density 5e-4; absolute temperature and
anisotropy 0.005 eV. Invariant budgets are 1e-8 relative to positive physical
scales. The deterministic moment-refinement budget is 0.05 eV at every primary
time; initial slope budget is 2%. None was tuned to a dynamic result.

The independent Maxwellian initial energy-transfer slope is +27982.1633001 eV/s
for 40 u and its negative for 84 u. The 12x24/R6/10-ns PETSc probe gives
**+27969.0746615 / -27969.0746636 eV/s**, approximately **0.0468%** relative
difference. Its initial density error 6.763e-5, temperature error 0.001748 eV and
anisotropy 0.002621 eV pass the prospective projection budgets. This checks an
actual transfer rate beyond conservation; it is not an exact finite-time closure.

The 4x8 case fails qualification: initial density error 0.8597%, temperature
error 0.17174 eV and anisotropy 0.28408 eV. During the 0.5-ms run the negative
number fraction reaches 1.7588%, despite total energy residual about 1.23e-12.
An underresolved finite-element representation can conserve moments while
containing nonphysical negative values. This is retained negative evidence,
not repaired by clipping, renormalization or a positivity projection.

`entropyPositivePartH` is explicitly the integral of F*log(F) over sampled
positive F. `entropySampledDefined=false` when quadrature or coefficient samples
are negative; full entropy is then withheld. Node/quadrature positivity is not a
global polynomial positivity proof. Conservation alone does not prove an
H-theorem, positivity or a correct finite-time relaxation law.

The completed persisted results are:

| Case | Initial projection gate | Final T40 / T84, eV | Maximum negative number fraction | Wall seconds |
|---|---|---:|---:|---:|
| 4x8 / R6 / 5 us | FAIL | 5.347545 / 6.446370 | 1.75879e-2 | 7.64 |
| 8x16 / R6 / 5 us | FAIL | 5.380916 / 6.608366 | 2.85812e-6 | 140.60 |
| 12x24 / R6 / 5 us | PASS | 5.382956 / 6.614947 | 0 observed | 597.12 |
| 12x24 / R6 / 10 us | PASS | 5.374969 / 6.622933 | 0 observed | 363.23 |
| 12x24 / R6 / 2.5 us | PASS | 5.386960 / 6.610943 | 0 observed | 1036.22 |
| 16x32 / R8 / 5 us | PASS | 5.384833 / 6.613073 | 7.99445e-10 | 1823.79 |
| Common 5 eV / 12x24 / R6 | PASS | 4.998455 / 4.999797 | 0 observed | 503.40 |
| Initial-rate 10-ns probe | PASS | 1.999930 / 9.997973 | 0 observed | 4.33 |

All species-number residuals are below 4.7e-15, total-energy residuals below
1.23e-12 and momentum residuals below 1.25e-15 on the declared positive scale.
These conserve each discretized initial state; they do not correct its projection
error. Fine R6 initialization gives 1.99965046 / 9.99825229 eV, rather than exactly
2/10 eV. No renormalization or distribution clipping was applied.

Maximum absolute species-temperature changes across **all three primary times**
are 0.196345 eV for mesh4→mesh8 (FAIL), 0.007949 eV for mesh8→mesh12,
0.018591 eV for dt10→5 us, 0.009515 eV for dt5→2.5 us and 0.001876 eV for
R6→R8 (the latter four PASS the frozen 0.05-eV moment budget).
At 0.5 ms, the timestep changes shrink from 0.007987 to 0.004003 eV,
consistent with the chosen first-order backward-Euler method. This is evidence
for moment refinement within this resolution range, not an exact error bound or
full-distribution convergence.

The common-temperature control has maximum species-temperature drift
0.000673568 eV and anisotropy drift 0.00175578 eV; it passes the declared
0.05-eV stationarity moment budget. Its sampled H diagnostic nevertheless has a
maximum relative one-step increase **8.85539e-8**, exceeding the frozen **1e-8**
entropy budget: **FAIL**. Fine unequal-temperature R6 cases have no sampled H
increase, but R8 develops negative F (minimum quadrature value -3.73560e-12,
negative number fraction 7.99445e-10 above the 1e-10 diagnostic budget).
Its full entropy is therefore withheld. The 12x24/R6/5-us case also develops absolute
parallel/perpendicular temperature differences up to 0.00586417 eV, illustrating
residual discretization anisotropy in a physically isotropic case.

These retained failures prevent promoting the PETSc trajectory to a qualified
reference. No mass, charge, pair-density, time-normalization or initial-rate
prefactor error was found in the audited SI branch; positivity and entropy
qualification remain genuine numerical requirements. A separate native-field
export/reconstruction study is being performed and is not implied by this
moment-only campaign.

## Reproducibility and regression checks

All solver installation, compilation and execution use Apple safe-dev VM
`safe-dev-1548cb547e3e8373`. No host physics execution, home/credential mounts or
container-control forwarding was used. Source was explicitly synced after edits.
Downloads use online mode; scientific runs/tests are offline. Toolchains are
kept in guest-only `/work/home/petsc-env-v12` and `petsc-cache-v12`, with guest
project symlinks; they are never host directories. This avoids repeated downloads
when explicitly refreshing a copied source snapshot.

Commands run with `safe-dev -C <project>/scientific/petsc`:

1. `run --online -- sh bootstrap.sh` and `run --online -- sh build_twoion.sh`:
   pinned environment/source checks and compilation PASS.
2. `run -- python3 run_twoion.py --case slope --case mesh4`: both complete.
3. Final `run -- python3 -m unittest -v`: **16 tests PASS**, 5.729 s
   (12 two-ion and four retained upstream-parser regressions).
   Actual cached coefficients, SI normalization and initial slope; source-pin,
   stale/truncated/false-entropy data rejection; invalid physical input; unchanged
   upstream no-option behavior; scheduler output and memory-accounting regressions;
   stationarity beyond conservation; stale persisted case/metadata handling.
4. `run -- python3 schedule_twoion.py`: validates retained physical configs,
   numerical source hashes and JSON against raw logs, then resumes missing cases.
5. `run -- python3 assess_twoion.py`: all eight declared cases assessed, none missing.
6. `run -- python3 provenance_twoion.py`: PASS, recording 23 actual source/build/
   header/binary/runtime-command files, all 90 installed packages matched exactly
   to the SHA256 explicit lock, and 21 output-artifact hashes.

After the storage-full incident elsewhere in the project, every main case was
freshly read in the guest: JSON/config/source hashes and complete parsed raw logs
matched. A 16-file pre-export SHA manifest was generated before export; host
read-only checks confirmed every exported case JSON/log byte matched. Valuable
results were copied back before the final explicit sync (64 files, 2.1 MiB), and
the tests, assessment and provenance ran on that refreshed snapshot. Final export
`/tmp/petsc-verified-v12` matched all 21 manifest artifact hashes on the host.
No corrupted main-study artifact was observed.

`results/twoion-v12/provenance.json` records the actual compiled patched source
SHA256 `8d3c49f3f4719a8479c49fc10aa61fabc3867946e181c770482fd5a6b3b3872d`,
object `0e0db73fd95da4aece7b4416ce7cb290b5e9488c44ffd9604406a5760391bf5c`,
driver executable `ee9f83406975fae19e9337cd378399ee1f6884366066c571e6b4d61decb42446`
and linked PETSc library
`ea4ff3b7044ec02b72823f8fe092ac8c4e265745523660391ff8939baf6bd1e2`.
It also retains the build recipe, private source archive, public headers,
compiler/package inventory and actual dynamic-link resolution. Numerical
source hashes are checked against every executed case's own source graph.

Raw outputs and each case's numerical source graph are retained under
`scientific/petsc/results/twoion-v12/`. The independent physics audit is
[PETSC-INDEPENDENT-AUDIT-V12.md](PETSC-INDEPENDENT-AUDIT-V12.md).

## Scheduling corrections and limitations

An initial serial orchestration was interrupted after retaining mesh8 to schedule
independent cases concurrently. SIGINT to the launcher did not stop its ephemeral
VM, so only the exact verified PETSc VM was stopped before export; its volume and
completed results were preserved. A first scheduler measured zero RSS because
its `/proc` accounting was inadequate. That run was stopped before claiming a
memory qualification. External read-only runtime statistics showed approximately
270 MiB aggregate usage out of 4 GiB, without observed pressure.

The corrected scheduler uses Linux reaped-child peak RSS after an isolated probe,
rejects zero measurements and retains own-process RSS when child enumeration is
unavailable. The actual probe peak is **55.1875 MiB**, available RAM **3922.99 MiB**;
three workers with twofold per-case reserve fit below 80% of available RAM. A
file-backed stdout/stderr capture fixes a latent polling/undrained-pipe deadlock;
a regression writes 1 MiB to each stream and checks success and error handling.
Only scheduling changed: numerical driver, setup, plan and case runner sources
remain byte-identical across retained and resumed cases. Interrupted unfinished
cases are not counted as completed samples.

PETSc's FEM operator is computationally expensive in velocity space and does not
automatically preserve positivity. These costs and failure modes are tradeoffs
for a deterministic discretization independent of stochastic collision pairing.
Moment convergence is narrower than full-distribution convergence. Homogeneous
qualification does not validate rotating collision cells, collectors or apparatus
performance; no production browser behavior or deployment changed here.
