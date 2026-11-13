# FiPy workflow control

Prospective software-workflow pilot, 12 November 2026. This is an insulated
one-dimensional constant-property conduction control, not a reactor model.
T(x,0)=300+100 cos(pi x/L) K, L=.01 m, alpha=1e-4 m2/s, t=.05 s.
Natural zero-flux boundaries. FiPy backward Euler uses 32 cells and 100 steps.
The independent analytic amplitude is 100 exp(-alpha pi^2 t/L^2) K.
Require relative RMS error in the temperature perturbation <.002, relative
heat-inventory drift <1e-12 and temperatures inside [200,400] K.
No parameter or threshold fitting. A coarse 8-cell/5-step negative control
must fail the unchanged accuracy criterion while retaining its assessment
and report. Scientific failure is data; the final qualification exits nonzero.
Execution/corruption errors must stop dependent work rather than become a
scientific assessment. Even passing this control never qualifies the full
simulator or experimental accuracy. Run only inside safe-dev.
