# Laurelin pulse explorer

This is an independent educational model of Laurelin's public FRC sequence. It is not company CAD, a validated Laurelin operating point, an MHD calculation or a prediction of electrical breakeven.

## State and equations

Two fully ionized deuterium plasmoids contain a combined fixed inventory `N=n₀V₀`. Ions and electrons share one temperature: `U=3NkT`, `p=2nkT`. The reference merged volume is an ellipsoid, `V₀=4πr₀²(L/2)/3`. Public dimensions are unavailable; the chosen dimensions and all construction materials are illustrative.

The pulse has prescribed form / merge / compress / hold / recover fractions `.12/.20/.24/.20/.24`. “Form” begins with an already formed thermal inventory; formation dynamics are not solved. Both plasmoids move at the selected speed `v` in the center-of-mass frame (relative collision speed `2v`). Merging supplies `Emerge=NmDv²/2` uniformly over the merge interval, assuming complete thermalization shared by ions and electrons.

Volume varies exponentially during compression and expansion, at fixed axial length. `r/r₀=√(V/V₀)` is the prescribed geometry, not a derived FRC scaling law. Compression ratio means **volume**, not radius or field ratio. The energy equation is

`dU/dt = −(2/3) U d(ln V)/dt − U/τE + Pmerge`.

Each constant-coefficient segment is integrated analytically, including the exact integral of `U` for work and loss. The specified energy-confinement time includes unresolved transport and radiation; neither is predicted separately. Compression and expansion have opposite `p dV` signs. The displayed field `√(2μ₀p)` is only the external magnetic-pressure equivalent at `β=1`; coil current, magnetic-flux conservation and equilibrium geometry are not solved together.

## D–D diagnostic

Each branch uses `R = nD² V ⟨σv⟩/2`. The identical-reactant factor is essential. Bosch–Hale table VII supplies the two Maxwellian reactivities over **0.2–100 keV**; cm³/s is converted to m³/s. Midpoint quadrature integrates the analytic thermal trajectory. Both endpoints and the midpoint must remain in range; constant-coefficient thermal segments are monotone, so their endpoints bound temperature. Any out-of-window segment makes the full-pulse yield unavailable; missing contributions are never replaced with zero. The neutron branch assigns 2.45 MeV to its neutron and 0.82 MeV to ³He; the proton/triton branch has approximately 4.03 MeV charged energy.

Fusion energy is diagnostic only: no fuel depletion, product inventory, charged-product heating, secondary D–T / D–³He burn or neutron transport is solved. A 1% inferred fuel consumption / 10% charged-energy-to-input flag identifies breakdown of the perturbative interpretation. These are conservative internal heuristics, not experimentally validated accuracy thresholds. A “low-burn” label does not qualify the underlying FRC transport model.

## Electrical ledger

`Edriver=(U₀+Emerge+Wcompression)/ηdriver`.

`Ereturn=ηrecovery Wexpansion`; `Eaux=Paux/f`; `Enonfusion=Ereturn−Edriver−Eaux`.

The model credits only expansion work to electrical recovery; fusion electricity remains **unsolved**. Residual thermal energy after expansion is discarded at reset. Coil energy, ionization, switching dynamics, shielding and other hardware burdens are not separately resolved. Efficiencies are user assumptions. This accounting is useful for seeing why recirculating energy and pulse cadence matter; it is not a complete plant ledger.

The exact thermal ledger is `U₀+Emerge+Wcompression=Wexpansion+Eloss+Uend`. Tests check it, the exact confinement exponential, ideal compression scaling, branch units, no-compression limit, inventory/volume scaling and yield refinement. None establishes experimental agreement.

## Scene

Hardware follows a symmetric formation–merge–compression layout. Copper windings, stainless vacuum hardware, ceramic supports and capacitor-bank construction are assumed. The cutaway is an actual open mesh sector. The plasma uses consistent normalized drawing units for both its radius and axial length, preserving the input ellipsoid's physical aspect ratio; chamber/coil clearances remain illustrative. Closed field curves are contours of `ψ ∝ r²(1−r²/a²−z²/b²)`, an analytic reversed-field topology with a magnetic null ring; they are not solved fields or ion orbits. The timeline changes plasma position, radial size and thermal appearance using the same pulse state as the plots. Reconnection, stability and particle kinetics require a different model.

## Sources checked

- [Laurelin technology](https://www.laurelin.dev/technology) and [public whitepaper](https://www.laurelin.dev/notes/whitepaper), accessed 2026-11-14: proposed architecture and separation of demonstrated component mechanisms from the unverified integrated cycle. No calibrated device point was found.
- [Bosch & Hale (1992), equations 12–14 and table VII](https://doi.org/10.1088/0029-5515/32/4/I07). Formula and coefficients cross-checked with [PlasmaPy implementation](https://docs.plasmapy.org/en/latest/_modules/plasmapy/formulary/fusion.html) and its [coefficient file](https://raw.githubusercontent.com/PlasmaPy/PlasmaPy/main/src/plasmapy/utils/data/rxty_pade_polynomial_coefficients.json). The browser uses the small published formula directly, without a Python runtime dependency.
- [Slough, Votroubek & Pihl (2011)](https://doi.org/10.1088/0029-5515/51/5/053008): experimental merging/compression precedent cited by Laurelin. The publisher full text was inaccessible in this session; its result does not calibrate this simulator.
- [Spencer, Tuszewski & Linford (1983)](https://doi.org/10.1063/1.864334): FRC compression involves coupled equilibrium geometry and field. The present prescribed fixed-length ideal-gas scaling must not be identified with that FRC equilibrium model.
- [Steinhauer (2011)](https://doi.org/10.1063/1.3613680) and [Barr & Moir (1976)](https://www.osti.gov/servlets/purl/7341986): review sources for later equilibrium/confinement and converter work; neither supplies validation of this implementation.

Next defensible extension: a specified, sourced FRC equilibrium/compression closure; independently benchmarked 0D species/energy burn; then an explicit pulsed-power circuit and measured recovery boundary. An integrated Laurelin prediction additionally needs public operating data and uncertainty.
