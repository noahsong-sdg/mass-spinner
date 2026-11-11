# v67 independent electrical refinement design

10 November 2026. Independent source/derivation review; no project code,
dependency installation, tests or VM commands executed by this reviewer.
Parent exclusively owns safe-dev synchronization and execution. This is a
prospective study-design review until actual exported results are inspected.

## Execution path and remaining root cause

Read `src/fuel-current.ts`, `src/fuel-spatial-operation.ts`,
`scientific/current-v66/coupled.ts`, `coupled_convergence.py`,
`check_coupled.py`, the v66 protocol and the accepted v66 artifacts.

The current solver conservatively solves r-z current with prescribed positive
radial/Pedersen and axial/parallel conductivities. The experimental coupled
step extrudes one radial Omega into every axial cell, solves the r-z current,
then sums each radial column's actual integrated torque and Joule work into
the radial gas model. Its v66 radial/time convergence study holds four axial
electrical and eight liner cells fixed. Thus v66 establishes conditional
radial/time convergence, not axial-current or liner convergence.

The remaining risk is a spatial truncation error, not a failed charge or
energy identity: a coarse resistor network can conserve charge/work exactly
while approximating the electrode end field poorly. In plain terms, all the
computed currents can balance while taking the wrong spatial paths. Weak
electrical forcing can also leave neutral rotation nearly unchanged even if
the electrical solution is materially inaccurate. Neutral Omega convergence
alone cannot qualify current, torque or Joule heat.

## Frozen physical problem

For every compared mesh retain the exact same physical problem:

- Full cylinder R=0.01 m, L=0.1 m, axis area exactly zero.
- Equal-volume radial cells; q=r^2/R^2, q-center=(i+0.5)/nr.
- Prescribed sigmaP=0.01 S/m, sigmaParallel=0.1 S/m and B=0.5 T unless an
  explicitly distinct sensitivity case changes them.
- Outer wall at 0.01 V over the full physical height.
- Grounded upper end electrode at q<0.5, equivalently r<R/sqrt(2); the
  remainder of that end is insulated. Lower end and axis are insulated.
- Null voltages enforce zero TOTAL normal current, including motional emf.
- One underlying Omega(q), initial temperature/species profiles, material
  data, wall thickness, physical wall/cooling conditions and final physical
  time. Mesh-dependent array indices must not redefine the electrode.

nr=32/64 align the electrode edge exactly. The q-center value and a cell
average coincide for a linear Omega(q), but this is not generally true for
nonlinear profiles: record which representation is frozen. Axial extrusion
does not make potential, current or heating independent of z. Wall refinement
must retain the physical inner/outer radii and boundary conductances, rather
than hold a per-cell conductance fixed. Compare histories at shared times;
time interpolation must not silently compare different physical endpoints.

## Expected axial resolution

For locally constant diagonal conductivity, perturbations satisfy

```
sigmaP * (phi_rr + phi_r/r) + sigmaParallel * phi_zz = 0.
```

A radial mode of wavenumber k decays away from an end over
`ell_z=sqrt(sigmaParallel/sigmaP)/k`. With a regular axis and Dirichlet outer
wall, the lowest radial mode has approximately k=2.405/R, giving ell_z about
13 mm here. nz=4 has dz=25 mm, larger than that scale. Features associated
with the electrode edge can introduce shorter axial scales of a few mm.
These are analytic scale estimates, not measured convergence results.

Equivalently, scale z by sqrt(sigmaP/sigmaParallel). At nr=64 the outermost
radial cell is about 78 micrometres wide, while the transformed axial cell
width for nz=4 is 7.91 mm: a ratio near 101. Such aspect ratio does not itself
prove an unstable or wrong finite-volume operator, but demonstrates why the
small radial cell count cannot stand in for axial resolution.

nz=4/8/16 should expose the initial trend. Budget nz=32 and, if needed, 64 or
higher under the unchanged gate. A resolution of 16 is not prospectively
asserted sufficient. Integrated observables may converge before near-edge
peak current density. A sharp Dirichlet/insulating junction has a local mixed
boundary singularity: the planar harmonic form has leading radial exponent
1/2, so its gradient can grow as distance^(-1/2). Consequently do not gate
the grid-point maximum at that idealized edge as if it were a smooth physical
peak. A finite electrode-edge radius/sheath model would be a different
physical problem and cannot be introduced merely to improve a score.

## Electrical gates independent of neutral rotation

Freeze a common state for the electrical-only study before evolving it.
Initial and final accepted states are useful separate cases, but the same
physical state must be applied to both members of each mesh comparison.
Keep all coarse results. Suggested finest-pair acceptance limits:

1. Each of electrode power Pe, Joule heat Q, and Lorentz work M differs by at
   most 2% of `max(abs(Pe)+Q+abs(M))` across the compared pair. This is the
   existing combined physical power convention, not neutral thermal energy.
2. Radially projected torque profiles differ in L1 by at most 2% of the
   larger profile's sum of absolute torques. Signed total torque can cancel
   and is therefore an inadequate denominator. Gate the integrated total as
   a reported secondary observable too.
3. Projected Joule profiles differ in L1 by at most 2% of the larger total Q.
   Sum the independently computed local I^2R, never square an averaged J.
4. Integrated terminal currents differ by at most 2% of the larger total
   absolute electrode current. Distinguish outer wall from upper electrode;
   a nearly zero net boundary current is only a conservation identity.
5. Retain each code's independent cell/boundary charge and work identity
   limits of 1e-9 on their own electrical current/power scales.

Use exact zero handling: zero error at zero physical scale passes; nonzero
error at zero scale fails. Do not install an arbitrary watt/newton-metre
floor or normalize electrical defects by neutral kinetic energy. If all
conductivities are scaled by a common small factor, potential is unchanged
and currents/work/torque scale by that factor, so these tests retain their
relative sensitivity. A source-to-endpoint work defect should also be
normalized by electrical work and reported separately from total energy.

For a radial mesh pair, torque and heat are extensive cell integrals: sum
fine cells into their common coarse q-control volumes. Do not point-interpolate
watts or newton-metres. Pointwise potential/Omega comparisons instead use
physical locations and explicit interpolation. A potential gate should retain
the v66 1% voltage-range-plus-motional-bound normalization. When nz differs,
compare at common physical z as well as r; raw array indices are insufficient.

## Independent FiPy subset

The v66 reference already executes actual NIST FiPy 4.0.3 with an independent
cylindrical area/distance operator, harmonic face conductivity and explicit
total-current insulation. Reuse that oracle on the SAME frozen v67 physical
geometry, not its old unit-aspect-ratio demonstration as a proxy for this
long device. It imports no production assembly.

Suggested selected cross-code cases are nr=32 with nz=8/16/32 (extend to64
if needed), and nr=64 at the final two accepted axial resolutions. This gives
a true axial trend at fixed nr and checks the finest joint case. Compare
potential at common physical points because production uses q-centers while
FiPy uses native arithmetic-r centers. Preserve 1% potential and 2% global
work gates and independently reconstruct charge/work for each code. Add
projected radial torque/heat comparisons when the reference exports them;
otherwise derive these from its face currents and the same stated physical
work definition, clearly accounting for its distinct quadrature. Do not
pretend a pass on one solver's same-grid identity establishes the other
solver's continuum accuracy.

## Projection and Pedersen validity

For the imposed axially uniform Omega_i, summation is an exact discrete
projection of work: `sum_i Omega_i sum_j tau_ij = sum_ij Omega_i tau_ij`.
Summing actual Q_ij likewise preserves electrical heating. Thus the present
radial projection is conservative for its stated common-speed subspace.
It is not a solution for axial momentum or axial gas temperature. End-localized
Joule heating can produce unresolved axial hot spots even if projected total
power converges. Report axial distributions or at least heat-density
heterogeneity before describing a projected temperature as a local peak.

The prescribed diagonal Ohm closure represents
`Jr=sigmaP*Eprime_r`, `Jz=sigmaParallel*Eprime_z`, where
`Eprime=E+u cross B`. Its dissipative work is
`Jr^2/sigmaP+Jz^2/sigmaParallel`, and Lorentz work has the complementary
mechanical sign. A possible Hall azimuthal current has zero axisymmetric
divergence and no work on pure azimuthal flow, so its absence does not alter
this restricted electrostatic charge equation. It can still exert a radial
Lorentz force and affect species/pressure balance; that physics remains
absent. Do not add Hall-current squared divided by sigmaP as another heat
term, or add legacy ion-neutral slip heating to the already dissipative
Pedersen closure without a new multifluid derivation.

No amount of mesh refinement predicts ionization, electron energy, a measured
conductivity tensor, sheaths, nonaxisymmetric modes or axial extraction. The
neutral transport laws and common-fluid prescribed mobility remain separate
closures. This campaign can establish numerical accuracy for the stated
reduced problem; first-order agreement with a physical centrifuge still
requires matched public experimental observables and uncertainty.

Primary tool semantics previously checked: [NIST FiPy boundary conditions](https://pages.nist.gov/fipy/en/stable/USAGE.html#boundary-conditions),
[anisotropic diffusion](https://pages.nist.gov/fipy/en/stable/generated/examples.diffusion.anisotropy.html),
and [pinned cylindrical mesh implementation](https://raw.githubusercontent.com/usnistgov/fipy/4.0.3/fipy/meshes/cylindricalNonUniformGrid2D.py).
The scale estimates and projection identities above are this reviewer's
derivations, not additional claimed material-property data.

## Authored frozen electrical campaign

`scientific/transient-v67/electrical.py` now implements the prospective study;
execution remains with the parent. Its source trajectory is pinned to the
actual accepted v66 packet SHA256
`a92320f3dd5fa7b043d82ced94bb0f0c504b78df8f72c44406174e38d706335d`
and accepted source identity
`ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c`.
It rejects a partial trajectory, changed field/conductivities, moved electrode
patch, changed geometry or time partition. Select the actual accepted n64/t64
initial state and accepted steps 0, 31 and 63: t=0, 15.625 microseconds,
0.5 milliseconds and 1 millisecond. Each identical radial Omega array is
extruded into nz=4/8/16/32/64, preserving the exact physical patch.

The runner executes the production TypeScript CLI and all 20 actual FiPy
cases. It imports the previously qualified independent v66 reconstruction and
potential-collocation code through explicit file paths, without editing v66.
Raw input/output JSON, progress, source/input hashes, command log, all coarse
pair comparisons, dimensional numerical table and gate report are retained.
Independent local charge/work/projection identities use 1e-9; cross-code
potential and global work use 1% and 2% at each sampled mesh. Only the declared
finest nz=32-to-64 pair gates axial 2% power, terminal-current and projected
torque/Joule profiles, separately for each solver. Coarser pair errors remain
visible even if the finest pair passes. Cross-code projected-profile
differences are recorded as diagnostics, separate from these declared gates.

The v66 FiPy reconstruction returned global radial work but did not assign
radial heat or torque to individual cells. The v67 projection derives those
assignments independently. For a nonuniform mesh, native arithmetic-face
interpolation has `Omega_face*d = Omega_left*d_right + Omega_right*d_left`.
The work-adjoint torque weights therefore use the opposite half-distance;
assigning each cell its own half-distance would break work consistency.
Heat is split by each cell's actual half-resistance. Five authored regressions
cover stale source identity, accepted snapshots/geometry, partial/moved-patch
rejection, nonuniform FiPy torque-work adjointness and sensitivity to small
electrical signals. Parent safe-dev execution is still required before any
numerical pass claim.

## Parent-run receipt inspected; raw audit pending

The parent executed the electrical campaign in safe-dev at 720-input source
snapshot `9046d821b4e8d041d0e390381ce92c083a4eca1d0c1362405c9f68913c8996b9`.
The reviewer inspected `scientific/fixes-v43/transient67-electrical.log`, its
receipt and input ledger: all 20 actual FiPy solve IDs appear, the study reports
652 gates passed with none failed, and the receipt records exit 0 in 2.533 s
with source verification before/after execution. Current electrical runner,
five-regression file, production kernel/CLI, independent reconstruction and
FiPy oracle hashes each match that tested ledger.

The separately inspected `transient67-tests` receipt records all 16 discovered
Python regressions passing, including the five electrical regressions. Its
overall source snapshot is `d94cd40803a45e819e8ad6907e576b6f37659673f46466aa3053fa1939344c26`;
the electrical runner/test file hashes are identical to the electrical-study
snapshot. The later ten-test analysis-only log is separate evidence and is not
misrepresented as the electrical five-test run.

Raw exported electrical profiles have not yet been inspected at this point.
The logged 652-gate pass qualifies the declared finest axial comparison, not
the old nz=4 setting: coarse axial comparisons are retained diagnostics, not
acceptance gates. The 4-to-64 power/current/projected-profile changes must be
quantified before judging whether the old axial default is sufficiently
accurate. This reviewer performed read-only host receipt/hash inspection only.

## Raw electrical audit and coarse-grid finding

Inspected the actual exported raw cases, production/FiPy results, source-input
hashes, command record and analysis in
`scientific/centrifuge-v44/transient67/studies/review-1/transient67-electrical/`.
Read-only host SHA256 checks match both the export manifest and analysis links:

- cases: `0c81b8e24d77fb516d2b6ed4de73ea9426effb66e59b914dfa565a1d2ad97665`
- production: `214281db7083d52ec4f82a4c4af5a0bed978af21af330162d8a53c482ab42515`
- FiPy: `42094ae592c42b719f5338020069458e12edf0879a659188cd8cf8d52a2af8a3`
- analysis: `c47a9d502469420a6bc9c7d413c10d363706c2c3a70a51fe046be4b0c2f8b1fa`

Both solver input hashes link to those exact cases. All 20 ordered identities
match, with 64 radial cells and the stated four accepted physical times, and
all 652 numerical gates pass. All 20 FiPy cases were actually executed; none
are a surrogate or an unrun subset. Source hashes match the tested electrical
ledger. The reference versions are FiPy 4.0.3, NumPy 2.4.6 and SciPy 1.17.1.

**Four axial cells materially underresolve electrical torque and heating.**
The following production values compare the same frozen state at nz=4 and 64.
The final column pair is physical integrated torque, not neutral Omega:

| Accepted time | Joule heat, nz4 to64 (mW) | Outer current, nz4 to64 (mA) | Total torque, nz4 to64 (nN m) |
| --- | ---: | ---: | ---: |
| 0 | 2.126253 to 3.050831 | 1.274996 to 1.781372 | -25.75548 to -36.52202 |
| 15.625 microseconds | 2.080876 to 2.986431 | 1.260241 to 1.759014 | -25.46921 to -36.10350 |
| 0.5 milliseconds | 1.135865 to 1.641089 | 0.9137845 to 1.250896 | -18.64620 to -26.25188 |
| 1 millisecond | 0.6267315 to 0.9099396 | 0.6712570 to 0.9100066 | -13.76976 to -19.32018 |

Directly recomputed from the exported projected arrays, the nz4-to64 errors
are:

| Accepted time | Torque profile L1 | Joule profile L1 | Terminal-current error / total absolute electrode current | Largest global-work difference / combined power |
| --- | ---: | ---: | ---: | ---: |
| 0 | 29.47959% | 30.60854% | 14.21311% | 15.14743% |
| 15.625 microseconds | 29.45502% | 30.61484% | 14.17763% | 15.15540% |
| 0.5 milliseconds | 28.97192% | 30.90303% | 13.47141% | 15.37843% |
| 1 millisecond | 28.72859% | 31.13708% | 13.06889% | 15.53772% |

For an ordinary relative-to-nz64 readout, total Joule heat is underestimated
by 30.30578%, 30.32232%, 30.78589%, 31.12383%, respectively; outer terminal current
is underestimated by 28.42621%, 28.35525%, 26.94958%, 26.23603%. These differ from
the protocol normalizations above and must not be conflated. The independently
assembled actual FiPy calculation confirms the defect: its nz4-to64 torque L1
differences range 28.71037–29.46209% and Joule-profile differences
30.50738–31.11611%. No conductivity or torque coefficient was fitted to make
these calculations agree.

The sampled case is electromagnetically braking: positive outward outer
current and negative integrated torque give negative mechanical work. The
fixed outer electrode receives power, so Pe is negative. Its small magnitude
relative to Joule/mechanical exchange is why terminal-current and profile
gates are needed alongside the combined-power test.

At the prospectively gated finest nz32-to64 pair, worst differences across
all four states and both solvers are 0.367556% for global work on combined
power scale, 0.632140% for projected torque L1, 0.947028% for projected Joule
L1 and 0.288300% for terminal currents on electrode-current scale. All are
below the unchanged 2% limits. Cross-code differences over all 20 cases are
at most 0.103176% for potential and 0.200876% for global work, below 1% and 2%.
The agreement at coarse nz does not establish coarse accuracy: both codes
can agree while sharing an underresolved axial direction.

Independent cell/boundary charge residual ratios are at most 1.584e-12 and
8.078e-13; work-identity ratio is at most 7.914e-14. Projected mechanical/heat
identity ratios are at most 6.497e-16 and 1.152e-15. All exported insulating
currents are exactly zero. Thus the coarse discrepancy is consistent with
spatial truncation of the electrode end field, not a lost-current,
double-heating or torque/work-adjoint defect.

Recommendation: retire nz=4 for quantitative electrical/torque/heating output
in this problem. The sampled nz32-to64 comparison passes, conditional on the
fixed 64-cell radial representation and prescribed conductivity. This study
does not yet establish an error to the exact continuum limit, convergence at
every intermediate time, a fully re-evolved refined coupled trajectory, all
operating parameters, local peak current density or axial thermal/momentum
equilibration. Those are distinct checks; no live promotion follows merely
from this frozen-state electrical pass.
