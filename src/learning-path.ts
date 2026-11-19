/** Optional experiments over the existing models; these pages never compute substitute physics. */
export type LearningAction = readonly [action:string,label:string];
export type LearningExperiment = {
 id:string; title:string; baseline:string; steps:readonly string[];
 actions:readonly LearningAction[]; observe:string; explain:string; boundary:string;
};
export type LearningModule = {
 id:string; title:string; scope:string; equation:string;
 equationTerms?:readonly {symbol:string;meaning:string;action:string}[];
 experiments:readonly LearningExperiment[];
};

export const learningPath = [
 {
  id:'controls',title:'Controls and readouts',
  scope:'Centrifuge · a closed gas inventory in a stationary vessel. Aim for an enriched sample that retains useful light-isotope inventory.',
  equation:'drive',experiments:[
   {
    id:'input',title:'First establish what the drive does',
    baseline:'Choose Centrifuge with nonzero magnetic field and ion–neutral coupling. Start from rest & edit current clears drive history. Set current to 0 A; leave other inputs fixed and wait for Updating to finish.',
    steps:['Show end-of-run speeds. Then prepare the same experiment at 0.03 A and wait for the accepted result.','Compare the speeds at the same physical time. Inspect rotation before asking whether composition changed.'],
    actions:[['currentExperiment','Start from rest & edit current'],['endSpin','Show end-of-run speeds'],['look','See gas & drive']],
    observe:'From rest, zero current supplies no torque. At 0.03 A with nonzero field, ions accelerate and collisions turn neutrals.',
    explain:'Radial current across the axial field produces sideways force. The vessel stays still; arrows show force direction.',
    boundary:'Current and collision rate are prescribed, not discharge predictions. A mid-run current edit changes drive history; New run clears it.',
   },
   {
    id:'picture',title:'Now change only the picture',
    baseline:'Keep one accepted run without changing physical inputs.',
    steps:['Open View. Move Probe radius / vessel radius from axis to wall; inspect Composition and Species density.','Switch gas display or rotate the camera. Open Inspect: selecting a component highlights it; use its Adjust link to edit the input in Controls.'],
    actions:[['view','Open View'],['compositionPlot','Show composition at selected time'],['density','Show species density'],['axis','Probe axis'],['wall','Probe wall'],['inspect','Open Inspect']],
    observe:'Probes sample another radius of the same state. Display settings and playback do not rerun its physics. Moving the slice adds no axial structure to this radial model.',
    explain:'History plots show when; radial profiles show where at the selected time; parameter scans compare hypothetical settings.',
    boundary:'Read the color scale and clipping. Weighted tracers are population samples, not atoms or plasma emission; vivid colors can encode tiny enrichment.',
   },
  ],
 },
 {
  id:'transport',title:'Separation over time',
  scope:'Centrifuge · distinguish finite-time redistribution from an ideal settled reference.',
  equationTerms:[{symbol:'Ω',meaning:'gas angular speed: read edge speed divided by vessel radius',action:'spinPlot'},{symbol:'T',meaning:'initial / bath gas temperature; the uniform equilibrium reference is not an evolved spatial temperature field',action:'gasTemperature'},{symbol:'Δm',meaning:'heavy minus light atomic mass: set by Feed',action:'controls'}],
  equation:'collection',experiments:[
   {
    id:'clocks',title:'Follow two clocks',
    baseline:'Use mixed-feed Coupled separation, Isotope separation and nonzero drive, with thermal evolution off. Record physical time. Reset ↺ replaces your settings.',
    steps:['Show spin-up, then Separation over time. Use the same selected physical time to compare them.','Pin A. Change only Assumed radial diffusivity, explicitly start New run, and compare at a time covered by both runs. Inspect speed too.'],
    actions:[['spinPlot','Show speed history'],['separationPlot','Show separation over time'],['pin','Pin accepted run A'],['diffusion','Adjust diffusivity'],['newRun','New run']],
    observe:'Spin-up and redistribution have different timescales. R²/D estimates transport time, not an exact settling time.',
    explain:'Redistribution changes neutral inertia, so changing diffusivity can change the speed history as well as composition.',
    boundary:'Finite-duration runs need not finish at the same speed or purity. Equilibrium reference prescribes rigid rotation and uniform temperature; it is not your transient endpoint.',
   },
   {
    id:'scaling',title:'Find where one simple law applies',
    baseline:'Use a rotating mixed-feed run. These buttons add uniform-temperature equilibrium references without changing your run.',
    steps:['Compare 2× temperature, then 2× rotation. Read the feed and both radial composition curves.','Explain why a change in the exponent is not the same change in purity. Then propose a current-change experiment and identify which other outputs you would need.'],
    actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation'],['equilibrium','Open equilibrium calculator']],
    observe:'The ideal bias ln α scales as Ω²/T: doubling temperature halves it; doubling rotation quadruples it. Purity does not scale by those factors.',
    explain:'The bias compares mass-dependent rotational energy with thermal energy.',
    boundary:'These settled references do not calculate heating, transport time or the current required to achieve that rotation.',
   },
   {
    id:'loss',title:'Cut the drive; account for what remains',
    baseline:'Select a nonzero time before the endpoint of a powered coupled run.',
    steps:['Choose Cut power at selected time. Compare speeds before and after that intervention.','Show Angular momentum and Gas inertia. Read external drive and wall-loss accounting, not only angular speed.'],
    actions:[['cutPower','Cut power at selected time'],['spin','Replay the current history'],['momentum','Show angular momentum'],['inertia','Show gas inertia'],['drag','Adjust wall drag']],
    observe:'Removing torque does not stop gas instantly. Wall drag removes angular momentum; changing inertia also changes speed.',
    explain:'Collisions exchange angular momentum internally. Drive and wall torque change the total; angular speed equals angular momentum divided by inertia.',
    boundary:'Cut power edits drive history; Rewind only selects time. Coast-down with drag does not conserve total gas angular momentum.',
   },
  ],
 },
 {
  id:'thermal',title:'Thermal transport',
  scope:'Centrifuge · mechanical work, heat storage and cooling; spatial models require explicit enabling.',
  equation:'energy',experiments:[
   {
    id:'heat',title:'A fixed bath hides a question',
    baseline:'Pin an accepted run as A. With thermal evolution off, initial / bath temperature stays fixed.',
    steps:['Show Drive & work. Energies are joules; their slopes are watts. Resistive heating is a separate contribution.','In Thermal model enable Evolve gas & liner temperature. Wait for the accepted result and inspect Temperature and its budget at the same physical time.'],
    actions:[['heatExperiment','Open heat experiment'],['pin','Pin accepted run A'],['work','Show drive work']],
    observe:'The bath constrains temperature. Thermal evolution balances heating, storage and signed heat exchange.',
    explain:'At fixed speed, hotter gas sorts less strongly. Holding temperature fixed requires cooling; coupled current changes also affect density and inertia.',
    boundary:'Heat-transfer and deposition rates are assumed. Numerical dissipation is accounted separately, not deposited as physical heat.',
   },
   {
    id:'spatial',title:'Where does the heat go?',
    baseline:'Enable thermal evolution, Radial tungsten liner and Spatial mixture · experimental. Refinement costs more time.',
    steps:['Show Temperature profile, Species energy profile and Gas pressure profile. Compare radius at the same physical time.','Inspect Magnetic leverage and, with a lithium feed, Lithium vapor & surfaces as separate reference questions; read their axes before changing inputs.'],
    actions:[['spatialHeatExperiment','Open spatial heat experiment'],['gasEnergy','Show species energy'],['gasPressure','Show gas pressure'],['magneticLeverage','Show magnetic leverage'],['lithiumSurfaces','Show lithium surfaces']],
    observe:'Both species share one local temperature. More atoms can mean more energy without higher temperature; pressure depends on both density and temperature.',
    explain:'Magnetic leverage adjusts current to hold reference torque fixed: resistive heat scales as 1/B² at fixed geometry and conductivity. It is not a fixed-current scan. Lithium saturation is a separate phase-equilibrium reference.',
    boundary:'Radial fluid momentum and axial temperature are not solved. Spatial resolution needs joint cell/time refinement; saturation does not evolve condensation or certify operability.',
   },
  ],
 },
 {
  id:'beam',title:'Beam and target',
  scope:'Beam reactor · a separate beam–target teaching model. The centrifuge separates isotopes; it does not produce fusion reactions.',
  equation:'',experiments:[
   {
    id:'source',title:'Separate current, energy and footprint',
    baseline:'Open the simulator and choose Reactor in the header. Record beam energy, current, illuminated area and stopping model in Controls.',
    steps:['In Plots open Initial source → Target depth & full energy ledger. Change only D⁺ beam current and compare Incident beam power, Reaction probability / deuteron and neutron production.','Restore that current, then change only Illuminated target area. Compare Target-layer heat with Layer heat / illuminated area before investigating target evolution.'],
    actions:[['beamSource','Open beam controls & source ledger']],
    observe:'For a frozen target, current changes ions per second, not reaction probability per ion. Area changes heat flux and fluence per area.',
    explain:'For singly charged D⁺, beam power is (I/e)E. The ledger separates transmitted energy, stopping heat, fusion products and specified alpha deposition.',
    boundary:'An evolving target can break those proportionalities. Default linear slowing is illustrative; the material option is Geant4-derived Li/T, not measured LiT stopping.',
   },
   {
    id:'target',title:'The target remembers the beam',
    baseline:'Open Target; choose Use material model if prompted. Record exposure and transport settings; wait for an accepted scenario before scrubbing Time.',
    steps:['In Target → Dynamics choose Neutrons & temperature, then Isotopes and Energy budget. Scrub Time across beam on/off.','Open Depth to inspect film/backing temperature. Under Settings change one of Beam duty, Cooldown or D replacement probability, leaving the others fixed; compare accepted histories.'],
    actions:[['beamTarget','Open target settings & dynamics']],
    observe:'T inventory, D replacement and heat evolve together. Stored heat flows after shutoff; isotope exchange can change later yield.',
    explain:'Fusion consumes T; assumed exchange, release and renewal change inventory. The backing stores and conducts heat to coolant.',
    boundary:'Unsourced material rates remain assumptions. Weighted particles and slowed paths are visual encodings. This scene does not solve full neutron transport, shielding or dose. Power reactor · reference is a separate system.',
   },
  ],
 },
 {
  id:'collection',title:'Collection and processing',
  scope:'Centrifuge · first partition closed inventory, then examine explicitly separate process references.',
  equation:'collection',experiments:[
   {
    id:'cut',title:'Keep track of numerator and denominator',
    baseline:'Use a mixed-feed Isotope separation run. Show end-of-run cuts selects one accepted time for purity and recovery.',
    steps:['Probe the Purity & recovery curve from the whole vessel toward a smaller nonempty inner cut. Read both outputs.','Open the equilibrium calculator for a prescribed-speed settled comparison. Compare its assumptions with your finite-time coupled run; do not equate their endpoints.'],
    actions:[['collectionExperiment','Open collection experiment'],['cut','Probe collection curve'],['equilibrium','Open equilibrium calculator']],
    observe:'The whole vessel gives feed purity and 100% light recovery when light atoms exist. Smaller inner cuts usually trade higher purity for fewer retained light atoms.',
    explain:'Purity divides collected light atoms by all collected atoms; recovery divides them by all available light atoms. Radius fraction is not inventory fraction.',
    boundary:'An empty cut has no defined composition; absent-light recovery is undefined. Probing inspects the curve; the collection-radius setup slider starts a new run. Neither extracts gas.',
   },
   {
    id:'process',title:'What else would a process need?',
    baseline:'Record feed and collection settings. These process references do not solve flowing-rotor dynamics.',
    steps:['Show Countercurrent stages. Change stage count or feed location separately; inspect recovery and circulation as well as product purity.','Show Differential pumping and select that Application if needed. Compare Outer pump speed with Inlet conductance. Restore Isotope separation before returning to cuts.'],
    actions:[['stageExperiment','Open stages experiment'],['pumpingExperiment','Open pumping experiment']],
    observe:'Ideal stages route streams under assumed turnover. Inlet conductance can bottleneck pumping; neither reference changes the closed-vessel flow.',
    explain:'Purity, recovery, circulation and throughput are distinct quantities.',
    boundary:'These references establish neither plant throughput nor tritium self-sufficiency. Power reactor · reference uses separate assumptions.',
   },
  ],
 },
 {
  id:'evidence',title:'Evidence and uncertainty',
  scope:'Interpret calculations as conditional predictions. Mechanism exploration, numerical verification and experimental agreement are separate achievements.',
  equation:'limits',experiments:[
   {
    id:'comparison',title:'Make the comparison reproducible',
    baseline:'Choose an accepted mixed-feed Coupled separation run. Record physical time and enabled models; wait for Updating to finish.',
    steps:['Pin accepted run A. Change only wall drag, explicitly choose New run and wait for its accepted result. Compare speed first, then composition, at matched physical time.','Export the accepted run and retain its inputs, model choices, drive history, producing-code identity and units. Use the same comparison cut for purity.'],
    actions:[['dragExperiment','Open wall-drag experiment'],['pin','Pin accepted run A'],['newRun','New run'],['compositionPlot','Show composition at selected time']],
    observe:'A/B compares accepted calculations. Match time and collection cut to isolate the changed input.',
    explain:'Histories, snapshots, scans and saved replays answer different questions. Operating map uses uniform-inertia equilibrium, not the coupled thermal solver.',
    boundary:'Uncontrolled edits cannot identify a cause. Exporting does not resolve unknown dimensions or prescribed rates.',
   },
   {
    id:'qualification',title:'Ask what was actually tested',
    baseline:'Open Model info → Experimental accuracy: unqualified and its qualification record.',
    steps:['Distinguish the closed budgets from convergence under refinement and agreement with a diagnostic-matched experiment.','For an uncertain input, compare a stated range or use the public sensitivity tool in Model info. Report which conclusion changes, not just a preferred curve.'],
    actions:[['modelInfo','Open qualification & assumptions']],
    observe:'Conservation checks accounting; refinement checks numerical sensitivity; validation compares matched predictions with independent measurements.',
    explain:'The argon comparison rejects a rigid-rotation profile under its optical assumptions; it does not calibrate lithium. Parameter ranges are not automatically confidence intervals.',
    boundary:'The playground remains experimentally unqualified. A sensitivity envelope covers sampled assumptions, not every source of error.',
   },
  ],
 },
] as const satisfies readonly LearningModule[];
