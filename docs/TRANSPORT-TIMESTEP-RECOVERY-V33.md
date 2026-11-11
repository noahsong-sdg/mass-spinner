# Independent high-N timestep recovery, v33

8 November 2026. All six full-200-µs, N32768/nr12/nz3, 50 ns runs completed.
The independently calculated 100→50 ns intervals give **60 PASS / 0 FAIL /
0 UNKNOWN** under the existing arithmetic gates. These intervals are now
**exploratory and conditional**: a separate audit proves shared PRNG inputs,
so the intended independent-replicate confidence coverage is not established.
Actual output covariance and miscoverage remain unmeasured.

Transport remains unqualified. Every fine-step run has sampled states outside
the supported local-regime estimates; five also exceed 1% unresolved exposure.
No physics equation, seed, horizon, tolerance or frozen arithmetic verdict was
changed to obtain these results.

## Observed outcomes

All six runs use the same physical inventory, source, fields, species and Nanbu
law as the frozen v33 confirmation plan. Source-fitted nr12/nz3 denotes the base
mesh, with declared source-interface faces inserted where needed. Seeds remain
101, 202, 303, 404, 505 and 606.

| Seed | Raw angular maximum | Unresolved exposure | Outside snapshots | Seconds |
| --- | ---: | ---: | ---: | ---: |
| 101 | 0.0326615% | 1.016795% | 5 | 498.148 |
| 202 | 0.0291187% | 1.260749% | 4 | 492.406 |
| 303 | 0.0258946% | 1.117732% | 1 | 493.527 |
| 404 | 0.0291878% | 1.263858% | 5 | 495.320 |
| 505 | 0.0279735% | 0.809257% | 7 | 501.555 |
| 606 | 0.0238073% | 1.063111% | 6 | 497.313 |

The unchanged raw angular budget is 0.1%; all six pass it without subtracting
measured collision torque. The unchanged unresolved-exposure budget is 1%.
Seed505 meets that scalar threshold, but its seven outside-regime snapshots
still make its **production combined sampled-coverage verdict FAIL**, as for
every other fine-step run. The frozen ledger analyzer's field `coverageGate`
means the exposure-only threshold; it does not override the production verdict.
This label clarification is recorded separately in `qualification-caveat.json`.

The 60 paired observable intervals all fit their original budgets. For example,
the residual kinetic-temperature changes are 0.014742 ± 0.031295 eV for A and
0.005742 ± 0.010982 eV for B (the frozen approximate 95% half-widths). They are
conditional calculations, not validated confidence statements or evidence that
the whole transport model is qualified.

## Independent accounting and comparison

The frozen standard-library ledger analysis imports no production or other
auditor code. It checks exact source/configuration/case identity, complete species
inventory, destination counts at every saved time, and **295083 exits at their
actual event times**. Raw canonical momentum reconstructed from active means
plus all timed exits differs from saved history by at most **7.39e-17** in the
positive diagnostic normalization. Survivor CDF reconstruction differs by at
most **5.56e-17**. Population-weighted trapezoidal unresolved exposure agrees
with every saved diagnostic within the fixed 2e-13 check budget. All checks pass.

The independent paired calculation uses the existing t5=2.570582 multiplier,
six fixed run differences, unchanged observable tolerances and the existing
no-resolved-spread/undefined-population UNKNOWN rule. Its source and baseline
selection were frozen before any h50 completion or inspection. It reads the
six already accepted 100 ns records: original clean seeds303/404/505/606 and
separately prospective resource-recovery seeds101/202. The complete selection
catalog, original-attempt catalog, statuses and exact raw hashes are retained.
Selection was by clean execution completion under the root recovery protocol,
not by favorable physical outcomes. No original attempt is relabeled.

## Additional random-stream finding

The existing [v33 PRNG audit](TRANSPORT-PRNG-V33.md) proves that the legacy
32-bit-state generator chooses phase shifts of one state/output sequence. This
review extends that counter proof only after all six h50 runs became terminal.
It verifies source/input hashes and the identity
`activeIonSteps = 2*pairs + unpairedIonSteps` in every completed record.

The exact binary64 outer time loop executes 4000 steps. With at most 52 fixed
source-fitted cells and P stored collision pairs, shuffle draws alone obey
`D >= max(P, 2P - 2*4000*52)`, regardless of zero relative velocities or zero
scattering variance. Combining these bounds with the modular stream offsets
proves at least **216211383** shared collision uniforms for seeds101→404 and
**230921120** for seeds505→303. Seed505's collision stream also reuses all
**589824** initialization uniforms. Actual draw counts are not inferred from
these lower bounds.

This is an input-stream defect, not proof of nonzero output covariance or a
measured transport bias. It leaves deterministic saved outputs and frozen
arithmetic intact while withdrawing any unconditional confidence-coverage
interpretation. A prospectively versioned generator cohort is separate work;
this reviewer made no generator or source change. The original PRNG evidence
leaf is untouched.

## Execution, provenance and preserved failures

The first h50 schedule is preserved in `confirmation-time/`: seed101 timed out
at 800.012086 seconds, seed202 was explicitly interrupted, and four seeds were
unrun. Root stopped only that owned VM and requested a separate prospective
serial resource-recovery plan. The original plan, statuses and 91-file checkpoint
remain byte-identical. See [original record](TRANSPORT-TIMESTEP-V33.md).

This recovery started only after root confirmed the preceding heavy Mass Spinner
batch had ended. Root coordinated it as the sole heavy Mass Spinner VM; other
chats' jobs were not controlled. Every run completed under the unchanged frozen
1200-second cap, with total subprocess time **2978.268 seconds**, below the
7200-second batch budget. Serial completion versus the earlier timeout does not
by itself prove the cause of the runtime difference.

All execution used copied safe-dev guest `safe-dev-7211d4e37fd6d243`, stage
`/tmp/mass-spinner-transport33-timestep-recovery`. Only locked
`npm ci --ignore-scripts` used network. Simulations and standard-library analyses
ran offline, without host home, credentials, control sockets or SSH-agent mounts.
No project code executed on the host. Host operations only copied, read, hashed
or edited trusted files.

Exact commands use `/Users/noahs/.local/bin/safe-dev -C` with that stage:

```
init
run --online -- npm ci --ignore-scripts
run -- python3 run-study.py plan.json
run -- sh -c 'python3 - > ledger-analysis.log 2>&1' < analyze.py
export /tmp/mass-spinner-transport33-timestep-recovery-ledger-export
sync --replace-guest
run -- python3 run-comparison.py
export /tmp/mass-spinner-transport33-timestep-recovery-comparison-export
run -- sh -c 'python3 - > h50-prng-counter.log 2>&1' < audit-h50-prng.py
export /tmp/mass-spinner-transport33-timestep-recovery-final-export
```

Both stdin scripts are the exact canonical evidence files. The ledger export
preceded guest replacement; all valuable outputs were copied back to the host
stage before sync. No dependency reinstall or network was needed for the later
Python-only analysis. The 48 original execution inputs and 114 comparison inputs
were checked before and after their respective operations. Every command exited 0.
All guest jobs have ended.

Evidence: `scientific/transport-v33/confirmation-time-recovery/`.

- Shared sourceHash: ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2.
- Frozen recovery plan SHA256: f503f8d4ceb6a08a1f44de57375fd78253808655760eabe9ebde3b902495db99.
- Frozen48-input map SHA256: 20395b1c570f0bc2b95f8cb7510ce61114bafd9da2f2bc686835be557f1a930c.
- Frozen baseline10-file seal: 123857036e161c84211d8e98cecdcb4b27caa5f283a2732008f79d09e23ac722.
- Frozen comparison source SHA256: ec217d34335b0401ca3c109971e8860a87c643dcf726d09ce2e54fb2f23ed67d.
- Checked114-input comparison map SHA256: 2e2457db390f343f129cf964737d22e17056500a5d0a2284729c0416649545c3.
- Completed status SHA256: bd3e327f213a533e69b8d33452788d774411c3d7cde7b93f3deaec35645d2045.
- Frozen comparison output SHA256: de76d042bdb80bfb1c28b95ac5dde9ba8a68b1945a4a1f6c57f6acbed31af17f.
- Post-completion PRNG counter output SHA256: 2b85a7de776ffe8e6d322d09fd5696a5981e62a735e973f8eadc3e905508c29b.

No full application build, browser observation, confidence-coverage validation,
continuum transport bound or real-device validation is claimed by this report.
Root owns integrated acceptance, any subsequent source changes and deployment.
