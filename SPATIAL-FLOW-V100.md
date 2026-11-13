# Spatial flow repair

Two demonstrated numerical defects are fixed. The coupled argon research model
still fails spatial and experimental qualification; the live playground is unchanged.

The old LLF flux diffused stationary density contacts and swirl energy while
angular momentum stayed fixed. In plain terms, numerical smoothing could move
mass and heat without the corresponding physical flow. The replacement uses
[HLLC](https://doi.org/10.1007/BF01414629), adapting the established contact/star-state
construction to face-specific angular momentum and species. It resolves the
missing contact/shear waves rather than compensating with fitted coefficients.
Stationary contacts, moving shear, supersonic upwinding, shock tubes and strong
rarefactions have executable controls. This is not unconditional positivity proof.

The stress solver integrated across FV faces, then binned individual Gauss points
into cells. Globally correct heat could therefore be deposited locally incorrectly;
the manufactured graded-grid test showed up to80.7% cell error. Integration now
splits at those faces. The stress stiffness and heating use the same quadrature
and sparse Q1 prolongation, preserving their work/energy identity without
renormalization. The original solution space and scalar conduction are retained.

To bound working memory, the campaign runs cases sequentially in fresh processes
with one BLAS thread. Sparse tensor interpolation avoids the potentially large
point-finder allocation. Six fixed electrical matrix products are cached; evolving
mass, timestep and factorization remain fresh. A three-repeat20-step electrical
benchmark gives1.30x median speedup with matching final states. This is not an
end-to-end speedup or a measured host-memory reduction. Finest worker peak RSS
was387,492KiB (~378MiB); its runtime was1,069s.

All five frozen trajectories completed. All77 controls passed, including the
regressions that first failed on the original implementation. Independent replay
found10 spatial failures in95,842 checks, versus13 previously. Every contraction
and n2 timestep gate passed; maximum fine timestep change was0.222% against2%.
Density-increment changes remain26.6–39.9% (whole density <0.615%); radial flow
11.1–15.2%. Axial flow now passes all reporting times; at4us temperature and its
increment pass. The unchanged spatial gate is5%. Maximum energy/angular defects
were2.59e-13/1.21e-13; conservation is not spatial qualification.

An independent initial-rate probe localizes95.26% of squared density-rate error
to r=0.048–0.052m around the prescribed5cm profile clamp. This is the initial
hydro truncation error, not95% of the entire evolved error. Uniform pressure
removes it to roundoff. A source-aligned trial mesh reduces its RMS by80.8%, but
creates a spacing-transition error and is not adopted. The next coherent step is
nonuniform reconstruction controls and smoothly graded source/endwall refinement.

The unchanged no-fit observation pipeline tested all288 diagnostic alternatives;
none passes the20% all-point screen. Worst-point discrepancy remains47.7–59.2%.
Optical numerical gates pass. The single-temperature/frozen-transport model still
reaches611,012K locally, so missing energy/ionization/boundary closures remain.
These previously viewed measurements are retrospective development evidence.

[Protocol and exact execution evidence](scientific/spatial-v100/README.md).
Typecheck, build, site and asset checks passed on326 unchanged app inputs.
