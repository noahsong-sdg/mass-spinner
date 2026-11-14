# V107: bounded radial refinement, then complete qualification

Freeze this protocol before the first case. V106's 40/80/160 radial-cell
comparison at 48 axial cells reduced the 1 us density-increment discrepancy
from 20.270583% to 7.451522% and radial velocity from 6.948714% to 2.103733%.
Density still fails 5%; the original six full-matrix failures remain. This
demonstrates radial sensitivity, not a unique flux defect. Each mesh recomputes
initial steady torsion; archive every complete initial conserved state.

## Fixed inputs and method

Use the exact V101 smooth source-aligned mapping at radial refinements 4/8/16
and axial refinements 1/2/4. No cuts or mapping parameters are adjusted. Keep
V106's HLLC/SSPRK reconstruction and geometric source, stationary mechanical
walls, current-conditioned electromagnetic operator, viscosity and constant
FiPy heat conductivity. No physical inputs, temperatures, currents or measured
velocities are fitted. Pin the original V106, directional-cross and radial
datasets to the SHA-256 values in `campaign107.INPUT_SHA256`; verify their
field seals and unchanged physical producer files before and after each case.

The only permitted historical source-hash difference is `audit99.py`: V107
adds explicit job/clock/comparison-group arguments while retaining its default
behavior, norms, limits and physical/ledger checks. Replay the original V106
audit to verify that exception. Seal the current auditor and V107 sources;
this exception permits no producing-solver change.

## Resource-aware sequence

Execute one whitelisted case per invocation; do not automatically launch the
whole matrix. First run **r16-z2-cfl0.1, 0/1 us only**. Previous r8-z2 used
273.77 s and 385,352 KiB for 1 us. Doubling radial cells also tightens the
acoustic timestep; roughly four times that work is a planning estimate, not a
runtime or memory guarantee. Run this case inside a one-GiB safe-dev VM. Retain failed
resource receipts and logs; do not change physics or gates to fit the budget.

All subsequent cases require that successful, same-source preflight packet.
The declared resource budget is **1 GiB for every geometry except r16-z4,
which has 2 GiB**. An unmodified V106 r16-z2 one-cycle resource probe reached
631,048 KiB; doubling axial cells plausibly exceeds 1 GiB. This is resource
planning, not a numerical gate change or automatic fallback. Root explicitly
selects the corresponding safe-dev profile; the runner never changes profiles.
Before full axial cases, run their own r8-z4/r16-z4 CFL 0.1 preflights at 0/1 us
under their respective budgets. Record the declared budget in each case and
prerequisite receipt; measured peak RSS must remain below that budget.
Do not assume radial-only memory measurements establish axial-case feasibility.

The full declared cases, each rerun from its original initializer without
checkpointing, report **0/1/2/4 us**:

| Purpose | Radial refinement | Axial refinement | CFL |
|---|---|---|---|
| Radial sequence | 4, 8, 16 | 2 | 0.1 |
| Timestep sequence | 8 | 2 | 0.2, 0.1, 0.05 |
| Axial checks | 8, 16 | 4 | 0.1 |
| Coarse joint/axial anchors | 4, 8 | 1 | 0.1 |

The CFL 0.1 timestep case is the same r8-z2 case in the radial sequence.
Nine distinct full cases are required. A resource-blocked or unfinished axial
case means full qualification remains incomplete; it is not an optional pass.
Accepted steps retain the original 100 ns cap and acoustic CFL calculation.
An observational wrapper prints elapsed time, temperature and RSS after each
256 heat steps and returns the unchanged state/receipt; verify one-cycle
bitwise equality with the unwrapped method, including the logging branch.

Example first invocation (inside safe-dev):

```sh
python scientific/refinement-v107/campaign107.py OUT preflight r16-z2-cfl0.1 ORIGINAL CROSS RADIAL
```

Subsequent invocations add `--preflight PATH/TO/predictions.json`; full axial
cases provide both the initial and their own geometry's preflight packets.

## Unchanged acceptance

Use the existing exact-panel metrics with quadrature orders 2/3, independent
conservative restriction as a supplemental witness, and original 5% spatial,
2% timestep, contraction and panel-quadrature gates. Keep positivity, charge,
mass/species/energy/angular ledgers and actual accepted-clock checks unchanged.
Score radial 4/8/16 at axial 2, the r8-z2 timestep sequence, joint refinement
r4-z1/r8-z2/r16-z4, axial 1/2/4 at radial 8, and the fine axial 2/4 pair at
radial 16. No threshold is relaxed and no norm is replaced.

The 1 us preflight may report supplemental pair changes but cannot pass the
full matrix. Only the independent auditor can report complete qualification
after admitting all nine full cases at every clock and all original checks.
Preserve the historical six failures separately. Regional discrepancies and
diffusion-length ratios do not establish continuum error, an actual boundary
layer thickness, a causal role for initial mass flux, or experimental accuracy.
