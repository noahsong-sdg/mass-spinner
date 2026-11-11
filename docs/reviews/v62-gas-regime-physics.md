# Spatial-gas regime review, 2026-11-10

Scope: independent read-only physical review after adaptive hot-wall v61.
No project command, dependency installation or VM campaign was executed by this
reviewer. Source inspection and primary-source checks support the protocol below;
they do not establish results for the downloaded trajectory.

## Traced gap and smallest justified next step

`fuel-centrifuge-ui.js → simulateFuelOperation → advanceFuelMixtureThermal`
evolves per-cell internal energy and separate normalized species inventories on
fixed equal-volume annuli. The coupled mechanical solve uses the same transfers
to evolve neutral inertia. Accepted checkpoints retain gas temperatures, pressure,
species energy and solid temperatures. The live gas conductivity, radial pressure
relaxation coefficient, friction and film remain prescribed independently.

The v56 `assess` function evaluates all cells at scalar `state.gasK`. Reusing it
unchanged on v61 histories would erase the very boundary layer now numerically
resolved. In simple terms, a correct mean temperature cannot describe whether
adjacent rings are locally equilibrated. The smallest justified next increment
is an attributed assessment of actual canonical spatial states, leaving the
evolution law and public defaults unchanged.

Numerical qualification and physical closure must remain separate. The v61
finite-reference/Robin studies check selected equations and parameter cases.
Their convergence does not establish local Maxwellians, common species
temperature, physical diffusivity, accommodation or a radial momentum law.

## Canonical local quantities

Use the fixed initial inventory `N=p0 V/(kB T0)` and cell volume `Vi=V/M`:

```
N_L,i = N x0 lightMass_i
N_H,i = N (1-x0) heavyMass_i
n_i = (N_L,i+N_H,i)/Vi
x_i = N_L,i/(N_L,i+N_H,i)
T_i = U_i / [1.5 kB (N_L,i+N_H,i)]
p_i = n_i kB T_i
mbar_i = x_i mL + (1-x_i) mH
r_i = R sqrt[(i+0.5)/M]
```

Reject inconsistent derived arrays rather than silently replacing them. An absent
species is not a vacuum cell. Entire-cell vacuum cannot support the common
temperature closure and must remain unavailable. Never turn per-species
probabilities into mass fractions, or substitute the bulk pressure for local p.

For a property source explicitly available at `(pair,T_i,x_i)`, use

```
lambda_mu,i = mu_i/p_i sqrt[pi kB T_i/(2 mbar_i)]
tau_mu,i = mu_i/p_i
```

The viscosity-based length and stress time follow the convention reviewed by
[Sharipov and Seleznev](https://srd.nist.gov/jpcrdreprint/1.556019.pdf).
Their discussion of alternative BGK frequencies also explains why `mu/p` must
not be relabeled a measured collision time, species energy-exchange time or
validated neutral collision count.

The existing Li fit may be evaluated locally over its disclosed 100–3000 K
interval. It is a theoretical monatomic isotope-mixture proxy; it does not
resolve isotope-specific cross sections or uncertainty. The primary
[Bouledroua paper](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf)
confirms the viscosity/conductivity formulas and units used by v56. For helium,
separation generally produces compositions outside the exact pure/equimolar
table coverage. Return unavailable rather than insert bulk helium values.
Atomic D/T retains the existing disclosed atomic-H/Cantera sensitivity status;
D/He and T/He mixture data are not manufactured.

## Spatial screens and their interpretation

Report separately, with location and time of maxima:

```
Kn_R,i = lambda_mu,i/R
Kn_T,face = max(lambda_i,lambda_j) |ln(T_j/T_i)|/(r_j-r_i)
Kn_p,face = max(lambda_i,lambda_j) |ln(p_j/p_i)|/(r_j-r_i)
Kn_ns,face = max(lambda_i,lambda_j) |ln(n_s,j/n_s,i)|/(r_j-r_i)
```

These are disclosed center-secant estimates, not exact unresolved boundary
gradients. A single cell cannot establish a gradient. Zero of an absent species
is excluded; a zero within a present species makes its logarithmic gradient
unresolved rather than introducing an arbitrary floor. Mesh width itself is not
a physical gradient length: do not classify continuum physics using lambda/dr.

The [Hadjiconstantinou review](https://web.mit.edu/ngh/www/PhysFluids_18_111301.pdf)
relates the continuum limit to hydrodynamic scales large compared with molecular
scales and distinguishes the outer continuum temperature from the kinetic wall
layer. Its boundary discussion also requires evolution slow relative to kinetic
relaxation. Those principles support spatial and temporal screens, not an exact
universal cutoff for this reduced rotating-mixture closure.

An important counterexample prevents overinterpretation of pressure/density
screens. For compatible specular confinement, the rigid rotating distribution
`f_s ∝ exp[-(E_s−Omega Lz_s)/(kB T)]` is a kinetic equilibrium. E and Lz are
streaming invariants; all species share the local mean velocity and T, making
their collision terms vanish. Nevertheless,
`n_s ∝ exp[m_s Omega² r²/(2kB T)]` has nonzero density and pressure gradients.
Thus a centrifugal gradient alone is not proof of non-Maxwellian behavior or
continuum failure. This is an analytic counterexample, not a statement about
the live stationary accommodating wall. Keep centrifugal force balance and
thermal nonequilibrium distinct. Rigid rotation also has zero viscous strain;
its antisymmetric velocity gradient and tangential speed are not radial Mach.

At the gas/wall interface reconstruct the production heat rate using its
actual series resistances: prescribed film, gas half-cell resistance
`1/(8 pi L k_live M)`, and tungsten half-cell resistance. Then report

```
Kn_T,wall = lambda_outer |Q_interface|/(A k_live T_outer)
```

This estimates the adjacent hydrodynamic Fourier gradient. It does not resolve
the kinetic layer or equate the full gas/solid temperature difference to a gas
gradient across one cell. Use production conductivity here; substituting the
data-source conductivity would screen a different imposed gradient. If
`k_live=0`, the wall-gradient inference is unavailable (`0/0`), not zero.
Interior secants remain separately reportable. Also disclose `k_live/k_data`
where source conductivity exists: the current constant 0.1 W/(m K) is not the
same constitutive law as the temperature-dependent Li fit.

## Time and flow diagnostics

Finite accepted intervals can estimate Eulerian field-evolution rates:
`R_T,i=|ln(T_i,new/T_i,old)|/dt` and similarly for p. Report `tau_mu R_T`
and `(R/c_i) R_T`, with `c_i=sqrt[(5/3)kB T_i/mbar_i]`, as conditional stress
and acoustic comparisons. They are not material derivatives, forcing rise times,
species equilibration times or solved acoustic responses. At t=0 no previous
interval exists: report unavailable, not a reassuring zero. An abrupt imposed
temperature/current change remains abrupt even if the numerical timestep is tiny.

Species continuity can reconstruct interval face transfers from cumulative
inventory changes. If reporting a radial velocity diagnostic, use mass-weighted
flux divided by disclosed face mass density, not number flux or Omega*r.
Its Mach number is only an inferred reduced-model radial flux measure: there
is still no radial momentum equation. Small inferred Mach and Kn cannot validate
the phenomenological D, common-species T, axial flow or electrothermal closure.

Use separate raw metrics and explicit missing-data reasons. The earlier 0.01
Kn/rate thresholds may be retained as heuristic screens, with no claim that
crossing one proves a universal failure or satisfying all proves validity.
Physical qualification must remain false pending the missing data and closures.

## Independent controls required

- Uniform T with centrifugally varying n: thermal-gradient Kn is zero while
  pressure/density screens need not be. Do not declare this equilibrium invalid
  solely from those gradients.
- Nonuniform T inversely proportional to total density: pressure-gradient Kn
  is zero while thermal/density gradients remain nonzero.
- Fixed N during heating, absent species, whole-cell vacuum, unavailable mixture
  properties, local property range endpoints and explicit missing-data records.
- Change pressure alone: attributed lambda scales inversely with pressure at
  fixed T/composition. Changing numerical dt alone does not change static Kn.
- Sample the same analytic spatial field at successively finer meshes: the
  gradient estimate converges instead of growing like lambda/dr.
- Zero film or zero conductivity does not produce fictitious wall-gradient or
  accommodation evidence; zero-rate initial temporal data remain unavailable.
- Reverse Omega: centrifugal thermodynamic screens remain unchanged. Pure rigid
  rotation must not masquerade as radial acoustic flow or shear strain.
- Reject a deliberately corrupted pressure, particle normalization, spatial T,
  source identity or interface conductance before issuing any classification.

This review approves that bounded assessment protocol, subject to independent
implementation/results checks. It does not approve any as-yet-unexecuted regime
classification, a gas solver modification or physical machine prediction.

## Implementation review addendum

Read-only inspection covers `scientific/spatial-regime-v62/assessment.py`,
`campaign.py`, `test_assessment.py` and the separately authored
`audit-independent.py`. No project or VM command was run by this reviewer.

The implementation reconstructs local T/p/composition from canonical U/N,
uses the existing attributed Li fit at local temperatures, carries the exact
species masses in SI, and uses local pressure for its viscosity length/time.
Its interior secants, maximum adjacent transport length, mass-weighted radial
continuity flux, endpoint density/sound interpolation, and series-resistance
wall heat agree with the proposed reduced-model diagnostics. Tungsten k(T)
matches the production polynomial. Gas/solid surface extrapolations preserve
the sign of the shared outward heat. Zero film, zero conductivity and initial
temporal unavailability retain distinct semantics. The exact downloaded-file
SHA fixes the campaign input, while the separate v61 full-file audit supplies
canonical history/source verification.

The campaign has no aggregate physical pass/fail label and explicitly preserves
`qualified=false`. Its selected witnesses retain their actual predecessor, so
temporal diagnostics can be independently reconstructed without inventing a
previous state. The witness auditor checks its supplied subset only and says so;
it is not a second independent scan of all 31,791 checkpoints. No executed
coverage/result approval is supplied here before receipts are available.

One adjacent invariant issue was reported to the parent: NumPy `allclose`
broadcasting can accept a singleton derived temperature/pressure vector for a
multi-cell uniform fixture. Require each derived vector's shape to match the
canonical mesh and add a singleton regression. The frozen downloaded trajectory
already passed the separate full-array audit, so this issue does not invalidate
that input, but it weakens the standalone assessor's corruption rejection.

Interpretation boundaries remain material. The field named
`commonAccommodationReference` is only the prescribed film divided by the
fully accommodating outer-cell Maxwellian thermal reference. It is neither a
measured/inferred Li/W accommodation coefficient nor a universal conductance
limit; jump-law temperatures, tangential drag energy and chemistry are different
questions. The implemented temporal diagnostic is a stress-time comparison;
the proposed acoustic-time rate was not implemented, so no acoustic assessment
should be claimed. Inferred continuity Mach does not qualify the absent radial
momentum equation or effective damping. These scope restrictions, rather than
additional guessed physical coefficients, are the defensible interpretation.

## Executed-evidence closeout

The parent supplied actual execution evidence, which this reviewer opened:
`spatial62-shape-red`, `spatial62-shape-green`, `spatial62-actual-history` and
`spatial62-independent-witnesses` receipts/logs under `scientific/fixes-v43`,
and exported `summary.json`, `audit.json`, `manifest.json`, `findings.png` and
the figure source. Execution remains parent-owned in the offline safe-dev VM;
this reviewer performed no independent code run.

The derived-array regression first failed twice, separately for singleton
temperature and pressure fields. The assessor now requires the exact mesh shape
and finite values before comparison. All nine tests then passed at 650-input
SHA256 `cc69df50ef71a5ba228713ce8d7c02473bdec64a2a5808696b6d6c5bed910031`.
This is the direct root-cause fix: reject a malformed spatial representation,
rather than loosen the physical-field tolerance or add a data substitution.
The earlier `commonAccommodationReference` output has been renamed
`filmToMaxwellReference`, improving the distinction from inferred accommodation.

The actual-history assessment completed in 86.19 s with 651 verified inputs,
SHA256 `90527fe160916e8c1b378c298917273add632a9c02ccd155f0024f95d50ee6b1`.
It assessed all 31,791 accepted checkpoints / 8,138,496 cell states in the fixed
download with SHA256
`449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`.
The separate witness audit passed in 1.99 s at the same input snapshot and
checked 49 selected states, including all retained global-extremum witnesses.
Its explicit `independentlyAuditedEveryHistoryState=false` is correct. The
8,103,896-byte raw witness packet digest matches the exported manifest/audit:
`be60085654fb541d32480d7bc96e22845e3303ef58a11719996a473b5a172e54`.

The result records, rather than a blanket classification, are approved within
their stated scope:

| Diagnostic maximum or range | Observed value | Interpretation boundary |
|---|---:|---|
| Radius Kn proxy | 0.008893117 at 1 s | Conditional local Li-fit length/R, not measured rarefaction |
| Interior thermal-gradient Kn | 0.001035808 at 13.9103 microseconds | Center-secant field estimate |
| Wall Fourier-gradient Kn | 0.001077423 at t=0 | Discrete production interface slope, not resolved kinetic wall layer |
| Eulerian thermal rate × stress time | 0.015783788 at first retained half-step | Mesh-dependent finite-cell startup rate; not a demonstrated kinetic failure |
| Continuity-inferred radial Mach | 2.730958e-5 at 6.36279 microseconds | Small inferred flux speed does not establish a radial momentum closure |
| Imposed / attributed conductivity | 1.842549–3.351828 | Demonstrated constitutive mismatch under the theoretical property proxy |

The figure was visually inspected. It uses selected actual accepted times and
labels its 0.01 line as a reference, not a physical pass gate. Near-wall profiles
are explicitly gas cell averages. Its scope caption states the Li proxy and
absence of kinetic/hardware qualification. The main report likewise distinguishes
Eulerian rates, unknown initial rates, rotating force balance and conductivity
closure. No aggregate physical failure/pass or calibrated result is claimed.

In particular, the new first-knot rate maximum has not itself been subjected to
a separate spatial-refinement study. Its location at the first retained state
must not become a claimed physical minimum timescale merely because v61 refined
the temperature trajectory. The clearest supported follow-up is to assess a
temperature-dependent conductivity law and its sensitivity, while keeping
accommodation and momentum closure as separately open physical questions.

Scoped approval: assessment arithmetic, reviewed diagnostic interpretation,
regression correction and reported selected-witness independent evidence. This
does not approve continuum accuracy, all-slider validity, a new live evolution
law, low-Mach/acoustic closure or Marathon hardware prediction. The parent's
required final build/typecheck and release-identity checks remain separate gates.

## Final gate confirmation

This reviewer subsequently opened the actual `spatial62-final.receipt.json`,
`spatial62-final.log` and completed `SPATIAL-GAS-REGIME-V62.md`. The final parent-run
safe-dev gate exited zero in 7.981 s, with source verified before and after:
652 inputs, SHA256
`c513634e7e841bb48873528d4afdb57a22e95648c4b79c5addd2c5866b24244e`.
The log records 11 spatial-regime tests, 16 existing v56 tests and 10 v61 oracle
tests passing, followed by successful typecheck, build, static site and asset
checks. The two added invariants cover constant-pressure nonuniform-temperature
states and pressure scaling. The production build retains its existing large
bundle warning; that is not evidence of a new assessment regression.

The gate records all 151 generated release files byte-identical to deployed
Final D, release SHA256
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
This supports preserving the prior browser evidence for the unchanged app,
rather than claiming a fresh browser test or deployment. The completed main
report retains the selected-witness scope, missing momentum/acoustic closure,
mesh-sensitive early-rate caveat and uncalibrated film/property limitations.
No additional blocking physical-interpretation issue was found in this final
read. Approval remains limited to the diagnostics and recorded evidence, not
continuum or hardware qualification; no reviewer-owned execution was performed.
