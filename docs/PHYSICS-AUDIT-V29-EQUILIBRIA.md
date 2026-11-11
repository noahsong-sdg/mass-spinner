# V29 independent equilibrium and reduced-model audit

2026-11-08. Scope: `centrifuge.ts`, `centrifuge-bulk.ts`, `gaussian-centrifuge.ts`, `magnetic-centrifuge.ts`, `equilibrium-model.ts`, `centrifuge-diagnostics.ts`, `geometries.ts`, `transport.ts`, and their actual model selection/plot paths. This is an equation, counterexample and numerical-resolution audit, not experimental qualification. Two reproducible P2 bugs were found, preserved as failing witnesses, independently reviewed by the parent, and fixed with authorization. No other production files were changed by this auditor.

## Findings and corrections

### P2: a finite outer annulus became numerically empty

**Execution path.** The selected Gaussian equilibrium reaches `centrifugeDiagnostics`, then `focused-diagnostics.js` renders radial inventory/composition. The old code computed annular inventory as `max(0, full - inner)` in `src/centrifuge-diagnostics.ts`. Bulk composition inversion also calls this helper, but uses its unchanged full-cylinder integral, not the faulty annulus.

**Trigger and verified result.** Radius 0.48 m; Gaussian width 0.05 m; rotation 10,000 rad/s; ion and electron temperatures 5 eV; B=0.1 T; axis density 1e17 m⁻³; 40 u and 84 u, both +e, central fractions 0.5; 1000 radial cells; cut r/a=0.7. The sampled densities outside the cut are finite and positive. Before the fix, outer inventory was `[0,0]` and its composition `[null,null]`. An independent 200,000-interval midpoint integral of the analytic Gaussian and composition law gives normalized species inventories `[9.845867607063782e-23, 1.6664368865072533e-22]` and fractions `[0.37139870922737034, 0.6286012907726297]`.

**Technical cause.** Full and inner inventory round to the same binary64 value; subtracting them cancels all tail information. Clipping the difference to zero concealed the failure. In simple terms, two large nearly equal numbers were subtracted to recover a very small amount, which disappeared in rounding.

**Fix and choice.** Integrate the annulus directly, including the appropriate portion of a cell crossed by the cut, using the existing exact cylindrical integral of the piecewise-linear density. Preserve full and inner integrals and all density normalizations. This is preferable to clipping, a density floor, or higher precision: it removes the unstable subtraction without changing the model or adding dependencies. Corrected inventories are `[9.859871187965875e-23, 1.6687539747045183e-22]`; the small remaining error is the resolved piecewise-linear discretization error, not an empty-region artifact.

**Regression and neighboring invariants.** Test finite tails at cuts 0.7, 0.70321 and 0.95, positive composition, full=inner+outer to rounding, an independent exact cut-crossing-cell antiderivative, and second-order convergence at 400/800/1600 cells. Relative total-annulus errors are 0.008752402086129436, 0.0021907260688893613 and 0.0005478459564230364 (approximately fourfold improvement per doubling). The bulk inversion, pure-species boundaries, radial partition and neighboring magnetic/Gaussian suites pass. Densities below binary64 underflow remain outside the representable domain; the correction does not invent particles there.

### P2: gyro-orbit display aliased a circle into a line or polygon

**Execution path.** Model Lab reduced configuration → worker `geometry` request → `geometry('gyro', config)` → plotted transverse spatial locus. This is a sampling error in the analytic display, not an error in the Lorentz integrator.

**Trigger and verified result.** With the default B=0.1 T, transverse energy 5 eV, duration 600 µs, and species 1 u/+2e versus 125 u/+e, the old shared slow-species time horizon produces 2001 samples of the fast species at half-period increments. Its reference gyroradius is 0.001609679288917555 m; its x span becomes 4.188202631437889e-15 m instead of 0.00321935857783511 m. A physically plausible 4 u/+2e versus 200 u/+e choice also produces a five-sided polygon. Both are inside the UI's numerical mass/charge domain; the first is an adversarial numerical input, not a proposed ion species.

**Technical cause.** Sampling four slow-species gyroperiods with 2000 common time intervals does not bound the fast-species phase increment. Correct analytic positions can therefore alias. In simple terms, the display takes pictures at nearly the same few points of each fast revolution, making a circular path look straight or polygonal.

**Fix and choice.** For each species, display at most its own first gyroperiod, with 2000 intervals. Preserve the selected duration for sub-period arcs and the full-duration axial-flight metric. State explicitly that these are spatial loci with different per-species time horizons, not common-time endpoint comparisons. Repeated revolutions add no new spatial locus, so this provides a bounded and uniformly resolved representation; adaptive sampling over thousands of identical revolutions would add cost without information. After correction, both transverse spans equal 0.00321935857783511 m in the witness.

**Regression and neighboring invariants.** Check three high mass/charge ratios, both transverse extents, chord length below 0.02 gyroradii, the 2001-point budget and exact endpoints for a duration of 1e-8 s. The existing gyro, curvature, double-well, mirror and prescribed-field geometry tests also pass.

## Independent equations checked

Use e>0, positive ion charge Z_s e, temperatures in eV and outward positive radius. For common rigid rotation Ω and uniform axial B, radial momentum gives

```
e Ti ∂r ln n_s = m_s Ω² r + Z_s e (−φ′ + ΩBr)
ψ = φ − ΩBr²/2
n_s = f_s exp[m_s Ω²r²/(2eTi) − Z_s ψ/Ti]
n_e = (Σ_s Z_s f_s) exp(ψ/Te)
Σ_s Z_s n_s = n_e.
```

The implemented scalar quasineutral root is monotone. A separate, unscaled Newton construction for three unequal-charge species (10 u/+e, 40 u/+2e, 70 u/+3e) agrees to 1e-12 at five radii. This checks more than feeding the implementation's own density back into its residual. For equal charges, independent elimination of ψ gives the exact log enrichment `Δm Ω²r²/(2eTi)`, independent of Te; the total density still depends on Te. The independent regression checks both statements. Bulk composition is a whole-cylinder number fraction, not an axis number fraction or charge fraction. The binary log-odds inversion preserves separate tiny central fractions and was checked through neighboring tests; no additional concrete failure was found.

For the equal-charge imposed Gaussian ion envelope `N=N0 exp(−r²/w²)`, composition follows the same mass-only ratio law. Summing radial ion force balance gives

```
φ′/r = ΩB + m̄ Ω²/(Ze) + 2Ti/(Zw²)
Ω_e = (φ′/r)/B + 2Te/(Bw²)
Jθ = −Nr/B [m̄Ω² + 2e(Ti+ZTe)/w²].
```

Signs, dimensions and factors of Z agree with the implementation. For the magnetic closure, Ampère's law is `−B′=μ0Jθ`, so

```
d(B²)/dr = 2μ0 Nr [m̄Ω² + 2e(Ti+ZTe)/w²].
```

The zero-rotation invariant is `B²/(2μ0)+Ne(Ti+ZTe)=constant`; an independent regression verifies it for Z=3 and negative B. The physical current identity `Jθ=ZeN(v_i−v_e)` also passes. A wall boundary with insufficient magnetic pressure is correctly rejected rather than repaired by changing density. With nonuniform B, the reconstructed electrostatic potential uses `ψ+Ω∫B(s)s ds`, not the uniform-B shortcut.

The curved-field formula `v_d=m(v_parallel²+v_perp²/2)/(qBR)` and deflection `v_d L/v_parallel` are consistent: at fixed kinetic energies the drift speed has no mass dependence, while flight-time differences make the displacement scale as √m/q. Guiding-center limits and the omitted self-generated electric field are material limitations, already stated in the model.

The reduced double-well landscape is the canonical radial Hamiltonian

```
U(r) = [Pθ−qBr²/2]²/(2mr²) + qV[(r/a)^4−κ(r/a)^2].
```

Its zero-Pθ minimum and nonzero-Pθ axis divergence are consistent. The r/a≥0.01 plotting cutoff is explicitly a crop of the singular view. A single Pθ landscape cannot determine thermal population, transport time or purity; it does not substitute for the separate collisional dynamics backend. No new error was demonstrated here.

The reduced transport expressions checked algebraically include Drude diffusion `D=(eTi/m)ν/(ν²+Ω_c²)`, positive-ion mobility `(q/m)ν/(ν²+Ω_c²)`, and a constant-cross-section Maxwellian threshold rate proportional to `mean(v)(1+E_threshold/T) exp(−E_threshold/T)`. These limited checks are not validation of a complete discharge or multi-species collision model.

## Primary-source comparison and limits

The primary reference opened for this audit is [Zweben, Gueroult and Fisch, *Physics of plasma mass separation* (2018)](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf), particularly Sections II B–D and the collision discussion. The tutorial distinguishes single-particle geometric separation, rotating collisional equilibrium and rotating-electric-field filters. Its discussions of space-charge fields, collisional redistribution, finite acceptance, instabilities and energy requirements support keeping these outputs conditional. A clean orbit or favorable equilibrium is not a device-level collection or power prediction.

An attempted full-text fetch of the ANU-hosted rotational-equilibrium paper timed out; it is not counted as independently read. The equations above were independently derived from Lorentz/radial momentum, quasineutrality and Ampère's law, then tested against the code. No experimental dataset, external field reconstruction or end-to-end deployed browser verification was obtained by this subaudit. The parent owns the separate source/region audit and final merged build gate.

## Reproducibility and exact checks

All project execution took place in a copied Apple safe-dev guest `safe-dev-542978ee55608678`, staged at `/tmp/mass-spinner-audit29-equilibria`. No host project scripts, container sockets, credentials or browser-policy workarounds were used. The guest copy was explicitly refreshed after edits and dependency installation occurred in the guest. The red and final guest exports were preserved before subsequent work.

Evidence is in `scientific/physics-audit-v29/equilibria/`: compact before/after core sources and tests, package lock, `probe.ts`, before/after probe JSON, red/green logs, artifact hashes, and the complete bounded tested-source hash map. `before/` contains the original seven-test witness; `after/` adds the cut-crossing-cell regression and non-grid cut. This explains the change from seven red-phase tests to eight owned final tests.

Commands, through `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-audit29-equilibria run --`:

```
node_modules/.bin/tsx --test tests/adversarial-equilibria-v29.test.ts
# Before correction: 7 tests, 4 pass, 3 fail (both bugs plus annular refinement).

node_modules/.bin/tsx --test tests/adversarial-equilibria-v29.test.ts tests/centrifuge.test.ts tests/centrifuge-diagnostics.test.ts tests/centrifuge-bulk.test.ts tests/gaussian-centrifuge.test.ts tests/magnetic-centrifuge.test.ts tests/equilibrium-model.test.ts tests/geometries.test.ts
# Corrected snapshot: 56 tests, 56 pass, 0 fail, 0 skipped.

node_modules/.bin/tsx probe.ts
# Before/after witnesses preserved in JSON.

npm run typecheck
# tsc --noEmit: exit 0 on the full bounded source snapshot.
```

The compact before/after directories contain all imports needed for these eight suites. They omit the full application/assets and are not a standalone browser build. The original full bounded source snapshot, including JS UI modules, is identified by `tested-snapshot.sha256`; this subaudit does not claim that unrelated concurrently edited parent files were part of its final test gate.

Corrected file SHA-256:

```
4354ee69f58e1d44aacebd2651740ad6d7ee9b4253d20d064dddcbe7187918fc  src/geometries.ts
e1ff38403a38d14c30634258adc7a7c573f946c75d892387c8c0a6d11c9a8151  src/centrifuge-diagnostics.ts
eaa434c21d6885601b151eecfefc2712c7c8ce66796d854c2352f6f20e524af3  tests/adversarial-equilibria-v29.test.ts
```
