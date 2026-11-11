# Remaining transport qualification work

8 November 2026. Independent design review, before confirmation results. No
production edits or simulation runs. Existing sealed v33 evidence is unchanged.

## Why another refinement campaign cannot close the contract

The actual path is `executeSeed → simulateDoublewell → sampled histories and
exit ledgers → observeDoublewell → paired whole-run seed intervals`. In
`src/convergence.ts:156`, plan validation rejects alignment/orientation; lines
241–242 require their coverage anyway. `physicalEffect` validates otherwise
identical collision-on/off configurations, then reports paired differences at
lines 243–249. Line 250 always marks effect versus continuum error UNKNOWN.

These requirements have no executors/error estimator today. More particles can
improve local sampling and interval precision, but cannot supply missing
experiments or bound a bias common to every executed resolution. In simple
terms, close answers can all share the same error.

The current five-level matrix has two resolutions in each of N, dt, radial mesh
and axial mesh, with one common reference. It can test its four advertised
paired equivalences and sampled coverage/raw angular budgets. It cannot certify:

- Mesh-face sensitivity or azimuthal covariance: neither is executed.
- A collision effect: no matched collision-off level is in this plan.
- An asymptotic order or contraction ratio: each direction has only one increment.
- Joint finest-resolution bias or mixed errors: the jointly fine N/dt/r/z corner
  and its next joint refinement are absent.
- Whole distributions, unobserved rare tails, unsampled local regime excursions,
  or full-3V/reaction/experimental fidelity. These are separate requirements.

The existing intervals are approximate pointwise 95% Student-t intervals of
whole-run means, not simultaneous 95% coverage of all reported observables.
Undefined populations and no-resolved-spread differences remain UNKNOWN.

## Split 1: implement the two sensitivities, preserving old behavior

Add only three explicit optional settings: an initial azimuthal rotation angle
and dimensionless radial/axial mesh phase offsets. Omitted values mean the exact
legacy zero settings; reject explicit null/nonfinite values. They belong in
serialized configuration, executed-source identity and study validation. Avoid
an arbitrary initial-particle or face-array API for this narrow task.

For orientation, draw the entire initial ensemble exactly as now, then apply the
same rigid z-axis rotation to every position's x/y and every velocity's vx/vy.
Keep z/vz, particle order, species, seed and random draw counts unchanged. The
field, finite cylinder and source are axisymmetric, so this is a symmetry of the
same physical problem. Rotating positions alone changes the experiment. A tilt
of the machine is not supported: it would require rotating B, geometry and exit
surfaces as well. Preserve the zero-angle execution path exactly.

For alignment, extend the existing fixed-grid face generator in
`src/axisymmetric-collisions.ts:25–48`. Shift interior regular-lattice faces by a
declared fraction of the base spacing, keeping 0/a and 0/L endpoints and the
declared pulse faces r=sourceRadius and z=L*pulseLengthFraction fixed. Use full
physical volumes `π(r_hi²-r_lo²)(z_hi-z_lo)` as now. Merge only mathematically
coincident faces at the existing scale-aware roundoff rule; retain genuine thin
cells and their sampling consequences. Source support, physical inventory and
representative weight must not change. Save actual executed faces, since a phase
shift can change boundary-cell counts/widths. Do not call a width-label change or
a source-support change an alignment experiment.

Regressions should verify legacy-default exact outputs; invalid/null/stale data;
rigid transform/inverse transform and draw counts; fixed endpoints/source faces;
monotone positive cells; exact cylinder-volume/inventory sum; internal-face and
domain-endpoint bin assignment; and raw diagnostics using the executed grid.
This is the smallest coherent extension because it reuses the actual initializer
and fixed-volume partition. A new pusher, collision law or adaptive partition
would confound the sensitivity experiment.

## Split 2: prospective sensitivity studies and explicit contract review

Enable `alignment` and `orientation` comparison kinds only when each changes
exactly its executed setting; unchanged or confounded settings must reject.
Freeze radial-only, axial-only and at least two nonzero azimuthal rotations,
whole-run seeds, full horizon and runtime caps before acceptance runs. Retain
all existing numeric budgets, failed jobs and missing batches. A later joint
phase case is a cross-check, not a replacement for the separated comparisons.

An important limitation: a ring solver can give pathwise-identical rotated
observables. Under today's no-spread rule, those differences remain UNKNOWN.
Implementing an angle must not silently turn zero differences into PASS. A
separate deterministic covariance/metamorphic check can report transformed state
errors with a justified arithmetic bound, but promoting that into the required
orientation gate needs a separately reviewed contract extension. Such a check
certifies a symmetry of the discrete algorithm, not its continuum accuracy.
Nonzero-spread differences continue through the existing paired equivalence test.
Historical missing settings identify legacy defaults, never executed sensitivity
coverage; archived summaries/verdicts must remain reproducible unchanged.

## Split 3: an estimator first, a continuum certificate only with assumptions

Report a matched on/off collision effect at the chosen finest configuration.
For observable j, let E_j be its expected collisional-minus-control value and
L_j=max(0, |estimated E_j| - interval half-width). This is an effect lower
confidence limit under the interval assumptions, not an error estimate.

A defensible *conditional* bias estimator could use a joint ladder. Let q_l be
the expected observable on rung l and D_l=q_l-q_(l-1). If an independently
justified saturation condition holds for every future rung,
`|D_(l+k)| ≤ ρ^k |D_l|` with declared 0<ρ<1, then the telescoping tail gives
`|q_infinity-q_l| ≤ ρ/(1-ρ) |D_l|`. Replacing |D_l| with a valid upper confidence
limit gives a conditional probabilistic bound. Apply this to on/off separately
and add their bounds, or derive a contraction for the effect increments directly;
cancellation of two unknown biases cannot be assumed. Include any initialization,
histogram/quadrature, roundoff and model-consistency errors not covered by that
ladder. Declare which continuum limit the method actually targets.

This formula is a derivation under saturation, not evidence saturation holds.
Three or more resolutions can falsify an assumed ratio/order; observing favorable
ratios cannot prove the bound for all finer resolutions. Second-order splitting
alone does not justify ρ=1/4 for stochastic finite-cell collisions, source-fitted
irregular meshes, absorbing-event quantiles or particle-count bias. A predicted
dr² cold-rotation torque is not a bound on every transport observable. Nor does
sampling standard error bound finite-N bias or systematic spatial bias.

Prefer a joint ladder that decreases dt/dr/dz while increasing N enough to
maintain local resolution, plus independent one-direction and cross-corner
checks to expose interactions. A summed one-dimensional estimate is defensible
only with an explicit bound on mixed terms. Add matched collision-off studies,
closed equilibrium and independent homogeneous/reference tests as estimator
falsification cases; passing them does not itself prove an inhomogeneous tail
bound. If no valid stability/consistency theorem or verified reference enclosure
supports saturation/remainder assumptions, label the result an empirical
refinement estimate and leave the continuum gate UNKNOWN.

Only after independent validation should a separate change wire a versioned
bound artifact into the effect gate. Freeze the allowed error/effect ratio and
its observable scope prospectively, require L_j>0 and an error upper bound below
that declared margin plus all existing absolute budgets, and budget confidence
across the effect/bias bounds if claiming a joint confidence level. Missing,
unsupported or stale estimators remain UNKNOWN. Do not retrofit a ratio to the
five-level results or migrate historical records into qualification.

## Evidence checked

Read-only source trace and algebraic design; no project code executed for this
note. Sources: convergence.ts SHA d7df4f83246b7d5057417385bb7a6d8c4a9d579d40fc056acf8942d564b99bd1;
doublewell-dynamics.ts SHA f88bca34dfb4e9304d5167e6c516292a1d7f5149a506ad28db6bce59c99a5530;
axisymmetric-collisions.ts SHA 2e2c1da25716aa2e7486b9962986878d23c8dc4e9b1f69949a43469babc820b0;
doublewell-orbits.ts SHA 23df1715b5a3dbe2f17b87a2bb32289dad758c5cb150ffed1225a961dfaeafb0.
Frozen confirmation-plan SHA a384961e2acab2c1ba09a14da879884219dde2d8ee8e62233c1099f02a4aec18.
Prior 22-file gate leaf and separate 18-file candidate leaf seals remain
b4efc88ecc0bf44509db43c13e43f6d15cd11df707da31687d259ab1a556940f and
e6bbd6423c11bd69a5cad1a85d67ad2849b6a0b6e92fe0ec461f06043c85d725.
