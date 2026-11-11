# Bounded neutron response and irradiation depth

The v35 first-flight calculation remains unchanged. Its three actual synthetic OpenMC cases are reference controls, not an evaluated response grid. The missing path was multiple scattering followed by subsequent absorption, and separate irradiation/cooldown inventory evolution. Simply treating a first absorption as isotope production would invent an unprovided reaction, target inventory and branching network.

The new response family fixes geometry, material and birth spectrum and varies only cylinder thickness. The generic Bateman network is separate; no absorption-to-production coupling, isotope recipe, patient dose or calibrated Marathon claim is made.

Offline responses keep sliders responsive on static hosting while reusing OpenMC's evaluated collision physics. A browser Monte Carlo rewrite would add a separate solver and variance controls; server jobs per slider event would require hosted compute and queues. A small fixed family is reviewable, with explicit withholding outside its domain.

## Evaluated response protocol

- `scientific/neutron-v38/response-study.py` freezes protocol before processing or transport; final prepared SHA256 `72117df8401b64883fdd3d54453b5f4c6ba6da6d6f73477cdd602943ae161da2`. Preparation changes added raw/processed data checks and moved runtime paths under export exclusions; no numerical gate changed before execution.
- OpenMC 0.16.0, NJOY2016.78, ENDF/B-VIII.1 H1. Raw member SHA256 `3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af` is checked before use. Supported `from_njoy` processes ACE to HDF5 at 293.6 K and 0.001 processing tolerance; twelve MT2/102 fast cross sections must reproduce the native ENDF parser within 0.2%. No ENDF-export guard is bypassed.
- An isotropic point source at the origin emits monoenergetic 14.1 MeV neutrons. A coaxial cylinder has radius 0.1 m, front face 0.1 m from the source and assumed free-H1 atom density 6e28 m⁻³. A 1 m vacuum sphere encloses it. This is not a compound/thermal-scattering-law shielding model.
- Five thickness nodes: 0.02, 0.06, 0.10, 0.14, 0.18 m. Four independent holdouts: 0.04, 0.08, 0.12, 0.16 m. Distinct seeds; one million histories in 100 batches per case. OpenMC scores absorption and all-collision reaction rates with tracklength estimation, normalized per emitted neutron; collision counts may exceed one per source neutron.
- Three synthetic one-group controls use the same finite geometry: absorber, mixed scatterer/absorber and pure scatterer. Absorber agrees with independent high-order angular quadrature at 4 reported SE + 2e-6 absolute. Scatterer absorption is exactly zero. Mixed full absorption must exceed first absorption by 4 SE.
- Prospective midpoint gate: absolute interpolation residual ≤ 4 combined independent MC standard errors + 5e-6 for absorption or 5e-4 for collision count. Monte Carlo SE is propagated with independent interpolation weights. Observed midpoint residuals remain distinct; they are not a uniform interpolation bound. Nuclear-data uncertainty, geometry uncertainty and source-spectrum uncertainty are not estimated.
- Browser admission checks exact family/data/geometry/processing identities, all nodes, distinct seeds, one holdout per interval and every numerical gate. Unsupported energy, missing/stale data, failed controls and out-of-grid requests are withheld. No extrapolation or zero-filled substitute is returned.

The original 12-case run completed in 4.63 s and **failed** qualification. At 4 cm, absorption interpolation residual was 3.2738e-5 per birth (combined MC SE 3.4797e-6), and collision residual was 0.0037178 (SE 0.00057456). The coarse grid missed the curvature introduced by moderation. Original protocol, source, raw XML/HDF5/statepoints and failures remain unchanged in `scientific/neutron-v38/results/first-grid`.

The synthetic exact-zero check also exposed an upstream implementation detail: [OpenMC 0.16 `xsdata.cpp`, lines 90–94](https://github.com/openmc-dev/openmc/blob/v0.16.0/src/xsdata.cpp#L90-L94) replaces zero multi-group absorption by 1e-10 cm⁻¹ to avoid tally divisions by zero. Its tracklength absorption score was 1.174542254126857e-10, equal to `(1e-10 / 0.1) × total-score` to floating-point precision. The separate revised synthetic-control contract verifies that identity within 2e-24; it does not subtract from, clip or relabel evaluated H1 results. The original exact-zero failure remains recorded.

The separately frozen extension `refine-response.py` (SHA256 `cd95cc3df81c0540f8c17ef9899dd68d8836792468b8831b2981c2fbc77d5829`) promotes the old 4 cm holdout to a training node and uses **five entirely fresh** holdouts at 3/5/8/12/16 cm. Histories, statistical/absolute tolerances and geometry remain unchanged; the extension has its own 180 s cap. It completed in 1.83 s: **all ten midpoint gates pass**. This is the versioned `h1-cylinder-ce-v38-r1` packet, with six nodes. Maximum raw observed holdout residuals are 3.9636e-5 absorptions/birth and 0.0035194 collisions/birth; acceptance includes combined MC uncertainty, not a claim that true interpolation error is below the absolute tolerance alone.

NJOY/OpenMC emitted an unsupported continuous-tabular interpolation warning. Raising it as an exception traced it specifically through `_get_photon_products_ace` to the MT102 photon secondary distribution; the audit stack/products are archived. The neutron elastic distribution is separate, and these runs transport neutrons only. Photon energy/dose/heat predictions remain outside scope; the warning is retained rather than suppressed.

The public packet SHA256 is `95589ec0d3c9a217a88172c934de472d5641e81c2fdc6c7083e1f21a510da066`. It is mounted as an independent reference with thickness and reference-birth-rate controls, distinct absorption/collision plots and MC ±1 SE bands. Original failure and refinement are disclosed in its Data & uncertainty panel. Reference rates do not silently consume the target solver's mean neutron energy as if it were a monoenergetic spectrum.

## Generic irradiation/cooldown solver

`dN/dt = A N + S`, with decay rates in s⁻¹, branch probabilities, irradiation-only reaction rates in s⁻¹ and production S in atoms/s. Activity is λN in Bq. Every removal either reaches a specified daughter or an explicit lost-inventory sink. Irradiation transitions and S stop during cooldown; radioactive decay continues.

The browser uses a nonnegative uniformization exponential with scaling/squaring for 1–16 tracked nodes, finite aggregate inventory and `max(outgoing rate, normalized source rate) × interval ≤ 1e6`. Repeated decay rates and stable nodes require no singular divided differences. It rejects nonfinite rates, negative inventories, invalid branches, aggregate/activity overflow and unsupported numerical stiffness; populations are never clipped. The source reservoir is normalized by total inventory/injected atoms to preserve sensible matrix scales.

This small bounded exponential was chosen over an explicit Euler step, which creates negative populations at large rates, and over distinct-rate closed-form Bateman fractions, which become singular at equal decay constants. Actual OpenMC CRAM48 and SciPy `expm` controls were run for explicit chain/source, cyclic-reaction and stiff-cascade matrices; their maximum relative disagreement was 6.14e-12. Browser results pass the separate 1e-8 relative comparison gates against both. This verifies those controls, rather than formally certifying all networks. A full evaluated isotope depletion chain would use that backend, selected reaction data and target depletion inputs; this generic demonstrator does not invent those inputs.

A closed three-node parent → daughter → stable UI exposes half-lives, production, irradiation and cooldown. These are clearly generic scenario inputs. Equal-rate limits, stable growth, analytic source/branching/loss, irradiation-off transitions, conservation, positivity and semigroup splitting are tested.

Independent review found an adjacent arithmetic admission bug: individually finite inventories can overflow when summed, and finite rates can overflow when converted to activity or source-scaled response. The fix checks aggregate inputs and final derived quantities, with regressions. It rejects unrepresentable calculations instead of changing physical populations or silently returning a nonfinite ledger.

## Pending source state

Neutron calculations preserve the last completed target-source snapshot during an asynchronous target update and mark it pending. Export is disabled until the target update finishes. This avoids relabeling accepted output as the requested but unfinished scenario.

## Verification evidence

Dedicated isolated source COPY `/tmp/mass-spinner-neutron-v38-agent`, guest `safe-dev-b89183ad2d06c667`. All dependencies/scripts/tests run through Apple safe-dev; no host repository runtime, home/credential/socket mount or browser-policy workaround.

Final checks use the separate tiny COPY `/tmp/mass-spinner-neutron-v38-checks`, guest `safe-dev-2e07f8a621d942af`: `tsx --test` on decay-network, decay-network-ui, neutron-response, neutron-response-real, neutron-transport, neutron-data and neutron-transport-ui-v35: **37/37 passed**. Targeted strict `tsc --noEmit --target ES2022 --module NodeNext --strict src/neutron-response.ts src/decay-network.ts`: **passed**. These cover actual packet/oracles, fresh-holdout admission, stale/out-of-grid rejection, live DOM controls/MC bands, pending export ownership and ResizeObserver cleanup. They do not constitute browser/GPU observations. Parent runs repository build/typecheck/final suite.

Native outputs are fully exported at `/tmp/mass-spinner-neutron-v38-first-grid-export` and `/tmp/mass-spinner-neutron-v38-refined-export`, with compact canonical records in `scientific/neutron-v38/results`. Original native VM is retained; no scientific VM was deleted. A first bootstrap failed before extraction because upstream's 260.6 MB archive expands to 1.009 GB of mostly unrelated regression tapes. The reviewed 815,718-byte build-source subset preserves exact member hashes and archive identity; the supported upstream subproject build avoids modifying its scientific code. The later host-disk-full incident and canceled read-only export produced no scientific result; source and prior exports remained intact. First bootstrap failure/receipt are retained separately. No upstream full NJOY regression-suite claim is made.

Independent source/analytic review by the charts agent passed seven controls and identified aggregate/activity/rate overflow boundaries, which now reject explicitly with regressions. The separate [native independent report](NEUTRON-INDEPENDENT-V38.md) accepts the **bounded revised family**, rejects the original qualification and preserves empirical calibration/uniform interpolation as **UNKNOWN**. It reconstructs all 17 raw statepoints, 12 independent ENDF checks, 10 fresh refinement gates, 11 browser interpolations/22 rejections, 10 independent SciPy decay cases and all three exact native CRAM matrix/source/time links. No production edits followed the frozen 37-test snapshot.

## Primary sources checked

- [OpenMC neutron transport physics](https://docs.openmc.org/en/stable/methods/neutron_physics.html): successive collision sampling and evaluated elastic angle/energy treatment.
- [OpenMC IncidentNeutron API](https://docs.openmc.org/en/stable/pythonapi/generated/openmc.data.IncidentNeutron.html) and [implementation](https://docs.openmc.org/en/stable/_modules/openmc/data/neutron.html): direct raw-ENDF export is explicitly unsupported; use NJOY processing.
- [NJOY2016 official source, version 2016.78](https://github.com/njoy/NJOY2016/tree/2016.78).
- [NNDC ENDF/B-VIII.1 release](https://www.nndc.bnl.gov/endf-releases/?version=B-VIII.1): inherited bounded H1 member, whose raw identity is rechecked.
- [OpenMC CRAM48 API](https://docs.openmc.org/en/stable/pythonapi/generated/openmc.deplete.cram.CRAM48.html): depletion transmutation matrix convention and seconds-based time evolution.
