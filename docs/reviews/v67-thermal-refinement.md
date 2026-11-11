# v67 thermal and liner refinement: independent methodology audit

Prospective methodology, reviewed2026-11-10 before inspecting v67 numerical results. This agent has not run project code or changed executable files. Proposed tolerances below are numerical acceptance targets, not experimental or material-property uncertainties.

## Scope and decision

Freeze the same v66 physical problem: R=0.01m, L=0.1m, Li6/Li7 mixture with N=10¹⁹, initial gasT=1000+100q K for q=r²/R², initially1200K tungsten liner, temperature-dependent neutral μ/κ, total gas-wall film conductance0.1W/K, no outer cooling, duration1ms. The1mm wall, electrode patch geometry, diffusivity and prescribed electrical tensor must be identical between meshes. Refinement must not change the physical film coefficient, heating partition or emitting/collection geometry.

The proposed nr32/64, nz4/8/16, wall8/16/32 and timesteps64/128/256 matrix is useful. **It cannot be assumed to resolve the first wall transient.** Keep a prospective failure if an early boundary layer remains unresolved; extend or grade the mesh after diagnosing it. Do not promote small absolute wall-temperature differences into relative convergence of its much smaller physical response.

## Why the first wall transient is at risk

Evaluating the existing tungsten property formulas approximately at1200K gives κ≈114W/(mK), Cp≈155J/(kgK), and α=κ/(ρCp)≈3.8×10⁻⁵m²/s. At the first256-step endpoint, t≈3.9µs, the diffusion length √(αt) is approximately12µm. Uniform wall cells are125,62.5,31.25µm for8,16,32 cells, respectively. The finest cell is still larger than that early diffusion length.

This is a scale estimate, not a measured convergence failure. The finite0.1W/K film softens the boundary forcing, so flux and total energy may converge earlier than the surface temperature profile. The full liner's heat capacity is approximately20J/K, while a10W heat flow over1ms changes its mean temperature by only about0.0005K. Thus a0.05K absolute-only criterion could pass even after deleting essentially the whole wall response. Relative heating and boundary-flux gates are essential.

## Preserve the distinction between three error sources

1. **Nonlinear solve error:** full residuals at each accepted step, with updated μ(T), κ(T), species inventories, momentum and solid enthalpy. Freezing a coefficient in the approximate Newton matrix is acceptable only if the nonlinear residual converges. [NIST FiPy's nonlinear example](https://pages.nist.gov/fipy/en/latest/generated/examples.diffusion.mesh1D.html) explicitly separates coefficient-update sweeps at one time from advancement to a new time.
2. **Discretization error:** changes under temporal, gas radial, electrical axial and liner refinement. A correct energy identity does not establish resolution.
3. **Physical model error:** prescribed conductivity tensor/diffusivity, common-fluid approximation, neutral transport, film accommodation, no electron energy/chemistry/acoustics/axial thermal transport. Refinement cannot eliminate these limitations or validate a Marathon apparatus.

The existing accepted-step conservation/positivity/entropy audits remain mandatory independently of the new convergence metrics. Tighten solver tolerances on a representative fine case if the refinement differences approach nonlinear or floating-point error; do not infer that small differences are meaningful below those errors.

## Compare the same physical observable

### Gas and liner temperatures

Use common physical coordinates or conservative restriction, not first-cell index matching. The coarse and fine first liner-cell centers occur at different radii. Existing `innerK` is a cell-center value, **not the inner surface temperature**.

For nested radial cells, prefer conservative restriction as the primary state comparison:

- Sum fine gas energies and fine particle inventories over each coarse volume; form T_restricted=ΣU/(1.5kBΣN). An arithmetic mean of fine temperatures is wrong when their particle inventories differ.
- Sum fine solid energies and masses over each coarse shell, then invert their specific enthalpy to obtain the equivalent coarse temperature. Do not average nonlinear solid temperatures and call that an enthalpy-conserving map.
- Retain a separate fine-profile/boundary-layer diagnostic so restriction does not conceal a localized surface error. Report the restricted L∞ error, volume/particle-weighted RMS error, location and time of the maximum, and an actual boundary observable.

A discrete inner-wall surface temperature can be reconstructed consistently as

```
T_surface(R,t) = T_solid_cell0(t) + P_gas_to_wall(t) × R_solid_halfcell(t)
R_solid_halfcell = log(r_center0/R)/(2πLκ_solid_cell0)
```

P_gas_to_wall is signed positive into the liner, so it is negative while the hot wall heats colder gas. This reconstruction uses the same half-cell material model as the solver; it is an observable of that discretization, not an independently known continuum surface temperature. Keep cell-center temperatures separately labeled.

### Boundary power, per-step heat and cumulative heat

The backward-Euler accepted heat is Q_j=Δt_jG(T_j)[T_g,j−T_w,j]. Consequently Q_j/Δt_j equals the **endpoint constitutive power**, while the numerical method also uses it as a constant power for that interval's energy update. It is not an independently resolved physical interval average.

Both comparisons below are valid and should be reported distinctly:

- **Endpoint power:** compare Q_coarse/Δt_coarse with the final fine substep's Q_fine/Δt_fine at the same endpoint time. Both approximate the same instantaneous constitutive power.
- **Interval heat/mean power:** compare Q_coarse with the sum of all fine accepted heats over that coarse interval; equivalently divide both by the same coarse interval duration. Do not compare an endpoint power against this fine interval average under a single metric name.

Check cumulative signed heat C(t)=ΣQ and cumulative absolute heat A(t)=Σ|Q|. The latter prevents cancellations from disguising two large oppositely signed errors. Per-interval comparisons remain necessary: a cumulative total can hide a transient timing error or compensating errors.

Because outer cooling is zero and this v66 spatial path deposits shear in the gas, require ΔU_liner=C_gas_to_wall within explicitly computed storage/solve roundoff. If another direct wall source is later introduced, include it once and record it separately. The same accepted boundary heat must appear with opposite signs in gas and liner ledgers.

## Natural scales without an arbitrary denominator floor

Use the finer run as the stated comparison reference; call the result a refinement difference, not a proven error to the continuum. For each observable provide numerator, denominator, roundoff allowance and normalized result.

### Temperature response

For each comparable cell/location, define the causal response scale

```
S_T(x,t) = max over 0≤s≤t of |T_fine(x,s)−T_initial(x)|.
E_T(x,t) = |T_coarse(x,t)−T_fine(x,t)|.
```

The natural local relative criterion is `E_T ≤ ε S_T + B_T`, where B_T is a separately reported **derived numerical roundoff allowance**, not an empirical0.05K/1K denominator floor. Use the equivalent positive excess `max(0,E_T−B_T)/S_T` when S_T>0. If S_T=0, accept only E_T≤B_T and label relative response accuracy unidentifiable. If S_T is comparable to B_T, label it numerically unresolved rather than claiming a resolved percentage.

For the wall, require **both** the local response criterion and `E_T≤0.05K+B_T`. The absolute ceiling is an additional product-level accuracy bound; it must not replace the relative-response criterion with `max(S_T,0.05K)` or an OR condition. Do the same for reconstructed inner surface temperature. Retain the absolute whole-domain error even in cells where relative response is unidentifiable.

Also report the existing global trajectory metric `max E_T / max|T_fine−T_initial|`. It is a useful peak-amplitude accuracy statement, but it permits late/remote heating to mask startup or cold-cell errors. It cannot be the only thermal gate. A time-local response maximum prevents future heating from increasing the denominator of an earlier error; a per-location scale prevents a strongly heated cell from concealing an unresolved neighbor.

### Boundary heat and power

- Cumulative heat: `|C_c(t)−C_f(t)| ≤ ε A_f(t)+B_Q` at each compared time.
- Coarse-interval heat: `|Q_c−ΣQ_f| ≤ ε Σ|Q_f|+B_Q,interval` on every coarse interval, including the first.
- Endpoint power: `|P_c(t)−P_f(t)| ≤ ε max_{0≤s≤t}|P_f(s)|+B_P` at shared times. Report the raw signed-power curves and zero crossings; this measures error against the attained physical power amplitude, not fractional accuracy of a vanishing instantaneous value.

Use ε=1% for time refinement and2% for each spatial refinement axis as the proposed gates. For exactly zero reference signals, apply the explicit roundoff-only rule and report unidentifiable relative accuracy. Do not add a fictitious watt/joule floor or normalize by background solid enthalpy. Retain interval heat and endpoint power gates together because neither alone detects all timing errors.

### Roundoff accounting

Bound temperature sensitivity using the **local** stored-energy representation and heat capacity. For solid inversion, δT≈δU/(mCp), with the inversion tolerance and canonical-energy roundoff included. For gas, propagate uncertainty in U and N through T=U/(1.5kBN); include both. Use accepted solve temperatures for equation reconstruction, and canonical temperatures for public-state comparison; their difference belongs in the reported numerical allowance.

A conservative bound may contain a documented multiple of binary64 epsilon times the actual values operated on, divided by the relevant capacity. Report that bound in kelvin/joules/watts and its ratio to the physical response. Do not expand it until a case passes. Q comparisons can derive their roundoff directly from ΔtG and the two temperatures rather than from the liner's much larger absolute stored energy. Include accepted nonlinear residual error separately from roundoff if it is material.

## Time coverage, spatial coverage and attribution

- Retain complete accepted trajectories and actual time knots. Require identical final1ms, source snapshot, material law and initial canonical state under the appropriate mesh map. Preserve incomplete/failed runs in output and fail closed.
- At minimum compare every shared nested endpoint, including the first nonzero endpoint. Endpoint-only matching omits fine-run times inside the coarse first interval. Add a whole-trajectory diagnostic at all fine accepted times using a declared coarse reconstruction: interpolate canonical U/N and solid enthalpy within the enclosing coarse interval, then invert for T. This reconstruction error is part of playback/trajectory accuracy; label it separately from common-endpoint integration differences.
- For interval heat, use exact overlap/sum of accepted interval energies. Do not interpolate a power curve and assume it reproduces the accepted energy ledger.
- Change one resolution axis at a time with all other axes held at declared fine settings, then test a combined fine refinement. Refining gas, axial current and liner together can hide cancellation; an all-at-once comparison alone is insufficient.
- Align the fixed physical electrode edge with the same radius on all meshes. If it is represented by a fraction of cell count, check that this gives the identical physical patch. Otherwise axial/radial refinement also changes the boundary condition.
- The radial32/64 pair measures sensitivity but cannot estimate observed radial order or establish an asymptotic regime. Three axial, wall and time levels can show decreasing differences; do not fit Richardson order/GCI to a nonmonotone or roundoff-dominated sequence. [NASA's grid-convergence guidance](https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html) recommends three grids to examine observed order and the asymptotic range. A prospective radial extension to128 cells may be needed if radial uncertainty is material.
- A1ms experiment cannot qualify late solid equilibration or a long operating pulse. Keep the study's duration, forcing and supported temperature window explicit.

## Required negative controls for the comparator

Before trusting passing metrics, independently perturb a retained accepted export or a small synthetic trajectory and demonstrate rejection:

1. Delete the earliest interval or truncate the final trajectory: completeness/time-coverage checks must fail.
2. Shift an early wall-power pulse or replace its first value while preserving final cumulative Q: interval/power gates must fail despite matching final heat.
3. Add opposite signed heat errors in two intervals: per-interval and cumulative-absolute-scale checks must expose them.
4. Double or delete a small liner response (for example0.001K on a1200K background): local relative-response gate must fail even though absolute0.05K passes.
5. Add a large late/local heating excursion in an unrelated cell: an earlier or neighboring error must not become easier to pass.
6. Compare first-cell temperatures at different radii or use arithmetic averaging with unequal gas particle numbers: mapping/coordinate or conservative-restriction checks must fail.
7. Reclassify Q/Δt as interval-average power and compare it to an unmatched time support: a manufactured nonconstant-power trajectory must distinguish endpoint and interval metrics.
8. Change wall thickness, physical film conductance, electrode patch area, material law, initial state or source hash between meshes: setup-identity checks must fail before numerical scoring.
9. Replace a dynamic denominator with absolute1200K temperature or total background wall energy, or insert a1K/1W floor: the test harness must reject the altered metric policy.
10. Present a signal below the derived roundoff allowance as a resolved percentage: require an explicit unresolved status, never a silently manufactured relative pass.

## Acceptance statement that this study could support

If these tests pass, the justified statement is: *the specified1ms Li common-fluid experiment is insensitive to the tested time, gas-radial, axial-electrical and liner discretizations within the declared absolute and relative-response targets; its accepted-step transport/energy identities pass independent reconstruction.* It remains a conditional numerical qualification. It does not establish a first-principles plasma model, match an experiment, validate the material film coefficient, resolve all future operating regimes, or establish that a deployed playground uses this backend.

## Separate physical-surface comparator

Implemented `scientific/transient-v67/surface.py` and `test_surface.py` for parent execution. This does not alter the frozen cell-mean comparator or production equations. CLI: `python surface.py PACKET.json CONFIG.json NEW_OUTPUT.json`; it requires the same exact source/prediction hash binding and explicit coarse/fine/axis pairs. It uses unchanged `analyze.prepare`, `validate_setup` and `shared_indices` helpers after independently validating the explicit comparison identities.

At each accepted endpoint it reconstructs the common physical R surface with the Tolias conductivity polynomial and signed `gasExchangeJ/dt` times the logarithmic solid half-cell resistance. It independently checks that this power equals the Li-gas half-cell, film and solid half-cell thermal-resistance flux, and checks solve temperatures against canonical stored energies. Only uniform initial solid fields have a justified initial surface value; nonuniform initial fields reject. Cell centers must match their declared logarithmic geometry. No production imports are used.

The **new, separate** prospective surface gates use raw maximum surface difference divided by the maximum surface excursion over both complete accepted histories, with1% time/2% spatial limits **AND** absolute0.05K. They do not retrofit the old primary gates. Causal fine-reference excursion diagnostics accompany every shared time, with explicit roundoff-dominated signal counts and no denominator floor; those causal diagnostics are not silently promoted to an independent acceptance gate. Fine-only accepted times remain explicitly untested by this shared-time comparator.

Eight test methods cover the sourced conductivity value/domain, two different cell-center locations reconstructing the same manufactured surface, zero heat/response, a small wall-response relative failure despite absolute0.05K success, wrong heat/timestep/array length, nonuniform initial wall/moved cell center, moved physical R/stale hash/missing pair/partial trajectory, and nested time-support coverage. These are resistance/comparator fixtures, not full PDE manufactured solutions. The parent executed the suite in safe-dev: `scientific/fixes-v43/transient67-surface-tests.log` records eight tests passing; its receipt records exit0, snapshot722/sourceSHA256 `cbf9ee9cbe614737ea830d3333d43b1caadff4e26079f13803b3e1ca1de72c26`, verified before and after. This agent inspected that log/receipt and did not execute project code.

The uniform initialized solid surface at t=0 is distinguished explicitly from applying the finite-cell algebraic film/half-cell reconstruction to the initial gas/solid cell temperatures. With an initial gas-wall jump, the latter can differ by P_initial R_half despite an initially uniform liner. That difference is a discrete boundary-reconstruction incompatibility, not a resolved physical temperature jump. Each comparison reports its signed magnitude, its fraction of the primary total excursion, and subsequent change relative to that algebraic initial value. The primary surface norm remains frozen as the total excursion from the initialized uniform solid trace; any interpretation as physical heating must inspect this contamination and both space/time refinement. The tests check that the mismatch decreases with the solid half-cell resistance and vanishes for zero heat.

For finite Robin heat flux into an initially uniform continuum solid, the solid surface temperature remains continuous as t tends to zero from above. The initial finite-cell algebraic mismatch must therefore not be described as a physical instantaneous surface jump. A time-converged coarse-cell resistance response can retain this spatial error. A small coarse-grid timestep difference alone cannot qualify the early physical surface transient, and the total-excursion norm can be contaminated by that offset. Keep its compatibility diagnostic and joint spatial/time refinement visible; retain the prospective gates rather than changing their normalization after seeing a result.

## Graded-wall nonlinear stall: reproduced source diagnosis

Read-only evidence in `scientific/fixes-v43/transient67-graded-probe.log` shows that graded128/quadratic128 stops after49 accepted steps and graded128/quadratic256 after157. Both report `Coupled mixture energy iteration stalled; refine the time step.` The source path in `src/fuel-gas-thermal.ts` raises that message only after all24 line-search candidates fail its merit/acceptance test. This is distinct from the explicit material-domain and nonfinite-state errors; the message does not by itself establish invalid physical temperatures or insufficient physical timestep resolution.

The acceptance predicate is per-row `abs(residual)<=tolerance`, with a heat-response term and explicit energy-storage/conductance arithmetic allowance. The line-search merit instead uses `max(abs(residual)/scales)`, where scales include background solid enthalpy and Cp*T. These orderings differ. A row already satisfying its own tolerance can dominate the background-scaled merit and block a trial that improves every still-unconverged row. This is a source-level failure mechanism to test, not an established cause of the observed stop.

Record accepted and all trial states' dominant merit row, dominant residual/tolerance row, signed residuals, tolerances, scales, increments, and actual representable temperature changes. In particular check whether damping eventually leaves every affected value unchanged. The graded first-cell capacity shrinks while its intercell conductance grows, so `dt*G/C` and the temperature-difference cancellation become more severe. The existing tolerance already includes a16-epsilon conductance-times-temperature arithmetic allowance; a stalled residual must be compared to that declared allowance before changing tolerances.

The solid residual also subtracts two absolute enthalpy energies, unlike the older thermal kernel's stable `m*(Tnew-Told)*meanCp(Tnew,Told)` formula. Stable enthalpy increments are a candidate conditioning improvement, but are not yet a demonstrated fix for this stop. Replacing the subtraction must retain the difference between stored old energy and the enthalpy reconstructed from old temperature, or the change silently modifies the conservative equation. Freezing coefficient/source derivatives makes the thermal matrix an approximate Newton matrix; it is acceptable only while the complete nonlinear residual actually converges. No production or comparator executable edits were made for this source review.

### Instrumented evidence and proposed minimal fix

Inspected `scientific/centrifuge-v44/transient67/studies/stall-1/transient67-stall-probe/` instrumented source and receipt, plus `scientific/fixes-v43/transient67-stall-summary.log` and its receipt. The probe resumes the retained graded128/quadratic128 case after49 accepted steps at dt=6.04248046875e-6s and reproduces the same line-search failure. Its retained packetSHA256 is `b72126bd3d961e62207750263b4b6593b08e459531e7e51c9418e1bb09d91427`; the source snapshot is the722/cbf9ee9c study above. This agent read these artifacts; the parent alone executed the probe.

At the failed iteration6, the old background-scaled merit is dominated by solid row32: r=-3.1018875687e-12J, tolerance=1.5116703079e-10J, hence r/tolerance=0.0205196. That row already meets acceptance. Its Newton temperature correction7.9378e-14K is below a binary64 temperature spacing near1200K. Unconverged gas row31 has r=-7.7735466176e-15J, tolerance=2.9950924368e-16J, hence ratio25.9543, with a representable3.8686e-10K correction.

The full trial reduces the maximum residual/tolerance ratio from25.9543 to1.01627, yet the background-scaled merit rises from1.3326246977e-12 to1.3327229710e-12. The old search rejects this improvement. Half damping also improves the acceptance ratio to12.4381 while increasing the old merit. At search12 and later, both old merit and the maximum acceptance ratio are exactly unchanged; further damping has reached representational stagnation. This directly establishes a globalization-metric defect, rather than demonstrating invalid thermodynamics or a physical timestep limit.

Using `max_i(abs(residual_i)/tolerance_i)` for the line-search merit is the smallest coherent root-cause fix: it orders trials by the same dimensionless defects used by the unchanged acceptance predicate. It changes neither the energy residual nor the approximate Jacobian, transport coefficients, material domains, timestep, conservative ledgers or row acceptance tolerances. It is preferable here to relaxing tolerances, modifying physical closures, or rewriting the enthalpy equation without evidence that those changes are necessary. A changing trial tolerance is part of the existing acceptance definition; inspect before/after row tolerances to exclude improvement caused merely by denominator growth. Retain exact-equilibrium/zero-time tests for degenerate zero-defect rows. Before/after actual-state regression and complete refinement reruns remain required; source reasoning alone does not establish that the new metric finishes the campaign or satisfies the original gates.

### Post-fix evidence and remaining qualification limits

Inspected the actual `graded-1` export, regression logs and safe-dev receipts. The exact-state regression fails before the merit fix (`transient67-merit-before`, sourceSHA256 `20ca7b3cac78e86eb5885ded745d1d82899db52d62ee335b2ea58d2b7949ddde`, exit1) and passes after it. The post-fix command tests `fuel-graded-wall-v67.test.ts` and `fuel-spatial-operation-v66.test.ts`: four tests pass, including energy/angular ledgers, zero-time canonical identity, sourced-property domain rejection and rigid-rotation identity. The tested post-fix snapshot727/sourceSHA256 is `b6dce3c7a7c46d56ad83c655e3b56b5232ff2cc28d5af868d36c0999b3da8dea`; source hashes are verified before and after. The four graded cases complete128/128/128/256 steps,640 total.

The retained `graded-1/transient67-graded-assess/analysis.json` has all21 primary refinement gates passing. Its physical-surface report has all six separate gates passing. Surface maximum-difference/global-excursion ratios are0.2251503% for graded32→64,0.0570538% for64→128 and0.1997104% for128→256 time refinement. The finest initial algebraic mismatch is4.2375587e-7K, only0.038415% of the approximately0.001103K global surface excursion; this markedly reduces the coarse-uniform-wall normalization contamination.

These are **global-excursion, common-endpoint** results. At the first shared61.035ns endpoint, finest time-refinement surface difference1.0414083e-6K divided by the attained2.2458095e-5K fine surface excursion is4.63712%. The finest spatial pair has2.88464% causal surface difference there. Both signals are well above the declared approximately5.46e-10K arithmetic allowance. Thus the startup surface is not qualified at1% local time/2% local spatial response; these diagnostics are not roundoff artifacts and must not be hidden behind later heating. Fine-only128 time nodes remain untested by this comparator. This residual discretization sensitivity is distinct from the fixed nonlinear stall.

The independent conservation subprocess is **not passing** in this export: `graded-1/transient67-graded-assess/receipts.json` records refinement exit0 but conservation exit1. At graded32 accepted step74, local solid energy mismatch is5.5420352e-13J, dynamic scale8.5517347e-5J, storage allowance4.3473448e-13J and adjustedrelative1.3970153e-9 versus the frozen1e-9 limit. The original audit accounts for storage roundoff but not an explicit stiff thermal-link temperature-subtraction allowance. Whether a derived additional arithmetic allowance explains this failure requires separate source/numerical evidence and negative controls; the passing refinement or regression tests do not override it. Retain this failed audit receipt and avoid declaring the graded campaign fully qualified while that issue is unresolved.

### Independent assessment of the explicit face allowance

Inspected the subsequently added `conductive_flux_roundoff` helper and all four `test_coupled_scale.py` methods. The proposed allowance uses actual adjacent binary64 temperature spacings: `dtG*(ulp(Tleft)+ulp(Tright))`, plus a conductivity-sensitivity term and gamma3 simple-flux arithmetic term. It remains separate from the existing stored-U allowance and unchanged1e-9 dynamic-energy gate. The tests retain the actual failed graded32/step74 witness, demonstrate its old storage-only rejection, check zero-conductance and linear dtG scaling, and reject a1e-5J injected heat error well above the derived allowance. Their source-level construction is appropriate; execution results must be read from the parent's receipts.

The leading temperature term represents a **near-root temperature representability floor**. A binary64 temperature increment can no longer change a stored temperature while the associated stiff-face heat changes by dtG times that spacing. This differs from evaluating a subtraction at fixed, exact exported temperatures in two languages. Positive series thermal resistances do not amplify constituent relative conductivity perturbations; the restricted conductivity laws' `abs(T*kappa'/kappa)<=1` bound justifies the separate temperature-dependent conductivity sensitivity. The gamma3 term covers the declared simple flux operations at fixed reconstructed dtG. It is not a formal bound on every possible libm/logarithm, material-polynomial or conductance-evaluation implementation error.

This check permits a documented componentwise floating-point backward error. Independent per-face/row allowances do not prove the existence of one globally consistent adjacent-float nonlinear root, exact discrete energy closure, continuum accuracy, or experimental agreement. The unchanged global-energy/entropy checks, per-face/row exported allowance arrays, complete-trajectory coverage and above-bound tamper rejections are therefore still necessary. If the arithmetic allowance approaches a row's physical heat response, report that response as numerically unresolved rather than interpreting a roundoff-adjusted pass as relative physical accuracy. The retained startup surface errors above remain genuine discretization sensitivity, unaffected by this bookkeeping change.

### Final retained arithmetic-aware audit

Inspected the final receipts and raw audit. The strict adjacent-float bound passes all640 graded accepted steps and all nine retained packet-tamper controls reject. The audit is `final-accepted/transient67-graded-audit-final.json`, independently read-only SHA256 checked as `3fcaeebfa9d2a5356da21c6184051d5fc6b42f6e9b90363a6882ab42cbec32f1`. Its prediction packet hash is `1f10da5bc046cd149a024177e2e5c78c2536003e69e5b920c4e16ac4b44f2af2`, also independently checked against the retained graded export. The audit receipt uses updated checker snapshot727/sourceSHA256 `21ebe6218510aca9f80eb80232fdd287e44e3dcb3a6a507fb382ea250b94bb65`, verified before/after, exit0. The original storage-only failure remains retained and is not rewritten into a pass.

The four cases' maximum global energy residuals are3.302e-12,3.120e-12,3.442e-12 and3.403e-12J, respectively. Their minimum conditional total entropy changes are positive. Maximum individual row temperature-representation allowances are3.895e-12,1.558e-11,6.230e-11 and3.121e-11J; these are explicit arithmetic allowances, not extra physical heating or experimental error bars.

All28 scientific Python tests pass on the updated checker snapshot above. The prior post-merit-fix production snapshot `b6dce3c7...b3da8dea` passed1227 application tests, typecheck, build, site and asset checks, as recorded by `transient67-final-checks` receipts. These are distinct source snapshots: the later checker/test arithmetic edits received their own scientific rerun rather than being silently attributed to the earlier full application gate. No deployed-browser verification or change to the live playground backend follows from these research receipts. The remaining causal startup differences and fine-only time-support gap are unchanged; first-order common-fluid numerical consistency does not establish a fully validated Marathon machine model.

Closeout: independently read the sealed `qualification-evidence`28-test log and exact `21ebe621...b94bb65` receipt; they agree with the preceding statement. Its manifest has138 file entries and read-only SHA256 `4d2def3dc1916eaaf249d1afe00ddb9fbe0b5bd3d8f44f43bfb3a96cf9835271`. Also inspected the final spatial audit: nine complete cases total1280 accepted steps, all pass, all nine corrupted-data controls reject. The main `docs/TRANSIENT-REFINEMENT-V67.md` report correctly distinguishes the original26-test full application gate from the later28-test checker run, retains the failed studies, describes the componentwise backward-error limitation, and discloses4.637%/2.885% startup differences. No further blocker was found for the narrowly scoped merit fix and the explicitly arithmetic-aware conditional consistency claim. This closeout does not upgrade local startup, continuum, experimental or deployed-UI qualification.
