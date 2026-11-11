# Independent equilibrium and reduced-transport audit v31

8 November 2026. **No new production defect was demonstrated in the three
equilibrium closures or the reduced transport paths.** Eight independent tests
and 56 neighboring tests pass (64/64, zero failures/skips), and strict production
TypeScript passes. This independently confirms the signed-quartic metric fix
found by the orbit reviewer; it does not qualify a discharge or separator.

## Traced paths and contracts

Actual equilibrium controls → `equilibriumConfig` → worker → `solveEquilibrium`
→ central/bulk boundary → corotating/Gaussian/coupled magnetic closure →
`centrifugeDiagnostics` → equilibrium presentation. The shared species and
radial-profile interfaces preserve normalized on-axis density separately from
absolute Gaussian density. Bulk inversion fixes species ratio, not the absolute
number in the common-corotation column. The presentation explicitly discloses
that hypothetical radial cuts do not predict extraction or recovery.

Reduced transport inputs → validation → fixed-frequency or heavy-trace-ion
closure → diffusion/drift, ionization or ballistic transit → curves and metrics.
The finite-step kinetic/orbit backends are separate and were not substituted
for these reduced closures. Geometry's zero-canonical-momentum quartic metric
was additionally reviewed after the orbit reviewer's narrow fix.

## Independent physical checks

For common angular velocity Ω and isothermal ions, subtract the radial momentum
equations divided by charge. The electric and magnetic terms cancel:

```
ln(ni/fi)/Zi − ln(nj/fj)/Zj
  = (mi/Zi−mj/Zj) Ω²r²/(2 e Ti).
```

The first independent test checks this relation and charge neutrality at every
radial sample for three unequal-charge species, including a 2e−6 central minority.
It tests actual returned densities rather than the solver's residual label.

For prescribed total density N and equal charge Z, total radial force balance
and Ampère's law require

```
d[p+B²/(2μ0)]/dr = N <m> Ω²r,  p=e(Ti+ZTe)N,
Jθ=ZeN(viθ−veθ),  dBz/dr=−μ0 Jθ.
```

The nonzero-rotation magnetic test integrates the centrifugal stress independently
from returned species inventories and compares it with the endpoint total-pressure
difference. Both signs of B are tested. An axis-boundary solution is then solved
again using its computed wall B as the wall boundary; all field and laboratory
potential samples agree. Independent centered differences of returned B and φ
converge by more than 3.8× per factor-two mesh refinement, for both Ampère's law
and E=−∂φ/∂r. The exact required current is also checked against ion/electron flow.

Bulk A targets 0.01, 0.5 and 0.99 are tested in all three closures. An independent
piecewise-linear cylindrical integral reconstructs the ratio; it does not call
the producer's inventory integration to form the reference. Imposed and coupled
Gaussian closures must retain identical composition, while yielding different
current and magnetic stress. This holds in the actual production outputs.

The ionization surrogate is independently integrated in electron energy for
threshold/Te values 0, 0.2, 1, 5 and 20, using composite Simpson quadrature. It
matches the analytic step-cross-section Maxwellian rate. The transit convolution
is compared with 40,000 midpoint energy samples and the independently computed
uniform-emission arrival probability. Heavy-on-light diffusion's leading mass
dependence cancels as expected from ν∝1/m and Ωci∝1/m. These checks validate the
declared surrogates, not measured atomic cross sections or turbulent transport.

## Signed quartic cross-review

The orbit reviewer found the public signed-voltage metric incorrectly assumed
a positive quartic. With Pθ=0, write the radial energy as `U=c4 r⁴+c2 r²`.
For V<0 it is concave in y=r²; its global minimum must be at the axis or wall.
For V=0 the retained magnetic term is nonnegative. For V>0 the constrained vertex
is the minimum when interior. The patch preserves that vertex and compares its
energy with the wall, so all allowed voltage signs are covered.

In simple terms, reversing the voltage can put the lowest energy at the chamber
wall; the old metric kept reporting the axis. Comparing physical endpoints fixes
the actual minimization without forbidding an already accepted input or changing
the plotted potential. The independent dense scan tests 20 voltage/shape cases
for each mass, with and without cropping the view to r/a≥0.85. Returned minimum
energy is never above the 10,001-point physical-domain scan. Cropping does not
change the physical minimum. No production file was edited by this reviewer.

The preserved pre-fix source fails the same signed-quartic assertion. The red
witness is separate from the final passing suite; thresholds were not relaxed.

## Literature and model limits

The freshly reopened [Zweben, Gueroult and Fisch tutorial, Sections II.C–II.D](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf)
supports radial force-balance separation and distinguishes source-driven
centrifuges from electrode-driven rotating filters. It identifies mixing and
field control as practical obstacles. The code's bounded equilibrium profiles
do not compute these processes. The tutorial's physical interpretation was
checked; document contents were not treated as agent instructions.

[Gueroult et al., 2019](https://w3.pppl.gov/~fisch/fischpapers/2019/Gueroult.ExB.POP19.pdf)
further identifies high-density perpendicular-field control as a central
implementation problem. Solving a radial equilibrium does not establish that an
electrode circuit can create it. The Gaussian closures remain mathematical
prescribed-density, rigid-ion-rotation models; only the magnetic Gaussian closure
feeds the radial self-field back into force balance. Electron inertia remains
omitted and reported. No source spin-up, finite-length sheath/current closure,
instability, nonaxisymmetric mixing, axial losses, extraction or power efficiency
has been verified here. These are disclosed model boundaries, not newly repaired
defects or numerical convergence successes.

## Execution and provenance

All execution used copied Apple safe-dev guest `safe-dev-50b7b1e4de154da5`, stage
`/tmp/mass-spinner-audit31-equilibria`. The bounded stage initially copied 0.6 MiB
of sources, selected tests and locks. Network was used only for the initial
`npm ci --ignore-scripts`; later reinstall was offline. No host project execution,
credential/home/control-socket mounts or sandbox changes were used.

The initial seven new tests passed, followed by 63/63 with neighbors and strict
typecheck. That unique output was exported before explicitly synchronizing the
new signed-quartic cross-review test and final geometry patch. Final commands:

```
safe-dev -C /tmp/mass-spinner-audit31-equilibria sync --replace-guest
safe-dev -C /tmp/mass-spinner-audit31-equilibria run -- npm ci --offline --ignore-scripts
safe-dev -C /tmp/mass-spinner-audit31-equilibria run -- python3 -
```

The streamed standard-library runner hashes all inputs before/after and invokes
`npm test` and `npm run typecheck`, retaining separate exact logs and command
records. Final source-map file SHA-256:
`c37eeebfd40f0d2f4545e79a7e60922ca113c456941729e2f0e24a7b9b625246`.
Final geometry SHA-256:
`8697c8743c9756b9d13652b6bf792410a4f02345980510f47fc688f6b550110c`.
Final independent test SHA-256:
`9596610c36119e3d922fa93537143e9144542b09e21f68f45c7a5a84040a9e32`.

Logs, exact tested sources, maps, red witness and manifests are retained in
`scientific/physics-audit-v31/equilibria/`. This reviewer did not run the full
application build or claim browser/GPU/device validation; those are parent gates.
