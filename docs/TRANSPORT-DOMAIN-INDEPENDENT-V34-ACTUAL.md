# Independent v34 actual domain-witness review

**The observed encounter-domain crossings are arithmetically correct. They remain outside the existing0.1 boundary.** A five-marker heavy-ion cell causes the largest crossing, and a13-marker cell also crosses. Neither the earlier four-marker explanation nor removal of one marker explains these away. This is one prospectively selected worst-case diagnostic, not an additional convergence replicate or a proof that the continuum plasma is magnetized.

## Verified provenance and physical equivalence

The coordinator released saved-data arithmetic only after the single full200µs passive replay completed. This reviewer performed **zero physical simulations**. Checked the exact supplied bytes:

| Artifact | SHA256 |
| --- | --- |
| `result.json.gz` | `26ab5a0cb8122620dad108d8e6a34ab5541cda10c5bfdf34286b7629a0856498` |
| `domain-witnesses.json` | `b0de6665a46d1f0b995abedc1f8d5130181ecde27e3cf5c050cca422dcad774f` |
| `instrumentation-equivalence.json` | `ca59d75c56855f202137c7c628dfff315f1f6a54184dba72388226d4d533ab10` |
| `reference/run.json.gz` | `d0f974771f13d1f0a3c8c439d44c4079f8c8ac8c3c998790c3ca509637053651` |

Independently confirmed physical SeedRun equality after excluding **only `sourceHash` and `durationMs`**, including type-sensitive canonical JSON equality in addition to parsed value equality. Runtime-map-derived source identity is `789c8197797140ded07e72c81b85da64d3849b9c36b872cd272cc32fa41a91a4`; acceptance reference identity is `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`. The selected case is `N32768-r6-z3-h100`, seed505, Philox4x32-10, research mode, ending at200µs. The release marker is reference-hash-bound and permits exactly one physical run. Its `selectedReferenceSha256` field was explicitly translated into the sealed independent arithmetic function's `referenceSha256` input schema, preserving the original marker hash; no authorization was inferred.

The independent first result was exported **before** reading the producer's numerical conclusions: `/tmp/mass-spinner-domain-independent-v34-first-actual-export/independent-actual-readout.json`, SHA `fa423d17b285ea3a48f7566efd95a9ec18342776a2388ce744975d94aafde444`. Later comparison to producer readout `698f9a290e82d0fdf2336d6ba2c14439fc8677c8db2efdc7701d714b28e1115e` passed for all five cells, pair quantities, direct distinct-pair identities, leave-one-out ranges and both sampled exposure measures.

## What independently reconstructed cells show

Used the already sealed, production-independent80-digit Decimal implementation and direct pair sums. All five captured cells contain one present species; therefore their contributing representative pair is a self-species pair with zero interspecies drift. Bessel temperature, exact distinct-pair RMS speed, charge density, screening, coupling, impact cutoffs/log, gyrofrequency, annular volume, marker weight, position membership and saved observed maxima all match the capture at the predeclared arithmetic tolerance.

| Timeµs | Speciesu | Markers | T,eV | Ion density,m⁻³ | eta | Fixed-density/fraction LOOeta |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|94.9|40|4|1.57697|2.39702×10¹³|0.102857|0.090150–0.168066|
|167.7|84|5|0.0563858|3.99503×10¹³|0.290754|0.255550–0.341360|
|170.3|84|13|0.184181|7.79031×10¹³|0.115205|0.111290–0.125129|
|172.9|84|7|0.378335|4.19478×10¹³|0.109541|0.100550–0.181422|
|174.2|84|4|0.624161|2.39702×10¹³|0.112820|0.098932–0.184139|

All are in the fixed outer annulus r=0.166667–0.2m. The worst cell has z=0–0.15m and full volume0.00575958653m³. The remaining four have z=0.2–0.4m and volume0.00767944871m³. Each marker carries4.60194236×10¹⁰ physical ions from the declared pulse loading. Density uses the **full fixed annular volume**; it is not estimated by shrinking to observed particle support. At the worst snapshot the five warning-cell markers are0.000243998 of20,492 active markers, and the saved unresolved fraction is0. Its actual radii0.166882–0.171500m occupy only part of the ring; that observation does not authorize changing the collision volume.

For the worst cell, independently reconstructed g=623.378272m/s, electron Debye length2.62993027mm and omega=68,918.0944s⁻¹ give eta=0.29075409077141053. The reference field is0.06T and prescribed electron temperature5eV. The scalar diagnostic's numerator is enlarged by low density, while its denominator is reduced by the low **sampled** thermal spread. Other local limits pass: coupling0.00140729, estimated Coulomb log12.6409 and electron Debye population3.04398×10⁶. Thus this particular warning is an encounter-scale-separation failure, rather than a coupling, screening-population, log or arithmetic failure.

This identifies the immediate numerical cause of the flag. It does **not** establish whether the cold outer-cell subset represents continuum evolution, phase-space selection, correlated marker statistics or sampling fluctuation. The five-marker and13-marker cases require new evidence of their own; no four-marker-only argument is valid. No silent floor, support-dependent volume or second Bessel correction is justified.

## Sensitivities and remaining limitations

The worst cell's leave-one-out range stays0.255550–0.341360, and the13- and seven-marker cells also remain above0.1 for every deletion. Four-marker cells can move across the threshold. These calculations hold physical density and species fractions fixed and change only sampled moments. They are **algebraic sensitivity, not confidence intervals**, independent replicates or newly valid cells; deleting from four markers leaves only three, below the resolved-state requirement. Correlated finite-marker evolution further prevents an automatic IID uncertainty interpretation.

Conditional static all-ion screening gives eta0.0307037 for the worst cell; across the five cells it ranges0.0217147–0.0503654. This sensitivity adds equilibrium ion charge response and substantially shortens screening when sampled ions are cold. It does not demonstrate the correct dynamic dielectric response for this evolving, drifting/anisotropic mixture. The actual electron-screened convention and0.1 gate remain unchanged.

There are155 saved snapshots, five with captured crossings, and five captured warning cells total. The trapezoid sampled resolved-warning and crossing-cell exposure fractions both equal5.2240399554×10⁻⁶ of active marker-time. This small **sampled** fraction does not waive the worst-case gate or bound continuous-time encounters. Unresolved cells, unsampled times, velocity tails and all unselected cases remain separately unqualified.

Captured velocities are already cylindrical. Independent reconstruction establishes their moments and finite-set pair identities. The Cartesian-to-cylindrical seam has the separate pinned source and rigid-rotation synthetic evidence described in `TRANSPORT-DOMAIN-INDEPENDENT-V34.md`; its original Cartesian inputs were not captured, so no actual-data inverse verification is claimed. These are moment-estimated species pairs, not a record of randomly executed individual scattering partners.

## Exact isolated commands

All actual arithmetic ran offline in dedicated Apple safe-dev guest `safe-dev-0ea9e44e74892e9c`, stage `/tmp/mass-spinner-domain-independent-v34-actual`. No physical solver or project dependency was imported. Unique outputs were exported before replacement syncs. Final export: `/tmp/mass-spinner-domain-independent-v34-final-actual-export`.

```
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-domain-independent-v34-actual run -- python3 review_actual.py
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-domain-independent-v34-actual run -- python3 summarize_actual.py
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-domain-independent-v34-actual run -- python3 compare_producer.py
```

All three exited0. The first independently reconstructed all five warning cells; the second derived the table, geometry and sensitivity interpretation; the third passed five direct distinct-pair checks and cross-review comparisons. The original10-test synthetic preparation and its9-file seal remain unchanged. This diagnostic adds no acceptance replicate, changes no gate and warrants no production patch. Further qualification needs independent particle/spatial/time studies or a justified magnetized/dynamic-response model, rather than deletion of an accurately computed warning.
