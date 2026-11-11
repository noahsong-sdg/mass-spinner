# v42 separator scientific audit

2026-11-09. Read-only scientific/source audit; no production changes. Scope: Sections II A–D and III in the current separator paths, including shared reduced A/B models, finite-device rotating/ICR orbits, all three centrifuge closures, passive impact acceptance, and independent failure budgets. No P0/P1 finding established. One P2 numerical-evidence defect is established by source trace.

## P2 — Finest-grid “refinement” compares a result with the identical grid

**Location:** `src/main.js:384` (reported at `src/main.js:388`); finest supported choice is exposed in `index.html:32`.

**Trigger:** Run any nonuniform centrifuge equilibrium with 2000 radial intervals, then invoke “Check radial refinement”.

**Verified execution path:** the selected value becomes `bins` in `src/equilibrium-controls.js:16`; `worker.ts:20` dispatches `solveEquilibrium`; the refinement callback substitutes `bins: Math.min(2000, snapshot.settings.bins * 2)`. At 2000 this remains 2000. Every physical and numerical input is otherwise unchanged. The deterministic equilibrium and inventory quadrature are rerun unchanged, and the UI labels their zero difference a “Radial quadrature check”.

**Technical cause:** The resolution ceiling is applied without enforcing the comparison invariant `fine.bins > coarse.bins`. The inventory difference therefore has no relationship to discretization error at the ceiling. This does not depend on a niche plasma formula or an uncertain literature interpretation.

**Simple cause:** The finest setting is checked against itself, so it necessarily appears unchanged.

**Impact:** A user checking the highest available resolution gets a zero numerical-change report even for a steep or otherwise underresolved profile. The sentence correctly disclaims experimental validation, but the stated numerical check was also not performed. This affects the evidence used to interpret local composition and radial inventory; it does not alter the underlying equilibrium solve.

**Minimal correction:** Disable/refuse this comparison at the cap and report “No finer supported grid; radial convergence unassessed”. Alternatively compare an explicitly selected lower grid with the existing 2000 result and name both resolutions. Do not silently raise the solver's numerical domain to fix the message.

**Why this correction:** It repairs the false-evidence path without changing public physical predictions, exponent bounds, solver cost limits, or equilibrium equations. Increasing the ceiling alone merely moves the same defect to a new ceiling.

**Falsifiable gate:** A regression test must start from `bins=2000` and establish that no same-grid result is displayed as refinement; for 400→800 and 1000→2000, assert the executed fine grid is strictly larger and the UI names both grids. The parent executed the requested numerical witness; it reproduced `coarseBins=2000`, `fineBins=2000`, and `deltaInventory=0` for a nonuniform equilibrium whose wall species densities were `0.5091507086078491` and `0.5577716411167034`. See `scientific/audit-v42/numerical-witness.log` and the hashed probe `docs/reviews/v42-numerical-probe.ts`.

## Scientific checks and limitations, not additional defects

- `physics.ts:64–67,120–128` implements the outward quadratic electric field, its matching Hamiltonian, and the cold threshold `m/q = B²a²/(8V)`. Independently substituting `E_r/r=2V/a²` in the slow/fast Brillouin discriminant gives the same threshold. The primary authors' treatment gives this potential-curvature threshold and explains why finite collection and neutral collisions require additional transport analysis. [Gueroult et al., Eqs. 2, 6hi–6hk and discussion](https://arxiv.org/html/1707.00511v1).
- `rotating-diagnostics.ts:87–116` separately computes the source-edge cold orbit and axial flight, while `physics.ts:246–291` records finite-pulse first contacts and remaining particles. The visible notes in `focused-diagnostics.js` distinguish boundedness, finite-wall loss, axial exit, and finite duration. I found no defensible basis to call the cold threshold a claimed finite-device efficiency.
- The neutral operator is a prescribed cold, isotropic, elastic bath (`collisions.ts:3–6,26–29`), not measured atomic transport. The model explicitly excludes charge exchange and gas heating. Collisions are split after an unabsorbed orbit step (`physics.ts:252–280`); an absorbing step is not sampled for a preceding collision. This is a finite-step numerical approximation needing timestep/ensemble convergence, not proof that collisions are physically absent before impact. No quantitative bias was measured here, so this is not promoted to a severity finding. Collisional modification of Brillouin rotation is a real physical concern, independently established in [Rax et al. 2015](https://w3.pppl.gov/~fisch/fischpapers/2015/Rax.POP.2015.pdf).
- `centrifuge.ts:36–40,67–108` solves a clearly declared common-corotation, quasineutral, isothermal equilibrium with neglected electron inertia. Subtracting equal-charge ion force balances gives the implemented positive heavy/light exponent `(m_B-m_A)Ω²r²/(2eT_i)`. The effective potential is identified as rotating-frame, and the wall-peaked common-corotation branch is not advertised as a reconstruction of a vacuum arc. Actual centrifugal enrichment is experimentally established, but that does not validate this model's profiles or throughput. [Krishnan, Geva and Hirshfield 1981](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.46.36).
- The Gaussian branches intentionally prescribe the total density and rigid ion rotation. Their ion/electron pressure, electric, magnetic and centrifugal coefficients close algebraically; the equal-Z composition remains independent of B. `magnetic-centrifuge.ts:55–67` integrates the correct positive `d(B²)/dr` from the azimuthal current and rejects insufficient wall magnetic pressure. Both branches expose omitted electron inertia, and the imposed-B branch exposes the estimated self-field. These are bounded approximation results, with neither quasineutral scale separation nor stability/discharge/extraction established. Reporting algebraic residuals does not validate omitted physics. Existing model notes make these limitations explicit; no new defect is asserted solely because these omissions exist.
- `centrifuge-diagnostics.ts` integrates the cylindrical measure and explicitly calls the cut a static inventory partition. `collector-acceptance.ts:10,28–34` counts a passive mask of retained impacts and normalizes to the original incident population. Neither execution path establishes continuous feed composition or engineering recovery.
- `failure-budgets.ts:21–70` uses dimensionally coherent independent estimates: `n₀σL`, `n_e αt`, `sqrt(4Dt)`, optically thin `n_e n_Z L_Z`, and `γ T_e e Γ_i`. The UI states that these estimates do not change separator paths or populations. Section III mechanisms such as charge exchange, recombination, instability, atomic populations and sheath response remain unsolved; this is disclosed model scope rather than an implementation of those mechanisms.
- Reduced gyro loci use each species' own resolved period; curved-field drift uses both curvature and grad-B terms and declares the guiding-centre domain. I found no established A/B equation or unit defect in the inspected source.

## Evidence boundary

Used existing `assets/tutorial.txt` for the supplied tutorial's II A–D and relevant III text, then reopened primary author/publication sources online for the Brillouin threshold, collisional limitation and experimental centrifuge distinction. Did not read old audit/test reports as proof. No project tests, builds, installs, simulations or VM mutations were performed by this agent. The parent executed the narrow identical-grid probe in its existing offline VM at `/work/home/audit-v41-check-source`; I reopened the fresh witness log and `scientific/audit-v42/receipt.json`. The parent reports all 481 baseline input hashes matched before and after every command. The receipt records exit 0 for the probe, `npm test`, `npm run typecheck`, `npm run build`, `npm run check:site`, and `npm run check:assets`; the parent reports 831 tests passed. These checks reproduce the specific numerical-evidence defect and establish baseline software checks, not broad numerical convergence or experimental qualification. The probe hash in the receipt is `7667dca910ad95dccf053c02794f476b41f0101aa096ae0eccb70a54d1b4a682`.

Read the safe-dev README before inspection. Trusted host operations were limited to source/text reads, hashes, and this report edit. Source snapshot hashes inspected:

```
main.js                    97acf4eb213b578c448c5a702a4018044f937a5e082e5e3f0f75edeeb6b10929
physics.ts                 a48f1cb57374c8a30c155837d2e91bdff605395ada3fec8911c1ead9ef6b370f
centrifuge.ts              cfdc02f8d3fa10240a790588c15b3f03339e3454d2cbdc97ad94890db23b0edf
gaussian-centrifuge.ts     72bf3063a859ae3bac1c96fb2aa9281e27bab963cda5aaf0aa63292275051b49
magnetic-centrifuge.ts     c3a14f4701d84292271218effd04bc6470e325309113c42d3c8e264ad1fecb9e
equilibrium-model.ts      74c06b1f46070c20193eb5f3aad3b5c76abacb8dbb0170152c51187021da6853
centrifuge-diagnostics.ts  e1ff38403a38d14c30634258adc7a7c573f946c75d892387c8c0a6d11c9a8151
geometries.ts              8697c8743c9756b9d13652b6bf792410a4f02345980510f47fc688f6b550110c
failure-budgets.ts         d6e4936e1579d7445dbf3e0e9a0685ae94dd8f39fd13f6acc3ae42f5dc03b3ef
```
