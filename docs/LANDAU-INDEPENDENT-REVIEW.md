# Independent review of the isotropic Landau reference candidate

6 November 2026. Independent source/equation review of `src/landau-reference.ts`, `scripts/run-landau-reference.ts`, the five tests, the campaign artifact and its report. This reviewer made no production changes and did not access the deployed browser or origin.

## Verdict

**No additional blocking equation, SI coefficient, mass-factor or flux-sign defect was reproduced.** The implementation is a useful independent homogeneous isotropic reference candidate. Its `finiteTimeReferenceAccepted:false` and campaign `referenceAccepted:false` must remain: this review does not establish distribution-level accuracy, broad nonlinear Landau validation, spatial separator convergence or experimental prediction.

## Equations checked independently

Reopened [Shiroto et al., Eqs. 1–4 and 9–10](https://arxiv.org/html/2011.13086). Their potential convention has `∇²H=−8πf` and `∇²G=H`; spherical integration gives `H′=−8πI2/v²` and `G″=(8π/3)(I4/v³+J1)`. The code uses the correct positive inward-drag coefficient `−(ma/mb)H′`. Converting the Coulomb coupling to SI gives `Γab=qa²qb² lnΛ/(8πε0²ma²)`, matching the implementation.

Independently rescaling velocity by `s` and phase-space density by `n*/s³` gives the code's common coefficient `Γab n*/s³`. Physical distribution units are correctly `s³/m⁶`. The radial shell volumes and energy weights integrate `4πv²` and `4πv⁴`, respectively.

For face Peclet number `w=FΔv/D`, the Bernoulli coefficients satisfy `B(−w)=exp(w)B(w)`. The resulting flux vanishes for the expected exponential stationary ratio and transports toward lower speed under drag. The backward-Euler tridiagonal matrix has the expected conservative face cancellation and positive M-matrix structure in the mathematical finite domain. Floating-point failure is rejected rather than corrected with negative-density clipping.

This is **not** Shiroto's conservative DG discretization. The candidate's lagged coefficients and shell approximation do not preserve exact discrete interspecies energy exchange. Measuring and refining energy defects is necessary; exact number conservation alone cannot establish correctness. The cited paper's conservative-scheme results cannot be transferred to this implementation.

## Executed evidence

```
./node_modules/.bin/tsx --test tests/landau-reference.test.ts
```

**5 passed, 0 failed.** These cover the independently known initial SI exchange rate, positive finite distributions, species number, measured unprojected energy error, stationarity refinement, time/cutoff probes and invalid settings.

Independent additional common-temperature probes used the default case with both temperatures set to 6 eV, duration 1 ms, timestep 0.5 µs, and 64/128/256 shells. Maximum species L1 changes were **0.0050680172 / 0.0012709564 / 0.0003175528**. Corresponding energy defects were **0.0033106051 / 0.0008305262 / 0.0002078128**; number residuals stayed below 2×10⁻¹⁴. This supports approximately quadratic spatial convergence in this specified stationarity problem, not exact finite-resolution stationarity.

Four extreme-input API probes were explicitly rejected: velocity scale `1e−300`, maximum scaled speed `1e300`, density `1e300`, and charge `1e300`. The first two failed initial-grid resolution; the latter two failed the finite positive solve. No Infinity/NaN result was returned for these probes. This is targeted falsification, not an exhaustive proof over floating-point inputs.

All four source hashes in `assets/landau-reference-results.json` matched the reviewed source. The artifact contains seven deterministic cases and three stochastic timestep levels. Both reference acceptance and separator-transport validation remain false.

## Limits to retain in release copy

- The represented initial distribution is a renormalized, finite-cutoff shell approximation. Its initial second moments, normalization defect and cutoff sensitivity must be inspected; nominal input temperature is not an exact finite-grid moment.
- Zero flux at the upper speed boundary changes a distribution whose tail reaches that boundary. The reported negligible cutoff effect applies to this case only.
- `maxEnergyResidual` and `maxNumberResidual` are maxima over recorded snapshots. The campaign uses `sampleEvery:1`; sparse recording in other API cases can miss intermediate extrema.
- Four stochastic seeds leave wide whole-run uncertainty. Nonmonotonic TA means cannot be called an accuracy pass merely because pair energy is conserved or mean temperatures move in the expected direction.
- The model assumes isotropy, homogeneity, a supplied Coulomb logarithm and the Landau small-angle regime. It does not test drift friction, anisotropy, ion–electron closure, spatial torque, source dilution or collector observables.

The repository-wide final checks and publication remain with the parent. Commands used the existing scoped host exception after the inaccessible container service; no policies, hooks, credentials or browser-origin workaround were changed.
