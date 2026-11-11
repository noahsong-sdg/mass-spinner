# Independent v70 model and observation audit

Reviewer scope: read-only source tracing and primary-source review. No project
code or scientific studies were executed by this reviewer. The parent owns
safe-dev execution, source synchronization and final evidence acceptance.

## Traced paths and what the retained failures mean

`scientific/experimental-v64/compare.ts:12–14` calls `rotorResponse` with all
inertias and reciprocal/wall torque coefficients proportional to an inventory
proxy. The field comparison at lines 20–31 substitutes inverse measured
diagnostic temperature for that proxy. Consequently its normalized prediction
is `V(B)/V(B0) = (B/B0) (Tapp(B)/Tapp(B0))`. This is a deliberately bounded
inventory hypothesis, not a temperature-dependent viscous transport model.

`scientific/momentum-v65/diagnostic_reference.py:144–179` instead fixes a full
gas cylinder of radius 6 cm, an unforced core ending at 0.75 cm, stationary outer
no-slip, constant viscosity, radial current proportional to `1/r`, and a uniform
emissivity spectral-centroid operator. Three inner apparent-velocity markers fit
one amplitude; five outer markers are held out. The 39.98% RMS/peak discrepancy
therefore rejects this particular normalized shape. Neither that result nor the
older 59.55% rigid-profile result uniquely identifies a viscosity, wall-drag,
electrode, emissivity or thermal correction.

In that prescribed-current steady equation, density drops out. Its unit pressure
ratio and the inventory hypothesis's one-third ratio are different hypotheses,
not two solvers disagreeing on the same specified PDE. Neither should be fixed
by adding a separately fitted drag coefficient at each pressure.

`src/fuel-spatial-operation.ts:19–78` now couples conservative species transport,
radial momentum, neutral temperature-dependent transport and electrical/thermal
work. However, it requires the same equal-volume full-cylinder gas and electrical
geometry; rotation is common to the heavy fluid and independent of axial position.
`src/fuel-current.ts` solves charge continuity with prescribed positive diagonal
conductivity. Conductivity is not predicted from electron energy or ionization.
These newer paths do not replay the historical apparatus and therefore do not
supersede the retained experimental failures merely by passing conservation or
refinement gates.

## Newly accessible primary evidence

The [original 1980 paper](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf)
is accessible in this review. Sections 2–3 report 100 A, a 12-cm midplane
diameter, 14-cm anode spacing and 1.5-cm cathodes. Ar optical lines are 4702 Å
(neutral) and 4807 Å (ion). The profiles were not Abel transformed: speeds are
estimated 30–40% low, central temperatures about 30% low; off-axis temperature
errors can exceed twofold. Profile shape is reported insensitive to discharge
parameters within measurement accuracy. Fig. 5 reports central, not radial,
temperature. Section 4.1 motivates `Vmax ∝ IB/μ`, with approximately `μ ∝ T^0.75`.
The reported pressure dependence is stronger than this viscosity scaling explains.

The [2026 preprint](https://arxiv.org/pdf/2607.28208v2), section 4.1.1,
approximates the historical device with an effective 14-cm radial discharge
length, and attributes outward-skewed measured profiles to unresolved current
and boundary structure. Its two-temperature benchmark is a useful lead rather
than a complete source-bound replay package for this project.

## Smallest justified next comparison

Use the existing four matched-field central-temperature and maximum apparent
velocity markers at 3 Torr and 100 A. Keep the earlier 0.17-T calibration and
the three held-out field memberships frozen. Apply the existing sourced Ar
neutral viscosity table in `src/fuel-neutral-transport.ts` to a declared
temperature proxy and predict ratios proportional to `B/μ(Tproxy)`.

This tests the mechanism omitted by the inventory-only field hypothesis without
introducing a new fitted loss law. It is **conditional reduced scaling**, not a
prediction of temperature or a proof that apparent central temperature equals
the viscosity-weighted radial temperature. Report every held-out relative error,
the frozen 20% screen and the old hypothesis alongside it; do not replace a
worst-point failure with RMS/peak averaging.

Predeclare extraction-coordinate sensitivity and a common multiplicative
temperature-bias sensitivity. The source's approximate central-temperature
bias does not specify pointwise corrections or statistical covariance. A
shared factor of `1/0.7` is a sensitivity endpoint, not measured corrected
temperature or a certified uncertainty interval. Check the table range at all
corners. Preserve pressure and radial-profile discrepancies independently.

## Observation work and remaining blockers

An optically thin local Maxwellian spectral forward model can integrate
emissivity-weighted chord moments. Its centroid is the emissivity-weighted
line-of-sight mean; its variance includes both thermal variance and the variance
of the local mean velocity along the chord. This is the law of total variance,
and prevents interpreting every broadening contribution as local heat.

Such an operator deserves rigid-rotation, uniform-temperature, differential
rotation, annular-hole, signed-chord and nonnegative-emissivity tests against
independent quadrature. But the recovered paper does not establish that its
instrument reduction used exact first and second moments. A synthetic operator
pass must not be described as reproducing the actual historical spectral fit.
Keep it scientific-only unless a production caller has an admitted requirement.

A matched radial-profile prediction still needs radial temperature constraints,
current/electrode boundaries and a justified optical reduction. Apparent central
temperature alone cannot supply those fields. A field-ratio pass would qualify
one observable and one conditional operating domain, not the complete Marathon
simulator, separation times, throughput or live defaults. In particular, the
research spatial backend and the live global-rotor backend remain distinct.

No implementation or execution acceptance is given at this stage. A subsequent
review must inspect new source, prospective gates, retained failures and exported
VM evidence before accepting any result.

## Source review of the v70 implementation

The parent subsequently added `scientific/field-v70/scaling.ts`, `compare.ts`
and a prospective protocol. I inspected their execution path: corrected markers
are matched at the frozen fields; one measured speed at the second field supplies
the calibration; held-out measured speeds enter only scoring. Neither viscosity
nor its temperature exponent is fitted. The output keeps matched experimental,
live and unconditional accuracy flags false and lists the unresolved quantities.

The three competing formulas implement their declared ratios correctly. The
material sensitivity also has the correct sign: because `μ ∝ 1/Q22`, multiplying
the collision integral at one field by `q_i` changes the normalized speed by
`q_i/q_train`. A common integral multiplier cancels. Separate ±5% coordinate
corners are only sensitivity to the original table's accuracy annotation; they
are not a covariance model or confidence interval.

Property-domain admission is appropriately limited to the neutral-viscosity
candidate. The algebraic inventory and constant-viscosity hypotheses do not use
the table, so out-of-table temperature coordinates cannot by themselves make
those candidates unavailable. Table-dependent unavailable corners remain
explicit and prevent an all-corners pass. This avoids extrapolation and avoids
disqualifying an unrelated hypothesis through a property it never uses.

I authored a separate Python standard-library reference and regression tests at
`scientific/field-v70/reference.py` and `test_reference.py`. They manually
reconstruct the source Q22 table/interpolation and absolute viscosity units,
all nominal rows, frozen membership, both temperature scales, 4096 extraction
corners, 256 independent reproducibility corners and 16 transport corners.
The validator additionally binds corrected marker bytes and protocol bytes and
rejects false device/live-qualification flags. Corruption controls cover stale
hashes, leaked holdouts, wrong absolute viscosity or prediction and altered
sensitivity results. This source review and independent implementation do not
constitute execution evidence; the parent must run and inspect them in safe-dev.

## Exported v70 evidence independently checked

Using trusted standard-library JSON/hash/arithmetic inspection only, I verified
all 27 exported files (598849 bytes) under `field70/studies/accepted` against
their manifest. Manifest SHA-256 is
`d6315b7fd1b6bd2aa140a5619836dbd841883e709f6d0fcfe971a410aa3d3cdc`.
The accepted controller input map contains 751 files and hashes canonically to
`c0422847900c1fa286677b13745e3b19ffd8e82ccf91566ca3207922c13d2fd2`,
matching the controller receipt. All seven current v70 executable/protocol/test
files match that tested snapshot. No project module was executed on the host.

The retained VM logs show 16 TypeScript tests and all nine independently authored
Python tests passing without skips. The actual TypeScript output passed the
independent Python reconstruction of all six cases, individual predictions,
absolute viscosities, membership, claim flags and all declared corner sets.
Typecheck, build, site and asset checks each exited zero in the same accepted
snapshot. I inspected these receipts, rather than independently rerunning them.

I also recomputed every nominal held-out error directly from the exported
predicted and observed velocities:

| Hypothesis | 0.13 T | 0.21 T | 0.255 T |
| --- | ---: | ---: | ---: |
| Inventory `BT` | 15.8629% | 22.5499% | 41.1778% |
| Constant viscosity `B` | 5.8501% | 2.0469% | 2.8802% |
| Neutral viscosity at apparent central T | 2.1945% | 10.6344% | 18.4030% |

Both latter hypotheses pass the nominal 20% screen, **but constant viscosity is
the stronger comparator**. Therefore the data do not establish that inserting
the apparent central-temperature trend improves the effective viscosity model.
The measured-temperature candidate improves the rejected inventory hypothesis;
it does not outperform every simpler alternative. A nominal pass is not robust
to every declared sensitivity: its extraction-corner maximum is 22.3875%, its
transport-corner maximum 26.1741%, and its independent reproducibility-corner
maximum 72.4560%. With the common `1/0.7` temperature multiplier these maxima
are respectively 23.5032%, 27.1710% and 74.0164%; 128 of 256 reproducibility
corners lie outside the property domain. Those unavailable corners prevent an
all-corners pass and are not extrapolated or silently discarded. These sets
have no statistical confidence interpretation.

The first final runner rejected a comparison to an older 151-file deployed
release, while the current pre-study build contains 161 files. The revised
runner now hashes the actual pre-build directory and requires exact equality
after the study rebuild. The stored 161-file map hashes to the accepted
`d058f6cee3714d66f579a07aa64e8507f83691e5ac00964e4978f30689c70742`
receipt. This is the appropriate narrow invariant for a research-only change:
the old deployment is a different baseline and cannot serve as proof of this
study's absence of build changes. It does not establish correspondence between
the current local build and the public site. No deployment or live browser
verification is claimed.

Acceptance is limited to the conditional field-hypothesis comparison and its
software checks. The radial profile, pressure response, matched current and
temperature fields, spectral fit, predicted heating, isotope products and
first-order device performance remain unqualified. The final receipt correctly
sets `goalAchieved`, `matchedExperimentalValidation`, `liveQualified` and
`freshBrowserTest` false. No additional implementation blocker was found in
the reviewed v70 path.
