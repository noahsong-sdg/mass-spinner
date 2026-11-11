# Transient, electrical and physical-surface refinement

10 November 2026. This continues the experimental
[v66 spatial backend](SPATIAL-CURRENT-COUPLING-V66.md), not a replacement of the
deployed simulator. Numerical refinement is separate from experimental accuracy.
The parent executed every project command inside the offline safe-dev VM.
Three reviewers independently examined history norms, electrical fields and wall
physics. No new dependency or downloaded reference was required.

## What the previous checks missed

The previous convergence analysis compared the final 1 ms state. That omitted
early heat-rate differences even when both trajectories conserved energy.
The v67 analyzer compares every shared accepted endpoint, including the first
interval, using the prospectively frozen [protocol](../scientific/transient-v67/PROTOCOL.md).
It retains finer-only times as explicitly untested; it does not interpolate them
and then call them accepted-step comparisons.

Species and internal energy are conservatively restricted in physical shell
volume. Rotation is restricted as angular momentum divided by inertia. Solid
energies and masses are restricted before inverting tungsten enthalpy. An old
point-interpolation percentage therefore cannot be compared directly with the
new conservative rotation norm.

The original n64 time32→64 history fails the 1% liner-response and interval-power
gates: 1.078% and 1.883%, respectively. All original histories and failed checks
are retained. Energy closure did not detect the early-time quadrature error
because each trajectory conserved its own backward-Euler exchange.

## Measured refinement results

Percentages below are finite-reference differences under the declared norms,
not bounds on error relative to the continuum or experimental measurements.

| Comparison | Interval heat-rate difference | Result |
| --- | ---: | --- |
| n32 uniform time64→128 | 1.148% | Fails 1% gate |
| n32 uniform time128→256 | 0.6782% | All seven primary gates pass |
| n32 quadratic time128→256 | 0.1511% | All seven primary gates pass |

The quadratic schedule changes only accepted timestep locations; every step
retains the conservative implicit equations. It improves startup sampling
without changing diffusivity, film conductance or material properties. It is
preferable here to tuning coefficients against a numerical error. The original
uniform histories remain available as controls.

Seven spatial/time pairs in the separate nine-case sweep pass all 49 primary
gates. Coupled axial4→8→16 changes are small in this low-conductivity case, but
that does **not** qualify electrical outputs on those coarse meshes.

## Axial electrical error is substantial

An actual 20-case FiPy comparison freezes four accepted rotation profiles and
uses axial4/8/16/32/64 cells at the same physical electrodes and conductivities.
Charge, work, radial projection and finest-grid comparisons pass all 652 gates.
The kernel and FiPy agree crosswise, while both expose the same coarse error:

- Four axial cells underestimate Joule heat by 30.31–31.12% relative to64.
- Outer-terminal current is underestimated by 26.24–28.43%.
- Projected torque L1 differences are 28.73–29.48%.
- For32→64, worst torque L1 difference is0.6322%, heat-profile difference0.9471%,
  combined-power difference0.3676% and normalized terminal difference0.2883%.

The cause is axial truncation of the electrode return-current structure, not
charge/work nonconservation. In plain terms, a coarse current map can conserve
everything while distributing too little current and heat. Quantitative
electrical outputs need the resolved mesh. Neither adding a correction factor
nor inferring accuracy from the almost unchanged total gas spin is justified.
These are frozen-state results; a fully evolving jointly refined electrical
history remains a separate gate.

## Surface temperature must refer to the same physical surface

The first solid cell centre moves when the mesh changes. Comparing those centres
alone is not a comparison of the inner surface at the common radius R. A separate
auditor reconstructs the accepted surface using

```
Ts = Tcell + (Qgaswall/dt) log(rcenter/R)/(2 pi L kappa_W(Tcell)).
```

It independently checks the gas half-cell, film and solid half-cell resistance
against the accepted exchange, and retains its signed heat flux. It requires
both the frozen relative surface-excursion gate and an absolute0.05 K gate.
The uniform-wall8→16/16→32/32→64 comparisons fail at35.07/15.01/5.249%;
64→128 passes at1.513%. The largest absolute difference is only0.0003872 K.
Using1200 K background temperature or a Kelvin denominator floor would mask
this error. The raw temperatures, error, excursion and roundoff are retained.

The finite-cell algebraic surface at initialization can differ from the
initialized uniform solid. This offset is discretization error, not a physical
temperature jump or resolved heating. At eight cells it represents78.1% of the
surface excursion, making the temporal surface pass alone insufficient.
Nested quadratic wall meshes concentrate cells at that boundary while retaining
the same1 mm thickness, tungsten law and film.

## Reproduced solver stall and root-cause fix

The first graded128-cell runs failed after49/128 and157/256 accepted steps.
An instrumented copy reran the exact failed state; the original evidence remains
in `scientific/centrifuge-v44/transient67/studies/stall-1`.

The line-search merit divided residuals by background energy, while acceptance
used row-specific heat-response and roundoff tolerances. A solid row already at
0.02052 times its tolerance dominated that unrelated merit. Its correction was
below one temperature ULP. Meanwhile the useful full Newton trial reduced the
worst unconverged row from25.954 to1.016 times tolerance, but slightly increased
the background-scaled merit and was rejected. Further damping eventually left
the floating-point state unchanged.

In plain terms, a finished wall equation blocked progress on an unfinished gas
equation. The fix makes merit `max(abs(residual)/tolerance)`, matching the
unchanged acceptance rule. It changes no equations, material laws, conservative
ledgers or tolerances. This is smaller and more directly supported than relaxing
tolerances, changing coefficients or rewriting enthalpy arithmetic. The exact
failed-state regression fails before the fix and passes afterwards; zero-time
and conservation/domain regressions also pass.

Fresh post-fix graded32/64/128-cell histories all complete:128 steps at each
wall level and256 steps at the finest wall,640 accepted steps in total. All21
primary refinement gates and all six separate surface gates pass. Surface
differences are0.2252% for32→64 wall cells,0.05705% for64→128, and0.1997% for
128→256 timesteps at128 wall cells. The finest initialized algebraic offset
falls to4.238e-7 K, or0.0384% of the surface excursion. These are separate
spatial/time comparisons, not a complete jointly refined current calculation.

The earliest shared61 ns surface response still differs by4.637% under time
refinement (1.041e-6 K on a2.246e-5 K excursion); the finest spatial comparison
has a2.885% maximum causal difference. Those local diagnostics remain outside
the primary global pass and prevent claiming uniform local-relative accuracy.

The independent auditor also needed a separate metadata correction. JavaScript
sequential reductions and Python `fsum` disagree by a few ULPs when subtracting
large stored energies. A1.46e-11 J difference narrowly failed the relative-only
comparison of the declared0.01445 J dynamic scale. The auditor now reports a
derived floating-reduction allowance for that metadata comparison only. Physical
energy/entropy gates and their original storage allowance are unchanged. Two
regressions cover cancellation and rejection of a fabricated large scale.

The graded mesh also exposed a distinct finite-precision limit in local solid
rows. Close cells have large conductance; one representable temperature step
can correspond to more energy than the stored-energy subtraction allowance.
At the retained failing row, a5.54e-13 J imbalance exceeded the storage-only
allowance4.35e-13 J. The independent audit now separately exports the actual
`dt*G*(ulp(Tleft)+ulp(Tright))` face interval, restricted conductivity sensitivity
and flux-operation rounding. Incident face intervals enter the local row check;
global energy/entropy thresholds and the existing storage allowance stay fixed.
An exact retained-row regression reproduces the old rejection, and injected
physical heat above the derived bound still fails. This componentwise
finite-precision consistency check does not prove a globally consistent nearby
nonlinear root or a formal bound on every library operation.

With that explicit resolution limit, all640 graded steps and the separate1280
spatial-sweep steps pass independent coupled audits; each audit rejects all nine
corrupted-data controls. Maximum global residual in the graded histories is
3.45e-12 J. Maximum local temperature-representation allowances range from
3.90e-12 to6.23e-11 J across meshes, and are retained rather than hidden inside
a relative energy tolerance. Every accepted step has positive total entropy
change under the stated ideal-gas/solid/coolant model.

## Remaining qualification boundaries

Primary global passes do not establish every local early response. The n32
uniform128→256 pair differs by0.01535 K on a local0.05104 K excursion (30.08%).
Quadratic128→256 improves this to0.005946 K on0.05638 K (10.55%), still material
under a local-relative criterion. Some solid excursions are comparable to
roundoff; their percentages are inconclusive, not measured large physical errors
and not automatic passes.

A jointly resolved evolving-current, gas-radial, liner and time campaign remains
necessary. Fine-only times, late operation, ion/electron/neutral closure,
accommodation and chemistry are not qualified by this1 ms conditional experiment.
The prior experimental profile and pressure discrepancies remain unresolved.
No first-order device accuracy or calibrated Marathon prediction is claimed.
No deployment or fresh browser/GPU/mobile verification is part of this stage.

Independent reviews: [history physics](reviews/v67-transient-physics.md),
[electrical refinement](reviews/v67-current-refinement.md),
[surface/thermal physics](reviews/v67-thermal-refinement.md).

## Executed checks and provenance

The final application gate, `transient67-final-checks`, used727 input entries
with snapshot SHA256
`b6dce3c7a7c46d56ad83c655e3b56b5232ff2cc28d5af868d36c0999b3da8dea`.
The guest source was verified before and after execution. Two historical
stage-only runner entries are explicitly listed in the receipt; they are not
present in the host checkout. No host scientific execution is claimed.

- `python -m unittest discover -s scientific/transient-v67 -p 'test_*.py'`:
 26 tests pass at this gate.
- `npm test`:1227 tests pass, including the actual failed-state regression.
- `npm run typecheck`:passes.
- `npm run build`:passes, retaining the existing large-chunk warning.
- `npm run check:site` and `npm run check:assets`:pass. These structural checks
 do not execute the deployed browser or establish GPU appearance.

The subsequent final auditor regression run, `transient67-scientific-final`,
passes28 tests, including both new exact solid-row/roundoff controls, on snapshot
`21ebe6218510aca9f80eb80232fdd287e44e3dcb3a6a507fb382ea250b94bb65`.
The640-step audit uses this snapshot too. All562 application/build inputs are
byte-identical across these final snapshots and the current host. The earlier
26-test log is retained as such; it is not relabeled28.

Raw outputs and manifests are retained under
`scientific/centrifuge-v44/transient67/studies/`; host command logs, exact input
manifests and receipts are under `scientific/fixes-v43/transient67-*`.
The `review-1`, `stall-1` and `graded-1` exports preserve successive results
without overwriting failures. The diagnostic source copies were removed from
the guest application directory only after their hashes matched the retained
and exported originals; they did not enter the final build.
The separate `qualification-evidence` export seals the actual28-test log,
final audit receipts, both exact tested-input manifests, current changed source
and regression fixture. Its own manifest binds every copied evidence file.
