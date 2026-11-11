# Independent high-particle timestep study, v33

8 November 2026. The original prospective study was frozen before execution.
Seed101 reached its fixed 800-second timeout (800.012086 seconds subprocess wall
time). Root then explicitly stopped this impractical execution schedule: seed202
was interrupted, and seeds303/404/505/606 never started. All six numerical results
remain UNKNOWN. No complete raw result exists. The separately prepared recovery
plan below has not started. This is not a transport qualification certificate.

Update: the separately authorized recovery has now completed all six runs.
See [the recovery report](TRANSPORT-TIMESTEP-RECOVERY-V33.md), including the newly
demonstrated PRNG-stream limitation. The prepared/not-started states below refer
to this original stopped checkpoint; its sealed inputs remain intact.

## Executed experiment

The experiment uses the uninstrumented production `executeSeed` and
`simulateDoublewell(config, 'research')` path. Six independent whole runs use
seeds 101, 202, 303, 404, 505 and 606. Each run has 32768 representatives per
species, nr12/nz3 source-fitted annular collision cells, 50 ns timestep and the
complete 200 µs horizon. All other settings match the earlier v33 pilot's first
level, including the same source inventory, fields and Nanbu angular law.

Root coordinates a separately frozen 100 ns batch at the same N and mesh. That
is the matched timestep contrast; this 50 ns batch alone cannot establish a
convergence difference. No physical coefficients, equations, acceptance budgets
or observation formulas were edited by this reviewer.

The explicit offline research profile admits this 262.144-million declared
particle-step workload under its 320-million resource ceiling. Browser admission
retains its 80-million ceiling. The numerical acceptance budgets are unchanged:
0.001 raw normalized angular residual and 0.01 sampled unresolved exposure, with
six independent seeds for paired observable inference. Runtime is independently
bounded at 4800 seconds for the batch and 800 seconds per run. Timeout, error and
unrun cases remain UNKNOWN and cannot fill a complete accepted batch.

## Frozen inputs and isolation

Evidence directory: `scientific/transport-v33/confirmation-time/`.

- Plan SHA256: a04ebb8eefe1212ab7fe975c937c35f8c3e41031d82eebab3e534110a6f146bd.
- Shared 45-file source-map SHA256: 5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18.
- Run sourceHash: ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2.
- Complete input-map SHA256: f5bde573364632b654eff39bd7b95c9e5c50c0e2f19a8ebfa9e1661a5b72b9a3.
- Independent analysis SHA256, frozen before the first result: 5dd389bfdfca482298827e5444e6fafa6e8b5c9e95fb0bc24e1e6500d47afe8e.

The stage is `/tmp/mass-spinner-transport33-timestep`; its distinct Apple guest
is `safe-dev-1e115d59d0d5ea6e`. Source is a copy, without home directories,
credentials, SSH agents or control sockets. Online execution is limited to locked
`npm ci --ignore-scripts`; simulation and independent analysis run offline. No
project execution occurs on the host. Source and complete input maps are verified
before and after the bounded batch; production source is also checked per run.

Commands use `/Users/noahs/.local/bin/safe-dev -C` followed by that stage:

```
init
run --online -- npm ci --ignore-scripts
run -- python3 run-study.py plan.json
```

## Independent checks

The frozen independent standard-library analysis imports no production or other
review code. It is prepared to validate exact case and source identity; species inventory and timed
collector membership at every saved history; raw angular momentum including all
exits at their actual times; active-population-weighted trapezoidal unresolved
exposure; and survivor CDF density inventory. It compares saved diagnostics with
those reconstructed quantities at a fixed absolute budget of 2e-13.

That numerical analysis was not executed for the stopped campaign because no
complete raw record exists. Its intended checks concern saved-record consistency.
They do not reconstruct unsaved local
cells, bound unsampled excursions, prove continuum accuracy or validate a real
device. Root owns integrated paired inference, full application checks and any
deployment.

## Explicit stop and separately prospective recovery

The trusted safe-dev launcher has no stop subcommand. Read-only container
inventory identified the single owned active VM by all of container ID, mounted
volume and executable/arguments. Root authorized a macOS-only control exception
to stop exactly container `997b5c27-5da1-4154-a995-926a1900f0fa`, whose only work
volume was `safe-dev-1e115d59d0d5ea6e` and command was
`python3 run-study.py plan.json`. The exact `container stop` exited 0; its safe-dev
campaign launcher exited 137. No other VM was targeted and no sandbox setting was
changed. Export occurred before any source sync:
`/tmp/mass-spinner-transport33-timestep-interrupted-export`.

The original `results/status.json` remains unchanged, retaining seed101 TIMEOUT.
`execution-stop.json` separately accounts for the active interrupted seed and four
unrun seeds from the observed request/log/result files. Neither cancellation nor
the wall-clock timeout is evidence of numerical instability or physical bias.

Root authorized preparation of a distinct recovery plan, without starting it:
same six seeds, exact physical configuration, source map, horizon, 50 ns timestep
and numerical gates, with 1200 seconds per run and 7200 seconds combined. No more
than one heavy Mass Spinner simulation VM may run at once; root must first confirm
that the other current batches have ended. Other chats' VMs are outside this
agent's scope. Preparation neither replaces the original plan nor repairs its
missing-batch outcome.

- Recovery plan SHA256: f503f8d4ceb6a08a1f44de57375fd78253808655760eabe9ebde3b902495db99.
- Recovery input-map SHA256: 20395b1c570f0bc2b95f8cb7510ce61114bafd9da2f2bc686835be557f1a930c.
- Shared source-map SHA256 remains 5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18.
- Prepared host stage: `/tmp/mass-spinner-transport33-timestep-recovery`.
- State: prepared, not initialized, not executed.
