/** Shared instructions for the separate guide and the older scene reader. */
export const playgroundSteps=[
 {id:'machine',diagram:'drive',title:'What turns the gas?',intro:`We want a sample with more light ⁶Li relative to heavy ⁷Li. First, find which parts turn and which stay still.

Electric current is charge in motion. Ions are atoms or molecules with electric charge. Current across the axial magnetic field gives the charged gas a force around the cylinder. Collisions transfer rotation to neutral atoms. The vessel and electrodes stay still.

In the diagram, first find the central electrode and the gas around it. Then select Current, Turn the ions and Turn the gas. The arrows explain the drive. The moving circles explain how the neutral gas receives motion.`,
  do:[],
  notice:`A mechanical centrifuge uses a drum: a cylinder whose wall turns. This model uses electrical drive. Its vessel and electrodes stay still.

Follow an inward current arrow, then the force arrow at the same position. The force points around the axis, not toward it. Moving ion markers show the charged population turning. Moving neutral markers show the result of collisions.`,
  note:'Colors and weighted markers show calculated populations, not individual atoms. If a dimension has no published value, the model uses an assumption.',reading:['/guide.html#drive','Why the electrical drive turns the gas'],actions:[['look','Show gas & drive'],['coils','Show the coils']]},
 {id:'current',diagram:'spin',title:'Can the current make the gas turn?',intro:`Before we use current to improve separation, check that it turns the gas. Compare powered and unpowered runs from rest.

Current and magnetic field give the charged gas torque: a turning effect about the axis. Ions accelerate first. Collisions then accelerate neutral atoms.`,
  do:["Compare 0 A with 0.03 A from rest. Keep the magnetic field and collision rate constant. Compare at the same physical time."],
  notice:`From rest at 0 A, both speeds stay zero. This gives a comparison with no electrical drive. The magnetic field alone does not start this model's gas rotation.

With current, the drive first adds angular momentum to the charged population. Angular momentum measures rotational motion. A larger applied torque changes angular momentum faster. Thus, the speed increases over time instead of immediately reaching its final value.

Collisions transfer angular momentum from faster ions to slower neutral atoms. The neutral speed therefore increases after the ion speed starts to increase. The difference between the curves shows that the two populations do not turn together immediately.

In Ion–neutral spin-up, the horizontal axis is physical time. Each curve gives a population's tangential speed at the vessel wall. A higher curve means faster rotation, not more atoms. The wall itself stays still.

When drive and losses balance, the speeds stop increasing. When power stops, angular momentum keeps the gas turning. Wall drag then decreases the total angular momentum.`,
  note:'This experiment starts a new run. During a run, a current change acts at the selected time. Gas continues to turn after power stops.',reading:['/guide.html#momentum','Torque, angular momentum and losses'],actions:[['currentExperiment','Start from rest & edit current'],['endSpin','Show end-of-run speeds']]},
 {id:'composition',diagram:'composition',title:'Does rotation change composition?',intro:`Separation needs different isotope fractions near the axis and wall. Compare No rotation with Rotation first. Then compare Higher temperature at the same rotation speed. Temperature measures random atom motion, which opposes this separation.

Density is the number of atoms per volume. Composition is each isotope's local percentage. With rotation and uniform temperature, equilibrium densities increase toward the wall. The heavier density increases more sharply. Thus, the light percentage decreases toward the wall.

In this diagram, 1× is each isotope's axis density. Show composition opens percentages instead. Show species density uses each isotope's vessel mean as 1×. Read the reference before comparing curve heights.`,
  do:[],
  notice:`Both isotopes can become denser toward the wall. Separation means that the heavy density increases by a larger factor. It does not mean all light atoms move to the axis or all heavy atoms reach the wall.

In Composition, a light fraction of 8% means about 80 light atoms in 1,000 local atoms. It does not mean 8% of all light atoms are there. Probe axis and Probe wall select local values. They do not collect gas. The plot's horizontal axis is distance from the central axis.

A finite-time run can differ. A short or unpowered run can show almost no change. Compare the result with the feed fraction, not with 50%.`,
  note:'Composition is undefined where the model cannot resolve density. Large color changes can show small composition changes.',reading:['/guide.html#composition','Why the density curves change'],actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall'],['density','Show species density']]},
 {id:'competition',diagram:'bias',title:'Why not increase the rotation speed?',intro:`More speed requires drive power. Before we increase it, compare the expected separation increase with the decrease from higher temperature.

Compare the wall heavy/light ratio with the axis heavy/light ratio. Their quotient is α. A value of 1 means no composition difference. Larger values mean a larger relative difference. The example below starts at 1.20.`,
  do:[],
  notice:`Compare the wall heavy/light ratio with the axis ratio. This measures a composition difference between locations, not a product quantity.

Read the curve as a ratio change between axis and wall. Then read Composition for the actual local percentages. These are different quantities because the feed fraction also sets the percentages.`,
  note:'The percentage and purity do not change by these factors. These equilibrium references use a uniform temperature. They do not calculate the separation time or necessary drive power.',reading:['/guide.html#bias','The separation factor and its equations'],actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation']]},
 {id:'heat',diagram:'energy',title:'What changes when temperature can evolve?',intro:`We want enrichment, which means a higher light fraction, rather than speed alone. More drive can increase rotation and temperature. At a specified rotation speed, higher temperature decreases separation.

The supply gives energy for rotation and resistive heating. Collisions and wall drag can change rotational energy into heat. Cooling removes heat. The balance of these energy paths sets temperature.

The default liner starts at 1,000 K. The gas starts at 500 K. Heat can flow from the liner into the gas. This comparison includes that heat. It does not isolate drive heating.`,
  do:["With thermal evolution off, select a physical time and pin run A. Keep the drive inputs unchanged. Enable Evolve gas & liner temperature. After calculation, select the same physical time. Compare temperature, speed and composition with A."],
  notice:`The default thermal bath holds the temperature constant. This assumes that an external system removes or supplies the necessary heat. Thermal evolution instead calculates temperature changes. A hot liner can heat the gas even when drive heating is small. The initial default liner is hotter than the gas.

Compare temperature first, then speed, then composition at the same physical time. Thermal evolution changes both temperature and the coupled motion. The comparison shows their combined effect on separation. Use Compare 2× temperature to isolate temperature at fixed rotation.

Drive & work shows mechanical energy; its curves do not include the complete thermal account. A rising work curve means continued energy input, not necessarily rising speed.`,
  note:'Numerical damping is not physical heat. The heat-transfer and transport inputs are assumptions.',reading:['/tutorial-03.html#budget','Heating, cooling and the energy balance'],actions:[['heatExperiment','Open heat experiment'],['pin','Pin A'],['thermalPlot','Show temperature'],['compositionPlot','Compare composition']]},
 {id:'collection',diagram:'inventory-cut',title:'How much light isotope can we keep?',intro:`A sample with a high light fraction can contain few light atoms. We need purity and recovery to choose how much gas to keep.

Purity is the light percentage in the sample. Recovery is the percentage of all light atoms that the sample contains. Each cut keeps all gas inside its radius.

Select a radius on the plot. Read the values in the plot readout. This reads a sample; it does not extract gas. The summary values describe the configured cut.`,
  do:["Compare a small radius with the vessel wall. At the wall, recovery is 100% and purity equals the feed fraction."],
  notice:`The Composition plot describes gas at one radius. A collected sample contains all gas inside a radius. These differ because density changes with radius and outer rings have more volume than inner rings of equal thickness.

In Purity & recovery, move from a small radius toward the wall. You include more gas, so recovery increases. Purity generally decreases as the sample includes more heavy-rich outer gas. The whole vessel gives the feed purity and full recovery.

The cut illustration counts atoms throughout the inner volume. Its separate equilibrium example uses a 50% feed. Your lithium run uses its selected feed fraction. The illustration's percentages are not predictions for your run.`,
  note:'Cuts divide the closed inventory. They do not calculate extraction flow. A plot probe does not move the 3D cut marker. The cut slider starts a new run. Recovery is undefined when the feed has no light atoms.',reading:['/tutorial-04.html#sample','Purity and recovery calculations'],actions:[['collectionExperiment','Open collection experiment'],['cut','Probe collection curve'],['equilibrium','Open equilibrium calculator']]},
 {id:'compare',diagram:'compare',title:'Ask one question of your own',intro:'Changing several inputs can hide the cause of a result. Change one input and compare at the same physical time.',
  do:["Select Pin A. Change one physical input. Select New run. Compare at the same physical time."],
  notice:`A useful comparison answers one physical question. For example: does more wall drag decrease the enrichment at a selected time? Pin A preserves the first result while you change only wall drag.

Examine the first effect before later effects. More wall drag removes angular momentum faster. Under the same drive, this generally decreases rotation. Lower rotation then decreases the centrifugal separation bias. Compare the speeds before the composition.

Compare both runs at the same physical time and radius. Otherwise, a longer run or a different sample location can explain the difference. A changed curve shows the consequence of the selected model inputs. It does not prove that those inputs describe a real machine.`,
  note:'These experiments show mechanisms, but do not show experimental accuracy. The model uses several prescribed inputs.',reading:['/tutorial-06.html#sensitivity','Sensitivity and evidence for the inputs'],actions:[['pin','Pin this run as A'],['controls','Open controls']]},
];
