# Independent stable-norm physics review

Accepted for separately attributed analysis of the retained V107 preflight
fields. This corrects a demonstrated checker arithmetic defect, not the
producing physics. Full numerical qualification remains **PENDING**.

## Evidence checked

Independently inspected `stable107.py`, its seven controls, the actual root-run
execution/control logs, analysis driver, stable audit, original combined audit,
V106 replay, and the independent Decimal witness. Trusted file hashes match:

- Stable implementation: `5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b`.
- Tests: `450d75572679d96164893680b44c4f58090770182455bde6a0c6f89d9f892519`.
- Analysis driver: `759039097b2e827752925cbac3ccff12cd72b6beb14541493d9f1382cabe4be7`.
- Stable audit: `1c9cc7034257079b264015bdaf0c70b5022d27bf164f3bd9e8b4436feeba4793`.
- Preserved original audit: `19b36780162a19d8d7e52f4f8fd6902fc61ea0644797dfd6807384613495c845`.

Rechecked actual 160 × 48 and 160 × 96 compressed field seals against the
independent precision witness; the archives are unchanged. JSON comparisons
confirm exact equality of producer-source hashes, case packets, timestep
sequences, torque footprints and every non-norm gate versus the original
combined audit. All gate kinds, contexts and limits are also identical.

The original two failed binary64 quadrature checks remain retained as failed
historical results. New metric/test/driver hashes are separately recorded;
they are not presented as hashes of the old producing solver. The derived
report correctly lists nine required full-clock jobs and preserves the old
five-entry preflight inventory separately as `rawMissingFullJobKeys`.

## Why the correction preserves the scientific question

Previously, independently interpolating two almost identical large profiles
introduced roundoff before subtraction. Their squared initial difference was
then compared relatively between Gauss orders, measuring interpolation noise.
In simple terms, the checker lost the tiny difference before measuring it.

The replacement interprets original binary64 knots and samples as exact
rationals, evaluates both Q1 interpolants on their common union knots, and
subtracts them before rounding the small difference once. A Q1 polynomial
restricted to a smaller rectangular panel remains Q1, so this constructs
the same difference function rather than projecting or smoothing it.

The existing Gauss points, cylindrical weights and finer reference integrals
remain unchanged. So do binary64 increment construction, edge padding,
stationary outer/end velocity traces, radial-axis velocity and midplane
axial-velocity rules, and the combined meridional reference denominator.
All axial reference integrals compare exactly equal to the original audit.
There are no clock-specific branches, fitted values, floors or erased errors.
Higher-precision subtraction is preferable to relaxing a gate because it
repairs the actual loss of information while retaining small nonzero signals.

## Actual verification results

The root-run seven-test control set passes: exact rational integration,
nonzero one-ULP differences, identical profiles, finite piecewise-bilinear
fields on different grids, velocity boundary traces, increment/reference
normalization, and genuine discrepancies above 5% are exercised.

For the actual initial axial comparison, Gauss order 2 now gives nonzero
density error integral `1.6910590268012328e-43` and temperature error integral
`3.271896438639056e-28`. These agree with the independent 60-digit Decimal
Q1 witness to within approximately 5e-15 relative. Order 3 agrees;
the worst panel-quadrature spread across the combined replay is 1.985e-14,
below the unchanged 1e-10 limit. This is precision repair, not zero clipping.

The actual combined replay contains **41,138 gates, zero failures**, and
reports **PENDING**, with both full-pass flags false. It took 43.54 s and
396,132 KiB peak RSS. The separate original V106 replay preserves every
gate's kind/context/limit/decision and all six genuine spatial failures.
Thus the correction does not make an underresolved physical study pass.

## Remaining fidelity limits

- All nine 0/1/2/4 µs jobs are still required. Short radial and axial results
  do not establish full axial/joint contraction or later-clock convergence.
- The declared timestep sequence checks radial 8/axial 2; it cannot certify
  finest-grid timestep or operator-splitting accuracy independently.
- Mesh-dependent initial steady torsion remains a real contribution to
  differences. The observed initial angular momentum/energy differences are
  not rounded away with the near-null density/temperature errors.
- Prescribed current, fixed electrical transport and constant heavy-particle
  viscosity/conductivity remain conditional, especially near 234,500 K.
- Neither checker precision nor conservation establishes measured rotation,
  optical-diagnostic agreement, lithium separation, Marathon apparatus
  accuracy, steady operation, or live-playground qualification.

This reviewer performed static source, hash and JSON comparisons only.
All scientific execution and test results above come from retained root-run
safe-dev evidence; no frozen producing source or data was edited.

## Independent replay entry point: actual follow-up

Static review accepts `stable_audit107.py` within the same scope. It delegates
all admission/gate decisions, restores the temporarily selected metric in a
`finally` block, records its own and metric hashes separately, and exclusively
creates a distinct final artifact. Optional prior evidence must identify the
same case packets and producer sources; its raw hash/failures remain linked.
The supplied artifact's historical authenticity comes from its pinned hash,
not merely from the existence of a prior-failures field.

Inspected the actual entry02 logs, driver, component/final audits and summary.
Four entry controls pass, including error-path restoration, preserved full
failures, stale preflight reporting and mismatched prior-field rejection.
Independent JSON comparison confirms exact equality of all 41,138 gate values,
case/source maps, radial/axial comparisons, retained prior failures and missing
job inventories against the previously verified stable result. Zero failures,
**PENDING**, false full-pass flags and all nine required full jobs remain.

Verified canonical entry02 audit SHA-256:
`c7981440c34f49fafd3b3a33847822de2e4843f30335327b0cacbb8807e3a0a9`.
Wrapper SHA-256 is
`4ffe585d9bab880eed60787c33e8d7794d298605ee1f7c30072200fa36353a71`;
its component-audit hash matches the earlier replay. Execution took 27.19 s
and 308,296 KiB. Entry01/02 share the same 113-source transfer seal,
`993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836`.
Entry01's retained outer-driver failure compared integer dictionary keys with
JSON string keys; entry02 canonicalizes that comparison without changing
the audited source or numerical gates. No remaining entry-point blocker found.
