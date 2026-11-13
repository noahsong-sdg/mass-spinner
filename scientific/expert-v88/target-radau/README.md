# Coupled target / SciPy Radau control

The previous V24 reference verified well-mixed loading. This bounded extension
integrates the complete live semi-discrete target equations together: isotope
diffusion, replacement/fusion/release/renewal, temperature feedback, film/backing
contact conduction, pulse events and all species/energy ledgers. The actual
TypeScript simulator is compared to independently assembled Python equations
using [SciPy Radau](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html).
Atomic stopping tables/coefficients and four-substep depth quadrature remain
shared physical/numerical closures; this does not validate those closures.

The [prospective protocol](PROTOCOL.md) and [three synthetic cases](cases.json)
were fixed before execution. Nine controls pass. Eight of nine actual browser
trajectories complete. Every case has a full Radau reference at both tolerances;
an unavailable browser trajectory remains a failed comparison.

| Case | Result under unchanged gates |
|---|---|
| Pulsed, four film cells | Pass. Finest normalized state error 0.015284%, cumulative-yield error 0.0019603%, neutron-rate error 0.00064764%; all contract. |
| Continuous, two film cells | Fail: finest browser trajectory aborts on its packing admission. Completed coarse trajectories contract toward Radau. |
| Beam off, two film cells | Fail: finest cooling-ledger difference 4.55032 J/m² exceeds the frozen 1 J/m² energy-coordinate normalization. Temperature difference is 0.014252 K; errors contract. |

The packing failure occurs after 511 accepted steps, in an inner 0.00025 s
step: positive populations sum to 0.9999999999999715. Defect
2.853273173286652e-14 exceeds the declared 2.842170943040401e-14 threshold.
The three BE solves preserve packing algebraically, but their separately
rounded solutions accumulate drift. This is a numerical admission failure,
not evidence of physical first-order inaccuracy. [The exact diagnostic state
and step](results/logs/diagnosis.log) and [derived instrumented source](results/diagnostic-source.ts)
are preserved. No live solver, tolerance, case or gate was changed.

All saved isotope/projectile/energy budget gates pass. Overall
`numericalControlPass` remains **false**; experimental qualification is false.
The beam-off ledger normalization is deliberately retained, rather than
changed after seeing its result. A structural packing representation fix and
a prospectively specified cooling-energy norm are separate follow-up work.

Execution was offline in the existing public safe-dev VM, using SciPy 1.17.1
and NumPy 2.4.6. See [original execution](results/execution.json),
[explicit partial-case continuation](results/continuation.json),
[reference results](results/reference.json), and [logs](results/logs).
The initial missing-native-input failure and original browser-source snapshot
are retained as `results/attempt01-missing-native-source.tgz` and
`results/attempt02-browser-source.tgz`. Report prose was written after execution.

Browser packet SHA256: `63e73efb9bcebbe4364da335c8635179d0fe75383516fb7cc482dd4c989838b4`.
Reference SHA256: `8612bcfbd3ef0395ad48bf23bbc50d497b81e00d6b67079786c145df32b55418`.
