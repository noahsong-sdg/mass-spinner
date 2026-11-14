# Independent source-commutator review

I reviewed the source, controls, driver and exported results without running
project code or a VM. I did not author this diagnostic; I previously proposed
the restriction experiment and requested regional reporting. This is an
independent interpretation/provenance audit, not an independent PDE solver.

## Checks and scope

All 30 payload hashes in
[source-commutator-evidence-20261114](retained/source-commutator-evidence-20261114/)
match, including the preserved first global-only probe. Both second-probe
decompressed output hashes also match. Summary SHA256:
`0e54c7ea47d022269bc719a7899e5462a7b963d003dd5fa5cc924d32fab7e148`.
Diagnostic source SHA256:
`69f2b3d469810e073ae5da3608fa113a85aec47311f1794a0f27be5092d0af08`.

The second receipt records seven passing controls and both adjacent radial
pairs, with 703,128 KiB peak RSS. The driver verifies case/source seals and
bitwise native q0 initialization, caches fine rates before releasing its
large source operators, and rechecks admitted inputs afterward. The active
heat implementation remains FiPy. No new trajectory or numerical gate ran.

Restriction sums all six extensive child channels, without volume weighting.
With S(q,h)=[Op(q,h)−q]/h, the signed identity is
`Sc(qc)−R Sf(qf) = [Sc(qc)−Sc(Rqf)] + [Sc(Rqf)−R Sf(qf)]`.
Below these are called total, archived-input sensitivity and commutator.
Conserved inventory/domain checks and signed algebra are correctly retained.

## Independently checked regional arithmetic

At 4 µs and h=0.5 ps, in r=16–19 mm, z=225–237 mm, the D-source RMS
radial force-density terms (N/m³) are:

| Radial pair | Total | Archived-input sensitivity | Commutator |
|---|---:|---:|---:|
| 80/160 | 9915.384 | 5457.854 | 4944.782 |
| 160/320 | 12781.895 | 8720.886 | 4486.092 |

Corresponding total-energy rate-density RMS values, in 10⁶ W/m³, are
(19.532002, 8.183533, 15.227168) and
(21.375562, 15.617005, 14.606694). These are total-energy source rates,
not thermal heating alone. RMS values do not add or define attributable
fractions; the underlying signed fields obey the identity. Regional signed
force and power integrals also close to reported rounding precision.

The h-halving RMS change divided by each listed D-term RMS is at most
6.543725e-6. Tiny-step sensitivity does not explain their cross-mesh spread.
Collapse-induced focal pressure RMS decreases from 2.191617 to 0.667112 Pa.
Thermal/kinetic remapping and inertia changes are reported explicitly;
a small pressure norm cannot exclude derivative-sensitive mapping effects.

## Physical interpretation

The native D-source difference does not contract in this focal diagnostic.
Both archived-input sensitivity and restriction commutation are material;
neither a purely evolved-state explanation nor a purely local source-operator
explanation is established. The commutator includes coarse moment closure,
geometry and transport-field representation; it is not pure operator error.
Regional allocations use exact overlap volumes with piecewise-constant rate
densities, not cut-boundary fluxes or the original convergence norm.

No unique bug, coefficient adjustment or closure replacement follows.
A justified next experiment must separately declare its question: finer-grid
contraction tests numerical resolution; accepted-stage histories or a common
initial-state control address accumulated causality. All existing density,
initial-state, spatial-matrix and experimental-qualification limits remain.
