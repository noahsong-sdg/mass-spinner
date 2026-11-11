# v44 independent partially ionized centrifuge derivation

9 November 2026. Research/derivation review, not numerical or experimental validation. This reviewer read the user working rules and safe-dev README; performed source/document reads and primary-source browsing; ran no project code, tests, package installation, VM operation or deployment; and made no product edits. Equations below are a proposed reduced closure, not Marathon's proprietary simulator or a recovered device specification.

## Evidence and appropriate claim

Marathon's [published patent WO2026064411A1](https://patents.google.com/patent/WO2026064411A1/en), §§13–29, describes driven ions entraining a neutral gas, low heavy-particle temperature, selective outlets, cascades, surface-temperature control, optional hydrogen membranes, seeding and rotation-profile optimization. These are disclosed design ideas, not supplied operating coefficients or independently validated performance. The newer WO2026136752A1/A2 full-text pages were inaccessible through this review's web tool; no conclusion here depends on their contents. The [company fuel-cycle page](https://www.marathonfusion.com/fusion-energy/) connects lithium enrichment with breeding and describes rapid fuel recycling. Its commissioning/enrichment milestones are company statements, not an open calibration dataset. The [DOE project description](https://www.energy.gov/nepa/articles/cx-270890-marathon-fusion-inc-partial-ionization-centrifuge-enabling-differential) identifies testing/model comparison as project work; it does not provide numerical validation data for this app.

The existing fully ionized equilibrium benchmark cannot acquire this identity by changing its label. A useful dedicated playground must separate (1) an ion–neutral angular-momentum/heat model, (2) an isothermal centrifugal **equilibrium inventory reference**, (3) explicitly ideal stage/pumping/fuel-cycle balances, and (4) unresolved device closures. These can be linked visually without claiming a solved discharge or an actual continuous separator.

## Two-rotor reduction and invariant

Assume a rigid ion rotor and a rigid neutral rotor, with fixed positive inertias \(I_i,I_n\), fixed ionization fraction, no charge-state kinetics, and constant coefficients during a run. A uniform annulus of mass \(M\), inner radius \(a\), outer radius \(R\), has \(I_0=M(R^2+a^2)/2\). Using \(I_i=xI_0\), \(I_n=(1-x)I_0\) assumes the same reference spatial shape and isotope composition in both populations. If the separate equilibrium density plot changes its shape, this inertia remains a **lumped reference**, not a self-consistent recomputation from that density.

Let \(\Gamma\ge0\) be the ion–neutral angular friction coefficient (kg m²/s), \(d_i,d_n\ge0\) external angular damping coefficients, \(\tau\) the applied electromagnetic torque, and \(\Delta\Omega=\Omega_i-\Omega_n\):

\[
I_i\dot\Omega_i=\tau-\Gamma\Delta\Omega-d_i\Omega_i,\qquad
I_n\dot\Omega_n=\Gamma\Delta\Omega-d_n\Omega_n.
\]

The equal-and-opposite friction torque is required. If an input is an ion momentum-relaxation frequency, use \(\Gamma=I_i\nu_{in}\), and consequently \(\nu_{ni}=\Gamma/I_n\). Applying the same frequency to both unequal inertias breaks angular momentum. General fluid momentum/energy moments are documented in [Fitzpatrick's fluid derivation](https://farside.ph.utexas.edu/teaching/plasma1/Fusionhtml/node23.html); the rigid-rotor truncation here is this review's approximation.

The exact ledger is

\[
L=I_i\Omega_i+I_n\Omega_n,\quad
\dot L=\tau-d_i\Omega_i-d_n\Omega_n,
\]
\[
K=\tfrac12I_i\Omega_i^2+\tfrac12I_n\Omega_n^2,\quad
\dot K=\tau\Omega_i-\underbrace{\Gamma(\Delta\Omega)^2}_{Q_{in}}-
\underbrace{d_i\Omega_i^2+d_n\Omega_n^2}_{P_{external}}.
\]

Ion–neutral slip irreversibly heats the gas at nonnegative \(Q_{in}\). External damping removes mechanical energy, but its destination must be named: wall heat, exported mechanical energy, or a declared reservoir. It must not silently all become gas heat.

For an explicitly idealized uniform-axial-field annulus carrying the same radial current \(I_r\) through every cylindrical radius, \(J_r=I_r/(2\pi r\ell)\), integrating \(\mathbf J\times\mathbf B\) gives signed torque
\(\tau=-I_rB_z(R^2-a^2)/2\). The minus follows \(\hat r\times\hat z=-\hat\theta\). A positive drive-magnitude control may instead define its own positive rotation convention. This expression does not apply to arbitrary electrode/current distributions or to all alternative drive methods. It supplies mechanical torque; it does **not** infer discharge voltage or conductivity.

If a resistive-load scenario is included, electrical power must distinguish mechanical \(\tau\Omega_i\) from Joule \(I_r^2\mathcal R\). Resistance, auxiliary electron heating, and the fraction of heat reaching heavy particles are assumptions unless supported by a discharge solution/data. Electron temperature alone cannot be mapped to a universal resistance improvement factor.

## Stable time integration without hidden heating

The system is a dissipative linear two-by-two problem. A general scientific integrator is unnecessary for this bounded calculation. Three defensible choices, with different bookkeeping:

1. **Exact affine matrix exponential** with independently checked integrals for work and each heat/loss channel. This is the highest temporal fidelity for fixed coefficients. Near coincident/zero eigenvalues need stable functions, and singular undamped limits need explicit handling rather than \(A^{-1}(e^{Ah}-I)\) blindly.
2. **Exact physical subflows with symmetric splitting**. Each subflow has an exact invariant ledger, is nonoscillatory for dissipative coupling, and avoids assigning solver residual to physical heat. This is a small, readable second-order method; demonstrate convergence of the composed driven solution.
3. **Backward Euler** is stable/positivity preserving, but introduces a known extra term. Multiplying each discrete momentum equation by the new angular velocity gives numerical energy loss \(D_{num}=\tfrac12\sum_sI_s(\Omega_s^{k+1}-\Omega_s^k)^2\). Report this separately and refine it below an explicit budget. Do not relabel it collision heat. Implicit midpoint has an exact quadratic midpoint ledger but can alternate sign for unresolved stiff damping, so unconditional stability alone does not establish appropriate dynamics.

Exact subflows for option 2:

- Constant torque over \(h\): \(\Omega_i' = \Omega_i+\tau h/I_i\), neutral unchanged. Signed drive work is exactly the change in ion rotational energy, equivalently \(\tau h(\Omega_i+\Omega_i')/2\).
- Friction: \(I_r=I_iI_n/(I_i+I_n)\), \(\lambda=\Gamma(1/I_i+1/I_n)\), \(\bar\Omega=L/(I_i+I_n)\), \(\Delta\Omega'=\Delta\Omega e^{-\lambda h}\). Then \(\Omega_i'=\bar\Omega+I_n\Delta\Omega'/(I_i+I_n)\), \(\Omega_n'=\bar\Omega-I_i\Delta\Omega'/(I_i+I_n)\). Heat is \(\tfrac12 I_r\Delta\Omega^2[-\operatorname{expm1}(-2\lambda h)]\), nonnegative and exactly equal to lost rotational energy.
- External damping: \(\Omega_s'=\Omega_s e^{-d_sh/I_s}\); external energy is \(\tfrac12 I_s\Omega_s^2[-\operatorname{expm1}(-2d_sh/I_s)]\).

A symmetric sequence can be half drive, half external damping, full friction, half external damping, half drive. Every ledger closes at each substep; final trajectories still need timestep refinement because those subflows do not commute. Small coupling limits should use `expm1`; no clipping of a negative numerical energy difference should conceal a sign error.

An independent closed-form reference can exploit the symmetric inertia-scaled system. Set \(D=\operatorname{diag}(I_i,I_n)\), \(z=D^{1/2}\Omega\),
\[
S=D^{-1/2}\begin{pmatrix}\Gamma+d_i&-\Gamma\\-\Gamma&\Gamma+d_n\end{pmatrix}D^{-1/2},\qquad
f=D^{-1/2}(\tau,0)^T.
\]
Then \(\dot z=-Sz+f\). With nonnegative eigenvalues \(\lambda_\pm=[\operatorname{tr}S\pm\sqrt{(S_{11}-S_{22})^2+4S_{12}^2}]/2\) and orthogonal projectors \(P_\pm\),
\[
z(t)=\sum_{k=\pm}P_k[e^{-\lambda_kt}z(0)+\phi(\lambda_k,t)f],\quad
\phi(\lambda,t)=-\operatorname{expm1}(-\lambda t)/\lambda,\quad \phi(0,t)=t.
\]
For distinct eigenvalues, \(P_+=(S-\lambda_-\mathbf1)/(\lambda_+-\lambda_-)\), \(P_-=\mathbf1-P_+\). At equal eigenvalues the symmetric matrix is scalar and uses the scalar exponential directly. The small eigenvalue should be evaluated stably via determinant/larger eigenvalue when cancellation would matter; the zero-loss singular limit is legitimate. This independent reference does not reuse the production splitting loop and admits the continuously accelerating undamped common mode.

For temperature feedback, a separate declared heavy-particle heat capacity may receive \(Q_{in}\) and an assumed heavy-particle heat load, with a nonnegative conductance to a prescribed wall temperature. Exact cooling at constant source or a checked positive implicit heat solve is appropriate. A single \(T_h\) means thermal equilibration within the lumped heavy population is assumed; it does not solve \(T_e\), ionization, vapor transport, radiation or phase changes. Counterfactual fixed-temperature equilibrium plots are legitimate when labeled as such.

## Residence is not an interchangeable drag term

The safest small scope is to use residence as a comparison time and implement pumping/cascade as separate ideal balances. If instead steady well-mixed throughflow is added, its energy accounting is subtle. At fixed total inertia, zero-angular-momentum replacement yields
\(\dot\Omega_s|_{flow}=-\Omega_s/t_{res}\), hence \(\dot K_s=-2K_s/t_{res}\). Only \(K_s/t_{res}\) is carried away by the exiting gas. The other \(K_s/t_{res}\) is mixing dissipation from admitting stationary gas into a rotating well-mixed population. Omitting this term or calling all \(2K/t_{res}\) exported kinetic energy gives the wrong thermal ledger. Thermal enthalpy exchange also requires a declared equation of state and inlet temperature; a general open-flow energy balance cannot use a closed-volume heat capacity by accident.

This is why an arbitrary \(1-\exp[-t_{res}/t_D]\) multiplier on separation is inappropriate. A guessed interpolation is not a transport calculation. A displayed \(R^2/D\) is only a dimensional diffusion scale with prescribed \(D\), not an exact relaxation eigen-time or a calibrated extraction rate. Even \(t_{res}\gg R^2/D\) is at most a necessary-timescale heuristic; axial flow, shear, turbulent transport and wall chemistry may still preclude the assumed equilibrium.

## Centrifugal equilibrium and finite-volume cuts

Independently derive a neutral isothermal rigid-rotation reference from \(k_BT\,d\ln n_s/dr=m_s\Omega_n^2r\). Set
\[
y=\frac{r^2-a^2}{R^2-a^2},\qquad
\beta_s=\frac{m_s\Omega_n^2(R^2-a^2)}{2k_BT}.
\]
The cylindrical volume measure is uniform in \(y\). For an input **bulk** number fraction \(f_s\), use normalized species densities per unit \(y\):
\[
p_s(y)=\frac{\beta_s e^{\beta_s(y-1)}}{1-e^{-\beta_s}},\qquad
\int_0^1p_s(y)\,dy=1.
\]
Thus local light fraction is \(f_Lp_L/[f_Lp_L+(1-f_L)p_H]\), not \(f_L e^{\beta_Ly}\) normalized only against the other species at the axis. The latter silently treats the supplied bulk abundance as an axis composition and violates the requested inventory.

At an inner cut \(y_c\), the retained fraction of species \(s\) is
\[
F_s(y_c)=\frac{e^{-\beta_s(1-y_c)}[1-e^{-\beta_sy_c}]}{1-e^{-\beta_s}},
\]
with continuous limits \(p_s=1\), \(F_s=y_c\) at \(\beta_s=0\). Use `expm1` for small arguments and the shown negative-exponent form for large \(\beta\); avoid overflowing \(e^{\beta}\). Handle exact cuts 0 and 1 explicitly.

For a binary mixture:
\[
\theta=f_LF_L+(1-f_L)F_H,\qquad
x_{L,in}=\frac{f_LF_L}{\theta},\qquad
x_{L,out}=\frac{f_L(1-F_L)}{1-\theta}.
\]
Light recovery into the inner region is \(F_L\), heavy recovery into the outer region is \(1-F_H\). Empty cuts have zero inventory and undefined purity, not a fabricated 0% or 100%. The species and total balances close exactly. The axial-to-wall isotope-odds reference has \(\ln\alpha_{axis/wall}=(\beta_H-\beta_L)\), but this is **not** the finite-cut product/tails factor, which must be computed from the two finite-volume compositions.

These are equilibrium **inventories**. Calling \(\theta\) a continuous flow cut or multiplying it by a feed rate additionally assumes how outlet sampling and transport populate those streams. If an ideal sampling scenario does that, show the assumption where the flow numbers are displayed. An evolving \(\Omega_n(t),T_h(t)\) can yield an instantaneous equilibrium reference; it does not evolve the actual isotope density distribution toward that reference.

## Pumping, cascades and fuel-cycle relationships

For the same ideal gas/isothermal reference, \(p(R)/p(a)\) is obtained from the sum of the species densities, not a single fictitious mean-mass exponential when composition changes appreciably. It is a radial pressure ratio, not a guaranteed outlet compression ratio, pumping speed, leak rate or conductance. Port geometry, gas viscosity/rarefaction, axial profiles, mass transfer and downstream boundaries remain missing.

An ideal sequential inner-stream cascade can use the above finite-cut sampler at each input abundance. With inlet particle rate \(F_j\), light fraction \(f_j\), stage cut \(\theta_j\), next-stage rate \(F_{j+1}=F_j\theta_j\), \(f_{j+1}=x_{L,in,j}\). Save each rejected leg \(W_j=F_j(1-\theta_j)\) and its composition. Then final product plus all rejected legs must conserve total and each isotope. This is an explicit ideal re-equilibration sampler. It is **not** the patent's internally recycled countercurrent cascade. That requires simultaneous interstage balances and specified transport/stage performance; an animated return pipe alone does not implement it.

For any assumed two-output stage factor \(\alpha\), stream compositions can instead be solved from \(f=\theta p+(1-\theta)w\) and \(\alpha=[p/(1-p)]/[w/(1-w)]\), with physical bounds. \(\alpha\) must be an assumed stage observable or derived finite-cut factor, not substituted with the axis/wall value.

Fuel recycling can teach two useful exact balances without pretending to simulate a reactor:

- At tritium burn fraction \(b\), a specified burn rate requires injection \(\dot m_{inj}=\dot m_{burn}/b\). Recovered exhaust is \(\eta(1-b)\dot m_{inj}\); required fresh supply is \([1-\eta(1-b)]\dot m_{inj}\). Recovery \(\eta\) is assumed or taken from an explicitly ideal sampler, not calibrated to Marathon.
- Processing inventory for a stationary single-pass loop is \(M_{loop}=\dot m_{processed}\tau_{loop}\). Choose the processed stream explicitly (e.g. exhausted fuel \((1-b)\dot m_{inj}\)); do not casually apply injection rate to all pieces of the plant. This is Little's-law bookkeeping, not a prediction of reactor tritium stockpile. Breeding, outages, decay and reserve margin are separate.

Li-6 enrichment can be linked conceptually to breeding; the playground must not infer TBR from Li-6 abundance alone. Neutron spectrum, blanket composition, coverage, losses and geometry matter, and the separate blanket reference cannot become a universal transfer function.

## CIV and design innovations: correct teaching boundary

The conventional scale is \(v_{CIV}=\sqrt{2E_{ion}/m}\). [NIST](https://physics.nist.gov/cgi-bin/Elements/elInfo.pl?context=frames&element=3) gives lithium's first ionization energy 5.391714996 eV; isotope masses must be separately defined. The [NASA critical-velocity experiment report](https://ntrs.nasa.gov/api/citations/19860021990/downloads/19860021990.pdf?attachment=true) frames the mechanism in terms of neutral/plasma relative motion. Therefore display the local slip comparison \(R|\Omega_i-\Omega_n|/v_{CIV}\), while identifying the patent's nominal rotation-speed comparison separately if desired. Do not clamp the solution to CIV, label crossing a universal instability threshold, or use it to predict ionization fraction. Magnetization, electron heating, species, geometry and kinetic conditions matter.

The point of the patent's localized drive/current-profile idea is reduced shear. Rigid-body rotation has \(r\,d\Omega/dr=0\), so its internal viscous shear heat vanishes. A two-rigid-rotor model may show ion–neutral slip heat but cannot claim to predict the full optimization of viscous current profiles. A separate kinematic shear comparison may evaluate
\(P_\mu=2\pi\ell\int_a^R\mu[r\,d\Omega(r)/dr]^2r\,dr\)
for explicitly prescribed profiles and viscosity. It must hold a named comparison quantity fixed (wall speed, angular momentum or kinetic energy); the comparison is ambiguous otherwise. This is a useful exact illustrative calculation, not an empirical friction fit.

Surface-temperature control, Li vapor feed/condensation, electron/heavy temperature separation, ionization seeding, membranes and alternative drives should be component inspectables with source-linked scope statements. Missing coefficient/data closures should remain visible as unresolved rather than represented by arbitrary universal efficiency sliders.

## Required implementation gates

1. **Torque/friction:** zero drive/loss conserves \(L\); relative rotation relaxes exponentially to the inertia-weighted mean; lost \(K\) equals slip heat. Large stiffness remains nonoscillatory. Zero coupling leaves neutrals unchanged. Sign reversal changes rotation signs but not centrifugal strength or dissipation.
2. **Driven solution:** convergence against the independent affine 2×2 analytic solution for unequal inertias and both damping rates, not just a copy of the chosen stepping algorithm. Joint refinement of steps and thermal feedback; declared error budget, finite outputs, nonnegative channel energies.
3. **Energy:** integrate drive work, gas heat, reservoir loss and \(K\); independently reconstruct the ledger. If BE is chosen, isolate the exact numerical-loss term. If throughflow is chosen, check its mixing plus kinetic-outflow decomposition.
4. **Equilibrium:** numerical quadrature of the profiles reproduces input bulk abundance; zero rotation/equal masses give no enrichment; rotation sign symmetry; beta→0 and large beta stable; radial cuts give monotone recovery and conserve species. Show all exact empty-purity boundaries honestly.
5. **Cascade:** per-stage and whole-network total/species closure, one-stage agreement, alpha=1/no-rotation control, feed→0/1 limits, product recovery decreases with repeated enrichment in the serial sampler, rejected-leg accounting retained. No silent claim of a countercurrent solution.
6. **Fuel:** b=1 gives no exhaust/recycling; eta=0 gives fresh demand equal injection; eta=1 gives fresh demand equal burn; loop inventory scales linearly with processed flow and delay. Invalid b=0 withheld, not silently divided by a tiny clamp.
7. **Scope:** no numerical result relabeled measured/predictive; no equilibrium inventory relabeled finite-time extraction; no CIV clipping; no temperature→conductivity or Li abundance→TBR rule without an explicit supported closure. Geometry materials/dimensions remain assumptions unless sourced.

No gates were executed by this reviewer. Root must attach the exact tested safe-dev snapshot and raw results before claiming implementation validation.

## Production source review and independent tests

Root subsequently supplied `src/fuel-centrifuge.ts`. This reviewer traced the actual implementation and wrote only `tests/fuel-centrifuge-independent-v44.test.ts` (12 tests). It was not executed by this reviewer. The implementation uses the exact from-rest two-by-two affine response, not the proposed splitting alternative. Its energy/angular readouts are instantaneous identities; it does not claim a cumulative integrated thermal ledger. Neutral drag is a declared sink with a required cooling-load scenario. The fixed-temperature and uniform-inertia assumptions are explicit.

The cascade is now an actual linear **countercurrent routing** calculation, with identical-stage probabilities assigned from equilibrium inventory cuts, independent species Thomas solves, feed location, both boundary exits, and total circulation. This resolves the mathematical routing-network issue described above; its routing probabilities remain assumptions about extraction rather than a solved multistage plasma flow. The pumping circuit is likewise an explicit equilibrium-pressure/conductance scenario without flow backreaction.

Independent regression coverage uses direct RK4 integration of the original ODE and cumulative drive work/slip heat/drag loss, not the production eigen/phi formula; an independently derived undamped common mode; direct Boltzmann quadrature with cylindrical measure; and a transient absorbing random walk rather than another tridiagonal solve. Additional cases cover stiff/zero/sign limits, finite-volume cuts/empty outlets, pure feeds, conditional pumping scaling/series limit, D–T processing inventory, invalid inputs and finite inputs with unrepresentable derived quantities.

Two source-derived defects were sent to root before execution:

1. The exported rotor helper's zero-coupling/zero-drag ballistic limit evaluates `slow=0/0` and produces NaN. The actual physical limit is uncoupled ion acceleration and stationary neutrals. The current public scenario requires positive neutral drag, so this is a helper/domain boundary rather than proof the default scenario fails. A dedicated zero-loss test now covers it.
2. Individually finite positive inputs can produce nonfinite derived powers/inertias. Examples include `conductivitySm=Number.MIN_VALUE` (infinite resistive power) and very large finite pressure, radius, pump speed or fusion power. A derived finite-state invariant is required before a result is returned/exported; input finiteness alone is insufficient. Tests require explicit rejection, preserving valid signed thermal-control loads and empty-stream null purity.

The current illustrative pure-lithium gas point at 500 K and 10 Pa also requires a phase-scope note. The published [Alcock vapor-pressure table](https://physics.nyu.edu/kentlab/How_to/ChemicalInfo/VaporPressure/Pressure.pdf) gives liquid lithium coefficients over the melting point to 1000 K; its equation predicts a much lower equilibrium vapor pressure at 500 K. This does not prove immediate condensation of a driven non-LTE gas with hotter surfaces. It establishes that surface temperatures, metastability, kinetics and vapor transport cannot be inferred from a gas-temperature slider or from signed liner heat alone. A saturation marker should use the surface temperature and valid data range; it must not silently hard-cap the gas pressure or predict a condensation lifetime.

Root owns isolated execution, exact snapshot receipts, implementation corrections and deployment. Until reopened raw test results arrive, the mathematical source trace is reviewed but these new implementation gates remain **unexecuted**.

### Revised pressure/domain/phase source review

Reopened root's corrected production source. The rotor helper now explicitly handles its zero-rate ballistic limit. The public scenario checks the complete result for nonfinite derived numbers before returning it; invalid inertias are rejected at the rotor boundary. This resolves both findings at the traced source level without concealing empty-stream null purity or valid negative thermal-control loads. Execution remains a separate gate.

Pressure is now explicitly the volume-mean **neutral** pressure. Thus \(N_n=p_nV/(k_BT_h)\), total heavy-particle number is \(N_n/(1-f_i)\), and the uniform neutral inertia remains fixed when prescribed ion fraction changes. \(I_i/I_n=f_i/(1-f_i)\) follows. Pumping turnover uses neutral number rather than total ion-plus-neutral number, giving \(t_{turn}Q=p_nV\). This is internally coherent with neutral equilibrium pressure and the declared conditional gas circuit; it still does not solve flow backreaction.

The lithium reference uses the freshly reopened [NIST WebBook phase-change table](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=4): Hicks1963 coefficients A=4.98831, B=7918.984, C=−9.52, log10 pressure in bar, T in kelvin, stated interval 298.14–1599.99 K. Production correctly converts bar to Pa, returns null outside that interval, evaluates the liner's saturation reference at liner temperature, and exposes gas-temperature equilibrium pressure separately. The ratio remains a phase diagnostic, not a condensation-rate calculation or hard gas-pressure cap.

The independent file now contains **14 tests**. Added pressure/inertia/turnover invariants and steady-state neutral-speed independence from prescribed ion fraction; NIST inverse-isobar unit/sign fixtures and fit boundaries; separate liner/gas references; non-lithium withholding; and negative cold-liner thermal-control load. These reproduce the published fit, not independent measured vapor-pressure calibration. No further physics source blocker was found in this bounded trace. No new test execution was performed by this reviewer.

### Final species-pumping and executed-evidence review

Independently traced the added species-resolved pumping path and its scenario test. For each species with nonzero inventory, the normalized equilibrium profile gives \(p_{w,s}/p_{a,s}=e^{\beta_s}\). With the stated common downstream speed \(S\) and upstream conductance \(C\),

\[
Q_s=S p_{w,s},\qquad p_{u,s}=p_{a,s}+Q_s/C,\qquad
S_{eff,s}=Q_s/p_{u,s}=\left(e^{-\beta_s}/S+1/C\right)^{-1}.
\]

Production implements this conditional circuit consistently. Partial axis/wall/upstream pressures and throughputs add to their total values. Heavier species have greater or equal effective inlet speed at the same prescribed neutral rotation; the heavy/light ratio is one without rotation and approaches one when both species become limited by the common conductance. A missing species has undefined effective speed/selectivity, represented by null. The outer-stream light fraction is \(Q_L/(Q_L+Q_H)\), rather than inner-cut inventory recovery. The scenario test exercises species sums, the conductance bound, pure feeds and the zero-drive ratio. UI labels distinguish pumping speed and outer outlet composition. These results do not establish membrane selectivity, species-independent real hardware conductance, finite-flow compression or separation at a fixed common upstream feed composition; the documented circuit assumption remains essential.

The DT inventory path remains independent: only specified fusion power, burn fraction and loop delay determine burn throughput and processing inventory. No species pumping speed or equilibrium cut is silently used as a tritium recovery efficiency or reactor feedback. Such feedback would require an explicitly closed fuel-loop composition, feed and recovery model.

Reopened root-owned safe-dev receipts, input manifests and raw logs:

- `scientific/fixes-v43/v44-physics-geometry-1.receipt.json` identifies source snapshot `8dfa124412bdf4877fded809de8a870a0149975454c3cb3285f5e300f12e6358`, verified before/after execution. Its raw log reports **23/23 passed**, zero failed/skipped: the independent 14-test physics file plus geometry tests.
- `scientific/fixes-v43/v44-focused-final.receipt.json` identifies later source snapshot `0215829e4ac8b4e09706f11ee47de31770660051b72f6e58f49946edd2ef8870`, verified before/after execution, with **46/46 passed**, zero failed/skipped. Its command includes independent physics, geometry, UI, scenario and worker-client files. Its manifest includes the new species-pumping scenario file and production source. Production `src/fuel-centrifuge.ts` is recorded as SHA256 `549f33d6af2e8124e71c85faf9d2b7f57b8ebeee4dd9c9ef326474739580676f`; the independent test file is unchanged between those receipts.

This reviewer executed no project code or VM operations. The reopened logs resolve the earlier pending **narrow implementation-test** gate for those exact snapshots; they do not constitute experimental validation of Marathon hardware, a full-project build/typecheck gate, browser/render verification, or evidence for later edits. Within the source paths reviewed, no outstanding physics blocker was found. The model remains a bounded partially ionized two-rotor and conditional equilibrium/circuit/cascade learning model, with prescribed ionization and no self-consistent electron energy, flow, radial transport or condensation kinetics.
