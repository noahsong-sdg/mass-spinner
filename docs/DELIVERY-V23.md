# Deuteron stopping and evolving LiT loading — v23

## What is implemented

02 retains its original linear source and adds **Geant4-derived Li/T stopping**
under Target & electrical assumptions. Material formula-unit column and initial
T site fraction determine the reactive column independently of the fixed
stopping matrix. A separate expandable loading panel evolves T, D and vacancies,
neutron rate and cumulative production, with atom budgets, export and explicit
time-resolution warnings. The thermal/geometry panels remain frozen initial
source references; changing loading never silently changes their contract.

Five agents covered stopping data/code selection, loading literature, loading
implementation, independent physics validation, RustBCA execution and actual UI
handlers (some agents covered more than one role). All project execution used
copied Apple safe-dev VMs. No host simulation/build/dependency execution or
browser-policy workaround was used.

## Problems, causes, fixes and choices

**Prescribed energy loss had no material relation.** Technically, the original
source integrated a linear energy trajectory independent of its T column.
Simply, adding material did not calculate additional slowing. The optional
model now integrates `dE/dN = −S(E)` through fixed formula-unit column using
Geant4-derived elemental electronic and mean nuclear stopping. It preserves
the checked attenuation/product-energy ledger. Atomic additivity is explicitly
an estimate; no LiT chemical correction or experiment is invented. This was
chosen over bare Bethe extrapolation, relabeled proton measurements or a new
unreferenced stopping formula. The original mode and setpoints are retained.

**There was no evolving isotope state.** Technically, exposure only scaled a
steady rate, so implanted D, displaced T and fusion vacancies were absent.
Simply, the target could not change composition. A bounded well-mixed fixed-site
reference now evolves T/D/vacancies and its own neutron history, driven by an
explicitly assumed non-fusing D replacement probability. Fusion creates a
vacancy; replacement may release T/D or fill a vacancy. Full projectile and
target atom ledgers distinguish arrivals from net retention. Exact event
substeps preserve positivity; their composition is first order and requires
refinement. This is preferable to inventing LiT diffusivity, loss rates or
temperature-dependent retention. It is not a resolved implantation/transport
model, and its yield is not substituted into the constant-heat observer.

**A valid material source could have unsupported energy-scan points.** A thick
slab accepted at high incident energy may slow lower-energy scan points below
the cross-section fit. Simply, one valid setting does not make the entire scan
valid. A specific domain error now distinguishes that boundary: unsupported
scan points are excluded and counted visibly, while invalid selected sources
clear all dependent results. No stopped tail is silently assigned zero yield,
and unrelated errors are not swallowed by the scan.

**Independent tests found incorrect outgoing-D integration.** The initial
exchange ledger used a replacement fraction where the initial-D contribution
requires integrated dose. Simply, site populations could look conserved while
released deuterium was miscounted. The analytic outgoing-D integral now uses
`D0 × dose` plus a stable short-dose complement. Independent budgets and the
exact exchange limit test that equation directly. Fixing the integral was
chosen over adjusting residuals or clipping counts.

**Extreme optical depths erased fusion consumption numerically.** The original
large-depth branch subtracted almost equal optical depths: a change of ten
disappeared next to 10²⁰. Simply, finite incoming deuterons could incorrectly
produce zero counted fusion. A stable direct-loss identity using `log1p` and
`expm1` now avoids that subtraction and exponential overflow. Separate tests
verify tiny incident-limited consumption and the branch transition. A zero
representable hazard is also handled before division. Algebraic limits were
chosen over artificial rate floors or arbitrary physical cutoffs.

**Conservation masked coarse time evolution.** Independent simultaneous RK4
exposed substantial high-dose splitting bias, despite closed atom ledgers.
Simply, positive populations and conserved atoms did not make the timing
accurate. The UI now always compares selected intervals with twice as many and
flags a conservative per-interval T-loss bound exceeding a declared 10%
numerical budget. Neither is called an accuracy certificate. High-dose cases
remain unqualified: at the documented synthetic dose, even 6400 intervals are
6.38% high. A more accurate coupled-time backend remains necessary there;
warnings do not claim to solve that failure.

## Existing tools actually used versus recommended

- **Geant4 v11.4.0**, commit
  `b4a16de652ec244f7a0ecc0a5cacfee21930bf75`: small mean-stopping adaptation,
  public license/attribution retained. Original C++ function bodies were
  compiled separately to generate regression fixtures. No full toolkit run.
- **RustBCA**, commit `51bee889956147e3287491d0c68957967235a33c`:
  actually compiled with pinned dependencies and run in an isolated VM. Six
  seeded 256-ion cases include out-of-regime negative controls; a thread replay
  reproduces endpoint statistics. Upstream tests passed 10/10. Incident energy
  transfer closes below 6×10⁻¹⁴ relative. This is a semi-infinite, uncalibrated
  atomic mixture; implantation fraction is not finite-film retention. Source,
  GPL license, lockfile, inputs and checked outputs are retained.
- **FESTIM 2** is the recommended multispecies diffusion/trapping/surface
  backend; **TMAP8** is the independent mass/thermal transport comparator.
  Neither was installed or run in this stage. Material coefficients and
  implantation profiles remain prerequisites. Licensed SDTrimSP is another
  relevant dynamic BCA comparator.

The browser uses a small inspectable TypeScript constitutive model; reference
work uses existing C++ and Rust implementations. A new language alone would
not supply missing material data. Full Monte Carlo and finite-element workloads
remain offline rather than being hidden behind a supposedly equivalent slider.

## Evidence and remaining scientific limits

The reviewed sources did not establish a validated keV D/solid-LiT stopping and
retention/diffusion coefficient set. The IAEA bulk download returned HTTP403;
coverage is incomplete, not evidence that no such data exist. Proton tables,
metal-tritide measurements and low-eV hydride studies were not relabeled as LiT
calibration. Atomic additivity, a static matrix and an assumed well-mixed
replacement law remain material-model uncertainties.

Independent checks cover compiled upstream stopping formulas/units, an
energy-coordinate range/hazard quadrature, depth refinement, full energy
accounting, separate simultaneous RK4 loading, exact limiting solutions,
positivity, isotope/projectile ledgers, opaque-depth arithmetic and actual
production control handlers. These check implementation and numerical scope;
they do not establish Marathon operating performance or target lifetime.

Final application snapshot: 321 input files, source-map SHA256
`80370e2210df07ea1502db901d35d8f68bdd4d84151e81bebd79445c2b436139`.
Guest: `safe-dev-237b3beb65a2b397`, stage
`/tmp/mass-spinner-playgrounds-v23`. Explicit resync/reinstallation preceded
the final gate; the preceding gate was retained before the opaque-depth fix.

- `npm test`: **342/342 passed**, zero skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing main-bundle size warning remains
  (1112.84 kB minified / 316.08 kB gzip).
- `npm run check:site`: passed.
- Actual final guest export and host inputs matched all 321 source hashes.
- All 121 release files matched the build manifest; aggregate SHA256
  `b8ef5de98f2e32ca85b78ecc545b51df09ab5db5973a9afb66a1e290c40d9078`.

Application logs/source are in `scientific/verification-v23`. Separate evidence
is in `scientific/stopping-v23`, `scientific/stopping-reference-v23`,
`scientific/loading-independent-v23` and the agent review documents. The
RustBCA README records retained large negative-control streams in its persistent
guest; those streams were not falsely claimed exported.

No new backend endpoint, credentials or persisted-state migration is introduced.
Legacy configuration fields retain their defaults; new source fields are
optional. UI handlers use text nodes, clear stale results, isolate local
loading errors and recover valid source/observer state. Physical material
validation, high-dose time accuracy and live browser/GPU appearance remain
open. The explicit managed browser-origin denial was not bypassed.

Published equations, sources and compact RustBCA results:
`/DEUTERON-STOPPING-LOADING.md` and `/RUSTBCA-REFERENCE-V23.json`.


## Observed deployment

Cloudflare reports version `72294baa-60c7-46c7-ab3f-1f294cbc408b` at 100%, created 2026-11-08T04:00:02.845157Z (UTC; 7 November locally). URL: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev. All 121 actual deployment-export files still match the checked release hashes. Provider response, deployment script/config/lock and log are archived in `scientific/deployment-v23`. No public browser or indirect public-origin fetch was used to bypass the managed denial.
