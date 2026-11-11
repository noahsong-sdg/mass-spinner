# Adversarial Marathon solver audit

8 November 2026. Scope: live reduced source, simultaneous fixed-site loading, single-node exposure and optional free-flight sample geometry. Two P3 numerical defects were reproduced and fixed. Neither was a demonstrated failure of the current thin-target UI operating range. Numerical agreement does not qualify Marathon hardware, LiT retention or target lifetime.

## Traced execution paths

- `fusion-ui.js` → `simulateFusionBeam()` → `fusionPlaygroundData()` → source metrics/profiles/energy scans.
- Source result → `simulateTargetLoading()` → populations, independent event ledgers and evolving **D–T** rate.
- Source result → `simulateTargetExposure()` → exact single-pulse/cooldown temperature and signed heat budget.
- Source result → `isotropicDiskReference()` → incident current through a disk, not scalar flux or an angular neutron-transport solve.

Production was initially read-only. Parent authorized the small loading fixes after the original and intermediate failures were exported. Other agents' D–T-only label edits were preserved.

## P3: residual target cancellation corrupts the opaque-limit instantaneous rate — fixed

The fusion-only branch computed accurate event counts, then reconstructed remaining T as `f0 − fused`. When both quantities round to the same number, this loses a positive residual inventory that can still have order-one optical depth. In simple terms, subtracting two almost equal totals erased the tiny population that determines the remaining reaction rate.

Let `u` be incident D per initial hydrogen site, `f0` the initial T site fraction and `tau` the unit-loading optical depth. The declared equations give

```
df/du = −[1 − exp(−tau f)]
tau f(u) = log[1 + (exp(tau f0) − 1) exp(−tau u)].
```

At `u=f0=1`, this gives `tau f=log(2−exp(−tau))`, so the normalized instantaneous D–T rate approaches 1/2 even when the residual population is tiny.

| tau | Original final T | Exact final T | Original rate / incident rate | Exact rate |
| --- | --- | --- | --- | --- |
| 1e10 | 6.9314665e−11 | 6.9314718e−11 | 0.4999997353 | 0.5 |
| 1e16 | 1.1102230e−16 | 6.9314718e−17 | 0.6705145305 | 0.5 |
| 1e20 | 0 | 6.9314718e−21 | 0 | 0.5 |

The fix computes the remaining optical depth directly when more than half the initial T has fused:

```
logY = tau*(f0−u) + log(1−exp(−tau*f0))
remaining optical depth = softplus(logY).
```

`expm1` and `log1p` evaluate the small complements; subtracting dose before multiplying by `tau` also avoids cancellation of two huge products. The well-conditioned minority-loss branch retains its previous subtraction. The existing fused/transmitted event-channel formulas are unchanged; the instantaneous hazard uses the directly evaluated remaining optical depth. No clipping, conservation projection or benchmark adjustment was added. This targets the lost physical quantity rather than changing tolerances or applying a floor to the result.

The current source UI reaches optical depths of order 0.005, not 1e16. The witness is a valid extreme input to the exported loading API and a regression of its advertised opaque-limit numerics; it is not evidence of a large current UI yield error.

## P3: the last output sample can represent the wrong exposure — fixed

The stronger adjacent-dose test still failed after the survivor fix. Forming every grid target as `dose*i/intervals` can move even the final target by one floating-point increment. In an opaque target's narrow depletion transition that changes the final instantaneous rate substantially. An independent reviewer reproduced the same defect separately.

The exact requested final dose is now used at the last index in both the analytic history loop and the coupled solver's output-target loop. The requested final exposure is a real invariant; no interpolation or rescaling of solved states was added. Explicit tests require `final.timeS === exposureS` and correct incident counts for both branches, including immediately neighboring floating-point exposure values. The existing intermediate output-grid policy is unchanged. This is the smallest correction to the actual endpoint rather than relaxing the rate comparison.

## Independent equation and convergence checks

The source event integrals obey the declared energy identity `E0 = stopped energy + incident energy consumed in reactions + surviving exit energy`. With piecewise-constant reaction hazard and linearly varying energy, the within-slab attenuation/energy integrals are consistent. A separate RK4 integration of continuous depth dynamics checks survival, stopping and reaction energy at 32768/65536 reference steps. For incident energies 20, 100 and 500 keV, loss fraction 0.9 and T column 1e25 m−2, the 25→100→400→1600 slab refinements improve the survival error monotonically. The 400-slab survival error is below 2e−7 absolute; stopping agrees within 3e−6 relative. A closed energy ledger alone would not establish that convergence.

The source's mean product powers are consistent with its explicitly approximate mass numbers and isotropic-CM assumption: neutron mean energy is `0.8Q+0.56E`, alpha mean energy `0.2Q+0.44E`, so their sum is `Q+E`. Zero-slowing checks independently verify attenuation and product/beam power identities at 20/100/500 keV and zero/thin/high UI T columns. This does not validate the actual angular spectrum or measured material stopping.

The coupled loading transformation is algebraically correct. If `H` integrates the per-T fusion hazard and `R` the replacement hazard, then `T=f0 exp(−H−R)`, `D=1−f0 exp(−R)` and `V=f0 exp(−R)[1−exp(−H)]`. Independent RK4 advances the **untransformed** T/D/vacancy and event-channel ODEs over 24 cases spanning `tau=0.005,0.8,100`, replacement probability `0.05,0.8`, initial T fraction `0.01,0.65` and dose `0.1,10`. Two reference step counts agree; production populations/events pass the stated 3e−8 relative plus 3e−11 absolute comparison. Existing independent 42-case reference tests also pass after the fixes. These are bounded checks, not a global adaptive-error certificate.

The thermal exact solution is consistent with `C_A d(T−T_bath)/dt=q''−h(T−T_bath)`. Heating and cooldown are monotone segments, and their exact switching/end times are retained. Additional checks cover initially colder/hotter assemblies, adiabatic and tiny/large conductance, endpoint peak bounds and signed energy conservation. A separate Simpson surface quadrature checks the disk solid angle/current over all nine combinations of distances 0.1/0.5/3 m and areas 1e−4/1e−3/1e−2 m2. No new defect was found in these paths.

## Verification and retained evidence

All execution ran in copied Apple safe-dev VM `safe-dev-5acf18344fbc5f3f`, stage `/tmp/mass-spinner-physics-audit-v29-marathon-solvers`, after explicit source sync and dependency installation. No host project code, credential/home/socket mounts or browser-policy workaround was used. Frozen older study artifacts were not modified.

- Original solver: 38/39 checks passed; the new opaque-tail test failed.
- Survivor-only fix: 48/49 checks passed; the stronger neighboring-dose test exposed the endpoint defect.
- Final solver: **50/50 checks passed**, zero failures/skips; strict standalone TypeScript check of `src/target-loading.ts` passed.
- Independent nuclear reviewer: original 7/9 → survivor-only 8/9 → final 9/9, including exact crossover, neighboring exposures and thin analytic checks.
- Final source hash: `4dd86b27ec8e14dccd540206c43532ccab590a2a859e52d2eb9014c079915de4` for `src/target-loading.ts` (includes separately reviewed D–T label strings).

The final runner records exact commands in `scientific/physics-audit-v29/marathon-solvers/audit-checks-green.json`; logs, original/survivor-only sources, crossover witness, probe, runner and tested source maps are retained beside it. The first extra attempt to typecheck Node-based test files lacked Node declaration packages; that harness error is retained, and the final source-only command matches the repository's production typecheck scope. Parent owns final whole-application build/typecheck and integration gate.

## Boundaries and primary sources checked

No measured LiT stopping/retention calibration, energy straggling, spatial isotope profile, D–D production, target renewal, phase change, temperature feedback on source/loading, or full coupled source/thermal/material evolution was established. The thermal and evolving-loading references remain separate observers of the frozen initial source. These are declared model limits rather than findings that the implemented reduced equations are wrong.

- [Marathon's public beam-driven architecture](https://www.marathonfusion.com/beam-driven-fusion/): deuterium source, accelerator and solid LiT/cooled backing, not public calibration data.
- [ASCOT5 Bosch–Hale implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c): independently checked the low-energy D–T coefficients and millibarn-to-m2 convention; the live model intentionally restricts its fit domain.
- [SciPy RK45 documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.RK45.html) and [pinned SciPy RK45 tableau](https://raw.githubusercontent.com/scipy/scipy/v1.16.3/scipy/integrate/_ivp/rk.py): the implemented Dormand–Prince 5(4) tableau and local-error scaling are consistent. Its positivity/stage checks and step controller are project code, not an installed SciPy solver.
