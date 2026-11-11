# Prescribed-Gaussian current-carrying equilibrium

Implemented 6 November 2026 as an independently named II C closure. This verifies specified radial equations, not an operating vacuum-arc machine. The existing common-corotation equilibrium is retained.

## Problem, cause and choice

The earlier solver assumes electrons and ions share common rigid rotation. Combined with isothermal pressure and quasineutrality, that produces outward-growing total density. It cannot also describe the centrally peaked Gaussian column used by the vacuum-arc literature. In simple terms, the required supporting current was excluded by the old physical assumptions.

The new solver prescribes the total density and derives the electron drift/current needed by radial force balance. This is preferable to multiplying the old solution by a Gaussian: multiplication would violate its electron and ion momentum equations. The density width, rotation and field remain inputs; there is no fitted source model or inferred throughput.

Primary source checked: Hole & Simpson, *Performance of a vacuum arc centrifuge with a nonuniform magnetic field* (1997), [DOI 10.1063/1.872246](https://doi.org/10.1063/1.872246), [author PDF](https://maths.anu.edu.au/files/U4348025XPUB31.pdf). The full-text equations 7–10 prescribe Gaussian density, derive the potential and require azimuthal current. Its low-self-field approximation is explicit near equations 5. The app extends the equal-charge radial relation to a mixture under the assumptions below; it does not reconstruct the paper's axial-field perturbation or measured apparatus.

## Equations and API

`gaussianCentrifuge(config)` accepts the usual radius, rotation, temperatures, central species fractions and radial bins, plus `magneticT`, `densityWidthM` and `axisDensityM3`. Ion charges must be equal positive integers; unequal charges fail explicitly. `B` may be signed but cannot be zero. Temperatures are in eV, masses are converted to kg, and all other values are SI.

For `N(r)=N0 exp(-r²/R²)`, `αs=ms Ω²r²/(2eTi)` and normalized central fractions `fs`, calculate

```
S(r) = Σ fs exp(αs)
ns/N0 = exp(-r²/R²) fs exp(αs)/S
ne/N0 = Z exp(-r²/R²)
ψ = (Ti/Z)[ln S + r²/R²]
φ = ψ + ΩBr²/2
φ′ = ΩBr + mbar Ω²r/(Ze) + 2Ti r/(Z R²)
viθ = Ωr
veθ = φ′/B + 2Te r/(B R²)
Jθ = ZeN(viθ-veθ)
```

`S` is evaluated with log-sum-exp. This recovers the exact equal-charge mass-difference enrichment and simultaneously fixes the total density. `effectivePotentialV` remains ψ for compatibility; laboratory φ is a separate output. The electron density is obtained from quasineutrality, not from the old electron-corotation Boltzmann formula.

The returned `CentrifugeResult` is compatible with cylindrical inventory diagnostics and generic binary bulk-composition inversion. Additional `gaussianProfiles` contain absolute total density, laboratory potential, electric field, ion/electron azimuthal speed, current density, estimated magnetic perturbation and the neglected electron-inertia ratio.

## Applicability outputs and limits

The current implies `dBz/dr=-μ0Jθ`. Trapezoidal integration estimates `Bz(r)-Bz(0)` and reports its maximum magnitude relative to imposed B. This estimate is not fed back into the density or force balance; appreciable perturbation means the imposed-field approximation needs reconsideration. No universal threshold is asserted.

The electron-inertia ratio compares `me veθ²/r` with the sum of absolute retained electron pressure, electric and magnetic force terms. Its continuous axis limit is evaluated without division by zero. A nonzero residual is the omitted physics, while `maxRelativeForceBalanceResidual` verifies the explicitly massless-electron model. These are different quantities; a tiny numerical residual does not establish a small physical approximation error.

At zero ion rotation a Gaussian pressure gradient still requires electron drift and azimuthal current. Setting both species' rotation to zero would contradict the prescribed-density force balance. Rotation reversal leaves the density and required current unchanged but changes laboratory potential and electron drift.

Absolute density N0 makes the current and self-field estimate meaningful. The previous normalized common-corotation benchmark has no absolute density input. Fixing bulk composition in that model fixes a ratio, not absolute particle inventory. For this Gaussian model, fixed R, radius and N0 fix the total inventory, and fixed bulk composition then fixes each species' inventory.

The model omits axial flow/evolution, source torque, circuit current supply, end sheaths, collisional dynamics, instabilities, energy balance and feedback from induced magnetic field or electron inertia. It cannot predict R, power, relaxation time or product yield. It is not a calibrated VAC simulator.

## Verification

`./node_modules/.bin/tsx --test tests/gaussian-centrifuge.test.ts` exercises exact Gaussian density and equal-charge enrichment; independent finite-difference ion/electron radial force balance; Ω=0; equal/absent species; analytic single-species potential and Ampère integral with second-order radial convergence; absolute-density current/field scaling; cylindrical inventory convergence; signed B and Ω reversal; explicit invalid domains; and steep-mixture binary bulk inversion.

The parent integration owns whole-project build/typecheck and public runtime verification. No browser or deployed-origin access was attempted by this subagent.
