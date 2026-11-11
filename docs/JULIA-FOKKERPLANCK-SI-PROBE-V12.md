# Julia SI initial-rate qualification — v12

**The frozen, bounded initial-rate gates pass.** This qualifies the SI coefficient
and early ion-temperature exchange for one 40u/84u case; it is not a full mesh
convergence result, a positive-distribution solver qualification, or a long-time
comparison with PETSc/WarpX. No production or upstream solver source changed.

Source: FokkerPlanck.jl multi-species branch
`869e22dbbeda603caf99848c9d58052d9ec9d362`, same saved Manifest and Julia 1.13.3 as
the frozen upstream smoke. New bridge is 118 lines. Inputs and gates were saved
in `scientific/julia-fokkerplanck-v12/si-probe-plan.md` before scientific execution;
the thresholds were not retuned after results. An independent agent reviewed
the normalization, moment conversion, source and actual exported results; see
`JULIA-FOKKERPLANCK-SI-REVIEW-V12.md`.

## SI bridge and checks

The abstract ions are exactly 40 and 84 times the production mass unit
1.66053906660e-27 kg, both charge +e, density 5e17 m^-3 each, initial 2/10 eV,
fixed common lnLambda=12, no drift/fields. Elementary charge is 1.602176634e-19 C
and epsilon0 is 8.8541878128e-12 F/m, checked against production source.

References are mref=40u, cref=6945.694067429592 m/s, tref=1us, nref=5e17 m^-3.
Thus masses=[1,2.1], common c0=n0=[1,1], and physical temperatures are
`20*(p_normalized/n_normalized)` eV. The normalized collision coefficient is
0.0013573454059700387, obtained from
`Gamma*nref*tref/(mref²*cref³)` with
`Gamma=e⁴*lnLambda/(8*pi*epsilon0²)=4.013151005517349e-54` SI.

The initial PDFs sample the upstream analytic Maxwellian directly, with
`vth=sqrt(2*e*T/m)/cref`, without clipping or density renormalization. Moments
use the package's existing 2pi*vperp measure. Initial signed thermal rates include
the quotient-rule term `20*(dp/n-p*dn/n²)/tref`, with pressure moments of C taken
about the mean velocity of f. The expected analytic rates are
`[+27982.1633001,-27982.1633001]` eV/s.

Independent review caught a helper-signature mismatch before any scientific
execution: this branch expects scalar velocities, while the earlier interface
accepted grids plus indices. Passing actual `a.grid[i],b.grid[j]` fixes that
integration error and retains the upstream Maxwellian normalization rather than
duplicating it in a second formula.

## Observed spatial/domain sensitivity

All cases use ngrid=5, natural boundaries, vparallel in [-R,R] and vperp in [0,R].

| Elements parallel x perpendicular; R | Corrected dT40/dt | Corrected dT84/dt |
| --- | ---: | ---: |
| 8x4; 4 | 28054.354760 | -28049.850458 |
| 12x6; 4 | 27978.412012 | -27977.240686 |
| 16x8; 4 | 27981.865746 | -27981.862992 |
| 20x10; 5 | 27981.865746 | -27981.862993 |

Rates are eV/s. Maximum analytic relative error falls from about 0.258% to 0.0176%
to 0.0011%. The final domain extension preserves element width 0.5, so that last
comparison measures domain sensitivity rather than another mesh refinement.
The R4 grid ladder demonstrates sensitivity; the frozen gates do not establish
a formal mesh error budget or convergence order.

Final initial densities/nref are `[0.999999799579213,0.9999998979784869]`, and
temperatures `[1.999999699344861,10.000002929782505]` eV. Relative density and
temperature projection errors satisfy the frozen 1e-4 bounds; their maximum is
about 2.93e-7. Projection errors are reported without renormalizing them away.

The final raw rates are `[27982.544817964357,-27981.792372198484]`; the corrections
shift these by approximately `[-0.679072,-0.070621]` eV/s. Operator correction
weighted **nodal** L1 magnitudes relative to raw C are
`[2.0064043208250677e-5,1.414982453684011e-6]`. These decrease across the grid ladder.
They are quadratures of absolute nodal values, not exact absolute-value norms of
the continuous interpolant.

## Observed time sensitivity and controls

Only after direct/projection/domain gates passed, each independent BE step started
from the same initial PDF on the final 20x10,R5 grid.

| dt | dT40/dt, eV/s | dT84/dt, eV/s | Final minimum nodal f |
| --- | ---: | ---: | ---: |
| 1us | 27587.465244 | -27587.462529 | -2.020e-7 |
| 0.25us | 27881.279676 | -27881.276932 | -6.670e-8 |
| 0.0625us | 27956.589118 | -27956.586365 | -2.747e-8 |

The finest finite-step analytic error is about 0.0914%; the last dt difference is
about 0.269% of the analytic rate. Both satisfy their frozen 1%/0.5% bounds.
All three nonlinear success returns were asserted true. Initial f was positive
at sampled nodes, but every nonzero mixed-species step produced negative nodes.

Actual per-step density changes are at most 3.56e-15 in normalized units;
total energy changes are at most 6.22e-15. End-step projection weighted nodal L1
changes relative to initial f are at most 1.34e-13. This is inferred directly
from the package's saved pre-end-correction increment, not from a modified solver.

The collision-off 1us control returned success and left the full nodal PDF and
all recorded moments exactly unchanged. The common-T6eV 1us control also returned
success: temperature changes are about -1.91e-8/+1.91e-8 eV, below the frozen
1e-4 eV temperature tolerance. However, its maximum nodal PDF change is
6.880414113608069e-5 and its minimum f is -4.549707202543362e-9. This is a passing
temperature control, **not full distribution stationarity**. Negative mass,
between-node positivity and physical entropy remain unqualified. No abs(f)
entropy diagnostic was used.

## Exact execution and preserved evidence

All scientific execution ran offline inside the existing dedicated safe-dev VM.
Disk exhaustion initially prevented VM startup and saving files; no scientific
failure occurred. After parent-coordinated recovery, existing guest-only runtime,
source and depot were moved temporarily to `/work/home/mass-spinner-julia-v12-cache`
across explicit source sync, then restored to their original paths. No downloads
or new dependency installation were required. Previous valuable guest evidence
was exported before replacement; frozen upstream-smoke files were preserved.

```
JULIA_DEPOT_PATH=.cache/depot JULIA_NUM_PRECOMPILE_TASKS=2 OPENBLAS_NUM_THREADS=1 \
  .cache/julia-1.13.3/bin/julia --check-bounds=yes \
  --project=.cache/FokkerPlanck.jl-869e22dbbeda603caf99848c9d58052d9ec9d362 si-probe.jl
```

Command exited 0. Four direct cases completed; all five BE returns (three mixed,
off, common-T) were asserted true. Projection, direct-rate, domain, dt and control
gates are all true in `scientific/julia-fokkerplanck-v12/si-results/probe.toml`.
The log is alongside it. Full copied source/evidence export:
`/tmp/mass-spinner-julia-si-probe-v12-20261106`.

Tested bridge SHA256:
`f5aaf3361aa3d685522c459c580db9c4ddda39e8c412c135a62c4acc3991dd5b`.
Frozen plan SHA256:
`223d57efd3cd03f3f47df30222325d2f54f23b01ad296eda0b6a733e87cca63c`.
Host source/plan and frozen smoke/Manifest/provenance/log were checked against the
export byte-for-byte. No frontend code changed or frontend build ran here.

The next increment should address distribution resolution and quantify negative
mass/collision-equilibrium defects before a long-time matched-code comparison.
Agreement of this analytic initial rate does not explain the existing 0.5ms
TA/WarpX/PETSc disagreement by itself.
