# v72 independent source admission: Wijnakker 1979

Status: **candidate experiment, not a matched validation result**. Read-only source and operator review; no project code executed and no live changes made.

Primary source: Wijnakker, Granneman and Kistemaker, *A Study of a Weakly Ionized Rotating Plasma*, Z. Naturforsch. 34a,672–690 (1979), [DOI / publisher PDF](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access). Checked publisher-indexed primary text and figure captions through web search. Direct PDF opening exceeded the browser parser's 16,446,932-byte limit. No local PDF byte recovery, hash, figure digitization or independent visual reading is claimed here; indexed plot descriptions are not admitted numerical data.

## Verified source facts

- §2.1,p673: radius6cm; cathodes48cm apart; anodes14cm apart; tantalum cathode bore radius0.4cm. Most measurements are midplane. Filling pressure1Torr is maintained **behind cathodes**.
- §2.2,p673: pressure-scanned Fabry–Perot; Doppler shift/width; polarization filter suppresses Zeeman broadening.
- Table1,p678, diffuse0.13T/100A/1Torr:

| Quantity | r=0 | r=5cm |
|---|---:|---:|
| Heavy temperature,K |5950±1300|1800±400|
| Ion density,10¹⁸m⁻³|8±2|22±2|
| Neutral density,10²⁰m⁻³|4.3±1.0|45±6|

  Neutral density assumes central pressure0.4Torr. Maximum ion/neutral speeds750±75/700±100m/s; corrected arc voltage18.5±2V.
- Fig6/§4.1,p679:4702Å neutral/4806Å ion brightness; **no Abel transformation**.
- Fig7/§4.2,pp679–680: center ion Doppler halfwidth; corrected wall thermocouple; interior temperature curve interpolated. Off-axis temperature errors can reach factor two.
- Fig8,p680: density reduction uses Fig7 temperature.
- Fig9/§4.5,p681: neutral/ion peaks near3.5/2cm; line-integration velocity error estimated≤20%.
- pp682–683: viscosity1.14×10⁻⁴Pa·s at2900K; Hall values3/9 inferred using corrected voltage and alternative electron temperatures. Fig11 potential curves normalized at r=5cm.

## Interpretation and independence audit

The root cause of a false match would be **observable mismatch plus reused inferred inputs**. In plain terms, the experiment measures emitted light along a whole chord, while our solver predicts local material properties. Supplying an apparent brightness curve as local emissivity, or treating interpolated temperature as independent measurements everywhere, would silently change the question being tested.

`scientific/diagnostic-v71/chord.py` computes optically thin spectral moments. Its exact chord weights are appropriate for prescribed local emissivity, but do not establish that an experimental peak shift or halfwidth equals a first or second moment. A non-Gaussian line mixture generally has different variance and halfwidth temperatures. Symmetric rotation gives zero rotational LOS velocity on the central chord; its width still averages thermal emission along that chord and is not automatically the local axial temperature.

Treat the voltage as an independent observable only when it was not used to infer the Hall coefficient in the tested calculation. The historical Hall alternatives are calibration/closure scenarios, not two independently measured coefficients. Likewise Fig8 and Table1 neutral densities cannot independently validate an imposed Fig7 temperature profile. A radius-independent viscosity inferred from an average temperature is a model choice, not a measured spatial transport map.

Separate ion and neutral observables throughout. Different apparent peak radii already challenge a common-velocity closure; different emissivity weighting can also produce apparent differences, so this alone does not isolate local slip. Exclude contracted-mode data from any diffuse one-fluid acceptance claim. Keep the 1979 one-Torr and 1980 three-Torr experiments separate.

## Missing before quantitative admission

1. Recover and inspect source pixels; separately digitize measured symbols/error bars and theoretical curves. Do not admit automated indexed plot coordinates. Preserve axis calibration and extraction uncertainty.
2. Recover the actual Doppler-shift estimator, spectral halfwidth convention, instrumental profile/finesse and correction, aperture/LOS geometry, and uncertainty definitions/correlations. These were not established by inspected source passages. Reference19,p689 identifies the cited Kress calculation as private communication; its quoted bias estimate is not a recoverable published diagnostic algorithm.
3. Establish optical thinness/self-absorption and emitter-specific local emissivity, or carry independently justified bounds. Absence of an opacity statement in inspected passages is **not** evidence of negligible opacity.
4. Constrain current closure and axial boundaries without fitting the velocity curve. An electrode-separated axial device cannot be replaced by an arbitrary radial-current annulus and called the same apparatus. Midplane-only diagnostics do not constrain the full axial solution.

## Smallest honest next test

Use the diffuse0.13T/100A case as a **conditional, held-out neutral Doppler-profile comparison**, with the ion profile retained as a separate diagnostic. Freeze geometry and independently constrained electrical/transport inputs before examining the residual. Digitize Fig6 brightness as a chord observable; if reconstructing emissivity, forward-project the reconstruction back onto that brightness with uncertainty. Apply the resulting diagnostic to independently predicted rotation and compare Fig9 measured symbols, not its theoretical curves.

Until the estimator and optical assumptions are resolved, v71 can test numerical chord integration and demonstrate projection sensitivity, but cannot certify agreement with this Fabry–Perot reduction. Do not turn source bias estimates into free multiplicative corrections chosen for agreement. Report statistical, extraction, diagnostic and model uncertainties separately; no ≤20% first-order qualification is justified by the evidence admitted here.
