/** Stable anchors and action registry, including previously shared deep links.
 * Readers place the actions they need beside their instructions in Markdown. */
export type GuideTopic = {id:string;heading:string;diagram?:string;actions:readonly (readonly [string,string])[]};
export const guideTopics=[
 {id:'goal',heading:'What are we trying to predict?',actions:[['spin','Replay spin-up']]},
 {id:'composition',heading:'1. Why does rotation separate masses?',diagram:'composition',actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall'],['density','Show species density']]},
 {id:'bias',heading:'2. How strong is the separation?',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation'],['equilibrium','Open equilibrium calculator']]},
 {id:'drive',heading:'3. How do we spin a gas without spinning a drum?',diagram:'drive',actions:[['look','Show gas & drive'],['current','Adjust current']]},
 {id:'momentum',heading:'4. What sets the rotation speed?',actions:[['currentExperiment','Try the current experiment'],['endSpin','Show end-of-run speeds'],['spin','Replay spin-up'],['momentum','Show angular momentum'],['inertia','Show gas inertia'],['current','Adjust current'],['collisions','Adjust collisions'],['drag','Adjust wall drag']]},
 {id:'energy',heading:'5. Where does the energy go?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
 {id:'collection',heading:'6. Why do we need time and collection, too?',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve'],['diffusion','Adjust diffusivity'],['duration','Adjust run duration']]},
 {id:'limits',heading:'Why these pieces, and what is still missing?',actions:[['pin','Pin this run as A']]},
 {id:'views',heading:'What do the menu options mean?',actions:[]},
 {id:'path',heading:'Where do we go after this guide?',actions:[]},
] as const satisfies readonly GuideTopic[];
export type GuideTopicId = typeof guideTopics[number]['id'];
/** Numbered readers continue 02; these are explanations, not new simulation modes. */
export const numberedTutorials = [
 {number:'03',title:'Can faster rotation stay cool?',topics:[
  {id:'budget',heading:'Why add a temperature model?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
  {id:'flow',heading:'Where does the heat go?',diagram:'heat-flow',actions:[['thermalProfile','Show temperature profile'],['gasEnergy','Show species energy'],['gasPressure','Show gas pressure']]},
  {id:'limits',heading:'Can a field change avoid the heating?',actions:[['magneticLeverage','Show magnetic leverage'],['lithiumSurfaces','Show lithium surfaces']]},
 ]},
 {number:'04',title:'Does a purer sample make a useful process?',topics:[
  {id:'sample',heading:'How much useful material did you keep?',diagram:'inventory-cut',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve']]},
  {id:'stages',heading:'Why use more than one stage?',actions:[['cascade','Show stages reference'],['stageControls','Adjust stages']]},
  {id:'pumping',heading:'What limits the gas entering a process?',actions:[['pumping','Show pumping reference'],['pumpControls','Adjust pump speed']]},
 ]},
 {number:'05',title:'Why does fusion need separation?',topics:[
  {id:'jobs',heading:'What are the three different jobs?',diagram:'fuel-cycle',actions:[]},
  {id:'inventory',heading:'Why keep fuel outside the plasma?',actions:[['fuelInventory','Show D–T fuel inventory'],['inventoryControls','Open fuel inventory controls']]},
  {id:'design',heading:'What would establish a workable fuel cycle?',actions:[['modelInfo','Open model assumptions']]},
 ]},
 {number:'06',title:'Which prediction should I trust?',topics:[
  {id:'questions',heading:'What does a passing test establish?',diagram:'evidence',actions:[['modelInfo','Open qualification and evidence']]},
  {id:'sensitivity',heading:'Could an assumed input reverse the result?',actions:[['pin','Pin accepted run A'],['diffusion','Adjust diffusivity'],['newRun','New run'],['separationPlot','Show separation over time']]},
  {id:'prediction',heading:'What is a defensible claim here?',actions:[['modelInfo','Open measured-reference assessment']]},
 ]},
] as const satisfies readonly {number:string;title:string;topics:readonly GuideTopic[]}[];
/** Additional explicit entrypoints used by the optional investigation pages. */
export const tutorialActions=['spinPlot','compositionPlot','separationPlot','thermalProfile','gasEnergy','gasPressure','gasTemperature','magneticLeverage','cascade','pumping','fuelInventory','lithiumSurfaces','stageControls','pumpControls','inventoryControls','newRun','cutPower','controls','inspect','view','modelInfo','beamLedger','beamDynamics'] as const;
/** Navigation only: reveal canonical inputs and results, never install hidden physical presets. */
export type GuideExperiment={title:string;control:string;result:string;label:string;hint:string;apparatus?:'source';panel?:'target'};
export const guideExperiments={
 heatExperiment:{title:'Heat storage',control:'#fuel-thermal-enabled',result:'thermalPlot',label:'Show temperature',hint:'Use an atomic feed. Enable Evolve gas & liner temperature, wait for the run, then compare at the same physical time.'},
 spatialHeatExperiment:{title:'Radial heat flow',control:'#fuel-thermal-enabled',result:'thermalProfile',label:'Show temperature profile',hint:'Use an atomic feed. Enable thermal evolution, choose Radial tungsten liner, then Spatial mixture · experimental. Wait before reading the profile.'},
 collectionExperiment:{title:'Purity and recovery',control:'#fuel-cutFraction',result:'collection',label:'Show end-of-run cuts',hint:'Use Isotope separation with a mixed feed. Probe two radii on the plot. The setup slider below changes the inventory cut; it does not extract gas.'},
 stageExperiment:{title:'Countercurrent stages',control:'#fuel-stages',result:'cascade',label:'Show stages',hint:'Use Isotope separation. Change stages or Feed stage separately; compare purity, recovery and circulation. This is an ideal routing reference.'},
 pumpingExperiment:{title:'Pump and inlet limits',control:'#fuel-application',result:'pumping',label:'Show pumping reference',hint:'Choose Differential pumping. Expand Pumping and change Outer pump speed, then Inlet conductance separately. This reference does not drive rotor flow.'},
 inventoryExperiment:{title:'Fuel held in processing',control:'#fuel-burnFraction',result:'fuelInventory',label:'Show fuel inventory',hint:'Hold fusion power fixed. Halve burn fraction, restore it, then double processing time. These are separate fuel-loop inputs, not lithium transport.'},
 diffusionExperiment:{title:'Time to separate',control:'#fuel-radialDiffusivityM2S',result:'separationPlot',label:'Show separation over time',hint:'Use a powered mixed feed in Coupled separation. Pin A first, change only diffusivity, then New run. Compare at the same physical time.'},
 dragExperiment:{title:'Rotation losses',control:'#fuel-dragHz',result:'spinPlot',label:'Show speed history',hint:'Pin A first. Change only wall drag, then New run. Compare speeds at the same physical time before interpreting composition.'},
 fieldExperiment:{title:'Magnetic leverage',control:'#fuel-magneticT',result:'magneticLeverage',label:'Show magnetic leverage',hint:'The curve adjusts current to hold reference torque fixed. Changing B alone in Controls is a different experiment; compare the selected marker with the reference curve.'},
 surfaceExperiment:{title:'Lithium surfaces',control:'#fuel-linerK',result:'lithiumSurfaces',label:'Show surface reference',hint:'Choose an atomic lithium feed. Compare saturation at two liner temperatures. This reference does not evolve evaporation or condensation.'},
 beamSource:{title:'Beam energy and current',apparatus:'source',control:'#fusion-beamCurrentA',result:'beamLedger',label:'Show source energy ledger',hint:'Change beam current at fixed energy and target state. Compare incident power, reaction probability per ion and neutron output in Initial source.'},
 beamTarget:{title:'The evolving target',apparatus:'source',panel:'target',control:'#coupled-pulseDuty',result:'beamDynamics',label:'Show target dynamics',hint:'Choose Use material model if prompted. Change duty or cooldown separately, then compare Dynamics at matched physical time.'},
} as const satisfies Readonly<Record<string,GuideExperiment>>;
export type GuideAction = typeof guideTopics[number]['actions'][number][0]|typeof tutorialActions[number]|keyof typeof guideExperiments;
export const guideActions:ReadonlySet<string>=new Set<string>([...guideTopics.flatMap(topic=>topic.actions.map(([key])=>key)),...tutorialActions,...Object.keys(guideExperiments)]);
