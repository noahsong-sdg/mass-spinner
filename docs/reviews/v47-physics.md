# Independent finite-time radial-transport audit, v47

2026-11-09. Independent source/equation review and independent regression tests.
This reviewer owns only this report and
`tests/fuel-transport-independent-v47.test.ts`; no production code, guest state,
project execution, dependency installation or deployment was modified here.
Execution evidence must be supplied by the parent's isolated verification run.

## Defensible equation and verified implementation

The accepted rotor prescribes a common neutral angular velocity Ωn(t), fixed
temperature T, cylinder radius a and phenomenological diffusivity D. For each
neutral species the implemented conditional model is

```
∂t n_s = (1/r) ∂r {r D [∂r n_s − m_s Ωn(t)² r n_s/(kB T)]}.
y = r²/a²,  β_s(t) = m_s Ωn(t)² a²/(2 kB T),  κ = 4D/a².
∂t q_s = κ ∂y {y [∂y q_s − β_s(t) q_s]}.
```

Here q_s is the normalized species probability per unit y. Constant q means
uniform **volume** density, not uniform radius. Zero flux at y=0 and y=1
conserves each species inventory. With frozen rotation, the equilibrium is
q_s ∝ exp(β_s y); a heavier neutral has stronger outward bias. D has units m²/s,
κ has units s⁻¹ and β is dimensionless. The cylinder length cancels in this
closed, axially uniform probability problem.

Source inspection of `fuel-transport.ts` verifies the 4D/a² coefficient, exponent,
outward drift sign, reflecting boundaries, uniform-y cell measure and prescribed
midpoint Ω(t). Its face rates are nonnegative Scharfetter–Gummel rates; their
ratio is exp(β Δy), preserving exact equilibrium cell masses on this uniform
mesh. Backward Euler gives a tridiagonal M-matrix. Independently expanding its
Thomas recurrence reproduces the conservative diagonal and off-diagonal terms.
The positive-remainder elimination avoids subtracting large nearly equal
diagonal terms. It rejects failed inventories instead of clipping or
renormalizing states. These are equation/source findings, not executed evidence.

At fixed Ω the appropriate dissipating functional is relative free energy
KL(q || qeq), not raw Shannon entropy. During changing Ω, potential work can
increase this functional; concentration can lower Shannon entropy. An entropy
gate that ignores this distinction would reject correct centrifugal dynamics.

## Scientific scope: not multicomponent gas hydrodynamics

**Material limitation, not a new solver defect.** Independent species
Smoluchowski fluxes are a coherent overdamped, externally driven dissipative-bath
model. They do not impose zero summed barycentric diffusive mass flux. The code
also does not solve total-density pressure dynamics, radial gas momentum,
redistribution-driven rotor-inertia changes, energy balance or axial extraction.
Therefore this is not a closed two-species gas, a Maxwell–Stefan calculation or
a calibrated Marathon centrifuge prediction.

This distinction follows from the standard mixture definition
j_s = ρ_s(u_s − u), which imposes Σj_s=0 in the mass-averaged frame. A common
centrifugal acceleration does not justify replacing a real mixture's pressure,
momentum and interspecies-friction equations by two independent Brownian baths.
Those equations can share the same final isothermal barometric equilibrium while
having different transients. [Bothe's original analysis, equations 1–8 and
17–20](https://arxiv.org/html/1007.1775) supplies the mixture balances and mutual
friction structure. [COMSOL's official concentrated-species
documentation](https://doc.comsol.com/6.4/doc/com.comsol.help.cfd/cfd_ug_chemsptrans.11.052.html)
describes the composition/pressure dependence and mass constraint in implemented
multicomponent transport.

The implemented diagnostic `neutralInertiaRatio` makes the missing feedback
quantitative: In(t)/In(0) = 2 Σs ws〈y〉s for the mass fractions ws. It is one for
the initial uniform gas and approaches two for an outer-wall concentration.
Thus strong radial redistribution can make fixed-inertia rotor feedback an
order-one approximation; conservation of the reduced transport equation alone
does not make that approximation accurate.

The production assumptions now explicitly describe a prescribed-rotation,
isothermal, independent-species closure and user-supplied D. This is the smallest
coherent addition to the existing rotor/equilibrium playground. A coupled
compressible mixture solver would require justified binary transport data,
pressure/energy boundary conditions and new conservation gates; substituting
one without those inputs would imply unsupported fidelity.

**Presentation acceptance requirement.** Current inventory cuts are not
extraction rates. The closed-wall transient must not silently inherit the
separate equilibrium pumping/cascade assumptions. Exterior packet graphics must
remain identified as a separate boundary-reference flow. A timeline cursor must
use the transient profiles and current inventory cuts, rather than displaying
the final equilibrium cut as if the distribution had already relaxed. One-way
rotation coupling and prescribed D must remain discoverable in the UI.

## Adversarial issue found

**P2 — mathematically empty cut compartment could acquire a purity.** Source
inspection found that the raw floating-point sum of conditional cell masses was
used as CDF(1), and then subtracted from one for the outer compartment. A tiny
roundoff remainder at cut=1 could produce finite outer purity instead of null.
In simple terms, a numerical crumb was being interpreted as a real compartment.
The correct narrow fix is explicit physical cut endpoint semantics, keeping raw
inventory sums available in conservation diagnostics. Broad clamping or hidden
renormalization would mask genuinely failed inventories. The implementer was
notified before independent endpoint tests were added. Resolution and executed
evidence are recorded below. Reopened source explicitly handles CDF(0/1)=0/1
and null outer purity at cut=1 while retaining raw inventory diagnostics.

## Independent gates

The new independent test file does not reuse production radial CDF/PDF as its
analytic oracle. It checks:

- Uniform initial volume density, zero drive and conserved species inventories,
  including positive interpolation between timeline snapshots.
- Integrated Boltzmann bin probabilities under frozen rotation, weak/strong
  centrifugal exponents, positive stiff steps and outward heavy/light drift.
- Decreasing fixed-potential relative free energy and diffusion-rate × time
  scaling with independently chosen initial distributions.
- A reflecting-cylinder analytic diffusion eigenmode:
  n(r,t) = 1 + 0.5 J0(αr/a) exp(−Dα²t/a²), with α the first J1 root. Exact cell
  integrals independently check cylindrical geometry, diffusion rate and full
  distribution error. Separate radial-grid and timestep refinements avoid
  confusing a correct stationary state with a correct transient rate.
- Empty inner/outer cut semantics and pure-species feeds.

The discretization principles have established precedents: [Chang & Cooper,
1970](https://doi.org/10.1016/0021-9991(70)90001-X) develops a conservative,
positive Fokker–Planck scheme preserving equilibrium, while [NIST FiPy's official
exponential-convection implementation](https://pages.nist.gov/fipy/en/latest/generated/fipy.terms.exponentialConvectionTerm.html)
documents exponential face interpolation. This module adapts those principles
to a one-dimensional cylindrical probability equation; it does not import a
full validated gas/plasma simulation package.

## Final UI-path review

Reopened current `fuel-centrifuge-ui.js`, `fuel-scene-tools.js`, `fuel-view-ui.js`
and the motion adapter. Transport mode samples the current conservative radial
state at the physical cursor time. Surface/probe sampling uses the actual
finite-volume cell masses, rather than interpolating the display profile across
cell boundaries; speed uses Ωn(t) r. The profile panel switches to current-time
densities, purity, recovery and omitted-inertia ratio. Separation-versus-time
curves are generated from solved snapshots and identify the final-equilibrium
purity as a separate reference. Closed-wall motion hides the separate pumping
packets. Equilibrium and Flow retain final-equilibrium profiles. Spin-up alone
preserves uniform density. These are verified source paths, not this reviewer's
independent GPU observations.

The added `maxCellExponent = max(m_s) v_n,end²/(2 kB T Ncells)` is a dimensionless
resolution diagnostic. Values above one indicate fewer than one y-cell per
centrifugal e-folding at the wall. The UI warns explicitly instead of silently
claiming all slider combinations are resolved. Exact frozen-potential cell
inventories do not make a piecewise-constant subcell cut or thin-layer surface
profile exact; the cellwise reconstruction remains the declared approximation.

**P2 presentation concern sent to the parent:** the Cut panel continued to use
`r.cuts` and final `r.collection` while Transport showed a current-time 3D cut.
Its generic inventory wording did not identify that different time/closure.
Explicit final-equilibrium labels are the narrow coherent fix if that panel is
intended to stay a reference; alternatively it must derive current cuts from
the sampled transport masses. Spin/Heat cards similarly require final-time
labels when displaying end-state values beside a movable time cursor. This
report does not claim that an unobserved subsequent fix has passed.

## Execution evidence

Reopened `scientific/centrifuge-v44/playground47b/final/receipt.json`,
`tests.log`, `fuel-release-worker.log` and the enclosing
`scientific/fixes-v43/v44-final-playground47b.receipt.json`. The parent-controlled
safe-dev snapshot is `/work/home/fix-v43-source`, with 524 input files and input
SHA-256
`0e6c59e06fd6343c5bc10358c76c618309ba1f37d458a0d17a75086bf27ad611`.
Source hashes were verified before and after every command. Observed results:

- `npm test`: **989 passed, zero failed**, including the independent transport,
  motion and actual typed-worker regression files.
- `npm run typecheck`, `npm run build`, `npm run check:site` and
  `npm run check:assets`: exit zero.
- `node --import tsx scientific/fixes-v43/verify-release-worker.mjs`,
  `node --import tsx scripts/verify-fuel-release-v44.mjs` and
  `python3 docs/reviews/v42-collision-data-probe.py`: exit zero.
- The actual emitted fuel worker exercised **144 centrifuge cases with 144
  transport results**, **49 operating-map cells**, source-digest checks and
  invalid-protocol/domain rejection. This matrix checks the reported inventories
  and protocol; it does not perform spatial/time refinement at every point.

The checked worker was `worker-B6_Xy0A5.js`, SHA-256
`5f6212bd4ed7221d1028f873a42f8b714774ead8557bda3b1b70bb2b7e5c1d70`.
The receipt explicitly records `browserVerified:false` and
`calibratedMarathonDevice:false`. Subsequent camera/cursor UI edits and any
reference-label fix require the parent's final-c rerun; this review certifies
only the identified full-b snapshot. No deployed GPU or interaction verification
is claimed by this reviewer. Passing gates verify the declared reduced
numerical equation, not its experimental transport coefficient, omitted
gas-mixture dynamics or Marathon performance.
