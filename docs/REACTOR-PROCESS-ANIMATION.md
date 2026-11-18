# Reactor process animation

The beam view reads the same source calculation as the plots. Material-mode
target results override it with the selected accepted history sample; pending
results hide the numerical animation. No extra source or thermal solver is run.

- D⁺ speed uses `sqrt(2 E / mD)`; marker count increases with calculated current.
- Beam radius follows `sqrt(area / π)` on SI hardware. The Blender envelope
  remains illustrative and uses a consistent display mapping of that footprint.
- Fusion flashes are amplified. Neutron markers follow the calculated production
  rate and mean energy. Directions use an explicitly assumed isotropic source;
  straight unattenuated tracks do not predict scattering, shielding or dose.
- Selected target heat arrows reuse `advanceTargetConduction` at zero timestep.
  Face conductances retain film/backing, contact and coolant resistances. Signed
  fluxes permit reverse heat flow; stored heat can leave after the beam stops.
  Initial-source arrows instead indicate the conditional stopping-substrate heat
  budget; they do not predict a temperature or a coolant velocity.

Markers represent weighted populations. Counts saturate for readability; ions
and neutrons use independent slow-motion scales. Reaction flashes are not a
one-to-one fraction of the displayed ions. Heat chevrons are direction glyphs,
not fluid parcels or a solved three-dimensional heat field.

The power-reactor assembly has a separate **reference** animation: normalized
D–T births, outward free-flight tracks and a heat-direction cue. It has no beam,
does not use the compact source's controls, and adds no plasma/neutronics/plant
solver. Published TBR, gold yield and the cooldown/optical explorers are unchanged.

Pause, per-process visibility and system reduced motion are supported. Hidden
apparatus views stop their animation loop; fixed GPU buffers cap display cost.

Architecture source: [Marathon beam-driven fusion](https://www.marathonfusion.com/beam-driven-fusion/).
The geometry scope remains in [REACTOR-RENDER-SCOPE.md](REACTOR-RENDER-SCOPE.md).
