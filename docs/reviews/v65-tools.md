# Expert simulation tools: fit to the missing centrifuge physics

Reviewed 2026-11-10. Primary project documentation and author/institutional
sources were checked online. Versions below describe available upstream tools,
not packages installed or executed in this review. No installation, benchmark,
VM operation or deployment was performed by this reviewer.

## Decision

**Use actual FiPy now for an independent radial angular-momentum reference.**
The v64 experiments reject rigid rotation as a profile model; adding a different
linear solver cannot supply the missing radial shear stress. The smallest
scientifically useful change is a spatial azimuthal-momentum equation with
geometry, viscosity and wall conditions, verified against an independent
finite-volume implementation and analytical limits. This does not yet supply
a self-consistent discharge, measured inventory or an observation operator.

FiPy is already used by this project's thermal studies. The new
`scientific/momentum-v65/reference_fipy.py` assembles the actual FiPy equation,
using `CylindricalGrid1D`, `TransientTerm`, `DiffusionTerm` and the SciPy LU
backend. It does not import the TypeScript kernel or copy its tridiagonal
matrix. The parent has executed its first campaign in safe-dev; the artifact
review below distinguishes those results from final qualification. NIST
documents these finite-volume components and their cylindrical
mesh support. Its terms permit use/modification/distribution with the notice
and warranty disclaimer; government-work copyright treatment differs inside
and outside the US. [FiPy](https://www.nist.gov/programs-projects/fipy),
[mesh API](https://pages.nist.gov/fipy/en/latest/generated/fipy.meshes.factoryMeshes.html),
[LU API](https://pages.nist.gov/fipy/en/latest/generated/fipy.solvers.scipy.linearLUSolver.html),
[terms](https://pages.nist.gov/fipy/en/latest/LICENSE.html).

**Next use OpenFOAM for a specific 2D geometry question, not a wholesale rewrite.**
Its annular rotating-cylinder example and analytical Couette velocity are useful
existing verification material. A later r-z study can test axial/endwall losses
and compare a true annulus with the current cylinder. Require a measured or
bounded force/current distribution rather than fitting a new drag at every
pressure. [Official rotating-cylinder verification](https://doc.openfoam.com/2606/examples/verification-validation/laminar/rotating-cylinders-2d/).

## What the new FiPy reference actually solves

For fixed density, viscosity and applied force, with no radial or axial flow,
the axisymmetric azimuthal momentum balance is

\[
\rho r^2\partial_t\Omega
=\frac1r\partial_r(\mu r^3\partial_r\Omega)+r f_\theta.
\]

This is an independent derivation from cylindrical Newtonian stress, not a
claim that a generic scalar diffusion equation automatically models rotation.
Under FiPy's cylindrical measure `r dr`, the diffusion coefficient must be
`mu*r_face²`, and the transient coefficient is the cell average of `rho*r²`.
For uniform cell density that average is
`rho*(r_inner²+r_outer²)/2`, exactly reproducing the cell's angular inertia.
A cell torque in N m becomes source
`torque/(2*pi*length*integral_cell(r dr))`. The axis has natural zero torque;
an actual gas-excluding electrode has a finite inner radius and a separately
specified wall condition. Null wall speeds mean zero stress, not no slip.

The reference uses FiPy's harmonic face interpolation of cell viscosity and
physical face radius. The proposed browser kernel uses integrated half-cell
viscous resistance. These are different consistent discretizations; refined
solutions should agree, while finite-grid matrices need not. Constant and
discontinuous viscosity, nonuniform grids, torque-free rigid rotation, wall
spin-down, applied-torque balance and independently derived Couette solutions
are meaningful checks. Require joint space/time refinement and angular-momentum
ledgers. A discontinuity needs interface-aligned and shifted-grid checks.

**Limits:** this frozen-density reference does not validate radial mass
advection, evolving gas inertia, ion-neutral slip, centrifugal composition,
electromagnetic current closure or thermal feedback. Extending it requires
conservative angular-momentum advection and consistent rotor work/viscous heat;
silently replacing `rho` each step is not a coupling derivation.

An adversarial source check caught a useful caution: the OpenFOAM verification
page displays the correct `v_theta=A*r+B/r` and `dp/dr=rho*v_theta²/r`, but its
displayed integrated pressure expression has a positive `B²/(2r²)` term.
Independent integration instead gives
`p/rho=A²*r²/2+2*A*B*log(r)-B²/(2*r²)+C`. The velocity oracle remains useful;
the displayed pressure should not be copied without this correction. This is
a mathematical consistency finding, not an executed OpenFOAM defect report.
[Source checked](https://doc.openfoam.com/2606/examples/verification-validation/laminar/rotating-cylinders-2d/).

## Ranked fit and adoption gates

The fit judgments and resource comparisons in this table are recommendations,
not project-owner claims that one framework is universally the industry
standard. All solve different levels of the problem.

| Priority / tool | Verified capability and access | Use here / gate |
|---|---|---|
| **1. FiPy** | NIST Python finite-volume PDE framework; cylindrical meshes and implicit transient/diffusion assembly. Permissive NIST terms above. | Actual independent radial momentum reference now. Small 1D runs fit the existing scientific VM. Not a complete plasma discharge package. |
| **2. OpenFOAM** | Continuum CFD with documented rotating-cylinder verification; GPLv3. Foundation 14 and OpenCFD 2606 are separate distributions; pin one and preserve its dictionaries. | Best next free r-z geometry/endwall/flow oracle after 1D qualification. Linux VM, meshing and case preparation; useful offline. Plasma forcing, chemistry and transport still need explicit closures. [Foundation release](https://openfoam.org/release/14/), [OpenCFD licensing](https://www.openfoam.com/documentation/licencing). |
| **3. PETSc** | Scalable nonlinear, linear and ODE/DAE numerics; BSD-2-Clause core, external packages have separate terms. | Use existing collision/numerical infrastructure where stiffness or system size demonstrates need. PETSc does not choose viscosity, chemistry or wall physics. Its documented Emscripten build makes browser use possible in principle, not an already engineered free-hosting solution. [TS manual](https://petsc.org/release/manual/ts/), [license](https://petsc.org/main/install/license/), [installation](https://petsc.org/release/install/). |
| **Conditional: SPARTA** | Sandia DSMC for 2D/3D/axisymmetric low-density gas, MPI and surface collisions; GPL-2.0 project. | Best free rarefied-gas reference when Knudsen/slip assessment rejects continuum wall transport. Need species collision kernels and accommodation data; does not automatically supply magnetized plasma physics. Near-continuum DSMC cost/noise is a major practical drawback. [Project](https://sparta.github.io/), [manual](https://sparta.github.io/doc/Section_intro.html), [source/license](https://github.com/sparta/sparta). |
| **Conditional: LoKI-B++ / LoKI-MC** | IST Lisbon open GPL-3.0 C++ electron-kinetics tools. B++ reproduces the nonmagnetized two-term LoKI-B; MC has published magnetic AC/DC benchmarks. | Strong transparent offline electron-rate crosscheck when a defensible gas/cross-section set is available. MC is preferable to assuming a nonmagnetized closure under strong B. Neither provides neutral viscosity or ion-neutral momentum data. [Author tools and references](https://nprime.tecnico.ulisboa.pt/loki/tools.html). |
| **Conditional: BOLSIG+ / Magboltz / LXCat** | BOLSIG+ supplies electron Boltzmann transport/rates, including arbitrary crossed E/B and anisotropic coefficients. CERN Magboltz supplies electron transport in gas mixtures with E/B. LXCat hosts contributor cross-section sets. | Useful for discharge closure and independent swarm comparisons, not a replacement for heavy-species CFD. BOLSIG+ site latest binary is 07/2024; CERN lists Magboltz 11.21 (2026). Package redistribution rights were not established in this review. LXCat explicitly restricts third-party data redistribution: retain contributor/version/date/citation and obtain required rights before bundling. [BOLSIG+](https://www.bolsig.laplace.univ-tlse.fr/download.html), [Magboltz](https://magboltz.web.cern.ch/magboltz/), [LXCat policy](https://us.lxcat.net/instructions/redistribution.php). |
| **Later: Elmer** | CSC finite-element multiphysics, including electromagnetics, fluid dynamics and heat. Main solver library LGPL; GUI/grid and most physics solvers GPL. | Good free geometry-resolved field/current and solid-thermal reference if those become the demonstrated error source. Do not adopt alongside another full framework without a bounded case. [CSC](https://research.csc.fi/service/elmer/), [license policy](https://github.com/ElmerCSC/elmerfem/blob/devel/license_texts/ElmerLicensePolicy.md). |
| **Later: MOOSE** | INL multiphysics with finite-volume/finite-element Navier–Stokes, heat, electromagnetics and stochastic modules. Framework/module LGPL-2.1 documentation. | Strong option for tightly coupled fluid/solid/EM studies; substantial C++ build and model configuration. Existing modules are not a prevalidated low-ionization centrifuge. Current September 2026 NS documentation describes nonlinear and linear FV approaches; pin actual version if adopted. [NS](https://mooseframework.inl.gov/modules/navier_stokes/intro/index.html), [modules](https://mooseframework.inl.gov/modules/), [licensing requirements](https://mooseframework.inl.gov/bison/modules/navier_stokes/sqa/navier_stokes_srs.html). |
| **Later: BOUT++** | Curvilinear plasma-fluid framework, 3D C++, LGPL-3.0-or-later. | Appropriate if magnetized-fluid instabilities/turbulence become the question and drift/fluid ordering is checked. Not the simplest neutral annular shear/thermal oracle. [Project](https://boutproject.github.io/), [manual](https://bout-dev.readthedocs.io/en/stable/user_docs/introduction.html). |
| **Lower fit now: SU2** | Open C++/Python unstructured CFD/PDE and adjoint optimization, LGPL-2.1. | Useful later for validated forward-model design sensitivities. Its aerodynamic/optimization orientation gives less immediate leverage than OpenFOAM for this radial-stress defect. [Project](https://su2code.github.io/), [source](https://github.com/su2code/SU2). |
| **Access-dependent: COMSOL** | Commercial Plasma Module includes electron drift-diffusion, electron-energy and Boltzmann tools with flow coupling. Browser applications run on licensed COMSOL Server. | Relevant integrated industry option if a license already exists, especially EM/thermal geometry. Not a free Cloudflare-hostable solver; model/data validation remain necessary. [Plasma manual](https://doc.comsol.com/6.3/doc/com.comsol.help.plasma/IntroductionToPlasmaModule.pdf), [licensing](https://www.comsol.com/products/licensing), [Server](https://www.comsol.com/comsol-server). |
| **Access-dependent: PLASIMO** | Low-temperature-plasma multiphysics lineage at Eindhoven; vendor announces PLASIMO 11.0 in October 2026 and trial/access requests. | Potentially strong non-LTE discharge/chemistry framework. Current open redistribution license and exact magnetized closure were not established; do not treat historical open-code aspirations as current terms. [Vendor](https://plasma-matters.nl/news/index.php), [TU/e record](https://research.tue.nl/en/publications/plasma-modelling-at-eindhoven-university-plasimo-4/). |

## Practical deployment and evidence

Keep the public simulator's compact browser solver. Native scientific codes
belong in the isolated offline reference pipeline, with pinned versions, input
hashes, solver settings, mesh/time refinement and preserved outputs. Only
admit a browser approximation or table over the region those references
actually cover. A native executable being open source does not imply it fits
Cloudflare Workers' runtime or free resource limits. A new paid compute backend
is not required to test the present one-dimensional physical hypothesis.

Constitutive data remain at least as important as framework choice. Existing
Cantera/NIST transport studies are useful inputs within their documented gas,
temperature and isotope limitations; changing particle masses in a convenient
gas model does not establish lithium, Ar/Xe or D/T transport. Match a historical
apparatus's gas, excluded electrode, current path and line-of-sight diagnostic
before assigning an experimental discrepancy to the new shear model.

This step can establish a correct numerical radial-stress operator and remove
the rigid-profile restriction. It cannot by itself establish first-order
Marathon performance, isotope throughput, outlet purity or reactor feasibility.
No public matched calibration dataset was established by v64. Preserve those
limits until a genuinely held-out observable passes with input uncertainty.

## Independent review of the first actual-FiPy campaign

Reviewed the exported `scientific/centrifuge-v44/momentum65/studies/first/`
`analysis.json`, `audit.json`, `diagnostic.json` and `cases.json`, plus
`fixtures.py`, `analyze.py`, `independent_check.py`, the protocol and the actual
FiPy implementation. The parent reports the successful safe-dev execution;
the exported package versions are FiPy4.0.3, NumPy2.4.6 and SciPy1.17.1.
This reviewer did not execute code. OpenFOAM remains recommended, **not used**.

The FiPy setup is genuinely independent numerical assembly: it uses the
library's cylindrical geometry, transient/diffusion terms and SciPy LU rather
than importing the browser matrix. Its standard harmonic-face interpolation
differs intentionally from integrated resistance. The separate Python LDL^T
audit checks the browser's discrete equations and ledgers; that audit is a
different role from independent continuum discretization. Agreement with the
LDL^T audit alone would not establish continuum accuracy.

All first-campaign numerical gates pass. Finest all-shared-time cross-code
differences, divided by the reported physical scale, are0.0254% for Couette,
0.00447% for the driven core,0.331% for the variable-viscosity case and0.0131%
for the Bessel mode. This includes transient states, not just final profiles.
Bessel endpoint errors and successive timestep differences approximately halve
under timestep refinement; the remaining cross-code difference stops improving
with dt as expected for a spatial-discretization floor. These results support
the frozen-coefficient numerical operator within the tested families.

There are two pre-final qualification gaps, neither requiring relaxed gates:

1. Every first-campaign spatial grid is uniform, and every viscosity jump lies
   on the same interface at0.5. Add stretched-grid and interface-conforming
   shifted-jump cases before claiming arbitrary-grid/discontinuous-material
   qualification. A strong additional annular Couette oracle uses radii1–2,
   viscosity jump at1.37 and mu=1/5 on its two sides. Its exact Omega is
   `Omega_out+(Omega_in-Omega_out)*R(r)/R(a)`, where
   `R(r)=integral_r^b ds/(mu(s)*s^3)`; each constant-mu segment integrates to
   `(left^-2-right^-2)/(2*mu)`. Keeping the physical interface on a face avoids
   confusing coefficient smearing with solver error. The parent has also
   proposed odd-grid cases, which challenge different coefficient sampling.
2. `analyze.py` normalizes the variable family's discrepancy by the production
   solver's observed maximum, rather than a declared independent input scale.
   Use the initial-amplitude scale or another prospective physical scale.
   Here it changes the finest discrepancy from about0.331% to0.380%, still
   below0.5%, but removes a dependency on the implementation being tested.
   The analytical-family and Bessel normalizations are defensible. Require
   exact case inventories and shared input hashes, not matching counts alone.

The FiPy output now records SHA256 of its exact raw input-case bytes so the
next execution can reject stale or mismatched cross-code results. This
provenance addition has not been executed by this reviewer.

Experimental fidelity remains a separate failed gate: the new constant-mu,
uniform-emissivity profile candidate gives39.98% held-out RMS/observed peak,
versus59.55% for rigid rotation, while the20% target remains unmet. The
constant-mu steady pressure ratio is1 versus reported approximately2/3.
The artifacts correctly retain these failures and explicitly report no live
backend change or matched experimental validation. More framework adoption
cannot remove unknown current distribution, inventory, diagnostic weighting
or missing endwall losses by itself.

## Final artifact review: numerical qualification gaps closed

The final receipt and exported study under
`scientific/centrifuge-v44/momentum65/studies/final/` supersede the first-run
numerical results. Reviewed final `receipt.json`, `analysis.json`, the tested
input manifest, fixture generation, analytical helper, packet-link validation,
stale-packet tests, orchestration and test-log summaries. This is an independent
source/artifact review, not a second execution by this reviewer.

The parent-executed snapshot is
`3fcb32e12530d647df61d354f351c45ad4753538d2f34d5a95857d06023733bc`
(686 manifest inputs). Its receipt records all command exits as zero. Logs
show32 TypeScript regression tests,17 momentum Python tests and16 prior
benchmark Python tests passing. The receipt also records successful typecheck,
build, site and asset checks. The actual study covers29 cases and5,300 evolved
steps with FiPy4.0.3/SciPy1.17.1; all23 frozen numerical gates pass.

Both requested spatial qualifications now exist: stretched constant-mu Couette
and a nonuniform, interface-conforming discontinuous-mu Couette family with
the physical jump at1.37. Its exact solution integrates piecewise viscous
resistance, including both materials and the two wall speeds. At256 cells the
all-shared-time cross-code difference is0.001055% and FiPy's analytical final
error is0.0007022%. Both decrease approximately fourfold under mesh doubling.
The stretched128-cell case differs across codes by0.002051%. These data close
the previously identified arbitrary-spacing/material-interface gap for these
tested families; they do not guarantee every possible mesh.

Even and odd-grid variable-mu cases now normalize against the prescribed
initial amplitude, independently of production output. Finest all-time
differences are0.3798% and0.3815%, respectively, below the unchanged0.5% gate.
These are cross-code discretization checks; the odd-grid coefficient samples
represent a shifted discrete interface and are not claimed to recover an
unresolved subcell material law. Coarse discrepancies remain visible.

Raw-case SHA256 is now recorded by FiPy. The analysis verifies the raw-case
links for production, FiPy and the discrete audit; the prediction links for
audit/diagnostic; and the corrected-marker link. It also rejects mismatched,
duplicated or reordered case identities. Three regression tests exercise the
linked fixture, every stale-link type and identity disagreement. The current
analysis command calls this validation before computing gates, closing the
stale-evidence issue without introducing fallback results.

**No unresolved blocker was found to this narrowly scoped frozen-density,
prescribed-viscosity numerical kernel qualification.** The meaningful remaining
blockers concern physical prediction and live integration: conservative
species/energy/angular-momentum coupling, defensible force/current and wall
closures, matched measured inventory/temperature and emissivity, plus held-out
experimental agreement. The39.98% profile error and failed pressure trend are
retained. The final receipt explicitly reports no new live backend, no fresh
browser verification and no experimental validation; its151 release files
remain byte-identical to deployed FinalD. FiPy was actually used. OpenFOAM,
SPARTA and the other researched frameworks were not executed in this campaign.
