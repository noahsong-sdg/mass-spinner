# Independent spatial thermal physics review

Reviewer scope: trace the current operation/transport path, derive independent physical gates, and write tests without changing production implementation. Project execution belongs to the parent in safe-dev; this reviewer has run no project scripts or tests on the host.

## Traced limitation and selected scope

`simulateFuelOperation()` calls the angular-momentum-conserving radial transport step inside a scalar temperature root. Its present wall update is one constant-capacity reservoir. This is internally coherent, but it cannot predict a liner inner/outer temperature difference or diffusion time. Its heat capacity and conductance are independent user constants, so neither material mass nor temperature changes affect the liner response.

The smallest coherent extension is a one-dimensional radial solid liner plus the existing lumped monatomic neutral gas. Spatial gas temperature is deliberately not inferred from the species distribution: that would also require gas heat transport, pressure closure, local momentum/energy advection, boundary accommodation, and discharge heating profiles. A radially resolved solid does not establish axial hot spots, coolant-channel temperatures or a Marathon as-built thermal solution.

## Conservative equations

Use a fixed reference cylindrical shell with cell mass `m_j = rho_ref * pi * L * (r_e[j+1]^2-r_e[j]^2)`. Evolve cell thermal energy `U_j=m_j*h(T_j)`, where `h(T)=integral(cp(T),T)` with one explicit reference. This is an engineering solid enthalpy approximation on fixed geometry, without thermal expansion/stress.

The implicit finite-volume residual is `U_j(new)-U_j(old) = dt*(Q_left-Q_right+S_j)`. A shared face contributes equal and opposite power to its two neighboring cells. For constant cellwise conductivities, its cylindrical resistance is `ln(r_f/r_left)/(2*pi*L*k_left) + ln(r_right/r_f)/(2*pi*L*k_right)`. Inner gas and outer coolant boundary resistances must include the half-cell solid resistance when their advertised conductances act at physical surfaces. Otherwise the method silently moves the gas interface to a grid center.

The gas first law remains `Delta Ug = Qslip + Wredistribution + Qohmic - Qgas_to_solid`. Drag work enters the solid under an explicitly stated deposition assumption. Total energy is `K+Ug+sum(Uj)`, externally driven by mechanical drive work and Ohmic heat and reduced by signed coolant transfer and separately recorded numerical mechanical dissipation. Numerical dissipation must never be deposited as heat. Hot coolant gives negative cooling energy.

For variable heat capacity, `cp(Tnew)*(Tnew-Told)` is not the energy increment; use the integral `h(Tnew)-h(Told)`. For variable conductivity, its spatial divergence remains `div(k(T)*grad(T))`; replacing it by `alpha(T)*laplacian(T)` changes the equation.

## State compatibility and reconstruction

`sampleFuelTransport()` currently blends every thermal property as a scalar. That is valid for the old constant-capacity reservoirs, but not for a nonlinear material. Spatial playback must interpolate cell energies, invert `h(T)` cell by cell, and then derive temperatures and summed energy. Independently blending energy and temperature violates the constitutive relation and can corrupt an off-knot branch.

Spatial continuation must validate grid identity, material law, full finite cell-energy vector and positive in-range temperatures even for endpoint-only continuation. Missing spatial state is a hard error, not permission to replace the profile with a uniform wall. Older lumped scenarios should retain the old path. The energy reference must remain identical across capture, interpolation and restart.

## Independent validation oracles

1. **Material identity:** compare `h(T2)-h(T1)` with independent numerical integration of published `cp`, and `dh/dT` with `cp`. Test units (`kJ/mol`, `J/mol/K`, `kg/mol`) and the admitted material range.
2. **Insulated nonlinear equilibrium:** initialize a nonuniform shell, remove gas/coolant transfer and sources, and check conservation of `sum m_j h(T_j)` and relaxation to the common temperature defined by that initial enthalpy, rather than the arithmetic average of temperatures.
3. **Maximum principle:** without sources, every new shell temperature lies within the old-shell/gas/coolant temperature hull. Domain exits are rejected rather than clipped. Include both hotter and colder coolant.
4. **Second law:** define solid entropy `sum m_j integral(cp(T)/T,T)`. For every accepted insulated step, its increase must be nonnegative. With external gas/coolant reservoirs, add their signed entropy exchanges. This tests directional heat transport separately from energy conservation.
5. **Cylindrical steady solution:** use the Kirchhoff transform `Psi(T)=integral(k(T),T)`. With fixed boundary temperatures and no source, `Psi(T(r))=A*ln(r)+B`. Compare temperatures and heat current against this continuous oracle under mesh refinement; do not use the production resistance matrix as the reference.
6. **Transient refinement:** compare independent coarse/medium/fine spatial and temporal sequences at matched physical times, monitoring inner/outer temperatures and gas heat transfer separately. Backward Euler is first-order in time; positivity and conservation alone do not qualify accuracy.
7. **Coupled path:** repeat energy/angular momentum/inventory gates through drive, cut, coast, restart and off-knot branching. Check neutral pressure from fixed initial inventory and current gas temperature. Confirm mechanical numerical dissipation is excluded from physical heat.

For the insulated thermal network, the second-law gate has a direct discrete justification. Positive `cp` makes each cell entropy concave as a function of its stored energy, so `Delta S_j >= Delta U_j/T_j(new)`. An implicit face transfer `Q=dt*G*(T_i-T_j)` contributes `Q*(1/T_j-1/T_i) >= 0` when `G` is positive. This holds for nonlinear `cp`, without treating the secant heat capacity as the entropy law. External prescribed reservoirs contribute their actual signed `Q/T`.

The coupled source callback needs its own nonlinear convergence gate: the actual source must be re-evaluated at the accepted gas temperature, and a unique positive implicit solution must not be rejected merely because a fixed-point iteration is noncontractive. The independent test `Qgas(T)=-a*dt*T` with disconnected liner has the exact answer `Tnew=Cg*Told/(Cg+a*dt)` even when `a*dt/Cg > 1`. It isolates nonlinear solver behavior from material or mesh uncertainty.

## Primary sources checked

- [NIST tungsten thermochemistry](https://webbook.nist.gov/cgi/inchi?ID=C7440337&Mask=2): solid Shomate `cp`, enthalpy and entropy definitions, molar mass 183.84 g/mol, and the 298–1900 K coefficient segment. Restricting the implemented intersection to 300–1900 K avoids a piecewise thermochemistry join and conductivity extrapolation.
- [Tolias / EUROfusion tungsten property review](https://scipub.euro-fusion.org/wp-content/uploads/eurofusion/WPMST1PR17_17936_submitted-1.pdf), pp. 9 and 18: published modified Hust–Lankford conductivity, `149.441 - .045466*T + 13.193e-6*T^2 - 1.484e-9*T^3 + 3.866e6/T^2` W/(m K). This is a pure-solid material law, not a damaged/irradiated liner calibration.
- [FiPy cylindrical mesh example](https://pages.nist.gov/fipy/en/latest/generated/examples.convection.exponential1D.cylindricalMesh1D.html): existing NIST cell-centered cylindrical finite-volume infrastructure is suitable for an external PDE reference.
- [MOOSE HeatConduction](https://mooseframework.inl.gov/moose/source/kernels/HeatConduction.html) supports material conductivity and its derivative; [ADHeatConductionTimeDerivative](https://mooseframework.inl.gov/source/kernels/ADHeatConductionTimeDerivative.html) describes its quasi-constant heat-capacity time derivative. An off-the-shelf temperature equation still requires careful nonlinear energy accounting.

## Confirmed solver correction

The initial joint kernel updated temperature-dependent gas deposition by fixed-point iteration. The stiff negative-feedback oracle exposed why that is insufficient: the physical implicit root is unique and positive, but the iteration can oscillate because its slope has magnitude greater than one. In plain terms, each correction overshoots the next correction even though the heat equation itself has a well-behaved answer.

The corrected kernel estimates the nonpositive source secant `q'` from actual successive callback evaluations. It uses gas diagonal `Cg-q'` and consistent increment RHS `Q-q'*(Tguess-Told)`. A nonpositive secant increases the positive diagonal, retaining the conductive M-matrix. The accepted endpoint is still checked against the unmodified source callback and actual nonlinear per-node/global energy residual. This addresses stiffness without altering heat deposition, loosening the physical gates, or adding finite-difference mechanical solves. Source review verifies the algebra and the independent stiff-feedback test now passes.

The inversion allows only eight floating-point epsilons above maximum specific enthalpy to account for mass multiplication/division roundoff at exactly 1900 K; this is a numerical representation allowance, not a physical extension of the material fit. Negative enthalpy remains rejected. Uniform 300/1900 K states and actual forced domain exits are covered separately.

## Validation status

This reviewer wrote `tests/audit-spatial-thermal-v53.test.ts` with twelve independent material, equilibrium, entropy, steady spatial-refinement, boundary, implicit source, and closed gas/solid tests. All twelve passed in the parent's isolated run `thermal53-focused-b`, as checked in its log and receipt. That 34-test run also passed operation/continuation/interpolation, legacy, UI, previous thermal and ergonomics regressions; 0 failures. Exact copied source SHA-256: `1fcc53a64c03bdfae2ee74fa6e1c3136cf2df8a61ca83250c63d157cf9c816c9`, verified before and after by the parent's control runner. The initial wall-only run's sole failure was a reviewer test-density typo (19300 instead of the agreed 19250 kg/m³), corrected before this run.

Source review confirms exact enthalpy secants, positive cylindrical face/film conductances, equal/opposite gas exchange and endpoint source evaluation. The operation path carries the same mechanical payload into its accepted ledger. Spatial playback reconstructs temperatures from interpolated cell energies and continuation checks the saved temperature/energy relation. No remaining blocker was found in those reviewed paths at this snapshot. The parent's external FiPy campaign, broader mesh/time studies, full release gates and live-browser checks are separate evidence, not implied by this focused result.

Remaining physical limits are material-fit uncertainty, pure undamaged tungsten, fixed reference density/geometry, radial-only solid heat flow, a lumped neutral gas and prescribed discharge/transport coefficients. No uncertainty envelope or device calibration is established by these numerical checks.
