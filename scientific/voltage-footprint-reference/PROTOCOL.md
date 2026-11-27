# Current footprint and voltage mapping

Frozen 16 November 2026 before execution. No current/velocity fitting, invented
sheath drop, change to live equations or retrospective experimental promotion.

## Evidence and demonstrated limitation

The previous finite-contact reference prescribes uniform current density over
three illustrative paired supports. It does not solve current spreading on an
equipotential plasma contact. Its work-conjugate voltage cannot automatically
be identified with a terminal voltage, corrected arc inference or radial probe.
This is an unidentified boundary/observation model, not a demonstrated units bug.

Keep that reference/source/receipts unchanged. Add a separate ideal equipotential
finite-contact challenge on exactly its meshes, supports, coefficients and
wall conditions, using DOLFINx/PETSc and scikit-fem/SciPy independently.
The ideal contacts are a hypothesis for the plasma boundary, not a sheath or
hollow-cathode emission calculation. The real floating wall rings are NOT
modeled as equipotential conductors: the inherited zero-normal-current boundary
is retained explicitly, so this is not a complete apparatus reconstruction.

The inherited conductivity ratio implies effective Hall parameter 3, historically
inferred from electrical observations. It is not an independently identified
constitutive model. Do not treat a numerical voltage coincidence as validation.

## Forward boundary and observation operators

Solve phi_c=0, phi_a=1 V with Omega=0 on stationary walls. No additional electric
axis gauge: the two contacts fix it. Compute electrode reactions from the
unconstrained original operator, then scale both phi AND Omega to imposed 100 A.
This is exact only for this homogeneous fixed-coefficient linear coupled model;
motional EMF scales too. Separately test actual voltage drive and gauge shifts.

Current distribution is a solved weak boundary reaction. Retain its coordinates
and signed nodal loads, but do not label them pointwise A/m² or peak heating.
Use exact Q2 r² traces for source moment torque, B/2*sum(reaction*r²), and report
the resulting cathode effective mean r². Uniform-annulus torque is not reused.
Work = sum(phi*electrical_reaction) = Joule + viscous work; port V=work/I.
For these ideal equipotential contacts it also equals their imposed difference.

Retain all three previous narrow/middle/broad supports and n=1,2,4. Compare
fixed-I port work with uniform-flux work on the identical discrete space: the
equipotential distribution minimizes the reciprocal model's dissipation under
the net-current constraints. This is a variational control, not a method for
choosing the experimental footprint. No peak-density convergence claim.

The voltage ledger distinguishes:

- 58±0.5 V terminal observation, including electrode falls;
- 18.5±2 V corrected inference from an unrecovered fixed-B V–I reduction;
- model work-conjugate plasma-port voltage;
- gauge-independent model radial proxy phi(r,0)-phi(.05 m,0).

The last reference matches the reported Fig.11 alignment radius, not an optical
or probe calibration fit. The source calls the measurement plasma potential
from a doubly shielded floating Langmuir probe; its bias/circuit/conversion is
not recovered. Do not claim raw floating potential or known spatial sheath
offset. No digitized probe markers or experimental score are admitted here.

Terminal-minus-corrected arithmetic, if retained, is a reported-value range,
not a fitted sheath model, Gaussian interval or transferable voltage correction.

## Gates and execution

Keep 1e-8 source/charge/linear/work/torque/wall/voltage invariants and 5% common
angular-field fine change/contraction. Apply the prior integrated Joule/viscous/
port refinement screens too. Independent field/integral differences <5%.
Retain all failures; no gate relaxation. Use native boundary lifting/reactions,
not a custom PDE stencil. Test genuine contact-gauge re-solves, signed current,
voltage linearity/quadratic work, B reversal/zero, source moments and the
uniform-flux minimum-work inequality.

The first n4 native LU factorization failed (KSP reason -11). The DOLFINx path
now uses PETSc's native symmetric diagonal scaling, with matrix restoration,
matching the earlier references' algebraic equilibration. No equation, physical
parameter or gate changes; preserve the failed partial receipt and diagnosis.

All scientific runs are offline/non-root in the existing official DOLFINx 0.9.0
guest, one CPU/2 GiB with inherited NumPy ABI and supplementary pinned packages.

```
python3 -m unittest discover -s scientific/voltage-footprint-reference -p 'test_*.py' -v
python3 scientific/voltage-footprint-reference/voltage_campaign.py NEW.json
```

Source facts: [footprint evidence](../boundary-v84/FOOTPRINT-SOURCES.md),
[voltage evidence](../boundary-v84/VOLTAGE-SOURCES.md), thesis printed pp18,
35–37 (PDF23,40–42), [public thesis](https://inis.iaea.org/records/ymfdn-qv182/files/12582976.pdf).
