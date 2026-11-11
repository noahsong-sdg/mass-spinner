# Fast gas–liner thermal transient

## Problem, cause and change

The v54 FiPy fix restored nonlinear-solver acceptance but did not resolve
the fast thermal field. The 128-cell uniform 12 mm liner has 93.75 µm
cells, whereas heat penetrates about 12 µm in the five-gas-time horizon.
Its finest fast-time endpoint pair still differed by 0.135577 K, and
endpoint agreement did not bound earlier gas or wall temperatures.

The traced path is `createFuelLiner` → exact annular masses/logarithmic
half-cell conductances → coupled implicit enthalpy solve. The constructor
was the spatial restriction: it always produced uniform edges. The rest
of the production kernel already uses explicit geometry. Technically,
the discretization could not resolve the thermal boundary layers;
in plain terms, its first cell was wider than the region changing temperature.
Smaller timesteps alone would converge to that spatially coarse problem.

The smallest coherent change adds optional `radiusEdgesM` to the thermal
kernel's grid constructor and actual-FiPy oracle. Explicit edges must be
finite, strictly increasing, match the complete annulus and have exactly
`cells+1` entries; caller arrays are copied. Non-arrays reject. Existing
uniform arithmetic and the production 128-cell limit remain unchanged.
The core equations, material properties, enthalpy storage and convergence
gates do not change. This uses FiPy's existing
[nonuniform cylindrical mesh support](https://pages.nist.gov/fipy/en/stable/generated/fipy.meshes.factoryMeshes.html),
with no new scientific dependency.

The study uses a nested, symmetric exponential mesh at both interfaces.
For normalized position `u<=1/2`, depth is
`(thickness/2)*expm1(2*beta*u)/expm1(beta)`, with `beta=9`; the outer half
is mirrored. The full 12 mm solid remains present. The finest supported
128-cell mesh has first/last cells about 0.112 µm wide. A 256-cell
external-only holdout tests further spatial refinement without expanding
the browser kernel's domain.

This choice resolves the region that changes rapidly without requiring
thousands of uniform cells or truncating the solid. It preserves passive
finite-volume conservation and positivity rather than replacing the
physical closure or relaxing solver acceptance.

## Prospective campaign and observables

The unchanged benchmark has inner radius 0.12 m, length 0.5 m, gas capacity
0.0006785840131753953 J/K, initial gas 500 K and solid 1000 K, gas film
1000 W/K, coolant 500 K and outer film 1 W/K, with no deposition.
The nominal gas-film time is `tau=Cg/G=0.678584 µs`; the horizon is `5*tau`.

The nonlinear campaign is a full matrix of 32/64/128 graded cells and
2,560/5,120/10,240 backward-Euler steps. It includes the old uniform
128-cell grid at 10,240 steps and the external 256-cell holdout at the
same timestep. Two additional constant-property cases support an analytic
benchmark; a five-step early-time graded case supports Decimal80 checking.

Every timestep is retained in compressed raw histories. Comparisons use
97 shared physical times, with no time interpolation, beginning at
`tau/64` and continuing to `5*tau`. The exact initial continuum right
limit is recorded separately. This is sampled-history qualification, not
a continuous-time global error bound. The very first accepted wall step
is not claimed to resolve the continuum initial boundary layer.

Surface temperature is reconstructed through the film and half-cell
resistance: `Ts=Tg-q/Gfilm`, where `q` is total power positive gas→solid.
It is not the temperature of the innermost cell. Cumulative interface
heat and instantaneous endpoint power are checked separately. Profiles
at fixed physical depths use interpolation between that surface and
cell centers, without extrapolation. The nonlinear profile gate covers nine
inner-wall depths: 0, 0.25, 0.5, 1, 2, 4, 8, 16 and 32 µm. It is not a
continuous whole-wall supremum. The outer interface has its own surface
gate; all wall nodes are independently checked for discrete balances.

Frozen accuracy gates for finest spatial, temporal and joint pairs:

| Observable | Maximum sampled-history difference |
| --- | --- |
| Gas temperature | 0.05 K |
| Inner/outer surface and reconstructed depth profile | 0.001 K |
| Interface power | 1e-4 of initial 500 kW = 50 W |
| Cumulative gas→solid heat | 1e-4 of initial gas-contrast energy = 3.393e-5 J |

Spatial, temporal and joint contractions must be below 0.85 above the
disclosed signal floors. Profile and outer-surface gates explicitly use
the same 0.001 K surface criterion. The uniform control is measured and
retained rather than forced to fail.

## Independent physical checks

The physics auditor independently reconstructs every accepted node's
energy row, signed gas/coolant ledgers, surface flux, passive bounds and
system-plus-bath entropy using factored enthalpy and `log1p`. It imports
neither FiPy nor the production kernel. A separate Decimal80 absolute-
temperature Thomas solver independently advances the five-step graded case.

A constant-property semi-infinite solid supplies an additional continuum
benchmark, independent of any finite-volume matrix. Its Laplace admittance
is `A*sqrt(k*rho*Cp)*sqrt(s)`. With gas temperature measured relative to
the initial solid temperature, the coupled gas transform is

`theta_g(s)=theta_g(0)/[s+(G/Cg)*sqrt(s)/(sqrt(s)+G/(A*sqrt(k*rho*Cp)))]`.

The inverse is evaluated with complex scaled complementary error functions
using existing [SciPy erfcx](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.erfcx.html).
Transform identities are supported by [NIST DLMF §7.14](https://dlmf.nist.gov/7.14).
Independent heat-kernel convolution and heat-integral self-checks agree
to 1.14e-13 K and 1.49e-13 J, respectively.
The benchmark has constant properties and no outer cooling. Absolute
gates separately allow finite timestep and small cylindrical-curvature
effects: 0.1 K gas, 0.002 K surface/full cell-center wall field, 100 W
power and 1e-4 J integrated exchange. Small penetration/radius and large
thickness/penetration ratios scope the approximation, not rigorous error bars.

## Physical and product limits

All verification is conditional on a lumped, well-mixed gas and prescribed
gas–wall/coolant films. Actual gas mixing and thermalization would need to
be much faster than the modeled gas response; that condition is not
established here. Resolving the wall cannot establish real submicrosecond
gas uniformity or validate rarefied-interface accommodation. A spatial gas
closure remains separate work. Material and apparatus assumptions remain
those documented in v53/v54, including fixed solid mass and radial-only heat flow.

The explicit-edge capability is a thermal-kernel API used by these studies.
Existing playground controls continue to select their uniform grid and
operating timestep; this study does not silently replace saved setups or
claim that the current UI resolves the qualified fast window.

## Measured results

All 14 cases accepted every step: 94,725 steps in total. All frozen finest-
pair accuracy and contraction criteria passed. Comparisons below are maxima
over the common checkpoints, not an error estimate at a selected endpoint.

| Observable | Time: 5,120→10,240 steps, 128 cells | Space: 128→256 cells, 10,240 steps | Joint: 64/5,120→128/10,240 |
| --- | ---: | ---: | ---: |
| Gas temperature (K) | 0.0448754 | 0.0000302955 | 0.0449755 |
| Inner surface temperature (K) | 0.0000330613 | 0.0000412281 | 0.000158001 |
| Reconstructed wall profile (K) | 0.0000330613 | 0.0000653192 | 0.000261495 |
| Outer surface temperature (K) | 2.91773e-8 | 1.39415e-7 | 5.55715e-7 |
| Interface power / 500 kW | 8.97577e-5 | 6.41944e-8 | 8.96493e-5 |
| Integrated exchange / initial gas-contrast energy | 8.97508e-5 | 6.05910e-8 | 8.99511e-5 |

The gas temporal contraction is 0.500305. Finest spatial gas/surface
contractions are approximately 0.25; the profile ratio is 0.249847.
These support first-order backward-Euler time behavior and approximately
second-order spatial behavior in this regime. Time error now dominates
the gas result. Passing the gates is not a claim of zero error.

At the same fine timestep, the old uniform 128-cell grid differs from the
graded result by 0.172084 K gas and 0.503080 K at the inner surface/profile.
Its power difference is approximately 495 W. It fails the refined accuracy
criteria while conserving energy. This negative control demonstrates why
solver acceptance and conservation alone cannot resolve a boundary layer.

Independent validation results:

- All-state physical reconstruction: 94,725 states; maximum normalized
  node energy residual 1.60668e-15 against the unchanged 1e-11 criterion.
  Signed exchange, passive bounds and system-plus-bath entropy passed.
  Minimum entropy increment was positive, 3.91720e-12 J/K.
- Production TypeScript versus actual FiPy: 11 supported cases and
  5,389,445 temperatures, maximum difference 1.08435e-9 K against 5e-6 K.
  Surface temperatures, endpoint power and cumulative heat/cooling ledgers
  also passed their existing gates. The external 256-cell and constant-
  material cases are not represented as browser-kernel comparisons.
- Independent Decimal80 advancement of five early fine-grid states:
  maximum FiPy difference 3.41061e-13 K against 2e-7 K. This checks a
  selected early interval, not every campaign state.
- Independent constant-property continuum comparison: the 128-cell run
  differs by at most 0.0449267 K gas, 4.81107e-5 K inner surface,
  4.79089e-5 K across all wall cell centers, 44.8795 W and 3.04866e-5 J.
  Both 128- and 256-cell cases pass their separate absolute gates.

The qualified positive-time window is 10.6 ns through 3.393 µs, with the
initial right limit treated separately. The near-zero initial wall layer
is not certified by a checkpoint study starting at 10.6 ns.

## Adjacent defects found and corrected

**Legacy grid compatibility.** The initial edge-validation change compared
generated uniform endpoints using exact equality. IEEE754 evaluation of
`.12 + .1*3/3` can differ from `.12 + .1`: mathematically identical legacy
inputs were rejected because of the order of rounding. In simple terms,
the validation mistook the last floating-point digit for bad geometry.
Actual TypeScript and FiPy regressions failed before correction. Endpoint
equality is now checked only for explicitly supplied arrays, retaining
the original uniform arithmetic. This is preferable to changing old grids
or adding a general rounding fallback. Explicit malformed/non-array grids
still reject, caller arrays are copied, and exact five-step graded/uniform
reference parity was verified after the fix.

**High-precision auditor roundoff.** An exact passive-bound assertion in
the independent Decimal solver flagged a 1e-76 K overshoot at 1000 K,
one last-place digit at 80-digit precision. Equation residuals were below
1.54e-56 J. In simple terms, the auditor demanded exact arithmetic from a
finite-precision calculation. Only that inequality now has a reported
`8*node_count*ULP(bound_temperature)` arithmetic allowance, 1.032e-73 K
for this case. It is not claimed as a rigorous accumulated error bound.
A self-check accepts one ULP and rejects an artificial 1e-30 K violation.
Physical residual, nonlinear stopping and cross-code gates are unchanged.
Increasing precision would move the same last-digit problem; relaxing
physical tolerances would address the wrong cause. Failed and diagnostic
runs remain preserved alongside the passing rerun.

## Independent reviews

The [physics review](reviews/v55-fast-thermal-physics.md) and
[numerical review](reviews/v55-fast-numerics.md) independently inspected
the actual receipts and results and found no blocker within the stated
scope. The [refinement review](reviews/v55-fast-thermal-refinement.md)
separately inspected the actual matrix, controls, gates and limitations.
Reviewers authored independent audit implementations; execution remained
parent-owned in the offline safe-dev VM. They did not run a separate
second-VM campaign.

## Final verification and durable evidence

Final command: `python3 scripts/run-final-v44.py thermal55`, invoked through
the trusted `scientific/fixes-v43/control.py thermal55-final -- ...` host
controller. Every project command ran offline in Apple safe-dev project
`/private/tmp/mass-spinner-marathon-v35-final`, source copy
`/work/home/fix-v43-source`. No host scientific execution was used.

| Check | Actual result |
| --- | --- |
| `npm test` | 1,139 passed; zero failed/skipped |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run check:site` | exit 0 |
| `npm run check:assets` | exit 0 |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | exit 0 |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | exit 0 |
| `python3 docs/reviews/v42-collision-data-probe.py` | exit 0 |
| `python3 scientific/thermal-v53/run-studies.py /work/home/thermal-v53-final-studies-thermal55` | exit 0; old thermal studies and analytic annular mode passed |
| `/work/home/thermal-v53-venv/bin/python tests/test_fipy_thickwall_v54.py` | one test passed |
| `/work/home/thermal-v53-venv/bin/python tests/test_fipy_grid_v55.py` | one test passed |

The final source manifest contains 585 files, SHA256
`00a8cae5bc729df19e7811bed6f13a7b2c8c86763273852bf72b13aa4df894bf`,
verified before and after every command. Two historical baseline scripts
are retained only in the guest and disclosed in controller receipts.
The local release has 151 files, manifest SHA256
`64f89013eb53c7f9a08122f646707a812522fa7df3529fd0e11fcceba07caf7e`.
This is a checked local build; no deployment or live browser verification
was performed for v55.

Durable results live under
[`scientific/centrifuge-v44/thermal55/`](../scientific/centrifuge-v44/thermal55/).
The export includes every compressed accepted-state history, case packet,
matrix summary, independent audits, production comparison, source copies,
dependency metadata, final logs/receipts and the standalone
[PNG](../scientific/centrifuge-v44/thermal55/studies/fast-thermal.png)/
[SVG](../scientific/centrifuge-v44/thermal55/studies/fast-thermal.svg) figure.
The figure was reopened and visually inspected. Export: 93 files,
42,430,308 bytes, every payload SHA256 checked before writing; export-
manifest SHA256
`d333cfaf27e63dbd52177d04a26d9b0af7a0480a6e0dab9611c1db5a35c74f97`.

Reproducibility distinction: the main campaign used reference-source SHA256
`8786f001460dffb1217848836bb7e8502224d442cd1320fd0746911fcaf72dce`.
That exact source is preserved as `source/frozen-campaign-reference.py`.
The final reference source, after scoping endpoint validation to supplied
edges, is SHA256
`9f612543ff4afae724eb66df07f011df8198af68f99603c1cfa3562ac15bf648`.
Only geometry validation/default construction changed; five-step graded
and uniform outputs matched exactly in the post-fix parity run. All
production comparisons and final legacy regressions use the final kernel,
SHA256 `660f0c508b0374d6b2385a1f5990a9606b2d2098c9ed10008bbb29daf43652b6`.
Per-command manifests preserve the differing intermediate snapshots rather
than representing the entire campaign as one unchanged tree. The common
case-packet SHA256 is
`fbc82ef2693f000aa373ee58a3939134eb44fea325a5db32700e11b4516af896`.
