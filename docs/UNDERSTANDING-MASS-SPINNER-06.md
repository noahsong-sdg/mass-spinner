# Tutorial 6 · Model accuracy

A plausible curve can still be wrong. Check the equations, their numerical solution and their agreement with measurements separately.

## What does a passing test establish?

Conserving atoms cannot prove the predicted rotation matches a real experiment. Three questions need separate evidence.

| Question | Evidence | What it cannot establish |
|---|---|---|
| Did we implement the equations correctly? | Known limits and conservation budgets: verification | That the chosen equations capture the apparatus |
| Did cells and timesteps distort the answer? | Refinement and error estimates: convergence | That a converged closure is physically correct |
| Does the model predict measurements? | Matched apparatus, conditions and diagnostic: validation | Accuracy outside the tested conditions |

[open Model info](/?level=2&try=modelInfo) and read the live qualification beside the run's assumptions. “Matches screened inputs” means those inputs match a numerical screen; it does not mean agreement with Marathon measurements. Check mesh/wall-layer warnings too.

## Could an assumed input reverse the result?

Diffusivity, collision rate and conductivity are prescribed. Change one at a time to see which assumptions control the answer.

[open diffusivity and separation](/?level=2&try=diffusionExperiment).

1. Choose a powered, mixed atomic feed in Coupled separation. Turn thermal evolution off. Rewind, set a nonzero current, then New run to clear power switches. Wait; choose a time strictly inside the run and [pin A](/?level=2&try=pin).
2. [Adjust only radial diffusivity](/?level=2&try=diffusion), then choose New run. Return to the same physical time in both cases. Check the accepted-input comparison for unintended changes.
3. [Show separation over time](/?level=2&try=separationPlot), then compare the speed history too. Diffusivity changes redistribution; redistribution also changes gas inertia, so speed need not be identical. Report the observed sensitivity without calling it a measured uncertainty interval.

Model info → Sensitivity & tested inputs samples a coefficient between chosen Lower/Upper bounds, preserving drive history. Its shading covers sampled cases, not a confidence interval or every intermediate value.

Spatial argon reference shows saved mesh refinements, not validation or a resolution control for live lithium. The live thermal Refined option estimates timestep error; spatial refinement is still needed.

## What is a defensible claim here?

“Under these inputs and assumptions, increasing diffusivity changed finite-time recovery” is testable. “This predicts Marathon's enrichment” additionally needs their apparatus, operating state and a matched measurement.

A Doppler instrument measures emission along a sightline, not automatically the local neutral speed. Comparing a local simulated velocity directly to that measurement can test the wrong quantity. The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) records remaining disagreement, not successful device validation.

Export the accepted run with its physical time, plot and prescribed coefficients. Operating maps and saved references do not certify an operating region.

[Qualification implementation](../src/fuel-qualification-ui.ts) · [Back to the physics guide](UNDERSTANDING-MASS-SPINNER-02.md)
