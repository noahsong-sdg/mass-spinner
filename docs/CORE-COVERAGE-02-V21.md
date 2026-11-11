# Playground 02: core-innovation coverage audit

Independent review, 7 November 2026. Initial read-only audit and fresh
primary-source review, followed by a separately scoped analytic implementation.
The coverage matrix records the initial state; the delivery note below records
what was subsequently added. Browser verification remains separate.

## Scope and evidence

Reviewed `src/fusion-reactor.ts`, `src/fusion-playground.ts`, `src/fusion-ui.js`,
`src/neutron-geometry.ts`, `src/neutron-geometry-ui.js`,
`src/component-catalog.ts`, `src/component-inspector.js` and `index.html`, with
the v20 design/adversarial reports as prior work. The initial audit executed no code.
No denied production-origin content was retrieved through another route.

Fresh primary sources:

- [Company homepage](https://www.marathonfusion.com/), compact-source and future-plant sections.
- [Beam-driven architecture](https://www.marathonfusion.com/beam-driven-fusion/).
- [Scalable Chrysopoeia](https://www.marathonfusion.com/alchemy.pdf), §§2–5;
  [version record](https://arxiv.org/abs/2507.13461v3), revised 3 August 2025.
- [Isotope Production in Fusion Systems v2](https://arxiv.org/html/2512.09242v2),
  §§II–VI, dated 22 March 2026.

“Their work” here means those public architectures and two central transmutation
papers. It is not an exhaustive claim about all company publications,
unpublished engineering or experimental validation.

## Verified source facts

The compact architecture uses RF-generated deuterium ions, electrical
acceleration and solid LiT on a cooled substrate. Lithium deposition and
in-place target renewal distinguish it. Materials irradiation and isotope
production use separate downstream targets. Fuel recycling, lithium enrichment
and breeding appear in the future-plant architecture. Hardware alloys remain
unspecified in the compact description. [Company sources above.]

The alchemy paper couples mercury neutron multiplication with gold production:
198Hg(n,2n)197Hg → 197Au. Its modeled ARC blanket preserves breeding; enrichment,
inventory, extraction, contamination and conditional economics matter. The
representative 1500 MWth case uses a 210 mm, 85 at% Hg channel: TBR 1.19;
depletion yields 2909 kg Au/year under its replenishment assumptions. Ground-state
197Hg has a 64.14 h half-life; unwanted 195Au has 186.10 days. [§§3,4.1–4.1.2,5.]

The later paper separates economic and electrical breakeven. Its analytic
blanket model exposes total output versus inventory utilization, wall heat versus
plasma gain, nonuniform neutron loading and market limits. It includes 197mHg:
23.8 h, 94.7% internal transition and 5.3% electron capture. [§I Eqs.2–3; §§II–V.]

## Root cause of incomplete coverage

02 correctly represents a restricted beam–target source. Its execution path is
controls → imposed energy/column solver → production/heat/energy curves → optional
free-flight sample geometry. There is no evolving target state, neutron material
transport, blanket reaction network, processing plant or economic engine.

In simple terms, it computes how many reactions occur and where idealized free
neutrons could cross a sample. It does not yet compute how a working target is
maintained or what an irradiated material becomes. A realistic render cannot
close either gap.

The smallest coherent fix is an explicit coverage map plus separate bounded
explorers. A single coupled “Marathon reactor” model would silently combine
different machines and gain definitions. That would add apparent completeness
while reducing physical correctness.

## Coverage matrix traced in current code

“Present” means inspectable functionality, not validated company performance.

| Concept | Current implementation | Smallest justified next step | Claim boundary |
|---|---|---|---|
| RF ion source → accelerator → LiT → cooled backing | Present: conceptual schematic, inspector and beam controls | Render that sequence with discrete selectable parts | Company architecture; illustrative geometry and unknown hardware materials |
| Target deposition and renewal | Inspector text only | Add a selectable renewal process path to the apparatus and coverage map | No renewal rate, lifetime or surface-temperature prediction |
| Fusion probability versus beam slowing | Present: attenuation along imposed linear energy loss | Keep the assumption visible beside the energy scan | Not material-resolved LiT stopping or an actual target optimum |
| Input power, nuclear gain and deposited heat | Present: explicit ledger, layer/backing distinction | Retain alongside a cleaner layout | Qbeam is not plasma gain or net electric gain |
| Useful irradiation versus neutron production | Present: conditional finite-disk interception | Give sample its own inspector identity and show production → crossing rate | No scattering, spectrum transport, activation, dose or DPA |
| Separate irradiation feedstock and specimen applications | Concept/links; no response solver | Add selectable application descriptions to sample | No numerical medical-isotope yield without evaluated reaction data |
| Fuel separation/recycling versus new fuel breeding | Limitation text; no plant model | Add a distinct future-systems process map | Recovered tritium is not newly bred tritium |
| Valuable-product neutron multiplier | Absent | Separate future-blanket diagram and analytic panel | Must not use the compact source's sliders as a calibrated plant |
| Tritium balance and parasitic neutron losses | Absent | Display budget identities; allow explicitly assumed rates | Do not infer TBR from arbitrary Hg fraction or thickness |
| Capture fraction versus initial inventory | Absent | Implement optical-depth/utilization explorer below | Single-reaction, prescribed-cross-section approximation |
| Production, delayed decay and chemical separation | Absent | Add normalized post-irradiation decay explorer | Include isomeric branch or label ground-state-only |
| Isotope purity and cooldown | Absent | Show impurity activity ratio and extraction-history dependency | No regulatory release date or product qualification claim |
| Wall heat, gain and loading concentration | Absent for future plasma; compact heat is present | Reference equations/curves in separate future-system scope | Qplas and its heat model do not apply to the cold-target engine |
| Economics and market saturation | Absent | Explicit price/cost/discount scenarios or source-linked reference | Positive scenario NPV is not measured profitability |
| Blanket engineering and source limitations | Some model notes | Add compact status chips beside corresponding process components | Unknown engineering inputs remain unknown |

## Bounded interactive additions

These are recommendations derived from the source models and current execution
path. They require unit tests, domain checks and visual verification after
implementation; the formulas alone do not establish physical fidelity.

### 1. Target renewal as a process, not an invented rate

Add the process sequence “lithium deposition → cooling/solid layer → tritium
loading → beam exposure → renewal.” Clicking a step explains the distinction
between replacing a surface and creating tritium. Do not connect a decorative
renewal animation to target column or claim a renewal timescale.

A later stateful model needs measured stopping/composition and thermal/loading
closures. The v20 review supplies appropriate particle/thermal balance gates.
Keeping the process explainer independent avoids introducing unsupported
calibration merely to animate the render.

### 2. Separate optical-depth/inventory explorer

Use the later paper's idealized single-reaction model, with an optical-depth
slider rather than a false geometry-to-TBR fit:

```
tau = sigma * n_feed * thickness
eta = -expm1(-tau)
Xi = eta / tau             # Xi(0) = 1 by its analytic limit
R_product = eta * R_neutrons
N_feed = area * tau / sigma
```

Plot `eta` and `Xi` versus `tau`. Display both total product rate and product
per initial feedstock inventory. For positive rate and zero inventory, the
endpoint must be evaluated by its limiting formula rather than a numerical
division. If exposing dimensional inventory, label `sigma` as a scenario input;
the paper's illustrative 2 barn value is not a universal evaluated spectrum
average. These identities do not compute TBR, leakage, capture competition,
secondary spectra or magnet heating.

This is preferable to fitting a smooth curve through one published transport
case. It exposes a real tradeoff without fabricating transport data.

### 3. Post-irradiation decay explorer

For a normalized batch initially in the ground-state parent only, after source
shutdown and with no extraction or burnup:

```
lambda_g = ln(2) / T_half_g
N_g(t) = N_g(0) exp(-lambda_g t)
N_Au(t) = N_Au(0) + N_g(0) [1 - exp(-lambda_g t)]
```

Label this limit explicitly. A full normalized chain should instead allow an
explicitly assumed initial isomeric fraction and solve

```
dN_m/dt = -lambda_m N_m
dN_g/dt = b_IT lambda_m N_m - lambda_g N_g
dN_Au/dt = b_EC lambda_m N_m + lambda_g N_g
b_IT + b_EC = 1
```

Check nonnegative populations, atom conservation and exact endpoints. Do not
infer the initial isomeric fraction from total neutron count: it depends on
reaction/spectrum data. A separate normalized 195Au residual-activity curve can
show why rapid formation of stable Au does not imply qualified product. Its
initial impurity inventory must be assumed or sourced, not generated by this
chain. Continuous irradiation, cooling and extraction are distinct histories.

### 4. Neutron/fuel and economics status

At minimum show identities and a frozen provenance-bearing transport case:

```
TBR = blanket tritium birth rate / fusion tritium consumption rate
dN_T,plant/dt = R_breed - R_fusion - R_loss - lambda_T N_T + R_external
NPV = -CAPEX + sum_t cashflow_t / (1 + discount_rate)^t
```

Do not add arbitrary breeding output to the compact beam calculation. If an
economics slider is added, every price, yield, duty factor, extraction loss,
electricity purchase/sale assumption and delayed-sales treatment must be a
declared scenario. The useful takeaway is sensitivity to assumptions, not a
green “profitable” badge.

## Completion and validation gates

The core ideas can all be visible as process explanations, limitations and
bounded analytic explorers without all being predictive simulation modules.
Do not mark “complete physics coverage” until the matrix identifies each item
as **simulated**, **analytic reference**, **process explanation** or **not modeled**.

Before release of any new explorer:

1. Trace controls through calculations to the displayed plot and export.
2. Test zero-source, zero-depth, extreme-depth and endpoint limits; retain the
   current heat/particle ledger and independent geometry limits.
3. Test decay conservation, branch normalization and the no-isomer limit.
4. Keep reference-case inputs/readouts immutable and separate from live inputs.
5. Verify every control/plot and component selection in a permitted browser;
   generated images and successful builds do not prove that interaction works.

## Analytic implementation delivered after the audit

Added only `src/blanket-reference.ts`, `src/blanket-ui.js` and
`tests/blanket-reference.test.ts`, plus this report. Parent integration calls
`setupBlanketExplorer(host)`; its returned `render` mount has id `blanket-render`.
`blanketComponents` uses the render manifest IDs `plasma`, `armor`, `structure`,
`multiplier`, `breeder` and `tank`. Both V-alloy structural layers are explicitly
identified from the primary paper, avoiding an omitted outer wall in the initial
concept render.

The optional panel adds a frozen published transport/depletion case; normalized
post-irradiation Hg ground-state/isomer/Au evolution with an assumed initial
isomeric fraction; an independent normalized Au195 curve; and optical-depth
reaction-fraction versus utilization curves. Frozen TBR/yield never consume
these sliders. Thus the baseline matrix's absent decay/inventory references are
now implemented as analytic references, while its transport, processing,
thermal-state, market and full-plant gaps remain explicit.

The two-parent analytic solution was checked against independent explicit
midpoint ODE evolution over 500 hours for three initial mixtures. The five
narrow tests also check atom conservation, zero/long/very-short-time limits,
optical-depth saturation, invalid domains, actual UI callbacks, finite plots,
stale-output clearing/recovery and reference-case immutability. All five passed
inside an Apple safe-dev VM.

Exact tested snapshot: trusted minimal copy at
`/tmp/mass-spinner-blanket-min-v21`, explicitly synced to guest
`safe-dev-71f0c972b58d59ce`; dependencies installed there with
`safe-dev -C /tmp/mass-spinner-blanket-min-v21 run --online -- npm ci --ignore-scripts --no-audit --no-fund`.
The narrow command was
`safe-dev -C /tmp/mass-spinner-blanket-min-v21 run -- npx tsx --test tests/blanket-reference.test.ts`.
`safe-dev -C /tmp/mass-spinner-blanket-min-v21 run -- npm run typecheck` also passed.
Host/stage SHA256 matched for all three delivered source/test files:

```
1b68d6743c0a586ba04f4f2fdafeafd014dab6550317951a22de3058d50c256e  src/blanket-reference.ts
9ee4f6b7a7c08b8db31f874a7c21f046bc0577f7c99da7ff89b056babe358893  src/blanket-ui.js
d8e6c511c4e8864077d7fb8a9a4d3f1bf646012b2674b149e105bb92bbeac49c  tests/blanket-reference.test.ts
```

The independent tests validate these restricted equations and control wiring;
they do not validate real blanket transport, irradiation yield or an operating
Marathon machine. Full integrated build, render review, browser verification
and deployment remain the parent implementation team's responsibilities.
