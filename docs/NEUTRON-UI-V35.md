# Neutron first-flight interface v35

9 November 2026. Scope: `setupNeutronTransport(host)` in
`src/neutron-transport-ui.js`, its actual-handler JSDOM tests, and this report.
The coordinator owns mounting, selected-target-time wiring, full application
checks and publication. No live browser or GPU observation is claimed.

## Execution path and resulting behavior

The previous `setupNeutronGeometry` observer ends at free-flight circular-sample
interception. It does not contain material interaction inputs, detector response
or a selected evolving-source state. The new independent panel accepts
`update({sourceRateS,sourceEnergyMeV})`, or `update(null)` to invalidate it, and
calls `simulateFirstFlightNeutrons` with one finite cylindrical custom layer.
Its optional `read()` returns the current calculation for integration checks.

The layer starts as vacuum. Macroscopic total and absorption coefficients are
explicit assumed inputs in m⁻¹ at the source energy. There is no invented
material identity, cross-section calibration, detector calibration or dose/DPA
conversion. Geometry controls use metres and displayed cm²/cm with explicit SI
conversion at the model boundary. Detector efficiency is conditional on a
**first absorption**, matching the actual physics module's contract.

The compact disclosure displays absorbed, unresolved first-scattered and
conditional detected rates. A thickness scan shows the material/geometry tradeoff;
an optional angular-refinement plot shows quadrature sensitivity. Model info
retains all physics assumptions. Export preserves the complete source, explicit
configuration, fractions, rates, per-layer ledgers, convergence metadata and
assumptions under schema version 1.

Invalid source or material inputs clear all previous metrics/plots and disable
export immediately. Recovery recalculates from the current source and stored
controls. Zero source gives exact zero rates while retaining valid geometry.
No source operating point is mutated by opening this panel.

## Demonstrated display defect and fix

During the first interface review, the angular-refinement x axis used the
requested coarse sample counts. The physics module returns its **doubled fine
quadrature**, so the final plotted estimate used 512 directions while its label
said 256. Simply, the plot understated the numerical work behind each point.

The corrected axis reads `result.convergence.angularSamples`, the actual
executed count. This fixes the provenance at the consumer boundary without
changing the integrator or duplicating its doubling rule. A regression through
the actual disclosure handler failed before the fix: **4 pass / 1 fail**, with
the endpoint label 256. The preserved red log and source are in
`/tmp/mass-spinner-neutron-ui-v35-axis-red-export`.

## Checks and isolation

The first complete copied snapshot passed **5/5 handler tests** and a strict
standalone neutron-module TypeScript check in dedicated Apple safe-dev guest
`safe-dev-c76961c3fb0811d2`, stage `/tmp/mass-spinner-neutron-ui-v35`.
The initial export is `/tmp/mass-spinner-neutron-ui-v35-first-export`.
Inputs were hashed before and after execution. The physics module subsequently
changed under its owning agent, so that first snapshot is not silently relabeled
as final integration evidence.

After the physics owner froze its candidate, the source copy was refreshed
explicitly and dependencies reinstalled offline. The final **5/5 handler tests
pass**, including the previously failing axis regression; the strict standalone
neutron-module TypeScript check also passes. The final 84-input map matches
before and after both commands. Final export:
`/tmp/mass-spinner-neutron-ui-v35-final-export`.

Exact commands inside the guest:

```
node --import tsx --test tests/neutron-transport-ui-v35.test.ts
./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/neutron-transport.ts
```

| Final tested source | SHA256 |
| --- | --- |
| `src/neutron-transport-ui.js` | `28ad84460fb5f646896b93219a5f1697d0e4018112311e94e5a6c0a7f7297230` |
| `tests/neutron-transport-ui-v35.test.ts` | `98ef1475a99e0b994f1c892f6668099988c4abaff6d4c280a2513c8f57fe39e5` |
| `src/neutron-transport.ts` | `2a2945511915927475aae1b8f4c5c9208cb54347ceded342c9ce57df408fb7df` |

All first, red and final copied sources/logs are retained under
`scientific/marathon-v35/neutron-ui/` with a byte-hash manifest. The coordinator
owns final repository typecheck, build, assets and merged tests. These DOM
checks exercise real handlers and SVG generation; they are not a
live-browser/mobile/GPU substitute.

All npm installation, source execution and tests used the isolated copied
Apple guest. Only dependency installation used network access. Unique guest
results were exported before replacement syncs. Host work comprised trusted
source edits, reads, copies and byte hashing; no home, host credentials,
signing key, SSH agent or control socket was mounted. The denied deployed
origin was not opened through any alternate browser surface or workaround.

## Follow-up: undefined energy when nothing is emitted

The coupled target's beam-off and zero-fuel states emit no neutrons, so a mean
birth energy is undefined. The transport owner extended its boundary to accept
`sourceEnergyMeV: null` **only when `sourceRateS === 0`**. A positive rate still
requires a finite positive energy. Assigning a fallback energy would invent a
physical quantity where there are no events.

The UI already passed the value through unchanged; no production UI edit was
needed. A sixth actual-handler regression verifies valid zero/null output,
exact zero channel/detection rates, null energy in both config and source
metadata, finite SVG output, enabled valid export, rejection and immediate
invalidation for positive/null, and recovery back to zero/null.

The rebased **6/6 handler tests and standalone neutron-module typecheck pass**
on the same isolated guest after explicit source sync and offline reinstall.
The 84-input source map matches before and after execution. Follow-up export:
`/tmp/mass-spinner-neutron-ui-v35-null-energy-export`. Tested physics module
SHA256 `b4d0e8d9195ccae64dafd262d05d077015b7cad65b1013ef5eebc6e4a87d6694`;
test SHA256 `68b989a1edbf0b041395d65ebb9045b042c81d80be0731088b478828a33e1b66`.
The UI module's `28ad8446…97230` hash is unchanged.

The previous 258-file leaf remains immutable. This follow-up has its own
evidence leaf, `scientific/marathon-v35/neutron-ui-null-energy/`, rather than
rewriting the earlier tests, source copy, report or manifest.

## Evaluated H-1 and actual OpenMC reference

The earlier panel exposed only assumed macroscopic coefficients. Although the
neutron owner had run OpenMC and retrieved evaluated NNDC data, neither was
accessible in the playground. The new material selector retains **Custom** as
the default vacuum scenario and adds **H-1 · ENDF/B-VIII.1**.

H-1 uses the physics owner's `neutronHydrogenReference` helper and its full
native MF3 tables, preserving ENDF interpolation regions rather than drawing a
line through seven widely spaced resampled values. Microscopic barns are
converted to macroscopic m⁻¹ using an explicitly assumed H-1 atom density.
The density slider stores a logarithm but displays the physical m⁻³ value,
including in `aria-valuetext`. Switching modes hides rather than destroys the
custom coefficients. The selected target snapshot's **current energy** is used;
no fixed 14.1-MeV substitution or extrapolation is made.

This choice puts the existing evaluated data into use without pretending that
H-1 represents LiT or that evaluated microscopic data determine the actual
material density or detector efficiency. The calculation's exported material
metadata includes density, microscopic/macroscopic cross sections, library,
nuclide, raw source SHA256 and source URL. A source link is available under
Model info.

An energyless beam-off state withholds the H-1 calculation and export, with an
explicit explanation. Custom mode continues to support exact zero/null output.
Out-of-range H-1 energies clear previous results; returning to a supported
energy recalculates from the current source. This prevents stale or invented
energy-dependent material coefficients from leaking into a cooldown state.

The separate **OpenMC reference** disclosure shows the three actual recorded
cases: pure absorption, mixed absorption/scattering and pure scattering, each
with first-absorption fraction and OpenMC absorption mean ± one reported Monte
Carlo standard error. Each case used 500,000 histories. The mixed result is
approximately 0.03561 total absorbed/source neutron versus 0.0265545 first
absorbed: later collisions are represented by the external OpenMC calculation,
not silently promoted into the live first-flight model.

The disclosure explicitly says these synthetic one-group runs do not follow
the current sliders. Export retains their full provenance and
`appliesToCurrentControls: false`; `fullBrowserMonteCarlo` and
`experimentalValidation` remain false. This is preferable to using a recorded
curve as a live full-transport prediction. The reference does not establish a
measured shielding material, neutron spectrum, calibrated detector, dose or
displacement damage.

### Exact evaluated-data snapshot

The copied 87-input map was verified before and after **9/9 actual-handler
tests**, including the original six cases, and strict standalone typechecking
of `src/neutron-transport.ts` and `src/neutron-data.ts`. Both commands exited 0.
The existing safe-dev guest was explicitly resynchronized after its previous
results had been exported, with dependencies reinstalled offline.

| Input | SHA256 |
| --- | --- |
| `src/neutron-transport-ui.js` | `68c0d853845590ff9ccf1852cedb4bdbfd0a67bcf374c8c776ecf050b6c498b3` |
| `tests/neutron-transport-ui-v35.test.ts` | `ae6284059798c0909a252a94a38261f1cd2f49a8797f8b26b64b2651612f7ef4` |
| `src/neutron-data.ts` | `ab19df166543dbb6aa28c78c593f7ed209489f005f298024d68957904fff8652` |
| `web-assets/marathon-reference/h1-endfb81-v35.json` | `bac95d792b4b4c2db71791d15df68c7f324fbf238ad8715f501aac7dc9132f43` |
| `web-assets/marathon-reference/neutrons-v35.json` | `88784dc80330d8cad6f7ff2f56a8acbe296400d4455acec118cb6f97eca0e0b6` |

Raw NNDC H-1 source SHA256:
`3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af`.
The recorded OpenMC result SHA256 is
`48274869380fbf9ec0bd1b3bbdaf6e088e63a41739286d95a1bd4cde8ac9db8a`.
The neutron-transport module retains the null-energy follow-up hash above.
The copied export is `/tmp/mass-spinner-neutron-ui-v35-evaluated-data-export`;
this third phase is retained separately from both previously sealed leaves.
The coordinator owns final root review and merged application gates. No live
browser or full multiple-scattering browser execution is claimed here.
