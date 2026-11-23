/** Keep anchors and action IDs stable for existing links.
 * Readers put their action links beside the related Markdown instructions. */
export type GuideTopic = {id:string;heading:string;diagram?:string|readonly string[];actions:readonly (readonly [string,string])[]};
export const guideTopics=[
 {id:'goal',heading:'What do we want to calculate?',diagram:'goal',actions:[['spin','Replay spin-up']]},
 {id:'composition',heading:'1. Why does rotation separate masses?',diagram:['turning','density-scan','composition'],actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall'],['density','Show species density']]},
 {id:'bias',heading:'2. How strong is the separation?',diagram:'bias',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation'],['equilibrium','Open equilibrium calculator']]},
 {id:'drive',heading:'3. How does electricity turn the gas?',diagram:'drive',actions:[['look','Show gas & drive'],['current','Adjust current']]},
 {id:'momentum',heading:'4. What sets the rotation speed?',diagram:'spin',actions:[['currentExperiment','Try the current experiment'],['endSpin','Show end-of-run speeds'],['spin','Replay spin-up'],['momentum','Show angular momentum'],['inertia','Show gas inertia'],['current','Adjust current'],['collisions','Adjust collisions'],['drag','Adjust wall drag']]},
 {id:'energy',heading:'5. Where does the energy go?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
 {id:'collection',heading:'6. How do time and collection change the result?',diagram:'inventory-cut',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve'],['diffusion','Adjust diffusivity'],['duration','Adjust run duration']]},
 {id:'limits',heading:'Which model parts are necessary, and what is missing?',actions:[['pin','Pin this run as A']]},
 {id:'views',heading:'What do the menu options mean?',diagram:'views',actions:[]},
 {id:'path',heading:'What comes next?',actions:[]},
] as const satisfies readonly GuideTopic[];
export type GuideTopicId = typeof guideTopics[number]['id'];
/** These tutorials continue Tutorial 2. They do not add simulation modes. */
export const numberedTutorials = [
 {number:'03',title:'Heating and cooling',topics:[
  {id:'budget',heading:'Why add a temperature model?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
  {id:'flow',heading:'Where does the heat go?',diagram:'heat-flow',actions:[['thermalProfile','Show temperature profile'],['gasEnergy','Show species energy']]},
  {id:'limits',heading:'Can a field change decrease resistive heating?',diagram:'magnetic',actions:[['magneticLeverage','Show magnetic leverage'],['lithiumSurfaces','Show lithium surfaces']]},
 ]},
 {number:'04',title:'Purity and recovery',topics:[
  {id:'sample',heading:'How much light isotope did you keep?',diagram:'inventory-cut',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve']]},
  {id:'stages',heading:'Why use more than one stage?',diagram:'stages',actions:[['cascade','Show stages reference'],['stageControls','Adjust stages']]},
  {id:'pumping',heading:'How much gas can enter a process?',diagram:'pumping',actions:[['pumping','Show pumping reference'],['pumpControls','Adjust pump speed']]},
 ]},
 {number:'05',title:'Fusion fuel cycle',topics:[
  {id:'jobs',heading:'What are the three processes?',diagram:'fuel-cycle',actions:[]},
  {id:'inventory',heading:'How much fuel stays in processing equipment?',diagram:'inventory',actions:[['fuelInventory','Show D–T fuel inventory'],['inventoryControls','Open fuel inventory controls']]},
  {id:'design',heading:'Does this give the total fuel inventory?',diagram:'scope',actions:[['modelInfo','Open model assumptions']]},
 ]},
 {number:'06',title:'Model accuracy',topics:[
  {id:'questions',heading:'What does a test show?',actions:[['modelInfo','Open qualification and evidence']]},
  {id:'sensitivity',heading:'Which input can change the result?',actions:[['pin','Pin accepted run A'],['diffusion','Adjust diffusivity'],['newRun','New run'],['separationPlot','Show separation over time']]},
  {id:'prediction',heading:'Which predictions have sufficient evidence?',diagram:'diagnostic',actions:[['modelInfo','Open measured-reference assessment']]},
 ]},
] as const satisfies readonly {number:string;title:string;topics:readonly GuideTopic[]}[];
/** Additional actions for the numbered tutorials. */
export const tutorialActions=['spinPlot','compositionPlot','separationPlot','thermalProfile','gasEnergy','gasPressure','gasTemperature','magneticLeverage','cascade','pumping','fuelInventory','lithiumSurfaces','stageControls','pumpControls','inventoryControls','newRun','cutPower','controls','inspect','view','modelInfo','beamLedger','beamDynamics'] as const;
/** Open the existing inputs and results. Do not change physical inputs. */
export type GuideExperiment={title:string;control:string;result:string;label:string;hint:string;apparatus?:'source';panel?:'target'};
export const guideExperiments={
 heatExperiment:{title:'Heat storage',control:'#fuel-thermal-enabled',result:'thermalPlot',label:'Show temperature',hint:'Use an atomic feed. Select Evolve gas & liner temperature. Wait for the run. Compare at the same physical time.'},
 spatialHeatExperiment:{title:'Radial heat flow',control:'#fuel-thermal-enabled',result:'thermalProfile',label:'Show temperature profile',hint:'Use an atomic feed. Select thermal evolution. Select Radial tungsten liner. Select Spatial mixture · experimental. Wait for the run before you read the profile.'},
 collectionExperiment:{title:'Purity and recovery',control:'#fuel-cutFraction',result:'collection',label:'Show end-of-run cuts',hint:'Use Isotope separation with a mixed feed. Probe two radii on the plot. The cut slider below divides the inventory but does not extract gas.'},
 stageExperiment:{title:'Countercurrent stages',control:'#fuel-stages',result:'cascade',label:'Show stages',hint:'Use Isotope separation. Change Stages or Feed stage, one at a time. Compare purity, recovery and circulation. This is an ideal routing reference.'},
 pumpingExperiment:{title:'Pump and inlet limits',control:'#fuel-application',result:'pumping',label:'Show pumping reference',hint:'Select Differential pumping. Change Outer pump speed. Compare the result. Then change Inlet conductance. This reference does not drive rotor flow.'},
 inventoryExperiment:{title:'Fuel held in processing',control:'#fuel-burnFraction',result:'fuelInventory',label:'Show fuel inventory',hint:'Keep fusion power constant. Decrease the burn fraction by half. Compare the result. Restore the burn fraction. Increase the processing time by a factor of two. These fuel-loop inputs do not describe lithium transport.'},
 diffusionExperiment:{title:'Time to separate',control:'#fuel-radialDiffusivityM2S',result:'separationPlot',label:'Show separation over time',hint:'Use a mixed feed with power in Coupled separation. Select Pin A. Change only diffusivity. Select New run. Compare at the same physical time.'},
 dragExperiment:{title:'Rotation losses',control:'#fuel-dragHz',result:'spinPlot',label:'Show speed history',hint:'Select Pin A. Change only wall drag. Select New run. Compare speeds at the same physical time before you compare composition.'},
 fieldExperiment:{title:'Magnetic leverage',control:'#fuel-magneticT',result:'magneticLeverage',label:'Show magnetic leverage',hint:'This reference curve changes current to hold torque constant. A change to B alone in Controls is a different experiment. Compare the selected marker with the reference curve.'},
 surfaceExperiment:{title:'Lithium surfaces',control:'#fuel-linerK',result:'lithiumSurfaces',label:'Show surface reference',hint:'Select an atomic lithium feed. Compare saturation at two liner temperatures. This reference does not calculate evaporation or condensation over time.'},
 beamSource:{title:'Beam energy and current',apparatus:'source',control:'#fusion-beamCurrentA',result:'beamLedger',label:'Show source energy ledger',hint:'Keep the beam energy and target state constant. Change beam current. Compare incident power, reaction probability per ion and neutron output in Initial source.'},
 beamTarget:{title:'The evolving target',apparatus:'source',panel:'target',control:'#coupled-pulseDuty',result:'beamDynamics',label:'Show target dynamics',hint:'If the option appears, select Use material model. Change duty or cooldown, one at a time. Compare Dynamics at the same physical time.'},
} as const satisfies Readonly<Record<string,GuideExperiment>>;
export type GuideAction = typeof guideTopics[number]['actions'][number][0]|typeof tutorialActions[number]|keyof typeof guideExperiments;
export const guideActions:ReadonlySet<string>=new Set<string>([...guideTopics.flatMap(topic=>topic.actions.map(([key])=>key)),...tutorialActions,...Object.keys(guideExperiments)]);
