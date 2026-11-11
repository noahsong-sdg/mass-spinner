# Independent v34 domain-witness review

Status: **preparation only; no v34 outcome read, case selected, or physical trajectory executed by this reviewer.** No acceptance gate or production source changes. The later actual-witness verdict remains pending the coordinator's explicit release.

## Evidence and protocol checked

The producer's immutable `scientific/transport-v34/domain-witness-preparation/SHA256SUMS` hashes to `e65251d454fc669dd3c19be70a1dc12747c70e3828dcffaaba6a1cdee37b02f5`; all 21 listed files match. Every one of the 101 archived runtime inputs also matches `witness-runtime-sha256.json`. Reviewed `PROTOCOL.md`, `protocol.json`, selection and run wrappers, driver, passive patch, analyzer and synthetic tests. This is source/protocol evidence; it does not assert the future replay is physically unchanged.

The prospective selection rule waits for the entire unique 30-case terminal catalog and completed raw review, then chooses the largest finite saved **observed** encounter proxy at or above the unchanged 0.1 threshold. Ties use level lexicographic order followed by numeric seed. No finite eligible case means no substitute witness. An explicit reference-hash-bound coordinator release is required for the single full200µs replay, capped at 1,200s. Its full SeedRun must be deeply equal to the selected reference after removing **only `sourceHash` and `durationMs`**. New/future physical keys are not exempt. A timeout, failure, or mismatch remains a negative result. These checks are necessary before any actual-cell arithmetic can qualify the capture.

The passive adapter appends copied numeric moments, resolved warning-cell inputs and annular faces; it introduces no draw or physical update. Pinned `doublewell-dynamics.ts` lines202–208 call `cylindricalVelocity` separately for each ion before the regime inspector; `axisymmetric-collisions.ts` lines19–22 implement an orthonormal `(r,theta,z)` velocity transform. Captures store these already transformed velocities plus positions. They do **not** store the original Cartesian velocities. Actual captured-cell arithmetic can independently reconstruct the cylindrical moments, but cannot independently rederive the original Cartesian-to-cylindrical transform. That seam is supported separately by source review and a rigid-rotation synthetic check. No instrumentation redesign is warranted without an observed frame defect.

## Independent arithmetic to apply after release

`scientific/transport-v34/domain-independent-review/independent_math.py` imports no production or producer analyzer code. It uses 80-digit Decimal arithmetic, a high-precision pi constant, direct finite-set pair sums and the same declared SI constants. All numerical comparisons use the predeclared 2×10⁻¹³ reconstruction tolerance; cancellation scales for means/drift and 10⁻¹²m face slack match the producer protocol. These are arithmetic tolerances, not physical gate changes. Direct enumeration and leave-one-out are capped at 128 captured representatives.

For a species with `n` equal-weight markers, mean `u` and `S=sum|v-u|²`:

- `T = m S / [3(n−1)e]` is the Bessel-corrected scalar temperature in eV.
- Same-species distinct-pair mean `g² = 2S/(n−1)` exactly, without isotropy or IID assumptions. The current `6eT/m` already equals this; multiplying by another `n/(n−1)` is incorrect.
- Cross-species empirical Cartesian-product mean is `S_a/n_a + S_b/n_b + |u_a−u_b|²`.
- The diagnostic plug-in is `S_a/(n_a−1) + S_b/(n_b−1) + |u_a−u_b|²`; its difference from that empirical product is positive `S_a/[n_a(n_a−1)] + S_b/[n_b(n_b−1)]`. This is a distinction between estimands, not evidence that one can silently substitute the empirical product into the frozen gate. The IID continuum interpretation additionally depends on independent sampling, which evolved collisions do not guarantee.

Annular volume is `pi(r_hi²−r_lo²)(z_hi−z_lo)`. Marker weight is declared initial density times initial loading volume divided by the initial total marker count; for the frozen two-species runs that count is `2*particlesPerSpecies`. Local `n_i*volume = N_cell*weight` must match. The equilibrium source volume uses the full cylinder; a pulse uses source radius and pulse axial-length fraction. Current captures retain positions for face-membership checks. Equal weights are an assumption of this diagnostic; an unequal-weight extension needs new moments and pairing analysis.

The charge closure is `n_e=n_i sum(f_s Z_s)`. Electron-only screening gives `lambda_e²=epsilon0*T_e[eV]/(n_e e)`. For each moment-estimated species pair, `mu=(1/m_a+1/m_b)^−1`, `b90=Z_a Z_b e²/(4pi epsilon0 mu g²)`, quantum cutoff `hbar/(2mu g)`, and `omega=max(Z_a/m_a,Z_b/m_b)e|B|`. The stored encounter proxy is `eta=omega*lambda_e/g`, and log estimate is `ln(lambda_e/max(b90,b_quantum))`. Units are m, s⁻¹, m/s and dimensionless as appropriate. Coupling uses total-ion spacing `(3/(4pi n_i))^(1/3)` and `Z_s² e/(4pi epsilon0 a T_s[eV])`. Cold species make the thermal coupling/encounter estimate undefined; sparse present species remain unresolved.

## Interpretation boundaries

The proxy uses a total relative-RMS speed and a maximum single-species gyrofrequency. It is a conservative diagnostic convention, not a derived magnetized two-species collision operator or a universal transition at0.1. Parallel/perpendicular anisotropy, low-speed tails and unequal-charge/mass center-of-mass coupling remain unresolved by one scalar. The primary magnetized-collision analysis includes Lorentz forces during microscopic encounters; replacing one screening length or Coulomb logarithm does not provide that model. [Jose and Baalrud,2020](https://arxiv.org/pdf/2008.06080) and [Baalrud and Daligault,2017](https://arxiv.org/abs/1709.05420) motivate scale separation, not this project's numerical threshold.

Electron-only Debye length assumes a prescribed thermal electron response and stationary-ion screening convention. This is explicit in the [PlasmaPy Debye-length implementation](https://docs.plasmapy.org/en/stable/_modules/plasmapy/formulary/lengths.html). Static all-species inverse screening adds `e/epsilon0*n_i*sum(f_s Z_s²/T_s)` to the electron contribution. It is an equilibrium/static Maxwellian sensitivity, not an automatically applicable dynamic response in a drifting, anisotropic, magnetized, evolving mixture. A smaller sensitivity proxy does not waive the actual electron-screened gate.

Leave-one-out holds **physical density and species fractions fixed**, recomputing only species moments after deleting a marker. It measures algebraic sensitivity. An original four-marker species becomes three, below the actual resolved-state requirement; therefore this is not a new supported cell, a confidence interval, an independent replicate or evidence of continuum validity. Within-bin shear and correlated finite-marker evolution require separate particle/spatial/time studies. A new selected witness must establish its own occupancies and sensitivities; the earlier four-ion explanation is not assumed.

Only resolved local warning cells are captured. A saved snapshot maximum can be attributed to those captured cells after reconstruction, but unresolved cells, unobserved times, individual binary encounters and other runs remain unqualified. Trapezoid exposure over saved snapshots is a sampled-history summary, not a continuous-time failure integral or prevalence estimate. Selecting the largest observed crossing intentionally gives a diagnostic worst case and introduces selection; it does not estimate a population distribution.

## Isolated checks

Dedicated stage `/tmp/mass-spinner-domain-independent-v34-preparation`, Apple safe-dev guest `safe-dev-a4df9a647b1c48d8`; no project dependencies, online execution, host mounts or physical simulations. Exported work before both replacement syncs. Exact final command:

```
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-domain-independent-v34-preparation run -- python3 run_tests.py
```

Result: **10/10 tests passed**,0.007s unittest duration. The checks cover exact Bessel/distinct-pair algebra; cross-species target distinction; anisotropic drift and unequal charges/masses; Galilean invariance; density/B screening scalings; annular volume/inventory; rigid-rotation frame separation; cold/sparse boundaries; fixed-density/fraction LOO; a fully synthetic capture reconstruction including LOO; corruption rejection; and strict rejection of an additional physical SeedRun field. These synthetic checks do not read the cohort. A final actual-witness review will receive a separate evidence seal after coordinator release.

No production or preparation-protocol blocker was established by this review. This verdict is limited to the checked frozen preparation and independent synthetic arithmetic.
