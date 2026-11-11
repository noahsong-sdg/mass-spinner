# Independent H-1 first-capture audit

The corrected restricted experiment passes the independent numerical and UI gates below. This qualifies its stated mathematical approximation; it does not validate full neutral/plasma transport or a real separator.

## Physical scope and evidence

The reviewed execution path is `setupHydrogenTracer` → `simulateHydrogenTracer` → exact charged-cylinder exit / constant-hazard first capture → exact neutral-cylinder exit → two-product ledgers and plotted trajectory. The experiment launches H-1 nuclei on axis at `z = 0.02 L`, with uniform signed axial B, E=RF=0 and cold stationary ground-state H-1 gas. Only the first capture of the injected nucleus is followed. Its fast neutral flies ballistically; the reservoir-origin ion remains at rest in the prescribed fields. Subsequent atomic reactions of either product are unresolved.

The primary report checked was [Janev, Reiter and Samm, Jülich 4105 (2003)](https://juser.fz-juelich.de/record/38224/files/Juel_4105_Reiter.pdf), §2.2.3, Eq. 44 and Table 9, n=1. The coefficients and keV/amu convention agree with the kernel and the independent test transcription. The report estimates roughly 10–20% fit accuracy. Its total capture cross section supplies an event hazard, not a differential nuclear-scattering law. The prescribed straight-through product trajectories remain an approximation; agreement with exponential survival tests only the implementation of that prescription.

For this configuration speed and hazard are constant, so `t_CX = -log(1-u)/(n σ v)` competes directly with the first charged wall/end intersection. There is no transport timestep or per-step probability cap. Both products are needed in the canonical angular ledger:

`Pθ = m(x vy - y vx) + q B (x² + y²)/2`.

The axis launch has initial Pθ=0. After capture the fast neutral keeps mechanical angular momentum, while the stationary slow ion contributes the missing magnetic term. Mechanical angular momentum alone changes by the external magnetic torque; it must not be reported as conserved.

## Bugs exposed and corrected

**Near a grazing wall, a neutral could exit before it was created.** Technically, a helix position rounded to `r²-R² = +6.938893903907228e-18 m²` at R=0.2 m. The quadratic ray solver assumed a strictly interior start and returned a negative forward intersection. In simple terms, floating-point arithmetic placed an almost touching particle infinitesimally outside its vessel and then traced it backward. The reproducible witness had B=0.003242784133898351T, capture time `1.0113913161443596e-5s` and additional neutral flight `-5.105899020642693e-14s`.

The fix admits only a geometry-scaled arithmetic band (`32 ε R²` radially, `32 ε L` axially), classifies a point already on an absorbing boundary as an immediate exit, and rejects genuinely exterior or non-forward input. Strictly internal rays retain the stable positive quadratic. This enforces the actual absorbing-domain invariant; blindly clamping every negative root could conceal invalid geometry. The original failing grazing test was retained, with added exterior-rejection checks.

**A many-turn trajectory could look geometrically wrong despite correct event results.** A fixed segment cap undersampled gyro phase for valid long-flight/high-B configurations. In simple terms, the display joined widely separated orbit points and drew chords through missing turns. The implementation now withholds the full 3D line if its ≤0.05rad phase requirement needs more than 4096 segments. The displayed exact transverse footprint contains at most one repeated turn plus the true terminal point, neutral segment and stationary-ion marker. This keeps the event solver exact without spending an unbounded rendering budget or drawing aliased geometry. It is a projection, not a resolved full 3D trajectory in the withheld case.

**Valid endpoint energies could fail after velocity conversion.** Squaring a rotated velocity can move a nominal 0.1 or 20 eV/u value a few floating-point units beyond the fit guard. The guard admits only 16ε arithmetic error around its endpoints; it does not physically clamp or extrapolate the cross section. This preserves the declared energy domain while avoiding angle-dependent endpoint rejection.

## Exact checks and snapshot

All execution used the existing isolated Apple VM through safe-dev. Guest source was explicitly replaced from `/tmp/mass-spinner-precision-integration-v38`; no host mounts, credentials or browser-policy bypass were used. The copy contained 435 files / 89.6 MiB, with dependencies installed offline and lifecycle scripts disabled.

Corrected manifest: `/tmp/mass-spinner-precision-integration-v38/tested-hydrogen-independent-v38-corrected.json`, SHA256 `2c49f8189c1ccc40c5d3e2e78f82e52fdb11ec5ea2f6197685c200500976be56`.

Durable manifests, complete final test output, strict-typecheck output, exit-code records and the pre-fix numerical witness are preserved in [`scientific/depth-experiments-v38/independent-h1`](../scientific/depth-experiments-v38/independent-h1/). The final logged repeat also passed 20/20; the strict-typecheck log is empty because that command succeeded without diagnostics.

Frozen production SHA256:

| File | SHA256 |
| --- | --- |
| `src/hydrogen-tracer.ts` | `f52a29d88371784a343f85939a6b35265740bea250af268dacd539213e1d7eaf` |
| `src/hydrogen-tracer-ui.js` | `9a2112df692749982d8aa28b9cb0daa23c906652c68c6c599a99341b9e826f1c` |
| `src/hydrogen-charge-exchange.ts` | `763dd176861feaf62306c1a92483c573c3bb7c2b0c9ec869383b56afc32c792d` |

```sh
safe-dev -C /tmp/mass-spinner-precision-integration-v38 sync --replace-guest
safe-dev -C /tmp/mass-spinner-precision-integration-v38 run -- npm ci --offline --ignore-scripts
safe-dev -C /tmp/mass-spinner-precision-integration-v38 run -- node_modules/.bin/tsx --test tests/hydrogen-tracer-independent-v38.test.ts tests/hydrogen-tracer-v38.test.ts tests/hydrogen-charge-exchange-v38.test.ts tests/hydrogen-tracer-ui-v38.test.ts
safe-dev -C /tmp/mass-spinner-precision-integration-v38 run -- node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck src/hydrogen-tracer.ts src/hydrogen-charge-exchange.ts
```

Results: offline installation succeeded; **20/20 tests passed**; strict module typecheck exited 0. The independent tests include a separately stepped 4096-step RK4 Lorentz orbit, signed/zero-B limits, wall/end/CX event ties, 6144 stratified probability draws, 162 endpoint/rotation cases, 288 domain-corner cases, near-grazing exits, energy/impulse/mechanical/canonical angular ledgers, stationary secondary-ion bookkeeping, and phase-resolution withholding. The real JSDOM UI test exercises plots, sliders, exact off-grid entry, invalid seed clearing and explicit recovery. These are mathematical and DOM checks; live GPU rendering, deployed behavior and mobile layout were not observed by this audit.

Before the correction the unchanged independent/core/kernel gate had **16/17 passing**, with the grazing test failing. Its manifest is preserved as `tested-hydrogen-independent-v38-final.json`, SHA256 `07559845343e8a6bf63175c8f5edb9e823d15dc258562d3dd92b07e9af1ddfed`. No tolerance was relaxed to obtain the final pass. Required repository-wide build/typecheck remain the parent integration gate.
