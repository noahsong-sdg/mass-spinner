# Independent frozen-source response review

I did not author this diagnostic or execute its tests/solvers. I reviewed its
source, actual FiPy/Q1/electromagnetic paths, driver, receipts and serially read
the exported responses. I previously suggested the accounting identities and
controls, so this is independent interpretation, not a blind second solver.

## Verified evidence

All 23 payload hashes and three decompressed seals in
[source-response-evidence-20261114](retained/source-response-evidence-20261114/)
match. The successful summary SHA256 is
`bc15bfcb69b8d16765baaa966ab00847a256e4d1a315558a4a3eb33d253101df`;
diagnostic source SHA256 is
`fc0715a9af1047965dc06c87abd25f570a4f355ecc9e357c1c70cc6b7d34ec2f`.
Its producer cases remain bound to canonical audit `f63ed0ef…1cbd5`.

The first control failure is retained: the test demanded cooling in a cell
separated from the temperature step at a picosecond timestep. The second
attempt changes only that assertion to the adjacent hot cell. Diagnostic
equations are identical across both attempts. All five controls then passed;
all 12 saved states received both sources separately at both timesteps.
Recorded case times are 1.36/2.93/6.69 seconds, peak RSS 708,504 KiB.

The sealed driver recomputes bitwise-identical q0 with the frozen initializer
and requires the active `FVDiffusion`. Each response checks unchanged archived
q and bitwise-preserved mass/species; electromagnetic axial momentum is also
unchanged. The code correctly uses actual FiPy thermal redistribution, rather
than the inherited inactive finite-element thermal stiffness.

## What the responses show

At r=17 mm, z=228 mm, using h=0.5 ps, pressure responses are in Pa/s:

| Clock | E, 80 cells | E, 160 | E, 320 | D, 80 | D, 160 | D, 320 |
|---|---:|---:|---:|---:|---:|---:|
| 1 µs | 2.897407e6 | 2.829218e6 | 2.812450e6 | 6.818602e5 | 5.824344e5 | 5.597065e5 |
| 2 µs | 2.837843e6 | 2.780441e6 | 2.765893e6 | 5.473655e6 | 3.569592e6 | 3.245724e6 |
| 4 µs | 3.658173e6 | 3.626243e6 | 3.621675e6 | 3.738216e7 | 1.340090e7 | -9.782328e6 |

At 4 µs the D radial velocity responses are respectively -9.281293e7,
-1.903533e8 and -2.819434e8 m/s². The fine local pressure sign reversal has
an explicit energy explanation: conduction contributes -46.430163e6 W/m³,
viscous heating +31.756666e6 W/m³, and numerical heating only +4.240234 W/m³.
Multiplication of their sum by 2/3 gives the reported pressure response.
E's pressure heating follows positive Joule heating; its signed mechanical
work changes kinetic energy and must not be counted as thermal heating again.

This point is not the whole density ring. In the fixed region r=16–19 mm,
z=225–237 mm, fine D conduction adds 137.876607 W and viscous heating adds
123.844384 W, with numerical heating 1.04e-5 W. The regional mean pressure
response is therefore positive, 4.407851e7 Pa/s. The corresponding coarse and
middle regional means are 3.678599e7 and 3.910638e7 Pa/s. These are signed
piecewise-constant cell allocations with exact overlap volumes, not boundary
flux budgets; overlapping regions cannot be added.

For D at 4 µs, focal-region RMS changes when h halves are approximately
21/70/160 Pa/s and 16/78/226 m/s². These are tiny compared with the recorded
responses and the cross-mesh spread. The fine relative RMS sensitivities are
about 2.7e-6 and 9.7e-7, respectively. This probe's step sensitivity does not
explain the mesh spread or qualify the production timestep policy.

At q0, fine E already supplies radial acceleration about -7.94e6 m/s²;
D has zero radial acceleration. The torsional initialization is not full
radial-force equilibrium. Its release transient and mesh-dependent initial
torsion remain part of the declared problem, not evidence of a new solver bug.

## Limits and justified next step

The source response is demonstrably coupled to steep evolved gradients.
Because every mesh has its own evolved state and source discretization,
these data cannot distinguish those effects or identify a unique faulty
operator. Small implicit-step defects and subtraction residuals are retained;
instantaneous rates are not accumulated trajectory attribution.

A low-cost follow-up could evaluate an explicitly declared conservative
restriction/operator commutator on the same finest saved fields. Sum the six
extensive child states, preserve inventories, and quantify the induced change
in recovered thermal/kinetic energy before attributing any difference.
Collapsed velocity/shear and density–radius moments are a real confound.
Require equal-level identity, uniform-density/temperature/rigid-rotation
restriction controls, positive primitives, signed algebraic closure and h/h2.
Accepted-stage histories or a common-initial-state trajectory are still needed
for causal attribution. No coefficient change, fitted input, new gate or
experimental qualification is justified; all prior failures remain retained.
