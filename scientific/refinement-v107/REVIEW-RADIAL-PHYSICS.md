# Independent full-clock radial physics review

**The radial block genuinely fails:** the 4 µs density-increment change is
**5.5956883%**, above the unchanged 5% limit. It contracts, and both meridional
velocity comparisons pass. This is distinct from initial-clock encoding noise.
Overall qualification remains incomplete; four full spatial jobs are absent.

## Evidence and independence

I authored the V107 runner, but not the stable norm, localization or exposure
diagnostic. This review used trusted artifact/hash/gzip/JSON arithmetic only,
one large archive at a time; no project imports, tests, PDE or VM were executed.
All **314** exported payload hashes match the inventory. Independently checked:

| Artifact | SHA256 |
|---|---|
| New full r16z2 prediction | `786b52edf45d1436665bab421b8131f60b932accdb240ad475b9acbbfb8e9a61` |
| Decompressed new fields | `0f6b1ecfe79ce5e4cae4ca17550f170bf2112ca55222214cf621a4609493a140` |
| Canonical stable audit | `f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5` |
| r16 exposure | `e885bc8b2d6754d31a10ce66ae8135e668f4681d080b13bc37a232e5da5fc8ca` |
| r8 exposure | `5269bbbc13d70cca64db1460c5f220a28bb2d8709605706ee1ca69ebe32912ec` |

Producing-source hashes match the copied source snapshot; the packet retains
the pinned successful r16z2 preflight, physical inputs and false fitting flags.
The new case is 320 × 48 cells, clocks 0/1/2/4 µs, **18,757 steps**, 7,450.81 s,
and **695,216 KiB**, below its declared 1 GiB budget. Independent reductions
confirm positive ordered steps summing to 4 µs and the exact timestep selection
from each recorded acoustic unit; maximum clock closure is 4.24e-22 s. Eight recovered primitive fields
match every saved cell exactly in the inspected binary64 arithmetic.

All saved densities/temperatures are positive; species fraction remains 0.5.
History maxima are 4.94e-16 mass/species drift, 1.42e-14 energy defect,
3.36e-14 angular defect and 4.47e-12 charge residual. Independent final snapshot
sums leave energy-minus-electrical-work discrepancy −9.17e-15 J and angular
balance discrepancy 2.04e-19 kg m²/s. These corroborate discrete balances;
they do not validate constitutive closure.

## What converges, and where the remaining discrepancy is

The canonical audit has 354,880 gates, **one failure**, and case admission true.
Fine radial density-increment changes are 2.381344%, 3.166139%, 5.595688%
at 1/2/4 µs. Fine radial-velocity changes are 0.486684%, 0.977785%, 1.815158%;
axial-velocity changes are 0.131063%, 0.174589%, 0.303283%. Both velocities
use the unchanged combined meridional reference. At 4 µs, direct arithmetic
reproduces sqrt(2.6942926403e-16 / 8.6047396564e-14) = 0.0559568830;
the preceding density change is 13.444051%, so contraction still passes.

The retained localization exactly reproduces the canonical integral; its panel
sum defect is 9.15e-16 relative. Source tracing confirms the panel reshape
matches the auditor's tensor-Gauss ordering. Dominant panels form a radial
ring around 16–19 mm near the endwall; the strongest axial panels are about
225–231 mm. Top-eight radial/axial **marginal** allocations contain 72.923% /
82.974% of squared error; these are not joint-region shares or mass fractions.

At the shared axial centroid z=228.440 mm, native r16 profiles show a substantial
late feature: at r=16.838 mm, density increment is 0, 2.44e-8, 3.57e-7,
8.39e-5 kg/m³ over the four clocks. At 4 µs its radial speed is 1,367 m/s and
temperature 12,844 K. The r8 profile also develops a nearby increment maximum
(7.79e-5 kg/m³ at r=16.625 mm). These are different native samples, not a
common-point error estimate. They support evolving finite-amplitude structure
rather than last-bit noise, without identifying its forcing or truncation cause.

## Constitutive exposure and next diagnosis

The [primary neutral-Ar reference](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=960065)
explicitly bounds its zero-density viscosity correlation to 84–10,000 K.
That range is neither an ionization cutoff nor approval of constant plasma
transport. Independent conserved-state arithmetic reproduces both reports'
six mask budgets, apart from normal summation-order roundoff. At r16/4 µs,
the shares above 10,000 K are: volume **1.925834%**, mass **0.588017%**, stored
thermal energy **5.462114%**, inertia **0.045093%**, absolute angular momentum
**0.262850%**, and swirl kinetic energy **0.947876%**. No cells are below 84 K.
Peak temperature is 618,203 K. These are instantaneous inventories, not Joule
dose, cumulative heating, constitutive sensitivity or observable-error bounds.
The compared r8 report also changes CFL; their agreement is not pure refinement.

The smallest justified next diagnosis is saved-state evaluation of conservative
radial/axial mass-flux divergence and pressure/velocity gradients across this
ring at 1/2/4 µs, retaining the original reconstructed flux and common physical
comparison points. The source paths change momentum/energy, not mass: density
changes directly through Euler face fluxes, while electrical work and diffusion
can affect subsequent fluxes indirectly through velocity/pressure. Retained q0
also permits comparing initial profiles and torsion projections; mesh-dependent
q0 prevents unique initializer-versus-evolution attribution from these runs.

Retained snapshots support instantaneous flux/force/source comparisons and
feature displacement/width measurements, not accumulated attribution. A new
sealed, unchanged-physics diagnostic execution is needed to record accepted-
step face fluxes and before/after Euler, electrical and diffusion changes near
the feature's emergence, with local mass/energy balances. A common-q0 evolution
control would be a separate declared experiment, not a replacement production
case. No guessed transport adjustment or PDE fix follows from this completed run.

The original six V106 failures, separate q0 contraction failures and preserved
raw interpolation failures remain recorded. Four missing full cases and
finest-grid temporal error remain unqualified. No experimental, Marathon,
lithium-separation or live-playground approval follows from this review.
