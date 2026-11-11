# Marathon centrifuge: public-spec learning coverage

9 November 2026. This adds a dedicated partially ionized centrifuge to Marathon, alongside Beam target and Future blanket. It does not reproduce a proprietary design specification or qualify a real machine.

## What was missing and why

The existing Models lithium preset solves a fully ionized equilibrium problem; the existing Marathon apparatus was a beam–target neutron source. Neither computes the main centrifuge mechanism in Marathon's public disclosures: a driven minority ion population transferring angular momentum to a mostly neutral gas. In plain terms, the previous centrifuge had the wrong working population to explain this design.

The fix is a separate worker-backed neutral-centrifuge path, with its own accepted configuration, plots, selectable 3D hardware and export provenance. Relabeling the old equilibrium would retain the wrong physics. A full discharge/CFD solver would require coefficients and operating data the public sources do not supply. An exact, bounded two-rotor reduction makes the key balances inspectable without invented chemistry or performance factors.

## Source coverage

Sources checked: [WO2026064411A1](https://patents.google.com/patent/WO2026064411A1/en), especially §§13–29; reproduced Description/Claims of WO2026136752A2 through an explicitly identified [text mirror](https://eureka.patsnap.com/patent/WO2026136752A2), especially §§37–46; [Marathon's fuel-cycle explanation](https://www.marathonfusion.com/fusion-energy/); [NIST/Hicks lithium vapor pressure](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=4). The newer primary patent endpoints were unavailable; the mirror is not independent experimental evidence. Company milestones are company statements, not an open calibration dataset.

| Public concept | Interactive representation | Qualification |
|---|---|---|
| Partial ionization and neutral entrainment | Independent ion/neutral spin-up, reciprocal momentum exchange, assumed collision rate and ion fraction | Fixed uniform-density inertias; no ionization or electron-energy closure |
| Radial current crossed with axial B | Annular-current torque, matching electrode boundaries, B/current/annulus controls | Prescribed current and effective perpendicular conductivity |
| Strong B with lower discharge current | Matched-torque magnetic scan and resistive demand | Holds geometry, conductivity and torque fixed; fixed-current results differ |
| Electrical and thermal burden | Mechanical input, slip dissipation, wall drag, Ohmic input and signed fixed-temperature thermal-control demand | Wall drag is assigned to the thermal-control load; no evolved thermal solution or coolant qualification |
| Localized drive and reduced interior shear | Adjustable drive annulus, separate rigid rotors, source-linked inspection | Imposed rigid profiles; no solved shear, turbulence or stability optimization |
| Neutral centrifugal mass separation | Bulk-normalized radial density references; Li6/Li7, D/T, He3/He4 and fuel/ash pairs | Equilibrium at computed neutral speed; not transient extraction |
| Purity versus recovery | Finite-radius inventory cuts, paired products, exact empty-product handling | Inventory cuts do not establish continuous outlet flow |
| Countercurrent staging | Feed-stage selector, forward inner flow, returning outer flow; both exits and internal circulation retained | Identical ideal stages, equal-turnover routing; geometry partitions are schematic overlays in one reference vessel, not an as-built cascade envelope |
| One-outlet differential pumping | Separate configuration, species partial pressures, throughput and effective speed, composition and selectivity | Common assumed S and C for both species; linear boundary law and equilibrium rotor; no flow back-reaction |
| Conductance-limited exhaust | Adjustable inlet conductance and downstream pump, nonrotating series limit | Effective inlet speed cannot exceed C; dimensions do not generate an unqualified vacuum-flow conductance |
| Lithium surface management | Separate gas/liner temperatures, refractory liner, signed liner heat leak, NIST saturation curve | ≥700°C is a disclosed embodiment, not a universal condensation threshold. No condensation kinetics or wall-lifetime prediction |
| Molecular versus atomic fuel | D/He compared with nearly equal-mass He/D2 | No simulated dissociation chemistry |
| CIV and ionization seeding | Relative slip/CIV and separate nominal wall-speed/CIV; optional Li-seeded reference | Diagnostic only; no clipping or predicted ionization/discharge stability |
| Recycling delay and tritium inventory | Separate burned/injected fraction, loop delay, gross and unburned processing inventories | No inferred burn fraction, whole-plant stockpile, TBR or economic forecast |
| Materials and connections | Selectable detailed SI geometry, explicit material assumptions, inlet/outlet/cooling/drive/hot-liner roles | Conceptual construction; no as-built dimensions or verified lifetime |

Alternative disclosed drive methods and selective membranes are options in the public architecture, not interchangeable numerical closures. They remain source context rather than invented performance sliders.

## Equations and numerical choices

The neutral volume-mean pressure fixes `N_n=pbar V/(kT)`; the prescribed ion number fraction gives `N_total=N_n/(1-f_i)`. Uniform reference inertias are `J=Nmbar a²/2`, `J_i=f_i J`, `J_n=(1-f_i)J`. Reciprocal friction is `Gamma=J_i nu_in`, neutral boundary drag `D=J_n nu_wall`.

```
J_i dOmega_i/dt = tau - Gamma(Omega_i-Omega_n)
J_n dOmega_n/dt = Gamma(Omega_i-Omega_n) - D Omega_n
tau = I B a²(1-f_annulus²)/2
P_electric = tau Omega_i + I² ln(1/f_annulus)/(2 pi L sigma_perp)
dK/dt = tau Omega_i - Gamma(Omega_i-Omega_n)² - D Omega_n²
```

The constant-coefficient affine 2×2 system is solved exactly from rest. Stable determinant/eigenvalue evaluation and `expm1` avoid cancellation; explicit zero-loss limits avoid singular inversion. An independently written RK4 integration checks velocities and integrated work/dissipation. The displayed instantaneous power identity alone would be an insufficient time-integration test.

At the final neutral speed, `beta_s=m_s v_n²/(2kT)` and `y=r²/a²`. Each species' reference density is normalized independently: `p_s(y)=beta_s exp[-beta_s(1-y)]/(1-exp[-beta_s])`. Independent quadrature checks this normalization and finite cuts. Empty product purity is undefined (`null`), never fabricated. Very strong centrifugation can underflow both local species densities; that point's composition is withheld rather than assigned a color suggesting known purity.

Countercurrent routing solves the simultaneous tridiagonal species balances with absorbing product/tails boundaries. It is an ideal visiting-flow network, not an axial transport solution or `alpha^N` purity rule. `a²/D_radial` is only a dimensional mixing scale, not an exact relaxation time; the UI compares spin-up and pumping turnover with it without imposing an empirical relaxation multiplier.

For each species: `Q_s=S p_wall,s`, `p_up,s=p_axis,s+Q_s/C`, `S_eff,s=Q_s/p_up,s`. Species throughput and partial-pressure sums recover the total boundary balance. The inlet-conductance ceiling applies separately. The helium/fuel speed ratio is conditional on this boundary law; no reactor burn efficiency is derived from it.

NIST: `log10(P/bar)=4.98831-7918.984/(T/K-9.52)`, only 298.14–1599.99K. Outside that interval the saturation reference is unavailable. Fuel-loop bookkeeping uses `burned/injected=beta`, `exhaust=burn*(1/beta-1)` and inventory equal to the named stream rate times delay.

## Integration defects found during adversarial review

| Problem | Technical and plain-language cause | Root-cause fix and choice |
|---|---|---|
| Zero-collision/zero-drag NaN | Singular all-zero rate matrix; the general spectral quotient divided by zero | Exact ballistic branch. Preserves the valid zero-loss physics rather than rejecting it or adding epsilon drag |
| Finite inputs could overflow derived state | Finite coordinates do not guarantee representable intermediate powers/ratios | Reject nonfinite derived results before acceptance/export. No exponent clipping that would conceal a changed physical solution |
| Pump inventory counted ions as neutrals | Pressure population was ambiguous | Explicit neutral-pressure input, matching neutral inertia and `turnover*Q=pbar V` |
| Total pumping hid the design's species benefit | Aggregate pressure cannot expose He/T selectivity | Per-species boundary balances and ratios using the same declared law |
| Picture disagreed with drive and collection controls | Central cathode and fixed pickup were drawn independently of the accepted annulus/cut | Matching annular electrodes and cut boundary; distinguish auxiliary ignition hardware and schematic staging |
| UI offered absent components | A global catalog ignored accepted topology | Accepted application/pair/stage-dependent menu and cleared stale choices |
| GPU failure erased valid science | Graphics loading shared the numerical rejection block | Preserve accepted plots/export and report the separate graphics error |
| Disposal could request new work | Public activation and event handlers had no terminal lifecycle boundary | Explicit disposed checks; no silent worker recreation after cleanup |
| Saved links changed meaning or lost valid stage coordinates | New Marathon default and dynamic bounds were applied independently | Pre-centrifuge v2 links retain Beam target; validate the whole incoming stage/topic batch before mutation, then hydrate bounds and values together |
| Scientific defaults drifted in Chromium | Native range steps quantized logarithmic coordinates and lithium abundance before the worker read them; some starting numbers were rounded | Continuous logarithmic coordinates and a composition step containing the intended abundance preserve exact defaults without changing the physics to match rounded inputs |
| Stage scan confounded feed placement with stage count | Shorter networks silently moved the selected feed to their end; two inputs changed together | Scan only valid networks containing the selected feed stage and hold that stage fixed. This isolates stage-count effects rather than merely annotating a confounded comparison |

The feature is split into a physical core, UI/workspace integration, geometry and independent tests, each separately reviewable. No collision backend or beam–target solver is repurposed.

## What is still required for a predictive design simulator

Measured current/velocity/temperature profiles and operating uncertainties; consistent electron/heavy energy, ionization/dissociation/recombination and conductivity; validated ion–neutral momentum and wall transport coefficients; transient radial/axial species transport with real ports and flow back-reaction; molecular/viscous/transitional conductance; lithium vapor transport, condensation, erosion and material life; resolved shear/instability and magnet engineering; and a declared reactor/divertor closure before pumping results can predict burn efficiency. These are missing evidence/physics, not cosmetic features to fill with unsupported constants.

## Validation record

Independent review files: `docs/reviews/v44-marathon-centrifuge-spec.md` and `docs/reviews/v44-marathon-centrifuge-physics.md`. Numerical tests use independent time integration, quadrature, network balances, limiting cases and NIST fixtures. UI tests cover every numerical control, all plot topics, accepted-state geometry, stale responses, failure recovery, exact exports and versioned worker responses. Scenario tests cover old Beam target links and new atomic restoration. Final snapshot, build, deployment and live-browser evidence are recorded separately under `scientific/centrifuge-v44/` once completed.

### Executed final acceptance — 2026-11-09

All project commands ran in the existing Apple safe-dev VM (`safe-dev-d53fa8311a7066e4`), from `/work/home/fix-v43-source`. The guest's 506-input snapshot was checked before and after every command: SHA256 `e337e685333723c77ff1f7f1a3c08c51be9a66b9fbbab15642fdbfef66f0ee54`. All 504 corresponding host inputs remain unchanged; two historical guest-only gate runners were preserved, not overwritten or deleted.

Exact final invocation: `python3 -I scientific/fixes-v43/control.py v44-final-scan -- python3 scripts/run-final-v44.py`. The controller transfers the reviewed bounded snapshot and executes only inside the guest. Final raw evidence is in `scientific/centrifuge-v44/scan/final/`:

| Check | Result |
|---|---|
| `npm test` | 911 passed, 0 failed, 0 skipped |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run check:site` | Passed |
| `npm run check:assets` | Passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | Actual bundled orbit worker and source identities passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | 144 actual bundled centrifuge scenarios passed; invalid protocol/domain rejected; source digests matched |
| `python3 docs/reviews/v42-collision-data-probe.py` | Saved-data recomputation passed execution; existing collision qualification failures remain failures |

These establish implementation consistency within the declared reduced model. They do not experimentally validate Marathon hardware or qualify the pre-existing collision-transport backend.

The checked 150-file release has aggregate SHA256 `cd636ab493784bc0e60e57c6549d3ec48bc9cb9e7bee5f175f15a6ab2fb2bf05`. Export/deploy/readback used `python3 -I scientific/centrifuge-v44/publish.py {export,deploy,verify} scan`; Wrangler ran inside the existing isolated deployment VM with its own saved authentication. Cloudflare readback shows version `c126f247-e2b1-4f9e-89ac-1358c2bb7ef8` receiving 100% of traffic. Live browser DOM confirms `/assets/index-G4TJQ0vz.js`, from this release.

Real Brave verification on the deployed site is recorded separately in `scientific/centrifuge-v44/scan/browser/checks.json`; build receipts retain their original `browserVerified:false` because browser verification occurred later. The live checks exercised all 24 numeric controls with changed values and exact-entry confirmation, all nine plot topics with finite paths and keyboard sample inspection, six feed pairs in pumping mode, and the zero-drive unity-selectivity limit. A freshly generated share URL restored stages 7/feed 5 and the fixed-feed scan began at stage 5. Native reset preserved lithium fraction 0.0759, diffusivity 0.02 and drag 2 rather than quantizing them.

Actual canvas rotation and ray-picked solenoid-former selection opened the correct alumina/material/role description. The inspected engineering topology is illustrative, not an as-built materials claim. At 390×844 and 320×740, editing, plots, the 3D view and dock worked; plot sheets stayed within the viewport and document width equaled viewport width. Temporary viewport overrides were reset. The final browser warning/error query returned no entries. Screenshots: `desktop.png`, `surface-inspection.png`, `mobile-plots.png`, `mobile-320.png` and `mobile-3d.png` in that evidence folder. Live export-file downloading was not checked; UI export payload/provenance and accepted-state behavior are covered by executed module tests.
