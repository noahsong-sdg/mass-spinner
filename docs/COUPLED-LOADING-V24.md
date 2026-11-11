# Simultaneous target loading — v24

## Failure and execution path

The beam-target result supplies fixed hydrogen-site capacity, initial tritium,
one effective nuclear optical depth, area, incident rate and exposure to
`simulateTargetLoading`. Its history feeds loading plots and event accounting.
The source and constant-heat observers retain their separate initial-condition
contract.

V23 applied an exact fusion-only update followed by an exact replacement-only
update at each uniform output interval. Both substeps preserved atoms and
positivity, but they did not solve simultaneous dynamics. Fusion saw the old
tritium population before replacement removed tritium during the same interval.
In simple terms, the solver let too many projectiles fuse before admitting that
their neighbours had already displaced the fuel.

The independently reproduced stress case has initial T fraction 0.65, unit
optical depth 1e-6, replacement probability 0.8 and incident dose 1000/site.
The simultaneous reference is 8.124991164071884e-7 fused nuclei/site. The old
6400-interval split remained about 6.38% high. Atom accounting alone could not
detect that bias.

## Model being solved

Let u be incident D/site, f the T fraction, d the D fraction, v the vacancy
fraction, tau the effective optical depth at full loading, and eta the assumed
non-fusing replacement probability. With p(f) = 1 - exp(-tau f):

```text
df/du = -p - eta f (1-p)
dd/du = eta (1-p) (1-d)
dv/du = p - eta (1-p) v
dF/du = p
dL_T/du = eta (1-p) f
dA/du = 1-p
dL_D/du = eta (1-p) d
```

F counts fused T; A counts non-fusing arrivals; L_T and L_D count released
target isotopes, all per initial site. Retained and unretained arrivals are
eta A and (1-eta) A. This gives four independent checks:

```text
f+d+v = 1
f+F+L_T = f_initial
eta A-L_D = d-d_initial
F+A = u
```

The initial target has T and D filling every site; vacancies are created by
fusion. These are the existing well-mixed reference equations, not new
empirical claims about LiT.

## Numerical fix

Integrate nonnegative cumulative hazards H and Q simultaneously:

```text
dH/du = p/f = tau phi(tau f), phi(x) = (1-exp(-x))/x
dQ/du = eta exp(-tau f)
f = f_initial exp(-H-Q)
d = d_initial + f_initial (1-exp(-Q))
v = f_initial exp(-Q) (1-exp(-H))
```

The continuous limit phi(0)=1 is evaluated with expm1. This removes the
stiff exhaustion of a tiny T fraction while positive populations and site
closure follow algebraically from nonnegative hazards. F, L_T, A and L_D are
integrated independently; they are not reconstructed by subtracting nearly
equal inventory numbers. No population clipping or ledger projection occurs.

The adaptive integrator is the established Dormand–Prince 5(4) embedded pair.
Its coefficients were checked against the
[pinned SciPy RK45 implementation](https://raw.githubusercontent.com/scipy/scipy/v1.16.2/scipy/integrate/_ivp/rk.py).
This small six-coordinate browser calculation uses the published tableau
directly; it does not bundle the Python/SciPy runtime. Exact fusion-only and
zero-nuclear-hazard limits retain analytic evaluations.

The opaque fusion-only branch also evaluates the smaller event channel
directly. Subtracting fusion from incident dose had produced a one-ULP
negative transmitted count in an opaque small-dose control. Its exact
transmission integral uses log1p/expm1; subtracting that small transmission
from incident dose gives the large fusion count without cancellation.
This changes evaluation conditioning, not the equations or their bounds.

This choice avoids the old splitting error and works through exhaustion
without a general implicit nonlinear solve. A larger fixed grid would retain
first-order bias and become expensive at high dose. An implicit solver would
be appropriate for a future diffusion/thermal/reaction system, but adds
unnecessary machinery to these autonomous well-mixed equations.

Every event channel has its own scale. In particular, fusion is scaled by its
initial target-loss branch share, rather than allowing a unit-population
absolute tolerance to hide a very small reaction signal. Arrival and
outgoing-D channels use min(total dose, 1) as their base scale. The independent
audit caught an earlier version that scaled these channels by total dose:
at dose 1e7, that allowed the initial loading transient to have too much
absolute error. Per-site scaling fixes that failure without relaxing the
conservation gate.

Defaults are relative tolerance 1e-11 and scaled absolute tolerance 1e-13.
Accepted-step embedded error ratios must be at most one. Negative/nonfinite
stages or nonmonotone cumulative states are rejected. A 100000-attempt budget
and floating-point step-resolution check fail explicitly. Raw conservation
residuals must remain below 100 times the sum of the requested tolerances;
site/T residuals are scaled by one site, D/projectile residuals by max(1,u).
This numerical budget is not an empirical error bar or a rigorous global
ODE-error certificate.

## Output and compatibility

The source, history, plot curves, and isotope/event keys remain available.
`intervals` now requests plot samples rather than selecting physical steps.
All adaptive endpoints are also retained so a long exposure does not hide
the short initial transient. History length can exceed intervals+1.
Clamping adaptive steps at requested samples can change rounding and the
step sequence; results agree to tolerance rather than bitwise.

The obsolete fixed-step `resolution` warning is replaced with `solver`:
method, accepted/rejected steps, maximum accepted error ratio, requested
tolerances and maximum raw scaled conservation residual. Zero-beam samples
use time for plotting but zero incident dose for the projectile ledger.

## Checks observed

The bounded source copy was executed in Apple safe-dev guest
`safe-dev-16eab765a948869a`, stage
`/tmp/mass-spinner-coupled-loading-v24`, with no host mounts.
After source edits the guest was explicitly replaced and dependencies
reinstalled. Network was enabled only for npm ci.

```text
safe-dev -C /tmp/mass-spinner-coupled-loading-v24 run -- node --import tsx --test tests/target-loading.test.ts
11 passed, 0 failed

safe-dev -C /tmp/mass-spinner-coupled-loading-v24 run -- ./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/target-loading.ts
passed
```

The tests cover analytic limits, atom/projectile ledgers, nonnegative
populations, tiny outgoing-D and opaque transmitted counts, beam-off/exposure-zero, opaque targets,
the former biased case at 10/400/1600 requested plot intervals, dose 1e7
with bounded work, and invalid domains/tolerances.

Additional dose-1e7 controls at 40 plot intervals:

| tau | eta | Accepted / rejected | Max scaled raw residual |
| --- | --- | --- | --- |
| 1 | 0.2 | 176 / 0 | 2.287e-12 |
| 1000 | 0.2 | 702 / 376 | 8.535e-13 |
| 1000 | 1 | 700 / 376 | 4.166e-12 |

Tested source SHA256:
`ad06d98da87ea8623cbf81c4159f60c6f7b4575ecb2e2a90f8f46d6f1042115d`.
Test SHA256:
`0c6ac28955152f73dc0ec3811418c987a13b9ffdd77f87b628b360aecc00d4a5`.
The exported snapshot at
`/tmp/mass-spinner-coupled-loading-v24-final-verified` has identical hashes.
Independent SciPy studies and their full multi-channel comparison are
reported separately by the independent auditor; they are not substituted
by these implementation checks. Full-application build/typecheck belongs
to the integration gate.

## Remaining physical boundary

Better time integration validates the numerical solution of this conditional
reference. The fixed stopping matrix, well-mixed sites and assumed replacement
probability remain. This does not solve implantation profiles, measured LiT
retention, diffusion/permeation, sputtering, target renewal, D–D reactions,
composition-dependent stopping or thermal feedback. It cannot establish a
real Marathon target lifetime or calibrated device yield.
