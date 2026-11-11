# Independent v34 stream and qualification-contract review

The reviewed Philox adaptation removes the demonstrated v33 input-stream overlap mechanism. The prospective campaign remains a transport experiment, not a qualification result. This review found no blocking defect in the narrow RNG/provenance adaptation. No physical simulations were run for this review, and no active campaign output was inspected.

## Root cause and choice of fix

The v33 Mulberry32 generator advances one 32-bit additive state cycle. Different seeds and the initialization/collision XOR seeds merely select different positions on that cycle. Recorded pair/shuffle counters proved overlap for completed v33 runs; the independent-seed interpretation of their uncertainty intervals was unsupported. In simple terms, several supposed separate runs reused long stretches of the same random input. This established input overlap, not measured correlation between outputs, and did not establish the cause of any physical convergence difference.

The v34 change uses the established Random123 Philox4x32-10 algorithm with the exact key tuple `(seed, streamTag)`, initialization tag 0, collision tag 1, and a 128-bit counter. It preserves the existing uniform mapping and Gaussian/scattering transformations. This addresses the demonstrated cause directly, rather than selecting convenient new offsets on the same short cycle. Reusing a key across resolution levels is intentional common randomness for paired comparisons. Distinct keys do not imply that individual output words never coincide or provide a mathematical proof of statistical independence.

The source is adapted from [official Random123](https://github.com/DEShawResearch/random123/tree/9545ff6413f258be2f04c1d319d99aaef7521150), with its BSD notice. The [Random123 paper](https://www.thesalmons.org/john/random123/papers/random123sc11.pdf) supplies the published counter/key design and statistical evidence. This review checks the local implementation and partition, not a new statistical qualification of Philox.

## Exact reviewed snapshot and execution

Prospective plan SHA-256: `5d73f77d31f9052097c1a9097468e545a31791b5896b344556696bb64abec8d9`.

46-file source-map file SHA-256: `ceaf1bb94f3a1ce4f37aaef128c7cf057c0d6cf73a1291d6d5bafc6b38cee9a0`.

Serialized source-map identity: `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`.

Reviewed source hashes:

| File | SHA-256 |
| --- | --- |
| `src/random-stream.ts` | `e12ba434ee995c3125c9c0173c008c30cf69cd492c97fe48b9eed8106bd7c625` |
| `src/doublewell-dynamics.ts` | `e00c505ba6b63dc3517aa1593b1bf27f0af21cf9026de5f0b7bba27b29ec413d` |
| `src/convergence.ts` | `f9aea06f1a63160b84a41536a86ce9a37a6ff45f2f97f875c40e9cee27c90465` |

Independent stage `/tmp/mass-spinner-transport34-gates`, guest `safe-dev-9366affc665ccbaa`. Dependencies were installed in that guest using `npm ci --ignore-scripts`; the bounded check ran offline using `python3 run-review.py`, which invokes `node_modules/.bin/tsx --test review.test.ts` with a 180-second limit and verifies the 241-input hash map before and after. Input-map SHA-256: `d244f558f7699bafa6f6fc98e7b574f0ec347f16f749bec811dabe69de9ac0f6`.

**Result: 8 tests passed, 0 failed; process exit 0; 0.332 seconds wall time.** No typecheck, build, full suite, statistical-quality battery, or particle trajectory was run by this reviewer. The parent separately reports its full application checks. Evidence was exported to `/tmp/mass-spinner-transport34-gates-final-export` before any guest replacement; the compact evidence is under `scientific/transport-v34/independent-gate-review/`.

## Checks and bounds

1. Compared 192 edge-counter/key blocks against an independent BigInt full-width-product oracle, deliberately different from the production 16-bit limb arithmetic. All blocks matched. All three official Philox4x32-10 known-answer vectors matched.
2. Checked the twelve prospective replicate/domain keys are distinct; checked buffered word order and a 64-bit counter carry against the oracle; checked the final 128-bit block yields four values and then rejects exhaustion rather than repeating.
3. Checked all five prospective configs remain admissible in research mode; removing only the RNG selector yields the exact old configs. Seeds, comparisons, tolerances and execution mode are unchanged. Verified the 46-file serialized source-map identity.
4. Replayed only the scalar time-loop control flow, without particles. Actual loop counts are 2000 at 100 ns and 4000 at 50 ns. Floating-point `ceil(duration/dt)` accounting gives 2001 and 4001 slots, respectively; the bounds below deliberately use the larger count.
5. Checked new defaults explicitly select Philox while persisted absence resolves to legacy Mulberry32. Explicit `null`, coercions, unknown strings, and a null selector in a plan reject. The old path remains available for historical replay, not for a new independent cohort.
6. Used synthetic metadata-only fixtures to check absent legacy headers, invalid/null headers, mismatched RNG header/config, stale source hashes, and execution-mode mismatches. Relabeling fixtures tests identity admission only and supplies no physical evidence.
7. Checked unsupported alignment/orientation comparisons still reject; missing sensitivity coverage and effect-versus-numerical-error requirements remain UNKNOWN. Identical, zero-spread seed outcomes still do not establish equivalence.
8. Recomputed all 78 archived v30 run summaries; the complete pulse, closed and axial summary objects remain deeply identical, including numerical values and verdicts.

Initialization consumes exactly 18 uniforms per representative count N: two species times N ions times three position uniforms and six Gaussian uniforms. For the declared Nanbu law, an occupied cell with n ions consumes at most `(n-1)+2 floor(n/2) <= 2n` uniforms per collision half-step. With at most 2N active ions and two half-steps per physical step, the collision bound is `8 N S` uniforms, or `ceil(2 N S)` counter blocks. Empty/singleton cells and skipped scattering only lower this count. These are source-derived bounds, not measured draw counters.

| Prospective level | Initialization uniforms | Collision uniform upper bound | Collision block upper bound |
| --- | ---: | ---: | ---: |
| N16384, r12, z3, 100 ns | 294912 | 262275072 | 65568768 |
| N32768, r12, z3, 100 ns | 589824 | 524550144 | 131137536 |
| N32768, r12, z3, 50 ns | 589824 | 1048838144 | 262209536 |
| N32768, r12, z9, 100 ns | 589824 | 524550144 | 131137536 |
| N32768, r6, z3, 100 ns | 589824 | 524550144 | 131137536 |

The largest source-derived block budget is below 2^28, far below the 2^128 exhaustion boundary. Distinct seed/domain tuples therefore never reuse the same `(key,counter)` input in this campaign. The common key across levels does not create extra independent replicates; paired analysis must continue to use six replicate seeds.

## Remaining requirements and limitations

No convergence threshold or physical equation changed. The source diff is limited to RNG construction/defaults and persisted identity handling. Existing v33 physical trajectories and their exploratory intervals remain immutable; they cannot be renamed Philox runs or promoted by this source review.

The five-level matrix still cannot certify the complete transport contract. It has no executable mesh-alignment/orientation comparisons, no justified continuum-bias bound for effect-versus-error, and no matched collision-off control for the claimed effect. A finite collection of small refinement differences does not prove the remaining continuum error is bounded. The narrower steps in `docs/TRANSPORT-QUALIFICATION-NEXT-V33.md` remain necessary. The inherited nominal-versus-ceiling particle-work accounting caveat also remains; this campaign is safely below its admitted 320-million budget.

After all 30 new runs are terminal and exported, independent raw angular-momentum accounting, unresolved-exposure reconstruction, domain validity and failure classification are still required. A passing implementation check, publication of the app, and a completed run are separate from transport qualification.
