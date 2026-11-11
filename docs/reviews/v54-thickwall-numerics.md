# Independent thick-wall numerical review

No blocking defect found in the increment-only FiPy correction within the
audited discrete thermal model. This review covers numerical algebra and
exported safe-dev results; it is not a physical calibration of a Marathon
device or approval of the pending final build/deployment gates.

## Cause and minimal correction

The original 12 mm wall, 0.5 m length, low-gas-inventory case exhausted 300
nonlinear iterations. Its gas residual was about -2.682e-10 J, with normalized
residual 1.598e-10 against the unchanged 1e-11 gate, although the iterated
temperatures had stopped changing. The linear gas-row residual was already
about -2.680e-10 J. This identifies insufficient small-row accuracy in the
absolute-temperature linear solve, rather than unresolved nonlinear iteration.

In simple terms, the solver was subtracting large absolute-temperature storage
terms to recover a tiny gas energy change. The massive wall could satisfy a
global linear norm while the small gas row missed its physical balance gate.
The controlled diagnostic held the physical problem and acceptance gates fixed:
stable enthalpy secants alone and stable residual evaluation alone both failed;
solving for the temperature increment alone passed all five steps.

For frozen iteration coefficients, write the original system as

`(C/dt + K + S) Tnew = C Told/dt + Q/dt + S Tcool`,

where K is the conservative internal-conduction matrix and S the outer Robin
sink. Substituting `Tnew = Told + delta` gives exactly

`(C/dt + K + S) delta = Q/dt - K Told + S (Tcool - Told)`.

The actual patch implements these signs, resets delta's old state to zero at
every physical step, and continues evaluating material coefficients and the
physical enthalpy residual at absolute temperatures. Internal forcing remains
equal and opposite; the coolant sign is correct. Matrix coefficients, masses,
heat-flow closure, nonlinear residual gate, temperature-change gate and maximum
iteration count remain unchanged. This translation directly fixes the demonstrated
cancellation without loosening tolerances, changing the model, or adding a fallback.

## Independent checks inspected

- Read the current `scientific/thermal-v53/reference-fipy.py`, original-case
  regression, replayable `scientific/thermal-v54/diagnose.py`, refinement analysis,
  and exported diagnosis/refinement/audit logs.
- Authored `scientific/thermal-v54/audit-numerics.py`: an independent 80-digit
  Decimal absolute-temperature solve using Thomas elimination, with no production
  or FiPy imports. It independently constructs annular masses, geometric centers,
  logarithmic half-shell resistances, Robin films and integrated tungsten enthalpy.
  Its physical node residual and iteration-change requirements are 1e-48 J and
  1e-48 K. Inputs retain binary64-derived geometry constants; this is higher
  precision arithmetic on the disclosed model, not 80-digit material accuracy.
- Inspected `scientific/fixes-v43/thermal54-numerics-audit.log`: three selected
  cases, 15 states, maximum FiPy temperature difference **3.410605e-13 K**
  against the unchanged **2e-7 K** gate. Cases were the original five-step
  failure, n128 five-step main-horizon case, and n128 five-step fast-gas case.
  The output explicitly preserves `referenceAllPass: false` and
  `referenceQualificationPass: true`.
- Inspected `scientific/fixes-v43/thermal54-physics-audit.log`: the separately
  authored physics audit passed every one of the 22 cases, including the
  external-only n256 case. It checks physical node balances, entropy and passive
  temperature bounds. Selected high-precision comparisons reach about
  **5.242e-13 K** maximum difference. This is independent corroborating evidence;
  I did not author that auditor.
- Inspected `scientific/fixes-v43/thermal54-refinement-b.log`: 22 cases and
  2,875 states completed, maximum FiPy nonlinear residual **7.513e-14**.
  Production comparison covers its 21 supported cases through n128:
  **286,955 temperatures**, maximum difference **4.596e-9 K**.

Both independent audit logs identify input SHA256
`98cf9cd8285593845d3af3e47b9bc9025bafdf5c7d2093427dba44839c882903`
and FiPy-results SHA256
`ea36aa2d3a58bdd3a7052bb6f9eb8c015a763dcc31fb66be1ac43b55096fdc48`.
The numerical auditor identifies its script SHA256
`a6748bbeb8bce0792df46840dd133a697abdeb0d40d5bf0aebadc6116d12305f`.
Execution and snapshot synchronization were performed by the parent agent inside
safe-dev. I inspected exported evidence and did not personally execute project
code, run a separate VM, or independently reproduce the command receipts.

## Refinement limits preserved

The original all-grid spatial contraction gate still fails: the first error
ratio is 1.197. At the short horizon, the diffusion length is about 0.636 mm;
n8 and n16 widths are 1.5 and 0.75 mm, respectively. They do not resolve that
boundary layer. The resolved n32/64/128/256 tail has error ratios **0.2631** and
**0.2527**, consistent with second-order spatial behavior. The n256 solve is an
external FiPy refinement holdout; production retains its n128 domain boundary.
Qualification of the resolved tail does not turn the coarse negative result
into a pass.

Main-horizon timestep ratios approach **0.5002**, consistent with backward Euler.
Fast-gas ratios approach **0.4874** on the fixed n128 wall, but the finest pair
still differs by **0.1356 K** at the endpoint. That is evidence of temporal
contraction, not a claim of highly accurate fast-transient continuum temperatures.
The fast-gas study does not establish spatial resolution of its much thinner
solid boundary layer. These are endpoint refinement studies, not a complete
transient error bound. Cross-code agreement validates the shared discrete model;
the gas-lumped, radial-only, prescribed-film assumptions still require separate
physical validation.
