# Independent material, decay and neutron review

## Result and scope

Seven independent light mathematical regressions pass after three demonstrated
numerical-boundary defects were corrected by their owning agents. No remaining
arithmetic blocker was found in the paths checked below. This is not empirical
LiT validation, a native transport qualification, or visual sign-off.

Reviewed execution paths: geometry controls → Li-site column/thickness/density;
atomic stopping → CSDA domain map; external coating inputs → exact well-mixed
inventory/energy solution → exported ledgers; generic irradiation/cooldown inputs
→ affine decay/reaction network; prospective OpenMC processing/decks → source
normalized response tallies → independent thickness holdouts → response import.
The coupled-depth additions expose geometry and D–T metadata without changing
the pre-existing depth time integrator or interface heat forcing.

## Findings and fixes

1. **Coating rejected its own result — fixed.** The old exact mixture update
   could return `T+D` one floating-point rounding unit above Li capacity; its
   strict next-call comparison then rejected a valid recurrence. In plain terms,
   rounding made a full coating look infinitesimally overfilled. Independently
   reproduced at step 5 with `p=.2`, `e=.3`, `dt=.01`, initial
   `N=1,T=.37,D=.63,E=50`: the rejected state was
   `N=.995,T=.36586722125,D=.6291327787500001,E=51.238768750000006`.
   Current `src/lithium-coating.ts:39–44,77–82` admits and reports at most 64ε
   relative packing excess while preserving raw isotope columns and ledgers.
   Four 200-step trajectories and their one-step equivalents now pass. This
   bounded admission contract avoids projection/normalization, which would hide
   conservation errors, and still rejects genuine material excess.

2. **Tiny coating export suffered cancellation — fixed.** Previously the
   outgoing isotope amount was the difference of much larger input/output
   inventories. For `N=1,T=.7,D=0,p=1000,e=1e-30,dt=10,finT=.5`, the actual
   isolated result was `erodedT=-9.094947017729282e-13`; the physical outgoing
   integral is positive, approximately `5.001842088e-30`. This is about `1.8e-16` of
   the final T inventory, not a large physical loading bias. It still violates
   the exported-count interpretation. The owner now evaluates positive analytic
   initial/incoming-mixture erosion weights at `src/lithium-coating.ts:61–72`,
   with cancellation-safe remainders at lines 18–29. The opposite tiny-deposition
   limit is independently tested too: `p=1e-30,e=.1,T0=0,finT=1,dt=1` gives
   positive export about `5.175535908e-32`. This catches the tempting partial fix
   `B=e*dt-A`, which would itself erase that small incoming contribution.
   No population or export clipping is used. Stable analytic evaluation was
   chosen over arbitrary floors or an approximate flux quadrature.

3. **Finite decay nodes could have a nonfinite inventory sum — fixed.** An
   initial stable two-node inventory `[1e308,1e308]` has individually finite
   entries but an overflowing sum. The original return expression would form
   `Infinity-Infinity` in its conservation residual. In plain terms, checking
   each bucket did not ensure the whole inventory could be represented.
   `src/decay-network.ts:29–30,48–50,69–71` now checks aggregate initial/source
   values and the final residual; activity overflow is also rejected. The
   independent overflow regression passes. Rejecting an unrepresentable domain
   is preferable to returning NaN, silently capping inventories, or redefining
   conservation with a hidden scaling convention.

An adjacent material-UI source finding was also sent to the owner: raw T-slider
values ignored a disabled target and lacked a target-toggle refresh. Current
`src/material-realism-ui.js:29,56,68` derives T from the accepted source contract
and listens for that toggle. This closure was source-checked; this reviewer did
not execute the material UI or observe its deployed behavior.

## Equations, units and evidence boundaries

- Geometry: `nLi=N/d` is dimensionally sites/m³. Linked mode preserves the edited
  column or width and derives the other. Number density is a Li-host-site
  density, not total Li-plus-hydrogen atom density. No density calibration or
  realistic material preset follows from this identity.
- Coating: `N'=p-e`, `X'=p*xIn-e*X/N`, so `f'=p*(xIn-f)/N`. The implemented exact
  solution is consistent for deposition, erosion, balanced washout and mixed
  fluxes. Its positive export weights are `A=e∫w dt`, `B=e∫(1-w)dt`, where
  `w=exp[-p∫dt/N]`; hence both are nonnegative and `A+B=e*dt`. Sensible energy
  follows the same advective equation and is relative to the supplied reference
  temperature; its signed value need not be positive. Temperature remains
  positive. This is an **external** well-mixed coating balance, not a moving
  interface coupled to stopping, fusion, conduction or diffusion. The existing
  fixed-host renewal process must not be described as Li deposition.
- Stopping: `dN/dE=1/S(E)` has the correct units with `S` in keV·m². The CSDA map
  never supplies a below-fit stopping law. Independent checks cover zero film,
  the exact lower fit edge, the full supported column, and unresolved tails.
  Panel differences are numerical diagnostics, not rigorous error bounds or
  reflection/transmission/retention laws. The live stopped-tail guard remains.
- Reactions: `reactionOutput` correctly makes the preserved generic scalar
  names explicitly D–T. D–D competing hazards/products remain omitted. The
  helper metadata does not make D-rich output a total-fusion prediction.
- Decay: the network matrix has nonnegative off-diagonal transitions, explicit
  lost inventory and a constant affine-source reservoir. Uniformization and
  scaling/squaring preserve nonnegative arithmetic without clipping. At the
  admitted `q*t=1e6` closed two-node cycle, the independent result was
  `[59999999.99804838,39999999.9986989]` versus `[6e7,4e7]`; inventory residual
  `-.0032527148723602295` is `3.25e-11` of the initial `1e8` atoms, within the
  predeclared `2e-9` relative check. This verifies that witness, not a formal
  error bound for every possible 16-node network. The cap now says bounded
  numerical domain rather than universal qualification.

The prospective neutron study's units and controls were independently traced.
`0.06 atom/b-cm = 6e28 nuclei/m³`; geometry converts m to cm consistently. Its
first-absorption control integrates finite-cylinder side escape over isotropic
birth directions, not a slab-only attenuation. Tracklength `absorption` and
`total` are source-normalized expected reaction counts; **total can exceed one**
and must not be called a first-hit probability. The parser retains weighted
independent Monte Carlo SE and observed holdout residuals separately. The owner
also added finite scaled-rate admission in `src/neutron-response.ts:61–64`.

The prepared H-1 response grid fixes a 14.1 MeV isotropic point source, free H-1,
293.6 K, density, radius/front/outer boundary, and only varies thickness. Four
midpoint holdouts test linear interpolation under the frozen absolute budgets
plus four combined SE. They do **not** establish a uniform interpolation bound,
source-spectrum/geometry generality, LiT calibration or detector validity. The
processing checks compare raw ENDF and processed fast-energy cross sections;
they do not experimentally validate the nuclear data.

The finite-film RustBCA source was reviewed, not run: retained upstream
`output.rs:400–408` writes incident-projectile nuclear/electronic transfers in
columns 2/3, matching the prepared parser. The planned energy gate is correctly
limited to projectile transfers plus outgoing/unresolved projectile energy; it
is not a full recoil/binding/assembly heat ledger. Its Hoeffding union budget
does not require independence between same-seed coarse/fine runs. The owner
removed unsupported wording that called those pairs independent.

At this review's close, this reviewer has **not** executed or independently
observed the new OpenMC response study, CRAM oracle, or finite-film campaign.
Prepared scripts and passing scalar tests must not be reported as completed
native qualification. The owning agents/root task retain those gates.

Subsequent finite-film raw verification is recorded separately in
`docs/FINITE-FILM-INDEPENDENT-V38.md`; it updates that campaign's observation
status while preserving the empirical-calibration and live-kernel limitations.

## Exact independent test receipt

Separate Apple safe-dev stage `/private/tmp/mass-spinner-realism-audit-v38`,
volume `safe-dev-5245409e4cfaf740`. Source is copied; no host directory, credential
or control socket was mounted. Initial dependency download used explicit online
`npm ci --ignore-scripts --no-audit --no-fund`. All probes/tests were offline.
After source/test changes, the host stage was explicitly synced with
`sync --replace-guest` and dependencies reinstalled offline from its cache.

Final snapshot: 104 files / 756,278 bytes;
`source_sha256=d7a7b363c10294e92b08c78052c678f7543d3e7c86e2ab739ed61ad57e0f7b4d`.
Command:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-realism-audit-v38 run -- node_modules/.bin/tsx --test tests/independent-realism-v38.test.ts
```

**7 passed, 0 failed**, 113.1 ms reported test duration. Earlier failure was
retained above with its exact state; it was not hidden by relaxing the test.
Final tested relevant SHA-256 values:

```text
bf32b8af09486dcba317b740ec4e2b32fb080e85a28507e5e1dc83d8ae17336a  src/material-realism.ts
db3567ea9e94074194590f10fd94096144b22ae9a85684e7bb869107b37ae62a  src/lithium-coating.ts
6246ef45afe2fc3f16f247455351cf3001878dbedc99364c7d5551c2a29fa021  src/coupled-target.ts
1668b1cf6f20b4227114fd58ad5087f86fca30d6d941146bc88f3279da1f9e7a  src/decay-network.ts
f34c2886ad3d100fbdcb1bc88b1ed1bbfd98b5c2c30bd2f079708351bd966649  src/neutron-response.ts
68f1ebc42a97865488dbfd8c215947993456d04fb16c1a43c54f9dae8bbe9aae  tests/independent-realism-v38.test.ts
```

Source-only follow-up identities, not executed in that snapshot:

```text
c619813a1430744e5eefce5929f8bcd0929ea1ee2090559eef08a8cf0867e052  src/material-realism-ui.js
72117df8401b64883fdd3d54453b5f4c6ba6da6d6f73477cdd602943ae161da2  scientific/neutron-v38/response-study.py
```

No full repository build/typecheck was run by this reviewer; the root task owns
the final combined gate. No deployed browser, GPU, mobile or touch observation
was made, and no alternate route around the managed browser denial was used.
