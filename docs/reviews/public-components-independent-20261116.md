# Independent component receipt audit

Source review, 16 November 2026. No host scientific execution performed.

Traced `qualify-public-components.mjs` into production `rotorResponse`,
`advanceFuelRadialMass`, `solveFuelCurrent` and `advanceFuelMixtureThermal`.
The independent scalar oracles have the correct assumptions and signs:

- Undamped reciprocal rotor friction gives total momentum `torque*t` and
  exponentially relaxing slip with rate `gamma*(1/Ii+1/In)`.
- Exact integrated Boltzmann masses in uniform `y=r^2/R^2` bins are stationary
  under the closed conservative SG generator, including the beta=0 limit.
- Annular rigid rotation produces integrated EMF `B*Omega*(Rout^2-Rin^2)/2`.
  Outward positive current has negative rotational mechanical work for the
  declared positive field/rotation; generator and motor signs are consistent.
- Two equal gas cells have capacity `1.5*kB*N/2` each and face conductance
  `4*pi*L*kappa`. For endpoint BE with energy q in the left cell, transferred
  energy is `q*dt*G/(C+2*dt*G)`. This is a discrete verification, not a continuum
  transient reference. Both heat signs retain positive cell temperatures.

The 60-case count is complete for the declared matrix. Current source hashing
covers the transitive production imports exercised by these controls. Its
same-script auditor checks arithmetic/completeness/scope, not authenticity or
independent re-execution; the reporting correctly limits that claim.

One requested correction: the initial new power gate added `1e-9*abs(expected)`
to the existing absolute `1e-7 W` allowance. This weakens the mechanical-work
check for large powers, despite the stated reuse/tightening requirement.
Retain the original absolute power limit. Likewise distinguish the existing
relative-current criterion from the absolute charge-balance criterion. The
coordinator owns the fix and isolated execution receipts; this review alone
does not establish a passed run.

## Resolution and executed receipt

The coordinator restored the original absolute power/charge and relative-current
criteria. The final isolated receipt contains 60 passing metrics and retains
`experimentallyQualified:false`. The full application candidate and targeted
corruption checks passed; see the campaign RUN.md and components.json. A second
read-only review found no remaining blocking issue in those gates or sensitivity
lifecycle handling.
