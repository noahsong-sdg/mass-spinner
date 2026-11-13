# Independent final evidence review

12 November 2026. Trusted host export/source/hash inspection only; this reviewer
did not execute project code, run an independent PDE replay, operate the VM or
use Git. The parent executed the checks in the recorded offline safe-dev VM.

Prediction SHA256: `4a3a4fcd7801480c9590828b7949d4fd7cf47289bf4dca183e46f8fd1a57b2e1`.
Audit SHA256: `2d2c886ec58aa3e3a9d58c2764148c81c70d09ca16986ee06cb9779fda8279b6`.
Frozen V86 prediction remains `70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7`.
All physical/checker/report source bindings and the three final artifact seals
match current files. All three compressed/raw field seals match; CFL 0.2
reproduces the frozen V86 field/history packet exactly.

The audit records 28/28 temporal gates passing, including seven initial-state
controls, and 112/112 exact-panel quadrature checks passing. Maximum quadrature
spread is 1.05039e-13. Largest finest-pair change is 0.6395387%, density increment
at 1 microsecond, contracting from 1.4244478%. Steps are 654/1310/2621; maximum
accepted dt halves; all nonterminal steps are acoustically limited. Saved-state
CFL reconstruction defects are at most 2.262e-16. Budget maxima remain below
the declared bounds: mass/species 3.291e-16, energy 6.254e-14, charge 5.059e-12.

Logs/receipts support 117 scientific controls, 1238 application tests, typecheck
and build passing. The retained first attempt has its exact old checker/test
hashes and exit-1 receipt; exact checkpoint identity fixes duplicate residual-
step counting without changing physical predictions or numerical tolerances.

V86 retains 85 original field/335 quadrature failures and 85 supplemental
field/zero panel-quadrature failures, including 64 unresolved spatial failures.
Only one fixed-grid conditional temporal slice qualifies; unsaved intermediate
PDE rows/CFL bounds remain producer evidence. Frozen transport, heavy-only
heating, missing physical closures and experimental mismatch remain unresolved.
Full-model and experimental qualification correctly remain false. No remaining
material contradiction was found between the V87 report and exported evidence.
