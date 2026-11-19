# 06 · Which prediction should I trust?

The preceding tutorials added heat, process and fuel constraints. Those calculations help only if we distinguish a correct equation, an adequate numerical solution and an adequate model of a device.

## What does a passing test establish?

Conserving atoms cannot prove the predicted rotation matches a real experiment. Three questions need separate evidence.

| Question | Evidence | What it cannot establish |
|---|---|---|
| Did we implement the equations correctly? | Known limits and conservation budgets: verification | That the chosen equations capture the apparatus |
| Did cells and timesteps distort the answer? | Refinement and error estimates: convergence | That a converged closure is physically correct |
| Does the model predict measurements? | Matched apparatus, conditions and diagnostic: validation | Accuracy outside the tested conditions |

**Try it:** [open Model info](/?level=2&try=modelInfo) and read the live qualification beside the run's assumptions. “Matches screened inputs” means those inputs match a numerical screen; it does not mean agreement with Marathon measurements. Check mesh/wall-layer warnings too.

## Could an assumed input reverse the result?

The live model prescribes diffusivity, collision rate and conductivity. A sharply drawn curve can depend strongly on those choices. To learn which assumption matters, change one at a time.

**Try one sensitivity experiment:** [open diffusivity and separation](/?level=2&try=diffusionExperiment).

1. Choose a powered, mixed atomic feed in Coupled separation. Turn thermal evolution off. Rewind, set a nonzero current, then New run to clear power switches. Wait; choose a time strictly inside the run and [pin A](/?level=2&try=pin).
2. [Adjust only radial diffusivity](/?level=2&try=diffusion), then choose New run. Return to the same physical time in both cases. Check the accepted-input comparison for unintended changes.
3. [Show separation over time](/?level=2&try=separationPlot), then compare the speed history too. Diffusivity changes redistribution; redistribution also changes gas inertia, so speed need not be identical. Report the observed sensitivity without calling it a measured uncertainty interval.

For sampled ranges, open Model info → **Sensitivity & tested inputs**. Choose one coefficient and explicit Lower/Upper bounds around its current value, then Run samples. The shading covers only sampled cases, not a confidence interval or every value in between. It preserves the accepted drive history.

Under Model info, **Spatial argon reference** offers saved mesh refinements for one recorded condition. Overlap is useful numerical evidence for that separate reference, not a resolution control or validation of your live lithium run. The live spatial thermal model's Refined option estimates temporal error; spatial refinement is still needed.

## What is a defensible claim here?

“Under these inputs and assumptions, increasing diffusivity changed finite-time recovery” is testable. “This predicts Marathon's enrichment” additionally needs their apparatus, operating state and a matched measurement.

A Doppler instrument measures emission along a sightline, not automatically the local neutral speed. Comparing a local simulated velocity directly to that measurement can test the wrong quantity. The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) records remaining disagreement, not successful device validation.

**Keep one reproducible result:** export the accepted run, note the physical time and plot, and name the important closures. Operating maps and saved references answer their labeled conditional questions; they do not replace that run or certify an operating region.

[Qualification implementation](../src/fuel-qualification-ui.ts) · [More evidence experiments](/learn-evidence.html) · [Back to the physics guide](UNDERSTANDING-MASS-SPINNER-02.md)
