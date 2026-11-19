import type { Component } from './component-catalog.js';

export const TUTORIAL_SOURCE='https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf';
export const LITHIUM_PRESET_VALUES:Readonly<Record<string,string>>={
 'system':'centrifuge','centrifuge-closure':'corotating','composition-boundary':'central',
 'mass-a':'6','mass-b':'7','charge-a':'1','charge-b':'1','rotation':'30000',
 'ion-temperature':'1','electron-temperature':'5','axis-fraction':'50','radial-cut':'0.70',
};
export const LITHIUM_PRESET_NOTE='Li-6 / Li-7 reference equilibrium with equal on-axis number fractions. This is not natural lithium feed, extracted enrichment or verified Marathon hardware. Orbit timestep limits still apply after a model change.';
type Insight={section:string;equation:string;meaning:string;observable:string;boundary:string;controls:string[]};
export const modelInsights:Record<string,Insight>={
 gyro:{section:'II A',equation:'Ωc = ZeB/m; ρ = √(2mE⊥)/(ZeB)',
  meaning:'More transverse energy gives larger orbits. A stronger magnetic field gives smaller orbits. Compare radii at a specified energy.',
  observable:'The plot shows two exact transverse orbits at fixed energy. Here, the energy control sets perpendicular kinetic energy, not a sampled temperature.',
  boundary:'This reduced view does not calculate thermal and pitch-angle spread, scattering, source width or collector acceptance.',controls:['mass-a','mass-b','charge-a','charge-b','parameter-magneticT','parameter-temperatureEV']},
 icr:{section:'II A',equation:'ωRF ≈ Ωc = ZeB/m; dK/dt = q E_RF · v',
  meaning:'The rotating electric field can repeatedly add energy to a resonant ion. Frequency, rotation direction and residence time matter, together with amplitude.',
  observable:'The specified RF changes ion destinations, residence time, energy and work. Tune the RF to A. Then change B or RF frequency to compare the species.',
  boundary:'RF amplitude is not antenna power. The model does not calculate wave coupling, density-dependent absorption, Coulomb broadening or the illustrated collector openings.',controls:['field','rf-frequency','rf-amplitude','rf-handedness','tune-rf','parallel']},
 curved:{section:'II B',equation:'vd = (2E∥ + E⊥)/(qBR); Δy = vd L/v∥',
  meaning:'At equal kinetic energies and charges, the drift speeds are equal. The heavier ion spends more time in the bend and has a larger deflection. At fixed bend angle L/R, R cancels.',
  observable:'The plots show guiding-center deflection against arc length, ρ/R and gyroperiods in the bend. The approximation needs small ρ/R and many gyroperiods.',
  boundary:'The model does not calculate self-generated polarization fields or slit transmission. Electron response can change the drift and remove the apparent separation.',controls:['parameter-magneticT','parameter-temperatureEV','parameter-beamEV','parameter-length','parameter-curvatureRadius']},
 centrifuge:{section:'II C',equation:'Equal Z: ln[(nB/nA)/(nB0/nA0)] = (mB−mA)Ω²r²/(2 e Ti[eV])',
  meaning:'Rotation competes with thermal spreading. Twice the angular speed gives four times the enrichment exponent. Twice the ion temperature gives half the exponent. For equal charges, the common electric-potential contribution cancels.',
  observable:'Local composition differs from cumulative cylindrical inventory. Central and whole-cylinder composition are different boundary conditions. The Gaussian branches also calculate current and magnetic response.',
  boundary:'All three branches use specified common ion rotation. A radial inventory cut does not extract material. The models do not calculate relaxation, drive torque, unstable mixing or power.',controls:['rotation','ion-temperature','centrifuge-closure','composition-boundary','axis-fraction','radial-cut']},
 rotating:{section:'II D',equation:'φ = V[1−(r/a)²]; (m/q)c = B²a²/(8V)',
  meaning:'The cold stability boundary is a mass-to-charge threshold. Wall position, axial flight time and source temperature also set particle destinations.',
  observable:'Cold source-edge radius and wall time give separate references. Sampled warm-ion paths and finite-pulse destination counts show the finite-device result.',
  boundary:'A bounded orbit can hit the wall. A growing orbit can leave through the end first. The model does not calculate electrode-to-bulk field penetration or collective fluctuations.',controls:['field','voltage','energy','parallel','distribution','source-radius']},
 doublewell:{section:'II D',equation:'Ueff = (Pθ−qBr²/2)²/(2mr²) + qV[(r/a)⁴−κ(r/a)²]',
  meaning:'Mass, potential shape and canonical angular momentum change which radial regions an ion can reach at a specified energy.',
  observable:'Each curve gives energy at fixed Pθ, not a population density. The inner plotting radius changes only the visible range.',
  boundary:'Different wells do not give extraction or purity. Their populations depend on initial conditions and collisions. For nonzero Pθ, the axis barrier increases without limit.',controls:['parameter-voltage','parameter-quadraticShape','parameter-canonicalMomentum','parameter-plotInnerFraction']},
 'doublewell-dynamics':{section:'II D',equation:'Pθ = mrvθ + qBr²/2; collisions exchange species momentum and energy',
  meaning:'Without collisions, each ion keeps its canonical momentum. Local collisions transfer it between ions. Spatial collision cells can also produce numerical torque.',
  observable:'Radial populations, energy and angular-momentum accounts change during a pulse or a closed common-Ω benchmark. Compare runs with and without collisions. Refine particle count, cells and timestep together.',
  boundary:'Spatial and particle convergence are not established. A closed equilibrium benchmark differs from initial conditions with zero mean Pθ for each species. The model does not calculate self-consistent electrons, neutrals or discharge fields.',controls:['dw-collisions','dw-rotationMode','dw-initialState','dw-boundary','dw-particlesPerSpecies','dw-cellsAcross','dw-dt']},
};
export const globalTakeaways=[
 {title:'Mass and charge',equation:'Ωc ∝ Z/m; cold cutoff selects m/Z',meaning:'Equal m/Z gives equal cyclotron frequency and cold cutoff. Equal Lorentz paths also need equal initial velocities. Equal kinetic energies do not give those velocities. Charge-state populations are fixed inputs.',status:'interactive'},
 {title:'Neutral and molecular bypass',equation:'λCX = 1/(n₀ σCX); P(no event) = exp(−L/λCX)',meaning:'Elastic neutral scattering keeps ion identity unchanged. Charge exchange, recombination, molecular breakup and dust bypass are separate missing processes. The separate event estimate does not change the orbit calculation.',status:'diagnostic'},
 {title:'Fields and mixing',equation:'E×B drift = E×B/B²; assumed 2D RMS = √(4Dt)',meaning:'Bias voltage does not guarantee the intended plasma potential. The model does not calculate polarization, current closure, sheaths or unstable fluctuations. The separate diffusion estimate uses D as an input and does not calculate turbulence.',status:'unresolved'},
 {title:'Useful output requires a budget',equation:'Mass flow = Σs ms Γs A; Pbeam or drive ≠ deposited ion energy alone',meaning:'Pulse destinations and static inventory do not give continuous throughput. Engineering performance needs complete accounts of source efficiency, collector acceptance, neutral contamination, electron and sheath losses, radiation and drive power.',status:'diagnostic'},
] as const;
export const coverage=[
 ...Object.entries(modelInsights).map(([mode,entry])=>({section:entry.section,mode,status:'interactive',controls:entry.controls,observable:entry.observable})),
 {section:'III A',mode:'fixed charges',status:'interactive',controls:['charge-a','charge-b'],observable:'Fixed-charge sensitivity. Evolving ionization populations are not calculated.'},
 {section:'III B/F',mode:'elastic neutral collisions',status:'interactive',controls:['neutral-density','neutral-cross-section','neutral-mass'],observable:'Rotating and ICR bath scattering. Neutral contamination transport is not calculated.'},
 {section:'III D/H/I/J',mode:'independent failure estimates',status:'diagnostic',controls:['failure-lab'],observable:'Specified event, spreading, radiation and sheath estimates. These do not change separator results.'},
 {section:'III C/E/G/H',mode:'reaction, dust, fields and instability',status:'unresolved',controls:['failure-lab'],observable:'Coverage lists the missing physics. Chemistry, grains, field penetration and turbulence are not calculated.'},
 {section:'III K',mode:'inventory and finite pulse',status:'diagnostic',controls:['radial-cut','live-plots'],observable:'Static cuts and finite-pulse destinations, not calibrated mass flow.'},
 {section:'II E–K',mode:'reference atlas',status:'reference',controls:['reference-atlas'],observable:'Mechanism illustrations and their advantages and disadvantages. These are outside the interactive A–D models.'},
];
const roles:Record<string,{source:string;coils:string;electrodes:string;collectors:string}>={
 gyro:{source:'Specified ion launch at fixed energy. The model does not calculate a discharge or thermal source.',coils:'Uniform axial B sets gyrofrequency and gyroradius.',electrodes:'No radial bias is needed in this reduced orbit diagnostic.',collectors:'Illustrative gyroradius-sensitive interception. No aperture transmission or collector counts are solved.'},
 icr:{source:'A specified drifting ion pulse supplies initial velocities. The model does not calculate ionization efficiency.',coils:'Axial B sets resonance. A separate RF launcher supplies the specified circular electric field. Static solenoids are not the RF antenna.',electrodes:'A real ICR separator can use biased collectors. This model does not calculate their local fields.',collectors:'The model absorbs the full end plane and wall. It does not model the drawn baffle apertures or biased plates.'},
 curved:{source:'Ideal ions enter a curved guide. The model does not include actual slit width or source angular spread.',coils:'The curved guide field causes curvature and grad-B drifts. B varies ideally as 1/R.',electrodes:'No external electric bias is applied. The model also excludes self-generated electron-ion polarization fields.',collectors:'Shows vertically separated arrival positions, not calculated slit acceptance or product streams.'},
 centrifuge:{source:'Shows a metal-vapor arc cathode. The equilibrium solver uses specified profiles, not a pulsed arc discharge.',coils:'The magnetic Gaussian branch specifies axis or wall B. The radial model calculates the plasma-current change to B.',electrodes:'A real arc needs a current circuit. The model specifies common ion rotation. It does not calculate drive voltage, the current circuit or sheaths.',collectors:'Radial collection is conceptual. The inventory cut partitions a static column and does not extract ions.'},
 rotating:{source:'A finite injected ion pulse with specified radius and velocity distribution.',coils:'Uniform axial B is an input. The model does not calculate coil current or cooling.',electrodes:'Annular bias rings show radial potential control. The model uses a specified bulk quadratic potential. It does not calculate the potential from these electrodes.',collectors:'Ideal cylindrical wall and full end plane absorb ions. Separate ring apertures are not in the numerical model.'},
 doublewell:{source:'This view has no injected particles. It plots the Hamiltonian, or total energy, at fixed canonical angular momentum.',coils:'Uniform axial B contributes to the canonical-momentum energy barrier.',electrodes:'Shows a shaped quartic bulk potential. The model does not calculate electrode, sheath or plasma response.',collectors:'An effective-potential plot does not calculate collection.'},
 'doublewell-dynamics':{source:'A finite pulse or a closed common-Ω benchmark, with equal particle weights and fixed species identities.',coils:'Uniform axial B is an input. The model does not evolve a coil circuit or induced magnetic response.',electrodes:'The quartic bulk potential acts directly on ions. The model does not calculate the discharge or electrode field penetration.',collectors:'Open boundaries absorb ions at the source, wall and end. The closed benchmark uses periodic z and a reflecting wall.'},
};
/** Semantic descriptions for the selected conceptual mechanism; no construction BOM inferred. */
export function modelComponents(mode:string):Component[]{
 const role=roles[mode];
 if(!role)return [];
 return [
  {id:'source',name:mode==='centrifuge'?'Conceptual arc source':'Ion source / initial state',purpose:role.source},
  {id:'coils',name:mode==='curved'?'Curved magnetic guide':'Magnetic-field system',purpose:role.coils},
  {id:'vessel',name:'Vacuum region and boundary',purpose:'Gives the simulation domain. Vessel geometry is for illustration. The model does not calculate pumping, contamination or wall temperature.'},
  {id:'electrodes',name:'Electric-field system',purpose:role.electrodes},
  {id:'collectors',name:'Collection / inventory region',purpose:role.collectors},
  {id:'insulators',name:'Electrical isolation',purpose:'Shows insulation around biased conductors. The model does not calculate dielectric charging or electrical breakdown.'},
  {id:'fittings',name:'Flanges and diagnostics',purpose:'Shows joints, fasteners and measurement connections. The model does not calculate vacuum conductance or instrument response.'},
  {id:'seals',name:'Vacuum seals',purpose:'Shows sealing surfaces. The model does not calculate leakage, permeation or service limits.'},
  {id:'supports',name:'Supports',purpose:'Shows the bed, saddles and isolation pads. The model does not calculate structural stress or vibration.'},
 ].map(c=>({...c,material:'Device construction materials are unknown here. Steel, copper and ceramic finishes are for illustration.',basis:'Shows the component function for this mode. It does not give an as-built device or a verified parts list.',source:TUTORIAL_SOURCE}));
}
