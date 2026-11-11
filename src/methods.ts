/** Section II of Zweben, Gueroult & Fisch (2018), DOI 10.1063/1.5042845.
 * This is a mechanism directory, not a claim that every variant has a solver.
 * Explicitly marked inferences are design deductions, not measured performance.
 */
export interface MethodGuide {
  id: string;
  section: string;
  title: string;
  mechanism: string;
  advantages: string[];
  disadvantages: string[];
  fidelity: string;
  parameters: string[];
}

export const METHOD_GUIDES: MethodGuide[] = [
  {
    id: 'gyro', section: 'II A', title: 'Ion gyro-orbit separation',
    mechanism: 'Different gyroradii produce different interception positions. The radius depends on perpendicular speed, mass, charge and magnetic field.',
    advantages: ['Direct geometric separation; does not require rapid bulk rotation or a large radial plasma potential.'],
    disadvantages: ['Thermal speed and pitch-angle spread broaden the gyroradii.', 'Ions must complete an orbit without strong scattering; collector geometry and source width determine usable resolution.'],
    fidelity: 'Prescribed-field single-ion orbits can resolve gyration. Real collection requires the actual source and collector geometry; orbit radius alone is not purity.',
    parameters: ['Magnetic field', 'Mass and charge', 'Perpendicular energy or temperature', 'Source width', 'Collector acceptance', 'Collision frequency'],
  },
  {
    id: 'icr', section: 'II A', title: 'Ion cyclotron resonance heating',
    mechanism: 'Resonant RF selectively increases a species’ perpendicular energy, then gyroradius-sensitive collectors separate the heated and unheated ions.',
    advantages: ['Frequency provides a tunable species selector.', 'The tutorial describes use for isotope separation as well as separation between elements.'],
    disadvantages: ['RF coupling and heating become difficult at high density and throughput.', 'Heating costs energy; RF heating alone is not a complete extraction system.'],
    fidelity: 'The browser applies a uniform circular RF field to test particles. Antenna fields, plasma dielectric response, RF propagation and realistic biased extraction collectors are unresolved.',
    parameters: ['RF frequency', 'RF amplitude', 'Polarization', 'Interaction time', 'Magnetic field', 'Mass and charge', 'Initial energy spread'],
  },
  {
    id: 'curved', section: 'II B', title: 'Ion drift-orbit separation',
    mechanism: 'Curvature and magnetic-field-gradient drifts displace ions across a bent magnetic guide. Velocity components and the bend angle determine the displacement.',
    advantages: ['Separation can occur without an externally imposed electric field.', 'The tutorial suggests permanent magnets could simplify the field hardware.'],
    disadvantages: ['Electron–ion separation creates an electric field that can move all species together and suppress separation.', 'A slit-shaped source is needed to turn drift into resolvable spatial separation.', 'Guiding-center estimates require gyroradius much smaller than the curvature radius.'],
    fidelity: 'An imposed-field drift estimate omits self-generated electric fields, source acceptance and collector geometry. It is not a demonstrated high-throughput separator.',
    parameters: ['Bend angle', 'Curvature radius', 'Magnetic field', 'Parallel and perpendicular energy', 'Source slit width', 'Collisionality'],
  },
  {
    id: 'centrifuge', section: 'II C', title: 'Plasma centrifuge equilibria',
    mechanism: 'Rapid azimuthal rotation changes radial force balance; mass and charge affect the equilibrium species profiles.',
    advantages: ['A vacuum arc integrates plasma generation and rotation.', 'Unlike collisionless orbit filters, separation can operate at relatively high collisionality.'],
    disadvantages: ['Instabilities can remix the species.', 'The illustrated vacuum-arc source requires a conducting solid target.', 'The tutorial reports low throughput and potentially excessive energy cost for some historical implementations.'],
    fidelity: 'Choose a bounded common-corotation benchmark or a prescribed Gaussian density with derived electron flow/current. The latter reports neglected self-field and electron inertia; it does not predict the density width or source. Central and bulk composition are separate boundary conditions. Neither closure predicts relaxation, extraction or arc power.',
    parameters: ['Angular velocity', 'Ion and electron temperatures', 'Mass and charge', 'Central or bulk composition', 'Gaussian density width and axis density', 'Imposed B', 'Radius'],
  },
  {
    id: 'rotating', section: 'II D', title: 'Uniform-B rotating / Archimedes filter',
    mechanism: 'A radial electric field drives rotation. Full ion orbits can lose radial confinement above a mass-to-charge threshold, producing wall-versus-end collection.',
    advantages: ['External biased electrodes offer control.', 'Uniform axial magnetic geometry is relatively simple.'],
    disadvantages: ['Near-collisionless operation constrains density and throughput.', 'The applied electrode voltage may not produce the assumed bulk radial potential.', 'Rotation can be limited by neutral-related effects, and fluctuations can mix species.'],
    fidelity: 'Prescribed-field full orbits and first-hit boundaries are resolved. The cold infinite-device threshold is not finite-device purity; field penetration, plasma response and turbulence are not solved.',
    parameters: ['Axis-to-wall potential', 'Magnetic field', 'Radius', 'Length', 'Source distribution', 'Mass and charge', 'Collisions'],
  },
  {
    id: 'doublewell', section: 'II D', title: 'Double-well mass filter',
    mechanism: 'A shaped radial potential creates mass-dependent radial effective-potential structure; redistribution can separate species between radial regions.',
    advantages: ['The tutorial identifies differential radial separation as an alternative to wall-versus-end collection.', '[Inference] Potential shaping offers another adjustable separation geometry.'],
    disadvantages: ['Useful redistribution depends on potential shape and collisionality.', 'Controlling the actual plasma potential and suppressing mixing remain necessary.'],
    fidelity: 'A prescribed effective-potential landscape is a diagnostic. It does not establish collisional redistribution, occupied populations or product purity without a transport model.',
    parameters: ['Radial potential shape', 'Potential amplitude', 'Magnetic field', 'Mass and charge', 'Temperature', 'Collisionality'],
  },
  {
    id: 'doublewell-dynamics', section: 'II D', title: 'Collisional double-well dynamics',
    mechanism: 'An equal-weight ion ensemble evolves in a prescribed quartic radial potential and axial magnetic field. Local binary Coulomb scattering changes energies and exchanges angular momentum between species while the full orbits determine radial redistribution and axial escape.',
    advantages: ['Shows the competition between redistribution, interspecies drag and finite residence time.', 'Closed-column and collisionless controls expose conservation and numerical errors independently of collection.'],
    disadvantages: ['Collision-cell size and particle occupancy can bias transport and produce numerical torque.', 'Small-angle Coulomb scattering needs timestep, particle and cell convergence; prescribed fields omit electron response, sheaths and turbulence.', 'A finite initial pulse is not a continuously fed device or an engineering throughput calculation.'],
    fidelity: 'A prescribed-field kinetic experiment, not a calibrated separator. Inspect total energy, canonical angular momentum, cell torque, collision resolution and low-occupancy diagnostics. The common-Ω equilibrium benchmark is not the paper’s independent species-frame Boltzmann population assumption.',
    parameters: ['Potential shape and amplitude', 'Column radius and length', 'Mass and charge', 'Initial temperature and rotation', 'Physical density and Coulomb logarithm', 'Open or closed boundaries', 'Particle count, cell size and timestep'],
  },
  {
    id: 'centrifugal', section: 'II E', title: 'Centrifugal end plug',
    mechanism: 'An inclined field line connects different radii. Moving inward encounters a rotation-dependent centrifugal barrier proportional to ion mass at fixed angular speed.',
    advantages: ['At the same parallel energy, light ions can cross a barrier that blocks heavier ions.'],
    disadvantages: ['Rotation and field-line geometry must be controlled.', 'A barrier inequality does not predict replenishment of escaping particles or throughput.'],
    fidelity: 'The tutorial’s effective-potential barrier is a reduced invariant-based diagnostic. A self-consistent rotating plasma and transport into the loss cone require additional modeling.',
    parameters: ['Angular velocity', 'Initial and end radii', 'Parallel energy', 'Mass', 'Field-line shape'],
  },
  {
    id: 'mirror', section: 'II E', title: 'Magnetic centrifugal mass filter (MCMF)',
    mechanism: 'Combines a small-radius centrifugal end plug favoring light-ion escape with a large-radius magnetic mirror whose rotation-modified loss cone can favor heavy-ion escape.',
    advantages: ['Two different end conditions can direct light and heavy species toward different outlets.', 'The tutorial describes a possible improvement over uniform-field separation.'],
    disadvantages: ['Collisions must refill loss cones without causing excessive perpendicular transport.', 'The tutorial reported no experimental results for these variable-field configurations in 2018.'],
    fidelity: 'Mirror/barrier diagnostics assume adiabatic invariants and imposed rotation. They do not by themselves model a complete MCMF, pitch-angle replenishment, end sheaths or experimental performance.',
    parameters: ['Mirror ratio', 'Radius ratio', 'Angular velocity', 'Pitch angle', 'Parallel and perpendicular energy', 'Collision rate'],
  },
  {
    id: 'rotatingmagnetic', section: 'II E', title: 'Rotating magnetic-field proposal',
    mechanism: 'The tutorial briefly identifies separation using rotating magnetic fields as a distinct proposal and points to external references.',
    advantages: ['[Inference] Time-dependent magnetic drive supplies a different control mechanism from static biased electrodes.'],
    disadvantages: ['Section II does not specify a complete field/particle model or quantitative design for this proposal.'],
    fidelity: 'Directory entry only; no standalone solver. A rotating E field in the ICR mode is not a rotating magnetic-field separator.',
    parameters: ['Magnetic-field waveform', 'Rotation frequency', 'Field amplitude', 'Geometry', 'Induced electric field'],
  },
  {
    id: 'poms', section: 'II F', title: 'Plasma-optical mass separation (POMS)',
    mechanism: 'A strong magnetic core, the azimuthator, redirects energetic ions; charge-separation fields and thermo-electron emission participate in the plasma optics.',
    advantages: ['The tutorial reports nitrogen, argon and krypton separation in POMS experiments.', 'Ions can be collected at distinct radial or axial locations.'],
    disadvantages: ['Energetic ion injection and nonuniform magnetic optics complicate the apparatus.', 'Charge-separation electric fields and emitted electrons cannot generally be omitted from predictive plasma optics.'],
    fidelity: 'A magnetic-core single-particle illustration is not a reproduction of an experimental POMS device. Section II alone does not supply a calibrated field map or electron-emission closure.',
    parameters: ['Injection energy', 'Core field map', 'Source geometry', 'Electric potential', 'Electron emission', 'Collector position'],
  },
  {
    id: 'azimuthal', section: 'II F', title: 'Azimuthal-B / radial-E separator',
    mechanism: 'A central conductor creates Bθ proportional to 1/r; a radial electric field from an assumed logarithmic potential changes injected ion orbits.',
    advantages: ['Calculations cited by the tutorial suggested spatial separation with little deposition on immersed electrodes.'],
    disadvantages: ['The proposed example requires a large steady central current and biased plasma electrodes.', 'The tutorial reported no experimental results for this mechanism in 2018.'],
    fidelity: 'This is a distinct Fig. 7 geometry, not POMS and not a magnetic cusp. Prescribed 1/r fields do not resolve electrode screening, current engineering or collector interception.',
    parameters: ['Central conductor current', 'Radial potential', 'Inner and outer radii', 'Injection direction', 'Ion energy', 'Mass and charge'],
  },
  {
    id: 'advection', section: 'II G', title: 'Neutral-friction radial advection',
    mechanism: 'Neutral friction on azimuthal ion rotation causes a cross-field radial drift. The tutorial estimate depends on neutral density, polarizability and reduced mass.',
    advantages: ['The mechanism can occur in spontaneously rotating linear plasmas.', '[Inference] It may exploit an existing flow instead of requiring selective RF heating.'],
    disadvantages: ['Mass dependence through reduced mass is weak.', 'Little experimental information establishes useful separation; it can also interfere with other separation methods.'],
    fidelity: 'The tutorial scaling is a rate estimate, not a complete transport solution. Neutral species, polarizability, collision law and evolving density profiles must be specified.',
    parameters: ['Radial electric field', 'Magnetic field', 'Neutral density', 'Neutral polarizability', 'Ion and neutral masses', 'Residence time'],
  },
  {
    id: 'collisionality', section: 'II G', title: 'Collisionality-gradient advection',
    mechanism: 'A collisionality gradient combined with ion diamagnetic flow produces a mass- and energy-dependent radial drift.',
    advantages: ['The tutorial cites a theoretical scheme with potentially substantial separation.'],
    disadvantages: ['Predictions depend on spatial gradients and the appropriate collisional transport regime.', 'Section II does not provide a closed numerical model for this variant.'],
    fidelity: 'Directory entry only; no standalone collisionality-gradient solver. A neutral-friction advection slider must not be presented as this different mechanism.',
    parameters: ['Collision-frequency profile', 'Density and temperature gradients', 'Magnetic field', 'Species energy', 'Boundary conditions'],
  },
  {
    id: 'diffusion', section: 'II H', title: 'Radial collisional diffusion',
    mechanism: 'Collisions randomize magnetized ion motion and produce radial transport. A larger gyroradius and a smaller collision frequency can cancel the expected mass dependence.',
    advantages: ['High-density, low-temperature collisional operation may reduce auxiliary heating requirements.', 'The conceptual transport geometry is simple.'],
    disadvantages: ['The tutorial’s magnetized heavy-ion-on-light-ion estimate is independent of heavy-ion mass, giving little or no separation.', 'In the strongly unmagnetized limit, isotropic diffusion does not itself create spatial mass separation.', 'Fluctuations can dominate classical diffusion.'],
    fidelity: 'A diffusion model must state which collision operator and magnetization limit produces its coefficient. Arbitrarily assigning mass-dependent diffusion would contradict the tutorial’s null result.',
    parameters: ['Background-ion density', 'Temperature', 'Magnetic field', 'Coulomb logarithm', 'Background and test masses', 'Geometry', 'Time'],
  },
  {
    id: 'mobility', section: 'II I', title: 'Collisional ion mobility',
    mechanism: 'An electric field produces drift with mobility μ=q/(mν). At specified collision frequencies, species have different mean drift speeds and fluxes.',
    advantages: ['An applied magnetic field is not required.', 'A mass-dependent collisional drift may be useful at relatively high throughput.'],
    disadvantages: ['Thermal diffusion competes with directed motion.', 'Debye shielding makes the assumed bulk electric field difficult to establish in a neutralized plasma.', 'Collision frequency is species- and regime-dependent; equal ν is an assumption, not a general gas property.'],
    fidelity: 'A prescribed drift–diffusion coefficient model is conditional on its collision frequencies and field. It is not a neutralized-plasma realization of commercial buffer-gas ion mobility spectrometry.',
    parameters: ['Electric field', 'Collision frequency or rate coefficient', 'Temperature', 'Mass and charge', 'Drift distance', 'Residence time'],
  },
  {
    id: 'ionwind', section: 'II I', title: 'Capillary discharge / ion wind',
    mechanism: 'The tutorial discusses isotope enrichment in capillary discharges, with differential ion–neutral friction proposed to explain enrichment opposite to simple mobility expectations.',
    advantages: ['The tutorial reports modest isotope enrichment in neon and krypton experiments.'],
    disadvantages: ['The process appears slow and was judged unlikely to suit high throughput.', 'Thermal diffusion, differential wall loss and ion wind are competing explanations, not interchangeable models.'],
    fidelity: 'Directory entry only; no standalone capillary-discharge solver. A μE drift model does not reproduce the reported ion-wind enrichment.',
    parameters: ['Discharge current', 'Gas pressure', 'Capillary geometry', 'Temperature gradients', 'Neutral flow', 'Wall loss'],
  },
  {
    id: 'ionization', section: 'II J', title: 'Differential ionization energy',
    mechanism: 'Control the electron distribution to ionize some elements or molecules more readily, then extract their ions separately from the remaining material.',
    advantages: ['Different ionization thresholds provide elemental selectivity.', 'The tutorial identifies low-threshold cesium as a potentially useful case.'],
    disadvantages: ['Ionization cross sections and their thermal averages vary gradually, limiting sharp selectivity.', 'This separates atomic/molecular chemistry; mass alone does not determine the ionization rate.'],
    fidelity: 'A threshold or arbitrary Arrhenius curve is not an atomic ionization calculation. Predictive fractions require species-specific cross sections, an electron energy distribution, recombination and exposure history.',
    parameters: ['Electron energy distribution', 'Species ionization cross sections', 'Electron density', 'Exposure time', 'Recombination rates', 'Extraction acceptance'],
  },
  {
    id: 'transit', section: 'II K', title: 'Transit-time / moving-collector separation',
    mechanism: 'A pulsed near-fixed-energy source produces mass-dependent flight times; synchronized moving collectors turn arrival time differences into deposition position differences.',
    advantages: ['Arrival time provides a direct separation coordinate.', 'A segmented rotating collector could make deposited fractions mechanically accessible.'],
    disadvantages: ['Requires a narrow low-energy distribution and low scattering.', 'Slit transmission and pulsed duty cycle reduce useful throughput.', 'Rapid rotary motion in vacuum introduces mechanical constraints.'],
    fidelity: 'Ballistic flight-time dispersion is a conditional benchmark. Real collection requires pulse width, energy spread, slits, collector speed/phase and collision losses, not just L/v.',
    parameters: ['Drift length', 'Ion energy and spread', 'Pulse width', 'Collector speed', 'Collector phase', 'Slit width', 'Mass and charge'],
  },
];
