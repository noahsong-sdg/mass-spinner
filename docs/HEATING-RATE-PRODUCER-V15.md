# Initial heating-rate refinement producer, v15

This is an offline **initial-state reference**, not a newly qualified full-time
collision engine. Frozen v14, the Coulomb coefficient and the 2% physical target
are unchanged. Completed results and independent review are recorded below.

## Problem, cause, fix and choice

The v14 weak-temperature moment tests passed while its light-ion heating slopes
missed 27982.16330006834 eV/s. The traced route is initial GH tensor nodes →
Gaussian KDE → finite Cartesian entropy quadrature → entropy coordinate gradient
→ Coulomb pair mobility → initial temperature derivative. Gaussian smoothing
changes the operator, finite marker spacing changes its projected input, and a
fixed entropy grid may not resolve narrow peaks. Reducing time step alone cannot
correct those spatial/operator errors.

In plain terms, the particles can carry the correct average temperature while
still representing the wrong detailed distribution; making their Gaussian blobs
narrower without adding particles exposes that roughness. A more precise clock
does not repair that picture.

The smallest independent reference exploits the **initial** distribution's exact
Cartesian product. For each species let `f(x)=sum_i w_i psi_eps(x-c_i)`; then
`F(v)=f(vx)f(vy)f(vz)`. Integration by parts gives the entropy coordinate gradient
divided by its 3D particle weight:

`h_i = integral psi_eps(x-c_i) d(log f(x))/dx dx`.

It is a one-dimensional score expectation for each coordinate. The implementation
uses log-sum-exp density evaluation and declared full-space Gaussian-tail bounds.
It does not assume the same identity remains available after general dynamics.

For pair work, the identities
`1/r=2/sqrt(pi) integral_0^infty exp(-s^2 r^2) ds` and
`1/r^3=4/sqrt(pi) integral_0^infty s^2 exp(-s^2 r^2) ds`
separate the Cartesian factors. Define raw 1D weighted moments of
`z=A-B`, `b=h_a(A)/m_a-h_b(B)/m_b`, with `A` centered on species a's actual
weighted mean. Their five moments are `f0`, `fAb`, `fAz`, `fzb`, `fAz2b`, each
weighted by `exp(-s^2 z^2)`. The full3V cross work is

`6/sqrt(pi) integral [fAb f0^2 - 2s^2(fAz2b f0^2+2fAz fzb f0)] ds`.

The exact `Q(0)=0` convention removes full3D coincident pairs. Splitting 1D
coincidences into constants `c0,cAb` and the remainder `u0,uAb` evaluates the
first term stably as `uAb*f0^2+cAb*(2c0*u0+u0^2)`. No nonzero-distance cutoff
is introduced. The light slope is `-10*kappa*work/(3*actualNumber_a)` eV/s.

This reduction permits a controlled initial study with large implicit tensors
without materializing them. It was chosen over brute huge 3V pair loops because
the latter grow as `n^6`; it was chosen over an evolved tensor closure because
general Coulomb evolution does not preserve Cartesian independence. Literal
small 3V pair loops and the actual frozen full3V entropy routine remain controls.

## Prospective contract and initialization

The exact plan is [plan.json](../scientific/structure-rate-v15/plan.json), frozen
at 2026-11-07T16:47:36Z, SHA256
`48691aab98e13e973d0a225dae1813e32598fb8cfd3266b43881c22a74a009f5`.
The independent reviewer accepted its complete 30-node/width matrix and six tail
controls before main outcomes. A pre-main amendment added the target Gaussian's
omitted tail to the initial L1 bound; tested producer SHA256 is
`8c888537b2672191b7039956dd62203eeb9309d42460cbc8032558614afe31d5`.

The matrix is n=32/64/128/256/512 per axis and
alpha=.25/.125/.0625/.025/.0125/.00625, positive Gaussian variance `alpha/m`.
Each case separately compares score order2048/4096 and Laplace order512/1024;
the latter uses log(s) in [-30,30]. Fine n512 controls compare bounds24/30.
The diagnostic rate budget for each integration is 0.0002 times the physical
target, 100 times tighter than the original 2% physical gate. L1 integration
changes must be at most1e-6. Unresolved calculations remain UNKNOWN.

The new initialization is a uniform positive raw trapezoid Gaussian rule on
[-8 marker sigma,+8 marker sigma], with half endpoint weights. No weights,
temperature or collision coefficients are fitted or renormalized. The species
retain different thermal velocity scales. Number is `(sum weights)^3`, and all
thermal rates divide by that actual number. The 3D product shape upper bound is
`(S^2+S+1)*L1_1D`, including represented-PDF and nominal-target Gaussian tails;
quadrature sensitivity is separately reported. These raw initial arrays, complete
score/Laplace rules and actual moments are exported for independent calculation.

At n512 the encoded initial tensor has **134,217,728 markers per species**.
This is not a practical evolved run of that many particles. The current general
full3V engine still has direct pair cost, general entropy quadrature cost and
unresolved finite-time physical entropy/distribution/horizon gates.

## Pilot and regression evidence

All execution used the dedicated Apple safe-dev copied guest for
`scientific/structure-rate-v15`, offline except the SHA-pinned official Julia
1.13.3 download. No host simulation code ran. Raw pilot cost was1.990s with
401,113,088 peak measured process-group RSS bytes, below120s/1GiB watchdog caps.
Each main record receives those caps independently. Valuable exports were saved
and actual host hashes verified before replacement syncs.

The four old GH states' full-space score rates were16900.6421275,
16587.0595579,24480.2264670,17318.1513484 eV/s. These preserve their physical
FAIL outcome and demonstrate that entropy quadrature alone does not explain the
large failures. The separate pilot lattice64 alpha.00625 rate32124.6897588 is
unqualified until the particle/integration comparisons below.

The first stringent coincidence test caught a2.56e-10 absolute work error from
truncating log(s) at-22. Extending the lower limit and refining the rule resolves
the same unchanged tolerance. The actual frozen n2 full3V entropy at q96 differed
from the full-space reference by4.22e-7, failing the1e-7 entropy tolerance;
q128 passes. Its gradient already met1e-7 at q96. Both attempts are retained.
Final Julia regressions pass35/35: small n2/3/4/6 literal3V pair identities,
coincident-axis/fully coincident controls, positivity/raw-number/moment checks,
and entropy/gradient comparison against copied unchanged frozen v14 code.

## Main results and independent review

All96 frozen records completed with watchdog exit0. Maximum per-record wall time
was5.419s and process-group peak RSS490,713,088 bytes; summed measured invocation
times were262.570s. The final raw set and derived outputs were exported to
`/tmp/mass-spinner-rate-v15-final-01`; all293 final result/log byte hashes were
verified on the actual host before copying. Separate pre-sync raw export sealing
verified292 identities. The frozen v14 core and copied control retain SHA256
`e13928023f6b3e376f92ae74502994307b6e0f19de5f15475cfc23771a18e005`.
Those subset maps are followed by exact whole-archive seals: the original raw
main export has316 files, manifest SHA256
`2e0b8c1412a79bd16f40bf780de54c2d4366acbb106050867d516df3d4b92786`.
The complete final archive `/tmp/mass-spinner-rate-v15-final-02` has331 files,
including all sources, copied controls, provenance, cases, analyzer, tests,
tables and figure. Its manifest SHA256 is
`1109e20f55c53d3ebf29f56b1d3dcf480d15349376b5b5e491996c4b6e7a35b5`;
only the manifest itself is excluded. Exact regular-file membership, every
actual host hash and absence of symlinks were checked. Fresh final-archive
Julia35/35 and ingestion7/7 results are saved in its watchdog logs.

All30 physical rate calculations resolve the independently refined integrations.
The largest score-order change is0.000913eV/s and largest Laplace-order change
4.39e-8eV/s, against the declared5.59643eV/s budget. The fine bound24/30 changes
are1.73e-6 through4.54e-6eV/s, also below that budget; analytic omitted tails are
reported per record. Nine coarse initial L1 calculations miss their separate
1e-6 quadrature-sensitivity gate. Their shape convergence is UNKNOWN; a definite
heating-rate FAIL remains FAIL. Rate and shape statuses are exported separately.

| n per axis | alpha | light rate eV/s | physical error | heavy PDF L1 product upper |
|---:|---:|---:|---:|---:|
|64|.00625|32124.689759|+14.804%|1.47, quadrature unresolved|
|128|.00625|27788.429897|-.692%|.0784, quadrature unresolved|
|256|.0125|27499.175925|-1.726%|1.06e-13|
|256|.00625|27742.274821|-.857%|5.98e-7|
|512|.025|27003.104609|-3.499%|2.19e-14|
|512|.0125|27499.185103|-1.726%|4.94e-14|
|512|.00625|27742.275594|-.857%|2.47e-14|

The fine .0125/.00625 cases **pass the original initial-rate2% gate** with resolved
shape quadrature and very small initial PDF bounds. At fixed .00625, refining
n256→512 changes the rate by0.000773eV/s. At fixed n64, shrinking width from.025
to.00625 worsens the error from-3.303% to+14.804%; narrowing an unresolved
distribution is an explicit negative control. The n128 .00625 close rate alone
would conceal substantial shape error, which is why its separate diagnostics
matter. At n512, .025 stillFAILs by3.499% despite a tiny shape bound: a smooth
initial distribution does not remove finite-width operator bias. The fixed-width
fine rates approach the independent regularized-continuum predictions.

The complete [table](../scientific/structure-rate-v15/results/table.md),
[machine-readable summary](../scientific/structure-rate-v15/results/summary.json)
and [standalone figure](../scientific/structure-rate-v15/results/convergence.svg)
preserve all30 outcomes. Filled figure markers indicate resolved rate integration;
all raw logical particle counts and separate shape qualifications are retained.
Summary SHA256 is
`6a27277018bb4347ff7335a181fef6fb673148f248957094d91bbe378268fd15`.

The ingestion boundary additionally passes7 regressions: complete membership,
stale source, duplicate, missing, truncated, wrong species and nonfinite records.
Commands executed offline in safe-dev were `python3 bounded.py test-final 120 1024
/work/home/rate-runtime-v15/julia-1.13.3/bin/julia test_tensor.jl`,
`python3 campaign.py`, `python3 -m unittest test_analyze.py`, and
`python3 analyze.py`. There is no package build/typecheck for this Julia/stdlib
offline reference; the parent owns the application gate. The primary producer
has188 non-test lines; the complete new executable implementation excluding copied
frozen controls/evidence/tests remains under700 lines.

Independent numerical pilot review, in a separate safe-dev guest without
importing the producer, recomputed the four GH rates and lattice64 pilot within
7.4e-7eV/s and a literal small-tensor3V pair work within1.6e-12. Its separate
adaptive heavy-species1D L1 for lattice64 alpha.00625 was.490000885, confirming
the large-shape-error negative control. The final independent review checks all96
raw records and recomputes nine main states, including all six scalar-rate PASSes,
with agreement within1.14e-7eV/s. It independently resolves selected shape integrals
that this producer conservatively left UNKNOWN. The review's12 tests and558-file
sealed export pass; the parent verified every exported and canonical hash.
See [the independent audit](HEATING-RATE-AUDIT-V15.md). The
independent pilot physical-GMM rate for lattice64 alpha.00625 was
27982.1633000802eV/s while its regularized marker rate was32124.6897588: correct
physical input heating is insufficient to qualify the discretized operator.
No conclusion about the full-time engine is implied by this initial benchmark.
