# Second audit: collision model, local regime and next-stage gates

Audited 6 November 2026 by a fresh reviewer. Production code was not changed by this reviewer. The review independently traced the mixed collision kernel, physical weights, cells, regime calculations and the actual deployed-default configuration. It reopened primary literature and ran new probes. No browser/deployed-origin access was attempted.

**Verdict:** no new sign, charge-power, reduced-mass or SI coefficient error was demonstrated in the collision pair map. The inhomogeneous transport prediction remains exploratory. The actual default horizon has a substantially larger raw angular-momentum error than the previously quoted short refinement experiment, and a deterministic spatial density error survives infinite particle count.

## Evidence and source path

Traced `doublewell-ui/config → simulateDoublewell → equal weights → collisionCells → collideCoulombCell → scatterCoulombPair → local diagnostics/history → output metrics` and the complete initial-state guard path. Read `src/coulomb.ts`, `src/doublewell-regime.ts`, `src/doublewell-dynamics.ts`, their analytical/statistical tests and the previous numerical report.

Fresh primary check: Wang et al., *Particle simulation of Coulomb collisions: Comparing the methods of Takizuka & Abe and Nanbu*, [author full text](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf), [DOI](https://doi.org/10.1016/j.jcp.2007.12.027). Equations 1–2 support the Landau operator and Gaussian half-angle variance. The source's pairing is species-separated; the app's mixed random-batch density correction is a separate empirical-generator derivation. The paper also demonstrates finite timestep and statistical errors and explicitly limits the time integration accuracy. Nanbu's alternative reduces timestep error in their comparisons; it does not establish spatial correctness for this app.

The current coefficient `qₐ²qᵦ² n lnΛ Δt/(8π ε₀² μ²g³)` and exact center-of-mass reconstruction have consistent dimensions and signs. For mixed pairing, even-N partner probability `1/(N−1)` times density `n(N−1)/N`, and odd-N probability `1/N` times density `n`, both produce `n/N` per represented other partner. This checks the infinitesimal empirical generator, not arbitrary finite-Δt Landau accuracy or a continuum convergence result.

## P1: actual default pulse is not validated by the short-horizon result

New run used **unmodified DEFAULT_DOUBLEWELL**: 40/84-u singly charged ions, density 10¹⁸ m⁻³, Ti=Te=5 eV, B=0.06 T, V=20 V, κ=1.2, a=0.2 m, L=0.6 m, source radius 0.08 m, initial slug length 0.15 m, 128 representatives/species, three cells across, dt=100 ns, duration **200 μs**, seed 42. Source flow is species-dependent zero-mean-Pθ plus thermal spread; all initial species counts and weights are equal.

| Diagnostic | Fresh result |
| --- | ---: |
| Maximum sampled raw Pθ balance / initial positive scale | **0.0172459944** |
| Maximum measured-torque-corrected Pθ residual | 1.08422×10⁻⁶ |
| Maximum sampled H residual | 1.25393×10⁻⁶ |
| Accumulated signed collision-cell torque | 3.56218×10⁻⁹ kg m²/s |
| Initial net canonical angular momentum | 4.07411×10⁻⁹ kg m²/s |
| Local-regime unresolved snapshots | **155 / 155** |
| Initially unresolved representative fraction | 13.671875% |
| Unpaired representative exposure | **10.7531%** |
| A final (active, wall, end, source) | (36, 0, 83, 9) |
| B final (active, wall, end, source) | (36, 5, 74, 13) |

The 1.72% figure is of the engine's positive initial normalization, **not** of initial net Pθ, each species' budget, or a separation observable. Initial net Pθ is close to zero by construction, so a percentage of that signed total would be ill-conditioned. The SI values nevertheless show that numerical torque is material. The earlier 0.27–0.35% range came from a different, finer, **20 μs** experiment. Neither number may be substituted for the other or promoted to a global bound.

**Technical cause:** binary impulses conserve energy and linear momentum but are applied at separated positions. Their torque is `(rₐ−rᵦ)×Δpₐ`; repeated impulses accumulate during the longer trajectory. **Plain explanation:** particles are treated as colliding despite not occupying the same point, which can add artificial rotation. Subtracting that measured torque explains a ledger; it does not undo changes to paths or collection.

**Next fix:** improve spatial locality and demonstrate joint spatial/particle/time/seed convergence at the intended horizon. Do not suppress collisions, lower physical density or shorten the experiment merely to obtain a smaller residual and then call the original case validated. A shorter or different operating point can be a separately declared benchmark, with its own intended observables and acceptance tests.

## P1: the sharp pulse has deterministic cell-density smoothing

For a uniform initial pulse of volume `Vp` and density `n₀`, let `vⱼ` be its overlap with collision cell volume `Vⱼ`. In the infinite-representative limit, that cell uses `nⱼ=n₀vⱼ/Vⱼ`. Averaging the assigned density over initial pulse particles gives

```
<n_cell>_pulse / n₀ = Σⱼ vⱼ² / (Vp Vⱼ).
```

This follows from the declared source and the actual constant-density cell operator. The new audit test independently integrates circle/rectangle intersections by midpoint quadrature; it does not call the production circle-area helper. For the unchanged default pulse geometry:

| Cells across diameter | Initial marker-averaged cell density / n₀ |
| --- | ---: |
| 2 | 0.120000 |
| **3, default** | **0.685858** |
| 4 | 0.418879 |
| 6 | 0.746030 |
| 8 | 0.735446 |
| 12 | 0.806642 |

The error is nonmonotonic because cells align differently with the disk and slug. It survives arbitrarily many markers at fixed cell geometry. It therefore cannot be repaired by an ensemble-size slider alone.

This is a **density multiplier**, not an asserted exact 31.4% error in every collision moment. For identical local velocity laws it multiplies the initial infinitesimal density-dependent rate. The actual source also has spatially varying rotation, so nonlocal partner velocity differences and the `g⁻³` coefficient introduce further effects. The table isolates a verified spatial error without pretending to quantify those extra biases.

**Plain explanation:** a partly filled cell spreads its particles over the whole cell when estimating density. Different grid alignments spread the pulse differently. **Next fix:** a demonstrably local/adaptive collision representation or a resolved smoother source, validated against the original declared source as applicable. An overlap correction based on the initial pulse would become wrong after expansion and is not an acceptable permanent density patch.

## P2: finite-time and local-regime evidence remains limited

- Homogeneous pair conservation, independent Rutherford moments and the Maxwellian initial energy-exchange coefficient are strong controlled checks. The current finite-time relaxation tests still use broad finite-sample consistency and direction-of-relaxation assertions. They are not an independent full nonlinear Landau solution.
- Large Gaussian half-angle variances can produce large finite-step bias even though the rational pair map remains finite and conservative. Counting variance >0.1 is useful, but its count is a reporting convention. Rare low-g pairs prevent a simplistic requirement that every variance be below a fixed threshold. Use moment/observable convergence and consider a documented cumulative-angle scheme such as Nanbu as an independently benchmarked alternative; do not clip g or rates.
- The supplied Coulomb logarithm is constant. Electron temperature and electron-Debye screening are imposed, and there is no electron energy/momentum evolution. Passing the sampled regime checks does not validate those assumptions. A plasma-field closure and input calibration are later stages, not substitutes for fixing numerical transport first.
- Four representatives per present species is a minimum estimator convention, not evidence that local tails, anisotropy, shear or absent minority populations are resolved. The current default never attains a wholly resolved sampled trajectory. Local estimated temperature can include unresolved flow shear; independent seeds and increased local occupancy are necessary.

## Recommended order and acceptance gates

1. **Automated trust/benchmark layer:** export dimensional normalization scales and full settings; run actual intended presets across independent seeds and independent dt/N/grid refinements; show raw SI conservation, observable means, uncertainty and local occupancy/status. Add translated/shifted grid checks to expose alignment bias. Gate a preset on declared observable accuracy at its declared horizon, rather than one small corrected residual.
2. **Spatial collision method:** compare genuinely more local matching/adaptive cells to a high-resolution reference; increase marker count sufficiently when shrinking cells. Measure density moments, raw Pθ, torque quadratic variation, radial distributions and outlet counts. Require the last two independent refinements to agree within a predeclared practical tolerance and their independent-seed uncertainty, and require numerical bias to be small relative to the physical collision-on/off effect being interpreted. Do not infer correctness from monotonic N alone.
3. **Finite-time collision benchmark:** reproduce a fully specified published homogeneous relaxation problem or compare against an independent deterministic Landau solver. Separate timestep bias from Monte Carlo variance over multiple relaxation times. Retain the existing initial-coefficient tests and add a documented cumulative-angle alternative only if it improves measured cost/accuracy.
4. **Driven/source/electron closure and physical validation:** add measured source distribution, potential/field profiles, electron assumptions and collector acceptance at one documented operating point; validate another held-out condition. Continuous injection, power/throughput and engineered purity require explicit budgets and data. Adding more separator families or a full PIC engine before these gates would broaden scope without resolving the current uncertainty.

No universal physical accuracy threshold is proposed. A criterion such as a 1-percentage-point outlet-fraction change or a 1% radial-moment change is a possible *chosen engineering/learning target*, not a theorem or literature standard. It must be stated beforehand, supported by sufficient independent seeds, and tied to an observable whose predicted effect is larger than the remaining error.

## New checks

`tests/audit-collision-v7.test.ts` adds two diagnostic audit probes: independent pulse-cell overlap integration and an actual unchanged-default run. They expose limitations and verify accounting; their passing status is not a transport-convergence pass.

Executed narrow command: `./node_modules/.bin/tsx --test tests/audit-collision-v7.test.ts tests/doublewell-regime.test.ts` — **8 passed, 0 failed**. Then `./node_modules/.bin/tsx --test tests/coulomb.test.ts tests/coulomb-independent.test.ts tests/audit-collision-v7.test.ts tests/doublewell-regime.test.ts` — **16 passed, 0 failed**, about 18.6 seconds. Production changes, full project build/typecheck and any release remain with the parent. Existing scoped host execution was used without changing isolation settings, hooks or credentials.
