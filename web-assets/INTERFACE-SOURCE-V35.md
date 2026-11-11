# Backing-interface heating correction, v35

## Problem and pre-result prediction

The original coupled-target beam path deposited every surviving projectile's residual energy in the first backing cell. Refining the backing moved that source's centroid from half a coarse-cell width to half a fine-cell width. The heat total was conserved, but its location changed with the mesh. Because temperature drives the assumed release and diffusion rates, a thermal discretization error also changed isotope inventories.

In ordinary terms, adding more grid cells moved the heater toward the coating. Conservation alone could not catch that error.

Before executing the controlled follow-up, the proposed explanation was a temperature bias proportional to the first backing half-cell resistance, approximately `q Δx / (2 k)`. The proposed intervention was to define the unresolved deposition at the backing-side coating interface, keeping the same physical location on every mesh. The original source, raw cases, plans and failed gates remain sealed. This changes the declared deposition model; it does not establish the real stopping range in the backing.

## Face-source elimination

Let `TL` and `TR` be the neighboring cell-average temperatures. Let `RL` be the resistance from the left cell center to the backing-side face, including the interface contact resistance, and `RR` the backing half-cell resistance. A massless face receives heat flux `Q`:

```
(Tf - TL) / RL + (Tf - TR) / RR = Q
Tf = (Q + TL/RL + TR/RR) / (1/RL + 1/RR)
```

Eliminating `Tf` leaves the existing intercell conductance `1/(RL+RR)` unchanged. The source contributes `Q RR/(RL+RR)` to the left cell and `Q RL/(RL+RR)` to the right. The contributions sum to `Q`. Placing contact resistance in `RL` is essential: the declared source lies on the backing side of the contact.

This is preferable to depositing at a moving cell center or choosing an invented absorption length. A resolved material-specific stopping profile remains a separate future model. No reaction, stopping, release, diffusion, renewal or thermal-property coefficient was adjusted to obtain agreement.

## Regression oracles

Six added tests check opposing resistance fractions, domain rejection, heat conservation, and the analytic stationary profile on five film/backing meshes: 2/1, 4/2, 8/4, 16/8 and 32/32. For an insulated front, a backing-side source and a coolant boundary, the stationary coating is isothermal. The backing profile is linear, with `T(x)=Tcool+Q[(Lback-x)/kback+1/h]`. The test includes a nonzero contact resistance so placing the source on the wrong side fails.

The temperature oracle has an absolute `1e-8 K` gate and the energy residual a relative `1e-12` gate. The thermal operator and all chemistry equations are unchanged.

## Scope

The corrected output explicitly describes zero-range backing-side absorption. It does not claim calibrated LiT transport, measured thermal properties, a resolved substrate stopping range, finite-range implantation, binding/transport enthalpy, evolving host damage, sputtering, trapping, phase transitions or a validated target lifetime. The numerical method remains first order; local adaptive error tolerances are not global convergence certificates.

Execution hashes, unchanged prospective gates, controlled results and the independent follow-up are recorded in the latest closure of `COUPLED-TARGET-V35.md`. Original negative results remain part of the record.
