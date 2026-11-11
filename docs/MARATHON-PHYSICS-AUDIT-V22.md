# Independent Marathon realism audit — v22

7 November 2026. This reviewer inspected source and fresh primary literature,
then independently tested the assigned thermal backend as recorded below.
Browser verification is separately
blocked; no alternate browser, CDP, indirect target-origin fetch or local
browser clone was used.

## Traced state and root cause

`fusion-ui.js` reads energy/current/column/imposed loss/area/deposition/efficiency/
exposure, calls `simulateFusionBeam`, builds scans/readouts and publishes the
result to the independent sample-geometry observer. `fusion-reactor.ts`
integrates a frozen target and then sets `totalNeutrons = neutronRateS × exposureS`.
It calculates layer heat and conditional whole-assembly heat separately, but
never evolves a thermal or material state. `fusion-playground.ts` repeats the
frozen calculation for its energy scan. Thus exposure is bookkeeping, not a
target history. A render does not change that physical boundary.

In simple terms the app can say how much heat is deposited, but cannot yet show
the temperature response of an assumed target assembly. It also leaves the same
tritium column available regardless of exposure. The current assumption text
correctly declares these omissions; it is not presently claiming target life.

## Priority and evidence

The principal physical-fidelity gap remains material-resolved energy loss and
the evolving isotope/depth profile. NIST's [PSTAR](https://physics.nist.gov/PhysRefData/Star/Text/PSTAR.html)
is a **proton** stopping/range service. A proton table is not measured deuteron
transport in LiT. The [Geant4 low-energy manual](https://geant4.web.cern.ch/documentation/dev/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hadrons.html)
explains compound corrections and Bragg-rule limitations at low energies.
Installing a solver alone does not supply missing composition or validation.

A bounded **conditional thermal-response explorer** is nevertheless a useful
next implementation: it resolves a meaningful time dependence without
inventing LiT stopping, material constants or target lifetime. It must keep
the existing frozen-source calculation and the meaning of its outputs intact.

Marathon's [compact architecture](https://www.marathonfusion.com/beam-driven-fusion/)
specifies a solid LiT surface on a cooled substrate. Its [homepage](https://www.marathonfusion.com/)
describes deposition and in-place renewal, but neither source supplies the
thermal coefficients, geometry, loading kinetics or failure threshold needed
to calibrate a target-history calculation. Those inputs must remain assumed.

The [Sandia target-lifetime study](https://www.sandia.gov/research/publications/details/optimization-of-target-lifetime-for-production-of-14-mev-neutrons-2020-12-15/)
(Wampler et al., NIM B 485, 26–31, DOI 10.1016/j.nimb.2020.10.014)
identifies implanted-isotope exchange, thermal mixing and permeation in studied
tritide targets. Consequently fusion consumption alone is not a lifetime law,
and higher temperature is not universally equivalent to shorter target life.
Those material findings must not be transferred quantitatively to LiT.

## Recommended bounded equations

Use explicit effective areal coefficients:

```
C_A dT/dt = q_deposited - h_eff (T - T_coolant)
q_deposited = assemblyHeatIfTransmittedBeamStoppedW / beamAreaM2
C_A: J m^-2 K^-1; h_eff: W m^-2 K^-1
```

This assumes the local illuminated assembly eventually stops all transmitted
deuterons and a constant fraction of alpha energy as already declared by the
source engine. Accelerator inefficiency is not additional target heat.
Neutron energy is not local target heating unless neutron transport supplies
that deposition; no such transport is solved here.

Let `theta = T - T_coolant`, `z = h_eff t/C_A` and
`phi1(z) = -expm1(-z)/z`, continuously extended by `phi1(0)=1`:

```
theta(t) = theta(0) exp(-z) + (q_deposited/C_A) t phi1(z)
```

This includes the adiabatic `h_eff=0` limit. Apply it piecewise across exact
beam on/off events, retaining temperature at each event. The coefficients
are fixed scenario inputs, not inferred material properties. A changing beam
footprint changes deposited power per area; arbitrarily holding one total
thermal capacity/conductance fixed while changing area would conceal that
effect. If instead using total `C`/`G`, define the represented assembly and
document that geometry separately.

The [MIT-hosted author textbook](https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/6/1810/files/2024/04/AHTTv600.pdf)
§5.2 explains the lumped-capacitance assumption and time constant; the
[NPTEL transient-conduction lecture](https://archive.nptel.ac.in/content/storage2/courses/112108149/pdf/M5/Student_Slides_M5.pdf)
states its usual small-Biot criterion. An effective node temperature is not a
surface hot-spot prediction. Without conductivity, internal length scales and
thermal contacts, the simulator cannot certify the small-Biot regime. Do not
invent a green validity badge from `h_eff` alone.

An optional fuel-use **diagnostic**, separate from material evolution, can show:

```
N_T,initial = beamAreaM2 × targetColumnM2
B_fusion = integral R_n(t) dt
f_burn = B_fusion / N_T,initial  (undefined when the initial inventory is zero)
```

One D–T reaction consumes one T nucleus. If frozen-source demand exceeds the
specified inventory, the history is not physically self-consistent. A warning
must identify that condition rather than silently predicting unlimited output.
Even a tiny burn fraction does not certify target durability: exchange,
diffusion, erosion, sputtering, helium retention and permeation remain missing.

An assumed renewal flow would require an explicit external tritium source and
an atom ledger. Recovered tritium is not bred fuel. Clamping replenished
inventory to a capacity without reporting the removed/excess atoms would break
that ledger. A guessed temperature-dependent loss law should not be labeled
LiT desorption or experimentally calibrated regeneration.

## Adversarial acceptance gates

1. **Identity and units:** use conditional assembly heat only for a stated
   stopping substrate. Preserve target-layer/transmitted/neutron/accelerator
   ledgers and expose which boundary heats the node.
2. **Exact limits:** zero power, zero elapsed time, zero cooling, long-time
   steady temperature, exact pulse endpoints and continuity through source-off.
   Cooling a hot node must not reset it to the coolant instantaneously.
3. **Independent calculation:** compare the exact path against independently
   integrated first-law ODEs and verify
   `C_A ΔT + integral h_eff(T-T_coolant) dt = integral q_deposited dt`.
   Test small `h_eff t/C_A` with cancellation-resistant arithmetic; accept signed
   net coolant heat when an initially colder node is permitted.
4. **Area/current sensitivity:** current scales incident power; area changes
   local heat flux and thermal response under fixed areal coefficients. It does
   not alter nuclear probability in the frozen slab.
5. **Finite atoms:** no-source/zero-T controls have exactly zero reactions;
   initial zero-T inventory is not divided by zero. Burnup is only a budget
   diagnostic unless the source rate is actually coupled to evolving composition.
6. **No invented safety/lifetime:** a user-assumed temperature crossing is an
   assumed threshold crossing, not a validated operating limit, melting time,
   shutdown time, tritium-release prediction or safe-run recommendation. Do not
   reuse published Ti-tritide limits for LiT.
7. **State freshness:** every source or thermal-input change replaces curves,
   metrics, exported operating points and scope notes. Invalid input clears all
   dependent thermal/fuel results, and a valid input restores them. Hidden
   panels must not keep stale source values.

## Why this split is preferable

The root cause is a missing thermal state, not a wrong heat-power expression.
An independent observer of the checked source output is the smallest coherent
extension. It avoids changing the existing source-rate contract or implying
unmeasured temperature-to-yield feedback. A larger coupled LiT-history model
should follow measured/evaluated stopping, composition profiles, implantation,
thermal contacts and isotope-transport validation. More adjustable coefficients
would increase apparent detail without supplying that evidence.

## Candidate review and executed independent gates

The implemented `src/target-exposure.ts` follows the bounded split above. It
observes the source result, divides conditional whole-assembly power by the
illuminated area, and evolves the exact forced first-order thermal response
through the pulse endpoint and cooldown. A cancellation-resistant series
computes the initially small coolant-energy term. Both initial and coolant
temperatures are free positive absolute temperatures, so signed bath-to-node
heat is retained. Fixed-inventory demand above the available atoms is rejected.
The source rate remains uncoupled from temperature and composition. No
unsupported material lifetime, safe temperature or LiT coefficient is inferred.

**Result: no blocking physics or numerical defect found within this stated
one-node, fixed-coefficient scenario model.** This is computational verification
of the reduced equations; it does not validate a Marathon machine, LiT material
properties, target surface temperature or a neutron-yield history under depletion.

Independent test file: `tests/target-exposure-audit.test.ts`, eight passing gates:

- RK4 integration of temperature plus independently integrated signed coolant
  energy agrees with the exact response before and after the source switch.
  The RK4 derivative uses the first-law ODE, not the implementation's exponential
  response or energy complement. Temperature and integrated energy tolerances
  are `2e-11` relative plus `1e-10` absolute in the corresponding SI unit.
- Adiabatic heating retains its energy and temperature throughout cooldown.
- The leading coolant-energy term remains positive and accurate at
  `h t/C_A = 2e-14`; the gate uses `1e-13` relative tolerance without an absolute
  floor that could hide cancellation to zero.
- A source-off initially colder node gains energy from the bath with the correct
  negative signed coolant heat; initially hotter and zero-duration cases pass.
- Changing footprint by four changes the rise and burn fraction by four while
  leaving production, total deposited energy and source probability unchanged.
- Long irradiation approaches the assumed steady state; cooldown makes no
  additional neutrons. The cooling reference uses the configured time constant.
- Zero initial T has a null, rather than divided-by-zero, consumption fraction;
  a deliberately inconsistent source demand is rejected by the finite-atom guard.
- Invalid temperatures, thermal coefficients, time and sample bounds reject.

Execution used only the reviewer's dedicated minimal stage
`/tmp/mass-spinner-physics-audit-v22`; the parent's stage was not touched.
The stage contains four imported source files, this audit test and the checked
package manifests. After the final host edit, the stage was copied again and
explicitly synchronized before execution:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-physics-audit-v22 sync --replace-guest
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-physics-audit-v22 run --online -- npm ci --ignore-scripts --no-audit --no-fund
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-physics-audit-v22 run -- ./node_modules/.bin/tsx --test tests/target-exposure-audit.test.ts
```

Final result: **8 tests passed, 0 failed**, offline Apple VM execution. The online
invocation was limited to the explicitly required dependency download. Tested
SHA-256 values:

```text
d27a0525def85e9abc274bcd832c005643b14d6366bdf08bf6b57aa81b9d19de  src/target-exposure.ts
d675d191b59da2e6875614a8a1b7ba00727c9d2f94a21bb4f704075aa7a5d961  src/fusion-reactor.ts
ae14e254b428efbf9be7a8fa3117ae13a8e7d12b3ca923a920ba098fe79a8d88  src/physics.ts
129e76b125cb29840316188f6e9e4afd95190d2416523f6939b937712b903895  src/collisions.ts
0a9197d23211daa6048b9ae3a101f29b50724a8332cf0928706e77506a03fa7d  tests/target-exposure-audit.test.ts
1cb8b186b2a925cc4cb27ba86685f06484360f746de36b6fdee185d898436400  package.json
443c63456b3c33b48c79f63272abe7b308d21ea9770d23c7a0ebdb94ac2e18e0  package-lock.json
```

The reviewer did not execute the full-project build/typecheck or UI suite;
those are integration gates for the parent on its final combined snapshot.
No live-browser, deployed-controls or visual-appearance verification was
performed. The remaining high-impact realism gap is material-resolved stopping
and evolving D/T/Li depth profiles, followed by thermal-geometry/transport data;
the new thermal observer does not close those gaps.
