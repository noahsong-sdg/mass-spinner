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
| Redistribution heat read as a general law. | The edit removed attribution to the thermal model. The implementation assigns signed redistribution work to gas energy. | The reader could confuse an energy-deposition assumption with complete fluid physics. | Name the thermal model in the existing sentence. Keep the omitted-transport limit beside it. |
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

Verification is pending for the corrections. No claim of formal STE certification is made.
