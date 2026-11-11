# Evolving target material and prompt deposition, v35

## Demonstrated omission and bounded correction

The previous source path `simulateFusionBeam → litStoppingCrossSection` always
uses one Li atom and one T atom per formula unit. The loading solver changes
T/D/vacancies separately. Technically the isotope populations never enter the
stopping kernel; simply, an emptied or D-filled target stops the beam as if every
hydrogen site still held T. That is an explicit old-model approximation rather
than a measured target response.

New `stoppingForComposition(E,{tritiumFraction,deuteriumFraction})` evaluates

```
S(E,fT,fD) = S_Li(E) + fT S_T(E) + fD S_D(E),
fT >= 0, fD >= 0, fT+fD <= 1.
```

Stopping is per fixed Li site, in keV m². Hydrogen-site vacancies remove their
atomic contribution; lithium remains. D/T mass changes nuclear recoil while
their atomic electronic branch is identical in this approximation. There is
no invented temperature or compound correction. The full-T endpoint preserves
the prior LiT calculation; the old public function and fixtures are unchanged.

The minimal existing-file change exports `atomicStoppingCrossSection` around
the pinned Geant4 branches. Reusing those kernels is preferable to copying
another stopping table or subtracting two nearly equal compound sums to infer
individual atoms. Grouping `1-(fT+fD)` also preserves the same nonnegative
vacancy boundary used by validation, without clipping populations. Explicit
null isotope masses reject rather than being silently treated as defaults.

The energy domain remains 0.833333…–500keV. A caller reaching the low-energy
boundary must reject/report its unsupported tail; no stopped-ion tail or
implantation profile is manufactured from this mean-stopping function.

## Independent atomic reference

`scientific/marathon-v35/material/reference/build_atomic.py` extracts the exact
original Geant4 v11.4.0 electronic and nuclear function bodies, checks their
archived hashes and compiles them with type/unit shims in a separate Apple
safe-dev guest. It emits20 rows: five energies ×H2,H3,Li6,Li7.

Output SHA256:
`da12120d0ac5dc8a65023cfd7414f997da7734ea6d0e5228395139d543d3159e`.
Generated C++ SHA256:
`a12001c3e48c2127a17c0690ef55ff28b23ae3ddedabf8d450e186e1eb873768`.

These references check the adaptation, isotope endpoints and units. They are
not a full Geant4 transport run or independent experimental validation of the
underlying empirical model. Geant4 copyright/license remains archived and the
existing public license applies.

## Profiles and accounting

`normalizeImplantationWeights` accepts explicitly assumed nonnegative source
weights. Normalization is bookkeeping, not an implantation prediction.
`binImplantationDepths(edgesM,depositedDepthsM,incidentCount)` handles actual
external deposited-ion samples. Fractions use the full incident count, so
missing/reflected particles do not silently become retained fuel. Internal
edge samples enter the deeper bin; the last edge belongs downstream. Deposits
beyond the modeled target and unclassified projectiles are separate outputs.
Deposited positions alone cannot identify reflection.

The coupled solver owns isotope transport, release and renewal. This module
does not introduce a fitted retention probability, diffusion coefficient or
target lifetime.

## Primary-source research and evidence limits

- [RustBCA](https://github.com/lcpp-org/RustBCA) provides open prompt BCA
  implantation/reflection/sputtering with reproducible keyed projectile streams.
  Its material examples explicitly require user verification. Source version
  v3.0.0 is pinned at `673bd3f2b907b14517a6b3cafa1c5372a5eb4ae2`; GPL code
  remains an offline reference, not bundled in the browser. The predeclared
  bounded campaign is `scientific/marathon-v35/material/BCA-PROTOCOL.md`.
- The [IAEA electronic-stopping database](https://www-nds.iaea.org/stopping/)
  advertises version2026-09 and a programmatic API. Both official ZIP and API
  requests in the isolated guest returned HTTP403. This is unavailable coverage,
  not evidence that D/LiT measurements do not exist. No access workaround was
  attempted. Electronic stopping alone would not validate scattering or trapping.
- [Geant4 source](https://github.com/Geant4/geant4/tree/b4a16de652ec244f7a0ecc0a5cacfee21930bf75)
  supplies the adapted atomic reference; compound effects and stochastic paths
  remain separate. [SRIM/TRIM](https://www.srim.org/) remains a possible licensed
  comparator, without treating its predictions as experimental LiT data.
- [Sandia thin-film-target work](https://patents.google.com/patent/US11343900B2/en)
  shows why implantation range, isotope diffusion and backing barriers affect
  exchange. Its metal-tritide parameters cannot be transferred to LiT.

No measured Marathon target geometry, chemical correction, trapping/diffusion
law, temperature-dependent retention coefficient or calibrated uncertainty band
was established by this material study. New scenario coefficients remain assumptions. A prompt BCA
half-space result does not validate a finite film or long-dose evolution.

## Verification status

Initial bounded tests:8/9 passed; one-ULP vacancy subtraction was corrected by
using the same occupancy sum as the invariant. The next copy passed9/9 including
the four original stopping regressions. Final updated module/tests passed10/10,
including all20 independently compiled atomic-oracle rows, plus strict source
typecheck. Full application gates belong to parent integration.

All executed project code and compilation used Apple safe-dev guest
`safe-dev-0311f9737c95623a`, source stage
`/tmp/mass-spinner-marathon35-material`; no host source execution or credentials
were mounted. Exports were retained before each replacement sync. The baseline
Rust toolchain is rustc1.63/cargo1.65; the selected RustBCA release requires the
2024 edition. An isolated guest-only Rust1.90.0 toolchain was installed with
rustup1.28.2. The first build correctly failed because `--locked` was requested
but upstream contains no lock. That original failure is retained. Explicit
resolution produced lock SHA256
`72199a876c1010d688c4c7dbe942556d4cd8e7c70f8f62984317d90f89ec835f`;
the unchanged source then built with `--locked` and two jobs. Setup attempts
took19.55s and28.35s, within the480s declared aggregate work budget.

The unchanged upstream10-ion example and all12 conditional D/LiT cases completed
exit0 within the180s campaign cap. The raw310-file export was sealed and handed
to the independent auditor before producer numeric interpretation:
`/tmp/mass-spinner-marathon35-material-bca-raw-export/RAW-SHA256.json`, SHA256
`427926f829cf155a7b8efae4c89b0c3210c589698810f61c669ce7b77afcc63d`.
Physical completion alone does not establish the count, sampling or material
validation gates; independent saved-data reconstruction is recorded separately.

## Electronic-stopping domain correction

The first campaign omitted `electronic_stopping_mode`, so pinned source
`input.rs` selects `LOW_ENERGY_NONLOCAL`. The [official input
manual](https://github.com/lcpp-org/RustBCA/wiki/Standalone-Code:-Input-File)
limits that branch to approximately25keV/u. A100keV deuteron has50keV/u;
a500keV deuteron has250keV/u. Technically the low-energy asymptote was used
outside its stated domain; simply, a successful run was using the wrong
energy-range model. The original batch is retained as a control, with its
100/500keV cases excluded from the public reference.

`BCA-INTERPOLATED-PROTOCOL.md` freezes a separate follow-up before execution.
Every physical deck differs only by the explicit option `INTERPOLATED`, the
upstream Biersack–Varelas branch appropriate across the requested range. This
uses an existing model rather than fitting a correction to desired profiles.
The source, binary, resolved lock, material assumptions, energies, counts,
seeds, geometry and sampling gates are unchanged. All13 processes, including
the unchanged upstream smoke, completed exit0 within the180s cap. Raw export
`/tmp/mass-spinner-marathon35-material-bca-interpolated-raw-export` was handed
to the auditor before producer interpretation; its135-member manifest SHA256
is `efb6567a14b43d581b6d1ed1aa160e9e0fd52fcae43a083ba0eec5121515d3be`.
The deck-only difference and identical binary/lock were explicitly checked.

The unchanged upstream boron-nitride example does **not** reproduce its README
first-depth reference: expected0.016531847238600884µm versus observed
0.01534020511611836µm. Both executions finish normally. This historical numeric
smoke check is **FAIL**, with no asserted cause and no silent replacement of
the expected value. Saved-data accounting/sampling and empirical material
validation remain separate from that failed upstream numeric regression.

## Final recorded reference and interpretation

`web-assets/marathon-reference/implantation-v35.json` contains the corrected
INTERPOLATED campaign only. Its final SHA256 is
`19c136cb51719c76e7400700efef6ea3858da43bba8cc123fc9fa5086e19af24`.
The actual readout source SHA256 is
`8787008bd60dd8fafcb5cae4ea0820b8d1a5e75a74bc73a10d3179b6ab9ccec9`;
it exactly matches the executed copy exported to
`/tmp/mass-spinner-marathon35-material-bca-display-final-export`.

An independent, byte-identical frozen parser reconstructed all12 corrected
case inventories and all six predeclared sampled-grid DKW comparisons before
producer interpretation. They pass. Its first-output SHA256 is
`32d110ae55e17bc744b847d2d818d96bcb22c5cac97610ced8efa6e95f482834`.
The independent original-control reconstruction also agrees exactly with
producer counts, means, sample variances, sampled CDFs and DKW budgets.

Conditional deposited-depth means for the two2048-projectile seeds are:

| Incident energy | Corrected mean depth, µm | Change from default branch |
| --- | ---: | ---: |
|20keV|0.451473–0.451479|+1.03–1.05%|
|100keV|1.37759–1.37940|+16.27–16.34%|
|500keV|7.19649–7.19958|+152.07–152.35%|

Those intervals are two observed seed results, **not** calibrated uncertainty
bands. Zero observed reflection is not proof of zero reflection probability;
rare backscatter/sputtering coefficients are not qualified by these small runs.
The large500keV change demonstrates why count conservation alone cannot
validate a stopping model.

Every500keV deposit is beyond the prospective0–4µm sampled-CDF grid. Its PASS
therefore does not resolve tail shape. The frozen grid and verdicts remain
unchanged and `sampledGridAllDepositsBeyond` makes this limitation explicit.
The final readout adds a clearly labeled **post-hoc diagnostic** of the exact
full empirical-CDF supremum over all sample depths. All six differences are
within the same uniform DKW budget (observed suprema0.02832–0.04883). Four
analytic toy comparisons, including tied depths, check that calculation.
This supplemental diagnostic is separate from the prospective gates.

A second, explicitly **post-hoc display-only** histogram spans0–12µm with the
same0.125µm bin width. It keeps every incident ion in the denominator and
reports its own tail separately. It does not alter the original histogram,
CDF grid, acceptance record or thin-film loading input. The reference records
the full input assumptions, binary/lock/deck/output hashes, failure flags and
sampling diagnostics. RustBCA and the browser Geant4 adaptation use different
electronic/scattering models; this exercise does not establish agreement
between them or measured LiT validation.

The final public/producer comparison was then independently recomputed in
safe-dev: all12 counts, moments and original sampled CDFs match the earlier
blind reconstruction exactly; all1536 original/display histogram bins match
raw data; all six full-CDF suprema match a separate sorted-merge calculation;
and all six public2048-projectile snapshots match. Independent evidence seal:
`scientific/marathon-v35/independent/bca-public-final/SHA256SUMS.json`, SHA256
`ef09b50d8b4a0a48a5cba7f3688638959b354aeba63556508aa867496193d4f8`.
This independently verifies the arithmetic and saved-data translation; it
does not remove the recorded physical-model and empirical-validation limits.
