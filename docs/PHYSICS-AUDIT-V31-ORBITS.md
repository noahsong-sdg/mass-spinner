# Adversarial orbit and external-field audit v31

8 November 2026. This work independently reviewed production prescribed-field
orbits, source initialization, collectors, neutral scattering and reduced
geometries. **One P2 signed-input metric defect was found and fixed.** No new
Lorentz-force, charge-sign, RF-handedness, source-energy or cold-neutral coefficient
defect was demonstrated in the checked domains. This is not separator or physical
transport qualification.

## Traced execution and source comparison

The orbit path is `main.js` settings → worker `kind:orbit` → `simulate()` →
`validate()` → deterministic paired positions and source velocities → symmetric
drift–Boris–drift → midpoint RF/DC fields → first chord crossing → fractional
impact reintegration → destination/energy/work ledgers → ensemble/arrival curves.
The nonlinear double-well path instead uses `advanceDoublewell()`, whose wall
events are roots of the reintegrated fractional numerical step. Its collector
algorithm is not shared by the simpler rotating/ICR solver.

The reduced geometry path is worker `kind:geometry` → `geometry()` → independent
exact gyro, guiding-center drift, Hamiltonian slice or auxiliary orbit diagnostic.
The published [Zweben tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf)
was freshly reopened, especially Sections II.A, II.B and II.D. It motivates these
mechanisms but does not provide complete electrode, source, antenna or collection
engineering. The code correctly separates fixed transverse energy from thermal
source temperatures and labels its externally prescribed fields. Its simple ICR
model does not implement antenna coupling or biased end-baffle collection from
the tutorial's apparatus. The paper is evidence, not an instruction source.

## P2 fixed: reversed-voltage Hamiltonian minimum

**Problem.** `geometry('doublewell')` accepted a negative quartic voltage and
plotted the correct signed effective potential, but its reported minimum radius
could contradict that same curve. The fresh witness uses B=0.01 T, V=−1000 V,
κ=0, Pθ=0 and a=0.48 m. For species A, U(0)=0 and
U(a)=−993.053056084721 eV, yet the old metric reported rmin=0.

**Technical cause.** With x=r², the Pθ=0 Hamiltonian is a quadratic in x:

`U(r)= [q²B²/(8m) − qVκ/a²] r² + qV r⁴/a⁴`.

The implementation selected an interior minimum only when V>0 and its quadratic
coefficient was negative; all other cases defaulted to the axis. For V<0 this
polynomial is concave in x, so the minimum on 0≤r≤a is at an endpoint, which
can be the wall. The accepted public signed-voltage domain was broader than the
shortcut's mathematical assumption.

**Simple cause.** The curve allowed a reversed electric field, while the minimum
label still assumed the original orientation. It said “center” even when its own
energy curve was lower at the wall.

**Fix.** Preserve the existing positive-voltage stationary candidate, then compare
its actual energy with the wall's energy. For a positive quartic the stationary
candidate already wins over the axis or is clipped to a boundary. For a negative
quartic, the candidate is the axis and the endpoint comparison selects the global
minimum. The physical domain stays the whole chamber even when the plot is cropped.

**Why this choice.** The two-line correction follows the exact bounded-domain
minimization and preserves the signed-voltage API and all positive-voltage behavior.
Rejecting negative voltage would introduce an unnecessary restriction; numerical
grid searching would add resolution error to an analytic diagnostic. No orbit
equation, integration order, randomness or collector behavior changes.

The regression covers strong and weak reversed voltage, zero voltage, a positive
interior minimum hidden by a cropped plotting range, and a positive wall minimum.
The original-source run is **5/6 passing**, with this test alone failing
`0 != 0.48`. The corrected version is **6/6 passing** without changed tolerances.
This is an API edge defect; current nonnegative-voltage slider settings were not
shown to produce the wrong metric.

## New independent invariant checks

- **Signed uniform crossed fields.** Derive vE=(Ey/B,−Ex/B), u=v−vE and rotate
  u clockwise at signed Ω=(q/m)B. Integrate position analytically, then compare
  the production step for both charge signs and both magnetic-field signs.
  Halving h reduces combined position/velocity error by approximately four.
- **Time reversal.** A forward and negative-time step in the actual parabolic
  and quartic field evaluators returns the original position/velocity within
  1e−15 m and 1e−11 m/s for the tested data. This checks the synchronized
  drift–kick–drift composition independently of a conserved-energy diagnostic.
- **Quartic force.** Differentiate the polynomial independently for both voltage
  signs and three κ values; the returned field agrees with −∇φ.
- **Neutral fourth moment.** Actual unequal-mass elastic pairs produce relative
  polar moments E[μ²]=1/3 and E[μ⁴]=1/5 under independent stratified polar draws.
  The fixed midpoint-quadrature budgets are 6e−9 and 1.1e−8. This complements
  energy/momentum and lower-moment checks; it does not validate an empirical gas.
- **Thermal source scaling.** Actual `simulate()` runs for 2u/3+ and 200u/1+
  have identical sampled mean initial energies and source-return counts
  under their shared normalized samples. Charge does not enter initial kinetic
  heating. Fixed-energy source construction consumes no thermal random draws.

Fresh neighboring runs also exercise the existing independently derived cutoff,
signed resonant/counter-rotating RF response, nonlinear Hamiltonian turning time,
canonical momentum, wall/axial exit ordering, cold-neutral moments and Poisson
survival, gyro/drift geometry and mirror barriers. Passing old regression tests
again is recorded as fresh execution, not a claim that every derivation is new.

## Existing limitation confirmed: grazing chord absorption

The simple rotating/ICR `firstHit()` explicitly finds the first **straight-chord**
intersection. Its frequency guard does not uniformly bound collector error for
nearly tangent trajectories. A fresh normalized pure-B witness has radius 1,
Ω=1, position (0.99999,0), velocity (0.003,−0.5), and h=0.03. Both step endpoints
are inside, yet the exact circular trajectory reaches r=1.000008 at t=0.012.
The chord reports no wall hit. The same dimensionless witness maps to a physical
positive ion by choosing B=1/(q/m) and retains h|Ω|=0.03.

The independent exact first-crossing time is 0.003999993666672816. Repeated
production steps with chord events give:

| hΩ | Result | Arrival-time relative error |
| --- | --- | ---: |
| 0.03 | Missed collection | Undefined |
| 0.015 | Wall | +210.847% |
| 0.0075 | Wall | +37.813% |
| 0.00375 | Wall | +4.519% |
| 0.001875 | Wall | +1.526% |

This demonstrates nonuniform near-tangency accuracy, not the fraction of default
particles affected. It is consistent with the existing chord/timestep disclosure
and is **not** attributed to the double-well polynomial event finder. It remains
an unresolved accuracy limitation; no generic collector-convergence claim follows
from the frequency guard or energy conservation. A future separately scoped
event-solver change should use the actual reintegrated path and retained grazing
controls, rather than silently increasing detector radius or clipping impacts.

## Exact checks and evidence

All executable code/dependency/test work stayed in distinct copied Apple guest
`safe-dev-9c0a1d251e7091d4`, stage `/tmp/mass-spinner-audit31-orbits`.
Initial dependencies used online `npm ci --ignore-scripts`; later explicit source
syncs used offline `npm ci --offline --ignore-scripts`. Unique probes and red
logs were exported before every replacement. No home, credentials, socket or
SSH mount, host project execution or browser policy workaround was used.

Final offline commands, prefixed with `safe-dev -C` and the stage path:

```
run -- ./node_modules/.bin/tsx --test tests/audit31-orbits.test.ts tests/adversarial-orbits-v29.test.ts tests/doublewell-orbits.test.ts tests/physics.test.ts tests/geometries.test.ts
run -- npm run typecheck
run -- ./node_modules/.bin/tsx grazing-refinement.ts
export /tmp/mass-spinner-audit31-orbits-final-export
```

The actual final driver ran these commands sequentially with logs and verified
all pinned source inputs before and after. **45/45 tests passed, zero failures
or skips**, in 0.906 s reported test duration; strict source typecheck exited 0.
These narrow commands are not the parent's integrated application build gate.

Evidence under `scientific/physics-audit-v31/orbits/` includes original/corrected
geometry sources, new test, exact probe sources and output, red/final logs and
the final tested-input map. Scope excludes evolved Coulomb collisions, numerical
transport statistics, self-consistent electrons/fields, measured cross sections,
experimental apparatus fidelity, browser/GPU and mobile observation.
