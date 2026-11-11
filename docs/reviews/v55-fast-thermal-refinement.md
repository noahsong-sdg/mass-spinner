# Fast thermal transient: refinement review

**Verdict:** no blocking refinement defect found within the stated passive
radial-solid/lumped-gas benchmark. Joint spatial and timestep refinement
passes the prospective sampled-history gates. The original uniform-grid
control fails those same accuracy criteria, as intended. This qualifies
the disclosed numerical model and window, not Marathon hardware.

I authored the campaign generator, runner and refinement analysis, then
inspected the actual parent-owned safe-dev execution evidence. Separate
agents authored the physical row audit, Decimal solver and continuum
benchmark. I ran no project code on the host or in a separate VM; this
review is an inspection of their actual logged results, not personal
reproduction of the execution receipts.

## Execution path and cause

The previous 128-cell uniform mesh spreads 12 mm over 93.75 micrometre
cells. During the roughly 3.393 microsecond fast transient the thermal
penetration scale is only about 12 micrometres, and is smaller earlier.
Its first solid temperature is a cell-center value far inside the wall.
Refining time alone converges that underresolved spatial discretization,
not the physical surface response. In simple terms, the mesh averaged
away the thin layer that initially exchanges heat with the gas.

The minimal geometry extension accepts explicit strictly increasing
annular edges while preserving the default uniform construction and
production's 128-cell maximum. The campaign uses nested, symmetric
exponential spacing with beta 9 at both interfaces across the full
12 mm thickness. It keeps exact annular masses, logarithmic half-shell
resistances, nonlinear integrated enthalpy, fixed material mass and the
same backward-Euler equations. It does not shorten the solid domain or
pretend a cell-center temperature is a surface temperature.

For endpoint heat flow positive from gas to solid,
`q = G_series * (T_gas - T_inner_cell)` and
`T_surface = T_gas - q / G_film`.
The units, resistance signs and equal/opposite transfer are coherent.
The initially colder gas gives negative q and negative cumulative gas-to-wall
heat while its internal energy rises. The known continuum right limit at
t=0 is marked separately; it is not inferred from a finite-cell resistance.

## Prospective design and qualification window

The nonlinear 3 by 3 matrix uses 32/64/128 graded cells and
2,560/5,120/10,240 steps over five nominal gas-film times. An external-only
256-cell run at 10,240 steps supplies the spatial holdout. Production's
128-cell boundary is retained. The uniform 128-cell run uses the same
10,240 steps as the finest graded production-domain case.

All comparisons use the same 97 physical checkpoints, without temporal
interpolation. The positive-time window is tau/64 through 5 tau, about
10.603 ns through 3.393 microseconds; t=0 is the separate analytic right
limit. Inner-wall profiles use nine fixed depths: 0, 0.25, 0.5, 1, 2, 4,
8, 16 and 32 micrometres. Surface plus cell-center interpolation supplies
these disclosed finite-volume reconstructions, without extrapolation.
Outer-interface accuracy is checked through its reconstructed surface
temperature, not a separate outer through-depth profile.

Frozen finest-pair gates are:

| Observable | Maximum permitted difference |
| --- | --- |
| Gas temperature | 0.05 K |
| Inner surface, outer surface and reconstructed inner-depth profile | 0.001 K each |
| Interface power | 1e-4 of the initial 500 kW contrast power, or 50 W |
| Cumulative gas-to-wall transfer | 1e-4 of `C_gas * 500 K`, approximately 3.393e-5 J |

Spatial, temporal and joint contraction are checked separately against
0.85 where signals exceed the stated floors. Profile and outer-surface
criteria were added before inspecting the matrix data and derive the same
0.001 K surface threshold; the already generated case packet was not
changed to admit a result. No nonlinear residual tolerance was relaxed.

## Actual refinement evidence

I inspected `scientific/fixes-v43/thermal55-refinement.log` and its receipt.
The analysis exited 0 on 585 immutable inputs, source snapshot
`e195a31a3e4f5b6dd9397166a056c03fa1fe47562aabd57236928043b97a8a58`,
with source verified before and after execution. The case packet hash is
`fbc82ef2693f000aa373ee58a3939134eb44fea325a5db32700e11b4516af896`;
the analysis script hash is
`4414e2045f41f9435232a823bbe52f021d7fe12aaa8687813c065e8342c49938`.
The result binds each of its 11 run JSON files by SHA256.

All three spatial slices, all three temporal slices and the joint diagonal
pass their contraction gates. At 10,240 steps, gas and inner-surface spatial
ratios approach 0.25. The fixed-depth profile ratios are 0.3251 then 0.24985,
consistent with entry into the expected second-order regime. At graded
128 cells, the gas temporal ratio is 0.500305 and surface/profile ratio
0.503624, consistent with first-order backward Euler.

| Finest comparison | Gas difference | Inner surface difference | Inner-depth profile difference |
| --- | ---: | ---: | ---: |
| Time: 5,120 to 10,240, graded 128 | 0.0448754 K | 3.30613e-5 K | 3.30613e-5 K |
| Space: graded 128 to 256, 10,240 steps | 3.02955e-5 K | 4.12281e-5 K | 6.53192e-5 K |
| Joint: 64/5,120 to 128/10,240 | 0.0449755 K | 1.58001e-4 K | 2.61495e-4 K |

Outer-surface differences also pass: 2.918e-8 K for the finest temporal
pair, 1.394e-7 K for the finest spatial pair and 5.557e-7 K for the joint
pair. The finest temporal power difference is approximately 44.879 W,
below 50 W; normalized cumulative transfer difference is 8.97508e-5,
below 1e-4. All six finest-pair criteria pass for time, space and joint
refinement. These are measured consecutive-difference sizes, not rigorous
absolute error bounds.

The uniform control remains negative evidence. Compared at the same fine
timestep with graded 128, its sampled gas differs by **0.172084 K**, inner
surface/profile by **0.503080 K**, power by **9.90364e-4** of the initial
scale and cumulative transfer by **3.44167e-4** of the energy scale.
It fails the corresponding frozen accuracy gates. Its conservation audit
still passes, which correctly demonstrates that solving a discrete energy
balance is insufficient to establish spatial accuracy.

## Independent physical and continuum checks

I inspected `thermal55-physics-audit.log` and its exit-0 receipt. The
independently authored implementation imports neither FiPy nor production
code. It reconstructs every accepted energy row, signed coolant/inner
transfer, entropy and passive bounds across all 14 cases and **94,725
states**, including both constant-property cases, the uniform control
and the five-step numerical audit case. Its maximum reported normalized
node residual is below 1.61e-15 against the unchanged 1e-11 gate.

The separate Decimal80 result is in `thermal55-numerics-green.log`:
five selected early graded steps agree with FiPy within 3.411e-13 K.
The earlier failed Decimal passive-bound assertion remains recorded; its
green result explicitly discloses a 1e-76 K arithmetic overshoot and the
bounded arithmetic allowance. It is not evidence of a physical overshoot,
nor an independent full-history rerun.

I also inspected `thermal55-halfspace-audit.log`, its exit-0 receipt and
the analytic implementation. The closed-form transform solves a lumped
gas and finite film coupled to a constant-property semi-infinite planar
solid. Flux signs, the root-product derivative and shifted heat-kernel
profile are coherent. Independent heat-kernel convolution and integrated
gas-energy self-checks pass; maximum surface mismatch is 1.14e-13 K and
energy quadrature mismatch about 1.49e-13 J.

At 96 positive-time checkpoints the constant-property cylindrical runs
agree with that continuum benchmark within the prospective absolute gates.
For graded 128, maximum gas difference is 0.044927 K, surface difference
4.8111e-5 K, power difference 44.8795 W and cell-center wall difference
4.7909e-5 K. Graded 256 reduces surface difference to 2.2677e-5 K and
cell-center wall difference to 2.6156e-5 K, while gas time truncation
remains about 0.0449 K. This independently corroborates the wall-layer
resolution and the remaining first-order temporal error.

The half-space benchmark is deliberately separate from nonlinear tungsten
truth. Its material properties are frozen at 1000 K and its distant outer
boundary is insulated. The disclosed curvature parameter is about
9.88e-5 and thickness/penetration ratio about 1012, supporting the short-time
planar approximation without making curvature exactly zero.

## Limits and final gate boundary

Qualification is for the specified passive setup and sampled time/depth
window. It does not establish continuous-time maximum error, initial
heating-rate accuracy at arbitrarily small positive times, a nonlinear
continuum exact solution, spatial gas dynamics or every slider setting.
The approximately 0.045 K gas temporal difference remains finite and
must not be described as exact fast-transient evolution. Radial conduction,
fixed density/geometry, prescribed films and the adopted tungsten property
domain remain physical assumptions; radiation, axial structure, expansion,
rarefaction and apparatus calibration are outside this study.

The final repository build/typecheck and any deployment verification are
separate parent-owned gates. This review does not approve or claim those
gates before their actual evidence is available.
