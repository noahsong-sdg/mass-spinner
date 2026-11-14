# Independent Laurelin numerical oracle

Frozen before execution on 2026-11-14. This tests the declared prescribed-volume, single-temperature educational equations, not a Laurelin operating point or FRC equilibrium.

Eight prespecified inputs and 500/2,000 production quadrature steps are in `oracle2-cases.json`. They include constant-volume decay, strong loss, large compression, both fit-domain crossings, vanishing compression exponent and altered inventory/electrical assumptions. Inputs and gates may not be retuned after seeing results. State relative error ≤2e−8 (floor: 1e−12 of initial value); work/electrical error normalized by max(initial energy, reference quantity) ≤2e−8; valid-domain branch yields and derived fusion energy/burn errors ≤5e−4 / 4e−5 for 500 / 2,000 steps. Domain availability and approximation flags must agree exactly. These are numerical checks, not experimental accuracy bounds.

`oracle2.py` imports no browser code. It evolves `log(T/T₀)` with actual SciPy DOP853, independently integrates normalized compression/expansion work and confinement loss, and uses adaptive QUADPACK quadrature for each D–D branch. Pulse phases are separate IVPs to avoid integrating across a discontinuous forcing coefficient. Both endpoints bound temperature because each phase's derivative retains its sign. Reactivity uses the complete seven-coefficient Padé expression rather than the production reduced polynomial. The adaptive reference's own quadrature error estimates are retained.

Primary sources reopened: [official PlasmaPy coefficients](https://raw.githubusercontent.com/PlasmaPy/PlasmaPy/main/src/plasmapy/utils/data/rxty_pade_polynomial_coefficients.json), Bosch–Hale table VII rows `D(d,n)3He` / `D(d,p)T`, 0.2–100 keV, cm³/s converted to m³/s; [SciPy solve_ivp documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html), which identifies DOP853 as an eighth-order explicit method suitable for high precision. Accessed 2026-11-14. No independent fusion data fit was performed.

Root-run commands after explicit file transfer into fresh guest stages:

```
node scientific/laurelin/export2.mjs /work/project/FRESH/production.json
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/FRESH -p test_oracle2.py -v
/work/home/v90-venv/bin/python /work/project/FRESH/oracle2.py /work/project/FRESH/production.json /work/project/FRESH/comparison.json
```

All execution must occur in safe-dev. Exporter records production source and protocol hashes; comparator records input, oracle, protocol hashes and SciPy version. Root must also bind the production source hash to the tested application snapshot. Publication requires retained output seals and inspection of every failure. The protocol above was frozen before execution; the completed root-run evidence is reviewed below. This reviewer did not execute project code.

## Serialization correction

Root's sealed `oracle201` run passed the five original controls and completed comparison calculations, then strict JSON output failed: comparisons involving NumPy reference totals returned `numpy.bool_`. In simple terms, the numerical decision was computed but its scalar type could not be written to the evidence file. The original source is preserved as `oracle2-prejson.py`; only check-construction values are now converted to native `bool`. Equations, inputs, tolerances and gates are unchanged. The new regression executes the real `assess` path on a production-shaped default fixture and requires native Boolean decisions and strict JSON serialization. This is preferable to a permissive JSON fallback that could silently change unsupported types. Fresh `oracle202` retained the expected serialization failure against the preserved old source, then passed all six corrected controls and the unchanged comparison. The reviewer did not execute the code.

## Completed independent evidence review

Root ran `laurelin-oracle202` in offline 1-GiB safe-dev with SciPy **1.17.1**. The eight inputs × two resolutions produced **16/16 passing rows** and 20,016 sampled states. Domain-availability and approximation flags agree exactly, including the final-midpoint crossing and both lower/upper fit exits. No input or gate changed.

| Quantity | Largest error, 500 steps | Largest error, 2,000 steps | Unchanged gate |
|---|---:|---:|---:|
| Sampled state, stated relative norm | 2.37888e−14 | 8.13475e−14 | 2e−8 |
| Work/electrical energy, stated normalized norm | 4.05502e−13 | 4.06356e−13 | 2e−8 |
| Branch yields and derived fusion outputs, relative | 3.63480e−5 | 2.27193e−6 | 5e−4 / 4e−5 |

The largest yield errors occur in the inventory/efficiency/cadence case's neutron count; reducing the timestep by four reduces that error by approximately sixteen, consistent with midpoint quadrature's second-order behavior. Adaptive QUADPACK's largest estimated relative error is bounded by **1.111e−14** using each recorded absolute estimate and the production/reference yield discrepancy. It is over nine orders below either acceptance gate. This is an integrator error estimate, not a rigorous bound on the reference ODE or physical data fit. The independent exponential, zero-exponent and thermal-ledger controls also pass.

Reviewed evidence resides in `scientific/transport-v108/retained/review2-results`: all **66 payload hashes** match its export inventory, including unrelated transport evidence in that group. This reviewer additionally checked both oracle stages' source/log receipts, all matrix names/inputs/sample counts, and the comparison's production-export/oracle/protocol bindings. `oracle201`'s failed serialization remains preserved. Key SHA256 seals:

- Production physics: `581251f871fdee14c53aa86573976fe16e7cc490bf521bf3b2634e7ff92068a1` (matches current `src/laurelin-physics.js`).
- Production export: `203699844ba2c598e75f1b78f4f03c64c8e74586f115675416c592c00ff27221`.
- Corrected oracle: `2b2de78ba6eac04d576ff211d4d2f3c30bd145cb0588d30a5ab1530e4ac09bc6`.
- Prespecified cases/gates: `93f0217c5e449d8bd3aea1db68f24423e0463ba5b30df8f0605260f2ee6dd059`.

These findings support independent numerical agreement for the specified conditional equations and eight controls. They do **not** qualify the full slider domain, FRC equilibrium/compression, transport, merging/stability, circuit recovery, fusion-burn feedback or experimental Laurelin performance. Execution was root-run; the independent reviewer authored the alternative method and reviewed retained artifacts without an independent execution environment.
