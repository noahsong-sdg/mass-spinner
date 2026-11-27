# Fidelity implementation and audit

16 November 2026. **Useful exploratory simulator; not a calibrated Marathon
centrifuge or an experimentally qualified isotope-separation predictor.**
This work fixes concrete defects and connects existing physics. It does not
claim that all missing scientific inputs can be supplied by writing code.

## Implemented

| Problem and cause | Fix and reason for choosing it |
| --- | --- |
| The experimental validator required a calibration condition even for an explicitly no-fit prediction. In simple terms, it forced users to fit before testing an unfitted model. | Add an explicit a-priori design that prohibits calibration/fitted conditions while retaining source, identity, uncertainty, numerical and holdout checks. Existing schema-1 calibration behavior is preserved. Protocol declarations alone cannot prove independence. |
| Recovery was reported when the recovered species had zero feed, making the recovered/feed ratio undefined. CIV also considered an absent species. | Return `null` for absent-species recovery and select CIV only from present species, retaining the separately declared lithium seed reference. Keep routing probabilities available: changing the mathematical domain is smaller and more accurate than inventing recovery or extraction physics. |
| The browser hid existing non-rigid reference results; an attractive interpolated shape could imply dynamics that were never solved. | Expose all 24 retained V98 chord-sample sets with exact metadata and pinned asset/archive hashes. The disclosure is read-only, distinguishes optical centroids from local velocity, and states the ideal-contact singularity. No slider surrogate is fabricated. |
| The live interface did not expose the existing spatial current/species/momentum/heat kernel. Its voltage contacts have different semantics from the two-rotor imposed-current controls. | Add an independently controlled, optional closed argon research experiment using that existing kernel and worker protocol. Plot solved local angular speed, temperature and signed electrode current; export the source-bound trajectory. Preserve the main simulator rather than silently changing its physical meaning. |
| A heavy-gas energy ledger cannot establish electron/heavy-particle heat partition. | Reuse retained LoKI-B++ outputs in an exact-point, unmagnetized applicability screen: signed channels, correct SI normalization, original convergence gates, explicit state provenance and refusal outside the executed domain. An existing-code adapter is justified; an arbitrary heating fraction or magnetic extrapolation is not. This screen does not change the live closure. |

The optional spatial cell is conceptual argon, 1 cm radius × 10 cm length, with
radial common-fluid rotation and r–z electrical currents. Its two equal-mass
labels are passive tracers, **not ions versus neutrals or two isotopes**.
Electrical conductivity, diffusion and gas–wall conductance remain prescribed.
Joule heat is deposited directly into the common gas; electron energy and
ionization are not evolved. Low-density controls do not certify continuum or
gas-wall accommodation assumptions. Shorting after a pulse is explicitly
distinguished from opening the circuit or extinguishing the discharge.

## Adversarial findings corrected

Independent reviewers traced physics, validation, source identity and UI paths.
Concrete fixes include the undefined recovery/CIV domain, no-fit validation,
electron coefficient signs/normalization, nonfinite/underflow refusal and
serialization before exclusive output creation. UI review corrected a pulse
label that confused duration with amplitude and renamed a grounded contact
that was incorrectly called a cathode under reversed polarity. Cancellation,
changed-input invalidation, late replies, source identity and JSON export are
covered by regressions. No numerical gate was loosened.

Two verification-fixture defects were also corrected: absolute decimal-place
assertions at roughly 5e14 seconds now compare relative ratios, and an archive
test copies its fixture rather than making a hard link across filesystems.
Neither changes a scientific tolerance or producer.

Source audit records:
[general review](reviews/fidelity-source-review-20261116.md),
[spatial physics review](reviews/fidelity-spatial-physics-review-20261116.md).
Their source-only status is retained; actual execution is recorded separately.

## Verification evidence

[First complete CI](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43832326328),
commit `409bd963713643df319554b51116dc6aa5c2f1cb`:
1,291 TypeScript tests, 17 electron-screen Python tests and three archive-export
Python tests passed, along with typecheck, build, site and asset checks.

[Spatial integration CI](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43833292908),
commit `7c45cd7770795c495b07d370879b83c1cc24d049`:
**1,308 TypeScript tests and the same 20 Python tests passed**. Exact commands:

```sh
node --import tsx --test --test-concurrency=1 tests/experimental-validation.test.ts tests/fuel-recovery-domain.test.ts tests/argon-reference.test.ts tests/argon-reference-ui.test.ts
node --import tsx --test --test-concurrency=1 tests/fuel-spatial-experiment.test.ts tests/fuel-spatial-experiment-ui.test.ts tests/fuel-worker-v47.test.ts tests/worker-client.test.ts
python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v
python3 -m unittest discover -s tests -p test_argon_reference_export.py -v
node --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

Checks execute in an offline Docker container on an isolated GitHub runner,
limited to 1 GiB and one CPU. The existing locked local V122 study is untouched.
The bundle-size warning remains. CI exercises the real worker dispatcher and
numerical backend, with mocked DOM replies for UI lifecycle tests; **it is not
a deployed-browser, GPU, mobile-layout or visual verification**. New spatial
results currently drive separate plots/export, not the main 3D rotor surfaces.

The short-window three-level angular-speed regression uses the unchanged 1%
time screen plus contraction. Passing it does not qualify temperature, density,
spatial resolution or other operating conditions. Retained startup differences
of 4.63712% in time and 2.88464% in space against 1%/2% targets remain disclosed.
All three new experiment qualification/promotion flags remain false.

## What remains before predictive use

1. **Discharge and energy closure:** admitted magnetized electron transport,
   evolving charge/internal-state energy, electron-to-heavy transfer and
   experimentally supported contact/sheath/wall conditions. The B=0 adapter
   cannot close these equations for a rotating magnetized discharge.
2. **Qualified live spatial response:** joint space/time studies over the
   supported operating envelope and observables, then a shared qualified state
   for the live controls, plots and 3D rendering. Optional research integration
   and conservation identities are not a substitute for this qualification.
3. **Measured validation and separation:** one apparatus-matched measured
   profile with uncertainties, then genuinely withheld operating conditions;
   conservative feed/exhaust transport and measured mixture/outlet results
   before claiming isotope throughput or purity. Closed inventory cuts are
   not demonstrated extraction performance.

Public sources checked do not supply a complete independent Marathon test
packet. Marathon's [reported enrichment demonstration](https://www.prnewswire.com/news-releases/marathon-fusion-demonstrates-lithium-and-hydrogen-isotope-enrichment-using-proprietary-plasma-centrifuge-technology-302861336.html)
is relevant evidence of the technology, not sufficient operating data and
uncertainties to validate this implementation. The retained 1979 argon optical
comparison is retrospective and remains mismatched; local Ar/Xe concentration
measurements cannot be relabeled as outlet performance or lithium validation.
These are genuine missing inputs/physics, not failures that tests or plausible
graphics can erase. See [experimental gate](EXPERIMENTAL-VALIDATION-GATE.md) and
[live-model qualification](LIVE-MODEL-QUALIFICATION.md).
