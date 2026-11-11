# Coupled separation and gas angular momentum

See the [v48 release report](COUPLED-ROTOR-RELEASE-V48.md) for executed convergence results, independent audits, exact tested/deployed identities and live browser evidence.

## Problem and scope

The previous radial solver recomputed its centrifugal drift and playback speed with `rotorResponse(ii, nn, ...)`, whose neutral inertia was the initial uniform-density value. Although snapshots reported a changing radial second moment, that quantity did not affect the rotor. In plain terms, gas could move toward the wall without becoming harder to spin.

The replacement advances ion and neutral **angular momenta**, derives neutral inertia from the transported species, and solves their common endpoint speed with the existing positive conservative radial scheme. The standalone uniform-density rotor and its equilibrium/pump/cascade references remain separate benchmarks.

This is a reduced, isothermal model with instantaneous rigid rotation and fixed species inventories. It is not a local neutral momentum equation or a full multicomponent fluid solver. Ion radial geometry is not evolved: ion inertia and the prescribed reciprocal collision torque coefficient remain fixed. Neutral angular drag retains the configured frequency; its torque coefficient changes with neutral inertia. No local axial extraction, pump depletion, ionization, thermal evolution, zero barycentric diffusive mass-flux condition, or validated binary diffusion coefficient is introduced.

## Continuum equations

Let `P_s,j` be the probability mass of neutral species `s` in a uniform cell of `y = r²/a²`. Species inventories `N_s` remain constant. For a cellwise constant volume density, the cell-mean `y_j = (j+1/2)/n` gives

```
I_n[P] = Σ_s N_s m_s a² Σ_j y_j P_s,j
       = 2 I_n,0 Σ_s w_s Σ_j y_j P_s,j,
w_s = x_s m_s / Σ_q x_q m_q.
```

The neutral probabilities solve the same cylindrical Smoluchowski closure as before:

```
∂P_s/∂t = (4D/a²) ∂/∂y [ y (∂P_s/∂y − β_s P_s) ],
β_s = m_s Ω_n² a² / (2 k_B T).
```

Axis and wall fluxes vanish. The coupled rotor equations are

```
L_i = I_i Ω_i,                 L_n = I_n[P] Ω_n,
dL_i/dt = τ − Γ(Ω_i − Ω_n),
dL_n/dt = Γ(Ω_i − Ω_n) − ν_drag L_n.
```

Consequently

```
d(L_i + L_n)/dt = τ − ν_drag L_n,
I_n dΩ_n/dt = Γ(Ω_i − Ω_n) − ν_drag I_n Ω_n − Ω_n dI_n/dt.
```

The last term is precisely the redistribution feedback missing from the old trajectory. With no torque or friction, outward motion increases `I_n`, `L_n` stays constant, and the gas slows. The external drive supplies angular momentum; wall drag removes it. Internal ion–neutral friction cancels from the total budget.

## Discrete method

The existing Scharfetter–Gummel finite-volume generator and backward-Euler solve preserve nonnegative species probabilities, fixed inventories, reflecting boundaries, and the integrated isothermal Boltzmann equilibrium for a fixed speed. No clipping or renormalization conceals conservation failures.

The new step uses the same **endpoint** neutral speed in radial transport and the backward-Euler angular equations. Write

```
a = Δt Γ / I_i,
H = Δt Γ / (1+a),
u = (L_i,old + Δt τ) / I_i,
A = L_n,old + H u.
```

For a trial nonnegative speed `q`, solve both radial systems with `β_s(q)`, then compute their new inertia `I_n(q)`. The scalar root is

```
q [ I_n(q)(1 + Δt ν_drag) + H ] = |A|.
```

Its sign is the sign of `A`; radial transport depends on its square. A physical lower bound for positive cell masses supplies the upper-speed bracket. Bracket-preserving Illinois secants avoid the stagnation of ordinary false position without requiring a full distribution Jacobian. The solve has a finite iteration limit and rejects nonconvergence rather than accepting an arbitrary iterate.

After the radial root converges, angular momenta come from the implicit torque equations:

```
L_n,new = A / (1 + Δt ν_drag + H / I_n,new),
Ω_n,new = L_n,new / I_n,new,
L_i,new = (L_i,old + Δt τ + Δt Γ Ω_n,new) / (1+a),
Ω_i,new = L_i,new / I_i.
```

This form preserves a torque-free rotor's angular momentum exactly and avoids accumulating nonlinear root error as an artificial angular impulse. The endpoint root controls the agreement between its speed and the speed used for species fluxes. The method remains first order in time; unconditional positivity or stability does not establish time accuracy.

Backward Euler was retained because the existing solver is stiff and positivity matters at large centrifugal exponents. An explicit torque integrator is unsuitable for the fast ion friction scale; replacing the radial scheme with Crank–Nicolson would sacrifice its unconditional positivity. A full fluid replacement would require additional constitutive data and independent validation and would exceed this bounded coupling change.

## Angular and energy budgets

Every stored snapshot reports ion and neutral angular momenta, current neutral inertia, cumulative drive and drag impulses, and the residual of

```
L_i(t) + L_n(t) = ∫ τ dt − ∫ ν_drag L_n dt.
```

The initial simulation starts at rest. The pure-step API also accepts arbitrary finite signed initial angular momenta, allowing independent undriven and reversal tests.

The continuous rotational kinetic energy obeys

```
K = L_i²/(2I_i) + L_n²/(2I_n),
dK/dt = τ Ω_i − Γ(Ω_i−Ω_n)² − ν_drag I_n Ω_n² − ½ Ω_n² dI_n/dt.
```

The fully implicit step has the exact corresponding algebraic identity

```
ΔK = Δt τ Ω_i,new
   − Δt Γ(Ω_i,new−Ω_n,new)²
   − Δt ν_drag I_n,new Ω_n,new²
   − ½ Ω_n,new² ΔI_n
   − ½ I_i (ΔΩ_i)² − ½ I_n,old (ΔΩ_n)².
```

The last two terms are temporal numerical dissipation. `½ Ω_n,new² ΔI_n` is signed redistribution work; it is not an additional measured cooling load. Both are displayed separately from reciprocal friction and drag. An external thermal bath still maintains the imposed temperature, and this rotational identity is not a complete thermal energy balance.

For an undriven, isothermal closed system, the appropriate check is rotational **plus ideal-mixture free energy**,

```
F = K + Σ_s N_s k_B T Σ_j P_s,j log(n P_s,j),
```

which decreases under relaxation. Neither rotational kinetic energy alone nor Shannon entropy alone supplies the correct general thermodynamic gate.

## Timeline and reconstruction

Timeline sampling linearly interpolates positive species masses, angular momenta and integrated budgets, then recomputes inertia and derives `Ω = L/I`. It does not interpolate speed or call the old prescribed trajectory. Thus every displayed time preserves the angular impulse budget. Since `L²/I` is convex, interpolation has an additional nonnegative kinetic-energy defect, recorded as numerical dissipation instead of invented heat. Phase is integrated with endpoint speed and interpolated at stored times, with the same first-order time qualification as the solver.

## Validation boundaries

The independent test suites use distinct calculations: direct 2×2 backward-Euler torque algebra, analytic fixed-inertia rotor limits, direct conservative face-flux RK4 method-of-lines oracles, full-distribution time and radial refinement, mass-weighted inertia, signed reversal, undriven free-energy decrease, torque-free inertia growth and exact angular momentum, and interpolated impulse budgets. The original radial positivity, equilibrium, Bessel diffusion and inventory gates remain applicable to the unchanged SG kernel.

The root agent runs all tests inside the existing offline safe-dev guest against a recorded manifest; this implementation agent does not execute project code. Final gate results, deployed version and actual browser observations belong in the release report. Passing these gates qualifies the implemented reduced equations in the tested regimes; it does not calibrate Marathon hardware or remove the listed closure limitations.
