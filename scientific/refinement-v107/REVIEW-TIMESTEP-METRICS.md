# V107 full-clock timestep review

The actual r8z2 CFL **0.2 → 0.1 → 0.05** study passes the unchanged timestep
gates at **0/1/2/4 μs**. This resolves the tested temporal-refinement requirement
on that spatial grid. It does not qualify spatial convergence, the complete
nine-case matrix, experimental accuracy, or the live playground.

## Evidence checked

Reviewed `retained/timestep-evidence-20261114/` using trusted hash, gzip, JSON,
and arithmetic readers only, serially loading one large audit at a time. No
project code, Python, tests, or VM was executed by this reviewer. I authored
the stable norm and portions of the admission adapter; this is an artifact and
predicate review, not an independent PDE implementation or independent norm
implementation.

All **288** export payload hashes match the inventory (183,189,157 payload
bytes). All four decompressed field hashes also match their packet receipts.
Key checked seals are:

| Artifact | SHA256 |
| --- | --- |
| Canonical stable audit | `8d85807cb41344ff98b88b791d13a79e9e316694684bd217def84938bd8eb669` |
| Audit driver | `b2905dad6af41cfecf664f159953e15ee8c047912a9853ba325f0fffba992fd0` |
| CFL 0.05 prediction | `258db38c8b84584101ff26124eeb0a194d0842b119ebcfaecbcd2cc4961fab36` |
| Stable norm implementation | `5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b` |

The driver calls the frozen full-phase audit on four distinct declared packets.
Only the timestep triple is complete and admitted as a comparison layout; the
additional r4z2 CFL 0.1 packet contributes case/ledger checks. The execution
receipt records exit **0**, 18.9645138 s, checker transfer
`993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836`,
and matching driver/log hashes. Summary and canonical audit agree. The retained
component-audit hash also matches its receipt.

All four producer packets have identical source inventories, physical manifests,
and scenarios; fitting/target-reading and gate-replacement flags remain false.
Their field clocks are exactly **0/1/2/4 μs**. The temporal trio shares the same
**160 × 48** cell geometry and has genuinely different accepted step sequences:

| CFL | Accepted steps | Sum of saved step lengths |
| --- | ---: | ---: |
| 0.2 | 4,968 | `4e-6 s` |
| 0.1 | 9,937 | `4e-6 s` |
| 0.05 | 19,874 | `4e-6 s` |

The finest-time case reports 3,630.749326835 s and 415,416 KiB peak RSS,
within its unchanged 1,048,576 KiB declared resource budget. The extra r4z2
case has 5,541 steps. These counts sum to 40,320 accepted-step records, each
audited for conserved ledgers and angular invariants.

## Gate and norm results

The canonical audit contains **242,154 gates, zero failures**, with
`caseAdmissionPass=true`. Direct arithmetic rechecked the stored nonnegative
`value < limit` predicate for every gate and the strict contraction predicate
for all **28** observable/clock comparisons: **zero mismatches**. The 28 fine
temporal differences all meet the unchanged **0.02** limit. Initial-clock
differences are exactly zero; the other 21 fine/coarse ratios span
`0.4943439120287961`–`0.49900911420619887`, consistent with first-order time
error under halving for these saved observables.

Selected fine **CFL 0.1 → 0.05** relative differences (fractions, not percentages):

| Observable | 1 μs | 2 μs | 4 μs |
| --- | ---: | ---: | ---: |
| Density increment | `0.0008264565559833617` | `0.0003398475081252581` | `0.00014613585472629049` |
| Radial velocity | `0.00040430802774822915` | `0.00016864599386266462` | `0.00007789635121915954` |
| Temperature increment | `0.0001439723038640754` | `0.00012007559142829313` | `0.00003287331556375121` |

The largest fine difference is the 1 μs density increment: **0.0826456556%**,
versus the **2%** gate. Both velocity components retain the declared combined
meridional reference norm. All **112** panel-quadrature gates pass the unchanged
**1e-10** limit; maximum spread is `1.2519277808449081e-15`. Inventory and
ledger thresholds remain unchanged. This review checked their actual retained
values and predicates, without independently rerunning their physical assembly.

## Remaining limitations

The canonical status is correctly **PENDING**: `allRequiredNumericalPass=false`,
`fullDeclaredMatrixPass=false`, and five declared full jobs remain missing:
r4z1, r8z1, r8z4, r16z2, and r16z4, all at CFL 0.1. There is no complete
radial, joint, or axial contraction layout in this audit. Small temporal error
does not bound unresolved spatial error or establish a continuum solution.

The separate initial-clock axial diagnostic is retained byte-for-byte at SHA256
`7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`,
including both density/temperature contraction failures. Its omission from this
timestep-only comparison is legitimate layout scope, not their resolution.
The original six V106 spatial failures likewise remain recorded separately.
No producer fields were rewritten; live and experimental qualification flags
remain false. No blocking correctness issue was found in this timestep result
within that explicitly limited scope.
