# Fieldwork: plasma separator laboratory

Status: design proposal and first interactive geometry study. No validated separator engine or deployment yet. User selected public Cloudflare hosting on 2026-11-06; see DECISIONS.md for the latest scope and execution blockers. The first machine is a rotating mass filter, not an ICR isotope separator.

## Purpose and learning loop

Predict → adjust one control → run a reproducible experiment → inspect trajectories and collector composition → explain the result → compare a second run. Guided challenges reward explanations and achieving an explicit purity/recovery target under an energy constraint. Exploration remains available without scoring. Only validated physics produces challenge scores.

Primary reference: Zweben, Gueroult & Fisch, Plasma mass separation, Physics of Plasmas 25, 090901 (2018), DOI 10.1063/1.5042845. The tutorial supplies mechanisms, not complete engineering drawings. Device dimensions, coil packs, supports and flanges in the concept are proposed illustrative hardware.

## Visual direction and tools

- Browser renderer: Three.js with physically based materials, controlled studio lighting, orbit camera, selectable components, exploded assembly, axial/radial sections, field lines and optional trajectories. Physically based shading does not establish physical accuracy of machine operation.
- Parametric geometry first: chamber, solenoids, source, biased annular electrodes, collector surfaces and mirror coils generated from the same SI geometry definitions used by physics. Render meshes may be simplified; collision/collection surfaces remain explicit analytical boundaries.
- Blender later for polished static assets, UVs and presentation renders; glTF/GLB export. Keep field-generating surfaces parametrically owned by the simulator. FreeCAD only if engineering drawings, tolerances or manufacturing become requirements. Neither is needed to begin.
- Actual metal vessels are opaque. A cutaway/transparent inspection mode is an explanatory view. Glow, field lines and enlarged ions are diagnostic overlays; none is a photograph of plasma or a literal particle-size rendering.
- Source geometry, coordinates, scale and field approximation stay inspectable. Annotate illustrative hardware and inferred dimensions. No implication that this is a reconstruction of a specific experiment.

The first preview uses exact collisionless, nonrelativistic helices in uniform axial B, E=0, Ar+ and Kr+, a 2.8 m chamber, fixed parallel energy 20 eV, adjustable perpendicular energy and B. It has no source kinetics, collector-hit accounting, electrons, collisions, self-fields, or rotating-filter physics. Coil geometry is illustrative and does not generate the calculated uniform field. External assembly, open cutaway and orbit-only views are selectable. No separation efficiency is invented.

## Software structure

Vite + TypeScript static app; Three.js scene and ordinary accessible HTML controls. Add React only if UI complexity warrants it. Float64 CPU computation in a dedicated Web Worker first; renderer receives downsampled Float32 snapshots. No dependency on WebGPU for the initial release. Rust/WASM or GPU compute requires measured performance evidence before introduction.

```text
Controls / guided experiment
        ↓ validated RunConfig (SI units, version, random seed)
Worker: source → fields → integrator → boundaries → diagnostics
        ↓ immutable snapshots + event counts + approximation metadata
Three.js viewport / plots / experiment comparison / local export
```

Core modules:

| Module | Responsibility |
| --- | --- |
| RunConfig | Species masses, charges, fractions; geometry; field configuration; distributions; seed; step size; stopping criteria; model version |
| Geometry | Named surfaces, dimensions, regions; source and collector definitions; geometry validation |
| Fields | E(x,t), B(x,t), potential and valid-domain metadata; analytical uniform baseline, then coil maps and electrode solutions |
| Source | Weighted ensemble, thermal and directed velocity distributions, finite pulse/continuous injection |
| Integrator | Full-orbit Boris stepping, independent physical clock, step convergence; accurate surface crossing and absorption |
| Collisions | Optional documented ion-ion and ion-neutral models; species-specific rates, stochastic seed and momentum/energy bookkeeping |
| Diagnostics | Collector particle and mass fluxes, purity, recovery, separation factor, losses, uncollected inventory, energy accounting |
| Rendering | Meshes, selection, sections, trajectories, field overlays; never advances physical state |
| Experiments | Run/stop, identical-seed comparison, sweeps, provenance, JSON/CSV export, local saved runs |

Guardrails enforce real invariants: nonnegative populations, positive mass, allowed charge states, supported field domains, valid geometry, explicit physical timestep. A run cannot silently enable an unsupported model or substitute illustrative outputs. Ion count in the renderer is not throughput.

## Machine progression

1. Uniform B orbit bench: analytical solution and full-orbit solver agree; explain mass/charge, fixed speed versus fixed energy and gyroradius. Add collectors and an injection distribution.
2. Uniform-B radial-potential filters: user-editable constrained potential profiles, centrifugal confinement, Archimedes/Ohkawa and double-well presets. Full orbits required near confinement limits; leading-order E×B drift alone is insufficient. Validate cutoff and effective potential against the specific reference conventions before labeling presets.
3. Collisional centrifuge: finite-time approach to radial distributions, thermal spreading, ion-neutral drag and interspecies exchange. Equilibrium enrichment is a separate analytical lesson, not a substitute for transient collection.
4. Variable B / MCMF: divergence-consistent axisymmetric field, mirror and centrifugal barriers, pitch-angle scattering and end collectors. Include adiabatic-limit checks; do not use Bz(z) alone as a three-dimensional mirror field.
5. Extensions from Section II: curved-field drifts; POMS and alternative fields; advection/diffusion/mobility; differential ionization; pulsed transit-time collection. Each gets its own assumptions and benchmarks rather than one universal approximation.
6. Collective plasma tier: choose kinetic-ion/fluid-electron or multispecies transport closure based on regime; electrode-to-plasma potential, electron current balance and sheath conditions included. Use Poisson/PIC where appropriate. Full kinetic electrons and RF coupling are separate research-scale additions, not promised real-time features.

## Measurements and honest interpretation

For target species H: number purity = collected H / all particles in that collector; recovery = collected H / injected H; number-based enrichment odds ratio = [f_out/(1-f_out)]/[f_feed/(1-f_feed)]. Report undefined values explicitly at endpoints. Also show mass-based fractions where appropriate, distinctly labeled. Throughput needs weights, source rate and physical elapsed time. Keep injected = collected + wall losses + exited + remaining, per species. A stopped run reports uncollected inventory and cannot count it as recovered.

Energy per recovered mass requires source, ionization, RF/bias, magnet and auxiliary power assumptions; a trajectory solver alone cannot predict it. Initially show particle energy changes only, with source-to-product energy cost marked unavailable. A mixing coefficient is an assumed transport model, not a resolved instability.

## Validation gates

- Uniform B: analytical radius, gyrofrequency, rotation direction, parallel translation, speed conservation; field-free straight line; positive and negative charges.
- Uniform crossed E/B: guiding-centre drift in the appropriate regime; electric-field work and convergence. Equal m/q equivalence for identical initial velocity distributions.
- Collectors: first surface hit, grazing hits, crossings between timesteps, wall versus end loss; no double counting or reinjection after absorption.
- Distributions: fixed-seed repeatability and ensemble uncertainty; timestep refinement and particle-number refinement independently.
- Rotating filters: reference effective-potential/cutoff benchmarks, field-sign conventions and finite-temperature transition width.
- Mirror: magnetic moment conservation in the adiabatic regime, loss cone and divergence-consistent field checks.
- Collisions: appropriate equilibrium, relaxation benchmarks, conservation for closed systems and zero-rate collisionless recovery.
- Saved data: versioned schema and explicit migration/rejection; include old saved-run fixtures when introducing a migration.
- Product: responsive labels, keyboard camera controls and controls, reduced motion, WebGL failure message, accurate SI/eV conversions and geometry synchronization.
- Final implementation gate: regression tests, TypeScript typecheck, production build and browser interaction checks against the exact synced VM snapshot. Record commit/file hashes and commands. Development and project execution stay inside safe-dev; no host credentials forwarded.

## Hosting decision (checked 2026-11-06)

Serve a static app; calculate on the visitor's device. No login/database/server required initially. Save locally and export files. This is what makes free hosting practical; it does not provide free remote scientific computation.

Selected: Cloudflare Workers Static Assets for public personal-project sharing. It documents free, unlimited static-asset requests (Worker execution has separate billing/limits). Keep portable static output and avoid platform APIs. Vercel Hobby was considered and is suitable for personal noncommercial use, but is no longer the selected host.

Official sources:
- https://vercel.com/docs/plans/hobby
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://threejs.org/docs/

Deployment package: pinned dependencies and lockfile, static dist/, HTTPS, compression, hashed assets, modest GLB assets, explicit cache rules. Bundle dependencies rather than rely on runtime CDNs. No server functions for the physical time-stepping loop. Heavy validated runs can later run separately and export data for browser replay.

## First implementation slice

Deliver a shareable orbit bench: selectable Ar+/Kr+ injection, exact and numerical trajectory comparison, B/energy controls, chamber cutaway, real surface collection, reproducible reset, radius/gyrofrequency and conservation diagnostics, local experiment export. Then ship one rotating-filter lesson. Defer accounts, arbitrary CAD imports, optimization, multiplayer and full plasma kinetics.
