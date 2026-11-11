# Independent fast-transient physics review

Reviewer: `/root/fast55_physics`. Project execution is parent-owned inside
offline safe-dev. I independently inspected source and exported receipts;
I did not execute project code on the host or in a separate VM.

**Verdict:** no blocking physical inconsistency found within the stated
radial-solid/lumped-gas benchmark and observation window. Actual joint
refinement, independent all-state balances and the independent constant-
property continuum benchmark pass. This does not validate the gas-mixing
or prescribed-interface closure for a real submicrosecond experiment.

## Physical cause and appropriate correction

The previous fast-gas campaign refined time on 93.75 micrometre uniform
wall cells. The heat penetration scale after five gas-film time constants
is only about 12 micrometres. Thus time convergence alone qualified the
wrong spatially coarse approximation of the early wall response. The
finest 160→320-step endpoint difference also remained 0.136 K; earlier
gas heating has a larger backward-Euler error than that endpoint suggests.
In simple terms, the wall response was concentrated inside a layer much
thinner than a cell, and the initial gas heating happened between coarse
time samples.

A smooth, nested grid fitted to both annular surfaces resolves the heat
layers without expanding the browser kernel's 128-cell domain. Keeping
the full 12 mm wall preserves its mass, distant boundary and energy budget.
Actual [FiPy nonuniform cylindrical meshes](https://pages.nist.gov/fipy/en/latest/generated/fipy.meshes.cylindricalNonUniformGrid1D.html)
support an explicit spacing sequence. No new heat law is required. The
logarithmic half-cell resistances and annular masses remain appropriate.

The finest first-cell width is about 0.112 micrometres. At the first
qualified checkpoint, `t = tau/64`, the penetration scale is about
0.663 micrometres; this is materially better resolved than the previous
uniform mesh. At the first accepted numerical step the penetration scale
is only about 0.117 micrometres, so no claim of continuum wall-field accuracy
at arbitrarily early positive times is justified. The analytic initial
right limit is a separate point, not a finite-cell reconstruction promoted
to exact boundary data.

## Equations and observables inspected

Gas remains a lumped, constant-volume monatomic reservoir, with prescribed
capacity. The passive benchmark has no external deposition. Its coupled
equations are

`Cg * dTg/dt = -q`, `q = Gfilm * (Tg - Ts)`,

and radial solid heat conduction with fixed mass, temperature-dependent
integrated enthalpy and conductivity. Positive `q` means gas→wall; the
cold-gas case therefore has negative `q` while gas warms.

For the discrete inner link, the film and solid half-cell resistances are
in series. The interface temperature is correctly reconstructed as
`Ts = Tg - q/Gfilm = Tcell + q*Rhalf`. It is not the inner cell-center
temperature. The outer reconstruction has the corresponding wall→coolant
sign. Each internal heat flux appears with equal and opposite signs.
The runner's depth profiles interpolate the reconstructed boundary and
cell-center states; those profiles are discrete reconstructions and must
be checked through refinement rather than treated as exact point values.

The joint campaign compares the same 97 physical times without time
interpolation, including gas, both surfaces, depth profiles, interface
power and cumulative transfer. Prospective pair thresholds are 0.05 K gas,
0.001 K surface/profile, 50 W interface power, and about 3.393e-5 J transfer,
with the existing 0.85 contraction criterion. These are sampled-history
criteria, not continuous-time error bounds or experimental uncertainty.

## Independent continuum benchmark

I derived and implemented `scientific/thermal-v55/halfspace.py`, importing
neither finite-volume solver. This is an independently solvable,
constant-property, planar, semi-infinite solid coupled to the same lumped
gas and total-W/K film. It is explicitly separate from the nonlinear
cylindrical tungsten calculation.

Let `A = 2*pi*ri*L`, `a = G/Cg`, and
`b = G/(A*sqrt(k*rho*Cp))`. With an initially uniform wall and gas-to-wall
temperature contrast `theta0`, the Laplace-domain gas response is

`theta_g(s) = theta0 * (sqrt(s)+b) / [sqrt(s)*(s+b*sqrt(s)+a)]`.

Writing `r1,r2` for the roots of `z²+b*z+a`, and
`E(r,t) = erfcx(-r*sqrt(t))`, gives

`f(t) = (r2*E(r1,t)-r1*E(r2,t))/(r2-r1)`,

`Tg = Tw0 + theta0*f`, `q = -Cg*theta0*f'`, `Ts = Tg-q/G`.

The depth-dependent inverse transform is also evaluated analytically,
using the scaled complementary error function to avoid overflow. The
transform pair follows [NIST DLMF §7.14](https://dlmf.nist.gov/7.14);
[SciPy erfcx](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.erfcx.html)
supplies the established complex special-function implementation. The
coupled-system solution is a derivation from those identities, not a
claim that the cited sources validate this apparatus.

Self-checks independently integrate the heat-kernel convolution for the
surface and interior wall temperatures, integrate interface power to
recover gas-energy change, and check exact stationarity. This tests both
the transformed response and its derivative rather than comparing two
finite-volume implementations sharing a stencil.

The constant-property comparison has prospective absolute gates of
0.1 K gas, 0.002 K surface/cell-center wall, 100 W power and 1e-4 J transfer.
These allow finite backward-Euler error and the explicitly small planar
approximation; the tighter successive-refinement gates remain separate.
The validity screens `sqrt(alpha*t)/ri < 1e-3` and
`thickness/sqrt(alpha*t) > 20` disclose curvature and remote-boundary
scales. They are not rigorous error bounds. The benchmark uses an
adiabatic distant wall, fixed material properties and the qualified
`tau/64` through `5*tau` observation window.

## Physical limits that refinement cannot remove

The mathematical wall-layer problem can be well resolved while the gas
closure remains physically unvalidated. A uniform gas reservoir requires
mixing and thermalization much faster than the imposed gas-film time;
that condition is not established here. The prescribed 1000 W/K interface
may also require rarefaction/accommodation or gas-side transport physics
absent from this reduced model. No species-specific sound speed or mixing
time should be invented from the capacity-only benchmark configuration.

This work verifies the stated ODE/PDE model. It does not demonstrate that
a real neutral gas reaches a spatially uniform submicrosecond temperature,
that the apparatus has this conductance or tungsten construction, or that
Marathon hardware is calibrated. Axial/end losses, rarefied gas transport,
radiation, phase change and thermal expansion remain outside this model.

## Actual results independently inspected

I read `scientific/fixes-v43/thermal55-refinement.log`,
`thermal55-halfspace-audit.log`, `thermal55-physics-audit.log`, and the
corresponding command receipts. The actual command receipts record exit 0
and verify source before/after execution. The two independent audit commands
ran on 585 inputs, source snapshot
`e195a31a3e4f5b6dd9397166a056c03fa1fe47562aabd57236928043b97a8a58`.
The common campaign packet hash is
`fbc82ef2693f000aa373ee58a3939134eb44fea325a5db32700e11b4516af896`.

The joint campaign's actual 97-checkpoint histories pass the prospective
spatial, temporal and diagonal refinement gates. Finest spatial gas and
surface differences are 3.030e-5 and 4.123e-5 K; the fixed-depth profile
difference is 6.532e-5 K. Spatial ratios approach 0.25, consistent with the
second-order stencil in this resolved regime. At 128 cells, the finest
timestep pair differs by 0.0448754 K gas, 3.306e-5 K surface and 44.8788 W
interface power. Gas/time ratios approach 0.5003, consistent with backward
Euler. Remaining time error dominates gas error; the finest result is not
exact merely because the refinement criteria pass.

The uniform 128-cell negative control fails the refined accuracy gates:
0.172084 K gas, 0.503080 K inner-surface/profile differences and about
495.2 W interface-power difference against the fitted 128-cell case. Its
energy balances still pass. This directly demonstrates why conservative
solver acceptance alone did not establish a resolved wall response.
These are control differences, not absolute continuum error bars.

### Independent all-state physics implementation

I authored `scientific/thermal-v55/audit-physics.py`; it imports neither
FiPy nor production code. It independently reconstructs explicit annular
masses, factored enthalpy changes, cylindrical conductances, every energy
row, signed gas/coolant ledgers, entropy, passive bounds and the interface
temperature identity. It uses binary64 with stable algebra, not Decimal.

The actual parent-run audit passed **14 cases / 94,725 states**, including
the joint matrix, uniform negative control, external 256-cell holdout,
two constant-property cases and short graded case:

| Independent physical check | Maximum or minimum observed |
| --- | --- |
| Normalized node residual | 1.607e-15, below unchanged 1e-11 gate |
| Gas-row residual | 3.873e-17 J |
| Global step energy residual | 2.637e-11 J |
| Cumulative gas-exchange identity error | 4.053e-15 J |
| Minimum system-plus-bath entropy increment | +3.917e-12 J/K |
| Positive properties, passive bounds, signed cooling and surface identities | Passed every state |

The auditor script hash is
`d62249a7d1e448b9ecea6eba06292e1923b9de559d927205c739d3f757e7b753`.
The audit log binds each run JSON and full compressed state history by
SHA256. I inspected the exported auditor output rather than manually
reading all 94,725 states or separately reproducing the execution.

### Independent continuum response

Actual self-check results: surface heat-kernel convolution difference
1.137e-13 K; interior-profile convolution difference below binary64 output
resolution in the checked points; integrated-power/gas-energy difference
1.488e-13 J; exact stationarity passed.

Both constant-property 128- and 256-cell / 10,240-step cases pass the
predeclared continuum comparison over 96 positive-time samples plus the
separate analytic initial point. For the supported 128-cell case:

| Difference from half-space response | Maximum observed |
| --- | --- |
| Gas temperature | 0.0449267 K |
| Reconstructed surface temperature | 4.811e-5 K |
| All cell-center wall temperatures | 4.791e-5 K |
| Interface power | 44.8795 W |
| Cumulative exchange | 3.049e-5 J |

The 256-cell gas difference remains 0.0449017 K, while surface/wall
differences decrease to 2.268e-5 / 2.616e-5 K. This independently supports
the conclusion that time truncation dominates the remaining gas error.
The planar small parameter is 9.881e-5 and the wall is 1012 penetration
lengths thick at the final time. Curvature remains a disclosed approximation.

The actual analytic module hash is
`22f946212135584b4989b7e4b4cf19e8cbceaf51d7c8d1d6db504b388d1561e6`;
the comparison script hash is
`9aacbc7bfe7a7e3bb0e157d3cf859c59dddb5a4698399b1a42cf4ba0ec986cc7`.
This is an independent constant-property continuum benchmark, not a claim
that the nonlinear tungsten model equals the constant-property solution.

Repository build/typecheck, production-bundle comparison and deployment
remain separate parent-owned verification gates. This review approves only
the scientific scope and actual evidence described here.
