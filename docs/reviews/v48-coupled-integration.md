# Independent coupled-rotor integration audit

Scope: worker acceptance → transport history → transient motion and diagnostic section → plots → pinned comparisons → exported accepted state. This review does not independently qualify the radial PDE or the Marathon apparatus. The physics and numerical reviewers own those derivations and convergence gates.

## Initial execution-path findings

1. **Motion discarded the distribution feedback.** Both transient display modes called the analytic uniform-inertia `rotorResponse`/`rotorPhase` even when accepted transport data existed. In simple terms, the gas could separate but the visible rotation would continue along the old trajectory. The narrow fix consumes the accepted coupled speeds and phases in both transient modes, while retaining the analytic path for reference-only results. Recomputing a separate display rotor would duplicate physics state and permit disagreement.
2. **Diagnostic scales ignored transient extrema.** `comparisonDomain` inspected only final equilibrium profiles and the uniform-inertia rotor samples. This could saturate a quantitative layer if an accepted transient contained a larger density or speed. The narrow fix includes the accepted finite-volume cells and transient speeds in the shared domain, without independently normalizing A and B.
3. **Claims needed to follow the new numerical scope.** The old section/plot strings said prescribed rotation and omitted inertia feedback. These statements become false once angular momentum and changing inertia are coupled. They must describe the coupled global rotor while continuing to disclose imposed temperature, fixed ion inertia and unsolved local-fluid/axial-flow physics. Equilibrium, pump, cascade and operating-map references must remain explicitly separate from the evolved calculation.

The worker already attaches transport to its accepted result when requested. Pins deep-clone and freeze the accepted result; export serializes that accepted result with its producing identity. These paths should carry the added conservation history intact rather than reconstructing it from pending slider inputs.

## Independent regression coverage

`tests/fuel-coupled-integration-v48.test.ts` exercises actual numerical outputs and the actual display adapters/geometry, with browser I/O mocked only where necessary:

- A driven case must discriminate the old fixed-inertia speed, and both transient display modes must match sampled coupled speeds and phases at saved and interpolated times.
- Slow rotational playback and azimuthally averaged transport must have identical neutral tracer radii at the same time. Neither can show equilibrium pump packets as solved transient extraction.
- A reference-only result without transport keeps its analytic motion path.
- Deliberately distinct accepted transient extrema must be covered by the physical color domains; this does not presume that every current parameter case exceeds its reference.
- A pinned result must preserve the entire immutable coupled history after the original result is mutated.
- The actual UI must expose finite momentum/inertia plots; seeking must consume the accepted result without another solver request, and the real section probe must sample the same coupled speed/time. The selected Gas motion inspector must also describe the coupled path rather than retain the former uniform-density/prescribed-rotation claims.

Project tests are executed by the root agent in the existing isolated safe-dev guest. This reviewer performs no host project execution or VM changes. Actual browser/GPU verification is also the root agent's responsibility. Source review and test authoring are not evidence of successful runtime verification.

## Verification status

Reinspection confirms that both transient motion modes consume sampled coupled speeds/phases and share the neutral CDF reconstruction; section probes and transient profile/cut plots consume those same samples. The new angular-momentum and inertia plots use the accepted conservation history. Comparison domains include every saved transient density/speed, and clearing a comparison restores the current result's complete domain. The analytic path remains confined to reference-only data and explicitly selected equilibrium/flow references. Gas motion inspector wording now describes the coupled path, and the operating-map UI and exported interpretation identify the separate uniform-inertia reference. No outstanding P1/P2 integration finding remains within this review's scope.

Independently read the root-executed `scientific/fixes-v43/coupled48-narrow.log` and its receipt/input manifest. The exact tested source snapshot is `3a8645215589582bf2593a598d1099dc85951e5577435d3ad5f323c2a16f356c` (528 inputs, verified before and after execution). Current host hashes of this review's test and the seven integration source files match that input manifest. The executed command was:

```sh
node --import tsx --test tests/fuel-transport-v47.test.ts tests/fuel-transport-independent-v47.test.ts tests/fuel-coupled-rotor-v48.test.ts tests/fuel-coupled-independent-v48.test.ts tests/fuel-coupled-convergence-v48.test.ts tests/fuel-coupled-integration-v48.test.ts tests/fuel-motion-transport-v47.test.ts tests/fuel-centrifuge-ui-v44.test.ts tests/fuel-playground-integration-v47.test.ts
```

All six independently authored integration tests pass (TAP tests 35–40). The entire narrow batch passes 76/77 and exits 1: the remaining failure is the separate joint space/time convergence gate (`fuel-coupled-convergence-v48.test.ts`), with reported differences `0.0005855546088943291, 0.0006184868456246995, 0.00037577911483778714`. This integration pass does not waive that physics/numerical gate. Final required build/typecheck, repaired convergence rerun and deployed browser/GPU/mobile checks remained root-owned and pending at this historical review point.

## Final closure

Root subsequently executed the completed 1021-test suite and all eight release gates on snapshot `014e23bc52a1008a636e27973b956004ca31a7867b50528b81034bb1f83137d7`, all passing. The independent numerical/physics reviews diagnose and close the refinement finding. The integration reviewer separately inspected these final logs, deployment/provider evidence, live geometry JSON and screenshots; that closure and the mobile regression are recorded in [v48-mobile-regression.md](v48-mobile-regression.md). Root's actual browser checks and exact release identities are in [the release report](../COUPLED-ROTOR-RELEASE-V48.md). This later evidence supersedes the pending status above without rewriting the first failed batch.
