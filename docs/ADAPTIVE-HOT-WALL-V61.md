# Adaptive hot-wall integration, v61

Status: scoped numerical checks and release gates pass; the deployed refined
run, plots, 3D interaction, responsive layout and compressed download are verified.
Independent reconstruction of every state in the actual downloaded history passes. This is an opt-in
numerical refinement of the prescribed rotating-mixture model, not a calibrated
Marathon centrifuge. The existing Interactive mode remains unchanged.

## Problem, cause and selected fix

The v60 joint study showed that the live 64-cell, rotor-timed schedule missed
the local gas-temperature, heating-signal and wall-flux gates. Its thermal
budget still conserved energy. `fuel-centrifuge-ui.js` sends an operation to the
fuel worker; `simulateFuelOperation` advances the coupled rotor, SG inventories,
gas energies and tungsten enthalpies. Before v61, its step bound followed the
two-rotor relaxation and a quadratic nominal grid, with no heat-flow error
estimate. Nonlinear convergence and conservative bookkeeping do not limit the
time-discretization error of backward Euler.

In simple terms, the solver could account for every joule while spreading its
arrival over too long a time step.

Refined mode selects 256 equal-volume gas cells and adds backward-Euler step
doubling. Each proposal compares one full step with two half steps, starting
from exactly the same accepted state. It accepts the conservative half-step
trajectory only when the maximum scaled difference is at most one. Both
half-step knots are retained for plots, 3D phases, interventions and export.
Rejected trial states, all energy/impulse ledgers and resolution maxima roll
back together. Existing physical-domain and nonlinear failures still throw;
they are not swallowed as retryable accuracy failures.

The bounded controller uses `h_new = h × clamp(0.9 / sqrt(error), 0.2, 2)`.
This follows the conventional low-order implicit adaptive-controller pattern
documented by [SciML](https://docs.sciml.ai/DiffEqDocs/stable/extras/timestepping/)
and [PETSc](https://petsc.org/release/manualpages/TS/TSADAPTBASIC/). It is a small
TypeScript adaptation around the existing conservative step, not a claim that
the browser runs either library. SciPy/Bessel and FiPy controls remain external.

Temperature differences use an absolute allowance plus a relative allowance
on the local change from the initial temperature. Scaling by the 500 K
background would conceal errors in a 0.1 K heating signal. Spin, phase, species
CDFs and physical/numerical energy ledgers also contribute to the maximum norm.
No Richardson-extrapolated state is used: that would require new positivity,
entropy and mechanical-loss identities. This bounded change preserves the
existing represented equations and the identities already independently tested.

## Numerical policy and measured tradeoff

The public optional policy is
`operation.thermal.gas.accuracy = {relativeTolerance, temperatureToleranceK}`.
The live refined choice requests `6.25e-7` and `1e-7 K`. A scientific caller's
explicit gas mesh still wins. Missing accuracy preserves the legacy schedule
and 64-cell default; 512 remains the nominal interval count in both modes.
The tungsten liner remains 16 cells for this tested 1 mm wall. Different wall
thicknesses, conductivities and slider combinations require their own studies.

| Tested 1 s hot-wall case | Max gas-temperature difference | Local heating difference | Wall-flux difference | Local accuracy gates |
|---|---:|---:|---:|---|
| Unchanged Interactive, 64 gas / 16 wall cells | 1.01528 K | 84.02% | 6.267% | fail |
| Refined, 256 gas / 16 wall cells | 0.02402 K | 0.1918% | 0.1430% | pass |

The Interactive row is the preserved v60 live-default result, not a newly
qualified mode. Its small global energy residual and passing total-wall-heat
gate do not resolve the local boundary-layer errors.

| 256 gas cells, 1 s | Accepted half-steps | Max gas difference | Local heating difference | Wall-flux difference |
|---|---:|---:|---:|---:|
| Relative tolerance 0.001 | 2,180 | 0.4750 K | 5.485% | 2.767% |
| 0.000025 | 5,970 | 0.2212 K | 0.6520% | 1.328% |
| 0.00000625 | 11,222 | 0.1069 K | 0.1896% | 0.6503% |
| 0.0000025 | 17,444 | 0.06237 K | 0.1732% | 0.3789% |
| **0.000000625** | **31,790** | **0.02402 K** | **0.1918%** | **0.1430%** |

Thresholds remain strictly below 0.1 K, 5% local heating and 1% wall flux.
The selected run also passes rotor (<3%; measured 0.008683%) and signed wall
heat (<1%; measured 0.008887%) gates. Its worst accepted species, angular,
mechanical and thermal budget residuals are below 1.08e-13. These residuals
establish conservation, separately from the finite-reference accuracy results.
The selected run took 63.3 s in the offline four-vCPU VM. Refined is deliberately
opt-in; faster trials failed and are preserved as negative results.

The intermediate 35-second setting passed the rotating finite-reference study
but failed the independent Fourier absolute-temperature gate at 0.100928 K.
That failure selected the tighter policy. Its Fourier difference is 0.057946 K,
surface-heating difference 0.3365%, wall-flux difference 0.06390%, and wall-heat
difference 0.01409%, including worst-case finite-boundary uncertainty. No gate
was relaxed to admit the intermediate setting. The Fourier surface-signal norm
and mixture local-cell norm are distinct and are reported separately.

At relative tolerance 0.000025, 128/256/512-cell full runs differed from the
reference by 0.22109/0.22121/0.22127 K. This is evidence of dominant accumulated
time error at that tolerance, not a reason to declare spatial convergence.
Tighter same-mesh and finer-mesh studies are recorded separately below.

The final policy also passes full 1 s runs at 128 and 512 gas cells, and early
2 ms runs at 64, 128, 256 and 512 cells, against the unchanged composite reference.
The successful analysis retains all 21 comparisons, including ten failures of
other numerical policies. Passing a short 64-cell case does not qualify the
unchanged Interactive schedule or every 64-cell trajectory.

## Large-history interface fixes

Refinement exposed a plotting failure: six energy curves with about 32,000
samples expand roughly 192,000 arguments into a single `Math.min`/`Math.max`
call. The VM regression reproduced a stack overflow at `laboratory.js:147`.
In simple terms, the chart tried to hand the browser too many numbers at once.
A single constant-arity extrema loop over the already-filtered finite pairs
fixes the cause while preserving every sample, true extrema, explicit domains,
equal spatial scale and keyboard selection. It is preferable to dropping data
or special-casing this plot. The unchanged regression and adjacent plot/UI
controls passed in a 44-test central run.

The refined 1 s result also contains 1,408,211,301 serialized checkpoint bytes,
well beyond V8's 536,870,888-character single-string limit. Export previously
built the entire JSON string before constructing a Blob. In simple terms,
the result was valid but too large for one text allocation. `fuelExportBlob`
splits only root/result/transport properties and checkpoint/snapshot arrays,
immediately storing each serialized state in a Blob. This keeps the existing
filename, MIME, JSON schema, property order and every accepted knot. Native
JSON-byte comparisons and bounded-serialization controls pass. This direct
fix avoids a schema migration or silent decimation. It does not remove the
cost of retaining and transferring the full history; large refined runs and
pinned comparisons remain memory-intensive.

Actual browser verification exposed a further boundary after Final C: a small
3,636,575-byte Interactive download succeeded, while two attempts to download
the full refined raw JSON produced no observed download event; native input
timed out after 45 seconds on the second attempt. The page later responded and
reported no console error. Those are observations, not proof of a browser crash
or an identified download-size limit. The source does establish that the entire
raw-byte preparation ran synchronously inside click handling, creating the
1.4 GB Blob before a download could begin.

The follow-up keeps Interactive JSON unchanged and prepares Refined downloads
as `.json.gz`. A shared bounded JSON generator feeds the native
[Compression Streams API](https://compression.spec.whatwg.org/) directly, with
concurrent draining, awaited write backpressure and browser-task yields every
1 MiB. It retains compressed bytes only; decompression preserves the complete
JSON schema and every accepted state. In simple terms, the browser compresses
small pieces while staying responsive, instead of first constructing the giant
raw file. This uses an existing standard rather than a new scientific format,
discarded samples or a second copy of the history in another worker. Abort,
changed-result, disposal, codec errors and URL ownership are tested explicitly.
The final focused follow-up passed 30/30 tests, including abort during a pending
stream write. The full-size gzip control passed in 132.2 s: 486,798,118 compressed
bytes reproduce all 1,413,979,084 raw bytes with the exact Final C SHA above.
The audit also found that an active animation frame could overwrite a codec
error. The existing owner-checked catch now pauses playback before displaying
the error, matching the intervention-error path. A regression invokes the actual
viewer animation callback and checks that the error remains visible and no
physics rerun occurs. This removes the status writer at its source rather than
adding a general status-priority abstraction. Final D release and actual-browser
download were verified separately, as recorded in the closeout below.

## Independent evidence and boundaries

The finite startup comparator reuses v60's independent canonical projection
onto common equal-volume annuli. It projects species inventories and internal
energy before reconstructing temperature; averaging temperatures directly
would be wrong when inventories differ. It retains every exact registered
observation time and never silently interpolates or discards observations.
The composite reference uses the archived 512-gas/128-wall/32,768-interval full
run and the denser early 512/128/16,384 run through 2 ms. Its own uncertainty
and convergence limitations remain those documented in
[v60](JOINT-HOT-WALL-CONVERGENCE-V60.md). Comparisons qualify these finite
reference observations, not a continuum error bound or every accepted knot.

The independent method tests use a spectral-projector two-rotor solution,
exact switched-current integrals, phase quadratures and accepted-knot budgets.
Separate entropy tests reconstruct ideal-monatomic gas entropy, tungsten
entropy, coolant entropy and first law without production property or step
helpers. Startup and three current switches passed across 629 and 891 retained
knots. Every accepted entropy increment was positive (minimum 1.77e-8 J/K).
The smallest entropy-minus-production margin was -4.10e-13 J/K, within the
unchanged storage-roundoff allowance; maximum independently reconstructed
first-law residual was 4.12e-10 J.

The additional Fourier control runs the actual adaptive whole-operation driver
with zero current, negligible diffusion and no coolant. An independent Bessel
series bounds cell-average continuum temperatures and wall heat using extrema
of the accepted finite-wall boundary. Instantaneous flux uses interval products,
not an unjustified ordering of flux curves. Boundary uncertainty and spectral
512/1024-mode differences are reported separately. This isolates heat flow; it
does not independently solve the nonlinear rotating-mixture continuum problem.

Continuation retains canonical prefix states, clips exactly to current events,
and reports time-control counters only after `startTimeS`. Old accepted histories
without summary metadata can resume if their canonical states are valid. Changed
accuracy or nominal time-grid settings cannot silently requalify a retained
prefix. Old version-2 scenario links without the new setting restore Interactive
even when opened over a Refined workspace. Invalid cross-field scenarios restore
atomically. Model info and exported results expose the actual accepted counts,
rejections, tolerances and maximum accepted error ratio.

Physical scope is unchanged: prescribed conductivity, diffusivity, friction,
ion fraction and interface film; common monatomic gas temperature; no radial
fluid momentum, kinetic wall layer, acoustics, Soret/Dufour effects, discharge
kinetics or calibrated Marathon performance. Numerical convergence cannot
establish those missing closures. The early continuum wall-layer validity
question from the gas-regime assessment remains open.

## Reproduction and release evidence

All project execution uses the offline safe-dev source copy
`/work/home/fix-v43-source`. Host edits are explicitly transferred and checked
against the prior guest manifest; receipts verify the input snapshot before and
after each command. Exact commands, source hashes and outputs are under
`scientific/fixes-v43/hotwall61-*.{receipt.json,inputs.json,log}`.

Focused controls: `node --import tsx --test` with the v61 time-control,
independent method, UI, v59 continuation and v59 entropy files: 14/14 passed
at the earlier focused snapshot. Independent adaptive entropy: 2/2 passed.
The reference-adapter selfcomparison first asserted exact zero and observed
3.41e-13 K from canonical U/N reconstruction; its regression assertion now
allows <1e-10 K roundoff only. No physics-accuracy threshold changed.

Final C passed all 19 commands, including `npm test` (1,193/1,193),
`npm run typecheck`, `npm run build`, `npm run check:site`,
`npm run check:assets`, both emitted-worker verifiers, collision-data admission,
mixture studies, actual FiPy reference, hot-wall studies, nine independent Python
oracle tests, selected-policy full/early/Robin studies and unchanged legacy replay.
The full export smoke streamed 1,413,979,084 bytes across 31,791 accepted knots,
SHA256 `b39a70aef724b30f5d7bf54ba8718534306c6753793e06500783bbcc142d0cb9`.
No whole-history string was materialized. The selected-policy analysis retains
earlier spatial/timestep cases and rejected numerical policies.

Exact Final C command (superseded by Final D below):
`python3 scientific/fixes-v43/control.py --timeout 900 v44-final-adaptive61c -- python3 scripts/run-final-v44.py adaptive61c`.
All 643 inputs were verified before and after every gate; input-manifest SHA256
`6a0f84efa57cb2761c57976d1bb028b03ef9c12bdbb6b07fda1f50252ffaaba9`.
The 151-file release manifest has SHA256
`b82f3a446ba61e3319d8f9149954fe262b2a920c8cb953287932554eb70626c3`.
Release/command logs are in `scientific/centrifuge-v44/adaptive61c/final`;
52 exported study payloads and raw-byte hashes are retained in
`scientific/centrifuge-v44/adaptive61/studies/manifest.json`.

Cloudflare deployment `f369d1b4-1b1e-4410-8810-a4d2453cb869` is verified at
100% traffic. Browser DOM confirms `assets/index-Bk-6Okfh.js` was loaded.
Actual desktop/mobile refined-run controls, plots, 3D output and download audit
were then exercised. The accepted Model info reports 256 cells, 31,790 intervals,
15,895 pairs, seven rejected trials and maximum ratio 0.824, matching the offline
run. Keyboard plot inspection selects the first accepted knot at
1.37249830694157e-11 s and updates the scene; playback, rewind and camera rotation
work. The full six-curve energy plot reaches the 1 s endpoint without dropping
its 31,791 samples per curve. Screenshots and DOM width checks cover 1280×900,
390×844 and 320×740; the two mobile checks show no horizontal overflow. The
browser export failure above remains explicitly distinct from these passes.
These Final C observations preceded Final D's compressed-download follow-up
below; provider rollout alone does not establish browser behavior.

The first complete gate passed 1,193 tests, then exposed a TypeScript narrowing
error in the canonical continuation-prefix copy. The branch already strips the
snapshot-only fields at runtime; the fix gives that destructuring its actual
`FuelTransportSnapshot` type. It changes no arithmetic or retained data.

The second complete attempt passed the tests, typecheck, build, site/assets and
generic emitted-worker checks. Its centrifuge-worker harness then exhausted the
2 GiB JavaScript heap: it retained every old reply in an array while adding the
large adaptive histories. In simple terms, the verifier kept all earlier runs
even after checking them. Dispatch is synchronous and every assertion consumes
only the latest reply, so the harness now releases the previous array entry.
Explicitly retained continuation inputs and all assertions remain intact. This
fix addresses unnecessary harness retention rather than increasing resource
limits or removing cases. The narrow emitted-worker retry passes 144 base,
20 operation, four spatial, ten mixture, two hot-wall and two adaptive cases.
This in-process harness does not measure browser structured-clone memory;
actual browser verification remains a separate gate. Both failed attempts and
their exact input manifests are preserved.

### Final D: compressed export follow-up

`python3 scientific/fixes-v43/control.py --timeout 900 v44-final-adaptive61d -- python3 scripts/run-final-v44.py adaptive61d`
passed all 19 gates in 429.3 s: **1,200/1,200 JavaScript/TypeScript tests**, all
required typecheck/build/site/asset checks, both bundled workers, ten Python
oracle tests, FiPy, hot-wall/full/early/Robin studies and exact legacy identity.
The full gzip comparison again reproduces Final C's exact raw bytes and hash.
The two additional input files are the independent streaming browser auditor
and its corruption/truncation controls; no physical coefficient changed.

Tested 645-input SHA256:
`3e6c57102c97b52b88940dd99f7c694a6f62dd45b7ee222c23ee68b04849865f`.
Checked 151-file release SHA256:
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
The separate independent method review inspected these actual receipts and
gives scoped source, generated-release and numerical approval.

Cloudflare version `987dac94-a8f2-4e7c-b932-2b7b6f66cdad` is verified at 100%
traffic; actual browser DOM loads `assets/index-DcFujFEQ.js`.
Earlier pre-browser receipts intentionally retain `browserVerified:false`.

### Actual Final D browser verification

The deployed 1 s refined run completed with the same 256 gas cells, 512 nominal
intervals, 31,790 accepted half-steps, 15,895 pairs, seven rejected trials and
0.824 maximum accepted ratio as the offline run. The six-curve energy plot,
keyboard selection of the first accepted knot (1.37249830694157e-11 s), physical
time control at 1 microsecond, temperature profile and Show in 3D were exercised.
At 1 microsecond the scene reports ions 0.2671 m/s and neutrals 0.00001352 m/s;
its gas temperature and liner profile share the selected time. Actual DOM widths
are 1280/1280, 320/320 and 390/390 viewport/document pixels. These are responsive
viewport checks, not phone hardware, GPU-speed or memory qualification. Refined
remains slow and memory-intensive; the unchanged Interactive mode is the default.

An actual compressed download was observed through CUA's download event on
2026-11-10 at 09:16 UTC. Its 487,617,620 bytes were copied from the exact granted
download path and transferred into the offline audit VM, with SHA256 verified
on both sides:
`449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`.
Screenshots, source-entry proof, accepted metadata, console output, download and
transfer receipts are under `scientific/centrifuge-v44/adaptive61d/browser`.
The browser file also contains UI configuration/provenance, so its compressed
size differs from the campaign's result-only gzip control.

Several automation click calls timed out during preparation, resetting their
listeners; later bounded observers either expired before completion or captured
the successful download. Those timeouts do not establish an application failure.
An independent read-only review found no justified delayed-anchor/user-activation
fix; no such fallback or second-click UI was added. The page returned to Export
and the captured warning/error log is empty.

The actual-file auditor initially stopped on `ijson`'s `use_float=True` 64-bit
integer ceiling at the valid JSON value `354631197412543370000` in `burnTritonsS`.
In simple terms, a legitimate particle rate exceeded the auditor's integer size,
before it reached the history. The minimal fix uses its existing parser's default
arbitrary integers/Decimals, converting Decimal values back to binary64 only in
the bounded metadata record or individual checkpoint under audit. Integer counts
stay exact, every checkpoint remains streamed, and physical tolerances are unchanged.
This is preferable to clipping scientific values or loading the full 1.4 GB JSON.
The regression includes that exact large integer in plain and gzip inputs plus
the existing negative residual, corrupt species energy, corrupt impulse,
truncation and trailing-root controls. It passes in the offline VM at 645-input
SHA256 `4b8502fbfbf7e07496068c29a7e63b1c78db17cb4225cb163eeffbc60eb65904`;
an independent reviewer approved the scoped numeric change. Only auditor/test
sources changed after deployment; the checked application release is unchanged.

`python3 scientific/fixes-v43/control.py --timeout 900 hotwall61-browser-export-audit-v2 -- /work/home/thermal-v53-venv/bin/python scientific/hotwall-adaptive-v61/check-browser-export.py /work/home/adaptive61d-browser-export.json.gz`
passes in 96.06 s at that same 645-input snapshot. The complete JSON stream was
consumed through EOF, all 31,791 checkpoints were reconstructed, and all 40
producing-source digests match the deployed result's source hash
`a13a2f09e7316019a0cb3fb7b7f1241a179728c10ee347c47ec8a64d4c080270`.
Maximum independent residuals are species normalization 5.3291e-15, angular
momentum 2.2842e-14, mechanics 2.5924e-14 and total thermal energy 1.0486e-13.
Canonical gas fields, species energies, mass-weighted inertia, rotor momenta,
phase quadratures and global ledgers pass at every retained knot. This audit
does not independently invert tungsten enthalpy or establish local flux accuracy;
those accuracy claims remain bounded by the separate reference/refinement studies.
The failed first parser audit remains preserved alongside its successful retry.

After the audit-only parser correction, `hotwall61-post-audit-final` reran all
ten Python oracle tests, `npm run typecheck` and `npm run build` in the offline
VM; all pass in 7.04 s at the same 645-input SHA256 above. The regenerated
application entry remains `assets/index-DcFujFEQ.js`; no post-deployment app code
or physics changed. Independent method and history reviews inspected the actual
browser evidence and successful full-file audit, keeping conservation, numerical
accuracy and physical calibration as separate claims.
`hotwall61-release-identity` also compares every regenerated release file with
the checked Final D manifest: all 151 files are byte-identical, with release
SHA256 `889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
