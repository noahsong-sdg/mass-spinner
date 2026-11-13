# Coupled target: prospective independent time-integrator control

12 November 2026. Freeze this protocol and cases.json before execution. The
existing V24 oracle covers well-mixed loading; it does not cover the live
coupled target's diffusion, thermal feedback, backing/contact conduction,
pulse edges, or combined species/projectile/energy inventories.

Run the actual simulateCoupledTarget TypeScript function for three synthetic
cases, two/four film cells plus two backing cells, at maximum steps
0.002/0.001/0.0005 s. Keep the declared loose adaptive tolerances fixed so that
these caps can refine accepted steps; report actual step counts and require
each refinement to increase count by >1.5. Read every reported time, including
pulse switches, and compare to one simultaneously coupled semi-discrete ODE.
SciPy solve_ivp(method='Radau') integrates this independent Python assembly at
rtol 2e-8 and 2e-10 with atol scaled per population/temperature/ledger units.
Split integration at every reporting/pulse time; never integrate across a jump.

All channels are included: local fusion; nonfusing replacement; harmonic-face
Arrhenius isotope diffusion; volumetric/front/back Arrhenius release; renewal;
constant-property series/contact conduction; Robin cooling; evolving atomic
Bragg stopping; nuclear/neutron/alpha heat accounting. Use the same four RK4
depth substeps per film cell and midpoint reaction quadrature as the browser.
Stopping coefficients/table are parsed from the retained native Geant4 atomic
reference, independently of the browser adapter. This reuses its atomic closure;
it is not independent compound stopping, depth quadrature or spatial validation.
Newton/Jacobian probes may extend populations smoothly off the packing manifold;
no clipping or projection is applied. Admit initial and saved populations only.

Prospective gates, retained even if failed: exact case/input/source seals;
Radau self-difference <2e-6 in fixed normalized state coordinates; saved isotope
and projectile inventory residual <1e-8 site inventory; energy residual <1e-8
of max(1 J/m2, supplied beam+nuclear energy); saved packing defect <1e-8 and
populations >=-1e-10; all temperatures positive. Browser finest/oracle maximum
coordinate error <1% and strict contraction at every successive cap, except
exactly zero errors pass unchanged. State coordinates use unit population
scale, initial temperature scale, dose scale max(1, incident dose), and beam
energy scale max(1 J/m2, full-on supplied beam energy); no fitted error floors.
Because fusion is tiny on the site scale, separately require cumulative fusion
yield and instantaneous neutron-rate error <1% and contraction at successive
caps. Normalize by the input-based max(initial profile probability, full-loading
entrance-energy probability), multiplied by full-on dose/particle rate as
appropriate; an exactly zero beam requires exactly zero cumulative yield.
Radau tolerance self-differences must also satisfy 2e-6 for these two channels.
This reaction-channel gate was added on independent pre-run review, before any
test or prediction. Reconstruct pulse/report clocks independently of exported
beam-on flags. Initial and saved population/energy invariants are admitted.
Report each coordinate family and every failure; do not choose cases or gates
after seeing predictions. This is numerical verification of illustrative
equations, with no empirical fitting or experimental/material qualification.

Source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html
Actual package versions and every executed source hash belong in the receipt.
