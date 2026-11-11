# Independent neutron response and decay audit

## Disposition

**Accept the revised fixed reference-family numerical evidence. Reject the original response qualification. Empirical Marathon/LiT calibration, arbitrary materials/spectra/geometries, and a uniform interpolation error bound remain unknown.** No production physics was changed by this auditor.

This audit independently read the native statepoints and assembled the decay matrices. It did not accept passing producer tests as physical validation. Numerical agreement with an evaluated-data transport code is a bounded benchmark, not measured-machine calibration.

## Exact scope and provenance

The tested browser response source is `src/neutron-response.ts`, SHA256 `609f5dc5a5f99613b5da8a720aed03a9cfccc56585787b73159a4e731abe63ea`. The actual response-r1 packet SHA256 is `95589ec0d3c9a217a88172c934de472d5641e81c2fdc6c7083e1f21a510da066`. The tested decay source is `src/decay-network.ts`, SHA256 `1668b1cf6f20b4227114fd58ad5087f86fca30d6d941146bc88f3279da1f9e7a`.

The reference family is a monoenergetic 14.1 MeV isotropic point source at the origin and a free-H1 cylinder, radius/front distance 0.1 m, density 6e28 atoms/m³, temperature 293.6 K, inside a 1 m vacuum sphere. Thickness is 0.02–0.18 m. This is distinct from the live LiT target and Marathon apparatus. OpenMC 0.16.0 uses NJOY2016.78-processed ENDF/B-VIII.1 H1. The raw ENDF SHA256 is `3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af`.

All execution used the auditor's separate copied safe-dev stage `/tmp/mass-spinner-collision-v38-20261108`, volume `safe-dev-f6cc18c484d94d28`. No producer native environment or credentials were mounted. NumPy 2.3.4, SciPy 1.16.3 and h5py 3.15.1 were installed inside that guest; the wheel hashes are retained in `scientific/neutron-v38-independent/results/install-report.json`. The complete tested input/source snapshot was exported to `/tmp/mass-spinner-neutron-v38-independent-final-export`. Canonical raw study data remain in `scientific/neutron-v38/results/{first-grid,refined}`. Input manifests and compact reconstructed results are retained in `scientific/neutron-v38-independent/results`.

## Independent transport reconstruction

The auditor verified 184 copied input files against their SHA256 manifests, then directly read **17 raw statepoints**: 3 synthetic controls, 5 original nodes, 4 original holdouts, and 5 new holdouts. For every statepoint, the audit checked full 100-batch completion, 10,000 histories/batch, OpenMC version, seed, tracklength estimator, score order and target cell-filter identity. XML checks independently confirmed source strength 1, isotropic neutron emission, source position/energy, geometry dimensions and target region, H1 density/temperature, and photon transport disabled.

For each channel the audit recomputed mean `sum/100` and standard error `sqrt((sumSquares/100 - mean²)/99)` directly from HDF5 sums/sum-squares. These matched the exported packet. Absorption is the expected absorption count per **emitted neutron**; total is the expected all-collision count per emitted neutron and can exceed one. Neither is normalized per neutron entering the cylinder. Browser rate scaling multiplies both mean and Monte Carlo standard error by a deterministic emitted-neutron rate.

The independent ENDF MF3 parser and processed-HDF5 interpolation checked MT2 and MT102 cross sections at 0.1, 1, 5, 10, 14.1 and 20 MeV: all 12 comparisons passed the original 0.2% processing-consistency budget. This does not quantify nuclear-data uncertainty or independently qualify every outgoing-angle distribution.

An independent adaptive angular quadrature gave the uncollided synthetic absorber expectation **0.06638618319165425**, reproducing the producer's separate midpoint quadrature. The absorber passed its four-SE control; the mixed absorber/scatterer exceeded its first-collision-only contribution by the required four SE, demonstrating a resolved multiple-collision contribution in this reference case.

## Retained failures and the justified refinement

The original 2/6/10/14/18 cm grid failed both channels at the 4 cm holdout: residuals 3.2737631603516756e-5 absorption and 0.003717756323275978 total. The other six channel/holdout checks passed. Technically, linear interpolation on this coarse interval missed response curvature; simply, five thickness samples were too sparse near the front of the grid. The appropriate fix was to add the failed 4 cm case as a training node and test **new** holdouts, rather than loosen tolerances or test the fitted point as independent evidence.

The separately frozen refinement added that node and collected 3/5/8/12/16 cm holdouts with distinct fresh seeds 813830–813834. The audit verified the six final nodes equal the original nodes plus the promoted old holdout, and that all new seeds are disjoint from the initial campaign. All **10 new channel gates pass**, independently recomputed using the unchanged criterion:

`abs(prediction - holdout) ≤ 4 sqrt((1-w)² SE_left² + w² SE_right² + SE_holdout²) + absoluteTolerance`

The absolute tolerances remain 5e-6 absorption and 5e-4 total. Full residuals, combined errors and limits are retained in `results/response-audit.json`. One passing midpoint per interval is sampled validation, not a proof of an error bound throughout that interval. Four-SE acceptance also does not establish a confidence bound on unmodelled systematic error.

The original exact-zero pure-scatter absorption control also correctly failed. Upstream [OpenMC v0.16.0 xsdata.cpp](https://github.com/openmc-dev/openmc/blob/v0.16.0/src/xsdata.cpp#L90-L94) replaces zero multigroup absorption with 1e-10 cm⁻¹ to avoid tally divisions by zero. This synthetic control uses total macroscopic cross section 0.1 cm⁻¹. Independently, its raw absorption equals `totalScore × 1e-10 / 0.1` within **5.169878828456423e-26**. This is an explained numerical floor, not physical absorption. The separately versioned control checks that identity; no score is offset, clipped or subtracted. The original failed zero test remains archived. This floor is a multigroup synthetic-control issue; the physical continuous-energy H1 response retains its actual evaluated capture cross section.

The processed HDF5 products independently identify MT2 as neutron and MT102 as photon. The retained NJOY/OpenMC warning trace concerns the latter photon product. Photon transport is false in every audited statepoint; [the pinned OpenMC default](https://github.com/openmc-dev/openmc/blob/v0.16.0/src/settings.cpp) is also false. This makes the warning non-blocking for this neutron-only response, not a qualification of coupled photon transport.

## Browser admission and decay

Actual final source plus actual packet passed **11 exact/interior interpolation and source-scaling reconstructions**, and rejected **22 adversarial cases**: old failed packet, extrapolation, wrong spectrum/geometry/density, missing qualification, photon transport, invalid data identity format, changed gates/floor, reused seeds, failed/missing holdout, shifted grid, impossible score, negative standard error and non-finite inputs. The exact cases and source/packet identities are in `results/admission-audit.json`. Admission enforces declared family/invariants and recomputes sampled gates; it is not a cryptographic certificate of arbitrary substituted packets. This audit separately checked the actual packet hash and native evidence.

The auditor independently assembled explicit affine decay/reaction/source matrices, including an untracked-loss sink and constant source reservoir, and used SciPy's dense Padé matrix exponential rather than browser algebra. Ten cases cover three producer-oracle cases, equal/near-equal decay constants, explicit branch loss, stable production, cooldown switching off reactions and sources, stiffness up to rate×time=1e6, and inventories down to 1e-120. All browser populations were finite/nonnegative. Activities, injected atoms, and total tracked-plus-lost inventory were checked independently, with no clipping. The equal-root case was additionally checked against its analytic limiting formula.

The prospectively stated audit budget was 1e-8 global inventory-scaled error and 1e-8 relative error for components above 1e-10 of total inventory; smaller components were retained without claiming relative-tail accuracy. Worst observed errors were **1.2711016461253167e-10** global and **4.569203680525186e-10** resolved-component relative. The three retained native CRAM48 oracle cases had exactly matching matrices, initial states, sources and times; the independent SciPy result differed from CRAM48 by at most **1.087660901248455e-10** of total inventory. All passed. This validates bounded constant-rate numerical evolution, not a measured activation/decay network or an arbitrary changing flux/material state.

## Exact checks and remaining limits

Inside the isolated snapshot, these completed with exit 0:

- `node --import tsx decay-driver.ts`: actual browser backend, 10 predeclared cases.
- `.venv/bin/python decay-audit.py`: independent dense exponential, positivity/inventory/activity/analytic-limit checks and 3 native CRAM48 comparisons.
- `.venv/bin/python response-audit.py`: 184 manifest files, 17 raw tally reconstructions, 12 ENDF/processed comparisons, independent control quadrature, retained failures and 10 refined gates.
- `node --import tsx admission-audit.ts`: 11 accepted reconstructions and 22 rejection controls.

No production implementation changed here, and the parent owns final integrated build/typecheck and browser verification. A future claim about real Marathon neutron yields, LiT attenuation, neutron/photon heating, shielding or dose, spectral activation, transmutation, or a complete fusion-power design still requires matching source spectra, isotopic material data, geometry, relevant coupled transport, and experimental validation. The revised fixed-H1 benchmark should remain visibly separate from those claims.
