# Depth-resolved target conduction, v35

9 November 2026. **The new thermal step is numerically checked, including an
actual FiPy reference. Material coefficients remain assumed scenarios.** This
is one-dimensional depth conduction, not a calibrated Marathon thermal model,
resolved beam-surface temperature, three-dimensional hotspot or target lifetime.

## Demonstrated omission and bounded correction

The existing path is `target-exposure-ui.js → simulateTargetExposure`. It feeds
the initial frozen source's conditional assembly heat to one exact bulk node.
There is no depth state or thermal step for the isotope evolution to call.
Technically, constant-power forcing and a single participating capacity collapse
film and backing into one temperature. Simply, the model cannot show the thin
film heating differently from its support or pass those local temperatures to
the evolving target calculation.

The new `src/target-conduction.ts` adds a separate depth step; the old reference
and saved results are unchanged. Each cell has positive width, conductivity
and volumetric heat capacity. Interior contacts, backing contact, cooling-bath
temperature and convection coefficient are explicit inputs. No LiT, copper or
Marathon material constants are inferred from a rendering or a generic name.
Root's coupled solver owns the common isotope/thermal state and deposition
updates; this module never secretly refreshes a source or assumes a beam shape.

This is the smallest coherent API addition for the missing depth state. It
avoids rewriting the existing exact bulk reference or bundling a Python PDE
runtime into the browser. The offline reference uses FiPy as a real independent
assembly/solve implementation, rather than calling our matrix solver through a
Python wrapper.

## Equation, boundaries and returned quantities

For cell i, per illuminated area:

```
C_i = Cv_i Δz_i
C_i (T_i,new − T_i,old)/Δt
  = q_i + G_left (T_left,new − T_i,new)
        + G_right (T_right,new − T_i,new)
G_ij = 1/[Δz_i/(2 k_i) + R_contact,ij + Δz_j/(2 k_j)]
G_back = 1/[Δz_last/(2 k_last) + R_contact,back + 1/h]
```

The front is insulated; nonnegative beam heat is supplied as **W/m² integrated
over each cell**, not a volumetric density or total device watts. The last
term uses the fixed bath temperature at the back. `h=0` is exactly adiabatic.
Internal face flux is positive toward increasing depth. Cooling transfer is
signed: a warmer bath can add heat to the solid.

`advanceTargetConduction(config, temperatureK[], durationS,
depositedHeatFluxWM2[])` returns cell temperatures, all face fluxes and:

```
depositedJm2 = Δt Σ q_i
storedChangeJm2 = Σ C_i (T_i,new − T_i,old)
coolantJm2 = Δt G_back (T_last,new − T_bath)
energyResidualJm2 = depositedJm2 − storedChangeJm2 − coolantJm2
```

Multiply energies by the illuminated area to obtain J. The implementation
solves relative-to-bath temperatures and evaluates stored heat in that same
coordinate to avoid needless absolute-Kelvin subtraction. Temperatures are
cell averages. A front-cell maximum must not be labeled a measured surface
temperature or a resolved radial hotspot.

Backward Euler produces a monotone M-matrix for the stated positive capacities
and conductances. Its first-order time accuracy is explicit; unconditional
linear stability does not establish accuracy. A positive Schur-complement
tridiagonal recurrence avoids subtracting nearly equal diffusion diagonals
when thin-film equilibration is much faster than a step. For elimination,
if a_previous is the preceding capacity plus its already eliminated left
coupling and g is the intervening time-integrated conductance, the next
diagonal contribution is `g*a_previous/(a_previous+g)`, evaluated as a ratio
before multiplication. There is no temperature clipping or energy projection.
Unrepresentable arithmetic and invalid physical inputs reject explicitly.

Backward Euler was chosen over explicit diffusion to avoid a prohibitive
`Δt ~ Δz²/α` stability limit, and over Crank–Nicolson to avoid oscillatory
responses to sharp pulses. Time refinement remains mandatory in the coupled
calculation; an IMEX step using this solver remains first order unless a
different higher-order thermal method is actually demonstrated.

The method matches the cell-centered finite-volume conservation and implicit
transient formulation described by [NIST FiPy](https://pages.nist.gov/fipy/en/stable/numerical/discret.html).
[INL MOOSE HeatConductionFV](https://mooseframework.inl.gov/syntax/Physics/HeatConduction/FiniteVolume/index.html)
provides a second primary example of cell-centered conduction, thermal storage,
volumetric forcing and boundary terms. These sources support the numerical
method, not the chosen scenario's material properties.

## Verification observed

**8/8 producer regressions pass**, plus strict standalone source typecheck:

1. Depth-local heat gives the independent two-cell film/backing gradient and
   correct stored energy instead of one bulk temperature.
2. Adiabatic single-node heating and the zero-time/input-immutability limits.
3. Stiff insulated heterogeneous cells conserve energy and satisfy min/max bounds.
4. Uniform bath equilibrium remains exact.
5. Layered steady resistance includes interior contact and the back half-cell.
6. A hotter bath gives negative coolant transfer; one-node refinement converges
   to the independent exponential at the declared first-order rate.
7. A closed cosine mode matches the discrete eigenvalue; N=8/16/32 at 1µs over
   20ms converges against the continuum mode at a ratio between 3.8 and 4.2.
8. Negative heat, malformed contacts, invalid geometry and nonfinite arithmetic
   reject at their domain boundaries.

The separate parent-assigned adversarial reviewer also reported four public-API
thermal checks passing before this producer's FiPy comparison: layered steady
resistance, insulated energy/min-max, one-node analytic temporal convergence
and a joint depth/time eigenmode study. That review retains its own evidence;
it is not represented by these eight producer tests.

### Actual existing-code comparison

Installed **FiPy 4.0.3**, Python 3.11.2 and SciPy 1.17.1 inside the dedicated
Apple safe-dev guest. Every Python dependency is pinned in
`python-requirements.txt` and `python-freeze.txt`; the 21 downloaded wheels,
including FiPy, are retained for offline reproduction and SHA256 sealing.
The comparison uses actual FiPy `TransientTerm`, `DiffusionTerm`,
`ImplicitSourceTerm` and SciPy `LinearLUSolver` assembly and solve. It does not
import our production code or implement its tridiagonal recurrence.

For a like-for-like contact/Robin comparison, interior face conductivity is
the exact series resistance times center distance. The back Robin condition
is algebraically eliminated to a last-cell sink `G_back/Δz_last` plus bath
source. The outer mesh faces otherwise use FiPy's natural zero flux. This
tests the stated finite-volume equations, not a different continuum boundary
or a FiPy source modification.

Five fixed cases cover an insulated cosine mode, a highly heterogeneous
film/backing pulse and cooldown, contacts with a warmer bath, one-cell
adiabatic heating and one-cell cooling. **113 states / 379 temperature scalars
pass** the prospectively stated `1e-7 K + 1e-10 |T|` gate. Maximum actual
production-versus-FiPy difference is **2.8705926524708048e-11 K**.

An initial reference attempt exposed a harness issue: integer initial
temperatures made FiPy allocate an integer `CellVariable`; FiPy warned about
this and the warm-bath comparison failed by 0.877 K. The corrected harness
explicitly constructs floating temperatures. The failed script and log remain
in `first-fipy-attempt/`; no production coefficient, algorithm or comparison
tolerance changed. An intermediate no-index package-resolution command named
an absent wheel directory and failed; its log is retained but is not a physical
benchmark. The subsequent recorded wheel download and actual offline install
passed. The first producer test invocation also had a test-only JavaScript
unary-minus/exponent parse error; it is retained in `first-parser-attempt/`.
The corrected eight tests passed twice, including the final exported snapshot.

## Exact isolated snapshot and commands

Stage `/tmp/mass-spinner-thermal-v35`, guest `safe-dev-b322f30d08070dec`.
All dependencies and code executed in that Apple VM, without host binds,
credentials, sockets or sandbox changes. Online invocations were only npm/pip
downloads. The failed-output exports preceded each replacement sync; the final
installation was offline from cached npm packages and retained Python wheels.

Final offline commands, all exit zero:

```
node --import tsx reference-production.ts
.venv/bin/python reference-fipy.py
node --import tsx --test tests/target-conduction.test.ts
./node_modules/.bin/tsc --noEmit
```

Executed through `safe-dev -C /tmp/mass-spinner-thermal-v35 run -- ...`.
All 35 declared input hashes match before and after the final four commands.
Their aggregate execution took **1.749783459s**, of which FiPy took 0.834744417s.

| Input/output | SHA256 |
| --- | --- |
| `src/target-conduction.ts` | `9f9671a619e91524fe6016276aaae3aa3de2e57b86dcd033b6f60ded2950fcb2` |
| `tests/target-conduction.test.ts` | `3a00cf8ee95213c90ed07977887c2ffb312864a4ca4a8d4dc4b5653719528b54` |
| `input-sha256.json` | `efaf5ae0b96b1212e5552a17d4c30b0c9e3e780b3e16d0293deffab7b64a30be` |
| `fipy-reference.json` | `7318089e7fe46daf303385a7238f51b40a436e1226b2c9b55ee582a4a4a8ac00` |

Final export `/tmp/mass-spinner-thermal-v35-final-export`; retained evidence
under `scientific/marathon-v35/thermal/`, with `SHA256SUMS.json`. Root owns the
full coupled application gate and deployment; this standalone study establishes
neither a calibrated operating point nor observed browser interaction.

## Remaining physical limits

Constant material properties, one-dimensional depth, adiabatic beam-facing
boundary and a prescribed fixed-temperature cooling bath are declared closures.
This does not solve radial spot spreading, coolant hydraulics, radiation, phase
changes, mechanical failure or temperature-dependent conductivity/capacity.
The coupled model may use local temperature in explicitly parameterized isotope
transport laws; their coefficients need independent material data. Numerical
agreement with FiPy cannot supply those data or establish safe operation,
actual target lifetime or a three-dimensional reactor digital twin.
