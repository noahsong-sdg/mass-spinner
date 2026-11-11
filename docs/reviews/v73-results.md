# v73 independent results review

10 November 2026. **The 13 numerical research controls pass; no experimental or
live-model qualification follows.** No blocking defect remains in the reviewed
implementation and accepted evidence.

## Evidence and interpretation

Read the primary FiPy solver, frozen campaign, protocol, regression tests,
independent sparse checker, accepted report, independent-check result and
verification log. This reviewer executed no host project code. The parent ran
the independent checker in safe-dev; its accepted result checks five source
hashes, exact case identities/inputs and every reconstructed state/rate/ledger.
This review did not separately recompute host hashes.

- Four manufactured steady grids reduce maximum error / exact peak from
  `0.0033023273` to `0.0000590119` (0.3302% to 0.00590%), below the frozen 0.5%
  finest-grid criterion. The source is an analytic volume-integrated torque,
  not generated from the matrix being tested.
- Axial decay with 8/32/128 timesteps gives continuum errors
  `0.0222680562 / 0.0059981003 / 0.0017347468` in units of the prescribed initial
  amplitude. The finest result passes 1%; the discrete eigenmode separately
  agrees. This is timestep refinement on the stated fixed axial mesh, not a
  completed joint transient spatial/timestep qualification.
- Independent SciPy graph assembly reconstructs all 13 cases without importing
  FiPy or the primary implementation. Layered axial Couette additionally checks
  its analytic profile, absolute end torque and absolute cylinder inertia;
  compensating geometric factors cannot hide in a normalized decay rate alone.
- The radial core/annulus case passes the analytic unit-drive limit and axial
  row invariance. **FiPy's harmonic face viscosity times radial-face r² differs
  on a finite grid from v65's exact half-cell radial resistance.** This is
  continuum-limit agreement, not bitwise recovery of the old matrix.

The two illustrative endwall cases have identical grids, properties and body
torque. Stress-free ends carry zero torque; stationary ends carry braking torque
while wall power remains zero. The stationary/free angular-momentum ratio is
approximately `0.7770` for these prescribed inputs. It demonstrates an effect
within the constrained operator, not a measured or independently converged
reactor loss fraction, and does not identify the historical mismatch's cause.

## Corrected invariant and verification

Review found that checking finite angular speed alone permitted overflow in
derived angular momentum/energy; NaN ledger residuals could then evade ordinary
comparison guards. In simple terms, a representable speed can still have an
unrepresentable squared energy. Explicit finite checks on derived geometry,
state, rates and ledgers now reject this case. The regression with finite
`1e200` angular speed verifies rejection. This preserves the physical finite
state contract instead of clamping the input or hiding the energy loss.

The accepted safe-dev log records:

- `python -m unittest discover -s scientific/axial-v73 -p 'test_*.py' -v`:
  **6 passed**, including overflow and corrupted/stale report rejection.
- The corresponding `scientific/diagnostic-v72` suite: **7 passed**.
- `run_report.py REPORT` and `independent_check.py REPORT`: **13 cases passed**
  sparse reconstruction and analytic/refinement gates.
- `npm run typecheck`, `npm run build`, `npm run check:site`,
  `npm run check:assets`: **passed**; existing large-bundle warning remains.

The ledgers separate body work, wall work, physical shear dissipation and BE
numerical loss. Neither is evidence of a correct plasma closure. Static build
checks are not deployed browser/GPU verification.

## Remaining physical boundary

Density and viscosity are prescribed, inertia is fixed, and radial/axial flow,
pressure closure, species momentum and thermal feedback remain absent.
Z-dependent swirl generally needs meridional-force balance or secondary flow;
this operator does not provide it. No live source/default changed and no
experimental residual was rescored or repaired. The justified result is verified
constrained torsional transport on the tested controls, not first-order device
accuracy or a complete finite-length centrifuge model.
