# Marathon coupled target and transport, v35

9 November 2026 UTC. This work extends the educational beam–target playground.
It does not establish a calibrated Marathon digital twin or target lifetime.

## Execution path and cause

The previous source calculation fed a frozen optical depth into loading and
independently fed its initial assembly heat into a one-node thermal observer.
Each reduced model could solve its equations correctly while the collection
could not represent feedback. In simple terms, changing the target did not
change the beam calculation or the heat that the target received.

The new path is source settings → common depth-dependent target state →
composition-dependent stopping and fusion → isotope/heat updates → selected
history snapshot → neutron interaction explorer. Existing frozen references
remain accessible under References. Material mode is an explicit choice;
imposed linear slowing is not silently reinterpreted as material transport.

## Reviewable implementation pieces

1. Atomic-composition stopping and explicit implantation-profile accounting.
   Reuse the pinned Geant4 atomic kernels, retaining the lithium host when
   hydrogen sites empty. Experimental LiT compound corrections remain unknown.
2. Conservative finite-volume heat conduction, contact resistance and cooling.
   Cell temperatures represent depth averages, not a resolved three-dimensional
   surface hotspot or a coolant-flow calculation.
3. A shared evolving isotope/thermal state with simultaneous event and energy
   ledgers, pulse boundaries, cooldown, and explicitly assumed transport/renewal
   coefficients. Positivity is a numerical invariant, not material calibration.
4. Finite-cylinder neutron first-interaction accounting. Scattered neutrons stay
   in an unresolved channel. Existing-code OpenMC references separately test
   where subsequent interactions change total absorption.
5. Compact target tabs, selected-time propagation and retained reference models.
   Source invalidation must immediately clear dependent plots and exports.

The independent protocol was recorded before candidate results in
[MARATHON-INDEPENDENT-V35.md](MARATHON-INDEPENDENT-V35.md). Individual producer
and reviewer reports retain failures, exact commands and tested source maps.
The merged release checks and publication receipt are retained separately in
`scientific/marathon-v35/final-checks/` and `scientific/deployment-v35/`.
Numerical benchmarks, publication and live-browser observation are distinct.

## Independent findings and resulting changes

The original coupled implementation passed conservation and analytic tests,
but failed the independent spatial gates: successive temperature differences
were 1.073 K and 0.536 K, above the unchanged 0.1 K budget. Depositing residual
beam energy into the first backing cell moved its effective deposition depth
with the grid. Simply, refining the grid changed where the heater was placed.

An independently checked finite-volume interface-source balance removes that
mesh-dependent location. The source is explicitly assumed to stop at the
backing side of the film/backing contact, with zero penetration depth. The
neighboring node sources follow their half-cell/contact resistances; their sum
is the incoming power. This preserves positive sources and energy without
fitting a stopping range or adding a temperature correction. It is preferable
to shrinking the timestep, which cannot fix a moving spatial source.

The controlled independent comparison held the film mesh fixed while changing
the backing mesh, and then reversed those roles. It localized the observed
error to backing-source placement. The corrected model passed all five strict
time/depth/joint comparisons in the declared matrix. The final joint
temperature change was 2.56e-5 K and population change 1.96e-6, below the
original 0.1 K and 2e-4 budgets. These are differences between numerical
solutions under the stated source convention, not measured physical accuracy.
The original failures and complete histories remain in their sealed snapshots.
The face balance and source-location assumption are derived in
[INTERFACE-SOURCE-V35.md](INTERFACE-SOURCE-V35.md).

Other independent checks and deliberately retained negative results:

* Actual FiPy 4.0.3 agrees with the thermal operator across 113 saved states;
  maximum cell-temperature difference is 2.88e-11 K. This tests the same
  constant-property one-dimensional equations, not real target properties.
* Actual OpenMC 0.16.0 ran three 500,000-history synthetic cases. Pure absorption
  agrees with an independent solid-angle quadrature. The mixed case has more
  absorption after scattering than the live first-flight calculation; it is
  recorded as an omitted-physics difference, not an agreement claim.
* The evaluated H-1 adapter matches independently parsed raw ENDF/B-VIII.1
  tables, including all 153 nodes per channel and native interpolation laws.
  Assumed density and detector response remain separate inputs.
* RustBCA 3.0.0 provided actual deuteron half-space references. Review caught
  an electronic-stopping branch used outside its documented energy range.
  A separately frozen INTERPOLATED rerun changes the 500 keV mean depth from
  about 2.85 to 7.20 micrometres. The old runs remain as controls. The upstream
  README example's numeric depth check still fails, despite successful runs;
  the reference displays that unresolved mismatch.
* The original 0–4 micrometre sampling grid cannot resolve the 500 keV tail.
  A separately labeled post-hoc full empirical-CDF diagnostic and display-only
  0–12 micrometre histogram retain the original gates and incident denominator.
  None of these half-space profiles is substituted for thin-film retention.

The new calculation runs through the existing cancellable worker protocol.
Controls invalidate stale plots and exports immediately; obsolete requests
cannot overwrite newer settings. Selected-time neutron output follows the
evolving target. Initial source scans, geometry and ledgers sit under an
explicit Initial source disclosure; older loading/thermal observers remain
under References. This avoids presenting a frozen initial yield as current
output during depletion or cooldown.

## Live-browser boundary

The browser inventory exposed the already-open deployed Mass Spinner tab.
Selecting that exact tab returned an explicit managed-policy denial for
`https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev`, before page
observation. The tool also prohibited alternate browser surfaces, indirect
execution, raw CDP and other workarounds. No such workaround was attempted.
Desktop/mobile DOM handler checks, asset integrity and successful publication
therefore cannot be reported as observed live browser or GPU verification.

## Public architecture and empirical boundary

Marathon's [beam-driven architecture](https://www.marathonfusion.com/beam-driven-fusion/)
and [target description](https://www.marathonfusion.com/) were reopened during
this work. They support the RF source, electrostatic acceleration, LiT layer,
cooled substrate and in-situ target regeneration concept. They do not supply
the measured material coefficients, operating-point uncertainties and target
geometry needed to calibrate these scenario inputs. The future power-plant
blanket remains a separate model scope.

Full compound stopping/implantation calibration, evolving surface chemistry,
erosion and sputtering feedback, isotope-carried enthalpy, phase changes,
three-dimensional heat flow, coolant hydraulics, full scattered-neutron
spectra, damage/activation and calibrated detector response need their own
data and qualification. No arbitrary coefficient, extrapolation, temperature
floor or conservation projection is used to present those gaps as solved.
