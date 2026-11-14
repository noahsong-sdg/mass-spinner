# Independent constitutive-closure scope review

The previously verified CFL0.05 trajectory reached 619,365 K. This historical
peak identifies a local constitutive warning; it does not establish the hot
region's mass, volume, energy share or effect on rotation/separation. Those
quantities are evaluated separately in the linked exposure report below. This
quoted peak is from the earlier CFL0.05 trajectory, not the new radial case.

## Exact assumptions of the current scientific campaign

- `scientific/coupled-v99/campaign99.py::initialize` passes the manifest's
  **constant μ = 1.14e-4 Pa s** into the diffusion operator. The temperature-
  dependent reference viscosity in `scientific/flow-v81/transport.py` is not
  the evolving campaign's active constitutive law.
- `scientific/meridional-v86/diffusion86.py::argon_conductivity` supplies
  **constant κ = 15 kB μ / (4 mAr)**, a conditional dilute monatomic Eucken
  relation. `scientific/heat-v106/heat106.py` changes heat discretization,
  preserving that scalar coefficient and adiabatic walls.
- `scientific/electrical-v82/transport82.py::profile` supplies prescribed
  conductivity/Hall fields from the frozen radial scenario. Electron
  temperature is fixed at **1 eV** for this scenario; reference electron/
  neutral density and collision assumptions are not evolved with the fluid.
- `scientific/meridional-v86/electro86.py::advance` updates charge/current
  response and mechanical work with the evolving velocity and inertia, but
  deposits all Ohmic energy into the single heavy-fluid energy field. There
  is no separate electron-energy evolution, evolving ionization chemistry,
  or justified electron/heavy heat partition. V86/V82 `PROTOCOL.md` files
  explicitly retain these limitations; conservation does not validate them.

## What the property reference supports

[Sotiriadou et al. (2025), Eq. 2](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=960065)
supports a **zero-density neutral-Ar viscosity reference over 84–10,000 K**.
Its separate dense-fluid EOS range ending at 700 K is not this dilute-gas
range. Neither range validates a plasma closure, a constant viscosity, or
the campaign's thermal/electrical constitutive laws.

Consequently, cells above 10,000 K lie beyond the available neutral-property
reference domain. This is not a new validity cutoff for the already conditional
constant-coefficient model, nor an ionization threshold. Cells below that
temperature are not automatically qualified. No source-backed universal
heavy-temperature cutoff for the prescribed electrical closure was identified.

## Exposure diagnostic and remaining follow-up

The [study report](../../REFINEMENT-V107.md#reference-domain-exposure) records
the separately executed, read-only volume, mass, thermal-energy, inertia and
rotation budgets on unchanged saved states. If regional source exposure is
needed, separately reconstruct fixed-
velocity instantaneous Joule power and verify its charge/work balances before
reporting masked fractions. Saved globally summed heating cannot identify
regional deposition; snapshot rates are not cumulative deposited energy.

Even small fractions would not bound observable error: localized current or
shear regions can influence global electrical response and wall torque.
Measured impact requires a separately justified sensitivity/error assessment.
No new gate, fitted cutoff, source/physics change or qualification is proposed.

Review method: static frozen-source/protocol inspection and direct primary-
paper reading only. No project execution, VM operation or large-state loading
was performed for this static review. Regional Joule budgets and constitutive
sensitivity remain unrun; the separate exposure calculation is not their substitute.
