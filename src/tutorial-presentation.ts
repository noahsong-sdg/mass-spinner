import {guideExperiments} from './guide-topics.js';

/** Reader routes are local documents. Query strings and external locations are not reader routes. */
export function tutorialRoute(value:string|null):string|null{
 if(!value)return null;
 return /^\/(?:learn|start|guide|tutorial-0[3-6])(?:\.html)?(?:#[a-z][a-z0-9-]*)?$/.test(value)?value:null;
}

export type TutorialPresentation={watch:string;note:string;plot?:string;component?:string};
const composition={watch:'Compare the light fraction at the center and wall.',note:'Composition is a local percentage. Density is the number of particles per volume.',plot:'composition'};
const spin={watch:'Compare ion speed with neutral-gas speed at the same time.',note:'The drive acts on charged gas. Collisions transfer rotation to neutral gas.',plot:'spin'};
const heat={watch:'Compare energy supplied with energy stored and lost.',note:'Numerical dissipation is not physical heat. Fixed temperature does not calculate heating.',plot:'heat'};
const cut={watch:'Move along the collection curve. Compare purity with recovery.',note:'Each cut includes all gas inside its radius. The model does not extract gas.',plot:'cut'};
export const tutorialPresentations:Readonly<Record<string,TutorialPresentation>>={
 look:{watch:'Find the gas between the stationary electrodes.',note:'Use Field, Current and Force to see the drive directions. Use Replay motion to see the gas turn.'},
 coils:{watch:'Find the coils around the stationary vessel.',note:'The coils supply an axial magnetic field. They do not mechanically turn the gas.',component:'coils'},
 current:spin,currentExperiment:spin,spin:{...spin,note:'Slow motion uses calculated bulk speeds, not individual atom paths. Collisions transfer rotation from ions to neutral gas.'},endSpin:spin,spinPlot:spin,collisions:spin,drag:spin,
 composition,compositionPlot:composition,axis:composition,wall:composition,
 density:{watch:'Compare both species at the same radius.',note:'Both densities can increase outward while the light fraction decreases.',plot:'profile'},
 momentum:{watch:'Compare total angular momentum with drive minus wall impulse.',note:'Collisions transfer angular momentum between populations. They do not create it.',plot:'momentum'},
 inertia:{watch:'Compare gas inertia as mass moves radially.',note:'Mass farther from the axis needs more angular momentum for the same angular speed.',plot:'inertia'},
 work:heat,thermal:{watch:'Enable thermal evolution to calculate heating.',note:'The default thermal bath holds temperature constant. A fixed-temperature run has no thermal evolution.',plot:'thermal'},
 thermalPlot:{watch:'Compare gas and liner temperatures over time.',note:'Read results at the same physical time. Thermal evolution must be enabled.',plot:'thermal'},
 thermalProfile:{watch:'Compare gas and wall temperature across the radius.',note:'A temperature gradient drives heat flow. The spatial thermal model resolves radial temperatures.',plot:'thermalProfile'},
 gasEnergy:{watch:'Compare the species energy profiles across the radius.',note:'These are modeled bulk energies, not electron temperatures.',plot:'gasEnergy'},
 gasPressure:{watch:'Compare gas pressure across the radius.',note:'Pressure depends on number density and temperature.',plot:'gasPressure'},
 temperature:{watch:'Compare the equilibrium reference at twice the temperature.',note:'At fixed rotation, twice the temperature halves ln α. It does not halve purity.',plot:'composition'},
 rotation:{watch:'Compare the equilibrium reference at twice the angular speed.',note:'At fixed temperature, twice the speed multiplies ln α by four. Purity does not follow this factor.',plot:'composition'},
 collection:cut,cut,collectionExperiment:cut,
 diffusion:{watch:'Compare separation at the same physical time.',note:'Pin A before changing diffusivity. Diffusivity controls transport time, not the ideal equilibrium bias.',plot:'separation'},
 duration:{watch:'Compare separation before and after more time has elapsed.',note:'A finite-time result can differ from equilibrium.',plot:'separation'},
 separationPlot:{watch:'Follow the change in separation over time.',note:'A short run can show little separation even when equilibrium favors it.',plot:'separation'},
 magneticLeverage:{watch:'Compare resistive power at the same torque.',note:'This reference adjusts current as B changes. Changing B alone is a different experiment.',plot:'field'},
 cascade:{watch:'Compare product purity, recovery and internal circulation.',note:'This is an ideal stage-routing reference, not resolved interstage flow.',plot:'cascade'},
 stageControls:{watch:'Change one stage input and compare the routing reference.',note:'More stages can require more internal circulation.',plot:'cascade'},
 pumping:{watch:'Compare pump speed with inlet conductance.',note:'This steady reference does not drive the rotating-gas flow.',plot:'pump'},
 pumpControls:{watch:'Change pump speed and compare the inlet limit.',note:'A larger pump cannot remove an inlet conductance limit.',plot:'pump'},
 fuelInventory:{watch:'Compare fuel held in processing with fuel burned.',note:'This fuel-loop reference is separate from lithium transport. It is not the total plant inventory.',plot:'inventory'},
 inventoryControls:{watch:'Change burn fraction or processing time, one at a time.',note:'Keep fusion power constant when comparing processing inventories.',plot:'inventory'},
 lithiumSurfaces:{watch:'Compare saturation pressure at two surface temperatures.',note:'This reference does not calculate evaporation or condensation over time.',plot:'lithium'},
 modelInfo:{watch:'Compare the model assumptions with the claim you want to make.',note:'A conservation or convergence check does not establish experimental accuracy.'},
 equilibrium:{watch:'Compare equilibrium composition with the chosen inventory cut.',note:'This independent calculator assumes rigid rotation and uniform temperature.'},
 pin:{watch:'Keep this accepted run as comparison A.',note:'Change one input. Compare A and B at the same physical time.'},
 newRun:{watch:'Follow the new run with the current physical inputs.',note:'A new run starts from its specified initial state.'},
 cutPower:{watch:'Watch rotation after the current stops.',note:'The gas keeps angular momentum. Wall drag decreases it.',plot:'spin'},
 controls:{watch:'Choose one physical input to change.',note:'Compare runs at the same physical time. Display controls change only the view.'},
 view:{watch:'Change the view without changing the physical inputs.',note:'Colors and weighted markers show model values, not visible light or resolved atom paths.'},
 inspect:{watch:'Select a component to read its role and material assumptions.',note:'Use Controls to change physical inputs.'},
 gasTemperature:{watch:'Compare separation at two gas temperatures.',note:'At fixed rotation, higher temperature weakens the ideal equilibrium bias.',plot:'composition'},
 beamLedger:{watch:'Compare incident beam power with fusion output and heat.',note:'This beam–target source is separate from the centrifuge and the future power reactor.'},
 beamDynamics:{watch:'Compare target loading and temperature at the same physical time.',note:'The target model is conditional on its material and stopping assumptions.'},
};
export function tutorialPresentation(key:string):TutorialPresentation|undefined{
 const experiment=guideExperiments[key as keyof typeof guideExperiments];
 return tutorialPresentations[key]??(experiment?{...tutorialPresentations[experiment.result],watch:experiment.title,note:experiment.hint}:undefined);
}
