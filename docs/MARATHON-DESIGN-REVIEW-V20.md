# Marathon design review for Playground 02

Independent source and implementation review, 7 November 2026. No company code,
simulator, tests or browser-origin content was executed. This report recommends
scope and validation gates; it does not validate a Marathon operating point.

## The architectural boundary comes first

The compact system described on Marathon's [beam-driven-fusion page](https://www.marathonfusion.com/beam-driven-fusion/)
uses RF-produced deuterium ions, electrical acceleration and a solid lithium
tritide fusion layer on a cooled substrate. This supports the architecture drawn
in 02. It does not establish the simulator's numerical defaults or the materials
used in its other hardware.

The company's [homepage](https://www.marathonfusion.com/) additionally describes
evaporating lithium, depositing and cooling it, and regenerating the tritide
target in place. The same page separately introduces a future power plant,
blanket, fuel processing, lithium enrichment and a larger heating beam. These
systems should have distinct labels and material records.

The linked [alchemy paper](https://www.marathonfusion.com/alchemy.pdf), Sections
3–4, models a future fusion-power-plant blanket: fast neutrons drive
198Hg(n,2n)197Hg, followed by electron capture to stable 197Au; the additional
neutrons support tritium breeding. Its representative OpenMC model is an
ARC-class tokamak, not the compact LiT source. The published model includes
tungsten armor, V-4Cr-4Ti structural layers, a Eurofer97 tank, a Hg/Li multiplier
and an outer FLiBe region. These are paper-model choices, not a bill of materials
for Marathon's compact hardware. The paper uses OpenMC, Paramak,
openmc-plasma-source and cad-to-dagmc; such blanket predictions require neutron
transport and depletion, not the browser's charged-ion slab model. Its simulated
gold yield, tritium breeding and inventory tradeoffs are conditional design
studies, not demonstrated plant production. The current arXiv record is
[2507.13461v3](https://arxiv.org/abs/2507.13461v3), revised 3 August 2025.

**Recommendation:** keep 02 as the compact source. A clearly separate future
blanket diagram can explain the research connection without presenting a
nonexistent coupled reactor simulation.

## What the current code actually computes

Reviewed `src/fusion-reactor.ts`, `src/fusion-playground.ts` and
`src/fusion-ui.js`. The backend implements cold stationary tritium, pure
monoenergetic singly charged D+, a homogeneous tritium column, prescribed linear
slowing, interval attenuation, Bosch–Hale D–T cross sections and an explicit
energy ledger. The code correctly converts laboratory to centre-of-mass energy
with its stated mass-number approximation, tracks reaction-carried beam energy,
distinguishes layer heat from conditional stopped-substrate heat, and leaves
zero-current gain undefined.

The energy scan holds target column and fractional slowing fixed. It therefore
scans a family of imposed stopping laws, rather than one measured LiT target at
different energies. Beam area changes geometry and heat/area; it does not solve
neutron flux at an irradiation sample. Exposure multiplies the instantaneous
neutron rate by time without evolving target condition. These limitations are
already declared in code, but they remain the most important physics gaps.

## Ranked additions and minimum acceptance gates

The ranking below is an inference from the source architecture and traced code.
It is not an assertion that the public record provides the required calibration.

### 1. Couple the target's composition, thickness and stopping

**Problem and cause:** column and fractional energy loss are independent knobs.
Technically, the solver prescribes energy as a linear function of fractional
column rather than solving transport through a specified material. Simply,
users can create targets whose tritium content and stopping power need not
correspond to any physical slab.

For a first straight-track continuous-slowing model, use physical depth `x`,
an explicitly sourced tritium density `n_T(x)` and stopping `S(E,x)`:

```
dE/dx = -S(E,x)
dP_survive/dx = -n_T(x) sigma_DT(0.6 E) P_survive
p_fusion = 1 - P_survive(x_end)
```

The stopping matrix persists when tritium is removed: an empty-T control must
not silently turn material stopping off. Do not extrapolate the cross-section
fit or stopping table below its supported range. A full stopping treatment
needs a declared terminal treatment for the low-energy remainder; the current
backend deliberately does not provide one.

**Fix and choice:** add a separately validated physical-target mode once usable
deuteron/LiT stopping and composition data are available; preserve the current
mode as explicitly imposed-column exploration. This is preferable to relabeling
the existing toy inputs as real LiT dimensions or treating arbitrary proton
stopping data as measured deuteron stopping.

**Gate:** independent range/yield reference, analytic no-stopping limit,
thickness refinement, supported energy boundaries, zero-T but nonzero stopping,
reaction/particle balance and the existing energy ledger. Agreement with an
internal quadrature alone is insufficient.

### 2. Make target heat and regeneration a state, not only a readout

In-situ target renewal is a distinguishing company-described feature. At present
the same target state survives any exposure. That is acceptable for a frozen
target calculation, but cannot demonstrate continuous operation or lifetime.

An explicitly illustrative lumped model could use:

```
C_th dT/dt = P_deposited - G (T - T_coolant)
dN_T/dt = R_load - R_fusion - R_other_loss - lambda_T N_T
```

`P_deposited` must keep the existing layer/substrate distinction. `G`, `C_th`,
loading and loss laws need material/geometry provenance and uncertainty. Fusion
consumption is known from the reaction rate; thermal release, erosion and
isotope exchange cannot be inferred from it. The inventory is for the specified
target area, whereas `targetColumnM2` is per area.

**Fix and choice:** show target renewal as a clickable process immediately;
introduce time evolution only with declared closures and data. This is preferable
to invented failure temperatures, unconstrained steady-state colors or a
constant target that appears to predict longevity.

**Gate:** zero-input cooling to coolant temperature, constant-load analytic
thermal solution, nonnegative inventory, atom balance, time refinement, exact
off/on limits, and independent target-temperature/loading measurements before a
predictive claim. A single thermal node does not resolve surface peak gradients,
stress, melting, blistering or coolant hydraulics.

### 3. Add the destination of the neutrons

Marathon explicitly identifies [materials irradiation](https://www.marathonfusion.com/fusion-materials/)
and [medical-isotope production](https://www.marathonfusion.com/radiopharma/) as
applications. The current model ends at production. The important next object
is a separate irradiation specimen or feedstock target, with its own material,
area, distance and response—not another label on the LiT fusion target.

For a deliberately restricted isotropic far-field point source:

```
phi(r) = Ndot_n / (4 pi r^2)
fluence = integral phi(t) dt
```

This is a conditional geometric approximation, not a prediction near the extended
beam footprint or through shielding. A finite source needs a surface/volume
integral and a declared angular source. The current product-energy model supplies
approximate mean energies, not a differential neutron spectrum.

A conditional single-reaction irradiation calculation can subsequently use:

```
R_product = integral_V integral_E n_feed sigma_product(E) phi(E,x) dE dV
dN_product/dt = R_product - lambda_product N_product - R_burnup - R_extract
```

**Fix and choice:** first show sample geometry and the production/flux boundary;
add response curves only with sourceable cross sections and geometry. This is
preferable to dividing neutron production by beam area and calling the result
specimen flux, DPA or isotope yield.

**Gate:** inverse-square and solid-angle analytic limits, distance/mesh
convergence, zero-source response, spectrum-aware reference, activation/decay
solutions and an independent transport result for any complex geometry.

### 4. Keep gain and practical beam delivery visible, without inventing geometry

The current `P_beam = IV`, `Ndot_D = I/e` and accelerator-only wall input are
useful. Retain these alongside neutron output and heat as navigation is
simplified. Smaller spot plus larger current raises current density `I/A`; it
is not a free intensity improvement. A true beam-delivery model would require
source emittance, space charge, extraction geometry, molecular fractions and
transport losses, none of which is calibrated here.

For a future singly charged molecular mixture with `k` deuterons per ion, a
component current `I_k` and acceleration voltage `V`:

```
Ndot_n = sum_k (I_k/e) k p_fusion(e V/k)
P_beam = V sum_k I_k
```

This is a possible extension, not a claim that Marathon's advertised D+ beam
has a particular impurity fraction. Do not use a planar Child–Langmuir limit as
a universal source bound without source geometry and boundary conditions.

## Clickable components: safe, useful material descriptions

| Object | What a component inspector can state | Evidence boundary |
|---|---|---|
| Feed / ion source | Deuterium gas; RF plasma ionization; source of D+ | Company beam-driven architecture. Source-body and window materials are not specified in the reviewed sources. |
| Accelerator | Electric field supplies beam energy in keV | Electrode alloy, insulators and dimensions are unspecified. Illustrative rendering must say so. |
| Fusion layer | Solid lithium tritide; dense tritium-bearing reaction layer | Company-described material. Its actual density, thickness, isotopic loading and temperature are not supplied by the reviewed public description. |
| Target renewal | Lithium deposition and tritide regeneration | Company-described process. No measured renewal law is provided. |
| Cooled substrate | Supports target and removes deposited heat | Company-described function; substrate alloy, coolant and channel geometry are unspecified. Copper must not be asserted as Marathon's choice merely because it is plausible. |
| Neutron output | D–T reaction products; energetic neutrons and helium-4 | Particle stream, not hardware or a rendered ray-count calibration. |
| Irradiation sample | User-selected specimen or feedstock, distinct from fusion target | Mark proposed sample geometry and material as scenario inputs. |
| Vacuum chamber / coils | Function of the illustrated supporting hardware | Use “illustrative hardware; material unspecified” unless separately documented. Visual color does not identify an alloy. |

An inspector should distinguish **company description**, **paper-model choice**,
**illustrative choice** and **unspecified**. “Unknown” is a valid material value.
Do not import the alchemy paper's tungsten/vanadium/steel blanket materials into
this compact source. The material map above is intentionally more conservative
than a realistic-looking render.

## What belongs in a separate future-plant extension

If a future blanket playground is added, its core interaction is the tradeoff
between multiplication, lithium breeding, useful transmutation, parasitic
capture and leakage, with an explicit tritium balance. A recycled triton is not
a newly bred one. One could display:

```
TBR = tritium born in blanket / tritium consumed by fusion
dN_T,plant/dt = R_breed - R_fusion - R_loss - lambda_T N_T + R_external
```

The authors' [Isotope Production in Fusion Systems v2](https://arxiv.org/html/2512.09242v2)
studies isotope value, feedstock inventory, wall loading and economic rather
than electrical breakeven. Its `Q_plas` is not this source's `Q_beam`. Its
analytic blanket approximations and tokamak/mirror cases do not calibrate LiT
beam-target performance. A useful extension would replay provenance-bearing
OpenMC/depletion scans; it should not claim to solve them from a few browser
sliders.

The more recent [terbium-149 preprint](https://arxiv.org/abs/2609.25554)
explicitly proposes a two-stage pathway with long-lived Gd-150 feedstock and
later proton-cyclotron conversion, while noting an unmeasured cross section.
The [lead-212/actinium-225 generator paper](https://arxiv.org/abs/2609.19166)
proposes generator-parent routes rather than a single direct-output neutron
reaction. These are strong reasons to model reaction chains and decay/processing
time before displaying medical doses; they are not validation of delivered
product or commercial throughput.

## Implementation order

1. Now: cleaner controls; clickable source, accelerator, LiT layer, substrate and
   optional sample; honest material/provenance labels; compact power/neutron/heat
   readouts and expandable assumptions. Keep calculations and defaults intact.
2. Next bounded physics module: physical LiT target/stopping data and independent
   yield benchmark. This is the highest-priority numerical fidelity improvement.
3. Next: conditional thermal/loading dynamics and sample geometry, each with
   separate validation. Retain an explicitly frozen-target mode.
4. Separate project stage: transported spectra, irradiation/depletion and
   future-blanket scans using an established external solver.

No primary source reviewed here provides a complete measured beam/target
operating dataset sufficient to turn 02 into a predictive Marathon digital twin.
The source-boundary recommendations are verified against public text; the
ranking and proposed equations/modules are engineering recommendations. The
PDF text was readable through the research tool; its screenshot endpoint failed,
so this review makes no visual-layout claim about the paper. The managed-denied
Mass Spinner origin was not accessed directly or indirectly.
