# v33 collision-domain witness audit

Completed 2026-11-08. This is an independent diagnostic study, **not transport qualification**. The coordinator authorized the single passive rerun after all original heavy batches ended. It completed in 106.959 s with exact physical-output equivalence and an independently reconstructed cell witness. No production source, physical parameter, collision ordering, random stream or acceptance gate was changed.

## Retained evidence and open question

Inspected `scientific/transport-v33/confirmation-particle/results/N16384-r12-z3-h100-303.json.gz`: 16,384 representatives per species, 12 radial cells, three axial cells, 100 ns step, 200 µs pulse, seed 303. Its 155 saved regime samples contain one outside-domain assessment: snapshot 77, time 100.1 µs. The saved encounter proxy is 0.11406654074066121, above the **configured conservative gate of 0.1**. This flag remains a failure under the existing protocol.

At that snapshot the saved diagnostics report 51 occupied cells, 44 resolved cells, unresolved representative fraction 0.005130810261620523, minimum sampled temperature 0.3351339268052941 eV, maximum coupling 0.0005445707792131731, minimum Debye population 46,331.924728434526 and minimum estimated Coulomb logarithm 12.493081277175257. These extrema need not belong to the same cell. The raw result does not identify the responsible cell or species pair, so attributing the encounter estimate to the temperature minimum would be unsupported.

The recorded run-wide unresolved exposure is 0.01577429551272256, above the separate 1% coverage gate. Neither the small number of outside snapshots nor a small instantaneous cell population proves that the model-domain error is harmless.

The coordinator has separately reported five outside samples at N32,768/seed303 and nine at N32,768/seed404, versus one and zero respectively at N16,384. Those larger-run artifacts were not yet exported when this report was prepared; they are producer reports, not independently reconstructed findings here. Counts alone do not distinguish physical persistence from a changing local estimator.

## Execution path and screening convention

`simulateDoublewell` → `record` in `src/doublewell-dynamics.ts` builds annular collision cells and converts each ion's Cartesian velocity into its own cylindrical basis before calling `inspectDoublewellRegime`. The present witness is therefore not explained by an omitted cylindrical-frame conversion. The moment estimator requires four representatives in every present species; a cell that fails this condition is unresolved. Four samples admit the estimator but do not guarantee a precise estimate.

For a resolved cell, `src/doublewell-regime.ts` computes each species' unbiased scalar three-dimensional sample temperature and mean cylindrical velocity. For species a,b it uses

\[
g_{ab}^2=3e(T_a/m_a+T_b/m_b)/m_u+|u_a-u_b|^2,
\quad
\eta_{ab}=\max_s(|Z_s|eB/m_s)\lambda_e/g_{ab}.
\]

Temperatures above are in eV, masses in atomic mass units in the first formula. The Debye length is explicitly **electron only**, with imposed electron temperature and quasineutral electron density:

\[
n_e=n_i\sum_s f_sZ_s,\qquad
\lambda_e^2=\epsilon_0T_e/(n_ee).
\]

The physical inventory represented by a marker is fixed at initialization. Cell density is marker count times that weight divided by the full annular cell volume. A plausible mechanism is that a resolved, sparsely occupied tail cell has low density and a long electron Debye length. At fixed cell volume, the weight of each marker halves when N doubles; a similarly populated tail cell then samples lower physical density. This is a hypothesis until the actual cell, populations, moments and geometry are captured. It does not authorize discarding or clipping its estimate.

## Primary-source interpretation

[Jose & Baalrud (2020)](https://arxiv.org/pdf/2008.06080), introduction, Table I and equations 6–11, motivates unmagnetized binary scattering by requiring a typical gyroradius substantially larger than the screening length. Its generalized operator retains Lorentz forces during pair encounters; unequal charge-to-mass ratios couple relative and center-of-mass motion. That is a different operator, rather than a scalar adjustment of the Coulomb logarithm. Its OCP screening length and thermal-speed convention differ from this two-ion/electron-screened relative-RMS diagnostic. The paper also notes differences associated with static rather than dynamic screening. It does not establish our numerical 0.1 value as a universal boundary.

[Baalrud & Daligault (2017)](https://arxiv.org/abs/1709.05420) classifies regimes by relative gyroradius, screening, closest-approach, spacing and mean-free-path scales. This supports checking scale separation, while leaving the configured 0.1 gate a conservative project choice. Our \(g/\Omega\) proxy must not be labeled an actual particle thermal gyroradius or the paper's \(\Omega_c/\omega_p\) parameter.

[PlasmaPy's official Debye-length implementation](https://docs.plasmapy.org/en/stable/_modules/plasmapy/formulary/lengths.html) uses the same electron/stationary-ion convention as this diagnostic. A static Maxwellian multicomponent response instead sums inverse squared component screening lengths; see equations 3.3–3.4 of [the JPP screening-length study](https://www.cambridge.org/core/journals/journal-of-plasma-physics/article/debye-length-and-plasma-skin-depth-two-length-scales-of-interest-in-the-creation-and-diagnosis-of-laboratory-pair-plasmas/418F3E0AA76667EAF9F677477E56BF5A). Cold ion terms can shorten that static length. Automatically substituting it here is unjustified: response depends on participating species, encounter timescales and drifting/non-Maxwellian distributions. The planned all-species static calculation is explicitly a sensitivity calculation, never a gate replacement.

For a future independent microscopic reference, [Sarkas](https://github.com/murillo-group/sarkas) has an official [magnetized OCP example](https://sarkas.readthedocs.io/en/dev/examples/Magnetized_OCP/Magnetized_Plasma.html) using magnetic integration and Coulomb P3M. That establishes a useful homogeneous benchmark candidate; it does not establish a ready two-ion open-cylinder separator solver. No such code was installed or run in this study. A bounded literature search did not establish a vetted public implementation of the generalized magnetized operator above; this is not a claim that none exists.

## Frozen diagnostic proof

The separate stage is `/tmp/mass-spinner-transport33-domain`. `scientific/transport-v33/domain/preparation-freeze.json` records the plan, adapter and 144-file input map. The sole difference against the shared 45-file acceptance source map is the passive `src/doublewell-regime.ts` adapter. Original source is retained. The instrumented source identity is `9836ddd9b440132bfdd68803f8206304a7b142f4bbb88148b3be3042e37a83e5`; it must never impersonate the acceptance source identity `ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`.

The adapter records only outside resolved cells: actual annular faces/volume, density, representative counts, species moments, pair relative speed/drift, gyrofrequency, reduced mass, electron screening, classical/quantum cutoffs and all input ion vectors. Positions and velocities are copied to prevent later mutation from corrupting a saved witness. These are **moment-estimated species pairs at saved assessments**, not the randomly selected collision pairs inside a timestep.

Before the full rerun, smoke tests compare original and instrumented trajectory/assessment results, including a saved-position alias regression. The bounded full run then requires exact equality of configuration, status, execution mode, observables, diagnostics, geometry and **all raw histories and exit ledgers** against the retained baseline. Only wall time and the separately identified source hash may differ. No witness field is inserted into physical output. Input hashes are checked before and after; a timeout is retained as failure. The run limit is 1,200 s, with only one heavy simulation VM scheduled by the coordinator.

An independent Python standard-library reconstruction then recomputes moments, density, volume and every encounter quantity from saved input vectors; it imports no production module. It additionally reports the offending cell's instantaneous active fraction and sampled time-integrated exposure, static all-species screening sensitivity, and leave-one-out moment sensitivity while holding density and species fractions fixed. Leave-one-out ranges are algebraic diagnostics, **not confidence intervals, independent-particle inference, valid lower-population states or revised acceptance tests**.

## Interpretation and remaining evidence

Even an exact reconstruction proves only that the retained estimator was faithfully evaluated. One realization cannot establish whether the continuum distribution leaves the model domain, or whether finite-sample moment variability causes the crossing. Distinguishing those requires predeclared repeat-seed, local-population and mesh/particle studies, with the same screening convention and gates retained. Spatial/time smoothing or a changed cutoff would alter the question and requires separate physical validation. The current outside-domain and unresolved-coverage flags remain visible and disqualifying.

## Executed witness and exact checks

The full run completed, exit 0, wrapper elapsed 106.958775424 s (simulation 106.45963784 s), in dedicated Apple safe-dev guest `safe-dev-9b85fafdfd6d896b`. The 1,200 s limit was not reached. Every required SeedRun key matched the retained baseline by Node strict deep equality: level, seed, config, status, execution mode, observables, diagnostics, numerical geometry and complete raw output. The raw physical fingerprint is `e809b959153dd54b3807acdd863cce837703cb8a2fec3265dbdf2fe1fb3942af`. All 144 input hashes matched both the final guest export and original frozen host stage. The instrumented result remains diagnostic-only and must not enter acceptance comparisons.

The one outside cell is occupied-cell ordinal 38 (not a universal mesh index):

| Quantity | Reconstructed value |
| --- | --- |
| Radial faces | 0.18333333333333335–0.2 m |
| Axial faces | 0.39999999999999997–0.6 m |
| Full annular volume | 0.004014257279586957 m³ |
| Representatives | Four 40u/+e ions; no 84u ions |
| Physical ions per representative | 92,038,847,273.13847 |
| Local ion/electron density | 9.171195652173914×10¹³ m⁻³ |
| Sample temperature | 0.3351339268052941 eV |
| Mean cylindrical velocity | (1522.18956, −13137.39635, 4237.79531) m/s |
| Same-species relative-RMS speed | 2202.345621539873 m/s |
| Gyrofrequency | 144727.99823497992 rad/s |
| Electron Debye length | 0.0017357660551383053 m |
| Classical 90° cutoff | 1.432227966860103×10⁻⁹ m |
| Quantum cutoff | 7.209109078502866×10⁻¹³ m |
| Estimated Coulomb logarithm | 14.007728153653314 |
| Encounter proxy | 0.11406654074066121 |

Independent reconstruction from saved input vectors agrees with every recorded species/pair quantity within the predeclared relative tolerance 2×10⁻¹³ (mean-velocity cancellation also uses the declared cell-speed-scaled absolute tolerance). The temperature minimum did occur in this cell; that is now measured rather than inferred from unrelated extrema.

The four representatives are 0.02032004064008128% of the active population at that saved time. Their trapezoidally sampled exposure fraction over the run is 1.260382705513296×10⁻⁶. These describe saved sampling support; they neither bound unobserved excursions between snapshots nor transport error.

Holding cell density and fractions fixed, leaving out each moment sample gives encounter proxies from 0.09875184047898271 to 0.15957741297751463. A three-representative state would be unresolved by the actual estimator. This range is therefore only sensitivity algebra and cannot dismiss the recorded failure as noise. Conditional all-species static Maxwellian screening gives length 0.0004350385329106035 m and proxy 0.028588726223276018; it illustrates screening-convention sensitivity without establishing that ions provide this response during real encounters.

The witness confirms a dilute, cold, minimally sampled outer-tail cell as the source of this particular diagnostic crossing. It does not establish persistent continuum magnetization or validate a replacement collision operator. Existing outside-domain and coverage failures remain unchanged.

Exact executed checks, all offline after dependency installation:

- `node --import tsx --test domain-probe.test.ts`: **2/2 passed**, including copied-position regression.
- `npx tsc --noEmit`: **passed** on the instrumented source copy.
- `python3 run-domain.py`: **complete, exit 0**, enforcing input hashes and full physical-output equality.
- `timeout 180 python3 analyze-domain.py`: **passed**, independent vector/moment/geometry/encounter reconstruction.

Installation used `npm ci --ignore-scripts` with networking explicitly enabled only for downloads. Final export: `/tmp/mass-spinner-transport33-domain-final-export`. Durable raw output, test/typecheck logs, independent readout and a complete input archive are retained under `scientific/transport-v33/domain/`. No application build was required for this separate diagnostic source; the coordinator owns the integrated repository build/typecheck gates. No simulation VM remains running from this study.
