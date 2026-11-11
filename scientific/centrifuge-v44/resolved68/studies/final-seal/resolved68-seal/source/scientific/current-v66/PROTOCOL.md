# v66 prospective electrical and mixture qualification

Scope: prescribed conductivity tensor, axial field and common azimuthal speed;
solve r-z charge continuity and consistent electrical/Joule/Lorentz power.
Hall azimuthal current, electron kinetics and conductivity prediction are absent.
No claim of historical or Marathon experimental validation.

Before execution, freeze16 cases: n_r12/24/48/96, n_z=n_r/2 for coaxial Ohmic,
coaxial motional, annular electrode patch, and regular-axis electrode patch.
Compare integrated-resistance TypeScript network against actual2D NIST FiPy.

- Exact coaxial resistance/current, mechanical/electrical/Joule work: <=1e-8
  relative natural current/power scale for the exact-log production integration.
  FiPy uses its independent area/distance approximation and must instead converge
  to this continuum reference with finest error <=1%. This clarifies the exact
  integration identity vs discretization distinction before scoring the outputs.
- Each code net boundary current, cell charge residual and electrical power
  residual <=1e-9 of total absolute electrode current/power scales.
- All insulating FiPy currents <=1e-9 of electrode current scale.
- Finest max cell-potential difference <=1% of frozen voltage+motional scale;
  finest integrated Joule/mechanical/electrode power difference <=2% of the
  larger combined physical power scale. Retain all coarse errors.
- Exact case IDs/order and SHA links required; no stale successful reference.

Mixture coupling uses equal-volume radial cells, accepted species fluxes and
endpoint common angular speeds/temperatures. Require closed particle and angular
momentum balance, exact mechanical work/heat/numerical-loss decomposition <=1e-9,
physical shear/Joule heat nonnegative, and positive species/temperature.
Angular upwind and BE losses stay outside physical heating. Temperature and
space/time refinements are separate from discrete conservation identities.

Use sourced neutral Li100–3000K / neutral Ar300–20000K constitutive models only
inside their domains. They do not supply ion/electron or mixture plasma transport.
Any coupled-live replacement must pass joint refinement and source/observation
comparisons; existing rigid histories retain their interpretation.

Coupled prospective matrix: radial cells8/16/32, nominal BE steps16/32/64 to1ms,
fixed4 axial electrical cells and8 solid cells, smoothinitialΩ andgasT with
1200Kwall. Before running, require finest time-halving differences <0.5% of
initialΩpeak, <1% of accumulated gas-temperature excursion, species CDF<0.005.
Require finest joint spatial comparisons <2% ofinitialΩpeak, <2% of accumulated
gas-temperature excursion, speciesCDF<0.005. This is a radial/temporal study
conditional on a fixed axial current and liner grid, not full r-z/solid convergence.
Retain incomplete runs and every coarse difference; do not promote a failed
joint gate to a live backend. Closed-system energy includes explicit storage
ULP allowance in addition to dynamic exchange/work scales.

Pre-execution extension after the initial radial failure: add64 radial cells
with the same16/32/64 timesteps. All original gates and coarse outputs remain.
The first64-cell study still fails rotation refinement (4.72%). Correcting
electrical q-centre torque alone does not resolve that failure.

Pre-execution shear correction: the coupled cell state uses the q=r²
finite-volume shear flux `4*pi*L*mu*q_face²*DeltaOmega/Deltaq_centres`, harmonic
in the two half-cell viscosities. Preserve the original integrated-resistance
v65 scheme as the default standalone option. Before rerunning the unchanged
joint gates, require an exact manufactured `Omega=A+B*q` acceleration8νB at
every cell, a balanced-torque equilibrium, and a moving-wall polynomial
transient through both direct and zero-mass-flux coupled kernels. Test actual
FiPy q-coordinate PDE at4/16/64 cells and4/16 timesteps against the same
continuum solution (absolute Omega error <=2e-10 rad/s). This diagnostic is
designed to expose the regular-axis shear inconsistency, not to fit a device.
