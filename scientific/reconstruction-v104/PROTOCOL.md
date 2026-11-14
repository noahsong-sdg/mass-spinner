# V104 pressure reconstruction candidate

Freeze before candidate evolution. The V103 five-case campaign remains the
baseline: original linear-finite-te1 scenario, physical manifest, source
profiles, thermodynamic initialization, steady-torsion initializer, meshes,
current, contacts and clocks. n=1/2/4 at CFL .1, n=2 at .2/.05; 0/1/2/4 µs.
Only radial pressure reconstruction and its matching geometric pressure
integral change. Density/velocity/species reconstruction, HLLC, SSPRK2,
centrifugal-density source, electrical and stress/heat operators remain V103.
This is not a claim of third-order accuracy for the whole solver.

Keep all original 5% spatial, 2% timestep, contraction, positivity, mass/species,
angular momentum, energy, charge and diagnostic quadrature gates. Retain
every failure. The original exact-panel metric remains authoritative;
conservative restriction is supplemental. The campaign's spatial sequence
also shrinks its acoustic timestep; the independent time sequence is at n=2.

No fitted currents, velocities, source smoothing, hardcoded reconstruction
interface at the profile's 5 cm clamp, cooling or alternative timestamp.
Seal predictions before the existing optical score reads targets; retain
all 72 alternatives at each clock. Previously viewed data remain retrospective.
Prescribed transport, all-Ohmic-to-heavy heating and closed adiabatic boundaries
remain conditional; this cannot establish a steady discharge or experimental
qualification even if numerical gates pass.

Candidate implementation and analytical tests run only in safe-dev. Rejection
or an unsuccessful method is retained; live browser physics is unchanged.
