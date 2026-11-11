# Independent nuclear/source audit v31

8 November 2026. Fresh independent review of the beam-slab, product-energy,
finite-disk and blanket-reference paths. **One P3 API plotting defect is fixed.
No additional demonstrated physical coefficient or decay-equation error was
found in this scope.** This is numerical/source verification, not measured LiT
behavior, a Marathon digital twin or neutron-transport qualification.

## Demonstrated defect and narrow fix

Execution path: `setupFusionLaboratory` → `simulateFusionBeam` →
`fusionPlaygroundData` → candidate calls to `simulateFusionBeam` →
`dtCrossSectionM2` → plot rendering.

The source API accepts a 900 keV beam and imposed fractional loss 0.999. Its
exit is 0.9 keV laboratory, or 0.54 keV CM: the complete selected trajectory
remains inside the declared 0.5–550 keV CM fit domain. The sensitivity scan
nevertheless tried its fixed 20 keV candidate, whose exit is only 0.012 keV CM.
That candidate raised a generic cross-section-domain error which escaped the
plotter. A valid selected calculation therefore lost its sensitivity view.
The UI currently limits loss to 0.9, so this witness is an API-domain defect,
not an observed failure at the current slider settings.

Technical cause: the scan caught `MaterialSlabDomainError`, but the linear-slab
fit rejection had no corresponding typed domain identity. In simple terms, one
invalid comparison point canceled an otherwise valid experiment.

The authorized fix adds `DTCrossSectionDomainError extends RangeError` at the
existing fit boundary and catches only that class or the existing material-slab
domain class in the scan. Rejection text and fit limits are unchanged. Unsupported
candidate energies are explicitly returned in `excludedEnergiesKeV`; the valid
selected source is included. Invalid selected source configurations still fail,
and unrelated invalid efficiency errors still propagate.

This is preferable to duplicating fit limits and laboratory/CM conversion inside
the plotter, catching every exception, extrapolating a cross section, silently
clamping inputs or weakening the physical domain. Numerical slab equations,
defaults and current UI acceptance are unchanged. The original-source witness
fails; the same witness plus boundary/propagation checks passes after repair.

## Independent physics checks

Six new tests exercise production entrypoints rather than replacing their output
with a reference fixture:

1. **Product kinematics:** independent two-body angular quadrature with 1000
   midpoint cosines at 20, 100, 500 and 900 keV. With the declared integer masses
   D=2, T=3, n=1 and alpha=4, the CM speed is 2/5 of the incident D speed.
   Transforming the opposite product velocities back to the lab recovers the
   implemented mean neutron/alpha powers and their sum Q+incident energy, within
   3e−12 relative. This confirms the stated mass-number/isotropic-CM approximation,
   not an evaluated differential neutron spectrum.
2. **Energy ledger limits:** zero T with finite slowing, plus optically saturated
   no-slowing slabs at 10, 400 and 6400 intervals and alpha deposition 0.37.
   D+ count is I/e; nuclear power is Q times reaction count. Layer heat, escaped
   alphas, transmitted beam and neutron energy close within 3e−14 relative in
   these witnesses. Nuclear power does not include the incident beam energy a
   second time.
3. **Scan-domain regression:** valid high-loss selected source, excluded scan
   candidate, invalid selected source and unrelated invalid-input propagation.
4. **Finite-disk geometry:** independent plane-current quadrature integrates
   `d*rho/[2*(d²+rho²)^(3/2)]` over disk radius using 100000 midpoint bins, at
   distance/radius ratios 0.1, 1, 10 and 100. Results agree within 1e−9 relative.
   Scaling all lengths by 10⁶ preserves interception and scales mean plane
   current by 10⁻¹². This is incident current, not scalar transport flux.
5. **Two-parent decay:** independent Bateman transfer and semigroup checks over
   five initial isomer fractions and six times through 100000 hours. Inventory,
   positivity, initial direct-EC rate and composed half-time evolution pass.
   Numerical agreement does not resolve the previously disclosed nuclear-data
   evaluation disagreement.
6. **Blanket reference:** bounded optical-depth factors and the frozen paper
   case are checked independently of the beam source. The paper TBR and gold
   yield do not change when these dimensionless reference functions execute.

No new error was demonstrated in CM conversion, millibarn→m² conversion, Q,
particle/current normalization, target column attenuation or decay branching.
Those conclusions are limited to the declared model and checked numerical
domains; they do not establish omitted reaction-channel accuracy.

## Primary-source review and coverage boundaries

The freshly reopened [Marathon architecture](https://www.marathonfusion.com/beam-driven-fusion/)
supports an RF-ionized deuterium source, electrostatic D+ acceleration, solid LiT
and a cooled substrate. Its [current homepage](https://www.marathonfusion.com/)
also describes evaporated lithium deposition, in-situ regeneration, fuel
purification/reinjection and lithium enrichment. These public descriptions do not
calibrate our assumed operating parameters or retention/cooling coefficients.
The component catalogue and core-coverage document correctly identify deposition
and regeneration as unmodeled rather than simulated capabilities.

The reopened [Alchemy paper, §§4.1–4.1.1](https://www.marathonfusion.com/alchemy.pdf#page=12)
supports the frozen 1500 MWth, 210 mm, 85 at% Hg case, 90% enrichments, TBR 1.19,
2953 kg/year static estimate and 2909 kg removed in the depletion year. Structural
materials and thicknesses agree. The paper's transport/depletion calculation is
separate from this app's analytic decay and optical-depth references. Its important
tradeoffs remain spectral multiplication versus capture/leakage, T breeding,
feedstock inventory/utilization, extraction and impurities. None is newly solved
by the decay sliders or compact beamline.

[Isotope Production in Fusion Systems, v2](https://arxiv.org/html/2512.09242v2)
independently supports the two-parent chain and the idealized optical-depth
reference. Its economics and asymmetric loading remain conditional, reference-only
concepts here. The beam gain computed by this app is not the paper's plasma gain
or an electrical/economic breakeven result.

[ASCOT's official Bosch–Hale implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c)
was reopened to check coefficients, keV convention and millibarn conversion. The
fit is a beam cross section, not a Maxwellian reactivity. The app deliberately
retains only its declared lower-energy branch instead of extrapolating it.

[NUBASE2020](https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt)
still lists 197Hg 64.93(7) h and 197mHg 23.82(4) h, with IT 94.68(9)%.
The explorer's historical paper/ENSDF half-life and rounded branch are explicitly
qualified in its closed Model info. Replacing frozen reference inputs silently
would not improve provenance; no nuclear-data constants were changed in v31.

Source contents were treated as evidence, not instructions. Public architecture
does not prove all engineering materials, dimensions, simulated source spectra,
shielding, tritium lifetime, irradiation product purity or calibrated performance.
D–D/D–Li channels, compound/implantation effects and target renewal remain separate
missing-physics work. No guessed residual neutron yield or compound correction
was added. The separate Marathon reviewer audited stopping/loading/thermal
numerics; this reviewer made no changes to those kernels.

## Execution, identity and evidence

All execution used bounded copied Apple safe-dev stage
`/tmp/mass-spinner-audit31-nuclear`, guest `safe-dev-d3319e1d236e9394`.
Copied input: source, five test files, package/lock and tsconfig; 77 SHA-pinned
inputs, approximately 0.6 MiB. No host project execution, host-home/credential/socket
mounts, browser workaround or sandbox changes were used. Initial dependency
download was the only online project operation. Original guest outputs were
exported before the authorized source sync and offline reinstall.

- Original snapshot: **5 passed, 1 failed**, exactly the new sensitivity-scan
  witness; 229.532 ms test duration.
- Corrected snapshot: **25 passed, 0 failed, 0 skipped**, six new tests plus
  nineteen neighboring model/DOM tests; 675.185 ms test duration.
- `npm run typecheck`: **exit 0**.

Final corrected identities:

```
src/fusion-reactor.ts
53c402fe41db394df2fbe6e876c9d83b616f540222634d8a0b3cede68e981309
src/fusion-playground.ts
f830cbfc4fcc25957d305948995fa60d7ef0f89633e37b45e4d3cda23bb92b9a
tests/audit31-nuclear.test.ts
486528031321966fb944f844c12229935bbce28c65d37cfd3ee34b8de4b55973
```

Commands after copied-stage initialization, prefixed by
`/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-audit31-nuclear`:

```
run --online -- npm ci --ignore-scripts
run -- ./node_modules/.bin/tsx --test tests/audit31-nuclear.test.ts
export /tmp/mass-spinner-audit31-nuclear-red-export
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- ./node_modules/.bin/tsx --test tests/audit31-nuclear.test.ts tests/fusion-reactor.test.ts tests/fusion-playground.test.ts tests/blanket-reference.test.ts tests/neutron-geometry.test.ts
run -- npm run typecheck
export /tmp/mass-spinner-audit31-nuclear-final-export
```

Exact original/corrected source snapshots, maps and logs are retained in
`scientific/physics-audit-v31/nuclear/`. All tested input hashes matched the final
guest export. The parent owns merged full-application typecheck/build, publishing
and any browser/GPU acceptance. Passing these tests does not qualify the complete
simulator's transport physics or experimental Marathon predictions.
