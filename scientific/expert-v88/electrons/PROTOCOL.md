# V88 electron transport: prospective protocol

Frozen before the first physical electron solve. Use unchanged LoKI-B++ commit
add55181430adec223efcf56233c7139ed40b8d2, pure bundled Eigen, no OpenMP,
Linux ARM CPU, cmake 3.31.10. Upstream source stays unchanged; compiler system
include classification addresses warnings in bundled third-party headers only.

Data: upstream input/Argon/Ar_LXCat.txt, IST-Lisbon database, LXCat retrieval
2022-09-23; cite L.L. Alves, J. Phys. Conf. Ser. 565 (2014), and A. Yanguas-Gil,
J. Cotrino and L.L. Alves, J. Phys. D 38 (2005) 1588–1598. Record actual hash.
Do not redistribute cross sections; only source/data retrieval instructions,
provenance, generated tables and raw calculated outputs are exported publicly.

Run unchanged upstream grid/EEDF/transport utility tests and the original Ar
swarm input (100 fields, bounded 120 s) as the upstream physical smoke. Preserve
its terminal status; completion alone is not experimental agreement.

24 fixed cases: E/N=10,30,100,300 Td crossed with gas T=300,1000 K and energy
cell counts=1000,2000,4000. Energy domain [0,200] eV; smart-grid adaptation off.
Other physical/algorithm settings remain original Ar swarm input: pressure
133.32 Pa, ground-state neutral Ar only, DC, zero magnetic field, no e-e
collisions, temporal growth, usingSDCS ionization, nonlinear tolerance 1e-9.
No device currents, voltages or measured rotation targets are read or fitted.

Record input/output/source/executable hashes and all failures. Independently
integrate exported f(epsilon) with exact energy-cell weights to check number
normalization within 0.5%, mean energy within 0.5% of printed result, nonnegative
finite f, final-cell tail probability below 1e-8, printed power imbalance below
1e-6 relative. Check Te=2*meanEnergy/3 and drift=(mu*N)*(E/N) in SI to 1e-10
relative. Check positive diffusion/mobility and nonnegative ionization rates.

Require 2000→4000 relative changes below 2% and contraction against 1000→2000
for mean energy, mobility, diffusion and ionization coefficient at every case;
exact-zero pairs are handled explicitly. Retain failures without tuning grids,
fields, cutoffs or numerical budgets. Tables expose only executed grid points;
no interpolation or arbitrary field/temperature extrapolation is qualified.

Scope: unmagnetized uniform local two-term EBE, not a Hall-conductivity tensor,
sheath, electron-energy PDE, chemistry balance or calibrated discharge. Finite
gradient/time and magnetic applications require separate local-relaxation,
anisotropy and nonlocality tests. No first-order device accuracy follows here.
