# Coupled non-rigid argon flow

The finite-contact research backend evolves density, radial/axial momentum,
angular momentum and total energy, with Hall-current feedback, full cylindrical
viscous stress and heat conduction. It reuses V75/V86 and scikit-fem/SciPy;
PyAbel and the validated Doppler operator provide the observation comparison.
This is an offline conditional calculation. The live playground is unchanged.

The demonstrated numerical bug was an ineffective timestep study: old nominal
caps were larger than the active acoustic limit, so two trajectories used the
same steps. In simple terms, turning the timestep knob did not change the
simulation. This campaign varies the active CFL and independently checks actual
accepted clocks. It preserves the existing equations and acceptance thresholds.
Resolving the active restriction is preferable to loosening a convergence gate.

The graded meshes retain fixed physical contact support and concentrate cells
at the cathode and stationary walls. Ideal-ring current sources cannot supply
converged contact heating; initialization therefore solves the existing finite
disk/anode problem. The 4 mm disk remains an explicitly unmeasured footprint.

The [protocol](scientific/coupled-v99/PROTOCOL.md) fixes five trajectories, one
source-inventory-first transport alternative, the 7 cm anode interpretation,
100 A per branch, 0.13 T and every reporting clock 0/1/2/4 microseconds.
This bounded slice does not replace the full transport/boundary envelope.

All five trajectories completed. The 61 control tests passed. Independent
replay found **13 spatial failures in 95,074 checks**; all contraction gates
passed. Fine density-increment changes remain 28.6–39.9% (whole density <0.65%), radial velocity
12.0–15.7%, temperature 5.39–7.40%, and temperature increments 5.82–8.44%.
At 2 microseconds axial velocity changes 6.06%. The unchanged spatial gate is 5%.
The three n2 CFL runs used 1307/2616/5232 steps; every timestep gate passed,
maximum fine change 0.248% against 2%. This does not qualify n4 time accuracy.
Maximum energy/angular residuals were 2.57e-13/1.22e-13. No threshold was relaxed.

All 288 diagnostic alternatives failed the fixed 20% all-point speed screen;
worst-point discrepancies span 47.7–59.2%. Optical numerical gates passed, as
did eight actual-field direct-CDF/Fourier witnesses (maximum bin error 2.52e-17,
zero mode discrepancy). No favorable time or diagnostic choice is adopted.
At 4 microseconds maximum temperature is 623,522 K but mass mean is 2,656 K;
1.963% of volume/0.609% of mass exceeds 10,000 K and holds 5.570% of internal
energy. The near-midplane maximum is 5,955 K. This is a localized closure
failure, not whole-bulk overheating. Numerical/experimental qualification fails.

Independent reviewers checked the Hall signs, stress/hoop terms, electrical
work identity, finite-contact torque, wall-reaction sign, observation geometry
and source/target separation. Saved-state replay reconstructs primitive fields
and storage budgets; intermediate steps retain producer scalar ledgers, not
independently reconstructed full PDE states. Discrete cathode-node torque and
the continuum uniform-disk torque are deliberately reported separately.

The single-temperature control deposits all Ohmic heat into heavy particles.
It omits separate electron/ion/neutral energy, evolving ionization, radiation
and measured heat/throughflow boundaries. Extreme contact temperatures expose
that limitation even if total energy is conserved. The source papers distinguish
heavy-particle heating from direct electron Ohmic heating; no fitted partition
or cooling coefficient is introduced. See [energy-closure research](scientific/meridional-v86/NEXT-ENERGY-CLOSURE.md).

The optical comparison uses the first axial cell layer as a near-midplane
proxy, fixed measured-brightness conditioning and all 72 prior diagnostic
alternatives at every time. Its thermal proxies are not evolved-temperature
spectra. A speed-residual pass cannot establish optical, fluid or experimental
qualification. These measurements were already viewed; this is development
comparison, not fresh held-out validation or a measured steady transient.

A satisfactory learning simulator already exists. A quantitative release needs
three bounded packages: independently qualified coupled numerics; justified
electron/heavy energy and evolving transport; matched apparatus boundaries and
diagnostics followed by genuinely held-out profiles. The last package requires
independent data. Additional grid precision cannot supply missing measurements.
Elmer 26.1's native cylindrical compressible/swirl and heat solvers are a
source-reviewed independent candidate; neither it nor the failing OpenFOAM
coupled reference is being presented as execution-qualified here.

Evidence: [retained campaign](scientific/coupled-v99/README.md), [raw release](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v99-coupled-argon-release).
Producer source01 manifest SHA256
`883523af5d61b6f6ff0119773bfe90d6548ff73107419ed74321606ae1614876`;
checker/source02 `3b08319f1e39556d1a04246b23e3708adab6eec4a6c6124a2fbcca65cdd226d0`.
Source02 producer code only renames the configured-CFL key; normalized ASTs match.
The initial receipt wrapper queried packages with system Python after the
producer completed; its exit 1 is retained and metadata collection corrected.
Typecheck, build, site and asset checks passed on 326 unchanged app inputs.

Primary sources: [1979 apparatus](https://doi.org/10.1515/zna-1979-0602),
[1980 energy discussion](https://doi.org/10.1515/zna-1980-0815),
[BOLSIG+ transport/rate tables and assumptions](https://www.bolsig.laplace.univ-tlse.fr/index.html),
[Elmer26.1 native flow](https://raw.githubusercontent.com/ElmerCSC/elmerfem/release-26.1/fem/src/modules/FlowSolve.F90).
