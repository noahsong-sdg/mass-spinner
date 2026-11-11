import type { Component } from './component-catalog.js';

export const TUTORIAL_SOURCE='https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf';
export const LITHIUM_PRESET_VALUES:Readonly<Record<string,string>>={
 'system':'centrifuge','centrifuge-closure':'corotating','composition-boundary':'central',
 'mass-a':'6','mass-b':'7','charge-a':'1','charge-b':'1','rotation':'30000',
 'ion-temperature':'1','electron-temperature':'5','axis-fraction':'50','radial-cut':'0.70',
};
export const LITHIUM_PRESET_NOTE='Illustrative Li-6 / Li-7 equilibrium with equal on-axis number fractions. Not natural lithium feed, extracted enrichment, or a reconstruction of Marathon hardware. Orbit timestep limits still apply when changing models.';
type Insight={section:string;equation:string;meaning:string;observable:string;boundary:string;controls:string[]};
export const modelInsights:Record<string,Insight>={
 gyro:{section:'II A',equation:'Ωc = ZeB/m; ρ = √(2mE⊥)/(ZeB)',
  meaning:'More transverse energy makes larger circles; more magnetic field makes smaller circles. Compare radii at a declared energy, not an unspecified speed.',
  observable:'The plot traces two exact monoenergetic transverse orbits. The energy control is fixed perpendicular kinetic energy here, not a sampled temperature.',
  boundary:'Thermal and pitch-angle spread, scattering, source width and collector acceptance are not solved in this reduced view.',controls:['mass-a','mass-b','charge-a','charge-b','parameter-magneticT','parameter-temperatureEV']},
 icr:{section:'II A',equation:'ωRF ≈ Ωc = ZeB/m; dK/dt = q E_RF · v',
  meaning:'The rotating electric field can add energy repeatedly to a resonant ion. Frequency, handedness and residence time matter as well as amplitude.',
  observable:'Full-orbit destinations, residence and ion energy/work respond to prescribed RF. Tune to A, then vary B or RF frequency to compare the two species.',
  boundary:'RF amplitude is not antenna power. Wave coupling, density-dependent absorption, Coulomb broadening and the illustrated collector apertures are not calculated.',controls:['field','rf-frequency','rf-amplitude','rf-handedness','tune-rf','parallel']},
 curved:{section:'II B',equation:'vd = (2E∥ + E⊥)/(qBR); Δy = vd L/v∥',
  meaning:'At equal kinetic energies and equal charge the drift speeds match. The heavier ion spends longer in the bend, producing a larger deflection. At fixed bend angle L/R, R cancels.',
  observable:'Guiding-centre deflection versus arc length, ρ/R and gyroperiods in the bend. The approximation needs small ρ/R and many gyroperiods.',
  boundary:'No self-generated polarization field or slit transmission is solved. Electron response can change the drift and remove the apparent separation.',controls:['parameter-magneticT','parameter-temperatureEV','parameter-beamEV','parameter-length','parameter-curvatureRadius']},
 centrifuge:{section:'II C',equation:'Equal Z: ln[(nB/nA)/(nB0/nA0)] = (mB−mA)Ω²r²/(2 e Ti[eV])',
  meaning:'Rotation competes with thermal spreading. Doubling angular speed quadruples this enrichment exponent; doubling ion temperature halves it. Equal charges cancel the common electric-potential contribution.',
  observable:'Local composition and cumulative cylindrical inventory are distinct. Central and whole-cylinder composition are different boundary conditions. The Gaussian branches additionally diagnose current and magnetic response.',
  boundary:'All three branches impose common ion rotation. A radial inventory cut is not an extraction process; relaxation, drive torque, unstable mixing and power are unsolved.',controls:['rotation','ion-temperature','centrifuge-closure','composition-boundary','axis-fraction','radial-cut']},
 rotating:{section:'II D',equation:'φ = V[1−(r/a)²]; (m/q)c = B²a²/(8V)',
  meaning:'The cold stability boundary is a mass-to-charge threshold. A finite wall, axial flight time and thermal source determine destinations beyond that threshold.',
  observable:'Cold source-edge radius and wall time are separate references alongside sampled warm-orbit excursions and finite-pulse destination statistics.',
  boundary:'A bounded orbit may hit the wall; a growing orbit may leave through the end first. Electrode-to-bulk field penetration and collective fluctuations are not solved.',controls:['field','voltage','energy','parallel','distribution','source-radius']},
 doublewell:{section:'II D',equation:'Ueff = (Pθ−qBr²/2)²/(2mr²) + qV[(r/a)⁴−κ(r/a)²]',
  meaning:'Changing mass, shaped potential and canonical angular momentum changes which radial regions are energetically accessible.',
  observable:'Each curve is one fixed-Pθ energy landscape, not a population density. Changing the inner plotting radius only crops the view.',
  boundary:'Different wells do not establish extraction or purity. Populating them requires initial-state and collision dynamics; nonzero Pθ has a divergent axis barrier.',controls:['parameter-voltage','parameter-quadraticShape','parameter-canonicalMomentum','parameter-plotInnerFraction']},
 'doublewell-dynamics':{section:'II D',equation:'Pθ = mrvθ + qBr²/2; collisions exchange species momentum and energy',
  meaning:'The collisionless control preserves individual canonical momentum. Local collisions redistribute it between ions; spatial collision cells can also introduce numerical torque.',
  observable:'Radial populations, energy and angular-momentum budgets evolve for a pulse or a closed common-Ω benchmark. Compare collisions off/on and co-refine particle count, cells and timestep.',
  boundary:'Spatial/particle convergence is not established. A closed equilibrium benchmark differs from species-specific zero-mean-Pθ initialization. No self-consistent electrons, neutrals or discharge fields.',controls:['dw-collisions','dw-rotationMode','dw-initialState','dw-boundary','dw-particlesPerSpecies','dw-cellsAcross','dw-dt']},
};
export const globalTakeaways=[
 {title:'Mass and charge',equation:'Ωc ∝ Z/m; cold cutoff selects m/Z',meaning:'Equal m/Z gives equal cyclotron frequency and cold cutoff. Identical Lorentz trajectories additionally require identical initial velocities; equal kinetic energies do not supply those velocities. Charge-state populations are fixed, not predicted.',status:'interactive'},
 {title:'Neutral and molecular bypass',equation:'λCX = 1/(n₀ σCX); P(no event) = exp(−L/λCX)',meaning:'Elastic neutral scattering preserves ion identity. Charge exchange, recombination, molecular breakup and dust bypass are separate missing pathways; the independent event estimate does not change the orbit calculation.',status:'diagnostic'},
 {title:'Fields and mixing',equation:'E×B drift = E×B/B²; assumed 2D RMS = √(4Dt)',meaning:'Bias voltage does not guarantee the desired plasma potential. Polarization, current closure, sheaths and unstable fluctuations remain unsolved. The independent diffusion estimate assumes D and does not predict turbulence.',status:'unresolved'},
 {title:'Useful output requires a budget',equation:'Mass flow = Σs ms Γs A; Pbeam or drive ≠ deposited ion energy alone',meaning:'Pulse destinations and static inventory are not continuous throughput. Source efficiency, collector acceptance, neutral contamination, electron/sheath losses, radiation and drive power must close before quoting engineering performance.',status:'diagnostic'},
] as const;
export const coverage=[
 ...Object.entries(modelInsights).map(([mode,entry])=>({section:entry.section,mode,status:'interactive',controls:entry.controls,observable:entry.observable})),
 {section:'III A',mode:'fixed charges',status:'interactive',controls:['charge-a','charge-b'],observable:'Fixed-charge sensitivity; evolving ionization populations unresolved.'},
 {section:'III B/F',mode:'elastic neutral collisions',status:'interactive',controls:['neutral-density','neutral-cross-section','neutral-mass'],observable:'Rotating/ICR bath scattering; no neutral contamination transport.'},
 {section:'III D/H/I/J',mode:'independent failure estimates',status:'diagnostic',controls:['failure-lab'],observable:'Assumed event, spreading, radiation and sheath budgets; no feedback to separators.'},
 {section:'III C/E/G/H',mode:'reaction, dust, fields and instability',status:'unresolved',controls:['failure-lab'],observable:'Coverage and required physics are visible; no solved chemistry, grains, penetration or turbulence.'},
 {section:'III K',mode:'inventory and finite pulse',status:'diagnostic',controls:['radial-cut','live-plots'],observable:'Static cuts and finite-pulse destinations, not calibrated mass flow.'},
 {section:'II E–K',mode:'reference atlas',status:'reference',controls:['reference-atlas'],observable:'Illustrated mechanisms and tradeoffs; outside the A–D interactive scope.'},
];
const roles:Record<string,{source:string;coils:string;electrodes:string;collectors:string}>={
 gyro:{source:'Assumed monoenergetic ion launch, not a discharge or thermal source.',coils:'Uniform axial B sets gyrofrequency and gyroradius.',electrodes:'No radial bias is needed in this reduced orbit diagnostic.',collectors:'Illustrative gyroradius-sensitive interception. No aperture transmission or collector counts are solved.'},
 icr:{source:'An assumed drifting ion pulse supplies initial velocities; no ionization efficiency is solved.',coils:'Axial B sets resonance. A separate conceptual RF launcher supplies the prescribed circular electric field; static solenoids are not the RF antenna.',electrodes:'A real ICR separator can use biased collectors; this model does not solve their local fields.',collectors:'The model absorbs the full end plane and wall. It does not model the drawn baffle apertures or biased plates.'},
 curved:{source:'Ideal ions enter a curved guide. A real slit width and source angular spread are not represented.',coils:'Curved guiding field generates curvature and grad-B drifts; B varies ideally as 1/R.',electrodes:'No external electric bias is imposed. Self-generated electron-ion polarization fields are also omitted.',collectors:'Indicates vertically separated arrival locations, not calculated slit acceptance or product streams.'},
 centrifuge:{source:'Conceptually a metal-vapor arc cathode; the equilibrium solver prescribes profiles instead of a pulsed arc discharge.',coils:'Axis or wall B is prescribed in the magnetic Gaussian branch; the radial closure calculates its plasma-current modification.',electrodes:'A real arc requires a current circuit. Common ion rotation is imposed; drive voltage, current circuit and sheaths are not solved.',collectors:'Radial collection is conceptual. The inventory cut partitions a static column and does not extract ions.'},
 rotating:{source:'A finite injected ion pulse with specified radius and velocity distribution.',coils:'Uniform axial B is prescribed directly; coil current and cooling are not calculated.',electrodes:'Annular bias rings illustrate radial potential control. Bulk quadratic potential is prescribed, not derived from these electrodes.',collectors:'Ideal cylindrical wall and full end plane absorb ions. Separate ring apertures are not in the numerical model.'},
 doublewell:{source:'No particles are injected in this view; it plots a fixed-canonical-momentum Hamiltonian.',coils:'Uniform axial B contributes to the canonical-momentum energy barrier.',electrodes:'Illustrates a shaped quartic bulk potential, not solved electrode, sheath or plasma response.',collectors:'No collection is computed by an effective-potential landscape.'},
 'doublewell-dynamics':{source:'A finite pulse or a closed common-Ω benchmark, with equal particle weights and fixed species identities.',coils:'Uniform axial B is prescribed; no coil circuit or induced magnetic response is evolved.',electrodes:'The quartic bulk potential acts directly on ions. No discharge or electrode penetration is solved.',collectors:'Open boundaries absorb at source, wall and end; the closed benchmark instead uses periodic z and a reflecting wall.'},
};
/** Semantic descriptions for the selected conceptual mechanism; no construction BOM inferred. */
export function modelComponents(mode:string):Component[]{
 const role=roles[mode];
 if(!role)return [];
 return [
  {id:'source',name:mode==='centrifuge'?'Conceptual arc source':'Ion source / initial state',purpose:role.source},
  {id:'coils',name:mode==='curved'?'Curved magnetic guide':'Magnetic-field system',purpose:role.coils},
  {id:'vessel',name:'Vacuum region and boundary',purpose:'Provides the modeled spatial domain. Vessel geometry is conceptual; pumping, contamination and wall temperature are not solved.'},
  {id:'electrodes',name:'Electric-field system',purpose:role.electrodes},
  {id:'collectors',name:'Collection / inventory region',purpose:role.collectors},
  {id:'insulators',name:'Electrical isolation',purpose:'Conceptual insulation around biased conductors; dielectric charging and breakdown are not calculated.'},
  {id:'fittings',name:'Flanges and diagnostics',purpose:'Illustrative joints, fasteners and diagnostic connections; vacuum conductance and instrument response are not solved.'},
  {id:'seals',name:'Vacuum seals',purpose:'Illustrative sealing interfaces; leakage, permeation and service limits are not solved.'},
  {id:'supports',name:'Supports',purpose:'Illustrative bed, saddles and isolation pads; structural stresses and vibrations are not solved.'},
 ].map(c=>({...c,material:'Device construction materials are unspecified here. Any steel, copper or ceramic appearance is illustrative.',basis:'Mode-specific conceptual role, not an as-built device or validated bill of materials.',source:TUTORIAL_SOURCE}));
}
