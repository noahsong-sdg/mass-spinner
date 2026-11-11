# Independent coupled-target stress audit, v35

Prospective protocol, 9 November 2026 UTC. This reviewer owns new independent
tests and this report; no production source edits are authorized here.

The actual path is `simulateCoupledTarget` → recomputed depth stopping/fusion →
implicit isotope diffusion/loss plus finite-volume thermal stepping. The
separate numerical reviewer owns the joint depth/time matrix. This audit
targets different public seams: stiff diffusion, input semantics, physical
boundary loss, zero/continuous duty and independently reconstructed inventories.

Before candidate execution, fixed the six cases and budgets in
`tests/coupled-target-adversarial-v35.test.ts`:

- A uniform closed isotope state must stay unchanged to 2e-12 absolute even
  for D=1m²/s. Implicit stability cannot justify losing a stationary solution.
- Null or absent required numeric coefficients must reject, rather than switch
  a process off through JavaScript coercion. An explicit null profile must not
  silently choose uniform implantation.
- With no diffusion/beam, front/back boundary-cell losses have independent
  exponential solutions; population/released-count budgets are 2e-6 per site.
- With diffusion and both boundaries, independently reconstructed T/D/site
  balances must remain within 1e-9 per site; no negative populations permitted.
- Duty0/1 at exposure0.325s and period0.1s must integrate the exact projectile
  time and energy (2e-13 relative), with no events after shutoff.

All execution will use an isolated copied Apple safe-dev guest. These are
equation/implementation checks, not measured LiT calibration, an empirical
error bar, target lifetime or validation of 3D hot spots. Existing-code BCA
halfspace results cannot be silently imported as a thin-film implantation law.
Isotope-carried enthalpy, binding heat and moving-host erosion are separate
physical closures and must remain disclosed.

## Observed red finding and root cause

The frozen original six-test suite returned **5 pass / 1 fail** in the isolated
VM, 636.961417 ms. The failed public-input case was an explicit null
`implantationWeights`. The caller used a nullish default (`??`), so both an
omitted profile and a supplied null selected a uniform implantation profile.
In physical terms, a missing/corrupt supplied depth profile silently became a
different target-loading assumption. An optional omitted profile was already
part of the public API; an explicit null profile was not.

The production owner changed the caller to default only on undefined and reject
a supplied non-array before normalization. This preserves valid optional-input
behavior and removes the demonstrated ambiguity without adding a fallback or
changing the physical model. The reviewer did not edit production code.

Original source: `48af1b1f6e67b7dd765c8da056484252ae8ab499843258cdd0d5a8f0bd2c10f2`.
Red export: `/tmp/mass-spinner-coupled-stress-v35-red-export`.
Preserved evidence is under `scientific/marathon-v35/stress-audit/red/`;
its manifest SHA-256 is
`c8185b66a015f8c9696ea1bab99e958dd12d7b56bede1b8c7bb5c6691b631a82`.

Before any further outputs, the reviewer added a seventh, prospective analytic
case: boundary Arrhenius escape at 293.15 and 343.15 K, with rate
`(v / dz) exp[-Ea / (kB T)]`. The same 2e-6 absolute population budget was fixed
in the addendum. Original six gates were unchanged; diagnostic output was added.
The original and seven-test versions are preserved separately.

## Candidate rebase, before final numeric-domain guard

The seven-test suite returned **7 pass / 0 fail**, 546.671334 ms, and strict
standalone coupled-path TypeScript checking returned exit 0. This source is
`97115b155bbc79828269beb61433e060ddf80be5c3573350ed2b81b2de3300e7`.

| Independent check | Observed error | Frozen budget |
| --- | ---: | ---: |
| Uniform T, diffusivity 1e-12 m²/s | 2.22045e-15 absolute | 2e-12 |
| Uniform T, diffusivity 1 m²/s | 4.44089e-16 absolute | 2e-12 |
| Front/back exponential loss, maximum T cell error | 4.36492e-7 absolute | 2e-6 |
| Arrhenius front T at 293.15 K | 8.65806e-8 absolute | 2e-6 |
| Arrhenius front T at 343.15 K | 1.33643e-7 absolute | 2e-6 |

The isotope/site inventory, positivity and exact duty-endpoint ledger tests also
passed their frozen gates. These are independent reconstructions from returned
populations and event counts, rather than acceptance of solver residual fields.
The red null-profile case now rejects as required.

Source and result files were hashed before and after execution. This candidate
is preserved under `green-before-derived-numeric/`; its 52-member manifest hash
is `e247a5d091615e820d7e0b0e19c3a1f4c92e29cb00d73bda52026aaeb49d6177`.
The production owner is adding a separate derived-count finite-domain guard;
this candidate is not approval of that later source until it is rebased below.

## Reproduction and limits

Dedicated staging copy: `/tmp/mass-spinner-coupled-stress-v35`.
Dedicated guest: `safe-dev-ef5081c91787fcfa`.
After preserving the previous export, source was copied to staging and refreshed
with `safe-dev -C /tmp/mass-spinner-coupled-stress-v35 sync --replace-guest`.
Dependencies were restored with
`safe-dev -C /tmp/mass-spinner-coupled-stress-v35 run -- npm ci --offline --ignore-scripts`.
The original dependency download used an online guest `npm ci --ignore-scripts`;
all test and typecheck execution was offline. No host project execution or
credential/socket/home mount was used.

The guest verification wrapper checked `inputs-green.json` hashes both before
and after these exact commands:

```text
./node_modules/.bin/tsx --test tests/coupled-target-adversarial-v35.test.ts
./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/coupled-target.ts
```

The whole-app required build/typecheck and browser verification belong to the
parent integrator. This review cannot certify those checks or a deployed site.
A stable positive IMEX update is not automatically accurate: this is a
first-order method with local step estimates. The separate joint mesh/time
study must establish scenario output convergence; a requested local tolerance
is not a global error bar. This stress audit establishes only the stated
stationary, scalar analytic, boundary-ledger and input-contract properties.

No empirical Marathon apparatus or LiT coefficient validation is claimed.
Atomic stopping and a halfspace BCA benchmark do not provide a calibrated
thin-film implantation profile. Fixed-host 1D thermal energy excludes released
isotope enthalpy and binding heat; full 3D heating, erosion, implantation and
transport remain distinct unclosed physics.

## Final source rebase

The unchanged seven independent stress tests passed **7/7** on the owner's
frozen final coupled source
`d5d3028a87f57832a0e9aa2612e927017b99d9aac0a2c0386b4cbe1a17f26b2e`.
Strict standalone coupled-path TypeScript checking passed (exit 0). The test
runner duration was 568.968834 ms; the complete checked wrapper took
1.767362834 s. Input
hashes matched before and after both commands, and every staged source/test
file still matched the canonical project at evidence sealing. The final
implementation adds the owner's genuine derived-count numeric-domain guard;
these unchanged gates pass through that path without weakening a budget.

The final independent errors are identical to the candidate table. Final
exports are preserved at `/tmp/mass-spinner-coupled-stress-v35-final-export` and
in `scientific/marathon-v35/stress-audit/final/`. The final 52-member manifest
SHA-256 is `05277c444021c65bd3790a2027018e47f0e8a9b4aee69051e12717d131413605`.

No unresolved failure remains in this bounded stress suite. The distinct
limitations above remain; this result does not approve unseen source changes,
the separate joint convergence matrix, full-app checks, or a deployed browser.
