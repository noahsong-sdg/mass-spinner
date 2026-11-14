# Independent Laurelin review — 2026-11-14

Scope: source, documented assumptions, retained check04–06 receipts and elementary independent arithmetic. No project execution, new VM run, or browser operation was performed by this reviewer.

## Evidence checked

- Initially, eleven reviewed model/UI/scene/test files matched check04, SHA256 `221aebd8c95da81ebb9a32e0f53ac3cdd2db142a27adf16d5477d1462ae9cd84`; its five log hashes matched and 23/23 tests passed. That suite missed the domain-crossing defect below.
- Final reviewed sources match check06, SHA256 `aa92fcd69261f33f25acc8a6e88aa52dba7079e86dc58a3d39429a5ea472b334`. Release manifest SHA256: `08b6c95ba15c36c09b0fcd3bfe97f3970823e67347047c910cd79c9e96768490`.
- Independently verified all 19 domain-export payload hashes and every check05/06 execution-log hash. Check05 preserves 23 passes / one failed new regression; check06 records 24/24 passes and typecheck/build/site/assets exit zero. These are producer-run safe-dev results, not this reviewer's rerun.
- Both D–D coefficient rows, fit window and cm³/s units were reopened in the [official PlasmaPy coefficient file](https://raw.githubusercontent.com/PlasmaPy/PlasmaPy/main/src/plasmapy/utils/data/rxty_pade_polynomial_coefficients.json). The four nonzero coefficients, reduced mass and Gamow constant match.
- `n²V⟨σv⟩/2`, the SI conversion, branch energy assignment and two-deuteron burn count are consistent.
- Combined-inventory merge heat is `NmDv²/2` for each body's speed `v` in the center-of-mass frame. Using relative speed would incorrectly multiply it by four.
- `U=3NkT`, `pV=2U/3` give the implemented compression-work sign, exact confinement exponential and closed thermal/work ledger.
- Recovery credits only an assumed fraction of expansion work. Fusion electricity remains unsolved; omitted coil energy/circuit dynamics are disclosed.
- Sampled density/radius/temperature feed the scene and readout; cursors use the same timeline fraction. Translation is explicitly a phase animation, not a trajectory calculation.
- Camera fitting uses actual assembly bounds. Component inspection has a keyboard path; only hardware/plasma meshes participate in picking.

## Finding and correction

**P2 — Original full-pulse fit admission missed an out-of-range interval near an endpoint.** For `{temperatureKeV:.5, compression:1, speedKmS:0, confinementUs:600, durationUs:550}`, exact final temperature is `0.1999248272 keV`, while the final quadrature midpoint is approximately `0.2001082 keV`. All 500 midpoint values remain in range; the final sample is outside. Midpoint-only admission returned a numeric full-pulse yield despite the documented domain restriction.

The code checked quadrature nodes rather than each interval's full thermal range. The reviewed correction checks both endpoints and midpoint before admitting the complete yield, reusing the already-required endpoint sample. Each constant-coefficient phase has a monotone exponential thermal solution: its temperature derivative is its initial derivative times `exp(at)`. Endpoint bounds therefore suffice without clipping, extrapolation or new integration logic. Thermal evolution, work/loss ledgers and valid-domain quadrature remain unchanged. The exact UI-admissible regression fails the original implementation in retained check05 and passes the correction in check06. This finding is closed within the tested domain-admission scope.

## Qualification boundary

No other blocking formula or accounting defect was identified within this prescribed 0D model. This does not validate FRC equilibrium, transport, merging/reconnection, stability, secondary burn, pulsed-power recovery or a Laurelin operating point. The explicit illustrative dimensions/materials and single-temperature assumptions must remain visible. Existing passing tests establish implementation checks, not experimental accuracy. Deployed GPU/mobile observations belong to the parent's browser verification, not this reviewer's independent evidence.
