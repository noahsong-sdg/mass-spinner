# Playground 02: independent adversarial Marathon review

Reviewed 7 November 2026. The initial pass comprised primary-source research and
application source inspection. A subsequent assigned implementation and isolated
test pass are recorded below. No downloaded author code, scientific solver or
browser/GPU was executed. The safe-dev operating rules were read. The deployed
origin was not accessed by an alternate route.

## Decision

The existing energy ledger and explicit assumed-input scope are worth keeping.
The largest immediately useful addition is **where produced neutrons go**, rather
than another source-efficiency curve. The most important target detail to expose
is the distinction between **a tritium-bearing layer, its backing/cooling, and
target replenishment**. A mercury blanket belongs to a separate proposed
power-plant context; adding it around the compact source would conflate machines.

These are recommendations, not independent validation of Marathon performance.

## Evidence checked and machine boundary

The current [beam-driven-fusion page](https://www.marathonfusion.com/beam-driven-fusion/)
describes RF production of deuterium ions, electrostatic acceleration and a solid
lithium-tritide fusion layer on a cooled backing. This supports the existing
beamline schematic. It does not provide the backing alloy, cooling-channel
geometry, ion species fractions or a qualified target stopping/cooling curve.

The [home page](https://www.marathonfusion.com/) additionally describes evaporated
lithium deposited and cooled into a solid layer, with LiT formation and in-situ
regeneration. Its compact-source application drawing includes a separate
transmutation target and materials irradiation. Those are company descriptions,
not independently verified operating data. Its displayed power/flux headline
numbers lack enough conditions and uncertainties to calibrate this simulator.

The [alchemy paper](https://www.marathonfusion.com/alchemy.pdf), sections 3–4,
instead studies an enriched mercury multiplier and lithium breeder in an
ARC-like tokamak blanket using OpenMC. Its simulated structural materials
(tungsten, V–4Cr–4Ti and Eurofer97) do not establish the compact beam device's
materials. Fast-neutron multiplication, parasitic capture and subsequent tritium
breeding constrain that concept. Its mercury-to-gold chain includes radioactive
intermediates and decay, not immediate stable gold. Check the
[v3 record](https://arxiv.org/abs/2507.13461v3), whose history explicitly corrects
the decay notation.

The newer [isotope-systems paper, v2](https://arxiv.org/html/2512.09242v2)
distinguishes isotope-only and electricity-plus-isotope economics, examines
irradiation geometry and explicitly calls for detailed neutronics, activation
and experimental validation. Its thermal-plasma gain is not this app's beam
gain. An isotope source can have value without net electric production; a
profitable plant is not established by either gain alone.

## Ranked implementation recommendations

### 1. Make irradiation geometry visible, with an explicit approximation boundary

**Observed gap:** `simulateFusionBeam` returns birth neutrons per second and total
neutrons. The schematic's outgoing rays have no sample, interception or transport
calculation. `beamAreaM2` changes the beam footprint and heat per area, not the
total source rate. This is correctly disclosed, but leaves the compactness/useful
neutron tradeoff hard to explore.

**Technical cause:** the calculation ends at the source boundary. In simple
terms, making a neutron and delivering one to a sample are different events.

**Smallest useful change:** add a separate, clearly illustrative irradiation
view, with sample distance and sample size controlling the view. If any flux
number is introduced, use a named analytic idealization and display its domain:

```text
Unattenuated isotropic point-source approximation:
    phi(r) = R_n / (4 pi r^2)                [m^-2 s^-1]
    fluence = phi(r) * exposure              [m^-2]
```

This is an algebraic recommendation, not a validated Marathon angular model.
Require positive distance and a stated far-field interpretation relative to the
finite source size. Do not apply this law at the target surface. A schematic
sample can be added without a flux prediction if the geometric approximation
cannot be communicated cleanly. Beam area is not a neutron detector area.

**Why chosen:** it explains an essential application with minimal numerical
scope. A full radiation-transport implementation needs source angular/energy
data, geometry, evaluated nuclear data and independent benchmarks. A generic
interception slider falsely presented as a computed flux would be weaker.

**Acceptance gates:** R_n=0 gives zero flux; doubling r quarters idealized flux;
doubling exposure doubles fluence; m^-2 to cm^-2 divides by 10^4; changing sample
geometry must not silently alter source production or the source energy ledger.

### 2. Add a provenance-aware target/material inspector now

**Observed gap:** the current schematic combines a target line and cooled
substrate but provides no interactive explanation. The target column and
stopping fraction are independent effective inputs in `fusion-reactor.ts`.

**Technical cause:** there is no material/composition/depth closure. Put simply,
the model knows how many T nuclei are encountered and an assumed energy loss;
it does not know a manufactured slab's thickness, density or temperature.

**Smallest useful change:** click/focus the LiT layer to show its fusion role,
the distinction between elemental lithium and tritide, and that target formation
and regeneration are publicly described. Click backing/cooling to explain its
heat-removal role with **material not publicly specified in checked sources**.
Identify RF source gas as deuterium and accelerated modeled species as D+;
do not label the RF plasma as the fusion burn volume. Color and rendering are
illustrations, not material identification. Keep any generic engineering alloy
suggestion explicitly separate from Marathon's disclosed construction.

**Why chosen:** this answers the user's component question without inventing a
bill of materials, a target replacement time or a thermal qualification curve.
Reusing tungsten/vanadium/steel from the tokamak paper for the beamline would be
a concrete provenance error.

### 3. Keep the energy-scan optimum explicitly conditional on assumed stopping

**Observed gap:** `fusionPlaygroundData` scans energy at fixed T column and fixed
fractional energy loss. The code comments correctly warn that this is a family
of imposed stopping laws, not a scan of one physical LiT target. That qualification
must be near the plot, not only in developer comments or a distant notes panel.

**Technical cause:** physical stopping links E(x), composition and depth; changing
E0 while holding a fractional energy loss fixed changes the implied stopping law.
In simple terms, the toy target changes its behavior along with the beam knob.

**Fix now:** label the scan as conditional on the selected column and imposed
fractional slowing. Avoid “best operating energy” or “LiT optimum.”

**Next physics stage:** a versioned material model needs n_T(x), energy-dependent
stopping S(E,x) and an actual depth coordinate. Integrate

```text
dE/dx = -S(E,x)
dF/dx = -n_T(x) sigma(3E/5) F
P_f = integral n_T(x) sigma(3E/5) F(x) dx
```

The existing fit-domain guard must still apply. Stopping in lithium, impurities
or substrate does not disappear when T loading is zero. Validate against
independent stopping and thick-target-yield data before replacing the current
explicit assumed-input model. A different integrator alone cannot supply the
missing material data.

### 4. Add dynamics only with measured or sourced closure data

Target replenishment, tritium depletion/retention, implanted deuterium, sputtering,
coolant limits, beam molecular fractions, energy spread, vacuum interactions and
angular scattering are material omissions for a predictive device simulator.
They are not established bugs in this explicitly restricted model.

Do not add an invented temperature or lifetime merely to make the display look
more physical. The present `assemblyHeatIfTransmittedBeamStoppedW` is conditional
power, not temperature. A thermal solver needs geometry, conductivity/contact
resistance, heat capacity, boundary conditions and a cooling law. A renewal model
needs replenishment/loss rates and inventory boundaries. Add each as a bounded,
testable module after the inputs exist.

## What should remain outside the compact-source controls

An optional paper-reference diagram can expose Hg multiplication, Li breeding,
decay/processing and shielding in the proposed power-plant blanket. It should
say “proposed blanket study,” and should not reuse the compact source's current,
beam area or `beamGain` as the tokamak's plasma gain. Do not invent TBR, gold
yield, shielding performance or revenue by assigning unrelated slider fractions.
OpenMC is the relevant independent transport path identified by the paper;
published, provenance-bearing benchmark curves are a better first integration
than an unvalidated live toy blanket.

## Assigned minimal implementation and verification

The parent subsequently assigned the bounded geometric reference. Added
`src/neutron-geometry.ts` and `src/neutron-geometry-ui.js`, with optional
`setupFusionLaboratory({onUpdate})` publication of the current source result or
`null` on invalidation. The beam physics kernel is unchanged.

The root cause was a missing source-output boundary: the UI ended at production,
so an irradiation view had no current source result. In simple terms, the app
could show neutrons made but not distinguish those crossing a selected sample.
An independent observer callback fixes that boundary without coupling sample
settings back into fusion production. This is smaller and more testable than
embedding sample geometry in the beam-target kernel.

The new native collapsed panel has distance (0.1–3 m) and disk-area (1–100 cm²)
controls, two current outputs and a live distance plot. For an axial circular
disk of area A at distance d from an isotropic point source, it uses

```text
a = sqrt(A/pi), h = hypot(d,a)
intercepted fraction = (1 - d/h)/2
                    = (a/h)^2 / (2(1+d/h))
crossing rate = source rate * intercepted fraction
mean current through sample plane = crossing rate / A
```

The rationalized form avoids catastrophic cancellation at large d. This is exact
for the stated point-source/disk geometry, not a solution for the actual source.
The display always names its isotropic/free-flight assumptions and distinguishes
plane current from a transport scalar flux. Beam-spot radius / distance >0.1
triggers a finite-source warning. Zero source yields exact zero outputs and
curves; invalid source settings clear stale results; a valid update restores
them. No detector response, activation, attenuation or anisotropic D–T spectrum
is claimed.

Five new tests passed in a copied Apple safe-dev VM:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-neutron-v20.Ejimme run -- ./node_modules/.bin/tsx --test tests/neutron-geometry.test.ts
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-neutron-v20.Ejimme run -- npm run typecheck
```

The final recorded invocation used `python3 verify-neutron.py` to execute those
two commands and save logs/source hashes; both exit 0. Tests check the independent
hemisphere/far-field limits, 20,000-interval radial quadrature, monotonicity,
geometric domain, finite numeric output, actual geometry input handlers and the
actual fusion callback through beam-off, empty-target, invalidation and recovery.
An initial 4/5 pass had a wording mismatch in one test regex (`ratio` versus the
displayed `radius / distance`); correcting that test produced 5/5 with no numerical
or UI behavior change.

Guest `safe-dev-9b683a4f7564a44b`; bounded staging copied source explicitly and
synced after the test correction, then installed the locked dependencies inside
the guest. Actual export: `/tmp/mass-spinner-neutron-v20-final-export`. The
source map SHA-256 is
`95b9b832e1abeedd224b97f88da5f3abc085f556653d0cd51655c7672ef8742d`.
Helper, callback and test file hashes match that actual export. The parent
subsequently changed only the new panel's CSS classes on host; that presentation
edit is outside this narrow tested snapshot and belongs to the final integration
gate. Full build/site verification is owned by the parent.

## Evidence boundary

Source inspection covered `src/fusion-reactor.ts`, `src/fusion-playground.ts`,
`src/fusion-ui.js`, the Playground 02 HTML, and the existing Marathon architecture,
scope and systems reports. Primary web sources above were reopened in this
review. No browser/GPU appearance, deployed controls or new scientific solver run
is claimed. The geometric-reference tests above do not validate Marathon hardware
or the omitted radiation-transport physics.
