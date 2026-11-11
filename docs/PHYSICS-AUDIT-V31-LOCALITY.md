# Independent spatial collision and convergence audit, v31

8 November 2026. Scope: production annular/adaptive collision geometry, density
normalization, raw angular conservation, timed exits, sampled local coverage and
the convergence-plan contract. The reviewer found and repaired one **P2 numerical
verification defect**. No new demonstrated collision-volume or torque-ledger
algebra defect was found. Existing transport qualification remains withheld.

## Confirmed defect: unused collision inputs counted as refinements

Execution path: `validateConvergencePlan` accepted increased `cellsAcross` as a
spatial refinement for every collision method. `simulateDoublewell` dispatches
adaptive cells to `adaptiveCollisionCells` using radius, length, marker weight,
target occupancy and maximum depth. That executed partition never reads
`cellsAcross`. The Cartesian base-width fields in convergence metadata are not
an executed adaptive-grid resolution.

The production witness runs N32/species, Nanbu, 2 µs, with adaptive cells and
`cellsAcross=2` versus `12`. Collisions do occur. Histories, species/collector
records, conservation, collision diagnostics, actual spatial diagnostics and
regime histories are **bit-identical**. Nevertheless, the original validator
accepts that comparison as spatial refinement. This could count an unperformed
sensitivity direction. It did not demonstrate a false whole-study PASS: identical
paired observations remain UNKNOWN and the overall contract also requires missing
directions/effect qualification.

The adjacent collision-off path has the same defect. Changing TA/Nanbu or fixed
collision-cell counts while both levels disable collisions leaves actual
particle/collector histories, conservation and collision diagnostics bit-identical.
The old validator still accepts method/spatial refinement. The geometric regime
diagnostics may change with cells, but the collision operator never executes.

In simple terms, the study said it refined collisions after turning a knob that
the chosen mode does not use, or while collisions were switched off entirely.

The minimal fix rejects adaptive `spatial` comparisons in the current interface,
and requires both levels to enable collisions for method/spatial comparisons.
Adaptive target/depth changes remain explicit **method comparisons**; fixed
Cartesian and annular radial-only/axial-only spatial comparisons remain accepted.
Collision-off timestep/particle comparisons remain accepted, and the dedicated
`physicalEffect` route still supports matched collision-on/off studies. No new
adaptive refinement semantics or numerical algorithm was invented.
Rejecting an unexecuted control is preferable to changing particle dynamics,
silently relabeling a comparison or weakening gates. This is a domain boundary
for what the current executor actually implements. Root explicitly authorized
the two narrow `src/convergence.ts` guards after reviewing the red witnesses.

The first original-source regression run is **3 pass, 1 expected fail**. The
extended original-v30 run is **4 pass, 3 expected fail**, covering all three
unexecuted settings. The same regressions pass after the guards, without changed
rejection conditions. The final neighboring suite is **19/19 pass**, including
real controls and existing convergence/ring-wrapper regressions. Source
`tsc --noEmit` passes on the final corrected angular kernel as well.

## Historical compatibility check

A read-only scan examines **561** bounded plan/public-summary inputs and finds
**105** nested plan objects, including copies preserved in earlier execution
snapshots. No adaptive spatial or collision-off method/spatial comparison is
affected. The public
`assets/locality-comparison.json` and `web-assets/convergence/locality-comparison.json`
are old separate method studies explicitly marked `transport convergence NOT
established`, with gate `not-established`; they are not newly invalidated spatial
certificates. All historical source, plans, numerical gates and outputs remain
unchanged.

The scanner selects JSON filenames containing `plan` beneath assets,
web-assets/convergence and scientific, plus public summary/locality-comparison
files. It records exact input hashes and nested object paths. It does not execute
any historical source. Exact selection, embedded input bytes and executed code
are retained in compressed `audit-historical-executed.py.gz`; output is
`historical-plan-audit.json`.

## Independent geometric and rate checks

The new test places one representative in every cell of twelve independently
configured source-fitted annular grids: radial counts 2/3/6/12, axial counts
3/9/18, with off-grid declared source interfaces. Summed occupied-cell volume
agrees with `πa²L` within 2e−14 relative, and density×volume recovers the exact
weighted inventory. Faces depend on declared geometry, not sampled support.

An independent exhaustive sampling calculation checks the empirical self term:
four independent markers occupy two equal-probability fixed cells. All sixteen
position outcomes are enumerated. The mean `Ncell(Ncell−1)w²/Vcell` agrees with
the independently derived `N(N−1)w²/Vtotal`. This supports the fixed-partition
self-exclusion diagnostic; it does not certify adaptive density selection bias.

Analytically, for even N the random partner probability is `1/(N−1)` and the
effective partner density is `(N−1)w/V`. For odd N, pairing probability
`(N−1)/N` combined with conditional partner probability `1/(N−1)` and density
`Nw/V` gives the same per-partner `w/V`. No infinitesimal finite-N normalization
defect is demonstrated. Finite-angle/non-Maxwellian/time-discretization errors
remain separate.

The ring coordinate reduction was cross-checked against the upstream
[WarpX discussion and source excerpt](https://github.com/BLAST-WarpX/warpx/discussions/6835),
which rotates momenta into common azimuthal coordinates for an axisymmetric
distribution. This supports that symmetry convention, not exact finite-radius
angular conservation. Our direct lever-arm identity is
`ΔPθ=(ra−rb)Δpθ`; position-only magnetic canonical terms do not change during
collisions. No angular projection or nearest-neighbor substitution was introduced.

## Independent checks of actual archived histories

A new standard-library checker imports no production helper or previous checker.
It reconstructs raw total angular momentum from saved species means and all exits
at or before each actual saved time. It also independently integrates the final
annular density, checks population partitions and the exact endpoint, and rebuilds
active-population-weighted trapezoidal unresolved exposure.

Four selected complete v30 artifacts pass:

| Artifact | Raw angular maximum | Unresolved exposure |
| --- | ---: | ---: |
| Cartesian TA N128 seed101 | 0.714721% | 51.0231% |
| Ring Nanbu N1024/nr12 seed101 | 0.0423651% | 26.8704% |
| Ring Nanbu N1024/nr12 seed606 | 0.0279397% | 25.5845% |
| Closed Nanbu N256/nr6 seed101 | 0.394773% | 28.2943% |

Maximum difference from the stored normalized raw angular history is
**5.20e−16**. The fine examples meet the original 0.1% raw angular gate, but fail
the 1% local-coverage budget. The closed example still fails angular conservation.
The selected reconstruction agrees with, rather than independently replacing,
the broader v30 six-seed result. This archived-history reanalysis itself runs no
new trajectories; the separate fresh full-duration confirmation follows below.

These saved artifacts do not contain every particle's complete instantaneous
state, so this review does not independently reconstruct a full velocity PDF,
physical entropy integral, between-snapshot maximum or unsampled regime state.
The torque-subtracted ledger is not substituted for the raw residual.

## Fresh current-source full-horizon confirmation

After the angular reviewer froze the corrected transverse-impulse representation,
root authorized a separate confirmation on the exact v30 fine annular parameters:
N1024/species, nr12/nz9, source-fitted pulse, Nanbu, 100 ns, full **200 µs**,
seeds 101/202/303/404/505/606. This does not replace any v30 output. The new plan,
source map and scripts were fixed before evolving those six cases. The maximum
combined budget is 180 s, at most 45 s per case; incomplete cases remain UNKNOWN.
Neither the original raw angular 0.1% gate nor the 1% coverage budget changed.

**All six completed** without errors/timeouts, in **45.620 s**. Their maximum
sampled raw angular residual is **0.0423651%**, passing 0.1% for every seed.
Maximum unresolved representative exposure is **26.8704%**, still above 1%.
Coverage therefore remains **UNKNOWN** under the existing contract and physical
transport qualification is **withheld**. This one-level confirmation is not a
new timestep, spatial, particle, orientation or distribution convergence study.

A separate checker reconstructs all six new raw artifacts using species means,
timed exit flux, volume/inventory and population-weighted coverage. Maximum
normalized angular-ledger reconstruction difference is **3.38e−17**. All six
exact final times and particle partitions pass. Neither excellent ledger
agreement nor the raw-angular pass certifies unsampled local distributions.

Prospective confirmation plan SHA-256:
`0ce942bb0aec2bdf48bc4f8859a4187821aa518772dc2d7c5d963c990016935d`.
Executed compact-map source identity:
`a9b602ae7187e58f4ce8494bda1ea51c84bfdc7662bf396394c1afa8dd6c3cf2`.
This differs intentionally from the pretty-printed map-file SHA below.
`extended-final/` retains the full plan, exact source/scripts, per-seed raw records,
logs, status, independent reconstruction and unchanged-gate summary.

## Exact execution and evidence

Distinct copied Apple guest `safe-dev-f749d6b302f74806`, stage
`/tmp/mass-spinner-audit31-locality`. All project execution occurred there.
Only initial `npm ci --ignore-scripts` used network; later source replacement
was preceded by export and followed by explicit sync and offline reinstall.
No home, credentials, signing keys, SSH agents or control sockets were mounted.
Host operations were trusted reading, copying, hashing, compression and edits.
No browser-policy workaround or deployed GPU observation was attempted.

Executed commands, prefixed with `safe-dev -C` and the stage path:

```
init
run --online -- npm ci --ignore-scripts
run -- sh -c './node_modules/.bin/tsx --test tests/audit31-locality.test.ts > locality-red.log 2>&1; result=$?; cat locality-red.log; exit $result'
run -- python3 - < /tmp/mass-spinner-audit31-locality/check-raw.py
export /tmp/mass-spinner-audit31-locality-original-export
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- python3 - < /tmp/mass-spinner-audit31-locality/run-final.py
run -- python3 - < /tmp/mass-spinner-audit31-locality/audit-historical.py
export /tmp/mass-spinner-audit31-locality-final-export
```

The first-scope final runner verifies all 82 mapped input hashes before and after the narrow
tests, source typecheck and raw reconstruction. All three commands exit zero.
The historical scanner and runner are streamed as the exact retained bytes.
No frozen campaign was mutated and no thresholds were loosened.

For the authorized adjacent collision-off guards, the preserved original-v30
convergence module was restored only in the copied stage, and all seven final
regressions reran red (4 pass/3 fail). That guest output was exported to
`/tmp/mass-spinner-audit31-locality-extended-original-export`. Only then was the
current corrected production source explicitly synchronized, with another offline
reinstall. The final runner checked 87 pinned inputs before/after its 19-test,
typecheck and archived-reconstruction commands. The confirmation runner separately
checked the same pin before/after all six trajectories. Exact later commands:

```
run -- python3 audit-historical-extended.py
export /tmp/mass-spinner-audit31-locality-extended-original-export
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- python3 run-final.py
run -- python3 run-confirmation.py
run -- python3 check-confirmation.py
export /tmp/mass-spinner-audit31-locality-v31-final-export
```

One overlapping launcher attempt was refused with `Resource temporarily
unavailable` before the historical scanner started. The sequential retry passed;
no trajectory or acceptance gate changed because of that infrastructure error.

The first-scope tested snapshot/map remain preserved, including its original
82-input map and 16-test result. The final extended snapshot has 87 mapped inputs
and 19 passing tests. Final tested `src/convergence.ts` SHA-256:
`d4f7e3acea3026c1948539dc260d1ed285c6d27dc755f72fa47a4d13f9e133c1`.
Final angular kernel SHA-256:
`92a2fb84e6df657495871e43107ffd7b7c99b2a9fd974008a403db4e67ff3565`.
The final 87-input map file SHA-256:
`29402cbcad33014eb595e5d2ad963dbeebbdaa6b46663f6c490af7599553b97e`.
Tested production bytes match canonical at handoff; other team edits and final
application build/deployment remain the parent's integration responsibility.

Evidence, original/corrected sources, exact logs, frozen selected raw inputs and
their hashes are under `scientific/physics-audit-v31/locality/`.
