# PRNG stream audit, v33

8 November 2026. Read-only source, primary-source literature and bounded integer/
completed-counter audit. No physical simulation, active h50 artifact inspection,
production edit, seed change or gate change.

## Demonstrated problem and statistical implication

The six nominal replicate seeds do not select disjoint random streams at these
workloads. Exact shared uniform segments are proven from saved counters, without
assuming nonzero scattering variance. This weakens the justification for treating
replicates as independent. Retain the existing calculated intervals/verdicts as
exploratory and conditional on their statistical assumptions; their advertised
coverage has not been established for this cohort.

This does **not** prove correlated transport outputs, quantify confidence-interval
miscoverage, identify the cause of a convergence discrepancy, or invalidate the
saved deterministic physics/ledger values. Shared uniforms occur at different
physical times and feed different nonlinear trajectories. Output covariance and
effect on estimator coverage remain unmeasured. The distinction matters: a real
input-stream defect has been found, not a measured collision-law error.

## Exact cycle and overlap proof

`doublewell-dynamics.ts:27–28` advances the sole 32-bit state by
C=0x6d2b79f5 modulo M=2^32, then applies a fixed output mixer. Since C is odd,
gcd(C,M)=1: the state visits all M values before repeating. Its modular inverse
is 3696798301. Any two seeded generators are therefore phase shifts of the same
state/output sequence; XOR with 0x9e3779b9 selects another phase, not another
keyed stream. State-cycle length alone does not establish output uniformity or
statistical quality. The author's original implementation and later warning
about missing output words corroborate the design's limitations; no exhaustive
output-quality test was performed here. [Author's code and commentary](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c)

For start states a,b the forward offset is `(b-a)*C_inverse mod M`.
Collision seed 505 precedes collision seed 303 by 97073982 calls; collision seed
101 precedes collision seed 404 by 112799085 calls. Eight mixer outputs after an
algebraic jump match exactly; there was no long random-draw benchmark.

For a cell with n≥2 representatives, Fisher–Yates consumes n−1 uniforms, even
when every collision has zero relative velocity or underflowed variance. With
p=floor(n/2), `n−1≥p` and `n−1≥2p−1`. Over S full steps and at most G fixed
cells in each of two collision half-steps, actual collision-generator calls obey
`D≥max(P, 2P−2SG)`, where P is the stored total pair count. Singleton cells need
no special assumption: p=0 and their actual shuffle count is zero.

The bounded checker reads exactly the 24 completed non-h50 artifacts selected
by the recovered-spatial catalog, verifies their SHA256s, and checks
`activeIonSteps=2*pairs+unpairedIonSteps` in every record. Their exact binary64
outer time loop has S=2000; conservative G is (nr+1)(nz+1), allowing both source
interfaces even if one coincides with a regular face. No scattering draws are
needed for this lower bound.

If earlier stream A has D_A≥L_A calls and later stream B starts d calls ahead,
their common uniform prefix has length at least `max(0,min(L_A−d,L_B))`.
The saved counters prove these same-level overlaps:

| N/species, nr, nz, dt | 101→404 shared uniforms, at least | 505→303 shared uniforms, at least |
| --- | ---: | ---: |
| 32768, 12, 3, 100 ns | 51436069 | 67120478 |
| 32768, 12, 9, 100 ns | 51090217 | 66435796 |
| 32768, 6, 3, 100 ns | 51681471 | 67208608 |

The weaker shuffle bound does not prove an overlap for N16384; that is not proof
of disjointness. Detailed actual pair counts, configurations and lower bounds for
all 24 runs are retained in `scientific/transport-v33/prng-review/counter-output-final.json`.

There is also within-run reuse: initialization consumes exactly 9 uniforms per
representative (r, angle, z and three two-draw Gaussians), or 18N for two species.
Collision stream 505 starts 82240053 calls before its own initialization stream.
In every completed N32768 level its collision lower bound reaches and reuses
**all 589824 initialization uniforms**. Thus the separate XOR seed does not
establish independent initialization and collision randomness either.

For scale only, Nanbu uses at most two scattering uniforms per pair plus
shuffling, giving at most 8NS collision draws over S full steps with all 2N ions
active; TA gives at most 10NS. At N32768 and 4001 declared fine-step slots those
bounds are 1048838144 and 1311047680, below one complete state cycle but well
above cross-seed offsets. These are upper bounds, not measured h50 counts.

## Prospective correction and existing implementations

Use a separately versioned, prospectively frozen keyed/counter-partitioned
generator cohort. Preserve v33 source, raw artifacts, numeric gate decisions and
conditional interval calculations. Do not replace seeds/results inside that
cohort or treat a new generator as an exact-output optimization.

The strongest reference is official Random123 Philox4x32-10, with its upstream
C/C++ implementation and known-answer vectors. The original paper explicitly
discusses overlapping substreams and develops keyed counter generators with large
parallel stream spaces. It reports BigCrush testing; that is evidence about the
tested generator, not a theorem that any application is accurate. [Original SC11 paper](https://www.thesalmons.org/john/random123/papers/random123sc11.pdf),
[official reference and tests](https://github.com/DEShawResearch/random123),
[official known-answer vectors](https://raw.githubusercontent.com/DEShawResearch/random123/main/tests/kat_vectors)

The existing `@neutrium/rand` package is a relevant browser adapter candidate,
not approved by this audit. Its inspected TypeScript class uses a 64-bit key,
64-bit block counter and separate 32-bit stream counter word; its block function
executes ten rounds with unsigned word arithmetic. The package also exposes
Rust/WASM and WGSL implementations. Its `.next()` consumes two words to construct
a 53-bit uniform, unlike the current one-word conversion. Its normal helper
caches a second variate, unlike the current helper. These differences must be
explicitly versioned; integrating a whole new distribution API would unnecessarily
confound a generator-only correction. No package was installed or tested.
[Package source](https://github.com/neutrium/rand),
[scalar wrapper](https://raw.githubusercontent.com/neutrium/rand/main/src/generators/philox/Philox4x32.ts),
[output adapter](https://raw.githubusercontent.com/neutrium/rand/main/src/generators/BaseGenerator.ts)

Prefer either a thin audited adapter of an existing implementation or an official
Random123 WASM build, comparing scalar-call overhead before choosing. Require
official KATs, independent C-reference word comparisons, high-product/carry and
counter-wrap cases, non-overlapping run/domain assignments, explicit uniform
endpoints, unchanged distribution transforms, and persisted generator/version/
domain identity. Record draw counts. Historical absent metadata means legacy
Mulberry32; null or mixed-generator cohorts must reject. Separate run IDs and
initialization/collision domains must map injectively to declared key/counter
space; a small hash or XOR offset is not a disjointness guarantee.

WarpX is a relevant precedent with a qualification: its binary collisions use
AMReX's RNG abstraction. The reviewed AMReX SYCL engine is Philox4x32x10; its CPU
path uses mt19937 and its CUDA path declares curandState_t. A universal claim that
WarpX uses Random123 Philox on every backend is unsupported by these sources.
[WarpX collision execution](https://raw.githubusercontent.com/BLAST-WarpX/warpx/development/Source/Particles/Collision/BinaryCollision/BinaryCollision.H),
[AMReX engines](https://raw.githubusercontent.com/AMReX-Codes/amrex/development/Src/Base/AMReX_RandomEngine.H),
[AMReX CPU implementation](https://raw.githubusercontent.com/AMReX-Codes/amrex/development/Src/Base/AMReX_Random.cpp)

## Execution evidence

Integer algebra ran offline in existing safe-dev guest b213aef0038fb2d3. The
24-counter checker ran offline with a 180-second subprocess cap in distinct light
guest e585d9ea04b53bd1, stage `/tmp/mass-spinner-transport33-prng-review`.
No dependency installation/network or physical solve occurred. Its 29-file input
map SHA is 39333c987ed83a5e999926eff6a4a6aeee1ffd83c0d54488582902baaf15be6e;
all inputs were checked before and after. Final checker exit 0; output SHA
d9bce63b284aadae6165012f850bdc6e93cdd201181cc367ed17b0ad79b09773.
The 24 staged raw files matched the catalog's recorded hashes; complete catalog
SHA at comparison was 0f1632381fc7123ffacf12e7225fb49caab7cdaee1f9bbc5ba32fedecab9873e.
Sources and scripts are retained with separate new evidence. Prior sealed v33
leaves remain untouched. This audit does not certify PRNG statistical quality or
recalculate any physical acceptance verdict.
