# v34 RNG integration and backward-compatibility review

2026-11-08. **Private candidate verified; canonical source not changed.** No heavy physical study was run. Candidate: `/tmp/mass-spinner-rng-v34-integration`; tested export: `/tmp/mass-spinner-rng-v34-integration-final-export`.

## Problem, mechanism and chosen fix

The original Mulberry generator advances one uint32 state by an odd constant. Consequently all seeds select phases of the same 2³²-state cycle. The coordinator's separate gates audit reports overlapping consumed collision-input segments in completed v33 runs; this reviewer did not independently reconstruct those draw counts. Overlapping inputs undermine an assumed independent-seed sampling design, without by themselves demonstrating covariance of physical outputs.

In simple terms, different labels started runs at different places on one relatively short tape. A larger set of seed labels alone does not repair that construction.

The candidate uses the Random123 **Philox4x32-10** adapter with full version `philox4x32-10-u32-v1`: key words `(seed, 0)` for initialization and `(seed, 1)` for collisions; four outputs per 128-bit counter block; each uint32 output divided by 2³². This removes the demonstrated phase-seeding construction. It does not mathematically prove statistical independence or forbid repeated individual random values.

The [original Random123 paper](https://www.thesalmons.org/john/random123/papers/random123sc11.pdf) motivates keyed counter streams for parallel simulation. Authoritative vectors and header are pinned to [Random123 commit 9545ff6413f258be2f04c1d319d99aaef7521150](https://github.com/DEShawResearch/random123/tree/9545ff6413f258be2f04c1d319d99aaef7521150). The adapter retains the complete BSD notice. No runtime package was added. This is a small, reproducible replacement of stream generation; changing scattering laws, physical parameters or numerical gates would not address the identified input-stream construction.

## Execution and persistence contract

Only two existing production modules change, alongside the new adapter:

- `doublewell-dynamics.ts` adds an optional typed selector and a shared resolver. **Only undefined** resolves to historical `mulberry32-v1`; explicit null and unknown values are invalid. The new default explicitly selects Philox. Legacy arithmetic, seed XOR, ordering and random transforms remain exact in the legacy branch. Philox uses separate key tags without XOR.
- `convergence.ts` validates each plan level's RNG selector without adding unrelated full validation. New valid runs record the resolved selector in a separate optional `SeedRun.randomSource` header. Configurations remain unmodified. Invalid selectors preserve the error-return API and cannot claim an executed generator.
- Persisted run headers must resolve to the source in their exact stored config. An omitted old header resolves to legacy; therefore an old record relabelled with a Philox config is rejected. Null/unknown headers are rejected as malformed, while old missing headers remain readable. Existing execution-mode, source-hash and config checks remain active.

UI `doublewellConfig` spreads the new default; the worker forwards that complete config unchanged. Offline `executeSeed` clones the declared config without merging defaults. Existing config-comparison guards continue rejecting RNG changes disguised as timestep, particle, spatial or method refinements. Historical records are never rewritten or promoted to Philox evidence.

## Independent adapter and compatibility checks

The exact module tested is `e12ba434ee995c3125c9c0173c008c30cf69cd492c97fe48b9eed8106bd7c625`. Independent tests use BigInt whole-product arithmetic, rather than the adapter's split-word multiplication. All **10,000 additional blocks** and **three official ten-round known-answer vectors** agree exactly. Counter carries across 32/64/96 bits, final-block exhaustion, block word order, copied counter inputs, uint32 bounds, null and sparse-array rejection also pass. Exhaustion permits the final four outputs and then throws instead of wrapping.

Original-source regressions produce **3 PASS / 5 expected FAIL**; the candidate passes **31/31 targeted tests**, plus `npx tsc --noEmit`. Tests cover legacy omitted/explicit trajectories, complete raw run fields, new headers, stale and relabelled records, malformed selectors, mode preservation, refinement restrictions, and existing convergence/CLI behavior. Full native result comparison against the retained original engine is preserved as scientific evidence. The portable regression instead uses an 84 KiB frozen fixture, avoiding a second engine in shipped tests.

All **78 historical runs** retain the **three archived pulse/closed/axial family summaries exactly**, including every numerical statistic and classification. This is compatibility evidence; it does not restore independent-seed inference to those old runs.

## Snapshot, handoff and limits

All code execution and installation used dedicated Apple safe-dev guest `safe-dev-5ceeda9ec1e982e8`. Networking was enabled only for `npm ci --ignore-scripts`. All **449 frozen input hashes** were checked before/after the final run and against the final guest export and host stage. Earlier red/green and historical-test exports were retained before each replacement sync. No guest-only valuable edits were discarded.

Durable evidence: `scientific/transport-v34/rng-integration-review/`, including complete tested inputs, logs, source map, patch and the seven small portable apply files under `candidate/`. Production candidate hashes:

| Module | SHA-256 |
| --- | --- |
| doublewell-dynamics.ts | e00c505ba6b63dc3517aa1593b1bf27f0af21cf9026de5f0b7bba27b29ec413d |
| convergence.ts | f9aea06f1a63160b84a41536a86ce9a37a6ff45f2f97f875c40e9cee27c90465 |
| random-stream.ts | e12ba434ee995c3125c9c0173c008c30cf69cd492c97fe48b9eed8106bd7c625 |

The parent owns canonical application after v33 is sealed, the integrated full test/build/typecheck gate, browser checks and verification that the license survives bundling. Fresh transport studies must explicitly declare Philox and preserve their new source identity. No transport convergence, continuum validity or experimental result is established by this RNG review. No job remains running from this reviewer.
