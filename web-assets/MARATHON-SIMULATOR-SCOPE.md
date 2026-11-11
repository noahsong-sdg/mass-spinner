# Marathon-inspired beam-target simulator: public basis and limits

Sources reopened 6 November 2026. This is a separate educational beam-target calculation, not a Marathon digital twin, separator extension, thermonuclear plasma equilibrium, validated reactor design or prediction of net electric power.

## Current extension (7 November 2026)

The original linear-slowing source below is preserved. An optional pinned Geant4-derived electronic/nuclear stopping estimate now ties energy loss to a fixed Li/T formula-unit column. A separate conservative T/D/vacancy loading reference evolves its own yield with assumed replacement probability and explicit resolution diagnostics. Neither supplies measured LiT calibration; the earlier example and five-test record below describe the initial source implementation. See [stopping/loading equations and limits](./DEUTERON-STOPPING-LOADING.md) and [conditional bulk thermal observer](./MARATHON-TARGET-EXPOSURE.md).

## What is publicly described

Marathon's current [beam-driven fusion page](https://www.marathonfusion.com/beam-driven-fusion/) describes an RF deuterium ion source, an accelerator and a cooled solid lithium-tritide target. Fusion occurs between incident deuterium ions and tritium in a surface layer. This architecture is materially different from a hot Maxwellian D–T plasma: using a thermal reactivity merely because the company makes plasma centrifuges would model the wrong reactor.

The [company homepage](https://www.marathonfusion.com/) displays 1 kW fusion power, 20 kW/m² and 10¹² n/cm²/s alongside the reactor concept. The accessed page does not identify complete measurement conditions, uncertainty, averaging area or whether every displayed value is achieved or targeted. They are company-displayed figures, not independently verified calibration data. The simulator does not fit them or use them as defaults. The site separately describes blanket/transmutation, fuel-recycling and lithium-enrichment technologies; those are not identical to the compact beam-target neutron source.

[Marathon's fuel-cycle page](https://www.marathonfusion.com/fusion-energy/) describes lithium enrichment and a centrifuge development program. The public [WO2026064411A1 patent](https://patents.google.com/patent/WO2026064411A1/en), published 26 March 2026, describes a partially ionized plasma centrifuge, electrodes, magnetic fields and extraction/cascade arrangements. Patent disclosure is not evidence that a specific enrichment, throughput, stability or lifetime has been experimentally achieved. Neither source provides all conditions needed to calibrate our II C/D transport solver or the target model below.

## Execution path and modeling decision

Existing `controls → worker → orbit/equilibrium` paths describe mass separation, not nuclear reactions. Reusing their field settings for a claimed Marathon reactor would create an unsupported mapping. The new pure module `src/fusion-reactor.ts` therefore owns a separate contract: `FusionBeamConfig → simulateFusionBeam → depth profiles, curves, neutron production and energy budget`. Existing separator behavior is unchanged. Root integration owns the visible panel/export and browser checks.

The smallest defensible first implementation combines a sourced nuclear cross section with **explicit assumed target and stopping inputs**. It does not guess proprietary target thickness, beam current, stopping curve, tritium inventory, coolant system or operating efficiency.

## Equations and units

For a cold stationary tritium target, mass-number kinematics give `Ecm = (3/5) Elab`. `dtCrossSectionM2` implements the low-energy Bosch–Hale D–T fit in centre-of-mass energy, with the published millibarn-to-SI conversion `1 mb = 10⁻³¹ m²`. It rejects energies outside 0.5–550 keV instead of extrapolating or imposing a rate floor. Formula reference: [Bosch & Hale 1992](https://doi.org/10.1088/0029-5515/32/4/I07). The original journal fetch was robots-denied in this session; the actual coefficients, SI conversion and Q were reopened in the scientific [ASCOT5 implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c), with an independent rounded cross-section table available in the [MIT MFE Formulary §9.7](https://www-internal.psfc.mit.edu/research/MFEFormulary/files/MFEFormulary.pdf) search extract. No inaccessible full text is claimed to have been read.

Let `u` be fractional tritium column through the modeled slab, `N_T` its areal column, and `f` the imposed fractional beam-energy loss:

```
E(u) = E0 (1 − f u)
dS/du = −N_T σ[0.6 E(u)] S,   S(0)=1
P_fusion = 1 − S(1)
R_n = (I/e) P_fusion
P_nuclear = R_n × 17.6 MeV
```

Linear slowing is an input closure, not calculated lithium-tritide stopping data. Tritium column and stopping are separate: a tritium-depleted matrix may still stop deuterons. The complete energy trajectory must stay in the cross-section fit domain, so fully stopping targets below that range are unsupported. The calculation approximates the hazard as constant in each slab interval and integrates attenuation and linear stopping/reaction energy exactly within that interval. Refining the intervals controls that quadrature error.

For the approximate isotropic centre-of-mass, mass-number kinematics, mean lab product energies per fusion are `En=0.8Q+0.56E` and `Eα=0.2Q+0.44E`. They sum to `Q+E`; the incident energy carried into reactions is not silently counted twice as target heat. No differential angular neutron distribution is predicted. Target-layer heat is stopping power plus the chosen deposited alpha fraction. Residual beam energy and escaping alpha energy remain outputs. A separately labeled conditional assembly heat adds residual beam energy if a substrate stops it all.

The tested budget is

```
incident beam + nuclear Q
 = layer heat + escaping alpha energy + transmitted beam + neutron energy.
```

`Q_beam = nuclear power / incident beam power` is not wall-plug gain, electric gain or ignition. At zero current the ratio and normalized energy residual are undefined (`null`), while absolute powers are zero.

## Defaults and observed teaching case

All defaults are illustrative: 100 keV D⁺, 10 mA, 10²² T nuclei/m², 20% imposed energy loss, 0.01 m² beam area, full alpha deposition, 80% accelerator efficiency and ten seconds of exposure. None is attributed to Marathon.

At those settings, 400 intervals give:

| Output | Result |
| --- | ---: |
| Fusion probability per deuteron | 4.57410×10⁻⁶ |
| Neutron production | 2.85493×10¹¹ s⁻¹ |
| Nuclear Q power | 0.80504 W |
| Incident beam power | 1000 W |
| Assumed wall-plug power | 1250 W |
| Modeled layer heat | 200.162 W |
| Residual beam power | 799.996 W |
| Conditional stopped-substrate assembly heat | 1000.159 W |
| Q_beam | 8.05041×10⁻⁴ |
| Relative energy-budget residual | −6.82×10⁻¹⁶ |

This is a calculated example inside the assumed slab model, not an observed reactor result. A small energy-ledger residual does not validate target transport or thermal performance. Neutron production divided by beam area is not a detector flux; the module returns counts/rate, without pretending to solve spatial fluence or shielding.

## Verification and remaining requirements

`./node_modules/.bin/tsx --test tests/fusion-reactor.test.ts` — **5 passed, 0 failed**. Tests compare four rounded independently tabulated cross sections, exact no-stopping exponential attenuation, current/Q/SI identities, number and energy conservation, zero-tritium/current limits, fit-domain rejection, second-order slab refinement and finite-output rejection for extreme current/area/exposure. A 300 keV/90%-slowing case gives probabilities 0.00283639589, 0.00283636230, 0.00283635390 and 0.00283635181 at 100/200/400/800 intervals, respectively. Strict standalone NodeNext TypeScript check of the module passes. Full repository gates are owned by the parent integration.

The initial identity test used strict equality despite mathematically equivalent floating-point multiplication order, producing a one-ulp discrepancy. The check now requires a 10⁻¹⁴ relative identity, preserving the physical SI assertion rather than encoding accidental operation ordering. Zero-current ratios were explicitly changed to undefined instead of an invented finite fallback.

An independent review also reproduced a representability bug: finite inputs such as 10³⁰⁰ A, an area of 10⁻³²⁰ m² or 10³⁰⁸ s could overflow derived rates, flux or counts to Infinity/NaN. Input finiteness alone does not guarantee output finiteness; in simple terms, multiplication or division can exceed the computer's number range. A final numeric-result invariant now rejects those cases explicitly while preserving physically undefined `null` ratios. This is preferable to arbitrary maximum-current/time or minimum-area physics limits, clamping output, or silently plotting nonfinite values. The regression checks all three reproductions.

Required next inputs include measured incident current/energy/angular and molecular-ion fractions; lithium-tritide composition/density/depth; energy-dependent stopping and scattering; target regeneration/depletion, sputtering and heat transfer; calibrated neutron angular/energy measurements with detector geometry; and independent operating points. Add these in bounded modules and validate against held-out measurements. Blanket breeding/transmutation, radiation damage and fuel-cycle throughput require separate nuclear/material/transport data. No company operating-point or experimental validation gate is closed by this implementation.

Execution used the explicitly authorized project host exception after safe-dev service denial, with `login:false`. No policies, hooks or credentials were changed. No deployed origin, browser/GPU or indirect origin-fetch workaround was attempted.
