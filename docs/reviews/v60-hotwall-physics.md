# Independent hot-wall boundary-layer physics review, v60

## Traced equations and verified boundary implementation

The execution path is `simulateFuelOperation` →
`advanceFuelMixtureThermal` in `src/fuel-gas-thermal.ts` → accepted conserved
gas/solid energies and species inventories → `fuelGasState` and playback.
The local thermal model uses monatomic ideal-gas internal energy, prescribed
Fourier conductivity and a prescribed film conductance. It is an overdamped
pressure-relaxation mixture, not a radial momentum or acoustic solver.

The equal-volume coordinate is `y=r²/R²`. Gas cells have volume
`π R² L / n`; internal Fourier conductances are `4π L κ i` at face i. This
follows from `Q=-4πLκ y dT/dy` and constant `Δy=1/n`, rather than a planar
approximation in physical radius. The gas wall half-cell is

```
R_gas,half = 1 / (8π L κ n)
```

and is in series with the film `1/Gfilm` and the first tungsten logarithmic
half-shell resistance. Both sides receive equal-and-opposite interface heat.
No missing gas half-cell or factor-of-two defect was found in this path.
The reference radius attached to a gas state is the RMS annulus radius; the
stored temperature is reconstructed from cell energy and particle number.
It must not be treated as an independently resolved surface temperature.

[FiPy's official boundary documentation](https://pages.nist.gov/fipy/en/stable/USAGE.html)
likewise derives a Robin boundary from face flux and a cell-to-face extrapolation.
It supports retaining the geometric half-cell resistance rather than applying
the external film directly to a cell-center temperature. FiPy matching a
discrete operator is useful, but does not independently establish continuum
accuracy. The prior insulated Neumann Bessel check did not test a hot Robin wall.

## Analytic resolution assessment before observing campaign results

For initial 10 Pa, 500 K monatomic gas and κ=0.1 W/(m K), the fixed-inventory
volumetric heat capacity is `Cv_vol=3P/(2T)=0.03 J/(m³ K)` and thermal
diffusivity is `α=κ/Cv_vol≈3.333 m²/s`. These are estimates for the prescribed
model, not measured lithium transport properties.

At R=0.12 m, the 64-cell equal-volume grid's outer cell is approximately
0.941 mm wide. The Fourier penetration length `sqrt(αt)` is only 0.577 mm at
0.1 microseconds and about 2.27 mm at the v59 first accepted live knot,
1.55 microseconds. This makes the earliest wall-layer shape a real resolution
question even though v59 fixed the much slower ~99 microsecond rotor mode.
Joint spatial/time refinement is required; energy conservation cannot answer it.

The default film is relatively weak: `Bi=Gfilm/(2πLκ)≈0.199`. Its 10 K/W
resistance dominates the gas half-cell's ~0.00777 K/W. An unresolved local
profile can therefore coexist with good cumulative wall heat and nearly
unchanged rotor speed. Normalizing profile error by the 500 K background can
hide a large fraction of the actual early heating signal.

## Independent continuum reference and gates

Authored `scientific/hotwall-boundary-v60/robin-reference.py` for execution only
inside the existing safe-dev SciPy environment. It imports no production
geometry, material, integration or response helpers.

The isolated limit has fixed species inventories, zero rotation and no gas
source, initially uniform gas, and a thermostatted hot solid. The source callback
deposits exactly the heat taken from the solid, so a uniform wall stays fixed;
the exported wall temperatures must verify this. This compensation is a test
thermostat, not a proposal to deposit physical wall-drag heat into a real vessel.

For the continuum cylinder, regular radial modes are `J0(μr/R)`. Its Robin
eigenvalues solve `μ J1(μ)=Bi J0(μ)` and expansion coefficients of uniform
initial data are

```
A_m = 2 J1(μ_m) / [μ_m (J0(μ_m)²+J1(μ_m)²)]
T(r,t) = Tw - (Tw-T0) Σ A_m J0(μ_m r/R) exp(-α μ_m² t/R²)
```

The analyzer integrates each J0 mode analytically over the exact physical
annulus. This avoids comparing a finite-volume average with a continuum point
value. It also computes the surface temperature, physical film heat rate and
total heat absorbed. A 512-versus-1,024 eigenmode check must make temperature
truncation smaller than `1e-8 K` at every positive sampled time. Initial data at
t=0 are inserted exactly rather than approximated by a truncated series.
The continuum target uses the physical film at r=R. The extra finite-solid
half-cell resistance is evaluated independently and its effective-film
continuum correction is reported separately.

Primary reference for the cylindrical radial operator and Bessel structure:
[NIST DLMF §10.73](https://dlmf.nist.gov/10.73). The Robin expansion and
annulus-integral formulas here are independently derived from that operator.

Gates registered before seeing the study output:

- Maximum annulus-average temperature error ≤0.1 K.
- Maximum profile error ≤5% of the reference's actual surface heating signal
  at that time, evaluated when that signal is at least 0.01 K.
- Wall heat-rate error ≤1% and cumulative absorbed-heat error ≤1%.
- Surface error and error relative to each locally heated cell are reported as
  diagnostics; the latter can overweight exponentially small profile tails.

The analyzer deliberately retains accuracy failures instead of raising a
solver-success exception. Invalid energy/flux identities, a drifting thermostat
or an unconverged eigenseries do raise errors. No scientific code was executed
on the host by this reviewer.

## Required interpretation of full-mixture refinement

The analytic reference validates a fixed-inventory Fourier limit only. The
full rotating mixture also transports species enthalpy, changes local heat
capacity and neutral inertia, and exchanges signed rotational work. Its study
must therefore independently retain species positivity, inventory, energy,
angular momentum and reduced entropy checks.

Across different gas meshes, compare the same physical annuli. Project number
and internal energy conservatively, then reconstruct `T=U/(1.5kB N)`; an
unweighted average of temperatures is wrong once densities vary. Compare
cumulative number distributions and integrated energies as well as local
temperatures. Across time meshes, use common physical observation times and
include the earliest wall heating and every intervention. A diagonal refinement
of space and time alone can conceal cancellation; include fixed-space and
fixed-time refinements.

No pass/fail judgment about the live default is asserted from the preceding
scale estimates alone. Actual campaign output and reference-truncation checks
must be inspected before final approval. Physical accommodation, transport
coefficients and empirical Marathon-device calibration remain outside the
numerical convergence claim.

## Executed reference and joint-study evidence inspected

Inspected the parent's actual `hotwall60-robin-emit`,
`hotwall60-robin-reference` and `hotwall60-oracle-tests` receipts and logs.
All three commands exited zero with 624 inputs verified before/after, SHA-256
`da27314be3d279edf7092538a3d780b58c421802a9a56b67cd6cc81a79e6d3ef`.
The independent oracle's three unit tests passed: physical Robin eigenmodes and
annulus integrals against quadrature, absorbed-energy derivative equal to wall
heat flux, integrated temperature equal to gas energy, and deliberate corrupted
energy/flux rejection.

Read all ten actual cases in
`scientific/centrifuge-v44/boundary60/studies/hotwall60-robin-result.json`.
Six pass the registered accuracy gates; four failing cases are retained.

| Fourier-limit case | Max annulus-temperature error | Max error / actual surface heating | All four accuracy gates |
|---|---:|---:|---|
| 64 gas / 512 steps | 0.36948 K | 9.4565% | fail |
| 128 gas / 512 steps | 0.36962 K | 12.8263% | fail |
| 256 gas / 512 steps | 0.36969 K | 14.1131% | fail |
| 64 gas / 2,048 steps | 0.09234 K | 3.9369% | pass |
| 64 gas / 8,192 steps | 0.02309 K | 2.7316% | pass |
| 256 gas / 8,192 steps | 0.02311 K | 1.2241% | pass |

These Fourier controls use a 20 ms quadratic time grid, not the live one-second
rotor-graded partition. Their numerical values must not be relabeled as measured
errors of the full rotating live trajectory. They independently demonstrate
that increasing spatial resolution alone cannot cure coarse-time thermal error.
At 512 steps the finer mesh exposes more of that time bias; at fine time,
the normalized wall-layer shape error decreases with spatial refinement.

The reference's 512-versus-1,024-mode difference is at most `6.83e-13 K`.
The largest finite-solid-half-cell continuum correction is `1.52e-5 K`, even
including the deliberately coarser 32-cell control. Neither accounts for the
observed failures. Independent reconstructed interface flux, gas energy and
thermostat checks passed. All ten pure-Fourier cases pass heat-rate and absorbed-
heat gates, illustrating why heat-only qualification misses profile error.

The actual full-mixture 3×3 matrix separately compares 64/128/256 gas cells
and 512/2,048/8,192 nominal intervals against its finite 256/8,192 reference.
I inspected its saved summary. The live 64 gas / 16 wall / 512 nominal case has
maximum common-annulus temperature difference **0.96664 K**, maximum local-
heating relative difference **90.54%**, and maximum instantaneous wall-rate
relative difference **5.948%** over the declared active-signal domain. All
three fail. Its maximum rate difference normalized by initial 50 W load is
only **0.1756%**, and cumulative wall heat differs by **0.2959%**. Those smaller
metrics cannot be substituted for the failed instantaneous/local gates.
Rotor errors remain below 3%, and conservative budgets remain closed.

**Interim verdict before the finer campaign:** the live 64/16/512 defaults are not
qualified for the hot-wall gas boundary layer. The dominant demonstrated error
is temporal, not a missing interface resistance. The fixed-inventory continuum
control and independently checked cross-grid comparisons are valid within their
stated limits. Qualifying a replacement full-mixture setting still requires
the finer-reference self-check and isolated wall-mesh sensitivity; passing
against one finite reference alone is not a continuum proof. No production
physics or gate threshold was altered by this reviewer.

## Final finer-reference review

Independently inspected the completed 19-case analysis in
`scientific/centrifuge-v44/boundary60/studies/refined/hotwall60-joint-result.json`,
its independent Python analyzer and five adversarial tests, the raw-export
manifest, and the actual `hotwall60-reference32-fixed`, `hotwall60-joint-early`,
`hotwall60-joint-analysis` and `hotwall60-oracles-final` receipts/logs. These
commands exited zero on 627 verified inputs, SHA-256
`de763c91bd6d19db45c6e9e2697b417f249d267e704618185820c8aa8482aa85`.
The eight Python oracle/analysis tests passed. This reviewer launched no
additional project or scientific execution.

The full reference has 512 gas / 128 wall cells, 32,768 nominal intervals and
55,733 accepted steps over one second. Its largest reported species,
angular-momentum, mechanical-energy or thermal-energy residual is `6.72e-14`;
all reported gas temperatures and species inventories remain positive. Those
are necessary invariant checks, not estimates of truncation error.

The composite finite reference replaces the first 2 ms observations with a
separate 512/128/16,384-interval early-window integration. This much shorter
horizon puts smaller steps directly into the earliest layer. The production
emitter uses `sampleFuelTransport` at common observation times: between accepted
knots these are conservative canonical playback interpolants. The analyzer adds
no further time interpolation or resampling. Its metadata
`noInterpolationOrResampling` describes that construction step; it must not be
read as saying every observation is an accepted integration knot. The study
therefore measures integration plus playback error at the declared times.

| Independent comparison | Max common-annulus temperature difference | Max local-heating relative difference |
|---|---:|---:|
| Full 512/128, 16,384 → 32,768 intervals | 0.01623 K | 2.3036% |
| Full 256/64 → 512/128 at 16,384 intervals | 0.001442 K | 0.3333% |
| Early 256/64, 8,192 → 16,384 intervals | 0.001209 K | 0.3565% |
| Early 256/64 → 512/128 at 16,384 intervals | 0.001325 K | 0.3394% |
| Full 512/128/32,768 versus early-window reference, shared early times | 0.008201 K | 1.9996% |

Every listed comparison passes the unchanged rotor, absolute-temperature,
local-heating, instantaneous-wall-rate and cumulative-wall-heat gates.
The local-heating ratio uses reference cell heating of at least 0.1 K, unlike
the separate Fourier oracle's surface-heating normalization. These are finite
refinement differences, not rigorous continuum error bounds or qualification
of pointwise temperatures in the vanishingly small heating tail.

Against this stronger composite reference, the live 64/16/512 trajectory has
**1.01528 K** maximum annulus-temperature difference, **84.0226%** maximum
local-heating difference and **6.26712%** instantaneous wall-rate difference.
Those three gates fail; the cumulative wall-heat difference is **0.31326%** and
passes. The changed numbers supersede the weaker-reference differences above;
the default failure conclusion is unchanged. The controlled 16 → 64 wall-cell
refinement at fixed 64 gas cells / 8,192 intervals changes the gas profile by
only `4.45e-6 K`. Extra solid cells cannot repair the observed gas/time error.

The two alternative full trajectories passing all finite-reference gates are
256 gas / 64 wall / 16,384 intervals and 512 / 128 / 16,384. Their maximum
local-heating differences are 4.6833% and 4.2031%, respectively. They are useful
demonstrated refinements, but the first is close to the 5% gate and the reference
itself retains measured finite-step uncertainty. Do not promote either result
to an unconditional continuum-accurate live default. The full 32,768-interval
trajectory's comparison to the composite is a reference-overlap consistency
check, not a third independent passing alternative.

### Diagnostic failure and minimal correction

The long reference initially finished integration but failed while computing
terminal conservation diagnostics. Spreading over 111,000 balance-error values
into `Math.max` exceeded the JavaScript argument-list limit. In simple terms,
the result was too large to hand to one function call; the thermal solve had
not diverged. `simulateFuelOperation` now accumulates the same three maxima in
one streaming loop over retained checkpoints, preserving the prior finite-value
and conservation checks. This avoids the argument limit and temporary arrays
without discarding history, reducing the convergence study or changing physics.
It is preferable to raising memory limits, truncating observations or adding a
fallback solve because the root cause is only diagnostic argument construction.

Inspected `tests/hotwall-large-history-v60.test.ts` and the actual before/after
logs: a two-cell 32,768-interval history reproduces the call-stack failure before
the change, then passes after it while retaining more than 50,000 accepted
states. The five-file targeted command passes all 12 tests, including
continuation, canonical projection, entropy/first-law and exact rotor checks.
The before receipt has SHA `fbfd625142e34e2fbf05c46995da4a900fd4e70dd19097694500ff6dd0b54f22`;
the passing after receipt uses the `de763c91…` snapshot above. The correction
changes no persisted fields, thermal coefficients, solver tolerance or public
physical behavior. Release-wide build/typecheck and deployed UI checks are
parent-owned final gates, not verified by this scientific reviewer.

**Final scientific verdict:** the existing live defaults conserve the reduced
model's budgets but do not resolve the hot-wall gas boundary layer under the
registered accuracy gates. The strongest demonstrated root cause is temporal
under-resolution, with spatial resolution separately important at early times;
the interface's half-cell resistance is already present. The independent Robin
continuum limit, axis-separated full-mixture refinements, early-window study and
wall-only control support that conclusion. They do not supply missing physical
gas-surface data or empirical device validation.

## Physical-regime caveat for the earliest layer

Rechecked the prior v56 assessment and its attributed transport implementation.
Its initial lithium viscosity-convention `Kn_R≈0.00542` corresponds to a
mean-free-path **proxy** of about 0.65 mm. That is comparable to the modeled
0.577 mm penetration scale at 0.1 microseconds. A radius-based continuum screen
does not establish that this much shorter, much faster thermal perturbation
obeys local Fourier transport. The baseline gradient-length and perturbation
wavelength screens are also distinct; a weak temperature perturbation can have
a small fractional gradient while changing on a kinetic timescale.

The [Sharipov–Seleznev review](https://srd.nist.gov/jpcrdreprint/1.556019.pdf)
defines the viscosity-based path convention; it is not a measured collision
distance for the actual isotope mixture. The [Hadjiconstantinou review](https://web.mit.edu/ngh/www/PhysFluids_18_111301.pdf)
distinguishes collision-dominated outer hydrodynamics from kinetic wall layers.
That is why numerical convergence of a sub-microsecond continuum profile is
not physical validation of the real gas-wall response.

The [Bouledroua monatomic-Li paper](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf)
does supply theoretical dilute-gas viscosity and conductivity fits, with units
and a 100–3,000 K range. Its unresolved isotope composition and the interface's
unknown surface accommodation remain qualifications. The live model's chosen
κ=0.1 W/(m K) is an independently prescribed coefficient, not automatically that
paper's Li conductivity at 500 K. The mechanical `collisionHz` and phenomenological
species D cannot be reused as neutral thermal collision data. No numerical
refinement, film clamp or changing initial pressure supplies those missing
physical inputs. The present study should therefore report resolved mathematics
and unqualified early-time physical regime separately.
