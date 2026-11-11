# Independent transport and loading math audit — v23

This report traces `fusion-reactor.ts`, `target-exposure.ts` and their existing
tests, and derives candidate equations independently. No application source is
owned by this reviewer. At this initial stage no project code, installer or
simulation was executed; all later execution must use an explicitly copied
Apple safe-dev VM. The safe-dev README was read. Browser policy is preserved.

## Root cause and smallest defensible split

The source currently partitions an imposed fractional loss uniformly over an
independent tritium column. Its number/energy ledger is internally conservative,
but the energy trajectory has no material stopping law and exposure has no
target state. Simply, removing target tritium does not yet affect the yield,
and changing target loading does not consistently define what material the
deuterons pass through.

Use a **fixed material or hydrogen-site areal coordinate**, independently of
the evolving T fraction. Removing T cannot silently shorten the physical
target or remove its lithium atoms. Keep the current constant-source model
unchanged as a named baseline. Add a distinct conditional transport/loading
reference only when its inputs and accounting are explicit. A large unvalidated
multiphysics replacement would hide the missing material coefficients.

## Coordinate, stopping table and units

Let ξ be material atoms per m² (or separately declared formula units per m²),
with a frozen host coordinate. Let η_T(ξ,t) be tritium nuclei per chosen host
unit. Then `dτ = σ_DT(E_cm) η_T dξ`. For stoichiometric LiT, a **formula-unit**
coordinate has one Li and one hydrogen-isotope site per unit, whereas a
**total-atom** coordinate has half as many hydrogen sites as atoms. These are
not interchangeable factors of two. Export the coordinate convention.

For stopping cross section ε(E), `dE/dξ = −ε(E)`. Total electronic+nuclear
stopping belongs in the energy trajectory unless a deliberately partial
electronic-only model is labeled. Linear stopping has units energy/length;
mass stopping has energy×area/mass; cross-section stopping has energy×area per
atom. Density is required to convert a length-based table to an areal one.

In particular `1 eV/(10^15 atoms/cm²) = 10^−22 keV m²/atom`.
An atom-fraction Bragg sum has denominator total target atoms. A sum of one Li
and one T term has denominator formula units. Mass fractions must not be used
where atomic fractions are required. The IAEA's stopping reference distinguishes
linear, mass and areal stopping conventions: [IAEA TRS485](https://www-pub.iaea.org/MTCD/Publications/PDF/TRS485_Web.pdf).

Table boundary contract: strictly increasing positive energy knots, positive
finite stopping values, explicit species/material/isotope, laboratory energy
and units, electronic/nuclear/total convention, provenance and permitted domain.
No silent extrapolation, endpoint clamp, zero floor or proton relabeling. A
declared log-log interpolation is positive, but it is still an approximation;
show errors against direct source-model samples. Piecewise power-law stopping
can be range-integrated analytically; bisection of the monotone range integral
gives energy without numerical overstep. Constant ε and ε∝E supply exact tests.

## Beam attenuation and energy ledger

For a cell with entering surviving fraction s, energy E_l, exiting energy E_r,
and frozen within-cell optical depth τ, let `a = −expm1(−τ)` and reaction
probability `r = s a`. The exiting survival is `s exp(−τ)`. For linear energy
in this local cell and a constant hazard, the exact conditional reaction
position is `μ = 1/τ − 1/expm1(τ)` with limit
`μ = 1/2 − τ/12 + τ³/720` near zero. Thus

```
stopping energy per incident D = (E_l−E_r) s a/τ
reaction-carried beam energy = r [E_l−(E_l−E_r) μ]
transmitted beam energy = s exp(−τ) E_r
```

The τ=0 stopping limit is `(E_l−E_r)s`. Their sum is exactly `s E_l`.
This preserves the existing conservative cell allocation while a new stopping
law supplies E_l/E_r. Its physics error is the within-cell hazard/energy
approximation; refine material depth and/or energy knots independently.
Reaction Q is additional nuclear energy and must be counted only once.

The Bosch–Hale function rejects CM energies below 0.5 keV. A fully stopped
deuteron necessarily passes below this domain. Options must be explicit:
reject that scenario; import a valid lower-energy nuclear model; or return a
bounded unresolved tail with its surviving particles/energy. Do not label a
partially followed trajectory fully resolved. A rejected low-energy nuclear
fit does not mean stopping power is zero, nor that incident ions vanish.

## Evolving isotope loading and conservation

For a deliberately saturated, exchange-only reference with S fixed hydrogen
sites per area, retained incoming D rate a per area/time and random local
replacement, `dT/dt = −a T/S`, so `T(t)=T0 exp(−a t/S)`.
The lost T is replaced by D, and each retained D event ejects T or D according
to site occupancy. Therefore outgoing T=`T0−T(t)` and outgoing D is incoming
retained D minus net retained D gain. This gives an exact positivity and
particle-ledger reference. The retained fraction/depth profile are **assumed
scenario inputs** unless supported by implantation data. This closure does not
constitute measured LiT exchange kinetics or target lifetime.

If fusion depletion is included simultaneously, a fused T nucleus becomes
helium, not D. Track hydrogen-site vacancies V as well as T and D. For fixed S,
one coherent conditional random-site closure is

```
T + D + V = S
dT/dt = −a T/S − r_f
dD/dt = a (1−D/S)
dV/dt = r_f − a V/S
outgoing T rate = a T/S
outgoing D rate = a D/S
```

Here r_f is the consistent local fusion rate, not a separate prescribed loss.
Fusion consumes one incoming beam D and one target T. Implantation a must
exclude incident particles already fused; otherwise the same D both reacts
and remains implanted. A fixed-stopping matrix can be held as an explicit
reference, but feedback of D/T/vacancy composition to stopping then remains
omitted. Never enforce `D=S−T` after fusion without accounting for the required
refill and incoming D. Retained D+T alone is not conserved under fusion.

An even narrower fusion-only uniformly mixed fixed-stopping reference has
`τ = N_T σ_eff`, incident flux J, and
`dτ/dt = −J σ_eff [1−exp(−τ)]`. Hence

`expm1(τ(t)) = expm1(τ0) exp(−J σ_eff t)`.

This is an independently derived exact nonlinear depletion gate, valid when
σ_eff is fixed by the stopping matrix and uniform mixing. It does not reproduce
isotope exchange or retention. For high τ, implement logarithmically to avoid
overflow. Integrated fusion count per area must equal `N_T0−N_T(t)` exactly.

Real diffusion/trapping requires a different closure and data. FESTIM's
documented mobile/trapped balance explicitly subtracts trap uptake from mobile
species and includes a volumetric implantation source; its conservation
structure is useful, but its existence supplies no LiT coefficients:
[FESTIM theory](https://festim.readthedocs.io/en/v2.0/theory.html).

## Required acceptance gates

1. **Units/coordinate:** hand-computed conversions; LiT formula-unit versus
   atom-coordinate factor of two; equal-velocity versus equal-energy isotope
   inputs; no hidden density assumptions.
2. **Stopping:** constant and proportional-to-energy exact ranges; source
   knot reconstruction; nonnegative monotone energy; table-domain rejection;
   source-model interpolation and knot refinement reported separately.
3. **Hazard:** constant-energy slab exact `p=−expm1(−N_T σ)`, zero T gives
   zero reactions but material stopping remains, zero current gives zero rates.
4. **Energy/number:** independently integrate stopping×survival and reaction
   energy×hazard; number closes to reactions+survivors; beam energy and Q are
   separate ledgers. Refine depth to convergence, not only residual closure.
5. **Loading:** exact exchange solution; exact fusion-only reference; D/T/V
   invariance and positivity; outgoing atoms and fused products close ledgers;
   never double-count incoming D; reject inconsistent source/profile sums.
6. **Evolution:** halve timestep and double cells independently and jointly;
   report whole-trajectory yield and inventories, not only endpoint rates.
   Compare against separately implemented high-accuracy ODE integration.
7. **Integration:** old mode numerical identity; changed loading updates
   evolved yield/energy together; source-off and empty-site limits; invalid
   local scenario clears its own results; thermal observer never receives a
   time-varying heat series mislabeled as constant input.
8. **Qualification:** source code agreement validates implementation, not a
   material. Keep measured stopping/range/yield benchmark and LiT retention
   validation as separate unsatisfied gates until actual data are compared.

## Initial finding

No new solver result or experimental agreement is claimed here. The existing
source's local conservative energy allocation is a good reusable component.
The critical structural distinction is fixed material coordinate versus
evolving isotope inventory. Missing coefficients should remain visible inputs
and unsatisfied validation gates, not be replaced by arbitrary dynamics.

## Delivered bounded kernel and discretization

At the parent's later explicit request, this reviewer implemented only
`src/target-loading.ts` and `tests/target-loading.test.ts` in addition to this
report. The kernel is deliberately well mixed, with frozen source stopping.
It derives site capacity and initial tritium from the source's declared areal
coordinates, rather than adding another duplicated composition input.

Each physical interval first applies exact nonlinear fusion-only depletion,
transferring the lost T to vacancies and counting the reacting incident D.
Then `H=eta*(incident D−fused D)` replacement attempts are applied exactly.
For dimensionless replacement dose `u=H/S`, T and vacancies multiply by
`exp(−u)` and D gains `(S−D0)[1−exp(−u)]`. The separately integrated outgoing
D is `D0*u+(S−D0)[u−1+exp(−u)]`; its tiny-u complement uses a stable series.
All retained arrivals, unretained D, outgoing T/D and fused nuclei are recorded.
This is a first-order Lie split of simultaneous dynamics, not an exact coupled
solution. It leaves the source and its constant-heat observer unchanged.

The conservative per-step fractional T-loss bound is
`1−exp[−(tau_unit+eta)*incidentDose]`, because `p(f)/f≤tau_unit` and exchange
loss/T is bounded by eta times incident flux per site. It also bounds the Lie
step. A declared 10% per-step reference budget is exposed as a **numerical
resolution diagnostic**, not a physical boundary or accuracy certificate.
Coarse/fine agreement alone is insufficient if both miss a fast transient.
No automatic extension beyond the declared 6400 intervals is performed.

The initial outgoing-D expression mistakenly integrated its D0 term with
`1−exp(−u)` rather than u. The exact-exchange and D-ledger regressions caught
this (initially 5/7 passed); the analytic integral above fixes the root cause.
A severe dose test then exposed positive subnormal T with `sigma*T` rounded
to zero, causing a 0/0 in the exact fusion update. The explicit zero
representable optical-depth boundary now gives zero representable hazard.
The stress regression covers this boundary without adding a fictitious rate
floor or changing ordinary inputs.

## Actual isolated checks

Bounded copied stage `/tmp/mass-spinner-loading-math-v23`, guest
`safe-dev-78cd48dbd25d8f67`. Only package/lock/tsconfig, owned kernel and owned
test were copied; no home, credentials, control socket or project archive was
mounted. After every code change the source was explicitly synced, and pinned
dependencies reinstalled inside the VM with `npm ci --ignore-scripts` online.
Final test execution and typecheck were offline:

```
safe-dev -C /tmp/mass-spinner-loading-math-v23 run -- ./node_modules/.bin/tsx --test tests/target-loading.test.ts
safe-dev -C /tmp/mass-spinner-loading-math-v23 run -- npm run typecheck
```

Final result: **9/9 tests passed; typecheck exited zero**. The tests cover exact
fusion-only evolution at every sample, exact exchange and outgoing-D integral,
all event/site ledgers and positivity, tiny-dose outgoing D, source-off/time-zero,
high optical-depth overflow protection, numerical resolution flags and input
domain rejection, and the opaque-target cancellation control described below.
An additional offline strong-dose positivity sweep used
unit optical depths `1e−12,1e−8,1e−4,.01,.1,.3,.6,1,1000`; all passed. This is
a numerical stress sweep, not a physically plausible LiT parameter study.

Final kernel SHA256:
`5ab4a699e2a85732fcb91b01172aa0aa7f8f221c33be1f43c45edc1565e2a9d5`.
Final VM export `/tmp/mass-spinner-loading-math-v23-final3-export` retains
`source-sha256.json`, `test-v23.log`, `typecheck-v23.log` and `checks-v23.json`.
Separate simultaneous-ODE/RK4 convergence, merged source/UI checks, final full
build and deployment remain with the independent reviewer and parent; this
reviewer does not claim those checks.

## Final parent-identified numeric edge

The parent identified a public finite-input case outside the real UI's optical
depth range: one site and initial T per m², area 1 m², unit optical depth
`1e20`, incident D rate `1e−18 s⁻¹`, exposure 1 s and ten intervals. The old
large-optical-depth branch returned zero integrated reactions despite an opaque
target and nonzero instantaneous rate. This was reproduced in the offline VM.
The technical cause was subtracting two optical depths near `1e20` to recover
a change of ten; their difference rounded to zero. Simply, the calculation
lost a very small exposure against a vastly larger inventory scale.

For `x≤tau`, the large-change branch now evaluates the optical-depth loss
directly:

`Delta_tau = x − log1p(exp(x−tau) * [−expm1(−x)])`.

The exponential argument is nonpositive, so it cannot overflow. The original
stable small-change branch and remaining-inventory branch for `x>tau` are
preserved. This algebraic fix was preferred to rate floors, clipping or a new
input restriction because it directly removes the demonstrated cancellation
without changing the equations. The new regression requires incident-limited
fusion and vacancy production of `1e−18` nuclei rather than zero. Fresh copied
VM tests passed 9/9 and typecheck passed. The parent and independent reviewer
were notified of the frozen updated kernel hash before the merged final gate.
