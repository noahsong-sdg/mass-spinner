# Solver-to-surface contract

`src/surface-state.ts` adapts completed production results. It does not run a different physics model. A renderer must use only a `ready` snapshot. Pending, stale, mismatched or malformed inputs suppress quantitative overlays.

Pass `surfaceState({model, settings, result, acceptedModel, acceptedSettings})`. The accepted model/settings belong to the completed request, not a fresh UI reading. Orbit and double-well results additionally echo their own configuration, which must match. Target calls also pass `selectedState`, `source` and `acceptedSource`: the selected state must belong to the accepted result's history, and the source must match the accepted source. This preserves provenance for solvers whose results do not repeat the input beam.

All positions and lengths use SI solver coordinates: `[x,y,z]`, with axial `z ∈ [0,L]`. Geometry can apply a single rigid scene transform. It cannot silently rescale physical samples to decorative chamber dimensions. Rendering may expand micrometre depth for inspection only when the displayed scale is explicitly identified.

| Model | Spatial support | Interpretation |
|---|---|---|
| Rotating / ICR | Actual sampled trajectories, complete positioned impacts; prescribed radial E/B/φ | Original injected denominators; paths never become density. ICR's radial map excludes the time-dependent uniform transverse RF field. |
| Centrifuge | Radial point samples | Common-corotation densities remain normalized to on-axis density; ψ remains a rotating-frame potential. Gaussian closures supply absolute density and laboratory E/φ/current; coupled magnetic closure supplies solved B. |
| Double-well landscape | Radial point samples | A fixed canonical-angular-momentum Hamiltonian slice, not occupied density or recovery. A cropped axis interval remains unsupported. |
| Double-well kinetics | Final annular cell averages; radius-only impacts | Exact annular volumes and full column length; integrated density must equal survivor marker inventory. Impact `hamiltonianJ` is signed total H, not deposited kinetic heat. Wall-z/azimuth were not retained. |
| Gyro | Exact transverse locus | Drawn in the z=0 transverse plane; not a reconstructed axial helix or common-time comparison. |
| Curved field | Reference geometry only | Arc-length/deflection curves do not specify the full 3D vector path or a collection channel. Keep the actual curves in plots. |
| Beam target | Native film and backing thermal cells; film isotope cells | Uniform illuminated area; film/backing remain separate regions, including contact jumps. Whole-assembly neutron rate and heat are scalars, not local hotspots. |
| Other reduced modes / research / future blanket | Explicitly unsupported local field | Reference geometry or production diagnostic curves do not imply a current spatial engineering solution. |

Each `SurfaceField` retains its raw sample positions/values, unit, region, sample measure, bounds and color domain. Corresponding species densities/energies share a common domain; film/backing temperature shares one domain. Field picking returns the nearest original point sample or the containing original cell, never an interpolated value. Internal cell faces belong to the cell on the right; the final boundary belongs to the last cell. Coordinates outside support return null. Never interpolate across a material interface or fill an unmodeled dimension with a fabricated profile.

Validation here checks data provenance, shape, finite values, coordinate bounds, population/site conservation and quantitative support. It does not qualify collision transport, calibrate materials or establish hardware dimensions/performance. Tests use real production solver output and deliberate corruptions; visual/browser verification is a separate gate.
