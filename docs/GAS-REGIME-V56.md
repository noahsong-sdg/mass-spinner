# Neutral-gas thermal regime assessment

## Question and traced execution path

The v55 wall refinement qualifies a mathematical wall transient; it does
not establish neutral-gas uniformity or a physical film coefficient.
This assessment addresses that remaining assumption before adding a gas PDE.

`src/fuel-centrifuge-ui.js` supplies initial neutral pressure, temperature,
geometry, pair and composition. `simulateFuelOperation` constructs fixed
neutral inventory `N=p0*V/(k*T0)` and capacity `Cg=3*N*k/2`; accepted thermal
states evolve mean pressure as `p0*T/T0`. The source callback deposits
prescribed Ohmic/slip/redistribution heat in this single reservoir.
`advanceFuelThermal` exchanges heat with the solid using user film `G`,
plus solid half-cell resistance. This nominal film is distinct from the
effective gas-to-solid-cell conductance.

The physical gap is identifiable: neither neutral thermal transport nor
gas–surface accommodation determines `G`. The mechanical `collisionHz`
is ion→neutral momentum transfer and is not a neutral–neutral collision
frequency. The radial mass diffusivity is phenomenological and is not
thermal diffusivity. A small timestep and an energy-conserving wall solve
cannot supply these missing laws. In simple terms, accurately solving the
wall does not establish how quickly the gas can bring heat to it.

No production evolution law, input default, saved record, renderer or
public interface is changed here. New scientific scripts assess the
existing inputs and accepted states. This is the smallest reviewable step
before choosing a continuum or kinetic gas extension.

## Sources and explicitly missing data

- [Bouledroua2006](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf)
  gives dilute monatomic Li fits for 100–3000 K:
  `mu=3.14e-8*T^0.863 Pa s`, `k=1.398e-4*T^0.863 W/(m K)`.
  The isotope mass/composition is unstated. Using this unchanged fit for
  Li6/Li7 is a theoretical screening proxy, not validated isotope transport.
- [NIST Hurly/Moldover2000, Tables A1–A3](https://nvlpubs.nist.gov/nistpubs/jres/105/5/j55hur.pdf)
  supplies dilute He3, He4 and equimolar transport. Four exact table
  anchors (300/500/1000/2000 K) are transcribed with units and independently
  checked. Between anchors the script explicitly uses sparse log
  interpolation with unquantified interpolation error, rather than claiming
  the paper's higher-accuracy derivative interpolation. Arbitrary enriched
  compositions and temperatures outside this interval return unavailable.
- Actual pinned [Cantera3.1.0 transport](https://www.cantera.org/3.1/reference/transport/index.html)
  evaluates an atomic-H Lennard-Jones model with explicit D/T isotope
  masses and monatomic thermodynamics. The original `gri30.yaml` and
  generated isotope YAML are retained. This is an isotope sensitivity
  proxy, not experimentally validated neutral D/T transport. The chosen
  200–3500 K calculation interval is not a measured transport-validity claim.
- Atomic D/He and T/He mixture transport is unavailable in this assessment.
  No hydrogen, helium, air or mass-diffusion coefficient is silently reused.
  Molecular He/D2 remains outside the evolving monatomic thermal model.
- No accommodation coefficient is assigned to Li/W or atomic D/T/W.
  [He/W measurements](https://doi.org/10.1016/0039-6028(74)90166-6) at
  specific surface/temperature conditions are evidence of surface
  sensitivity, not a transferable default. Chemistry, recombination,
  evaporation/condensation and charged-particle energy remain unqualified.

These data choices and alternatives are detailed in the independent
[transport-source review](reviews/v56-gas-transport-sources.md).

## Regime quantities and interpretation

The gas transport mesh uses equal-volume `r²/a²` cells. Despite the names
`lightMass` and `heavyMass`, these arrays are separately normalized species
number inventories. With `M` cells, local number density is
`n_s,i = [p0/(k*T0)] * x_s * M * probability_s,i`.
The actual accepted inventories are used, not a substituted centrifugal
equilibrium reference or the solid thermal mesh. An absent species has
zero density; an empty cell remains vacuum/unresolved with no density floor.

The [Sharipov/Seleznev mean-free-path convention, Eq2.3](https://srd.nist.gov/jpcrdreprint/1.556019.pdf)
is `lambda_mu=(mu/p)*sqrt(pi*k*T/(2*m))`. It is a viscosity-based transport
length, not a measured collision distance. `mu/p` is a stress-relaxation
scale, not a measured neutral collision time. Mixture use remains
conditional on the corresponding transport proxy and local composition.
We inspect `lambda_mu/a` and `lambda_mu*|d ln n_s/dr|`, using disclosed
cell-center log secants. One cell cannot establish a density gradient.
These screens do not resolve thermal-gradient Knudsen numbers.

Frozen-composition bulk ideal sound speed is
`c=sqrt[(5/3)*k*T/m_mean]`. Radial `a/c` and axial `L/c` estimate pressure
communication, not temperature homogenization or stratified acoustic modes.
Using bulk conductivity, diagnostic conduction times are
`t_rad,Cv=(3*n*k/2)*a²/k_g`, `t_rad,Cp=(5*n*k/2)*a²/k_g` and
`t_ax,Cp=(5*n*k/2)*L²/k_g`. The Cv/Cp distinction is retained; these are
not a solved stratified gas energy equation. Rigid rotation alone is not
evidence of turbulent mixing.

Nominal film time is `tau_f=Cg/G`. The conventional lumped-conduction
screen is `Bi=h*(V/A)/k_g = G*V/(A²*k_g)` with lateral area `A=2*pi*a*L`.
The assessment discloses heuristic Kn<0.01 and
`t_rad,Cp/tau_f<0.1` screens. They are not frozen physical acceptance gates
or sufficient conditions for a real discharge. Slow wall forcing can be
benign, while rapid internal deposition can break uniformity even with a
small film-based ratio. Numerical dt is never treated as forcing rise time.
With `G=0`, film time and its ratios are absent, not an artificial fast or
slow wall process; internal heating still needs independent assessment.

For a nonreactive, impermeable interface with local incident Maxwellians,
zero mean normal velocity and monatomic translational energy, the
[NASA TM88786 Appendix B](https://ntrs.nasa.gov/api/citations/19860022180/downloads/19860022180.pdf)
moments give
`Gamma_s=n_s*sqrt(k*T/(2*pi*m_s))`, `E_incident/particle=2*k*T`.
Thus the single-interface thermal reference is
`G_M=2*k*A*sum(alpha_s*Gamma_s)`. The script reports the fully accommodating
reference and `G/G_M(alpha=1)`. Species are summed individually; replacing
all masses by their mean in this square root is incorrect.

This is not a universal conductance bound for arbitrary distributions,
forced flow or reactive walls. For actual finite-volume trajectories,
wall density is the outer gas-cell mean, not an exact boundary distribution.
The tangential drift reference `A*sum(Gamma_s*m_s*v_slip²/2)` is reported
only diagnostically; adding it to thermal evolution would risk
double-counting the existing drag heat. Thermal and momentum accommodation
are distinct, and the two-wall `alpha/(2-alpha)` factor is not inserted
into this single-interface reference.

## Prospective scope and checks

The packet distinguishes four types of evidence:

1. Static pair-reference initial states, with each composition explicit.
   Only the Li composition is the shipped initial default; changing the
   UI pair does not automatically reset its composition slider.
2. Static probes at the displayed pressure, gas-temperature, radius and
   length grid, with selected conductances up to the allowed 1e6 W/K.
   These are assumption screens, not integrated trajectories or exhaustive
   checks of every possible slider combination.
3. An explicitly enabled thermal run per atomic pair, sampling accepted
   64-cell gas/512-step states; and Li isothermal gas-profile refinement
   at 32/64/128 cells with a fixed 1024-step run. Any execution/domain
   failure is retained rather than replaced with a successful default.
4. Conditional species assignments to the capacity-only v55 fast case.
   Its original input specifies no species. These tests do not retroactively
   identify its composition.

Independent tests must preserve fixed N during heating, species number
normalization, proper mixture wall moments, zero-G semantics, absent
species/vacuum, unavailable data and molecular rejection. The independent
auditor must import neither assessment nor transport modules, reconstruct
bulk/local quantities and integrate Gaussian wall-flux moments with SciPy.
Exact NIST anchor units and Cantera isotope masses/Cp/Cv are checked.
A deliberately perturbed physical result must be rejected. Every record
retains `qualified=false`: numerical verification of a regime diagnostic
is not experimental or apparatus qualification.

## Actual results and decision

The packet contains 3,987 records: six pair-reference initial conditions,
3,888 static slider-grid probes, 85 sampled accepted thermal states (17
per atomic pair), three isothermal Li refinement profiles and five
conditional v55 identities. All five explicitly enabled simulator runs
completed; no execution failures were substituted or omitted.

The following comparisons use the pair-reference compositions explicitly
recorded in the packet, at 10 Pa, 500 K, radius 0.12 m, length 0.8 m and
prescribed film 0.1 W/K. Only Li is the shipped composition default.

| Atomic pair | Transport basis | Initial radius Kn proxy | Bulk radial Cp diffusion | Nominal film time | Diffusion/film |
| --- | --- | ---: | ---: | ---: | ---: |
| Li6/Li7 | Published Li fit used as isotope proxy | 0.00542 | 24.133 ms | 10.857 ms | 2.223 |
| D/T | Actual Cantera atomic-H isotope proxy | 0.03028 | 2.563 ms | 10.857 ms | 0.236 |
| He3/He4, equimolar | Exact NIST 500 K mixture row | 0.03019 | 3.037 ms | 10.857 ms | 0.280 |
| D/He4, T/He4 | Mixture transport unavailable | unresolved | unresolved | 10.857 ms | unresolved |

For the Li reference, the bulk radial acoustic time is just 0.120 ms,
but thermal diffusion is slower than the imposed film response. Fast
pressure communication therefore does not justify uniform temperature.
The Li uniform-temperature approximation fails the stated conservative
radial conduction-timescale screen for the wall-driven transient. This
is an inference conditional on the transport fit, not a measured error
in gas temperature. A steady zero-flux equal-temperature state is not
made invalid merely by a large timescale ratio.

Initial equimolar helium is outside the strict small-Kn continuum screen,
suggesting slip/jump physics needs assessment before applying ordinary
continuum wall conditions. D/T gives a similar value only under its
explicitly approximate atomic-H transport proxy. No precise physical
neutral collision frequency is established for any pair.

The static matrix has 118 cases where radial conduction lumping is not
excluded by these screens. They are not physically qualified cases:
accommodation, forcing, axial deposition, phase/chemical state, charged-
particle energy and local distribution functions remain unverified.
Bulk helium data availability is not local-mixture coverage: separation
generates non-equimolar cells for which this assessment correctly leaves
local transport/Kn unresolved.

### Accepted trajectories and gas-grid sensitivity

In the opted-in Li thermal trajectory, the last sample has mean gas
temperature 1000.026 K, worst local radius Kn proxy 0.008867, and density-
gradient Kn proxy 0.005483. The bulk diffusion/film ratio is still 1.222,
so heating has not made the wall-driven uniform-temperature assumption
well supported. The core-cell density is 0.7858 of the mean, and the
outer-cell density is 1.2547 times the mean. A mean-pressure-only estimate
would conceal that spatial variation.

The separate isothermal 32/64/128-cell gas profiles, at 1024 steps, give
worst radius Kn 0.008410/0.008464/0.008492 and gradient Kn
0.007007/0.006960/0.006936. Last-cell Maxwell references are
10.9736/11.0480/11.0857 W/K. These results show the resolution dependence
and stable classifications for this slice; they do not establish a
general spatial/time convergence gate for every thermal gas field.

### The v55 fast case is a numerical stress test

Its 0.678584 microsecond nominal film time follows from the deliberately
large 1000 W/K input. For each conditional supported atomic assignment,
the initial uniform incident gas gives:

| Conditional identity | Fully accommodating Maxwell reference (W/K) | Imposed G/reference |
| --- | ---: | ---: |
| Li6/Li7 | 4.659 | 214.64 |
| D/T | 7.853 | 127.34 |
| Equimolar He3/He4 | 6.597 | 151.58 |
| D/He4 | 8.141 | 122.84 |
| T/He4 | 6.877 | 145.42 |

The interface interpretation would require accommodation above unity
under the stated stationary, nonreactive local-Maxwellian model. Thus
these compositions do not justify the fast benchmark as a physical
gas-wall transient under those assumptions. This does not revoke v55's
numerical wall convergence or identify its unspecified species, nor is
the Maxwell reference asserted as a universal bound for other physics.

At the initial Li reference, the 0.1 W/K film instead requires about
0.0134 of the fully accommodating reference. This is not excluded by
particle arrival alone, but it is not a measured Li/W accommodation
coefficient and does not cure the bulk-mixing limitation.

## Independent validation and corrected diagnostic defects

The independent auditor imports neither simulator, assessment, transport
module nor Cantera. SciPy integrates independent half-range Gaussian
moments, obtaining incident energy `2kT`. It reconstructs every atomic
case's fixed inventory, local number densities, acoustic/bulk thermal
scales, viscosity length and wall reference. All 3,338 atomic records and
649 deliberately unsupported molecular records passed the arithmetic/
scope checks. Maximum relative species-inventory reconstruction error
was 2.97e-15; all 12 independent NIST anchor transcriptions passed.

Three deliberate result corruptions were independently rejected with
assertions: a 1% capacity error, substituting the bulk `3kT/2` moment for
the effusive `2kT` wall moment, and a 1% NIST conductivity error. The
original results, corrupted copies and rejection traces are retained.
This demonstrates auditor sensitivity; it is not experimental validation.

Implementation review found and corrected these local diagnostic issues:

- **Nonfinite rotation:** the new drift diagnostic initially accepted
  NaN/infinite angular speed. It could emit nonfinite heat because the
  speed enters quadratically. In simple terms, an invalid speed poisoned
  an otherwise finite report. The API now rejects nonfinite speed while
  allowing either physical sign. Rejecting the invalid input preserves
  the physical domain; replacing it with zero would conceal the error.
- **One-cell gradient:** an empty list of intercell gradients initially
  defaulted to zero. A cell average contains no information about its
  unresolved internal variation. The result is now unavailable for a
  one-cell input; static uniform fixtures use two explicitly uniform
  cells. Reporting missing information is preferable to inventing a
  resolved gradient or prohibiting all one-cell bulk diagnostics.
- **Cantera mechanism initialization:** the first custom constant-Cp
  mechanism lacked finite temperature bounds/initial state and Cantera
  attempted a zero-temperature initial state. Explicit 200–3500 K bounds
  and a positive state fix the actual initialization domain. Custom D/T
  element masses are declared and checked rather than relying on built-in
  isotope-name behavior or borrowing ordinary-H molecular weights.
- **Reference composition labels:** switching the UI pair does not reset
  its composition control. The exporter now calls chosen pair fractions
  pair-reference states, not shipped defaults. This fixes evidence
  attribution without changing public control behavior.

The red run preserved four assertion failures plus the Cantera
initialization error. All 16 independently authored regressions passed
after correction, including fixed-N heating, number inventories, unequal
mass wall moments, vacuum/absent species, negative rotation, zero film,
missing data, molecular scope, exact NIST units and Cantera isotope mass/
Cp/Cv checks.

The [physics reviewer](reviews/v56-gas-regime-physics.md),
[wall-physics reviewer](reviews/v56-gas-wall-physics.md),
[integration reviewer](reviews/v56-gas-integration-audit.md) and
[transport-source reviewer](reviews/v56-gas-transport-sources.md) independently
reviewed their respective source/data/method scopes. Actual audited code
execution was parent-owned in the isolated VM; there was no separate
second-VM campaign by reviewers.

## Next model, scoped by this evidence

The evidence supports a spatial gas energy model before treating the
current fast transient as real hardware behavior. First qualify a simple
quiescent continuum gas/solid problem with known composition and a
justified interface law. The existing FiPy backend can support a separate
gas-energy reference. Adding a gas field to moving multicomponent
inventories also requires consistent transported energy, pressure/work
and mechanical coupling; it is not just an extra diffusion term.

At small but non-negligible Kn, assess temperature jump/accommodation;
for genuinely transitional/rarefied states, an independently configured
kinetic reference such as [SPARTA](https://sparta.github.io/doc/Manual.html)
can supply particle-wall/transport checks. Those codes do not manufacture
missing cross sections, surface coefficients, chemistry or geometry.
Data acquisition and regime-specific validation must precede a claim
of calibrated Marathon behavior. No gas PDE/DSMC or new film law has been
integrated in this assessment.

## Reproducibility and final gate

All project/dependency execution used Apple safe-dev project
`/private/tmp/mass-spinner-marathon-v35-final`, source copy
`/work/home/fix-v43-source`, offline except the explicit installation of
the separate `/work/home/gas-regime-v56-venv`. Cantera3.1.0, NumPy2.4.6,
SciPy1.17.1 and matplotlib3.11.2 are pinned and recorded. The v53/v55
scientific environment was not modified. Source copies were explicitly
transferred and SHA256 verified before/after each command.

Final command `python3 scripts/run-final-v44.py gas56` was invoked through
the trusted host controller. All nine commands exited zero:

| Check | Result |
| --- | --- |
| `npm test` | 1,139 passed; zero failed/skipped |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm run check:site` | passed |
| `npm run check:assets` | passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | passed |
| `python3 docs/reviews/v42-collision-data-probe.py` | passed |
| `/work/home/gas-regime-v56-venv/bin/python tests/test_gas_regime_v56.py` | 16 passed |

The final 593-file source manifest SHA256 is
`50904581759190854425d366cce68e67dfd1cdf01947d97e2d7c30b606477fdb`.
Two historical baseline scripts exist only in the guest and are disclosed
in receipts. The 151-file release manifest is unchanged from v55:
`64f89013eb53c7f9a08122f646707a812522fa7df3529fd0e11fcceba07caf7e`.
No production source, public behavior, deployment or browser verification
changed during this assessment.

Durable evidence is under
[`scientific/centrifuge-v44/gas56/`](../scientific/centrifuge-v44/gas56/):
raw packet/results, independent audit, negative controls, final logs,
source copies, Cantera YAML/data notices and installed-distribution metadata.
The [PNG](../scientific/centrifuge-v44/gas56/studies/findings.png) and
[SVG](../scientific/centrifuge-v44/gas56/studies/findings.svg) figures were
generated in the VM; the PNG was reopened and visually inspected.
Export: 46 files, 47,489,937 bytes, each payload verified before writing;
export-manifest SHA256
`f3dc9ef353b79353eb0ed2f9115b17da8105358974905e45b7787702b87a81c5`.

Case packet SHA256:
`3e2e58bd43bd64739e2e1b821a6baa16f470292edd1772e9657164cb0dc68394`.
Result SHA256:
`4f38f1defcd2e99ceb47dcfe58fd6fd6d19578ed4f89e3911d9aa136e9664ede`.
Independent auditor SHA256:
`87cd9fa63c2335d7f3b886ef21192aaa07112dce416b6632acfb9593fc80260b`.
Per-command receipts retain intermediate source snapshots; final plotting
and negative-control scripts were added after the unchanged assessment
calculations. Physical-qualification flags remain false throughout.
