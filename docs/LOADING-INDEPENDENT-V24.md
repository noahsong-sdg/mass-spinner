# Independent coupled loading verification, v24

Scope: numerical verification of the declared fixed-matrix, well-mixed target
model. This does **not** establish measured LiT retention, target lifetime or a
calibrated Marathon Fusion machine.

## Problem and equations

The v23 fusion-then-replacement Lie split closes atom ledgers but systematically
favours fusion: it exposes the old, more tritiated population to an entire dose
step before admitting competing replacement. In ordinary language, the two
processes were taking turns when they should act together. Reducing that error
by uniformly increasing plot intervals was impractical at high dose. The
previous documented case, initial T fraction .65, unit-loading optical depth
1e-6, replacement probability .8 and incident dose 1000/site, remained **6.38%
high at 6400 intervals**.

Let u be incident D per fixed hydrogen site, f,d,v be T,D,vacancy fractions,
p=1-exp(-tau*f), b=eta*exp(-tau*f). The simultaneous equations are

```
f' = -p-b*f       d' = b*(1-d)       v' = p-b*v
F' = p           A' = b             U' = (1-eta)*exp(-tau*f)
RT' = b*f        RD' = b*d
```

F counts fusion, A replacement arrivals, U unretained projectiles, RT/RD released
target isotopes. Initial conditions are `[f0,1-f0,0,0,0,0,0,0]`. Independently
checked identities are `f+d+v=1`, `f+F+RT=f0`, `d-(1-f0)=A-RD`, and `F+A+U=u`.
These follow the reaction bookkeeping; budget closure alone is not an accuracy
test.

The production adaptive DP5(4) implementation solves simultaneous transformed
hazards and independent scaled event channels. Positive survival coordinates
avoid population clipping. Scaled channels protect tiny fusion signals. This
addresses the actual time-discretization error with a small browser-appropriate
solver; replacing the UI plot grid with millions of uniform steps would retain
the first-order mechanism and waste work after T depletion.

## Independent reference

`scientific/loading-independent-v24/reference.py` calls the existing SciPy
`solve_ivp` implementation, not production derivatives, event substeps or RK
tableaux. Actual environment: Python 3.11.2, SciPy 1.16.3, NumPy 2.3.5. Versions
are pinned in `requirements.txt`. SciPy's [official solve_ivp
documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html)
describes Radau, DOP853, component tolerances and analytic Jacobians.

The reference independently advances eight unknowns with an analytic Jacobian.
Only the T coordinate is logarithmic; D, vacancies and every event ledger remain
independent ODE unknowns. A direct-T Radau trial initially overflowed when Newton
iteration explored negative T in an opaque target. Log-T fixes that reference
coordinate-domain issue without clipping the reaction law. It does not reuse
production's H/Q reduction.

There are 42 synthetic cases: tau from 1e-12 through 1000, eta 0/.2/1, doses
1e-6/1000/1e7, zero dose, zero hazard, f0=0/1, the historical failing case and a
moderate joint-reaction case. Each uses Radau at relative tolerances 2e-10 and
2e-12, with small component absolute tolerances for fusion. Eighteen suitable
cases also use the separate DOP853 method; fusion-only cases are checked against
their analytic solution.

Reference self-checks, saved in `reference-checks.json`:

| Check | Maximum |
| --- | ---: |
| Radau coarse/fine relative fusion difference | 2.692e-12 |
| DOP853/Radau relative fusion difference | 1.852e-13 |
| Analytic fusion-only relative difference | 6.423e-14 |
| Scaled site/isotope/projectile residual | 4.175e-14 |

The large-dose absolute event-channel coarse/fine difference is 1.49e-8 counts
per site on a channel of order 1e7; it is about roundoff at that scale. Tiny
fusion is assessed relatively, rather than being hidden by a unit absolute
tolerance.

## Adversarial findings during implementation

Independent tests found and the implementing agent corrected two additional
edge cases:

- Zero dose used a synthetic plot coordinate as physical dose in a residual,
  incorrectly rejecting an unchanged initial state. The residual now uses zero
  physical dose.
- Scaling nonfusion/released-D ledgers by the entire requested dose gave their
  early transient an absolute tolerance of about 1e-6/site at dose 1e7.
  Their scaling now uses at most one incident D/site. This preserves initial
  replacement accuracy while relative error control handles long-time growth;
  loosening conservation checks would have concealed the issue.

An opaque fusion-only analytic branch also produced a negative unretained-D
count of 2.12e-22/site from double rounding (`F>u` by one ULP). The smaller
nonfusion channel is now evaluated directly from its analytic integral when
most projectiles fuse; when fusion is small, its stable direct expression is
retained. This conditions each event channel without clipping. The final
42-case positivity sweep passes with every population and event channel
nonnegative at every retained history point.

## Production comparison and execution evidence

`study.ts` runs all 42 cases at seven tolerance pairs and two plot densities,
588 production solves. `production-study.json` records each final vector,
fusion/reference error, solver diagnostics, timings, kernel and fixture hashes.
For the final adaptive kernel:

| Relative tolerance | Worst relative fusion error |
| --- | ---: |
| 1e-5 | 3.601e-6 |
| 1e-7 (UI fast) | 6.693e-8 |
| 1e-8 | 8.434e-9 |
| 1e-9 (UI balanced) | 1.025e-9 |
| 1e-10 | 1.212e-10 |
| 1e-11 (default) | 1.403e-11 |
| 1e-12 | 1.619e-12 |

At default tolerance the largest scaled channel error was 9.114e-12 and the
largest scaled conservation residual 9.097e-12. These are observed global errors
for this grid; the embedded local-error estimate itself is not a global
certificate. Output intervals 20 and 200 both meet the numerical gates; separate
tests also compare 20/200/1600 for the historical and moderate cases. Adaptive
endpoints are retained so high-dose uniform plotting does not hide the short
initial transient.

The historical case now gives 8.124991164185678e-7 fusion/site at 20 plot
intervals, versus independent 8.124991164071884e-7: **1.401e-11 relative error**,
using 121 accepted steps and no rejected steps. The worst default-tolerance
20/200 density difference over the full grid is 4.364e-12 relatively in fusion.
No default run exceeds 861 accepted steps, even at dose 1e7 and tau 1000.
Maximum observed kernel runtime in this VM study is 1.69 ms; this is a local
measurement, not a browser performance promise.

Final checks: `tests/loading-independent-v24.test.ts` and
`tests/material-transport-independent-v23.test.ts`: **11/11 pass**, including
independent fixed-step RK4 transient checks and the existing independent
energy-coordinate material transport checks. The v23 regression preserves the
historical failure description while replacing the obsolete requirement to
reproduce first-order splitting with accurate coupled results at every density.

The synchronized final source snapshot is identified by SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| production `src/target-loading.ts` | `ad06d98da87ea8623cbf81c4159f60c6f7b4575ecb2e2a90f8f46d6f1042115d` |
| independent `reference.py` | `f9e3a42ad17489eccd20f232e5de434c0c4e21b4c1851dc30bd3ef51231b20b7` |
| `reference-v24.json` | `7213a8a1c457794aa577bc4d09f0b1b2b545b57e0ac4dcc0a881d2ef89e02d37` |
| `study.ts` | `91d1f19b2c4be666f74a7ede4c92759af5ee07b7048010e8d46f5b742b803dac` |
| `production-study.json` | `268964ab80be76cbb1604ddcd4a6b337be590d5a2bbf4d21bcf92001c92d5a69` |
| independent v24 tests | `9b21dd3f6297f2846a6932d5877f9130910cc9aa89bab49c1c7de17c8ddf641c` |
| revised independent v23 tests | `3f978d028c41052119e50d6a360bd47f5cd72b0bc47b6ac5ba12ed53790665db` |

All execution used Apple safe-dev guest `safe-dev-422be6731cd60cc5` from bounded
host stage `/tmp/mass-spinner-coupled-independent-v24`. Sources were explicitly
copied then synchronized. Downloads occurred only in online dependency
installation; numerical studies and tests ran offline. No host interpreter,
browser, home mount or credentials were used for numerical execution.

Commands (absolute stage prefix omitted here only for readability):

```
safe-dev -C /tmp/mass-spinner-coupled-independent-v24 run -- .venv/bin/python reference.py
safe-dev -C /tmp/mass-spinner-coupled-independent-v24 run -- python3 check_reference.py
safe-dev -C /tmp/mass-spinner-coupled-independent-v24 run -- node --import tsx --test tests/loading-independent-v24.test.ts tests/material-transport-independent-v23.test.ts
safe-dev -C /tmp/mass-spinner-coupled-independent-v24 run -- node --import tsx scientific/loading-independent-v24/study.ts
```

Source/script hashes are in the saved JSON records. The full application build,
typecheck and live/browser status are tracked by the parent delivery report,
not asserted by this isolated physics audit.

## Remaining physical limits

Numerical convergence confirms that the implementation solves these equations;
it does not confirm their constitutive assumptions. eta remains an assumed
replacement probability. Stopping is frozen with composition, and there is no
resolved implantation profile, diffusion, isotope-dependent transport,
permeation, sputtering, D-D contribution, target renewal or feedback between
temperature and loading. Experimental LiT data and material transport coupling
remain required before interpreting the result as a target-lifetime prediction.
