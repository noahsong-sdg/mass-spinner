# Evolving LiT loading: implementation boundary and existing tools

Independent literature/code selection review, 7 November 2026. This agent read
the safe-dev instructions and source, browsed primary literature and official
code/documentation, and changed this report only. No code installation,
simulation, tests or browser verification were executed by this reviewer.

## Recommendation

Use an explicitly assumed **well-mixed isotope-replacement reference** for the
browser now; do not claim calibrated LiT loading, diffusion or lifetime. Couple
its evolving T column back to the checked D–T probability, with separate
incident-deuteron and target-tritium conservation ledgers. Keep the stopping
matrix fixed only as a declared approximation. The immediate computational
route to better data is **RustBCA prompt implantation/reflection profiles plus
FESTIM 2 transport**, with **TMAP8** as a strong independent transport benchmark.

No checked source in this review supplies a transferable set of measured
20–500 keV D-in-solid-LiT implantation, diffusivity, surface-exchange,
permeation and sputter coefficients. Existing software does not remove that
material-data gap. This is a bounded finding from the sources below, not proof
that such data do not exist.

## Root cause in the current execution path

`fusion-reactor.ts` imposes a homogeneous T column and an independent linear
fractional energy loss; it integrates optical depth, survival and an energy
ledger. Exposure multiplies the steady neutron rate. `target-exposure.ts` adds
an exact single-node heat observer and a fusion-only consumption diagnostic,
but leaves source composition and stopping unchanged.

Technically, the state contains no D/T isotope populations, implantation
source, diffusion flux or moving surface. Simply, the simulator can count
fusion reactions but cannot yet represent deuterium replacing tritium in the
target. Replacing only the nuclear cross section or temperature solver would
not fix this missing material state.

## Tools: best fit is a coupled workflow

| Tool | Verified capability and availability | Appropriate role and limit |
|---|---|---|
| [RustBCA](https://github.com/lcpp-org/RustBCA) | Open GPL-3.0 BCA; incident reflection, implantation/transmission, recoil sputtering and displacement; C/C++/Python/Fortran interfaces | Best immediately inspectable prompt ion–solid candidate. Run a pinned offline material study. It does not by itself infer thermal isotope diffusion, chemistry or measured LiT coefficients. A BCA material mixture is a model, not LiT validation. |
| [FESTIM](https://github.com/festim-dev/FESTIM), [v2 paper](https://arxiv.org/abs/2509.24760) | Apache-2.0; Python finite elements, DOLFINx/FEniCSx; multispecies diffusion, reactions/trapping, surface exchange, decay and advection | Recommended material-transport backend after a reproducible implantation source and coefficients exist. Avoid copying older v1 APIs into a v2 benchmark. Requires diffusion, reaction, interface and surface data for this material. |
| [TMAP8](https://tmap8.inl.gov/), [repository](https://github.com/idaholab/TMAP8) | INL MOOSE application, LGPL-2.1; multispecies mass/thermal transport and fuel-cycle models; public [verification cases](https://tmap8.inl.gov/verification_and_validation/index.html) | Strong independent continuum-code comparator and larger integrated fuel-cycle path. Prefer it over beginning a new adaptation of legacy TMAP4/7. More substantial build/input ecosystem than a small Python reference; its quality processes do not validate an unmeasured LiT material card. |
| [SDTrimSP](https://www.max-planck-innovation.de/technologieangebote/technologieangebot/a-monte-carlo-code-for-calculating-collision-phenomena-in-randomized-targets.html) | Established dynamic BCA; depth-dependent composition/density, sputter/reflection, target thickness and fluence evolution; license required | Relevant reference for changing composition and erosion. It is not an unrestricted open dependency; obtain the applicable license before use. The official academic/commercial licensing routes differ. |
| [F-TRIDYN](https://doi.org/10.1016/j.jnucmat.2017.07.037) | Published TRIDYN extension for explicit surface roughness and coupling outputs | Useful roughness comparator if an authorized distribution is obtained. This review did not establish a current installable source/license, so it is not the first reproducible implementation choice. |

The recommended split is prompt cascades → retained implantation profile and
energy deposition → continuum D/T transport and surface loss → updated
composition → recomputed stopping/yield. Each arrow needs unit and atom/energy
balance checks. Neither BCA nor continuum diffusion alone covers the entire
problem. Keep the browser surrogate explicitly separate from these offline
validation studies.

## What the material literature actually supports

- [Wampler et al., 2020](https://www.sandia.gov/research/publications/details/optimization-of-target-lifetime-for-production-of-14-mev-neutrons-2020-12-15/)
  identify implanted-D isotope exchange as a cause of declining neutron output
  in thick tritide targets. Diffusive mixing and thin-film substrate/barrier
  design affect life. This supports tracking exchange separately from fusion
  burnup; its metal-tritide/W/Fe results are not LiT coefficients.
- [Krstic et al., 2023](https://www.frontiersin.org/journals/physics/articles/10.3389/fphy.2023.1105194/full)
  study LiH/LiD surfaces with reactive MD at 300 K and 1–100 eV. Composition
  changes reflection, retention and sputtering, and low-energy chemistry can
  defeat simple BCA descriptions. These energies are far below our 20–500 keV
  beam; their retention probabilities must not be reused as a keV-LiT fit.
- [Ou et al., 2022](https://doi.org/10.1088/1741-4326/ac3295),
  [institutional record](https://research.tue.nl/nl/publications/deuterium-retention-and-removal-in-liquid-lithium-determined-by-i/),
  examine D-plasma exposure of Li-filled porous tungsten, NRA profiles and a
  reaction–diffusion model. Retention below about 2% in those experiments
  contrasts with the near-full uptake reported under different conditions by
  [Doerner et al., 2002](https://doi.org/10.1088/0029-5515/42/11/305).
  This is strong evidence against treating one universal retention fraction
  as a measured property. Neither experiment calibrates accelerated D into a
  solid LiT film on Marathon's substrate. The direct Ou PDF fetch failed with
  403; the institutional record and indexed primary abstract were checked.
- The [FESTIM kinetic-surface V&V paper](https://arxiv.org/abs/2411.16474)
  distinguishes numerical verification, experiments on specified materials and
  cross-code comparisons. Its existence makes a transport implementation
  credible to investigate; it does not establish validation for our LiT case.

Do not substitute lithium titanate (Li₂TiO₃), molten lithium, TiT₂, or Li–Pb
diffusion parameters merely because a search result contains lithium/tritium.
Phases, traps, impurities, boundary conditions and isotope chemistry differ.

## Smallest defensible browser reference

The no-fusion, well-mixed, fixed-site exchange limit is an analytically useful
scenario. Let S be areal occupied hydrogen-isotope sites, J=I/(eA) incident D
flux, and η an **assumed effective replacement fraction**, not measured LiT
retention. Each effective D insertion randomly replaces an isotope in the
mixed pool. Starting from T fraction f₀:

`df_T/dt = −(η J/S) f_T`, hence `f_T(t)=f₀ exp(−η J t/S)`.

Displaced T must be counted as leaving the modeled active pool; incoming D and
displaced D also need a ledger. Calling η the prompt BCA sticking coefficient
would be misleading: this closure also assumes instantaneous mixing and
removal. It is not diffusion, sputtering or thermal desorption. No Arrhenius
temperature coupling is justified without coefficients.

If fusion depletion is included at appreciable levels, it **does not** turn
the fused target T into a D atom. Track a vacancy or explicitly declare an
external refill source. One conservation-consistent extension, derived here
as a scenario rather than a fitted material law, is:

```
S = T + D + V                         fixed areal sites
p(T) = 1 − exp(−sigma_eff T)          fixed stopping/mixed T optical depth
R = J p(T)                           fusion reactions / area / time
B = η J (1 − p(T))                   nonreacting D offered for capture
dT/dt = −R − B T/S
dD/dt = B (1 − D/S)
dV/dt = R − B V/S
```

Capture selects a random site, filling a vacancy or displacing its isotope.
Count released T at `B T/S`, released D at `B D/S`, transmitted/unretained D
at `(1−η)J(1−p)`, and fusion at R. The target site sum is invariant and the
vector field points inward at every zero-population boundary. Exact isotope
balances are `T₀ = T + released_T + fused_T` and
`D₀ + incident_D = D + released_D + unretained_D + fused_projectile_D`.
These equations omit D–D reactions, recoil mixing, erosion, radiation damage,
and spatial transport. Their numerical solution and any interpretation at
large changes require separate checks; this is not a claim that LiT obeys
random replacement.

For a smaller implementation, retain the analytic no-fusion reference and
label fusion consumption as a separate diagnostic rather than silently
merging inconsistent inventories. Preserve the original frozen source view
and exports so a changed target history cannot be confused with the same
steady-source assumption. Evolving source heat must not be fed into the v22
constant-forcing thermal observer without replacing that observer's forcing
contract.

## Independent acceptance gates

1. Zero current and zero duration preserve all target state and produce no
   incident particles or neutrons. η=0 is fusion-only; no artificial isotope
   replacement occurs. Zero T gives zero D–T rate, not zero beam heat.
2. No-fusion exchange matches the analytic exponential in fluence, not only
   time. Scaling current/area/time with fixed fluence gives identical state.
3. Every step and export closes both isotope ledgers and the site sum. Each
   reaction consumes one projectile D and one target T. No negative loading,
   clipped population or replenished tritium can hide a solver failure.
4. Compare finite-time histories and integrated neutrons against an independent
   high-accuracy solver plus step/mesh refinement. Conservation alone is not
   convergence; compare changes in rates as well as final inventories.
5. Thin-target p≈sigma_eff T and zero-exchange fusion-only analytic limits
   provide independent controls. The latter obeys
   `expm1(sigma_eff T(t)) = expm1(sigma_eff T₀) exp(−J sigma_eff t)`.
6. If using depth data, preserve integral source normalization, projection vs
   track-length units, nuclei vs molecules, material fractions and isotope
   masses. Recompute stopping when composition changes materially or retain
   an explicit frozen-matrix label. Compare two codes under identical cards
   before interpreting disagreement as physics.
7. Qualify separately: arithmetic/solver verification, agreement between
   implementations, material-data validity, and experimental yield agreement.
   Passing the first two does not establish the last two.

Next physical data request: composition/phase and density versus depth,
incident species/energy/angular distributions, film/substrate geometry,
implantation/reflection benchmarks, D/T transport and surface rates across
temperature, and fluence-resolved neutron yield plus isotope profiles. Without
these, report sensitivity envelopes rather than Marathon lifetime predictions.

## Independent implementation audit

The later implementation audit added
`tests/material-transport-independent-v23.test.ts`. All **five tests passed**
against the frozen loading kernel with the explicit resolution diagnostics.
The reviewer used an independent energy-coordinate quadrature of `1/S(E)` and
`sigma(E)/S(E)` to check depth-RK4 exit energy, attenuation and survival-weighted
stopping energy. Quadrature refinement and production depth refinement were
checked separately. Removing reactive T preserves the fixed material stopping;
zero current eliminates rates. These are implementation checks using the same
constitutive stopping law, not an independent material benchmark.

A separately written simultaneous RK4 system integrates T/D/vacancy fractions
and five incoming/outgoing reaction ledgers in dimensionless fluence. At a
substantial synthetic dose 2.5, optical depth 3 and replacement probability .8,
it agrees with the event-split loading implementation under refinement. The
observed splitting convergence is first order. Site, target-T and incident-D
balances were also recomputed independently from exported populations/counts;
no clipping was used to make those checks pass.

The high-dose study `scientific/loading-independent-v23/high-dose-study.ts`
exposes a remaining numerical limitation. For initial T fraction .65,
unit-loading optical depth 1e−6, replacement .8 and incident dose 1000 per site,
independent simultaneous RK4 with 65536 and 131072 steps gives respectively
8.124991164072076e−7 and 8.124991164072043e−7 fused nuclei per site. The split
method gives 1.8793378837553844e−6 at 400 steps, 1.2853543859967581e−6 at 800,
1.0324807667552715e−6 at 1600 and 8.643379664336508e−7 at 6400. Even the last
is about **6.38% high** while its incident ledger closes to around 1e−14
relative. Conservation is not time accuracy. The new per-step 10% T-loss
budget marks this case underresolved, but that budget is not a solution-error
estimate or an experimental validation gate. The parent was notified to show
this boundary plus direct coarse/fine yield evidence in the playground.

Unit and source inspection also checked the pinned Geant4 v11.4.0
`G4BraggModel.cc` H/Li coefficient rows, float32 coefficients, low-energy
square-root continuation, and `G4ICRU49NuclearStoppingModel.cc` proton-charge
Z^(1/3) branch, reduced-energy conversion and mean nuclear-table interpolation.
The one-Li plus one-T sum has a formula-unit denominator. This is a declared
mass-number/Bragg adaptation, not a complete Geant4 physics-list run; compound
corrections, restricted losses, straggling and actual isotope-mass refinements
are not silently validated by matching those formulas.

Frozen narrow gate commands used only the copied Apple VM:
`safe-dev -C /tmp/mass-spinner-loading-independent-v23 run --online -- npm ci --ignore-scripts`,
then offline
`safe-dev -C /tmp/mass-spinner-loading-independent-v23 run -- ./node_modules/.bin/tsx --test tests/material-transport-independent-v23.test.ts`.
Guest: `safe-dev-4aafc1b446cc3b2e`. The 42-file gate source-map SHA256 is
`75b8072b6914084651e1c2bcf4da8b58ea28268941521e065152c2dc11368409`.
Loading kernel SHA256:
`c5b8c91d77d86cf898c72fe1156d05b49d5e3f8f7de3a40b679f8638350ee7eb`;
fusion kernel:
`bf3be25d3517702adb7dd3d2ad36711cf33443ddcbe77ae5d215f3cccddeb89e`;
stopping kernel:
`b717daabad65ebed9998bbb0eeed57b6666ac831a7b5270d1e07830e8764b892`.
Full-project final build/typecheck, merged tests and deployment are parent gates.
No browser rendering, GPU behavior or measured LiT agreement is claimed here.

After adding the retained high-dose script, a fresh explicit sync, isolated
dependency install and offline execution reproduced the study and passed the
five tests again (293.8 ms). This final 43-input map SHA256 is
`ec54b7e7cad77c8d35377d16aaa52fbfc5e93712984381fe79eae49e79bcb467`.
All actual guest source hashes were checked after export; loading/stopping
kernels, test and study script still matched the host. The host fusion module
subsequently changed only two plot-axis labels to identify the fixed material
coordinate; that diff was inspected and the current merged gate remains with
the parent. The exact script,
machine-readable results, test log and input map are retained in
`scientific/loading-independent-v23`; full guest export is
`/tmp/mass-spinner-loading-independent-v23-final-export`.

## Opaque-target cancellation correction: final independent gate

The parent's final review found a numerical cancellation at very large optical
depth τ and much smaller but finite reaction fluence x. Subtracting the
remaining τ from its huge initial value could round the consumed amount to
zero, even when virtually every incoming D should fuse. Simply, a small count
was being recovered by subtracting two indistinguishably large inventories.

The correction directly evaluates consumed optical depth for x≤τ:
`delta_tau = x − log1p(exp(x−tau) [−expm1(−x)])`.
This follows algebraically from the exact depletion solution; its exponent is
nonpositive and the small consumption is not recovered from a huge-number
subtraction. For x>τ the remaining-optical-depth form remains well conditioned.
This is an arithmetic correction to the same physical model, not a new
approximation or opacity threshold.

Added a sixth independent test: τ=1e20 with x=1,10,1e6 must fuse the first
substep's incoming fluence; τ=1000 and x=999,1000,1001 test both sides of the
branch transition using independently well-conditioned remaining inventory.
Fresh copied-VM execution passed **6/6** tests (294.2 ms), and reproduced the
high-dose study. Tested loading SHA256:
`5ab4a699e2a85732fcb91b01172aa0aa7f8f221c33be1f43c45edc1565e2a9d5`;
current fusion SHA256:
`ecfed5a8890cdd5256e3b245bdef602da3636f7dcf6b48b9df6b36b9831851e4`.
Stopping is unchanged. The final 43-input map SHA256 is
`e309dfd5f4aa298146159fb2a316853e8295950455f4f05936a3eca3651a1be5`.
All actual guest input hashes and current core/test/study host hashes matched
after export. Evidence files with the `opaque` suffix preserve this final gate
in `scientific/loading-independent-v23`; full export is
`/tmp/mass-spinner-loading-independent-v23-opaque-export`. The numerical
high-dose splitting and material-data limitations above remain unresolved.
