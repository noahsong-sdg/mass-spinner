# v69 fixed-time local thermal diagnosis

Frozen before scoring new studies. Retain all v68 results and its local failures.
No equations, properties, solver tolerances or live defaults change. Parent owns
all scientific execution in offline safe-dev. Independent reviewers edit their
owned files and inspect exported evidence, with no project execution on the host.

The v68 complete fine anchor supplies a hash-bound thin initial seed. Reuse all
physical inputs and its64-radial/64-axial electrical mesh. Compare actual accepted
BE states, never a temperature-only correction or extrapolated state. Every
accepted substep retains its own source, momentum, heat and numerical-loss ledger.

First isolate thermal startup with the real mixture thermal kernel: uniform gas
1100K, wall1200K, number1e19,64 equal-volume gas cells, fixed uniform species,
fixed neutral-Li conductivity at1100K, no external heating/cooling or transport.
All other geometry/film inputs stay at v68. Wall properties remain nonlinear.
Benchmark at fixed15.2587890625ns and61.03515625ns;1/4/16/64 equal accepted steps;
wall32/64/128 cells. Compare the retained quadratic grid with a preselected nested
exponential grid r_i=R+d*expm1(8i/N)/expm1(8). This uses existing explicit-grid
support and keeps the128-cell limit. Do not tune the stretch after seeing scores.

Independent SciPy symmetric/generalized-eigen evolution supplies the frozen-W
coefficient, fixed-graph time reference. Check its operator/eigen defects, exact
closed heat zero mode and selected matrix-exponential agreement. Quantify actual
nonlinear W-property changes, so the reference is explicitly a limiting benchmark,
not an exact solution of the nonlinear target. Report raw K and physical increment
norms without positive signal floors. Intended exponential128-cell/64-step
external increment error<=1%;16→64 time change<=1%;64→128 space change<=2%.
For the external gas check use profile infinity error divided by the maximum
reference gas heating increment. Surface uses its own wall-temperature increment.
Retain all per-cell ratios and uncertainty masks as diagnostics; this does not
qualify near-zero diffusion tails pointwise.
Reference uncertainty (eigen/exponential disagreement plus explicit temperature
roundoff) must consume at most10% of the1% external error budget: <=0.001 times
the measured reference increment. It is never subtracted from the observed error.
Keep quadratic/coarse failures in the report. No near-zero signal gets a claimed
relative pass. Audit all accepted heat/entropy transitions with explicit storage
and temperature-resolution allowances kept separate from physical scales.

Second target the resolved interior gas cooling/heating reversal at fixed
38.14697265625us. Prefixes of quadratic nominal1ms schedules N512/1024/2048/4096
have100/200/400/800 accepted steps to that same physical endpoint. Retain the
quadratic128-cell wall to isolate time. Use frozen v67 physical/setup/time
validators, global gates, local causal diagnostics, v66 coupled ledgers and v68
electrical histories. Require<=1% finest local gas change at the fixed endpoint
over each cell's own fine causal excursion where resolved, including the known
cell1 reversal; preserve unresolved/roundoff cases separately.
The gas-prefix command fails if the endpoint gate fails or cell1 is unresolved;
an empty resolved set cannot pass. Coarser failed comparisons remain evidence.
All-shared-time local diagnostics remain reported and do not get a uniform-relative claim. Shared
prefix times must match exactly; fine-only times receive identities only.

Confirm the exponential wall with full coupled64→128-cell startup at fixed
15.258789ns using64 actual BE substeps; require<=2% physical-surface change.
Then run the full1ms exponential64/128-wall pair with256 quadratic steps and
unchanged global/surface/electrical gates. This confirms the grid choice over
the old horizon, but does not qualify its earliest moving-knot time error.
No experimental, long-time or arbitrary-slider qualification follows.

Explicit specs bind each case and duration. Stream accepted NDJSON; preserve
partial/failed runs and original packet hashes. Never overwrite old outcomes,
relax an acceptance limit, or call completion a convergence pass. A short-prefix
pass alone does not promote a new full-horizon integration method or live backend.
