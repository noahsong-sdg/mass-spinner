# v73 independent physics and scope review

Verdict: the proposed research-only axisymmetric torsional diffusion equation is physically consistent **under its stated restrictions**. This is a review of the proposed equation and verification plan, not a claim that an implementation passed. No project code was executed by this reviewer.

## Primary-source connection

[Wijnakker and Granneman1980](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf), §4.1,p888,Eq1 retains radial and axial viscous derivatives of azimuthal velocity in a steady one-fluid model. Their subsequent neglect of the axial term near the midplane is an approximation, not an identity. [Wijnakker et al.1979](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access), p675,Eq3b independently includes axial viscous transport; p677 discusses secondary circulation that this restricted extension still omits.

Those sources support testing axial viscous transport. They do not establish that torsion alone reproduces the experimental current distribution, neutral/ion slip, pressure discrepancy, or temperature evolution. The 1980 velocity scaling is normalized to measured argon speed (§4.1,p889); reproducing that normalized scaling is not independent absolute-speed validation.

## Independent derivation and geometry check

Let vθ=rΩ, with axisymmetry, no radial/axial velocity, fixed prescribed densityρ, and scalar Newtonian viscosityμ. Multiplication of the azimuthal momentum equation by r gives

\[
\rho r^2\partial_t\Omega
=\frac1r\partial_r(\mu r^3\partial_r\Omega)
+\partial_z(\mu r^2\partial_z\Omega)+\tau,
\qquad \tau=r f_\theta.
\]

Thus a cylindrical finite-volume diffusion operator with coefficientμr² is correct. This is not ordinary scalar diffusion of vθ. In the constantμ steady limit, division by r recovers the radial vector-Laplacian plus ∂²zvθ in the source equations. If electromagnetic forcing is later supplied, define its sign using r(J×B)θ; for outward Jr and positive Bz, this equals−rJrBz.

For cylindrical measure dV=2πrdrdz, each annulus has

\[
\langle r^2\rangle=\frac{r_L^2+r_R^2}{2},\quad
M_i=\int_{V_i}\rho r^2dV.
\]

Use this annular average for capacity and axial-face r², and literal radial-face r² for radial flux. Restore2π consistently in all physical ledgers if the mesh omits that common factor. This averaging is exact for annularly constantρ/μ; with radially varying coefficients the required averages are ofρr² andμr² together, not products of separately averaged fields. At r=0 impose regular finiteΩ with ∂rΩ=0; Ω=0 would incorrectly suppress a rotating axis.

[FiPy4.0.3 documentation](https://pages.nist.gov/fipy/en/stable/FAQ.html) distinguishes cell-based transient coefficients and face-based diffusion coefficients. Supply geometric face coefficients explicitly; implicit interpolation is not evidence that their annular integrals are correct.

## Required verification cases

1. **Manufactured steady solution.** For Ω=A(1−r²/R²)sin(kz), k=π/L, with stationary outer/end walls, use the independently derived torque density

   \[
   \tau=\mu A r^2[8/R^2+k^2(1-r^2/R^2)]\sin(kz).
   \]

   Integrate it analytically over each cell: radial primitive2r⁴/R²+k²(r⁴/4−r⁶/(6R²)), multiplied by2πμA and the exact axial integral ofsin(kz). Do not manufacture the RHS from the same discrete diffusion matrix being tested. Expect refinement toward the continuous solution, not exact finite-grid equality. Refine r and z independently as well as jointly.

2. **Stress-free decay.** With constantμ/ρ, Ω=Ω₀+Acos(πz/L)exp[−(μ/ρ)(π/L)²t] is radially uniform and has zero shear on every boundary. Choose nonzeroΩ₀ for a nonzero angular-momentum reference. Check axial mode amplitude/shape, conservation of angular momentum, and decay towardΩ₀. Separate spatial error from backward-Euler timestep error; a stable coarse step is not temporally accurate.

3. **Rigid rotation.** ConstantΩ must remain constant with stress-free boundaries or co-rotating walls, for arbitrary fixed positive density and nonnegative viscosity. Compare total inertia to its analytic cylindrical integral, preventing compensating capacity/coefficient errors from hiding in a decay rate. Nonzero rigid rotation is not invariant with stationary no-slip walls.

4. **Torque and work.** Test both driven and unforced cases, including a rotating wall. Use the assembled face conductances/fluxes, independently summed with consistent orientation, for the angular-momentum and energy ledgers. A stationary wall can remove angular momentum while doing zero mechanical work; its shear still dissipates fluid kinetic energy.

## Energy ledger and limits

For the continuum operator,

\[
L_z=\int\rho r^2\Omega dV,\quad E=\tfrac12\int\rho r^2\Omega^2dV,
\quad D=\int\mu r^2[(\partial_r\Omega)^2+(\partial_z\Omega)^2]dV.
\]

Its energy balance is dE/dt=Pbody+ΣΩwallTwall−D. Twall is torque exerted **on the fluid**. Backward Euler adds a distinct nonnegative numerical loss per step, ½ΣMi(Ωnew−Ωold)². The discrete ledger must include that term; do not label it physical viscous heat. Boundary conductance dissipation must also be counted when Dirichlet wall and cell values differ.

The justified claim after passing these gates is **verified fixed-density torsional transport**, not full Navier–Stokes, coupled thermal evolution, or experimental validation. No meridional advection, continuity/compression, evolved density, species momentum, electromagnetic closure, anisotropic plasma stress, or thermal feedback is solved. Evolvingρ would require the conservative time derivative∂t(ρr²Ω), with compatible mass transport. Prescribedμ cannot validate temperature-dependent transport. These exclusions must survive any later live integration; they are domain limits, not optional disclaimers.
