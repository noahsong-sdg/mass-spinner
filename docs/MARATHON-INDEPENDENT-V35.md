# Independent Marathon physics audit, v35

**Final selected-case status: PASS after a separately declared source-placement
correction. Original strict spatial results: FAIL and preserved.** This is
numerical verification of conditional models, not measured LiT/Marathon validation.

The original prospective protocol is unchanged at
`scientific/marathon-v35/independent/PROTOCOL-BEFORE-OUTPUTS.md` (SHA256
`4a81cb5e09143c6c80376337b244099501d76a4f8500fd2229a0f251719a5dea`).
Plans, pre-execution amendment, exact source maps, raw failures and all outcomes
remain in that independent evidence directory.

## Final checks

Final coupling SHA256:
`a1f3c55e530a0cb125d0eb5bc43b48419e07009fdafbb888b4df68412fd35900`.

| Independent check | Result |
|---|---|
| Original independent limits, including material, neutron, pulse and inventories | 14/14 PASS |
| Independent interface three-node, exact two-cell BE and steady-contact oracles | 3/3 PASS |
| Separate reviewer's stress tests, rerun on final source | 7/7 PASS |
| Strict `tsc --noEmit` | PASS |
| Final frozen diagnostic matrix | 14 cases complete, all 5 comparisons PASS |
| Input hashes before/after execution | 118 inputs match |
| Final vs first blind interface candidate | All 14 full numerical JSON results exactly equal, excluding changed assumptions text |

Execution was offline in a copied-source Apple safe-dev VM, without home,
credential, signing-key, SSH-agent or control-socket mounts. Parent owns the
complete app build, deployment and browser checks; they are outside this report.

## Demonstrated defects and fixes

| Problem and technical cause | Plain explanation | Fix and reason for choosing it |
|---|---|---|
| Far-field neutron cosine rounded to one; `sqrt(1-mu²)` erased the ray angle and lateral escape. Actual absorption .63212056 vs independent .35263829 in the declared extreme geometry. | Almost-parallel rays became exactly parallel. | Retain the cosine deficit and evaluate `sqrt(delta*(2-delta))`. This fixes cancellation without restricting supported geometry. Actual red and green snapshots retained. |
| A subnormal nuclear scale underflowed after multiplication by tolerance; identical zero event channels produced `0/0`, rejecting every step. | “Nothing changed” was treated as undefined error. | Identical channels contribute zero error; a dimensioned fully-loaded entrance-hazard reference scales fuel created later by renewal. This avoids a fictitious unit floor. Beam-off/no-fuel/new-fuel regressions pass. |
| Conserved saturated occupancy exceeded one by floating-point roundoff, triggering the material domain check. | A physically full cell appeared microscopically overfull. | Admit only `64*EPSILON*depthCells` raw packing residual, record it, and adapt stopping composition within that bound. Raw populations/ledgers remain unchanged; real overfill still rejects. |
| All surviving beam energy was spread in the first backing cell; refining that cell moved the heating centroid. | Improving the mesh moved the heater, changing temperature and Arrhenius release. | Explicit zero-range backing-side interface source, derived below. It removes the moving location within a declared closure; no unsupported stopping range is invented. |

A shadowed-variable temporal-dead-zone issue in the first packing patch was
caught statically and corrected before execution; it is not an observed runtime
red. Actual neutron, zero-channel and packing red snapshots remain sealed.

## Source-placement derivation and controlled localization

The adopted model explicitly deposits surviving beam energy at a massless face
on the **backing side** of the film/contact interface. It is a zero-range
approximation, not a measured implantation depth. With
`RL=halfFilm/kFilm+contactResistance`, `RR=halfBack/kBack`, eliminate face Ts from

`Q=(Ts-TL)/RL+(Ts-TR)/RR`.

The cell conductance remains `1/(RL+RR)`; added sources are
`QL=Q*RR/(RL+RR)`, `QR=Q*RL/(RL+RR)`. They are nonnegative and sum to Q. Contact
belongs in RL because of the specified source side. Independent tests solve
the original face equations, a direct two-by-two backward-Euler system and a
steady insulated-film/contact/coolant limit.

The controlled old-source replay varied backing and film meshes separately.
Only backing refinement reproduced the large error, identifying the moving
backing source as the observed failure's cause. The face correction is the
smallest conservative change for this declared closure. A measured finite-range
backing model would be preferable once material/range data are available.

## Strict convergence gates: original failures and corrected results

Budgets: neutron/heat relative change `.002`, mean species-fraction absolute
change `.0002`, common physical probe temperature change `.1 K`. Full inputs
were frozen before execution in `joint-plan.json` and its pre-execution backing
amendment. The separate interface diagnostic was also frozen before outputs.

| Source / comparison (film/back cells) | Neutron relative | Population absolute | Temperature K | Verdict |
|---|---:|---:|---:|---|
| Original 4/2→8/4 | .0012109062 | .0022896778 | 1.0727904 | **FAIL** |
| Original 8/4→16/8 | .0006224171 | .0011720942 | .5364125 | **FAIL** |
| Original fixed film8, backing4→8 | .0006172434 | .0011724135 | .5364083 | **FAIL** |
| Original fixed backing8, film8→16 | .0000051705 | .0000003193 | .0000190 | PASS |
| Interface 4/2→8/4 | .0000022925 | .0000006085 | .0000592 | PASS |
| Interface 8/4→16/8 | .0000018472 | .0000019602 | .0000256 | PASS |
| Interface fixed film8, backing4→8 | .0000000657 | .0000022766 | .0000074 | PASS |
| Interface fixed backing8, film8→16 | .0000019129 | .0000003165 | .0000193 | PASS |

Deposited heat passes all listed comparisons. Independent T, D, projectile,
packing, beam+nuclear energy and thermal ledgers pass at every returned state.
Original 10-case studies and all old/new 14-case diagnostic outputs remain.

Maximum-step-cap comparisons pass, but adaptivity already chooses smaller
steps: this is cap-insensitivity, not a temporal-order measurement. Independent
thermal exponential/cosine tests check temporal/spatial convergence separately.
The no-beam uniform release/renewal limit has an independent scalar oracle;
no unavailable closed-form beam solution is counted as passing. These finite
resolution checks do not bound continuum bias or certify every slider setting.

## Existing-code material evidence

A frozen independent parser checked raw RustBCA records before producer readout.
The original campaign's arithmetic passed, but 100/500 keV D exceeded its omitted
`LOW_ENERGY_NONLOCAL` mode's stated domain. Those eight cases remain unsupported
controls. A separately frozen rerun changed only the explicit `INTERPOLATED`
mode. Independently compared all 12 decks; binary, commit and Cargo lock match.

Corrected blind result: all 12 incident-accounting and 6 original DKW sampling
checks PASS. Later producer/public comparison independently verified all counts,
Li/T sputtering, moments, CDF values, 1536 histogram bins and six supplemental
exact empirical-CDF suprema (computed by a separate sorted merge). Public six
N=2048 cases preserve all incident ions in their denominator.

The 0–12 µm display grid and complete-CDF diagnostics are explicitly post-hoc;
the original 0–4 µm gates are unchanged. The 500 keV fixed-grid pass is
tail-unresolved because deposits lie beyond that grid. The supplemental full-CDF
check does not retroactively become a prospective gate.

The unchanged upstream smoke exits successfully but its historical numeric
reference **fails**: expected `.016531847238600884 µm`, observed
`.01534020511611836 µm`. The mismatch is retained without an invented cause.

The compiled Geant4 fixture has 20 upstream atomic rows. Independent tests check
Li7, D and T at five energies and four endpoint/vacancy/mixture compositions per
energy. This verifies adapted function-body arithmetic, not a full Geant4 run.
RustBCA uses different stopping/scattering physics; profiles do not establish
code agreement, measured LiT retention or finite-film transmission.

## Physical boundaries that remain

- Thermal, diffusion, release, permeation and renewal coefficients are assumed
  scenarios, not calibrated LiT/Marathon material laws. Common D/T/vacancy
  diffusion is a fixed-site closure.
- Renewal exchanges hydrogen occupancy at fixed lithium sites; it does not
  model lithium deposition/erosion, changing thickness, microstructure or damage.
- Surviving beam energy is absorbed under the explicit interface assumption.
  Unretained D is chemical inventory, not a claim its kinetic energy escaped.
- Beam/nuclear/thermal ledgers close under the fixed-host convention. Released
  and renewed isotope enthalpy and chemical/binding energies are omitted;
  total open-system thermochemical energy is not validated.
- 1D conduction excludes lateral hot spots, mechanical stress and failure.
  First-flight neutron transport excludes multiple scattering, spectrum
  evolution, activation and DPA. Other reviewers own OpenMC/NNDC record checks.

## Seals and exact final commands

Paths are relative to `scientific/marathon-v35/independent/`.

| Leaf | SHA256 of its manifest |
|---|---|
| `final-original-matrix` | `d9ac98a32e3af72dc35b9b733a85901361f3cdaf9a7f0de14a92dea478f0ba44` |
| `interface-first` | `ddd29331f2f362657ddef43e1de89ef3836fd129f888cd88aa758069b2935d56` |
| `interface-clean-rebase` | `fbf74bf8ac710e06099df15b690cb293715b37784a9291084d8114e12cafca3a` |
| `bca-first` | `895146144f6dd326990d810a61c653107fa099a13f68b0cc469531e3aed89dcb` |
| `bca-interpolated` | `7a33d8671f39e2b49ef417a94ceb1fc82e369f8ff604790ae47acc0afe3ad2d7` |
| `bca-public-final` | `ef09b50d8b4a0a48a5cba7f3688638959b354aeba63556508aa867496193d4f8` |

Checked public implantation JSON SHA256:
`19c136cb51719c76e7400700efef6ea3858da43bba8cc123fc9fa5086e19af24`.
Producer readout SHA256:
`a92cc10e26781df32f1d6110654fa8df0aff24c9e8a72320330713115d35c23b`.

```
node --import tsx --test tests/interface-independent.test.ts tests/marathon35-independent.test.ts tests/coupled-target-adversarial-v35.test.ts
# 24 passed, 0 failed
./node_modules/.bin/tsc --noEmit
# exit 0
node --import tsx diagnostic-study.ts candidate-zero-range-interface-source
# 14 cases complete, all 5 comparisons pass
```

The three-test interface file's repository name is
`tests/marathon35-interface-independent.test.ts` (guest name above).
Final VM: `safe-dev-b61089f1beb1421a`; BCA: `safe-dev-1797e6523a99573b`;
original matrix: `safe-dev-3f3ab3cc9e20087b`.
Two failed harness attempts are preserved: a missing copied old BCA result and
an obsolete diagnostic output path/incorrect zero-energy normalization. Both
were fixed at the harness boundary with scientific gates unchanged.
