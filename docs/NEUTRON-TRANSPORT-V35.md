# Marathon neutron first-flight model and OpenMC reference, v35

9 November 2026 UTC. The browser now supports material first interactions after
geometric interception. It does **not** solve the full scattered neutron field,
shielding effectiveness, calibrated detector response or radiation damage.
Actual OpenMC multiple-scattering reference cases are published separately.

## Execution path and root cause

The old `fusion-ui → isotropicDiskReference` path computed a vacuum solid angle
and plane incident current. It had no material optical depth or channel state.
In plain terms, reaching a sample was the end of the calculation: a neutron
could not scatter or be absorbed there. Changing the displayed neutron rate
cannot supply those missing interactions.

The new `simulateFirstFlightNeutrons` path resolves an isotropic point source
and coaxial, common-radius finite cylindrical layers. Each ray can leave the
rear face or the cylindrical side. The shared radius is `sqrt(area/pi)`, and
each layer has a thickness and macroscopic total/absorption coefficients at
the declared source energy. These inputs can be custom assumptions or the
separately identified H-1 reference below. They are not inferred from the 3D
render or labeled as Marathon hardware properties.

For path length ell in a layer,

```
P_uninteracted = exp(-Sigma_total ell)
P_first_absorption = P_enter [1-exp(-Sigma_total ell)] Sigma_abs/Sigma_total
P_first_scatter = P_enter [1-exp(-Sigma_total ell)] (1-Sigma_abs/Sigma_total)
```

The zero-total limit has zero interactions. `expm1` preserves tiny optical
depths. No subtractive inventory repair or clipping is used. Layers are
nonmultiplying: total means scattering plus absorption, excluding fission and
secondary neutron production. Scattered neutrons remain in an **unresolved**
ledger; they are not counted as absorbed or escaped. Source-missed directions,
uncollided escape and the two first-interaction channels sum to one.

Conditional detection probability applies only to first absorptions. It is an
explicit assumed response, not a measured efficiency curve or prediction of a
fast-neutron recoil detector. No outgoing spectrum, photon transport, dose,
activation or displacement-per-atom conversion is invented.

This narrow model was chosen over a nominal full browser Monte Carlo without
reviewed energy-angle data. It gives stable, fast controls and an exact
Beer–Lambert limit; the independent OpenMC calculation exposes what this
bounded choice omits. The [OpenMC neutron-physics methods](https://docs.openmc.org/en/stable/methods/neutron_physics.html)
document the exponential free-path and reaction-channel treatment.

## Reviewed far-field defect

An independent actual regression found that computing the transverse angle
from `sqrt((1-mu)(1+mu))` fails when a very small solid angle makes `mu` round to
one. In simple terms, the entrance probability remained nonzero but every ray
was falsely straightened, suppressing lateral escape in a long narrow sample.
For radius 1 m, distance/thickness 1e8 m and total=absorption=1e-8 m^-1, the old
conditional absorption was 0.632120559 versus independent 0.352638287.

The fix retains `delta=1-mu` directly from the rationalized solid angle and
evaluates `sin(theta)=sqrt(delta(2-delta))`. This preserves the small angle
without limiting legitimate geometry or changing ordinary ray physics.
The original independent red witness remains retained; the corrected
independent rerun passed the unchanged gate. Own production regression also
passes. Optional defaults apply only to omitted fields; explicit null angular
counts or detection probabilities reject.

Zero emission has no defined mean birth energy. `sourceEnergyMeV:null` is
accepted only at zero source rate and preserves null energy and exact zero
rates. Positive emission with null energy rejects. This is a physical
undefined boundary, not a fallback neutron energy.

## Actual existing-code benchmark

OpenMC 0.16.0 was installed and executed in Apple safe-dev, using the conda-forge
`nodagmc_nompi_py312h4b84179_3` binary. All 135 packages have recorded exact
URLs and SHA256 digests. The OpenMC package digest is
`88003edaab76edd6258267b2dcae68c87181483351a0efa89f26d37746561e8b`.
The upstream [installation guide](https://docs.openmc.org/en/stable/usersguide/install.html)
documents the conda-forge installation route.

Three **500,000-history** fixed-source calculations used 50 batches, seed71935,
two threads, isotropic origin source, radius/front/thickness 0.1 m and an outer
vacuum sphere radius 1 m. The single broad energy group has synthetic total
10 m^-1, isotropic scattering and absorption 10/4/0 m^-1. These are deliberately
specified benchmark coefficients, **not evaluated material data**. Actual raw
XML, HDF5 cross sections, statepoints and logs are archived. The run took
0.6963 s after installation; no browser full-Monte-Carlo claim follows.

| Case | OpenMC absorption/source, mean ± standard error | Browser first absorption/source |
| --- | ---: | ---: |
| Pure absorber | 0.0663520 ± 0.000389623 | 0.0663861840 |
| Mixed scatter/absorption | 0.0356100 ± 0.000317725 | 0.0265544736 |
| Pure scatter | 0 ± 0 | 0 |

The prospective pure-absorber gate was `|difference| ≤ 4 SE + 2e-6` absolute;
it **passes**, at about 0.0877 standard errors. Independent radial Simpson
32768→65536 refinement changes by 2.78e-17 and gives 0.0663861831916544.
The browser's 4096-angle result differs by 8.47e-10. Its last angular doubling
changes the result by 8.99e-11; this is sensitivity, not a rigorous error bound.

The mixed case is deliberately **not an equivalence gate**. OpenMC transports
multiple scatters and predicts 0.00905553 additional absorptions per source
relative to first absorption alone. The pure-scatter OpenMC mean collision
count is 0.117602 ± 0.000824970, while first-flight collision probability is
0.0663861840. Repeated events are not a probability ledger. These witnesses
demonstrate why the browser result cannot stand in for total scattered flux
or full shielding response.

Compact public reference: `/marathon-reference/neutrons-v35.json`, SHA256
`88784dc80330d8cad6f7ff2f56a8acbe296400d4455acec118cb6f97eca0e0b6`.
It includes source/material geometry, per-case means/SE, inputs/statepoint and
environment hashes, first-flight comparisons and explicit coverage limits.
The statistical intervals concern Monte Carlo noise, not physical data error.

## Evaluated H-1 nuclear-data reference

The official [NNDC ENDF/B-VIII.1 release](https://www.nndc.bnl.gov/endf-releases/?version=B-VIII.1)
metadata identifies `neutrons-version.VIII.1.tar.gz`. A bounded stream extracted
its 671232-byte `neutrons-version.VIII.1/n-001_H_001.endf` member; the member
SHA256 is `3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af`.
The entire 343.725 MB archive and its global checksum were **not** downloaded
or verified. Two initial guessed individual-file URLs returned 404; these
failures do not imply that evaluated data were unavailable.

The actual OpenMC ENDF parser exports all 153 original MF3 points for each
channel, retaining native INT/NBT metadata: total MT1 uses INT5/2 at NBT9/153;
elastic MT2 uses INT2/NBT153; capture MT102 uses INT5/2 at NBT33/153. The
20,044-byte public native artifact is
`/marathon-reference/h1-endfb81-v35.json`, SHA256
`bac95d792b4b4c2db71791d15df68c7f324fbf238ad8715f501aac7dc9132f43`.
The earlier seven-point summary remains archived but is not an interpolation
dataset. `extract_h1.py` re-exports the exact native artifact byte-for-byte.

`neutronHydrogenReference` implements ENDF lin-lin/log-log interpolation and
one-based region boundaries, consistent with the
[ENDF-102 manual](https://www.nndc.bnl.gov/endfdocs/ENDF-102-2023.pdf).
The supported fast lookup domain is 0.1–20 MeV without extrapolation. At
14.1 MeV, total/elastic/capture are 0.68302644 / 0.68299688 / 2.9524228e-5 barns.
Macroscopic coefficients are `N_H sigma_barn 1e-28 m²`; the H-1 number density
is an explicit scenario input. The evaluation's tabulated total and summed
channels differ slightly from decimal table rounding; no renormalization is
applied. This is isolated H-1 data, not a polyethylene model, LiT compound
calibration, detector response or damage function.

## Exact checks and remaining scope

The copied native test stage `/tmp/mass-spinner-neutron-native-v35`, guest
`safe-dev-d6e6dc121dec1e76`, executed:

```
safe-dev -C /tmp/mass-spinner-neutron-native-v35 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-neutron-native-v35 run -- ./node_modules/.bin/tsx --test tests/neutron-data.test.ts tests/neutron-transport.test.ts
safe-dev -C /tmp/mass-spinner-neutron-native-v35 run -- ./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/neutron-data.ts src/neutron-transport.ts
```

**14/14 tests and strict typecheck pass.** Checks cover actual upstream parser
oracle energies, all native fast-grid knots, ENDF region boundaries, stale
pre-native schema, no extrapolation, density/units/vacuum limits, normal and
oblique attenuation, layered channel/detection ledgers, finite-cylinder angular
refinement, tiny/opaque limits, far-field lateral escape and zero/null-energy.
Earlier 8/9-test snapshots and all unique outputs are retained separately.

OpenMC execution used `/tmp/mass-spinner-openmc-v35`, guest
`safe-dev-c9687b7a8346dbda`. `benchmark.py` performs physical MC, `compare.py`
does saved-data arithmetic, and `extract_h1.py` parses existing evaluated data.
All run offline except explicit dependency/data download invocations. Original
bootstrap failure and the launcher concurrency denial are retained in
`scientific/marathon-v35/neutrons/EXECUTION-NOTES.md`.

No host project code, host credential/home mount or control socket was used.
Final raw exports and copied sources remain available; no owned physical job
is active. Parent integration owns full app/build, UI and deployment checks.

Full fidelity still needs energy-angle-dependent multiple scattering for
actual device materials, secondary production, verified detector responses,
damage data and held-out irradiation measurements. These are separate from
the demonstrated first-flight implementation and external benchmark agreement.

The separate [independent raw audit](NEUTRON-INDEPENDENT-V35.md) owns its
HDF5/XML/ENDF reconstruction and final conclusions. Its independent first result
was exported before producer-summary ingestion, SHA256
`ebaa2ddad2658b19f161e79cf970d03fe226184a7a04ca0a05549b22667e44fd`.
Actual exported bytes were checked before reference pointers were supplied.
