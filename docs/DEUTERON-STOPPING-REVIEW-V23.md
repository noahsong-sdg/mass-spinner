# Deuteron stopping: sources, code choice and evidence boundary

Reviewed 7 November 2026. This report distinguishes implemented equation reuse
from measured LiT calibration. No direct 20–500 keV D-in-LiT measurement table
was established by this search. That is an access/coverage result, not proof
that no such measurements exist.

## Root cause and bounded correction

In `fusion-reactor.ts`, the legacy source assigns a fixed fractional energy
loss and an independent homogeneous tritium column. Each depth interval gets
the same energy decrement, regardless of energy or material amount. The nuclear
reaction probability is integrated correctly within that prescribed path, but
the path is not a material stopping calculation. Simply, thicker material and
slowing are independent knobs, so the source cannot infer the energy that ions
actually carry to each depth.

The justified next scenario is a fixed 1:1 Li/hydrogen-isotope matrix with
energy-dependent electronic and nuclear mean stopping per formula unit. Its
material column sets slowing; tritium loading sets the reactive fraction. This
is more coherent than a free linear-loss fraction, but remains a **model-based
atomic mixture**, not measured compound LiT data. Keeping it optional preserves
the legacy benchmark and exposes model discrepancy instead of silently changing
the meaning of existing inputs.

## Best existing options

| Resource | Useful role | Important boundary / deployment tradeoff |
|---|---|---|
| [Geant4 low-energy hadron/ion ionisation](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html) | Open, inspectable empirical low-energy Z=1 stopping; independent transport/range benchmark later | Deuterons use mass/velocity scaling, not direct ICRU73 heavy-ion data. A source adaptation is not a full toolkit run. |
| [SRIM/TRIM](https://www.srim.org/SRIM/SRIMLEGL.htm) | Established BCA comparison of stopping, ranges, implantation and recoil profiles | Proprietary PC software; noncommercial use/copy terms and commercial licensing conditions. Do not assume outputs are freely reusable in every commercial derivative. It is a comparator, not LiT experimental truth. |
| [RustBCA](https://github.com/lcpp-org/RustBCA) | Open prompt implantation, reflection, sputtering and collision-cascade reference; library interfaces support later coupling | GPL-3.0. Default material examples need verification. Atomic Bragg stopping/selected correction factors and binding energies are model inputs; no LiT chemical calibration is provided automatically. |
| [IAEA stopping database](https://www-nds.iaea.org/stopping/) | Best primary compilation to locate experimental electronic stopping data and original references | Electronic only; nuclear stopping is subtracted/negligible. Its page advertises version2026-09 and an API/download. Bulk download returned HTTP403 in the isolated guest, so exhaustive H-isotope/Li/H-compound coverage was **not** audited. No access workaround attempted. |
| [NIST PSTAR](https://physics.nist.gov/PhysRefData/Star/Text/PSTAR.html) | Reproducible proton electronic/nuclear/range cross-check and material definitions | Proton tables are not deuteron/LiT measurements. Equal-velocity isotope scaling is a declared approximation, not an extra data source. |
| [libdedx](https://github.com/APTG/libdedx) | Convenient GPL-3 C/WASM interface to existing stopping tables | Its documentation explicitly distinguishes direct tables from compound Bragg/stoichiometric fallback. Wrapping tables does not add deuteron/LiT experimental coverage; not selected as another runtime dependency here. |

Geant4's reusable formula is preferable for the immediate browser scenario
because its coefficients, units, low-energy continuation and license are
inspectable without a proprietary runtime. RustBCA is a stronger next offline
tool for angular paths and implantation; it should supply provenance-bearing
profiles, not be treated as a measured table. A full Geant4 run and SRIM
comparison remain distinct future checks.

## What was adapted

Pinned upstream: Geant4 **v11.4.0**, resolved commit
`b4a16de652ec244f7a0ecc0a5cacfee21930bf75`. Actual source files, license,
download URLs and SHA256 hashes are archived in `scientific/stopping-v23`.

- [`G4BraggModel.cc`](https://github.com/Geant4/geant4/blob/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4BraggModel.cc):
  the H and Li atomic ICRU49 coefficient rows, including source `float`
  rounding, low/high harmonic interpolation and the source's below-10 keV/u
  square-root continuation. Electronic stopping is the sum for one Li and
  one hydrogen-isotope atom at the scaled projectile velocity. This selects
  the atomic-mixture branch deliberately; no LiT chemical factor is claimed.
- [`G4ICRU49NuclearStoppingModel.cc`](https://github.com/Geant4/geant4/blob/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4ICRU49NuclearStoppingModel.cc):
  all104 reduced-stopping table points, source linear interpolation and Z=1
  reduced-energy/mass conversion, with fluctuations disabled. The result is
  mean energy transfer to recoil nuclei, not resolved trajectories or damage.
- `src/deuteron-stopping.ts`: returns electronic, nuclear and total cross
  sections in **keV m² per nominal LiT formula unit**. Source units
  eV/(10¹⁵atoms/cm²) convert with factor10⁻²². Mass numbers D=2u, Li=7u,
  T=3u are explicit approximations consistent with the existing nuclear
  kinematics; optional target masses permit an explicit isotope comparison.

The internal energy domain is `0.5/0.6` through500keV laboratory energy so the
same path can be integrated down to the existing D–T cross-section fit limit.
The intended incident scan is20–500keV. This is a model domain, not a measured
accuracy range. A trajectory leaving the nuclear fit domain must be rejected
or explicitly bounded; assigning its omitted fusion tail zero without reporting
that omission would be unjustified.

This product includes software developed by Members of the Geant4
Collaboration (http://cern.ch/geant4). Adapted Mass Spinner functions are
clearly distinguished from the toolkit. The unchanged license is published
as `web-assets/GEANT4-LICENSE.txt` and retained with the upstream archive.

## Material evidence and uncertainty

[Malbrough et al., *Deuteron stopping cross sections in transition metal
hydrides*](https://doi.org/10.1016/0168-583X(87)90489-7) measures40–200keV
deuterons in eight metal deuteride/tritide systems and reports deviations from
Bragg additivity. Lithium is not among those host metals. It supports treating
compound effects as a real uncertainty, not transferring TiT coefficients
to LiT or assigning a universal percentage correction.

[Processes at lithium-hydride/deuteride surfaces upon low energy impact of
H/D](https://www.frontiersin.org/journals/physics/articles/10.3389/fphy.2023.1105194/full)
studies1–100eV surface reflection/retention/sputtering with molecular dynamics.
It is relevant to chemistry and low-energy surface limits, but is not stopping
data for20–500keV incident deuterons.

[The stopping of deuterons in lithium](https://publications.jrc.ec.europa.eu/repository/handle/JRC4035)
concerns a52MeV beam and target optimization. That energy and metallic target
cannot calibrate low-energy compound LiT. Muon-in-LiH and plasma LiH stopping
studies returned by searches also cannot be relabeled as cold solid D/LiT data.

No empirical error band is assigned. Varying loading or comparing two models
is a sensitivity/discrepancy study, not a confidence interval. Validation needs
identified material composition/density/temperature, measured stopping/range
or energy-loss distributions, independent beam charge/species calibration,
and neutron yields with known isotope depth profiles.

## Reproducibility and pending integration

The original source bodies are compiled in an isolated Apple safe-dev VM with
small normalized-unit/type shims by `build_reference.py`. That reference is
not a full Geant4 installation: it checks faithful adaptation of the chosen
branches and units. Browser-source tests compare against its exported fixture
and physical/domain limits. Independent BCA comparison and integrated source/
loading conservation studies belong to separate agents and parent release
gates. Passing these checks cannot establish experimental accuracy.

The narrow implementation gate passed **4/4 tests**, followed by
`npm run typecheck` exit0 in safe-dev guest `safe-dev-8275325518ee9e7c`,
copied from `/tmp/mass-spinner-stopping-module-v23` (six bounded files).
Module SHA256 `b717daabad65ebed9998bbb0eeed57b6666ac831a7b5270d1e07830e8764b892`;
test SHA256 `a5d0f5db968ca81a5ff21705652b1dbb29a77ccc62cdbee3084491f186c6faa1`;
compiled fixture SHA256
`3b28ca84a940f9d559a60c9848860e82b8a3599b483ff30a34f510b39731aa4e`.
Commands: `safe-dev -C /tmp/mass-spinner-stopping-module-v23 init`,
`run --online -- npm ci --ignore-scripts`,
`run -- ./node_modules/.bin/tsx --test tests/deuteron-stopping.test.ts`,
and `run -- npm run typecheck`.

The fixture's original-source C++ build ran separately offline in guest
`safe-dev-66b9adb1c0eeb3fa` via
`safe-dev -C /tmp/mass-spinner-stopping-data-v23 run -- python3 reference/build_reference.py`.
Generated C++ SHA256
`40e340a247a840beff5dc7ec366af9a9a568eb60a53d5f30f6ca1686230748de`.
At100keV the resulting electronic/nuclear cross sections are respectively
`1.4435118903267615e-21` and `2.889746170469102e-24` keV m² per formula unit.
Full application checks and deployment are parent gates, not implied here.
