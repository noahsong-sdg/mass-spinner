# Tutorial connections audit · 20 November 2026

The tutorials need further work before a beginner can reliably connect each question to its result.
Four independent agents reviewed all six tutorials, their diagrams, and their simulator actions.
The main review checked their findings against the source and selected live actions.

There are 16 findings: two high-priority findings (P1), eleven medium-priority findings (P2), and three lower-priority findings (P3).
The proposed corrections below are not implemented by this audit.

## Scope and evidence

- Source: `57e96d2b93d18e943797e256f9c42a76d8614d56`, including the existing, uncommitted temperature-explanation changes.
- Live site: `https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/`.
- The live tutorial still has the earlier temperature explanation. Its text differs from the reviewed working tree.
- Browser checks used Brave through the browser tool. Access worked during this audit.
- Live checks covered gas and drive, temperature comparison, composition, axis and wall samples, angular momentum, and drive work.
- The audit did not test every action on every screen size. No new mobile or full release-suite pass is claimed.
- Existing source tests passed: 101 tests across 11 tutorial, guide, comparison, and bridge test files.
- Live observations establish interface behavior. They do not establish experimental accuracy or beginner comprehension.

## High priority

### 1. Diagrams appear before their necessary explanations · P1

Locations: `scripts/understanding-page.mjs:43–48`; `scripts/start-page.mjs:16–17`.

The page generator inserts a diagram after the section's first paragraph, regardless of where the necessary definitions appear.
Tutorial 1 puts the main explanation in a closed disclosure after its diagram.
The reader must interpret a quantity before learning what it means.

Put the short physical explanation and reading instructions before each diagram.
Keep derivations and detailed limits optional. Change diagram placement explicitly; do not add another navigation system.

### 2. A temperature comparison can open with no rotation · P1

Locations: `src/playground-guide.ts:72–75,143–149`; `src/fuel-learning.ts:44–47`.

Verified live: a fresh temperature link opened at 0 s, with both populations at rest.
The 500 K and 1,000 K curves both showed 7.59% light isotope at every radius.
Opening the comparison paused playback. The main instruction did not explain the next step.

After selecting 1 s, neutral edge speed was 1,024 m/s.
The equilibrium axis light fractions then differed: 8.108% at 500 K and 7.830% at 1,000 K.
These are live observations for the default inputs, not general device predictions.

Explain the zero-rotation result beside the comparison. Ask the reader to advance a powered run to a rotating state.
Preserve inputs and time until the reader acts. Test this fresh-page path without silently changing its state.

## Medium priority

### 3. A failed calculation can leave a tutorial action waiting · P2

Locations: `src/playground-guide.ts:201–210`; `src/fuel-centrifuge-ui.ts:489`.

Source tracing shows that plot actions wait for Export to become enabled.
A failed calculation leaves Export disabled, so the pending action receives no failure reply.
This failure path was not reproduced live.

Use the calculation's failure state to reject the pending action and identify the relevant controls.
Do not use a timeout to guess whether the calculation failed. Add a rejected-calculation bridge test.

### 4. A history plot and the 3D view can use different states · P2

Locations: `src/playground-guide.ts:125,152–153`; `src/fuel-centrifuge-ui.ts:494–506`.

Verified live: Show drive work kept the 3D view in Equilibrium reference while the plot reported a time-dependent result.
This preserves the selected view, but the learning prompt does not explain the difference.
The same issue affects plot-only history actions. It does not affect every history action: Show angular momentum selected coupled mode in the live check.

Identify both displayed states in the prompt. Offer an explicit coupled replay when comparison with the 3D motion is useful.
Keep ordinary plot links from silently changing time or physical inputs.

### 5. The live temperature control has a fixed-speed explanation · P2

Locations: `src/tutorial-presentation.ts:49`; `src/playground-guide.ts:77,116`; `src/fuel-centrifuge.ts:109–111`.

The live control opens the physical gas-temperature input. Its prompt explains a fixed-rotation equilibrium comparison.
At fixed initial pressure, changing temperature also changes the atom inventory and inertia. The coupled rotation can change.

Give the physical control and equilibrium comparison different instructions.
After a physical input change, compare speed and composition at the same physical time.
Use the fixed-speed comparison to isolate temperature alone.

### 6. Density and composition displays change their reference · P2

Locations: `scripts/guide-diagrams.mjs:85–94`; `src/fuel-learning.ts:15–20,34–38`.

The diagram divides each isotope's density by its axis density.
The live density plot divides it by its volume mean. Composition shows local atom percentages instead.
Definitions exist, but they do not guide the reader through these changes.

Explain each reference beside its link. State why both densities can increase outward while the light percentage decreases.
Use a paired density and composition example where possible. Do not imply that the normalized curves show absolute atom counts.

### 7. Tutorial 1 uses an exponent before giving it a useful meaning · P2

Locations: `src/playground-guide-steps.ts:27–30`; `scripts/guide-concepts.ts:31–39`.

The diagram asks beginners to compare a separation exponent and gives factors of four and one half.
The practical connection to the composition profile remains unclear without the later logarithm explanation.

Use composition curves in the introductory comparison. Keep the exponent derivation in Tutorial 2.
If the exponent diagram stays, show the corresponding heavy/light ratio in a short numerical example.

### 8. The heating exercise does not answer its opening question · P2

Location: `docs/UNDERSTANDING-MASS-SPINNER-03.md:4,8–10,30–36`.

The question concerns the effect of heating on separation. The procedure ends with temperature and work plots.
Tutorial 1 also asks the reader to distinguish rotation and heating effects without a defined comparison.

Pin a fixed-temperature run. Enable thermal evolution with the same drive inputs.
Finish by comparing speed, temperature, and composition at the same physical time.
Describe this as the combined thermal effect. It does not isolate temperature at fixed speed.

### 9. Drive & work is not a complete thermal-energy account · P2

Locations: `docs/UNDERSTANDING-MASS-SPINNER-03.md:35–36`; `src/fuel-centrifuge-ui.ts:506,510`.

The tutorial asks the reader to explain temperature changes from the work plot.
That plot shows mechanical energy terms. It does not include curves for all resistive heat and cooling energy.
Ohmic power and cooling energy appear elsewhere as scalar results.

Explain which energy terms the work plot includes. Direct the reader to cooling energy and resistive power for the thermal comparison.
A complete thermal-energy plot is a separate implementation task.

### 10. The sensitivity diagram changes the wrong input · P2

Locations: `src/guide-topics.ts:36`; `scripts/guide-concepts.ts:15–20`; `docs/UNDERSTANDING-MASS-SPINNER-06.md:25–41`.

The exercise changes radial diffusivity. Its diagram changes collision coupling with constant inertias and no radial transport.
That diagram cannot explain diffusivity changing the mass distribution, inertia, and rotation.

Use the pinned live diffusivity comparison here. Move the collision diagram to the collision explanation, or replace it with a matching visual.

### 11. The cascade does not use the preceding live inventory cut · P2

Locations: `docs/UNDERSTANDING-MASS-SPINNER-04.md:24–40`; `src/fuel-centrifuge.ts:174–178`.

The collection exercise uses the finite-time distribution. The cascade uses separate equilibrium routing probabilities from the uniform-inertia reference.
The text names ideal assumptions but does not explain this change in model basis.

Identify the prescribed equilibrium stage state before the exercise.
Explain that this reference does not connect the live outlet distributions of physical machines.

### 12. Fuel accounting skips the reason for its subtraction term · P2

Location: `docs/UNDERSTANDING-MASS-SPINNER-05.md:19–26,38`.

The equation includes `(1/f_b − 1)` without first separating injected, consumed, and unburned fuel flows.
The learner can calculate the result without understanding the fuel account.

Use a short example: inject 100 tritium atoms, consume five, and return 95.
Derive injected flow from consumed flow and burn fraction. Subtract consumed flow before multiplying by processing time.

### 13. Reference composition comparisons omit the feed line · P2

Location: `src/fuel-learning.ts:64–73`.

Ordinary composition plots include a feed line. Temperature and speed comparisons state the feed percentage only in text.
The learner must retain that number while reading small changes on an expanded vertical scale.

Add a labeled feed reference to these comparisons. Preserve their common scale and unchanged species inventories.
Check zero rotation and pure feeds as well as mixed rotating cases.

## Lower priority

### 14. The new pressure explanation uses an unclear phrase · P3

Locations: `src/playground-guide-steps.ts:23`; `scripts/guide-diagrams.mjs:75`; `docs/UNDERSTANDING-MASS-SPINNER-02.md:39`.

The recent copy says, “Hotter gas gives more pressure per atom.” This phrase is unclear for a beginner, rather than a verified physics error.
For an ideal gas, pressure divided by number density equals Boltzmann's constant times temperature.
Use: “With the same number of atoms per volume, hotter gas has higher pressure.”

Then explain how the outward pressure increase supplies inward force.
Limit the less-steep-curve statement to the normalized equilibrium comparison at fixed rotation speed and uniform temperature.

### 15. Pressure has no task in the heat-flow exercise · P3

Location: `docs/UNDERSTANDING-MASS-SPINNER-03.md:40–59`.

The section introduces the pressure equation beside the conduction equation. Its procedure examines only temperature profiles.
The learner receives another quantity without a reason to use it.

Remove pressure from this exercise, or add a specific pressure question and its plot link.
Retain it only if it helps answer that question.

### 16. The calculator does not explain how to use the current run · P3

Locations: `src/playground-guide.ts:118`; `src/fuel-equilibrium-ui.ts:24–32`; `src/tutorial-presentation.ts:42`.

The calculator opens with independent defaults. Use sampled state can import the current values, but the prompt does not explain this step.

For a comparison with the run, ask the reader to select Use sampled state first.
Explain that this imports values once. Preserve the calculator's independence.

## What the checks support

The reviewed equilibrium equations and comparison code preserve the main physical distinctions.
The tutorials distinguish density from composition, magnetic force from energy supply, and recovery from extraction flow.
They also distinguish verification, convergence, and experimental validation.

Verified live: axis and wall links changed both the probe radius and composition readout.
At 1 s, the default run showed 8.081% light isotope at the axis and 7.227% at the wall.
The readouts compared these values with the 7.59% feed. This connection already works.

No cross-origin message acceptance or arbitrary tutorial-action execution issue was found in the reviewed bridge.
This statement covers the reviewed path, not a complete security assessment.

## Reviewable correction sequence

1. Correct teaching order and the zero-rotation comparison instructions.
2. Match prompts and diagrams to their actual model, selected state, quantity, and reference.
3. Complete the heating comparison and explain the limits of its energy account.
4. Explain the cascade and fuel-flow calculations before adding further topics.
5. Add failure-state, fresh-route, reference-view, and quantity-reference tests.

Do not treat passing interface tests as evidence that the explanation is clear.
For each section, check whether a beginner can predict one change, use its control, and explain the observed result.

## Verification record

`node --import tsx --test` passed all 101 tests in these files inside safe-dev:

`fuel-learning`, `fuel-learning-ui`, `guide-learning`, `understanding-page`, `tutorial-presentation`, `playground-guide`,
`numbered-tutorials`, `guide-concepts`, `guide-bridge`, `understanding-guide`, and `tutorial-insights`.

The final safe-dev checks also passed: `typecheck`, `typecheck:infrastructure`, `typecheck:boundaries`, `typecheck:tests`, `lint`, and `build`.
The build retained its large-chunk warning. No release promotion or deployment occurred.

The live zero-rotation screenshot is saved at `/private/tmp/mass-spinner-audit-zero-rotation.png`.
The test log is saved at `/private/tmp/mass-spinner-tutorial-audit-tests.log`.
The final check log is saved at `/private/tmp/mass-spinner-tutorial-audit-final-gate.log`.
These local evidence files are not part of the repository.


## Corrections and independent review

The following changes address the 16 findings. They change teaching and interface behavior, not the simulation equations.

| Finding | Correction |
|---|---|
| 1 | Necessary definitions precede diagrams. Explicit Markdown markers control placement. |
| 2 | The comparison explains overlap at rest and gives the next action. Inputs and time stay unchanged. |
| 3 | The calculation publishes pending, accepted or failed state. A failure rejects the waiting action and opens Controls. |
| 4 | History prompts distinguish the separate 3D reference. Replay spin-up explicitly opens coupled motion. |
| 5 | The physical-temperature prompt explains inventory, inertia and coupled speed changes. |
| 6 | The tutorials identify axis-normalized density, vessel-mean density and local composition. |
| 7 | A numerical example explains α before exponent factors. |
| 8 | The heat exercise compares temperature, speed and composition with A at the same time and drive. |
| 9 | The work prompt identifies its mechanical account and separate thermal quantities. |
| 10 | The diffusivity exercise uses its live comparison instead of an unrelated collision diagram. |
| 11 | The cascade text identifies its separate uniform-inertia equilibrium reference. |
| 12 | Injected, consumed and unburned fuel motivate the exhaust-flow equation. |
| 13 | Temperature and rotation comparisons include the feed fraction on the same vertical scale. |
| 14 | The pressure statement specifies the same number of atoms per volume. |
| 15 | The heat-flow section introduces only the equation used by its exercise. |
| 16 | The calculator instructions explain Use sampled state and its one-time import. |

Independent agents reviewed physics, beginner clarity and execution paths.
Their first review found three remaining gaps: reference-state warnings on current controls, Pin A access, and the thermal checkbox name.
These gaps are fixed. Their source rechecks found no remaining blocking issue within the reviewed paths.
Source review does not establish live behavior or beginner comprehension.

All 131 focused tests passed in safe-dev. The tests include pending-to-failed calculation, obsolete failure, recovery and no late replay.
They also check zero-speed overlap, feed references, diagram order, valid markers, equal-time prompts and direct pin access.
Workspace tests, all four typecheck commands, lint and build passed in safe-dev.
The build retains its existing large-chunk warning.
Full CI and live verification are recorded separately after deployment.

## Additional live finding: reader load order

Live checks found that a question can be visible before the reader module starts.
An action used in this interval followed normal navigation inside the frame.
This loaded a second simulator. The same action worked after the reader started.

Generated simulator links now target the top page before script interception.
Tutorial actions also carry their page and section in the URL.
Thus, an early action opens the simulator and retains its tutorial context.
After the reader starts, its existing message path preserves the current run.
No new message authorization or action is added.
A browser regression test blocks the reader module and checks this path.
