# Tutorial refinements

25 November 2026.

## Changes

| Problem | Cause | Change and reason |
| --- | --- | --- |
| Tutorial 2 introduced separation before its drive. | Markdown and topic metadata kept a different order from the physical sequence. The reader met an effect before its cause. | Put drive, momentum, distribution, separation strength, heat and collection in that order. Keep existing anchors and equations. |
| An example could open unsuitable retained settings. | Links opened controls without a known input set. Old settings could hide the intended comparison. | Add explicit Load example, Use my run and Restore previous run. Reuse validated scenarios instead of a second input-restoration system. Save inputs and history before a context change, including while a run is pending. Sharing still requires an accepted result. |
| A history plot could describe a different state from the scene. | Plot selection and gas-view selection had separate paths. The picture could show a reference beside coupled history. | Synchronize tutorial history actions and preserve selected time. Label both outputs. Preserve the selected time through fixed-speed equilibrium comparisons, too. Mode selection otherwise rewinds the timeline and loses the return point. Ordinary manual selection remains available. |
| The tutorial prompt covered the scene label. | The two independent overlays used the same scene area. The label existed but was not readable. | Put the label in the playback panel. The existing panel layout keeps it with the state controls without another overlay or position controller. Keep the plot label at the top of its scrolling panel, so graph focus does not hide it. |
| A narrow desktop tutorial could hide almost all of the 3D model. | The side reader left a compact stage, but the prompt still overlaid it. The prompt and playback covered the remaining picture. | Apply the existing stacked tutorial layout below 900 px. This keeps the prompt outside the stage and reuses the phone layout. |
| A slider did not show whether it would restart the run. | Current steps and setup changes have different rules. The same gesture could have a different effect. | Show the effect beside the focused control. Use the same current-step condition as the calculation path. |
| The plot menu mixed histories and independent calculations. | All 17 options had one flat list. Their different purposes were hard to see. | Group existing values into Rotation, Composition, Heat and Reference calculations. Existing links remain valid. |
| Realistic hardware could imply a feasible lithium operating point. | Teaching inputs prescribe a gas phase. They do not establish phase stability. | Name the case Ideal gas experiment. Put the existing lithium saturation reference beside gas temperature. Keep unsupported material claims out. |
| The beam source lacked a short introduction. | Its explanation was spread across controls and model notes. | Add Tutorial 7: beam energy, stopping, reaction probability, current, target heat and evolving loading. Keep plant electricity separate. |
| Paused Laurelin playback still updated every frame. | Its callback always drew and requested another callback. Pausing stopped time but not the work. | Request frames only during playback. Direct edits still draw once. Keep one pending callback, without adding another animation controller. |

The changes preserve the physics equations and scientific gates.
Examples restore input states; they do not restore cached simulation results.
The model calculates each restored run again.

## Verification

Safe-dev checks passed on 25 November 2026:

- Focused regressions: 137 passed, zero failures.
- Application, infrastructure, boundary and test typechecks: passed.
- ESLint: passed.
- Production build, site-resource checks and Blender asset checks: passed.
- glTF validation: zero errors and warnings for all checked assets.

CI must pass the full test set and desktop/phone browser checks before deployment.
The deployment must serve the qualified artifact. Check its release manifest and live tutorial actions.
These checks qualify software behavior. They do not establish measured Marathon accuracy.

## Remaining learning check

Independent beginner review is pending.
Software tests and agent review do not show that a reader understands the physics.

Use these four tasks for the next observed review:

1. Change current and explain the speed change.
2. Compare temperatures at fixed speed and explain the composition change.
3. Select an inner sample and explain purity and recovery.
4. Change beam current and explain neutron output, reaction probability and target heat.

Then ask the reader to distinguish the centrifuge, beam source and power-plant reference.
Use the observed difficulty to select the next change.
