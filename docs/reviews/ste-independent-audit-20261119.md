# Independent STE review · 19 November 2026

## Scope and evidence

Three independent agents reviewed physics, beginner explanations, and interface claims.
They compared the STE changes with source `db55ed2478e2812061b48f842ed56f04e02ca02b`.
The correction base is `790c6a4`.

The review included all six tutorials, maintained qualification and methods pages, controls, component descriptions, and scientific-limit messages.
The agents traced claims to control declarations, numerical energy assignments, the finite-contact protocol, and the optical-observation assumptions.
They made no source changes and ran no project code on the host.

## Findings and fixes

| Problem | Technical cause | Reader effect | Fix and reason |
|---|---|---|---|
| The qualification sentence excluded other qualified outputs. | Moving “only” changed its grammatical scope. The fixed protocol also tests angular flow and voltage. | The reader could conclude that only electrical work passed numerical checks. | Restrict the model conditions, as the original sentence did. Keep all recorded results. |
| Redistribution heat read as a general law. | The edit removed attribution to the thermal model. The implementation includes signed redistribution work in gas energy. | The reader could confuse an energy-deposition assumption with complete fluid physics. | Name the thermal model in the existing sentence. Keep the omitted-transport limit beside it. |
| Doppler velocity lacked its spatial explanation. | The shorter text omitted light combined from different sightline positions and the spectral estimator. | The reader could not see why measured velocity differs from local gas velocity. | Explain light combination and define the estimator. Do not assert a known emission profile or instrumental method. |
| Instructions named old status and window text. | Tutorial and interface text changed separately. | The reader could not find “Updating” or “Inspect.” | Use the current calculation instruction and “Examine.” Keep internal IDs unchanged. |
| Spatial thermal options read as switches. | Instructions treated two select options as on/off controls and omitted the thermal prerequisite. | The reader could try to change disabled controls. | Enable thermal evolution first. Name Liner model and Gas model, then their options. Wait for the calculation. |
| A power equation followed a claim about stored energy. | The lead described retained energy instead of input power. | The reader could confuse watts with joules. | Introduce energy supplied each second. Then connect input and removal to storage and temperature. |
| The first experiment used angular momentum before its explanation. | The rewrite substituted an undefined term for the visible speed change. | The first observation required knowledge taught later. | Describe ion and neutral speed changes. Keep the angular-momentum account in its later section. |
| The density equation lacked one physical link. | The shorter introduction removed the earlier analogy without explaining the mass dependence. | The mass in the exponent had no immediate reason. | State that heavier atoms need more inward force at the same radius and angular speed. |
| Tutorial 1 used undefined symbols. | This gap predates the STE pass. | The reader met Ω, T, and α before their definitions. | Define the symbols before the equation. State which input stays constant in each comparison. |
| A collision-model status implied experimental evidence. | “Experimental” replaced “Exploratory.” Neither label directly stated the accuracy limit. | The reader could mistake an unqualified calculation for a measured result. | State “accuracy unknown.” Keep the raw momentum error and uncalibrated-purity warnings. |

These are local text fixes. No new sections, solver changes, numerical inputs, or abstractions are necessary.
The existing paragraphs now carry the missing conditions and reasons.

The agents found the main motivations intact: drive causes rotation, heating competes with separation, purity differs from quantity, and measurements require an observation model.
Inventory cuts remain separate from extraction flow. Numerical verification remains separate from experimental validation.

## Verification

All three agents reviewed the corrections again. No actionable finding remained in their review scope.
A final dictionary check replaced unapproved verbs without changing the scientific meaning.

[Verify run 44630179761](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44630179761) passed for source `49fc5180c4c8a3a99fa1d45194900736a107dd98`.
The checks ran in isolated CI containers. The host memory guard blocked the local test container; it was not bypassed.

| Check | Result |
|---|---|
| `node --import tsx scripts/check-dependencies.ts npm-audit.json` | Passed |
| `npm run typecheck` | Passed |
| `npm run typecheck:infrastructure` | Passed |
| `npm run typecheck:boundaries` | Passed |
| `npm run typecheck:tests` | Passed |
| `npm run lint` | Passed |
| `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v` | 17 passed |
| `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v` | 3 passed |
| `python3 -m unittest discover -s tests -p test_dev_snapshot.py -v` | 5 passed |
| `python3 -m unittest discover -s tests -p test_deploy_credentials.py -v` | 3 passed |
| `node --import tsx --test --test-concurrency=1 tests/*.test.ts` | 1,594 passed; none failed or skipped |
| `npm run build` | Passed |
| `npm run check:site` and `npm run check:assets` | Passed |
| `npm run check:gltf` | Nine files; zero errors and warnings |
| `npm run release:seal` and `npm run release:verify` | 254 candidate file hashes passed |
| `npm run test:browser -- --project=desktop` | 26 passed; zero retries |
| `npm run test:browser -- --project=phone` | 26 passed; zero retries |

Regression checks cover the corrected terms, spatial-control order, heat-model assumption, diagnostic explanation, and qualification limits.
The heat-motivation test also rejects a missing explanation, not just an incorrect position.
All 20 math blocks and all 88 tutorial link targets match the correction base exactly.
No formula, physical input, control ID, message format, or authorization boundary changed.
These checks do not establish experimental accuracy or formal STE certification.

## Publication

Published source `49fc5180c4c8a3a99fa1d45194900736a107dd98` to the [live simulator](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev).
Cloudflare version: `509b663e-00ed-453e-b8bf-37dff50dda6c`.
Prepared manifest SHA-256: `9336dcf94f0e7ff70ea4e54a1ddccf55a41f569596e394706ef844e52e1890fd`.

[Preparation run 44632997525](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44632997525) passed artifact admission, digest checks and retained-file assembly.
Its deployment step failed because GitHub has no Cloudflare deployment credentials.
The official Wrangler CLI then published the same prepared files with the existing Cloudflare login.
No project code, tests or build ran on the host.

Independent HTTP checks passed all 385 local manifest hashes, all 384 served hashes, and 12 exact redirect status and destination checks.
The live manifest bytes equal the prepared manifest bytes.
These checks did not test response-header policy.

Live browser checks followed the corrected Tutorial 3 spatial-heat instructions from Docs & tutorials.
After thermal evolution was enabled, both model choices were available in the specified sequence.
Selecting Spatial mixture produced an accepted temperature profile with gas and tungsten curves.
The tutorial plot link selected that profile. The physical-time control changed it from 0 s to 1 s.
The end state showed 1,000 K mean gas temperature and 999.7 K liner-cell temperatures.
The run retained its warning that these inputs are outside the tested cases.

The browser also showed the corrected Tutorial 2 force motivation, thermal-model attribution and Examine label.
Tutorial 6 showed the sightline explanation and spectral-estimator definition.
At a 390 × 844 phone viewport, Tutorials 3 and 6 had no page overflow or math-render errors.
The live simulator and phone tutorial tabs recorded no console errors during these checks.
Temporary tabs were closed and the viewport was reset.

This review verifies the text corrections and their control paths. It adds no experimental validation.
