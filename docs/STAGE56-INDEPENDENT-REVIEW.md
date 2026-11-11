# Independent review of stages 5 and 6

6 November 2026. This reviewer did not author the convergence runner, adaptive collision helper or engine integration. The review traced executed source and ran independent failure probes. It does not establish continuum or experimental validation, and did not access the deployed origin or a GPU.

## Paths checked

- Offline plan → source/dependency identity → independent-seed `executeSeed` → `simulateDoublewell` → dimensioned results → normalized observables → paired whole-run differences → declared-budget checks → artifacts.
- Fixed/adaptive cell selection → exact cylinder-cut volume → physical equal-weight density → unchanged conditional mixed-pair Coulomb generator → source/sink and H/Pθ ledgers → locality/regime diagnostics.
- Legacy missing-method configurations retain the fixed baseline; collision-off adaptive diagnostic construction must not alter trajectories.

## Findings and corrections

### Unsupported checks could produce false evidence

**Problem:** a custom plan could claim alignment/orientation tests by changing `collisionGridOffset` or `initialAzimuth`, although the solver did not read those fields. Identical seed paths could then appear invariant. Merely renaming identical configurations also permitted a purported refinement.

**Cause:** plan validation rejected unrelated differences but did not establish that the advertised change was actually supported and executed. In plain terms, changing a label was being treated as changing the experiment.

**Correction:** unsupported comparison kinds now reject explicitly; their required scientific coverage remains unknown. Timestep/particle/spatial plans must improve their advertised resolution; method comparisons must change an executed method setting. This is preferable to silently ignoring settings or interpreting identical output as evidence.

### Stale or mismatched run settings were accepted under a level label

**Problem:** `summarizeConvergence` previously grouped by level/seed without matching the run configuration. A coarse result carrying a fine-level label could contribute a passing refinement comparison.

**Correction:** run identity is checked against the complete declared configuration and seed; duplicate, failed, stale or mismatched runs are excluded from statistics and fail batch completeness. The offline runner supplies a per-run source hash and expected identity; missing identity remains unknown, mismatches fail. Package and lockfile hashes now supplement the executable import graph. This fixes evidence provenance without inventing a migration or treating old artifacts as current.

### A physical-effect label did not guarantee a controlled comparison

**Problem:** custom `physicalEffect` pairs could change density/horizon or use the same collision switch in both conditions while being described as collision-on/off effects.

**Correction:** control must have collisions off, the collisional condition on, and all other settings must match. This preserves a causal controlled comparison rather than trying to explain confounded output statistically.

### Unobserved seed spread produced a false zero-width certificate

**Problem:** identical whole-run outlet/CDF differences gave zero estimated standard error and a zero-width t interval. A handful of identical discrete observations cannot exclude an unobserved rare tail. The original implementation could mark equivalence passed solely because none appeared.

**Correction:** empirical zero or arithmetic-roundoff-level spread retains the point estimate/standard error but withholds interval bounds, so equivalence remains unknown. No pseudocount is added. A separately established analytic identity belongs to reference tests, rather than acquiring a Monte Carlo confidence claim from identical observations. Nondegenerate intervals remain approximate pointwise Student-t inference across independent whole runs, with that assumption stated; they are not simultaneous bands or distribution-free guarantees.

### Energy and spatial diagnostics needed accurate meanings

`impact.energyJ` is laboratory Hamiltonian `K+qφ`, not deposited kinetic energy. Its convergence observable is now called `impactHamiltonianEV`. The value was not changed or promoted to wall heat.

Adaptive output formerly displayed Cartesian grid-width ratios even though `cellsAcross` does not choose adaptive leaves. Those ratios are now suppressed in adaptive mode; actual target/depth and measured pair distances are reported. Zero-pair RMS separation is undefined, displayed through the existing nonfinite formatter instead of a fictitious perfect-locality zero. Raw counters remain zero.

## Adaptive method assessment

The helper constructs position-based geometric bisection leaves, computes exact cylinder-cut volumes and preserves each representative exactly once. Conditional on a leaf, the existing mixed-pair empirical generator and equal weights are unchanged. Pair energy/linear momentum and fixed-baseline behavior pass their tests; a separate review probe confirms that selecting adaptive diagnostics with collisions disabled leaves the history, destinations and conservation output unchanged.

These properties do **not** remove data-dependent density bias or nonlocal collision torque. Fixed target occupancy is not itself a continuum limit; spatial extent and occupancy must converge jointly. An artificial momentum projection, density correction based on the initial pulse, or lower physical density was not introduced. The candidate remains off by default. Its actual ensemble results and negative findings are owned by STAGE6-LOCALITY.md and the matching source-identified artifacts, not certified by this unit review.

## Evidence

Independent `tests/review-stage56.test.ts` initially reproduced two failures against the pre-correction source: unsupported sensitivity accepted and stale configuration not rejected. It now adds six probes covering those failures, controlled collision-on/off conditions, placebo refinements, degenerate uncertainty and collision-off trajectory invariance.

Executed:

```
./node_modules/.bin/tsx --test tests/review-stage56.test.ts tests/convergence.test.ts tests/collision-locality.test.ts
```

**19 passed, 0 failed**, approximately 304 ms at the reviewed snapshot. No tolerance relaxation or test skipping was used. The required whole-repository typecheck/build and final deployment evidence belong to the root final gate; a narrow pass does not cover later edits.

No accounts, persistence migration, remote input execution or credential access were added by these paths. CLI JSON plans are data, not evaluated code. This is a limited source review, not a security penetration test. The prior user-authorized scoped host exception was used with `login:false`; no isolation, hook or browser policy was changed, and no browser/CDP/origin-fetch workaround was attempted.

## Remaining gates

The matrix still cannot certify alignment/orientation sensitivity that the solver does not implement. It does not infer a continuum bias bound from a torque-corrected ledger. The physical-effect-versus-numerical-error gate remains unknown until supported. The adaptive candidate and default pulse remain exploratory until joint intended-horizon spatial/particle/time/seed convergence is demonstrated. No measured apparatus or held-out experimental validation follows from the code checks.
