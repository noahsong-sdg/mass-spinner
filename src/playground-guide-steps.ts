/** Shared instructions for the separate guide and the older scene reader. */
export const playgroundSteps=[
 {id:'machine',diagram:'drive',title:'What turns inside the vessel?',intro:`We want a sample with more light ⁶Li relative to heavy ⁷Li. First, find which parts turn and which stay still.

Electric current is charge in motion. Ions are atoms or molecules with electric charge. Current across the axial magnetic field gives the charged gas a force around the cylinder. Collisions transfer rotation to neutral atoms. The vessel and electrodes stay still.

In the diagram, first find the central electrode and the gas around it. Then select Current, Turn the ions and Turn the gas. The arrows explain the drive. The moving circles explain how the neutral gas receives motion.`,
  do:[],
  notice:`A mechanical centrifuge uses a drum: a cylinder whose wall turns. Contact with the wall makes the gas turn. This model uses electrical drive. Its vessel and electrodes stay still.

Electric current is charge in motion. Ions are atoms or molecules with electric charge. The gas contains positive ions, negative electrons and neutral atoms. A voltage between the electrodes causes charge to move across the gas. The current arrow gives the direction of positive-charge flow. Electrons can move in the opposite direction.

A magnetic field applies a force to a charge that moves across it. The force acts at right angles to both the charge motion and the field. This is the magnetic part of the Lorentz force law. Experiments show this force. The field changes the direction of charge motion. A magnetic force alone does not increase the charge's speed.

Here, current crosses the gas toward the inner electrode. The magnetic field points along the cylinder. Their combined effect gives the charged gas a force around the cylinder. At the right of the end view, inward current and a field toward you give an upward force. Around the gap, these forces give torque: a turning effect about the axis.

Collisions transfer some of this motion from ions to neutral atoms. Thus, neutral gas can turn although it has no net electric charge. The electrical supply supplies energy for rotation and heat.`,
  note:'Colors and weighted markers show calculated populations, not individual atoms. If a dimension has no published value, the model uses an assumption.',actions:[['look','Show gas & drive'],['coils','Show the coils']]},
 {id:'current',diagram:'spin',title:'Can the current make the gas turn?',intro:`Before we use current to improve separation, check that it turns the gas. Compare powered and unpowered runs from rest.

Current and magnetic field give the charged gas torque: a turning effect about the axis. Ions accelerate first. Collisions then accelerate neutral atoms.`,
  do:["Compare 0 A with 0.03 A from rest. Keep the magnetic field and collision rate constant. Compare at the same physical time."],
  notice:`From rest at 0 A, both speeds stay zero. This gives a comparison with no electrical drive. The magnetic field alone does not start this model's gas rotation.

With current, the drive first adds angular momentum to the charged population. Angular momentum measures rotational motion. A larger applied torque changes angular momentum faster. Thus, the speed increases over time instead of immediately reaching its final value.

Collisions transfer angular momentum from faster ions to slower neutral atoms. The neutral speed therefore increases after the ion speed starts to increase. The difference between the curves shows that the two populations do not turn together immediately.

In Ion–neutral spin-up, the horizontal axis is physical time. Each curve gives a population's tangential speed at the vessel wall. A higher curve means faster rotation, not more atoms. The wall itself stays still.

When drive and losses balance, the speeds stop increasing. When power stops, angular momentum keeps the gas turning. Wall drag then decreases the total angular momentum.`,
  note:'This experiment starts a new run. During a run, a current change acts at the selected time. Gas continues to turn after power stops.',actions:[['currentExperiment','Start from rest & edit current'],['endSpin','Show end-of-run speeds']]},
 {id:'composition',diagram:'composition',title:'Does rotation change the atom distribution?',intro:`Separation needs different isotope fractions near the axis and wall. Compare No rotation with Rotation first. Then compare Higher temperature at the same rotation speed. Temperature measures random atom motion, which opposes this separation.

Density is the number of atoms per volume. Composition is each isotope's local percentage. With rotation and uniform temperature, equilibrium densities increase toward the wall. The heavier density increases more sharply. Thus, the light percentage decreases toward the wall.

In this diagram, 1× is each isotope's axis density. Show composition opens percentages instead. Show species density uses each isotope's vessel mean as 1×. Read the reference before comparing curve heights.`,
  do:[],
  notice:`An outward increase in gas pressure supplies the inward force that keeps the gas turning. Pressure on the outer side of a small gas volume exceeds pressure on its inner side. The pressure difference pushes that gas inward. Heavier atoms need more inward force at the same radius and rotation speed. Their equilibrium density therefore increases more sharply toward the wall.

With the same number of atoms per volume, hotter gas has higher pressure. At the same rotation speed, a smaller relative density increase can supply the necessary inward force. Thus, the normalized equilibrium density curves become less steep. The isotope fractions also differ less between the axis and wall.

Both isotopes can become denser toward the wall. Separation means that the heavy density increases by a larger factor. It does not mean all light atoms move to the axis or all heavy atoms reach the wall.

In Composition, a light fraction of 8% means about 80 light atoms in 1,000 local atoms. It does not mean 8% of all light atoms are there. Probe axis and Probe wall select local values. They do not collect gas. The plot's horizontal axis is distance from the central axis.

A finite-time run can differ. A short or unpowered run can show almost no change. Compare the result with the feed fraction, not with 50%.`,
  note:'Composition is undefined where the model cannot resolve density. Large color changes can show small composition changes.',actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall'],['density','Show species density']]},
 {id:'competition',diagram:'bias',title:'Why not increase the rotation speed?',intro:`More speed requires drive power. Before we increase it, compare the expected separation increase with the decrease from higher temperature.

Compare the wall heavy/light ratio with the axis heavy/light ratio. Their quotient is α. A value of 1 means no composition difference. Larger values mean a larger relative difference. The example below starts at 1.20.`,
  do:[],
  notice:`Here, Ω is angular speed, T is temperature, and α is the wall heavy/light ratio divided by the axis ratio. This comparison measures how much rotation changes the mixture between two locations. It does not count how much product you can collect.

The equilibrium separation exponent, ln α, is proportional to Ω²/T. Faster rotation increases the mass-dependent bias toward the wall. More random thermal motion decreases that bias. Thus, the ratio Ω²/T compares two competing effects.

At constant speed, two times the temperature gives half this exponent. At constant temperature, two times the speed gives four times this exponent. With an initial α of 1.20, the two comparisons give about 1.095 and 2.074. They do not give 0.60 and 4.80.

Read the curve as a ratio change between axis and wall. Then read Composition for the actual local percentages. These are different quantities because the feed fraction also sets the percentages.`,
  note:'The percentage and purity do not change by these factors. These equilibrium references use a uniform temperature. They do not calculate the separation time or necessary drive power.',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation']]},
 {id:'heat',diagram:'energy',title:'Will the drive also heat the gas?',intro:`We want enrichment, which means a higher light fraction, rather than speed alone. More drive can increase rotation and temperature. At a specified rotation speed, higher temperature decreases separation.

The supply gives energy for rotation and resistive heating. Collisions and wall drag can change rotational energy into heat. Cooling removes heat. The balance of these energy paths sets temperature.`,
  do:["With thermal evolution off, select a physical time and pin run A. Keep the drive inputs unchanged. Enable Evolve gas & liner temperature. After calculation, select the same physical time. Compare temperature, speed and composition with A."],
  notice:`We want organized motion around the axis. Temperature describes random motion relative to that organized motion. At the same rotation speed, more random motion makes the equilibrium isotope percentages more uniform. Heat is a problem for separation when it raises temperature enough to reduce the benefit of rotation.

Energy does not disappear when rotation slows. Collisions between populations with different speeds change some rotational energy into thermal energy. Wall drag also changes rotational energy into heat. Heat can then pass between the gas, liner and coolant.

The default thermal bath holds the temperature constant. This assumes that an external system removes or supplies the necessary heat. Thermal evolution instead calculates temperature changes. A hot liner can heat the gas even when drive heating is small. The initial default liner is hotter than the gas.

Compare temperature first, then speed, then composition at the same physical time. Thermal evolution changes both temperature and the coupled motion. The comparison shows their combined effect on separation. Use Compare 2× temperature to isolate temperature at fixed rotation.

Drive & work shows mechanical energy; its curves do not include the complete thermal account. A rising work curve means continued energy input, not necessarily rising speed. At constant speed, losses can consume all the supplied mechanical power.`,
  note:'Numerical damping is not physical heat. The heat-transfer and transport inputs are assumptions.',actions:[['heatExperiment','Open heat experiment'],['pin','Pin A'],['thermalPlot','Show temperature'],['compositionPlot','Compare composition']]},
 {id:'collection',diagram:'inventory-cut',title:'Which part of the gas do we want to keep?',intro:`A sample with a high light fraction can contain few light atoms. We need purity and recovery to choose how much gas to keep.

Purity is the light percentage in the sample. Recovery is the percentage of all light atoms that the sample contains. Each cut keeps all gas inside its radius.`,
  do:["Probe two radii. Each cut includes all gas inside its radius."],
  notice:`The Composition plot describes gas at one radius. A collected sample contains all gas inside a radius. These differ because density changes with radius and outer rings have more volume than inner rings of equal thickness.

Suppose the vessel contains 100 light atoms. A sample with 10 light and 90 heavy atoms has 10% purity and 10% recovery. A smaller sample with 5 light and 20 heavy atoms has 20% purity but only 5% recovery. The higher percentage does not give more light atoms.

In Purity & recovery, move from a small radius toward the wall. You include more gas, so recovery increases. Purity generally decreases as the sample includes more heavy-rich outer gas. The whole vessel gives the feed purity and full recovery.

The cut illustration counts atoms throughout the inner volume. Its separate equilibrium example uses a 50% feed. Your lithium run uses its selected feed fraction. The illustration's percentages are not predictions for your run.`,
  note:'Cuts divide the closed inventory. They do not calculate extraction flow. A plot probe does not move the 3D cut marker. The cut slider starts a new run. Recovery is undefined when the feed has no light atoms.',actions:[['collectionExperiment','Open collection experiment'],['cut','Probe collection curve'],['equilibrium','Open equilibrium calculator']]},
 {id:'compare',diagram:'compare',title:'Ask one question of your own',intro:'Changing several inputs can hide the cause of a result. Change one input and compare at the same physical time.',
  do:["Select Pin A. Change one physical input. Select New run. Compare at the same physical time."],
  notice:`A useful comparison answers one physical question. For example: does more wall drag decrease the enrichment at a selected time? Pin A preserves the first result while you change only wall drag.

Examine the first effect before later effects. More wall drag removes angular momentum faster. Under the same drive, this generally decreases rotation. Lower rotation then decreases the centrifugal separation bias. Compare the speeds before the composition.

Compare both runs at the same physical time and radius. Otherwise, a longer run or a different sample location can explain the difference. A changed curve shows the consequence of the selected model inputs. It does not prove that those inputs describe a real machine.`,
  note:'These experiments show mechanisms, but do not show experimental accuracy. The model uses several prescribed inputs.',actions:[['pin','Pin this run as A'],['controls','Open controls']]},
];
