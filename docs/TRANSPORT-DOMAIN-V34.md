# V34 passive domain witness

The fresh Philox cohort's diagnostically worst saved encounter estimate is reproducible and reconstructible. It is a cold, dilute heavy-ion tail cell, not the earlier legacy-RNG four-light-ion example. No physical model or acceptance threshold was changed. This diagnostic does not qualify collision transport.

## Selection and noninterference

Before reading outcomes, the preparation froze the rule: after all 30 cases terminal and independent raw review complete, select the complete full200µs case with largest finite observed encounter ratio at or above the existing0.1 boundary, breaking ties by level ID then seed. The final catalog and coordinator's analysis-complete marker passed provenance checks. This marker does not mean physics qualified.

The rule selected **N32768-r6-z3-h100, seed505**, observed maximum0.2907540907714106. Its reference gzip SHA-256 is `d0f974771f13d1f0a3c8c439d44c4079f8c8ac8c3c998790c3ca509637053651`. The coordinator subsequently released one full200µs rerun, bound to that exact SHA. The sole physical rerun completed in139.969s, below the frozen1200s limit, in Apple safe-dev guest `safe-dev-3ebc52e0b90bc570`. No retry or additional replicate was run.

The passive regime adapter has its own source identity, `789c8197797140ded07e72c81b85da64d3849b9c36b872cd272cc32fa41a91a4`. Acceptance retains `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`. After removing **only sourceHash and durationMs**, strict deep comparison passed for the entire SeedRun: config, explicit Philox header, execution mode, observables, diagnostics, all raw histories and exit ledgers. Every101 frozen runtime input matched before and after execution and after export. The physical result was saved before comparison; divergent output would have been retained.

## Actual captured cells

All five captured warning cells were single-species outer-tail cells, and their only local reason was the configured encounter-magnetization boundary. Species mean velocities were removed separately. These are moment-estimated pairs at saved snapshots, not an audit of each randomly executed collision partner.

| Time (µs) | Species (u) | Representatives | Sample T (eV) | n (m⁻³) | β encounter | Delete-one moment sensitivity |
|---:|---:|---:|---:|---:|---:|---:|
|94.9|40|4|1.57697|2.39702e13|0.102857|0.090150–0.168066|
|167.7|84|5|0.0563858|3.99503e13|0.290754|0.255550–0.341360|
|170.3|84|13|0.184181|7.79031e13|0.115205|0.111290–0.125129|
|172.9|84|7|0.378335|4.19478e13|0.109541|0.100550–0.181422|
|174.2|84|4|0.624161|2.39702e13|0.112820|0.098932–0.184139|

The worst cell spans r=0.166667–0.2m and z=0–0.15m, volume0.00575958653m³. Each representative carries4.60194236e10 physical ions. Its five ions occupy0.0243998% of active representatives at that snapshot. Independent reconstruction gives relative RMS speed623.378272m/s, electron Debye length2.629930mm, gyrofrequency68918.0944rad/s, classical impact cutoff8.512566nm, quantum cutoff1.212819pm, Coulomb log12.6409245, coupling0.001407293 and Debye population3.043976e6. The encounter ratio is Ωλe/g=0.2907540907714106.

The separate standard-library Python analyzer reconstructed all copied species moments, species-pair quantities, cell geometry and physical inventory within the prospectively declared arithmetic tolerances. It checked five direct distinct-pair RMS identities. The source already uses unbiased n−1 sample temperatures; an extra Bessel correction would double-correct the same-species RMS. The accounting proof records155 saved assessments,157 driver-asserted inspector calls including the existing two initial inspections, five warning snapshots/cells and33 representative occurrences across snapshots. These occurrences are not33 distinct tracked particles.

Sampled flagged-cell exposure is5.22403996e−6 of total active representative-time, using the saved-history trapezoidal convention. This is separate from unresolved-moment exposure and does not repair its1% gate. It is neither a continuous-time bound nor a statement that all particles outside these cells have validated collision physics.

## Interpretation and remaining work

The warning's arithmetic mechanism is verified: the sampled heavy tail is cold and dilute, so the electron screening scale is long relative to its moment-derived gyroradius. The physical status of that tail remains an inference problem. Four-ion estimates can straddle the gate under delete-one sensitivity, but the worst five-ion and the13-ion cells do not. Thus the new evidence falsifies the blanket explanation that every crossing is merely a marginal four-ion fluctuation. Delete-one sensitivity is not a confidence interval, a statistically valid independent rerun or proof of a continuum failure.

The configured0.1 boundary is a conservative project diagnostic, not a universal sharp transition or a claim that β=0.29 is strongly magnetized. Primary kinetic work states the conventional unmagnetized encounter requirement in terms of gyroradius substantially exceeding screening length and derives a generalized collision operator beyond that regime. It does not justify changing the present gate or rescaling the Coulomb log to force passage. [Jose and Baalrud,2020](https://arxiv.org/abs/2008.06080).

The current model explicitly uses electron-only screening at imposed Te. Conditional static Maxwellian inclusion of cold ions reduces the worst cell's screening length to0.277721mm and its ratio to0.0307037. This large sensitivity identifies a model convention worth studying, not a justified automatic substitution: the streaming, non-Maxwellian distribution need not have static all-species screening. No screening convention or threshold was changed.

The smallest justified fix here was passive observability: aggregate extrema alone concealed cell occupancy, temperature and screening contributions. Copying the unchanged local calculation permits exact replay and independent reconstruction without touching physical updates, random draws or pair ordering. A speculative scalar correction, silent smoothing or threshold relaxation would hide the model question and contaminate the acceptance comparison. Further qualification needs independently justified tail-resolution/screening and magnetized-encounter benchmarks; this single selected witness cannot establish other seeds, cases, unsampled times or continuum transport.

## Retained evidence and checks

Preparation: `scientific/transport-v34/domain-witness-preparation/`, seal `e65251d454fc669dd3c19be70a1dc12747c70e3828dcffaaba6a1cdee37b02f5`. Selection: `scientific/transport-v34/domain-witness-selection/`, seal `0948251442807d2ec62bf5ee1b11ab12bd7b4c5d695be956fdced9b3662c8df7`. Execution and independent arithmetic: `scientific/transport-v34/domain-witness-execution/`.

Preparation passed4 synthetic TypeScript tests,7 synthetic Python tests, Python syntax, driver parsing without executing it and source `tsc --noEmit`. Actual execution ran the frozen `python3 run-domain.py` once, then `python3 analyze-domain.py` and a short saved-data accounting readout, all offline in safe-dev. Network was enabled only for `npm ci --ignore-scripts`. Guest outputs were exported before every replacement sync and immediately after physical completion. The full application build/test gate is separate; this research diagnostic makes no application-release claim. Copied velocities are already in the collision-cell cylindrical frame: independent Cartesian-to-cylindrical reconstruction is unavailable from this capture and is supported separately by source/synthetic seam checks.
