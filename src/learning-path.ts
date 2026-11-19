/** Optional experiments over the existing models; these pages never compute substitute physics. */
export type LearningAction = readonly [action:string,label:string];
export type LearningExperiment = {
 id:string; title:string; baseline:string; predict:string; steps:readonly string[];
 actions:readonly LearningAction[]; observe:string; explain:string; boundary:string;
 transfer:readonly [question:string,answer:string];
};
export type LearningModule = {
 id:string; title:string; question:string; scope:string; equation:string;
 equationTerms?:readonly {symbol:string;meaning:string;action:string}[];
 experiments:readonly LearningExperiment[]; investigation:readonly [question:string,evidence:string];
};

export const learningPath = [
 {
  id:'controls',title:'Controls and readouts',
  question:'Can you tell a change to the gas from a change to its picture?',
  scope:'Centrifuge · a closed gas inventory in a stationary vessel. Aim for an enriched sample that retains useful light-isotope inventory.',
  equation:'drive',experiments:[
   {
    id:'input',title:'First establish what the drive does',
    baseline:'Choose Centrifuge with nonzero axial magnetic field and ion–neutral collision rate. Start from rest & edit current explicitly clears drive history. Set Radial discharge current to 0 A; leave other inputs fixed and wait for Updating to finish.',
    predict:'Starting from rest, what should the ion and neutral speed curves do with zero current?',
    steps:['Show end-of-run speeds. Then prepare the same experiment at 0.03 A and wait for the accepted result.','Compare the speeds at the same physical time. Inspect rotation before asking whether composition changed.'],
    actions:[['currentExperiment','Start from rest & edit current'],['endSpin','Show end-of-run speeds'],['look','See gas & drive']],
    observe:'From rest, zero current supplies no drive torque. At 0.03 A with nonzero magnetic field, ions accelerate and neutrals follow through the prescribed collision coupling.',
    explain:'Current across an axial magnetic field gives an azimuthal force. The vessel does not rotate. Current, field and coupling belong to the calculation; the arrows explain its direction.',
    boundary:'This is prescribed-current mechanics, not an ionization or electrical-discharge solution. A late current edit is a step in an existing drive history; New run clears that history.',
    transfer:['If you hide J × B arrows, should the gas slow down?','No. Hiding arrows changes the view. Changing current changes torque.'],
   },
   {
    id:'picture',title:'Now change only the picture',
    baseline:'Keep one accepted run. Do not change physical inputs.',
    predict:'Will moving the radial probe change the species inventory, or only the place you sample?',
    steps:['Open View. Move Probe radius / vessel radius from axis to wall; inspect Composition and Species density.','Switch gas display or rotate the camera. Open Inspect: selecting a component highlights it; use its Adjust link to edit the input in Controls.'],
    actions:[['view','Open View'],['compositionPlot','Show composition at selected time'],['density','Show species density'],['axis','Probe axis'],['wall','Probe wall'],['inspect','Open Inspect']],
    observe:'The probe readout and plot marker select different radii of the same state. Display settings and playback do not rerun its physics. The radial model has no new axial structure when you move its slice.',
    explain:'A time history asks when; a radial profile asks where at the selected time; a parameter scan compares hypothetical settings. Their horizontal axes answer different questions.',
    boundary:'Colors are diagnostic scales; read the legend and clipping range. Weighted 3D tracers are samples, not individual atoms or visible plasma emission. A vivid color need not mean a large enrichment.',
    transfer:['The view looks different but the accepted input values and plot curves do not. Is that necessarily a bug?','No. Camera, display and probe changes inspect an existing state. A physical edit should update the relevant accepted output; some inputs act only in enabled models.'],
   },
  ],investigation:['Find one edit that changes the picture and one that changes speed.','Name each input, show the corresponding readout, and explain why only one changes the physics.'],
 },
 {
  id:'transport',title:'Separation over time',
  question:'Why can the gas be turning before its composition changes much?',
  scope:'Centrifuge · distinguish finite-time redistribution from an ideal settled reference.',
  equationTerms:[{symbol:'Ω',meaning:'gas angular speed: read edge speed divided by vessel radius',action:'spinPlot'},{symbol:'T',meaning:'initial / bath gas temperature; the uniform equilibrium reference is not an evolved spatial temperature field',action:'gasTemperature'},{symbol:'Δm',meaning:'heavy minus light atomic mass: set by Feed',action:'controls'}],
  equation:'collection',experiments:[
   {
    id:'clocks',title:'Follow two clocks',
    baseline:'Use Coupled separation, Isotope separation, a mixed feed and nonzero drive. Keep thermal evolution off for this first comparison. Record the physical time. If you need a clean baseline, use Reset ↺; this replaces your settings.',
    predict:'Must a speed curve and an enrichment curve reach their settled values at the same time?',
    steps:['Show spin-up, then Separation over time. Use the same selected physical time to compare them.','Pin A. Change only Assumed radial diffusivity, explicitly start New run, and compare at a time covered by both runs. Inspect speed too.'],
    actions:[['spinPlot','Show speed history'],['separationPlot','Show separation over time'],['pin','Pin accepted run A'],['diffusion','Adjust diffusivity'],['newRun','New run']],
    observe:'The speed history and redistribution history answer different questions. Diffusivity changes the transport rate; R²/D estimates a transport timescale, not an exact settling time.',
    explain:'Drive and losses govern angular momentum. Transport redistributes species through radius. Redistribution also changes neutral inertia, so changing diffusivity can change the speed history in this coupled model.',
    boundary:'Do not promise identical final speeds or purity at a finite duration. Equilibrium reference assumes a prescribed rigid rotation and uniform temperature; it is not the accepted transient endpoint.',
    transfer:['If the gas speed barely changes while purity is still changing, which plot would you check next?','Check Separation over time and Composition at several physical times. A flat speed curve alone does not establish composition equilibrium.'],
   },
   {
    id:'scaling',title:'Find where one simple law applies',
    baseline:'Use a mixed-feed accepted run with nonzero rotation. The comparison buttons create separate uniform-temperature rigid-equilibrium references, leaving your physical run unchanged.',
    predict:'At prescribed rotation, would doubling temperature halve the light percentage or halve the logarithmic separation bias?',
    steps:['Compare 2× temperature, then 2× rotation. Read the feed and both radial composition curves.','Explain why a change in the exponent is not the same change in purity. Then propose a current-change experiment and identify which other outputs you would need.'],
    actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation'],['equilibrium','Open equilibrium calculator']],
    observe:'The ideal bias ln α scales as Ω²/T. Doubling temperature at fixed rotation halves this bias; doubling rotation at fixed temperature quadruples it. The composition and collected purity do not scale by those same factors.',
    explain:'The bias compares rotational energy associated with the mass difference with thermal energy. The equilibrium reference replaces spatial temperature by one uniform temperature; it does not predict how the drive achieves that rotation.',
    boundary:'These buttons intentionally show settled hypothetical references. They neither rerun heating and transport nor establish the finite-time response to a current edit.',
    transfer:['Two configurations have the same Ω²/T but different diffusivity and duration. Must their finite-time composition profiles match?','No. The simple law constrains a settled reference under its assumptions. Their transport histories and distance from equilibrium can differ.'],
   },
   {
    id:'loss',title:'Cut the drive; account for what remains',
    baseline:'Use a powered accepted coupled run. Select a nonzero time before the endpoint; record that time before cutting power.',
    predict:'Will cutting drive remove the gas angular momentum immediately?',
    steps:['Choose Cut power at selected time. Compare speeds before and after that intervention.','Show Angular momentum and Gas inertia. Read external drive and wall-loss accounting, not only angular speed.'],
    actions:[['cutPower','Cut power at selected time'],['spin','Replay the current history'],['momentum','Show angular momentum'],['inertia','Show gas inertia'],['drag','Adjust wall drag']],
    observe:'Removing torque does not instantaneously stop moving gas. Wall drag can remove angular momentum after power is off; changing inertia can also change speed.',
    explain:'Collisions transfer angular momentum between the two populations and cancel in their total. Drive and wall torque change the total. Angular speed is angular momentum divided by inertia.',
    boundary:'Cut power edits drive history; Rewind only selects an earlier time. Zero-drive coast-down with drag is not an isolated constant-angular-momentum experiment.',
    transfer:['Can a speed decrease prove that total angular momentum decreased?','No. Check inertia and external torque too: the same angular momentum rotates a larger inertia more slowly.'],
   },
  ],investigation:['Diagnose weak separation without changing several knobs at once.','Pin the baseline, choose one intervention, compare at matched physical time, and explain the nearest consequence in speed or transport before interpreting purity.'],
 },
 {
  id:'thermal',title:'Thermal transport',
  question:'Does extra current improve enrichment once heating and the required cooling are included?',
  scope:'Centrifuge · mechanical work, heat storage and cooling; spatial models require explicit enabling.',
  equation:'energy',experiments:[
   {
    id:'heat',title:'A fixed bath hides a question',
    baseline:'Record your current run and pin A. The initial / bath gas temperature is held fixed while thermal evolution is off.',
    predict:'Does a flat gas-temperature curve imply the drive deposits no heat?',
    steps:['Show Drive & work. Energies are joules; their slopes are watts. Resistive heating is a separate contribution.','In Thermal model enable Evolve gas & liner temperature. Wait for the accepted result and inspect Temperature and its budget at the same physical time.'],
    actions:[['heatExperiment','Open heat experiment'],['pin','Pin accepted run A'],['work','Show drive work']],
    observe:'The bath calculation constrains temperature. Thermal evolution instead balances heating, storage and signed heat exchange; the temperature response depends on the initial wall and coolant conditions.',
    explain:'Hotter gas has more random thermal motion, weakening sorting at a given rotation speed. Holding temperature fixed instead requires cooling to remove net heat input. In the coupled run, temperature, density and inertia interact, so Ω²/T alone does not predict a current-change purity.',
    boundary:'Heat transfer and deposition are model assumptions. Numerical dissipation belongs to the numerical ledger; it is not deposited as physical heat.',
    transfer:['Could gas cool while the drive is on?','Yes, if cooling exceeds net heating under that state and those boundary conditions. Read the signed energy budget rather than infer temperature from current alone.'],
   },
   {
    id:'spatial',title:'Where does the heat go?',
    baseline:'Enable thermal evolution. Choose Liner model → Radial tungsten liner and Gas model → Spatial mixture · experimental. Refined runs cost more time.',
    predict:'Does a cell containing more thermal energy necessarily have a higher temperature?',
    steps:['Show Temperature profile, Species energy profile and Gas pressure profile. Compare radius at the same physical time.','Inspect Magnetic leverage and, with a lithium feed, Lithium vapor & surfaces as separate reference questions; read their axes before changing inputs.'],
    actions:[['spatialHeatExperiment','Open spatial heat experiment'],['gasEnergy','Show species energy'],['gasPressure','Show gas pressure'],['magneticLeverage','Show magnetic leverage'],['lithiumSurfaces','Show lithium surfaces']],
    observe:'Cell energy depends on both particle number and common local temperature. Local ideal-gas pressure is number density × kB × temperature. A radial profile can reveal what a single mean hides.',
    explain:'Magnetic leverage holds reference torque fixed while changing current with B: its resistive heat scales as 1/B² at fixed geometry and conductivity. It is not a fixed-current scan. Lithium saturation is a separate phase-equilibrium comparison.',
    boundary:'There is no solved radial fluid momentum or axial temperature field here. Spatial resolution needs joint mesh/time convergence; saturation does not evolve condensation, set target lifetime or certify operability.',
    transfer:['Why can changing B in Controls differ from the Magnetic leverage curve?','The curve compares matched-torque scenarios with current adjusted. Changing B alone at fixed current changes torque as well.'],
   },
  ],investigation:['Explain a thermal tradeoff using an actual budget.','Choose one physical input, pin a baseline, and report speed, temperature and purity at matched time. State which thermal and transport assumptions remain imposed.'],
 },
 {
  id:'beam',title:'Beam and target',
  question:'What becomes of beam energy if only some incident ions fuse?',
  scope:'Beam reactor · a separate beam–target teaching model. The centrifuge separates isotopes; it does not produce fusion reactions.',
  equation:'',experiments:[
   {
    id:'source',title:'Separate current, energy and footprint',
    baseline:'Open the simulator and choose Reactor in the header. Open Controls. Record D⁺ laboratory energy, D⁺ beam current, illuminated area and stopping model.',
    predict:'At fixed energy and target state, does doubling current double the reaction probability per ion?',
    steps:['In Plots open Initial source → Target depth & full energy ledger. Change only D⁺ beam current and compare Incident beam power, Reaction probability / deuteron and neutron production.','Restore that current, then change only Illuminated target area. Compare Target-layer heat with Layer heat / illuminated area before investigating target evolution.'],
    actions:[['beamSource','Open beam controls & source ledger']],
    observe:'For the fixed initial target, current changes incident ions per second. Reaction probability per ion is set by the target and energy-dependent reaction/stopping calculation. Area changes heat flux and fluence per area; it is not itself a cross section.',
    explain:'Each singly charged D⁺ carries energy E and charge e: incident beam power is (I/e)E. The energy ledger separates transmitted beam, stopping heat, fusion products and specified alpha deposition.',
    boundary:'Initial source is a frozen target calculation. These proportionalities need not hold for the target evolved to the same later time. The default linear slowing is illustrative; the material option is a Geant4-derived Li/T estimate, not measured LiT stopping.',
    transfer:['Would twice the energy necessarily give twice the neutron rate?','No. Cross section, slowing and transmitted energy depend on energy. Compare reaction probability and the energy budget instead of assuming proportionality.'],
   },
   {
    id:'target',title:'The target remembers the beam',
    baseline:'Open Target and choose Use material model if prompted. Record exposure and assumed transport settings. Wait for an accepted scenario before reading its Time slider.',
    predict:'If the beam switches off, must the wall temperature and heat flow immediately return to their initial values?',
    steps:['In Target → Dynamics choose Neutrons & temperature, then Isotopes and Energy budget. Scrub Time across beam on/off.','Open Depth to inspect film/backing temperature. Under Settings change one of Beam duty, Cooldown or D replacement probability, leaving the others fixed; compare accepted histories.'],
    actions:[['beamTarget','Open target settings & dynamics']],
    observe:'T inventory, D replacement and the energy budget evolve together under the selected assumptions. Stored heat can continue flowing after beam shutoff; isotope exchange can alter future yield.',
    explain:'The beam supplies energy and incident nuclei. Fusion consumes target T; assumed exchange/release/renewal processes account for additional inventory changes. The backing stores and conducts heat toward the coolant.',
    boundary:'Material rates and properties are assumed unless explicitly sourced. Weighted particle counts and slowed paths are visual encodings. Source directions use an approximation; this scene does not solve full neutron transport, shielding or dose. Power reactor · reference is a different reference system, not this beam machine’s blanket.',
    transfer:['What would you need before turning a displayed temperature into a target-lifetime claim?','Validated material properties and failure criteria, retained-isotope and release data, thermal boundary conditions, and an apparatus-matched comparison. A converged teaching scenario is insufficient.'],
   },
  ],investigation:['Explain why a smaller beam spot can change the evolving target even at unchanged total incident power.','Record equal energy/current with two areas; distinguish initial total power from flux, fluence and later target state. The guide does not pin beam runs: write the two settings or export each calculation.'],
 },
 {
  id:'collection',title:'Collection and processing',
  question:'How much of the light isotope do you retain when you keep only the center?',
  scope:'Centrifuge · first partition closed inventory, then examine explicitly separate process references.',
  equation:'collection',experiments:[
   {
    id:'cut',title:'Keep track of numerator and denominator',
    baseline:'Use Isotope separation with a mixed feed. Choose Show end-of-run cuts so both purity and recovery refer to one accepted time.',
    predict:'If you keep the entire vessel, what must purity and recovery be?',
    steps:['Probe the Purity & recovery curve from the whole vessel toward a smaller nonempty inner cut. Read both outputs.','Open the equilibrium calculator for a prescribed-speed settled comparison. Compare its assumptions with your finite-time coupled run; do not equate their endpoints.'],
    actions:[['collectionExperiment','Open collection experiment'],['cut','Probe collection curve'],['equilibrium','Open equilibrium calculator']],
    observe:'Whole-vessel purity equals the feed fraction and recovery is 100% when light atoms exist. A smaller inner cut generally trades higher light percentage for retaining fewer light atoms under the separating conditions.',
    explain:'Purity divides collected light atoms by all collected atoms. Recovery divides collected light atoms by all light atoms in the vessel. Radius fractions are not volume or inventory fractions.',
    boundary:'An empty cut has no defined composition; recovery without any light feed is undefined. The probe inspects the curve; the physical collection-radius setup slider starts a new run. Neither extracts gas.',
    transfer:['Can a 100%-pure sample have zero recovery?','A zero-size sample has undefined purity, not a successful pure product. A very small nonempty sample can be highly pure yet have negligible recovery.'],
   },
   {
    id:'process',title:'What else would a process need?',
    baseline:'Keep the feed and collection definition recorded. These next panels are references, not a new flowing-rotor solution.',
    predict:'Would doubling outer pump speed double inlet throughput if inlet conductance is the bottleneck?',
    steps:['Show Countercurrent stages. Change stage count or feed location separately; inspect recovery and circulation as well as product purity.','Show Differential pumping and select that Application if needed. Compare Outer pump speed with Inlet conductance. Restore Isotope separation before returning to cuts.'],
    actions:[['stageExperiment','Open stages experiment'],['pumpingExperiment','Open pumping experiment']],
    observe:'An ideal stage model routes two streams under assumed turnover. A finite inlet conductance can limit effective pumping. These references do not change the closed-vessel rotor’s flow.',
    explain:'Collection quality, circulation and throughput are different questions. The ideal routing and pumping references add process accounting, without turning the finite-time closed vessel into an extraction calculation.',
    boundary:'No stage cascade, fuel-loop burn fraction or pump curve establishes plant throughput, tritium self-sufficiency or proprietary Marathon performance. Power reactor · reference uses separate reference assumptions.',
    transfer:['Can excellent single-vessel purity establish that a fusion fuel plant has enough tritium?','No. Recovery, throughput, processing holdup, breeding, losses and operating inventory are distinct requirements. This centrifuge calculation supplies only a limited part of that picture.'],
   },
  ],investigation:['Choose an honest collection tradeoff.','At one accepted time, find two nonempty cuts and report both purity and recovery. Choose a target within the actual curve, or explain why a desired target is unattainable under those inputs.'],
 },
 {
  id:'evidence',title:'Evidence and uncertainty',
  question:'What can this model support, and what would it take to trust a device prediction?',
  scope:'Interpret calculations as conditional predictions. Mechanism exploration, numerical verification and experimental agreement are separate achievements.',
  equation:'limits',experiments:[
   {
    id:'comparison',title:'Make the comparison reproducible',
    baseline:'Choose Centrifuge, Coupled separation and one accepted mixed-feed run. Write down its physical time and enabled models; wait until Updating has finished.',
    predict:'If a result changes after you edit three inputs, can you tell which change caused it?',
    steps:['Pin accepted run A. Change only wall drag, explicitly choose New run and wait for its accepted result. Compare speed first, then composition, at matched physical time.','Export the accepted run and retain its inputs, model choices, drive history, producing-code identity and units. Use the same comparison cut for purity.'],
    actions:[['dragExperiment','Open wall-drag experiment'],['pin','Pin accepted run A'],['newRun','New run'],['compositionPlot','Show composition at selected time']],
    observe:'A/B compares accepted calculations, not in-flight slider positions. Matched time and cut avoid confusing different sampling choices with different physics.',
    explain:'A time history, selected radial snapshot, parameter scan and recorded research replay are different evidence. Operating map is a uniform-inertia equilibrium reference; its cells are not the coupled thermal solver.',
    boundary:'Do not infer a cause from uncontrolled edits or treat a reference overlay as your run. Unknown apparatus dimensions and prescribed rates remain unknown after exporting.',
    transfer:['Your friend gets a different curve. Which information would you compare first?','Compare model/mode, accepted inputs and thermal options, current history, physical time, plotted quantity, collection definition and code identity before concluding the solver disagrees.'],
   },
   {
    id:'qualification',title:'Ask what was actually tested',
    baseline:'Open Model info → Experimental accuracy: unqualified, then the published qualification record.',
    predict:'Does a small conservation residual prove that predicted velocities match a real apparatus?',
    steps:['Distinguish the closed budgets from convergence under refinement and agreement with a diagnostic-matched experiment.','For an uncertain input, compare a stated range or use the public sensitivity tool in Model info. Report which conclusion changes, not just a preferred curve.'],
    actions:[['modelInfo','Open qualification & assumptions']],
    observe:'Conservation checks accounting. Refinement checks numerical sensitivity. Validation compares the right observable with independent measurements under matched conditions. None replaces the others.',
    explain:'The public argon comparison rejects a simple rigid-rotation description of the measured profile shape. It is not a calibration of this lithium scenario. An uncertain parameter range is not automatically a statistical confidence interval.',
    boundary:'The current playground remains experimentally unqualified. A sensitivity envelope covers the sampled assumptions, not every model error or unresolved operating condition.',
    transfer:['All sampled parameter choices miss the shape of a measured profile. What should change next?','Investigate model structure and diagnostic mapping instead of choosing a fitted parameter and claiming validation. A structurally wrong profile cannot be repaired by its overall scale alone.'],
   },
  ],investigation:['Make one defensible claim and name its boundary.','Attach a pinned comparison or export, give a causal explanation, and state one untested assumption. On your next visit, predict a new case before reopening the explanation.'],
 },
] as const satisfies readonly LearningModule[];
