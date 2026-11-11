# Coupled depth target: v35 prospective protocol

## Root cause and bounded change

The existing source computes one steady depth trajectory; loading integrates one
frozen optical depth; the one-node exposure model separately applies initial
heat. Their numerical solvers cannot recover missing feedback between target
composition, stopping, reaction probability and thermal evolution. Simply, the
three panels do not evolve the same target.

The new optional material-only path shares a depth-resolved D/T/vacancy state
and film/backing temperature state. Every physical substep recomputes atomic
composition stopping, reaction probability and deposited heat. Temperature
changes externally supplied Arrhenius diffusion/release rates. All numerical
defaults are illustrative and the old reference paths retain their behavior.

The first-order IMEX Euler method uses explicit nuclear consumption and
implicit positive replacement/release/renewal/Fick diffusion, followed by
conservative backward-Euler heat conduction. Full-versus-two-half-step error
control accepts the two-half state without positivity-destroying extrapolation.
The shared internal time mesh changes both heat and chemistry, including pulse
edges exactly. This avoids a falsely high-order claim for backward-Euler heat,
and a prohibitively restrictive explicit heat-diffusion timestep. The adaptive
error estimate is not a rigorous global-error certificate.

## Prospective checks, fixed before first execution

1. Reject implicit interpretation of legacy linear stopping, overfilled sites,
   invalid coefficients/profiles and excessive cell/pulse admission.
2. Zero beam, zero transport/renewal and equal initial/bath temperature preserve
   species and temperatures; a beam-off release case follows the analytic
   exponential and independent isotope ledgers.
3. No diffusion/release/renewal: every saved T/D/vacancy is nonnegative; site,
   T/D and incident-projectile balances close to relative 1e-9 of the larger
   initial inventory/incident count. Nuclear and deposited heat ledgers close
   to relative 1e-9 of supplied energy (absolute 1e-9 J for small signals).
4. Pulsed on-time equals a separate interval-intersection calculation to
   1e-12 times max(1,total time); no beam reactions occur after shutoff. A beam
   with no tritium must still heat a stopping film/backing.
5. Replacement and release change the yield and depth heating along with
   composition. Arrhenius release changes with independently imposed starting
   temperature. Zero prefactors cannot create a temperature-dependent rate.
6. Joint spatial/time sensitivity uses 4/8/16 film cells and successive local
   tolerances 1e-3/2.5e-4/6.25e-5. Report absolute/relative differences for
   integrated neutrons, peak film temperature and final isotope fractions.
   A convergence pass requires the final two-level change below 1% for nonzero
   neutron totals, 0.5 K for peak temperature, and 0.005 for site fractions.
   Report failures, nonmonotonicity and unresolved depth/time separation;
   these engineering exploration budgets are not calibrated material accuracy.

## Physical boundary

Atomic additivity is not a LiT compound measurement. A shared equal-coefficient
Fick operator gives mathematically conservative no-flux D/T/vacancy exchange,
not calibrated LiT trapping kinetics. Depth weights locate conditional random
replacement attempts, not measured implantation. Renewal uses external D/T
supply and exports old occupancy. Species enthalpy, binding heat, sputtering,
recoil damage, charge state, phase changes and evolving lithium density are not
included. Surviving projectiles stop in the backing; a chemical nonretention
count does not mean energetic projectiles leave the assembly. Neither lifetime
nor an actual Marathon operating point is qualified.

Primary method/context sources checked: [Geant4 low-energy stopping](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hadrons.html),
[LLNL target transport study](https://www.osti.gov/servlets/purl/4283123-gffPGP/),
and [SciPy IVP method documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html).
The LLNL coefficients are for a different target and are not transferred to LiT.

No execution result is asserted by this prospective section. All project code
must execute in an explicitly copied safe-dev guest; parent owns full integration.

## Prospective scope extension before joint study

The backing is subdivided (default four cells, independently bounded at32),
and joint refinement changes film/backing counts4/2,8/4,16/8. Residual beam
energy deposits in the first backing cell, an unresolved stopping-depth
closure that must remain explicit. Front and back isotope loss optionally use
scenario velocities divided by the adjacent film-cell width, with explicitly
supplied Arrhenius energies; defaults remain zero. These add physical boundary
fluxes without transferring titanium-tritide coefficients to LiT.

Boundary tests require the zero-diffusion first-cell exponential with rate
`v/dz`, no loss from other cells, and the same isotope ledger. Large implicit
diffusion must preserve a closed uniform composition within1e-10; runtime null
coefficients must reject. These additional expectations were declared before
their first execution. The original prospective protocol survives in the
initial red snapshot rather than being overwritten as historical evidence.

## Demonstrated implementation failures and corrections

All original failing copied snapshots and logs are retained separately.

* A minimum-subnormal fusion error scale multiplied by absolute tolerance
  became zero. The zero-beam channel therefore evaluated0/0, rejected every
  step and reached timestep resolution. In simple terms, no reaction was
  mistaken for undefined error. Identical channels now contribute zero error,
  and an entrance-energy, fully-loaded nuclear reference scales a reaction
  channel that renewal can create later. No fake positive reaction is added.
* Numeric-field filtering omitted null values, which JavaScript then coerced
  to zero. Required numeric fields are now checked by key and type. Optional
  implantation weights default only when undefined; explicit null rejects.
  This preserves valid optional defaults without interpreting corrupt input.
* Conventional Thomas elimination subtracted large, nearly equal diffusion
  diagonals. A closed uniform0.3 population drifted to0.30000001525639436.
  Positive Schur-complement elimination retains the small time/loss term and
  solves the same M-matrix without cancellation. This was chosen over reducing
  every diffusion timestep, lowering diffusion or projecting the ledger.
* Separate positive T/D/vacancy solves can sum above one by a few ulps. A real
  initially fuel-free renewal case then failed the strict public stopping
  boundary. The coupled-to-material seam now admits only finite nonnegative
  raw populations with packing error <=64*machine-epsilon*film-cell-count.
  Only stopping composition uses occupancy ratios, with an exact nonnegative
  T/D complement. Raw populations and ledgers are untouched, their residuals
  remain visible and larger packing errors still reject. The public material
  helper's genuine overfill rejection is unchanged. A reviewer caught a local
  variable shadow during this edit; it was corrected before the final checks.
* Finite area and inventory inputs could still overflow a derived renewal
  output: area1e285m² and1000s⁻¹ renewal produced infinite added T. A result
  representability invariant now rejects it instead of exporting JSON null.
  It enforces floating-point validity without invented physical size limits.

The beam-on predicate also checks nonzero current; an open pulse gate alone
does not label an absent beam active. The source is explicitly material-only,
so the legacy linear-loss controls are never silently reinterpreted.

## Observed verification and joint sensitivity

Dedicated safe-dev guest `safe-dev-0e11a2f1bc0af09f`, copied stage
`/tmp/mass-spinner-coupled-target-v35`. Every replacement sync followed an
export of unique outputs. Dependencies were downloaded once with online
`npm ci --ignore-scripts`; subsequent installs were offline. No host home,
credentials, signing keys or control sockets were mounted. Host operations
were trusted source edits, file copies, reads and byte hashes.

Final source SHA256:
`d5d3028a87f57832a0e9aa2612e927017b99d9aac0a2c0386b4cbe1a17f26b2e`.
The206-input map SHA256 is
`abe4aa2c41a58be256b2a89fde12164f038935f556f7271d3fadc2f37a6d714a`.
Final export: `/tmp/mass-spinner-coupled-target-v35-final-export`.

Observed commands inside that copied guest:

```
tsx --test tests/coupled-target.test.ts tests/target-loading.test.ts tests/target-conduction.test.ts tests/target-material.test.ts tests/fusion-reactor.test.ts tests/target-exposure-audit.test.ts
53/53 passed (15 coupled regressions and38 adjacent checks), zero failed/skipped.

tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/coupled-target.ts
exit0.

python3 run-joint.py
exit0; all4 cases complete in6.532486s within the declared120s cap.
```

The producer joint plan was frozen before reading study outcomes, SHA256
`3ffefebb40f5dfbbe1705204a650cc02fdb5b15e70acc47696fd6388f62d5f25`.
It uses the independent review's declared beam/thermal/rate scenario but
separate, weaker producer exploration budgets. It changes film/backing grid
and local tolerance together, so it cannot separate their error sources.

| Film/backing cells | Local relative tolerance | Neutrons | Deposited heat,J | Mean finalT | Mean finalvacancies | Maximum sampled first-film-cell temperature,K |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|4/2|1e-3|1.274842949e10|64.0070832|0.638421778|0.095785455|302.147854|
|8/4|2.5e-4|1.273257758e10|64.0070744|0.636861371|0.098008042|303.220556|
|16/8|6.25e-5|1.272394664e10|64.0070696|0.636044399|0.099171990|303.757132|
|32/32|1.5625e-5|1.271675276e10|64.0070656|0.635416123|0.100067386|304.159456|

All three neutron/heat/population comparisons pass the producer budgets.
The first two sampled-temperature comparisons FAIL:1.072702K and0.536576K
exceed0.5K. The final pair passes that producer budget at0.402324K; its neutron
change is0.0565701%, deposited-heat change6.24760e-8 relative, and maximum mean
population change0.000895397. This does **not** meet the independent review's
stricter0.1K/0.0002 population budgets and does not qualify target physics.
The largest measured raw packing residual is6.66134e-15; no raw state or
conservation ledger was projected. Input hashes matched before and after the
study. Full histories, case hashes, exact accepted/rejected step counts and
unaltered verdicts are retained under `scientific/marathon-v35/coupled/`.

The thermal trend is consistent with unresolved first-backing-cell deposition
depth, whose mean location shifts with mesh. This is a hypothesis about the
remaining discrepancy, not yet a measured causal decomposition. A separate
zero-range interface-source convention needs its own declared calculation and
independent checks; the current source and all these results remain frozen.

The first release-only test also demonstrates why local and global errors
differ: local tolerance1e-5 produced a9.005e-5 absolute T-fraction error, above
the fixed5e-5 comparison budget. Tightening the requested local tolerance to
1e-7 cleared the unchanged global check; its original failure is retained.
Neither a local-controller pass nor conservation is advertised as a global
accuracy certificate. Parent owns the merged full build and deployment gate.

## Latest closure: fixed-location backing-interface source

The preceding original-source results are historical and remain sealed without alteration. Canonical `src/coupled-target.ts` now has SHA-256 `a1f3c55e530a0cb125d0eb5bc43b48419e07009fdafbb888b4df68412fd35900`. It replaces the moving first-backing-cell heat source with an explicitly declared zero-range, backing-side interface source. This is a correction to the unresolved deposition convention, not a measured stopping-range model. The derivation and scope are in `INTERFACE-SOURCE-V35.md`.

The original source conserved energy but moved the heater with the mesh. Eliminating a massless face gives source fractions proportional to the opposing half-cell resistances; the intercell conductance and all material/reaction coefficients remain unchanged. This removes the demonstrated source-location bias without choosing an unsupported physical absorption length.

The isolated controlled candidate `cba18ba6152da513b3bd83f9b38692b57a59b87f2334ce315eef1605f816cf8a` was tested before promotion. The subsequent clean candidate changes only the helper documentation and output assumptions, correcting an inherited statement about first-cell deposition. Four complete physical JSON outputs are exactly identical after excluding only the `assumptions` field. The stale-label diagnostic remains immutable.

Clean execution used copied guest `safe-dev-c18c8c43128fbe7d`. Input map `9936a835d8aae6927a495cddf2aa0784e998f5e29e3bea406fb7641dee25e8a7` pins212 inputs; plan `e209a45fd81e793ee3144cd8cf6f800f9256ab8cb971eb7f74ae663449da181a` retains the same four physical cases and prospective gates. The runner verified every input before and after execution. Its first attempt rejected a manifest that mistakenly included a mutable test log; that attempt is exported separately. Removing output logs from the input map changed no source or scientific input.

Exact checks:

- `node --import tsx --test tests/interface-source-diagnostic.test.ts tests/coupled-target.test.ts`:21/21 PASS, including6 new interface oracles and15 coupled regressions.
- `tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/coupled-target.ts`: exit0.
- `python3 run-joint.py`: all4 cases complete, exit0,6.778632920s of the120s cap.
- `node --import tsx check-equivalence.mts`: all4 complete physical outputs exactly match the original interface candidate; only model information differs.

All12 strict successive-pair producer decisions passed against `.2%` neutron/heat, `.1 K` sampled-peak-temperature and `2e-4` mean-population budgets. The original weaker gates were preserved as well. For film16/backing8 to film32/backing32, relative neutron difference is `9.6409048588e-5`, heat difference `1.0646276305e-8`, maximum mean-population difference `8.7198748011e-6`, and sampled peak-film difference `2.2354272573e-5 K`. The original convention gave `.4023240813 K` for that temperature pair. The corrected coarse4/2→8/4 pair gives `.0002037774 K`, versus the original `1.072702 K`. This controlled intervention supports the proposed source-centroid root cause in this scenario.

Independently, the auditor sealed its first candidate follow-up before receiving producer comparisons: seal `ddd29331f2f362657ddef43e1de89ef3836fd129f888cd88aa758069b2935d56`. Its3 analytic oracles,14 regression checks and strict typecheck passed; all14 study runs completed and all5 predeclared strict comparisons passed. A fixed-film backing-only refinement reproduced the original `.536408 K` temperature and `.00117241` population discrepancy; film-only refinement with fixed backing passed. With the interface source, independent8/4→16/8 differences were `2.55906e-5 K`, `1.96018e-6` mean fraction and `1.84722e-6` relative neutrons. The semantic-only clean source receives a final independent rebase separately; this paragraph does not substitute the first candidate's evidence for that exact-source check.

The new regression file is present in canonical `tests/interface-source-diagnostic.test.ts`, SHA-256 `f8662e705c8ce272fc152fd3943ad225cfa295339c853ee66619c580f73f824b`. Clean raw cases, logs, immutable inputs and equivalence outputs are under `scientific/marathon-v35/coupled/interface-clean-execution/`. Original negative results and their seal remain unchanged. This qualification concerns the declared scenario equations and bounded numerical cases, not experimental validation of Marathon's target or a lifetime prediction.

The final independent clean-source rebase subsequently passed 24/24 tests,
strict TypeScript, all14 diagnostic runs and all5 original strict comparisons
on exact source `a1f3c55e530a0cb125d0eb5bc43b48419e07009fdafbb888b4df68412fd35900`.
Complete numerical outputs match the first audited interface candidate apart
from the corrected assumptions text. The independent rebase seal is
`fbf74bf8ac710e06099df15b690cb293715b37784a9291084d8114e12cafca3a`.
The earlier pending statement records the producer closure stage; this is the
subsequent observed result. Frozen producer and reviewer snapshots are unchanged.
