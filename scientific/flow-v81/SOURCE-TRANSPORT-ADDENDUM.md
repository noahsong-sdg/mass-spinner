# Additional source-derived transport sensitivity, before prediction

The original §4.7 supplies inferred midplane collision endpoints, not a measured
2D field: sigma_parallel1070→950 S/m, beta_e100→38, beta_i.94→.18 between
r0 and.05 m. Retain two additional variants with BOTH linear and quadratic
interpolation of those inputs, then hold constant to.06 m and through z.
Use the matching nominal thermal interpolation for viscosity. At leading neutral
mass fraction1, s=beta_e*beta_i and beta_eff²=s+beta_e²/(1+s); do not replace
effective Hall parameter by beta_e or drop ion slip. No endpoint is adjusted.

First predict current at the source's absolute conductivity (normalization1070
S/m) and18.5 V. Also report an explicitly electrically conditioned variant:
fix these SHAPES and find conductivity normalization giving100 A, as in V79.
Report the gain relative to1070 and the unconditioned current. Changing that
normalization while holding collision parameters is not a self-consistent
microscopic closure; a gain different from1 must not be hidden as validation.
Retain all refinements and all16.5/18.5/20.5 V alternatives after conditioning.

These two source-collision variants supplement, and do not replace or select
among, all24 thermal-profile/uniform-beta variants. No measured rotation enters
either the property construction or electrical normalization. The weak-ionized
mass-fraction approximation and all interpolation/axial continuations remain
conditional. The source's reported approximately12–14 effective-beta range and
5.7→24 S/m Hall conductivity are rounded consistency checks, not fit targets.
