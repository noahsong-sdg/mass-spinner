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
    mechanism: 'The gyroradius is the ion orbit radius around a magnetic field line. Different radii give different collection positions. Perpendicular speed, mass, charge and magnetic field set the radius.',
    advantages: ['Geometric separation without fast bulk rotation or a large radial plasma potential.'],
    disadvantages: ['Thermal speed and pitch-angle spread give a range of orbit radii.', 'Ions must complete an orbit without strong scattering. Collector geometry and source width set the separation resolution.'],
    fidelity: 'The model calculates single-ion orbits in specified fields. Collection calculations need the actual source and collector geometry. Orbit radius alone does not give purity.',
    parameters: ['Magnetic field', 'Mass and charge', 'Perpendicular energy or temperature', 'Source width', 'Collector acceptance', 'Collision frequency'],
  },
  {
    id: 'icr', section: 'II A', title: 'Ion cyclotron resonance heating',
    mechanism: 'Radio-frequency (RF) fields increase the perpendicular energy of resonant species. Collectors use the different orbit radii to separate heated and unheated ions.',
    advantages: ['Frequency selects the resonant species.', 'The tutorial describes use for isotope separation as well as separation between elements.'],
    disadvantages: ['RF coupling and heating become difficult at high density and throughput.', 'Heating requires energy. RF heating alone does not extract the ions.'],
    fidelity: 'The browser applies a uniform circular RF field to test particles. It does not calculate antenna fields, plasma dielectric response, RF propagation or biased extraction collectors.',
    parameters: ['RF frequency', 'RF amplitude', 'Polarization', 'Interaction time', 'Magnetic field', 'Mass and charge', 'Initial energy spread'],
  },
  {
    id: 'curved', section: 'II B', title: 'Ion drift-orbit separation',
    mechanism: 'Curvature and magnetic-field-gradient drifts move ions across a bent magnetic guide. Velocity components and the bend angle set the displacement.',
    advantages: ['Separation can occur without an externally applied electric field.', 'The tutorial suggests permanent magnets as a simpler field source.'],
    disadvantages: ['Electron–ion separation creates an electric field that can move all species together and suppress separation.', 'A narrow source slit is necessary for distinct collection positions.', 'Guiding-center estimates require gyroradius much smaller than the curvature radius.'],
    fidelity: 'The drift estimate uses specified fields. It does not include self-generated electric fields, source acceptance or collector geometry. High-throughput separation is not established.',
    parameters: ['Bend angle', 'Curvature radius', 'Magnetic field', 'Parallel and perpendicular energy', 'Source slit width', 'Collisionality'],
  },
  {
    id: 'centrifuge', section: 'II C', title: 'Plasma centrifuge equilibria',
    mechanism: 'Fast azimuthal rotation changes radial force balance. Mass and charge change the equilibrium species profiles.',
    advantages: ['A vacuum arc supplies plasma and rotation.', 'Separation can operate at higher collisionality than collisionless orbit filters.'],
    disadvantages: ['Instabilities can mix the species again.', 'The illustrated vacuum-arc source requires a conducting solid target.', 'The tutorial reports low throughput and high energy costs for some earlier devices.'],
    fidelity: 'The model offers common-corotation, specified-field Gaussian and coupled magnetic Gaussian equilibria. All specify ion rotation. Gaussian branches specify density and show current, magnetic response and electron-inertia limits. Central and bulk composition are different boundary conditions. These equilibria do not calculate relaxation, extraction or arc power.',
    parameters: ['Angular velocity', 'Ion and electron temperatures', 'Mass and charge', 'Central or bulk composition', 'Gaussian density width and axis density', 'Imposed B', 'Radius'],
  },
  {
    id: 'rotating', section: 'II D', title: 'Uniform-B rotating / Archimedes filter',
    mechanism: 'A radial electric field drives rotation. Above a mass-to-charge threshold, ions can lose radial confinement. Ions reach the wall or the end collector.',
    advantages: ['External biased electrodes supply control.', 'Uniform axial magnetic geometry is relatively simple.'],
    disadvantages: ['Near-collisionless operation limits density and throughput.', 'The applied electrode voltage does not guarantee the specified bulk radial potential.', 'Rotation can be limited by neutral-related effects, and fluctuations can mix species.'],
    fidelity: 'The model calculates full orbits in specified fields until the first boundary hit. The cold infinite-device threshold does not give finite-device purity. The model does not calculate field penetration, plasma response or turbulence.',
    parameters: ['Axis-to-wall potential', 'Magnetic field', 'Radius', 'Length', 'Source distribution', 'Mass and charge', 'Collisions'],
  },
  {
    id: 'doublewell', section: 'II D', title: 'Double-well mass filter',
    mechanism: 'A shaped radial potential gives a mass-dependent effective potential. Redistribution can separate species between radial regions.',
    advantages: ['The tutorial identifies differential radial separation as an alternative to wall-versus-end collection.', '[Inference] Potential shaping supplies another separation control.'],
    disadvantages: ['Useful redistribution depends on potential shape and collisionality.', 'The device must control the actual plasma potential and limit mixing.'],
    fidelity: 'This effective-potential plot uses a specified field. Without a transport model, it does not give collisional redistribution, occupied populations or product purity.',
    parameters: ['Radial potential shape', 'Potential amplitude', 'Magnetic field', 'Mass and charge', 'Temperature', 'Collisionality'],
  },
  {
    id: 'doublewell-dynamics', section: 'II D', title: 'Collisional double-well dynamics',
    mechanism: 'Equal-weight ions move in a specified quartic radial potential and axial magnetic field. Local binary Coulomb scattering exchanges energy and angular momentum between species. Full orbits set radial redistribution and axial escape.',
    advantages: ['Shows the competing effects of redistribution, interspecies drag and limited residence time.', 'Closed-column and collisionless controls show conservation and numerical errors separately from collection.'],
    disadvantages: ['Collision-cell size and the number of particles per cell can bias transport and produce numerical torque.', 'Small-angle Coulomb scattering needs timestep, particle and cell convergence. Specified fields do not include electron response, sheaths or turbulence.', 'The initial pulse does not describe a continuous source or give engineering throughput.'],
    fidelity: 'This kinetic experiment uses specified fields. It is not a calibrated separator. Examine total energy, canonical angular momentum, cell torque, collision resolution and particles per cell. The common-Ω equilibrium benchmark differs from the paper’s separate species-frame Boltzmann population assumption.',
    parameters: ['Potential shape and amplitude', 'Column radius and length', 'Mass and charge', 'Initial temperature and rotation', 'Physical density and Coulomb logarithm', 'Open or closed boundaries', 'Particle count, cell size and timestep'],
  },
  {
    id: 'centrifugal', section: 'II E', title: 'Centrifugal end plug',
    mechanism: 'An inclined field line connects different radii. Inward motion meets a centrifugal barrier. At fixed angular speed, the barrier increases in proportion to ion mass.',
    advantages: ['At the same parallel energy, light ions can cross a barrier that blocks heavier ions.'],
    disadvantages: ['The device must control rotation and field-line geometry.', 'A barrier inequality does not give the replacement rate of escaping particles or the throughput.'],
    fidelity: 'The tutorial calculates an effective-potential barrier from conserved quantities. A complete model must also calculate the rotating plasma and transport into the loss cone.',
    parameters: ['Angular velocity', 'Initial and end radii', 'Parallel energy', 'Mass', 'Field-line shape'],
  },
  {
    id: 'mirror', section: 'II E', title: 'Magnetic centrifugal mass filter (MCMF)',
    mechanism: 'A small-radius centrifugal end plug lets light ions escape more easily. A large-radius magnetic mirror has a rotation-modified loss cone that can favor heavy-ion escape.',
    advantages: ['Different conditions at the two ends can send light and heavy species toward different outlets.', 'The tutorial describes a possible improvement on uniform-field separation.'],
    disadvantages: ['Collisions must refill loss cones without causing excessive perpendicular transport.', 'The tutorial reported no experimental results for these variable-field configurations in 2018.'],
    fidelity: 'The mirror and barrier calculations use adiabatic invariants and specified rotation. They do not give a complete MCMF, pitch-angle replenishment, end sheaths or experimental performance.',
    parameters: ['Mirror ratio', 'Radius ratio', 'Angular velocity', 'Pitch angle', 'Parallel and perpendicular energy', 'Collision rate'],
  },
  {
    id: 'rotatingmagnetic', section: 'II E', title: 'Rotating magnetic-field proposal',
    mechanism: 'The tutorial describes rotating magnetic fields as a separate proposal and gives references.',
    advantages: ['[Inference] A time-dependent magnetic drive supplies a different control mechanism from static biased electrodes.'],
    disadvantages: ['Section II does not specify a complete field/particle model or quantitative design for this proposal.'],
    fidelity: 'Reference description only. No separate solver is available. The rotating electric field in ICR mode differs from a rotating magnetic-field separator.',
    parameters: ['Magnetic-field waveform', 'Rotation frequency', 'Field amplitude', 'Geometry', 'Induced electric field'],
  },
  {
    id: 'poms', section: 'II F', title: 'Plasma-optical mass separation (POMS)',
    mechanism: 'A strong magnetic core, the azimuthator, changes the direction of energetic ions. Charge-separation fields and thermionic electron emission also change the plasma optics.',
    advantages: ['The tutorial reports nitrogen, argon and krypton separation in POMS experiments.', 'Ions can be collected at distinct radial or axial locations.'],
    disadvantages: ['Energetic ion injection and nonuniform magnetic optics make the apparatus more complex.', 'Accurate plasma-optics calculations usually need charge-separation electric fields and emitted electrons.'],
    fidelity: 'The single-particle magnetic-core illustration does not reproduce an experimental POMS device. Section II does not supply a calibrated field map or electron-emission model.',
    parameters: ['Injection energy', 'Core field map', 'Source geometry', 'Electric potential', 'Electron emission', 'Collector position'],
  },
  {
    id: 'azimuthal', section: 'II F', title: 'Azimuthal-B / radial-E separator',
    mechanism: 'A central conductor creates Bθ proportional to 1/r. A specified logarithmic potential supplies a radial electric field that changes injected ion orbits.',
    advantages: ['Calculations in the tutorial suggest spatial separation with little deposition on immersed electrodes.'],
    disadvantages: ['The proposed example requires a large steady central current and biased plasma electrodes.', 'The tutorial reported no experimental results for this mechanism in 2018.'],
    fidelity: 'This Fig. 7 geometry differs from POMS and a magnetic cusp. Specified 1/r fields do not calculate electrode screening, current engineering or collector interception.',
    parameters: ['Central conductor current', 'Radial potential', 'Inner and outer radii', 'Injection direction', 'Ion energy', 'Mass and charge'],
  },
  {
    id: 'advection', section: 'II G', title: 'Neutral-friction radial advection',
    mechanism: 'Neutral friction on azimuthally rotating ions causes cross-field radial drift. The tutorial estimate depends on neutral density, polarizability and reduced mass.',
    advantages: ['The mechanism can occur in spontaneously rotating linear plasmas.', '[Inference] An existing flow can supply the drive without selective RF heating.'],
    disadvantages: ['Mass dependence through reduced mass is weak.', 'Experimental support for useful separation is limited. This drift can also interfere with other separation methods.'],
    fidelity: 'The tutorial scaling gives a rate estimate, not a complete transport solution. The model needs neutral species, polarizability, a collision law and evolving density profiles.',
    parameters: ['Radial electric field', 'Magnetic field', 'Neutral density', 'Neutral polarizability', 'Ion and neutral masses', 'Residence time'],
  },
  {
    id: 'collisionality', section: 'II G', title: 'Collisionality-gradient advection',
    mechanism: 'A collisionality gradient with ion diamagnetic flow produces radial drift that depends on mass and energy.',
    advantages: ['The tutorial cites a theoretical scheme with a possibly large separation effect.'],
    disadvantages: ['Predictions depend on spatial gradients and the appropriate collisional transport regime.', 'Section II does not provide a closed numerical model for this variant.'],
    fidelity: 'Reference description only. No separate collisionality-gradient solver is available. The neutral-friction advection slider controls a different mechanism.',
    parameters: ['Collision-frequency profile', 'Density and temperature gradients', 'Magnetic field', 'Species energy', 'Boundary conditions'],
  },
  {
    id: 'diffusion', section: 'II H', title: 'Radial collisional diffusion',
    mechanism: 'Collisions change magnetized ion motion and produce radial transport. A larger gyroradius and a smaller collision frequency can cancel the expected mass dependence.',
    advantages: ['High-density, low-temperature collisional operation can decrease the necessary auxiliary heating.', 'The conceptual transport geometry is simple.'],
    disadvantages: ['The tutorial’s magnetized heavy-ion-on-light-ion estimate is independent of heavy-ion mass, giving little or no separation.', 'In the strongly unmagnetized limit, isotropic diffusion alone does not create spatial mass separation.', 'Fluctuations can dominate classical diffusion.'],
    fidelity: 'A diffusion model must specify the collision operator and magnetization limit for its coefficient. Unsupported mass-dependent diffusion coefficients would contradict the tutorial’s null result.',
    parameters: ['Background-ion density', 'Temperature', 'Magnetic field', 'Coulomb logarithm', 'Background and test masses', 'Geometry', 'Time'],
  },
  {
    id: 'mobility', section: 'II I', title: 'Collisional ion mobility',
    mechanism: 'An electric field produces drift with mobility μ=q/(mν). At specified collision frequencies, species can have different mean drift speeds and fluxes.',
    advantages: ['An applied magnetic field is not required.', 'Mass-dependent collisional drift can be useful at relatively high throughput.'],
    disadvantages: ['Thermal diffusion competes with directed motion.', 'Debye shielding makes the specified bulk electric field difficult to establish in a neutralized plasma.', 'Collision frequency depends on species and regime. Equal ν is an assumption, not a general gas property.'],
    fidelity: 'The drift–diffusion model depends on its specified collision frequencies and field. It does not reproduce commercial buffer-gas ion mobility spectrometry in a neutralized plasma.',
    parameters: ['Electric field', 'Collision frequency or rate coefficient', 'Temperature', 'Mass and charge', 'Drift distance', 'Residence time'],
  },
  {
    id: 'ionwind', section: 'II I', title: 'Capillary discharge / ion wind',
    mechanism: 'The tutorial reports isotope enrichment in capillary discharges. Different ion–neutral friction rates are a proposed explanation for enrichment opposite to simple mobility expectations.',
    advantages: ['The tutorial reports modest isotope enrichment in neon and krypton experiments.'],
    disadvantages: ['The reported process is slow. The tutorial considers high throughput unlikely.', 'Thermal diffusion, different wall-loss rates and ion wind are competing explanations. They are not interchangeable models.'],
    fidelity: 'Reference description only. No separate capillary-discharge solver is available. A μE drift model does not reproduce the reported ion-wind enrichment.',
    parameters: ['Discharge current', 'Gas pressure', 'Capillary geometry', 'Temperature gradients', 'Neutral flow', 'Wall loss'],
  },
  {
    id: 'ionization', section: 'II J', title: 'Differential ionization energy',
    mechanism: 'The electron distribution changes the ionization rates of elements or molecules. Separate extraction of their ions can then separate the material.',
    advantages: ['Different ionization thresholds help select elements.', 'The tutorial gives low-threshold cesium as a possibly useful case.'],
    disadvantages: ['Ionization cross sections and their thermal averages change gradually. This limits selectivity.', 'This process separates different atomic or molecular species. Mass alone does not set the ionization rate.'],
    fidelity: 'A threshold or an unsupported Arrhenius curve does not give an atomic ionization calculation. Accurate fractions need species-specific cross sections, an electron energy distribution, recombination and exposure history.',
    parameters: ['Electron energy distribution', 'Species ionization cross sections', 'Electron density', 'Exposure time', 'Recombination rates', 'Extraction acceptance'],
  },
  {
    id: 'transit', section: 'II K', title: 'Transit-time / moving-collector separation',
    mechanism: 'A pulse with nearly fixed energy produces mass-dependent flight times. Moving collectors use the different arrival times to deposit ions at different positions.',
    advantages: ['Arrival time gives a direct separation coordinate.', 'A segmented rotating collector can give mechanical access to deposited fractions.'],
    disadvantages: ['Requires a narrow low-energy distribution and little scattering.', 'Slit transmission and pulsed duty cycle reduce useful throughput.', 'Fast rotary motion in vacuum adds mechanical limits.'],
    fidelity: 'Ballistic flight-time dispersion gives a conditional reference. Real collection calculations need pulse width, energy spread, slits, collector speed and phase, and collision losses. L/v alone is not sufficient.',
    parameters: ['Drift length', 'Ion energy and spread', 'Pulse width', 'Collector speed', 'Collector phase', 'Slit width', 'Mass and charge'],
  },
];
