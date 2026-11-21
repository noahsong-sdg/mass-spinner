# Tutorial 6 · Model accuracy

A curve alone does not show that a model is accurate. Different checks are necessary for the equations, their numerical solution and their agreement with measurements.
This tutorial explains which conclusions you can support with the simulator and which conclusions need more evidence.

## What does a test show?

A plot can look correct when its model or numerical solution is wrong. We need separate checks before we use a prediction.

Atom conservation does not show that the calculated rotation agrees with measurements. Three questions have different evidence.
A calculation can conserve every atom while moving them at the wrong rate.
It can also solve the wrong physical model with very small numerical error.
Thus, one successful test cannot answer all three questions:

| Question | Evidence | What it cannot show |
|---|---|---|
| Does the code solve the specified equations? | Known limits and conservation checks: verification | Correct equations for the apparatus |
| Does a smaller cell or timestep change the answer? | Refinement and error estimates: convergence | That the model assumptions are physically correct |
| Do calculated quantities agree with measurements? | The same apparatus, conditions and measurement method: validation | Accuracy outside the comparison conditions |

For verification, remove the drive from a gas initially at rest. The model should not start rotation without another torque.
For convergence, repeat the same physical problem with smaller timesteps and cells. The answer should approach a stable result.
For validation, compare a predicted quantity with an independent measurement under the same operating conditions.
A failure in any one check limits a different part of the prediction.

<!-- diagram:evidence -->

[Open Model info](/?level=2&try=modelInfo). Read the qualification status beside the run assumptions. Agreement with inputs in a numerical study does not show agreement with Marathon measurements. Read the mesh and wall-layer warnings.

## Which input can change the result?

Some transport coefficients are specified, not measured for this device. If their uncertainty changes the conclusion, one run is insufficient.

The model uses diffusivity, collision rate and conductivity as inputs. Changes to these selected coefficients show which assumptions have a large effect on the result.
For example, two plausible diffusivities can give different recovery after a short run.
If that difference changes which design you would choose, diffusivity needs stronger evidence.
This is why we compare inputs rather than trust one visually smooth curve.

Diffusivity changes how fast atoms move across the radius. This changes the mass distribution and gas inertia.
The changed inertia can also change rotation. Compare these effects with the live plots below.

[Open the diffusivity experiment](/?level=2&try=diffusionExperiment).

Use Coupled separation with the two atomic isotopes and thermal evolution off.

1. Select Rewind.
2. Set a nonzero current.
3. Select New run to remove previous power switches.
4. After the result is available, select a time between the run's start and end.
5. [Pin run A](/?level=2&try=pin).
6. [Change only radial diffusivity](/?level=2&try=diffusion).
7. Select New run.
8. Select the same physical time as run A.
9. Read the accepted-input comparison for unintended changes.
10. [Open separation over time](/?level=2&try=separationPlot).
11. Compare the speed history also.

Read Separation over time at the same physical time for both runs.
A larger diffusivity generally lets the distribution change faster toward the instantaneous equilibrium.
The coupled model also changes inertia as mass moves, so its speed can change too.
Do not explain the result as a transport-rate effect alone without checking the speed history.

This gives sensitivity to a selected input, not a measured uncertainty interval.
Sensitivity asks how much the answer changes when you change an input.
An uncertainty interval also needs evidence for which input values are plausible and how model errors affect the answer.

Model info → Sensitivity & tested inputs calculates results for selected coefficient values between the Lower and Upper bounds. Each case uses the same drive history. The shading shows calculated cases, not a statistical confidence interval or all intermediate values.

Spatial argon reference shows saved mesh refinements, not experimental accuracy or a live lithium mesh control. The live thermal Refined option gives a timestep-error estimate, not spatial convergence.

## Which predictions have sufficient evidence?

Suppose the model predicts neutral gas speed at one radius, but the instrument measures a spectrum across the whole vessel.
Those quantities need not match, even if the calculated local speed is correct.
A numerically stable model can calculate a different quantity from the measurement. We must compare what the instrument measures under the same conditions.

The comparison shows how diffusivity changes recovery under specified inputs, assumptions and time. Accuracy for a Marathon device is a different question. It is necessary to use its apparatus, operating conditions and measurement method.

A Doppler instrument uses wavelength changes in emitted light to calculate velocity along a line of sight.
It receives light from different positions along that sightline. Emission strength and the spectral estimator can change the calculated velocity.
The estimator is the method that calculates velocity from the measured spectrum. Thus, calculated velocity can differ from local neutral speed.

A bright region can contribute more to the spectrum than a dim region with more atoms.
Line-of-sight geometry also selects only the component of motion toward or away from the instrument.
The comparison must apply the diagnostic model before comparing its result with the reported measurement.

In the diagram, follow light from several positions to one instrument.
Compare the local velocities with the single inferred velocity. They answer different questions.
Changing transport inputs until one measured velocity matches would not independently test the model.
A stronger test sets inputs from separate evidence, then predicts another measurement without changing them.

<!-- diagram:diagnostic -->

The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) records disagreement, not experimental accuracy.

Export the accepted run with its physical time, plot and selected coefficients. Operating maps and saved references do not show an experimentally verified operating range.

[Qualification implementation](../src/fuel-qualification-ui.ts) · [Back to the physics guide](UNDERSTANDING-MASS-SPINNER-02.md)
