# Marathon v35 release and qualification

Published 9 November 2026 UTC. The educational playground is available at
[Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2).
Open **Target → Use material model** to use the coupled solver.

## Implemented and independently checked

The live target shares depth-dependent D/T/vacancy composition and temperature.
Stopping, D–T reactions and heat deposition are recomputed as it evolves.
Controls cover assumed replacement, diffusion, bulk/front/back release,
external hydrogen-site renewal, pulsing, cooldown, thermal properties and
numerical resolution. Saved-state scrubbing updates the neutron calculation.
Exports preserve assumptions, inventories, energy balances and solver settings.

The thermal backend resolves film and backing cells, contact resistance and
boundary cooling. The live neutron explorer resolves finite-sample geometry
and first interactions, with exact native ENDF/B-VIII.1 H-1 interpolation as an
optional material reference. Recorded actual OpenMC and RustBCA results are
accessible separately. Neither recorded dataset becomes a hidden live solver.

The interface uses cancellable workers and compact tabs. Initial source scans,
geometry and ledgers are explicitly grouped as references; they retain their
initial-state meaning during target depletion and cooldown. Existing thermal
and loading observers remain available under References. Component descriptions
now distinguish the new depth model from unresolved surface and material physics.

## Principal failure, cause and fix

The first coupled implementation passed conservation checks but failed the
independent spatial temperature and population gates. Residual beam heat was
placed at the first backing-cell center, whose position moved under refinement.
Simply, the mesh changed the heater's location.

The corrected convention deposits that power at a fixed, zero-range backing-side
interface. Eliminating its massless face temperature gives conservative forcing
weighted by the neighboring half-cell and contact resistances. No stopping
length, temperature correction or adjusted kinetic coefficient is fitted.
This addresses spatial source placement directly; smaller timesteps cannot
repair a moving source. A resolved material-specific penetration profile would
need its own data and qualification.

Independent backing-only and film-only controls localized the old failure.
The corrected exact-source rerun passes 24 independent tests, strict TypeScript,
all 14 diagnostic cases and all 5 original strict comparisons. In the final joint
pair, temperature changes by 2.56e-5 K and mean population by 1.96e-6, below the
unchanged 0.1 K and 2e-4 gates. These are numerical comparisons for declared
scenario equations, not experimental error bars. Original failures remain sealed.

The [physics synthesis](MARATHON-REALISM-V35.md),
[independent audit](MARATHON-INDEPENDENT-V35.md),
[interface derivation](INTERFACE-SOURCE-V35.md),
[material report](MARATHON-MATERIAL-V35.md) and
[independent neutron audit](NEUTRON-INDEPENDENT-V35.md) retain methods,
other corrected defects, exact source identities and remaining negative results.

## Exact merged release gate

All execution used copied Apple safe-dev guests. The final application stage was
`/tmp/mass-spinner-marathon-v35-final`, guest `safe-dev-d53fa8311a7066e4`.
Dependencies were installed with `npm ci --offline --ignore-scripts` after
explicit source synchronization. The 387-input map was verified before and after
the gate; its SHA256 is
`5bf813d019f23f4344d8ce551bb375396a5264982e7c7271477ae07e6a5f3453`.
Every corresponding canonical input also matched the exported checked snapshot.

| Command | Observed result |
| --- | --- |
| `npm test` | 662/662 pass; zero failed/skipped, 29.22 s |
| `npm run typecheck` | Exit 0, 1.44 s |
| `npm run build` | Exit 0, 0.63 s |
| `npm run check:site` | Exit 0, 0.22 s |
| `npm run check:assets` | Exit 0, 0.12 s |

The full Random123 notice was also verified in the built worker. The build
reports a large JavaScript chunk; real-device performance remains unobserved.
The final source/gate archive has 240 sealed members, SHA256
`8c630b85d9229d9b260b23b24ec25da4f276f79e0ccb50c04f123eced7300e03`.

The first merged run passed 659/662: two legacy tests hard-coded the former
main-file wiring/anchor, and one expected the former unsupported-physics wording.
The wording boundary was retained and wiring assertions were replaced by
actual DOM ownership/anchor checks. An intermediate replacement-test compile
error from a duplicate local variable was corrected without changing production
behavior. The final narrow integration/component/layout run passes 10/10.
Those attempts and the earlier range-clamping test mistake remain in separate
archives; no physical convergence gate was relaxed.

## Publication evidence

An isolated Wrangler 4.158.0 guest rechecked exact membership and hashes of all
144 release files before publishing. Release aggregate SHA256:
`a7cb38bc52cf664309d678d7be60ce0c965517ac9f4a21352881cc3fa72e09a7`.
Cloudflare accepted 19 changed assets with 125 already stored. Provider rollout
status at `2026-11-09T05:24:34.110054+00:00` confirms version
`a48f44c2-d392-458e-b84a-3eaae404c112` at 100% traffic.

Scripts, raw provider status and receipt are under `scientific/deployment-v35/`;
its 10-member seal is
`cc3093cb54a5f7f29f428f992e02c30ffa0da45f7999b57037acc0de3217f8a3`.
The canonical local release matches the checked deployment exactly. Previous
local/staging releases were preserved before replacement. Credentials remained
inside the deployment guest's home and were not copied into source or exports.

## Still incomplete

Measured LiT compound stopping, trapping/release kinetics, actual implantation
and finite-film retention, evolving Li deposition/erosion/surface chemistry,
isotope-carried enthalpy, phase changes, three-dimensional hot spots and coolant
flow remain unqualified. The live neutron calculation omits subsequent scattering,
energy redistribution, activation, dose and damage. The RustBCA historical README
numeric smoke mismatch remains unresolved. No calibrated Marathon operating point,
target lifetime or net-electricity prediction is established.

Live deployed-browser verification remains blocked by the browser tool's explicit
managed origin policy. Selecting the existing deployed tab was denied before page
observation, and the tool prohibited alternate routes. No policy workaround was
attempted. DOM/mobile-sheet tests and asset integrity establish their checked
properties; they do not establish observed GPU appearance, touch behavior,
responsive rendering or deployed end-to-end controls. The deployment receipt
therefore explicitly records `browserVerified:false`.
