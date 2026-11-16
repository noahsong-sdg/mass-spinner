# Finite-current contacts: frozen verification protocol

16 November 2026, before execution. This extends the conditional angular/current
reference, not the live playground or an identified experimental apparatus.
The historical point-ring source and all old receipts remain unchanged.

## Root cause and scope

The existing point-ring load concentrates finite current on zero surface area.
Its contact self-potential and Joule energy grow under refinement even when
interior angular fields converge. In simple terms, the numerical grid has been
silently supplying the electrode width. Increasing resolution cannot recover a
missing physical width. Use fixed finite boundary supports and integrate their
actual surface current, rather than clipping heating or retuning conductivity.

Reuse DOLFINx 0.9.0/UFL/PETSc and scikit-fem 12.0.2/SciPy. Both assemble the same
Q2 variational equations independently. Geometry, coefficients, wall conditions
and field sample grid remain those of `public-fenicsx-reference/PROTOCOL.md`.
No experimental targets are read. Temperature, meridional motion, ionization
and electron/heavy energy partition remain absent.
The inherited sigma_parallel=1070 S/m, sigma_perp=107 S/m and viscosity
1.14e-4 Pa s are fixed conditional inputs. Their effective Hall parameter 3
was historically inferred using electrical observations; these are not newly
independent transport estimates. No new fitting does not erase that provenance.

## Declared boundary hypotheses

Uniform *surface current density* on an end annulus r=[4 mm, 4 mm+w] at z=.24 m
and a wall band z=[.07-h,.07+h] at r=.06 m. Currents are -100 A and +100 A in
the weak electrical load (opposite outward physical current). Normalize by
actual areas pi*(r_hi^2-r_lo^2) and 4*pi*R*h, not mesh nodes or ring circumference.
These are plasma injection hypotheses, not measured emitting solid surfaces,
equipotential electrodes, or reconstructed sheaths.

Retain three paired sensitivity cases, all fixed before solving:

| Case | Cathode annulus width w | Anode half-width h |
|---|---|---|
| narrow | 1 mm | 5 mm |
| middle | 2 mm | 10 mm |
| broad | 4 mm | 20 mm |

These illustrative supports are not physical uncertainty bounds. Varying both
supports together does not isolate either electrode's causal contribution.
The published 4 mm hollow-cathode aperture and 2 cm wall-ring construction do
not identify emission/current distributions. No case may be selected because
its voltage or velocity matches the experiment.

The work-conjugate port is V=P/I with P=integral(phi*source dA). It is the
current-weighted difference of mean contact potentials, not a point potential,
equipotential-metal voltage, 58 V terminal voltage, or the corrected 18.5 V.
Current is prescribed; reproducing 100 A is not a current prediction.

## Numerical contract

Contact edges conform to nested meshes n=1,2,4; physical widths never shrink
with refinement. Eight-degree quadrature; diagonal scaling and sparse direct
solves. Keep the original 5% angular-field/refinement and 1e-8 conservation
screens. Apply that same 5% fine-change/contraction screen additionally to port
voltage, integrated Joule power and viscous work. This is a new declared scope,
not retrospective application to the singular historical problem. Cross-code
fields and integrated budgets must agree within 5%; retain actual differences.

Analytic source torque for uniform annular area density is
`I*B/2 * (R^2 - (r_lo^2+r_hi^2)/2)`.
Check integrated signed source currents, gauge-invariant work, source moment
torque, wall reaction, passivity, current/field reversal, B=0, invalid supports,
and independent assembly before the full campaign. All failed cases and first
logs are retained; numerical failure exits nonzero after writing results.
No claim of converged local peak Joule density is made at sharp contact edges.

## Reproduce

Use the existing official DOLFINx image and dependency pins. Run offline,
non-root, one CPU, 2 GiB, writable temporary compiler cache, preserving inherited
PYTHONPATH while prepending supplementary SciPy/scikit-fem packages:

```
python3 -m unittest discover -s scientific/finite-contact-reference -p 'test_*.py' -v
python3 scientific/finite-contact-reference/campaign.py NEW_RESULT.json
```

Sources: [DOLFINx boundary entity API](https://docs.fenicsproject.org/dolfinx/v0.9.0/python/generated/dolfinx.mesh.html),
[primary footprint review](../boundary-v84/FOOTPRINT-SOURCES.md),
[voltage provenance](../boundary-v84/VOLTAGE-SOURCES.md), and the
[public-notebook adaptation attribution](../public-fenicsx-reference/NOTICE).
