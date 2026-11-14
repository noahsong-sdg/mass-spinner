# V105 source-only candidate

This isolated `SourceFlow(Flow)` changes no V103 Riemann flux, reconstruction,
state representation, time step, physical coefficient or qualification gate.
It has not been adopted into shared `Flow` or the live browser.

`Flow.rate` uses `2*pi*dz*[r*p_eq]` as the combined radial pressure-geometric
and centrifugal source. That exactly integrates its local isothermal,
constant-Omega reference. General limited departures used by the fluxes were
omitted from this source. V104 changed pressure reconstruction and added its
pressure departure only; its failed campaign is retained separately.

The physical source is `2*pi*dz*integral(p + rho*Omega^2*r^2, dr)`.
Recover the actual V103 limited slopes from each owner's lower/upper radial
face traces. With `x=r-<r>`, use `delta_p=b_p*x`, `delta_rho=b_rho*x`, and
`delta_Omega=b_Omega*x`. Add to V103:

`2*pi*dz*integral(delta_p + r^2*[rho_eq*(2*Omega*delta_Omega + delta_Omega^2)
                            + delta_rho*(Omega+delta_Omega)^2], dr)`.

The expanded difference avoids subtracting nearly equal full reference forces.
Pressure's integral is exactly `-b_p*h^3/(12*m)` for width `h` and midpoint `m`.
With no Omega slope, the remaining density polynomial is integrated exactly.
Otherwise Gaussian orders 8/16 are compared, extending through 32/64/128/256/512
when necessary. The bound is 256 machine epsilons times the integrated absolute
expanded centrifugal terms, per cell. An unresolved or unrepresentable source
raises; no density/temperature floor or accepted fallback is introduced.

The local reference still cancels at native rigid isothermal equilibrium.
Only radial momentum changes: conserved energy already contains rotational
and meridional kinetic energy, so an extra centrifugal energy source would
double count work. Mass, angular momentum, energy and species fluxes are intact.

The source is consistent with the declared primitive reconstruction, whose
native Omega/inertia map is unchanged. It does not make arbitrary conservative
continuum projections exact equilibria. V103 limits density at faces; this
source quadrature does not upgrade that to a whole-cell density-positivity
theorem. Boundary departures remain V103's. A nonzero source defect is not
proof that it dominates the full coupled errors; analytical controls and the
unchanged refinement campaign must decide adoption.
