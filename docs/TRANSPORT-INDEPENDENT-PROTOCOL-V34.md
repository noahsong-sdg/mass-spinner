# Independent v34 protocol, frozen before science

Reviewer: transport33_physics. Prepared after final v33 was sealed and before
the first v34 physical campaign case. No v34 numerical outcomes were inspected.

The independent analyzer is byte-for-byte the v33 stdlib implementation, SHA
`8bd1a935ee7de542b2fcebc24d254d65b92a806fa03df1720dcfd5c3e877ec07`.
Its ledger reconstruction, intervals, six-seed minimum, zero-spread guard,
roundoff criteria and all 240 acceptance gates remain unchanged. The new
wrapper verifies explicit Philox version/config/log provenance before invoking
that analyzer. Missing, null or stale complete-record RNG headers cannot enter
this cohort. The nested raw physics needs no invented separate RNG header.

Prospective pins verified in the isolated copy:

- Plan: `5d73f77d31f9052097c1a9097468e545a31791b5896b344556696bb64abec8d9`.
- Source map: `ceaf1bb94f3a1ce4f37aaef128c7cf057c0d6cf73a1291d6d5bafc6b38cee9a0`.
- Combined 46-file source: `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`.
- Generated analysis protocol: `223bac475141e6a99d02268891af2af2a2f7fe713f795cddb329919e51b87e70`.
- Generated RNG/cohort pins: `0f0a86154344e32d304e79c3e554fdbf113015eaf63408067ceb3e331714d4e2`.

The preparation script verifies every mapped file and exact agreement with the
old physical/numerical configurations, tolerances, comparisons and six seeds;
the sole added selector is randomSource='philox4x32-10-u32-v1'. Cohort identity
and provenance hashes change. No historical v33 output can substitute for a
fresh run. All 30 outcomes must be terminal before the final analysis, with
failed cases retained as UNKNOWN and one contribution per level/seed.

Application source assigns exact uint32 key=(seed,phase), phase0 for
initialization and phase1 for collisions. The 12 distinct replicate/phase keys
are injective. Reusing a seed/key between refinement levels is intentional for
paired comparisons. Source-derived bounds, not measured draw counters, are
recorded: maximum 589824 initialization uniforms and 1048838144 collision
uniforms, or 262209536 blocks, in the fine-step level. Initial counters are zero;
this lies far below 128-bit counter exhaustion. Correct key assignment removes
the demonstrated short-state phase-overlap mechanism; it does not prove output
independence or validate the collision physics.

All preparation ran offline in the distinct safe-dev guest
`safe-dev-9b87390ab6daf83a`, stage
`/tmp/mass-spinner-confirmation-independent-v34`. Syntax checks pass for both
new wrappers and the unchanged analyzer. prepare-cohort.py exits 0, validates
all 46 files and writes the two pinned JSONs above. Its first export is
`/tmp/mass-spinner-confirmation-independent-v34-prospective-export`, preserved
before any campaign output or final catalog exists. No dependency installation,
physical simulation, production import or host project execution occurred.

Canonical preparation is `scientific/transport-v34/independent-preparation/`;
the complete tested source/pin snapshot is `independent-prospective/` beside it.
The prospective seal is `scientific/transport-v34/independent-prospective-SHA256SUMS`.
The final independent-first export must precede receiving the production
reference; retain reference comparison separately. The unresolved physical
coverage, finite-cell torque and sampled-domain questions remain open regardless
of RNG or arithmetic checks.
