import {validateFuelCurrentEvents,type simulateFuelCentrifuge} from './fuel-centrifuge.js';
import {advanceFuelCoupledStep,fuelTransportSnapshot,sampleFuelTransport,simulateFuelTransport,type FuelCoupledState,type FuelLedger,type FuelTransportOptions,type FuelTransportResult,type FuelTransportCheckpoint,type FuelTransportSnapshot} from './fuel-transport.js';
import {advanceFuelThermal,createFuelLiner,fuelLinerState,initialFuelLinerEnergy} from './fuel-thermal.js';
import {fuelGasState} from './fuel-gas.js';
import {advanceFuelMixtureThermal} from './fuel-gas-thermal.js';
import {fuelTemporalError,type FuelTemporalAccuracy} from './fuel-time-control.js';

const K=1.380649e-23;
type Rotor=ReturnType<typeof simulateFuelCentrifuge>;
export type FuelCurrentEvent={timeS:number;currentA:number};
export type FuelThermalOptions={enabled:boolean;wallCapacityJK:number;gasWallWK:number;coolingWK:number;coolantK:number;
 spatial?:{material:'tungsten';thicknessM:number;cells:number};gas?:{conductivityWMK:number;accuracy?:FuelTemporalAccuracy}};
export type FuelOperation={schemaVersion:1;events:FuelCurrentEvent[];thermal?:FuelThermalOptions};
export type FuelResume={transport:FuelTransportResult;timeS:number};
export const DEFAULT_FUEL_THERMAL:FuelThermalOptions={enabled:false,wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500};

/** Setup is immutable within a run; only the radial discharge current is an event. */
export function validateFuelOperation(operation:FuelOperation,durationS:number){
 if(operation?.schemaVersion!==1)
  throw new RangeError('Unsupported operating history.');
 validateFuelCurrentEvents(operation.events,durationS);
 if(operation.thermal){
  const t=operation.thermal;
  if(typeof t.enabled!=='boolean'||!Number.isFinite(t.wallCapacityJK)||t.wallCapacityJK<=0||!Number.isFinite(t.coolantK)||t.coolantK<=0||
   !Number.isFinite(t.gasWallWK)||t.gasWallWK<0||!Number.isFinite(t.coolingWK)||t.coolingWK<0)
   throw new RangeError('Thermal capacities/temperatures must be positive and conductances nonnegative.');
  if(t.spatial&&(t.spatial.material!=='tungsten'||!Number.isFinite(t.spatial.thicknessM)||t.spatial.thicknessM<.00005||t.spatial.thicknessM>.05||
   !Number.isSafeInteger(t.spatial.cells)||t.spatial.cells<2||t.spatial.cells>128))throw new RangeError('Spatial liner needs tungsten, thickness 0.05–50 mm and 2–128 cells.');
  if(t.gas&&(!t.enabled||!t.spatial||!Number.isFinite(t.gas.conductivityWMK)||t.gas.conductivityWMK<0))
   throw new RangeError('Spatial gas needs an enabled spatial liner and finite nonnegative conductivity.');
  const accuracy=t.gas?.accuracy;
  if(accuracy!==undefined&&(!accuracy||typeof accuracy!=='object'||!Number.isFinite(accuracy.relativeTolerance)||accuracy.relativeTolerance<1e-7||accuracy.relativeTolerance>.01||
   !Number.isFinite(accuracy.temperatureToleranceK)||accuracy.temperatureToleranceK<1e-7||accuracy.temperatureToleranceK>1))
   throw new RangeError('Temporal accuracy needs relative tolerance 1e-7–0.01 and temperature tolerance 1e-7–1 K.');
 }
}

/** An edit in recorded history branches there, discarding later interventions. */
export function fuelCurrentIntervention(events:FuelCurrentEvent[],timeS:number,currentA:number){
 const next=[...events.filter(e=>e.timeS<timeS).map(e=>({...e})),{timeS,currentA}];
 validateFuelOperation({schemaVersion:1,events:next},timeS);return next;
}

/** Same SG/two-rotor backend; steps land exactly on every intervention.
 * Optional lumped or radially resolved solid thermal closure holds N and all
 * mechanical coefficients fixed. Spatial gas also transports species enthalpy;
 * neither thermal option solves discharge kinetics.
 */
export function simulateFuelOperation(rotor:Rotor,operation:FuelOperation,options:FuelTransportOptions={},resume?:FuelResume){
 const c=rotor.config;validateFuelOperation(operation,c.durationS);
 const thermal={...DEFAULT_FUEL_THERMAL,...operation.thermal};
 if(thermal.enabled&&c.pair==='molecular')throw new RangeError('Evolving thermal model supports atomic pairs only; D₂ internal modes are not modeled.');
 if(thermal.enabled&&c.linerK<=0)throw new RangeError('Thermal liner temperature must be positive.');
 const accuracy=thermal.gas?.accuracy;
 const model=simulateFuelTransport({...rotor,config:{...c,durationS:0}},accuracy?{...options,cells:options.cells??256}:options);
 if(accuracy)model.timeControl={method:'BE step doubling',...accuracy,startTimeS:0,acceptedPairs:0,rejectedSteps:0,maxErrorRatio:0};
 const liner=thermal.enabled&&thermal.spatial?createFuelLiner({radiusM:c.radiusM,lengthM:c.lengthM,...thermal.spatial}):undefined;
 if(liner)model.thermalLiner=liner;
 model.durationS=c.durationS;
 const {durationS:_duration,currentA:_current,...setup}=c;
 model.operation={schemaVersion:1,events:structuredClone(operation.events),thermal:{...thermal},setup,initialCurrentA:c.currentA};
 model.assumptions=[...model.assumptions.filter(s=>!thermal.enabled||!s.startsWith('Isothermal independent')),
  'Current events preserve inventories and angular momenta; setup, B, ion inertia, friction, drag frequency, conductivity and D remain prescribed. Editing the past branches the recorded experiment.',
  'Playback retains every accepted integration knot; between knots it interpolates canonical inventories, momenta and energy ledgers. This first-order time approximation does not resolve physics faster than the chosen integration step. Legacy histories retain conservative global resolution bounds when prefix diagnostics are unavailable.',
  ...(thermal.enabled?[
   liner?'Lumped monatomic neutral gas coupled to radial cylindrical tungsten conduction: fixed reference mass/geometry, NIST solid enthalpy and Tolias conductivity, 300–1900 K solid-property domain. Gas and coolant film conductances include half-cell solid resistance. Wall drag is deposited in the innermost cell; slip, Ohmic and signed redistribution work enter gas. Axial heat flow, radiation, thermal expansion and discharge ion/electron temperatures are not solved. Deposition and film coefficients are assumptions, not device calibration.':
   'Two lumped thermal reservoirs: monatomic neutral Cv=3NkB/2, prescribed liner heat capacity and conductances. Ohmic and slip losses and signed redistribution work enter the gas; wall drag enters the liner. Electron/ion temperature, ionization and temperature-dependent transport coefficients are not solved. This deposition partition is assumed, not calibrated.',
   'Fixed particle inventory: mean neutral pressure evolves as initial pressure × T/Tinitial. Numerical mechanical dissipation remains a separate ledger entry, never physical heat. Implicit endpoint temperature changes centrifugal transport; no optical emission prediction.'
  ]:[])];
 const m=rotor.mechanics,n=model.cells,number=c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(K*c.gasK),capacity=1.5*number*K;
 if(thermal.gas){
  model.thermalGas={number,lengthM:c.lengthM};
  model.assumptions=model.assumptions.filter(s=>!s.startsWith('Lumped monatomic')&&!s.startsWith('Fixed particle inventory:'));
  model.assumptions.push('Experimental overdamped ideal-monatomic mixture: local common temperature, pressure-driven SG species flow, enthalpy transport and Fourier heat conduction. Radial inertia, acoustics, Maxwell–Stefan diffusion, Soret/Dufour effects, chemistry and local azimuthal momentum are not solved. D, conductivity, friction and interface film conductance are prescribed, not calibrated. The uniform-pressure v57 material-shell model is not used in a rotating vessel.',
   'The same accepted species transfers evolve neutral inertia and carry species enthalpy. Centrifugal work is split between adjacent gas cells and equals the signed rotor redistribution work once. Slip and Ohmic heat are distributed by endpoint particle inventory; drag heats the innermost tungsten cell. Mechanical backward-Euler dissipation is excluded from physical heat. Spatial gas retains quadratic base time knots and resolves startup, resumed starts and each current switch with additional rotor-timescale steps. Every accepted step is retained for playback; refinement remains necessary. The isothermal free-energy proxy is unavailable for nonuniform temperature.');
 }
 if(accuracy)model.assumptions.push('Temporal control compares one backward-Euler step with two half steps and accepts the conservative half-step path, retaining both knots. Heating-relative gas/solid temperature, spin, phase, species CDF and energy-ledger estimates control time only; spatial and global accuracy still require independent refinement. Time-control counters apply only from startTimeS, excluding a resumed prefix.');
 let linerEnergy=liner?initialFuelLinerEnergy(liner,c.linerK):undefined;
 let gasEnergy=thermal.gas?Array<number>(n).fill(capacity*c.gasK/n):undefined;
 const initialGas=c.gasK,initialWall=c.linerK,initialEnergy=capacity*initialGas+(linerEnergy?linerEnergy.reduce((a,b)=>a+b,0):thermal.wallCapacityJK*initialWall);
 let state:FuelCoupledState={lightMass:Array(n).fill(1/n),heavyMass:Array(n).fill(1/n),ionAngularMomentumKgM2S:0,neutralAngularMomentumKgM2S:0};
 const ledger:FuelLedger={driveWorkJ:0,slipDissipationJ:0,dragDissipationJ:0,redistributionWorkJ:0,numericalDissipationJ:0,
  driveImpulseKgM2S:0,dragImpulseKgM2S:0,ionPhaseRad:0,neutralPhaseRad:0};
 let gasK=initialGas,wallK=initialWall,ohmicEnergyJ=0,coolingEnergyJ=0,current=c.currentA,eventIndex=0,start=0;
 const events=operation.events,dt=c.durationS/model.steps,snapshots:typeof model.snapshots=[],checkpoints:FuelTransportCheckpoint[]=[];
 function validateResolution(maxCellExponent:number,maxCouplingIterations:number){
  if(!Number.isFinite(maxCellExponent)||maxCellExponent<0||!Number.isSafeInteger(maxCouplingIterations)||maxCouplingIterations<0)
   throw new RangeError('Continuation needs finite nonnegative resolution diagnostics.');
 }
 function validateState(s:FuelTransportCheckpoint){
  for(const mass of [s.lightMass,s.heavyMass])if(!Array.isArray(mass)||mass.length!==n||mass.some(v=>!Number.isFinite(v)||v<0)||Math.abs(mass.reduce((a,b)=>a+b,0)-1)>2e-8)
   throw new RangeError('Continuation needs positive, normalized species inventories on the accepted grid.');
  const values=[s.timeS,s.ionAngularMomentumKgM2S,s.neutralAngularMomentumKgM2S,s.ionPhaseRad,s.neutralPhaseRad,
   s.energy?.driveWorkJ,s.energy?.slipDissipationJ,s.energy?.dragDissipationJ,s.energy?.redistributionWorkJ,s.energy?.numericalDissipationJ,
   s.angularMomentum?.driveImpulseKgM2S,s.angularMomentum?.dragImpulseKgM2S];
  if(values.some(v=>!Number.isFinite(v)))throw new RangeError('Continuation needs finite momenta, phases and energy/impulse ledgers.');
  if(s.resolution)validateResolution(s.resolution.maxCellExponent,s.resolution.maxCouplingIterations);
  if(thermal.enabled&&(!s.thermal||[s.thermal.gasK,s.thermal.linerK,s.thermal.pressurePa,s.thermal.gasEnergyJ,s.thermal.linerEnergyJ,
   s.thermal.ohmicEnergyJ,s.thermal.coolingEnergyJ,s.thermal.residualJ,s.thermal.relativeResidual].some(v=>!Number.isFinite(v))||s.thermal.gasK<=0||s.thermal.linerK<=0))
   throw new RangeError('Continuation needs a finite positive thermal state.');
  if(liner){
   const accepted=s.thermal?.spatial;if(!accepted)throw new RangeError('Spatial continuation needs accepted liner cell enthalpies.');
   const canonical=fuelLinerState(liner,accepted.cellEnergyJ);
   if((['temperatureK','radiusM'] as const).some(key=>!Array.isArray(accepted[key])||accepted[key].length!==canonical[key].length||
     accepted[key].some((t,i)=>!Number.isFinite(t)||Math.abs(t-canonical[key][i])>1e-10*Math.max(1,Math.abs(canonical[key][i]))))||
    (['meanK','innerK','outerK','minK','maxK','energyJ'] as const).some(key=>!Number.isFinite(accepted[key])||Math.abs(accepted[key]-canonical[key])>1e-10*Math.max(1,Math.abs(canonical[key])))||
    Math.abs(s.thermal!.linerEnergyJ-canonical.energyJ)>1e-8*Math.max(1,Math.abs(canonical.energyJ))||Math.abs(s.thermal!.linerK-canonical.meanK)>1e-7)
    throw new RangeError('Spatial continuation temperatures must match conserved cell enthalpies.');
  }
  if(model.thermalGas){
   const accepted=s.thermal?.gas;if(!accepted)throw new RangeError('Spatial gas continuation needs accepted cell energies.');
   const canonical=fuelGasState(s.lightMass,s.heavyMass,accepted.cellEnergyJ,{...model.thermalGas,radiusM:c.radiusM,lightFraction:c.lightFraction});
   const close=(a:number,b:number)=>Number.isFinite(a)&&Math.abs(a-b)<=256*Number.EPSILON*Math.max(Number.MIN_VALUE,Math.abs(a),Math.abs(b));
   if((['temperatureK','pressurePa','radiusM','cellEnergyJ'] as const).some(key=>!Array.isArray(accepted[key])||accepted[key].length!==n||accepted[key].some((v,i)=>!close(v,canonical[key][i])))||
    (['meanK','minK','maxK','energyJ'] as const).some(key=>!close(accepted[key],canonical[key]))||
    !Array.isArray(accepted.speciesEnergyJ)||accepted.speciesEnergyJ.length!==2||accepted.speciesEnergyJ.some((row,species)=>!Array.isArray(row)||row.length!==n||row.some((v,i)=>!close(v,canonical.speciesEnergyJ[species][i])))||
    !close(s.thermal!.gasK,canonical.meanK)||!close(s.thermal!.gasEnergyJ,canonical.energyJ)||!close(s.thermal!.pressurePa,c.pressurePa*canonical.meanK/initialGas))
    throw new RangeError('Spatial gas continuation fields must match conserved species inventories and cell energies.');
  }
 }
 if(resume){
  const previous=resume.transport;
  if(accuracy&&previous.steps!==model.steps)throw new RangeError('Adaptive continuation needs the same nominal time grid.');
  if(model.thermalGas&&JSON.stringify(previous.thermalGas)!==JSON.stringify(model.thermalGas))throw new RangeError('Spatial gas continuation needs the same particle inventory and geometry.');
  if(liner&&(!previous.thermalLiner||JSON.stringify(previous.thermalLiner)!==JSON.stringify(liner)))throw new RangeError('Spatial continuation needs the same accepted liner grid and material masses.');
  if(!Number.isFinite(resume.timeS)||resume.timeS<0||resume.timeS>previous.durationS||resume.timeS>c.durationS||previous.cells!==n||
   ['radiusM','gasK','lightFraction','cutFraction','diffusivityM2S'].some(key=>previous[key as keyof FuelTransportResult]!==model[key as keyof FuelTransportResult])||
   JSON.stringify(previous.speciesMassKg)!==JSON.stringify(model.speciesMassKg)||JSON.stringify(previous.mechanics)!==JSON.stringify(model.mechanics)||
   JSON.stringify(previous.operation?.thermal)!==JSON.stringify(model.operation.thermal)||
   previous.operation?.initialCurrentA!==c.currentA||!previous.operation?.setup||Object.keys(setup).some(key=>(previous.operation!.setup as Record<string,unknown>)[key]!==setup[key as keyof typeof setup]))throw new RangeError('Continuation must use the same apparatus and thermal setup.');
  const prefix=events.filter(e=>e.timeS<resume.timeS),oldPrefix=previous.operation.events.filter(e=>e.timeS<resume.timeS);
  if(prefix.length!==oldPrefix.length||prefix.some((e,i)=>e.timeS!==oldPrefix[i].timeS||e.currentA!==oldPrefix[i].currentA))throw new RangeError('Continuation cannot rewrite earlier current events.');
  for(const p of [...previous.snapshots,...(previous.checkpoints??[])])if(p.timeS<=resume.timeS)validateState(p);
  const s=sampleFuelTransport(previous,resume.timeS);validateState(s);start=s.timeS;
  state={lightMass:[...s.lightMass],heavyMass:[...s.heavyMass],ionAngularMomentumKgM2S:s.ionAngularMomentumKgM2S,neutralAngularMomentumKgM2S:s.neutralAngularMomentumKgM2S};
  Object.assign(ledger,{driveWorkJ:s.energy.driveWorkJ,slipDissipationJ:s.energy.slipDissipationJ,dragDissipationJ:s.energy.dragDissipationJ,
   redistributionWorkJ:s.energy.redistributionWorkJ,numericalDissipationJ:s.energy.numericalDissipationJ,
   driveImpulseKgM2S:s.angularMomentum.driveImpulseKgM2S,dragImpulseKgM2S:s.angularMomentum.dragImpulseKgM2S,
   ionPhaseRad:s.ionPhaseRad,neutralPhaseRad:s.neutralPhaseRad});
  if(thermal.enabled){if(!s.thermal)throw new RangeError('Continuation is missing thermal state.');({gasK,linerK:wallK,ohmicEnergyJ,coolingEnergyJ}=s.thermal);}
  if(liner)linerEnergy=[...s.thermal!.spatial!.cellEnergyJ];
  if(thermal.gas)gasEnergy=[...s.thermal!.gas!.cellEnergyJ];
  snapshots.push(...structuredClone(previous.snapshots.filter(p=>p.timeS<start)));
  for(const p of structuredClone((previous.checkpoints??previous.snapshots).filter(p=>p.timeS<start))){
   if(!('profiles' in p))checkpoints.push(p);
   else{const {profiles:_profiles,lightCDF:_lightCDF,heavyCDF:_heavyCDF,...checkpoint}=p as FuelTransportSnapshot;checkpoints.push(checkpoint);}
  }
  // Older accepted histories have no prefix diagnostics. Their global values
  // are conservative bounds, rather than silently reporting zero resolution.
  model.maxCellExponent=s.resolution?.maxCellExponent??previous.maxCellExponent;
  model.maxCouplingIterations=s.resolution?.maxCouplingIterations??previous.maxCouplingIterations;
  validateResolution(model.maxCellExponent,model.maxCouplingIterations);
  if(model.timeControl)model.timeControl.startTimeS=start;
 }
 function applyEvents(time:number){while(eventIndex<events.length&&events[eventIndex].timeS<=time){current=events[eventIndex++].currentA;}}
 function observe(time:number){
  const s=fuelTransportSnapshot({...model,gasK},time,state,ledger);s.currentA=current;
  s.resolution={maxCellExponent:model.maxCellExponent,maxCouplingIterations:model.maxCouplingIterations};
  if(thermal.enabled){
   const spatial=liner&&linerEnergy?fuelLinerState(liner,linerEnergy):undefined;
   const gas=model.thermalGas&&gasEnergy?fuelGasState(state.lightMass,state.heavyMass,gasEnergy,{...model.thermalGas,radiusM:c.radiusM,lightFraction:c.lightFraction}):undefined;
   const gasEnergyJ=gas?.energyJ??capacity*gasK,linerEnergyJ=spatial?.energyJ??thermal.wallCapacityJK*wallK;
   const residualJ=s.energy.kineticJ+gasEnergyJ+linerEnergyJ-initialEnergy-ledger.driveWorkJ-ohmicEnergyJ+coolingEnergyJ+ledger.numericalDissipationJ;
   const scale=initialEnergy+Math.abs(ledger.driveWorkJ)+ohmicEnergyJ+Math.abs(coolingEnergyJ)+s.energy.kineticJ;
   s.thermal={gasK,linerK:wallK,pressurePa:c.pressurePa*gasK/initialGas,gasEnergyJ,linerEnergyJ,ohmicEnergyJ,coolingEnergyJ,residualJ,relativeResidual:Math.abs(residualJ)/scale};
   if(spatial)s.thermal.spatial=spatial;
   if(gas)s.thermal.gas=gas;
   if(s.thermal.relativeResidual>2e-8)throw new RangeError('Thermal energy budget failed; refine the time step.');
  }
  return s;
 }
 function retain(s:FuelTransportSnapshot,saveSnapshot=true){
  const {profiles:_profiles,lightCDF:_lightCDF,heavyCDF:_heavyCDF,...checkpoint}=s;checkpoints.push(checkpoint);
  if(saveSnapshot)snapshots.push(s);
 }
 function capture(time:number,saveSnapshot=true){retain(observe(time),saveSnapshot);}
 function advance(dtS:number){
  const torque=current*c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
  const ohmic=dtS*current**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
  const parameters={...model,mechanics:{...m,torque}};
  const at=(temperature:number)=>advanceFuelCoupledStep({...parameters,gasK:temperature},state,dtS);
  let next;
  if(thermal.gas&&liner&&linerEnergy&&gasEnergy){
   const coupled=advanceFuelMixtureThermal(liner,linerEnergy,gasEnergy,number,c.lightFraction,c.radiusM,c.lengthM,dtS,thermal,{...thermal.gas,lightMass:state.lightMass,heavyMass:state.heavyMass},temperatures=>{
    const result=advanceFuelCoupledStep({...parameters,gasTemperaturesK:temperatures},state,dtS),e=result.energyIncrement;
    const fractions=result.lightMass.map((p,i)=>c.lightFraction*p+(1-c.lightFraction)*result.heavyMass[i]);
    const gasSourceJ=fractions.map(p=>p*(e.slipDissipationJ+ohmic));
    let work=0;
    for(let i=0;i<n-1;i++){
     const transfer=result.faceTransfers!.reduce((total,face,s)=>total+number*(s?1-c.lightFraction:c.lightFraction)*model.speciesMassKg[s]*face[i],0);
     const faceWork=.5*result.neutralRadS**2*c.radiusM**2/n*transfer;
     gasSourceJ[i]+=faceWork/2;gasSourceJ[i+1]+=faceWork/2;work+=faceWork;
    }
    if(Math.abs(work-e.redistributionWorkJ)>2e-10*Math.max(Math.abs(work),Math.abs(e.redistributionWorkJ),capacity*gasK))
     throw new RangeError('Species face work and rotor redistribution work disagree.');
    return {...result,faceTransfers:result.faceTransfers!,gasSourceJ,dragEnergyJ:e.dragDissipationJ,payload:result};
   });
   gasEnergy=coupled.gasEnergyJ;gasK=coupled.meanGasK;wallK=coupled.meanK;linerEnergy=coupled.cellEnergyJ;
   coolingEnergyJ+=coupled.coolingEnergyJ;ohmicEnergyJ+=ohmic;next=coupled.payload;
  }else if(thermal.enabled&&liner&&linerEnergy){
   const coupled=advanceFuelThermal(liner,linerEnergy,gasK,capacity,dtS,thermal,temperature=>{
    const result=at(temperature),e=result.energyIncrement;
    return {gasEnergyJ:e.slipDissipationJ+e.redistributionWorkJ+ohmic,dragEnergyJ:e.dragDissipationJ,payload:result};
   });
   gasK=coupled.gasK;wallK=coupled.meanK;linerEnergy=coupled.cellEnergyJ;
   coolingEnergyJ+=coupled.coolingEnergyJ;ohmicEnergyJ+=ohmic;next=coupled.payload;
  }else if(thermal.enabled){
   const cw=thermal.wallCapacityJK,g=dtS*thermal.gasWallWK,h=dtS*thermal.coolingWK;
   const evaluate=(temperature:number)=>{
    const result=at(temperature),e=result.energyIncrement;
    const wall=(cw*wallK+e.dragDissipationJ+g*temperature+h*thermal.coolantK)/(cw+g+h);
    const exchange=g*(cw*(temperature-wallK)+h*(temperature-thermal.coolantK)-e.dragDissipationJ)/(cw+g+h);
    const residual=capacity*(temperature-gasK)+exchange-e.slipDissipationJ-e.redistributionWorkJ-ohmic;
    return {temperature,wall,residual,result};
   };
   // Positive-temperature bracket; signed inward redistribution can draw heat.
   let lo=1e-6,hi=Math.max(gasK,wallK,thermal.coolantK,1),low=evaluate(lo),high=evaluate(hi),iterations=0;
   while(high.residual<0&&iterations++<60){hi*=2;high=evaluate(hi);}
   if(low.residual>0||high.residual<0||!Number.isFinite(high.residual))throw new RangeError('Thermal closure has no positive-temperature bracket.');
   const tolerance=Math.max(2e-12*Math.max(capacity*gasK,Math.abs(high.result.energyIncrement.driveWorkJ),ohmic,1e-20),
    32*Number.EPSILON*(capacity+g*(cw+h)/(cw+g+h))*Math.max(gasK,wallK,thermal.coolantK,hi));
   let chosen=high;
   for(let i=0;i<80;i++){
    const t=(lo+hi)/2;chosen=evaluate(t);
    if(Math.abs(chosen.residual)<=tolerance)break;
    if(chosen.residual>0)hi=t;else lo=t;
   }
   if(!Number.isFinite(chosen.residual)||Math.abs(chosen.residual)>tolerance)throw new RangeError('Coupled thermal solve did not converge.');
   coolingEnergyJ+=h*(cw*(wallK-thermal.coolantK)+chosen.result.energyIncrement.dragDissipationJ+g*(chosen.temperature-thermal.coolantK))/(cw+g+h);
   gasK=chosen.temperature;wallK=chosen.wall;next=chosen.result;ohmicEnergyJ+=ohmic;
  }else next=at(gasK);
  if(Math.abs(next.ionRadS*c.radiusM)>=299792458*.01)throw new RangeError('Ion speed exceeds the nonrelativistic operating model.');
  state=next;model.maxCouplingIterations=Math.max(model.maxCouplingIterations,next.iterations);
  ledger.driveImpulseKgM2S+=next.driveImpulseKgM2S;ledger.dragImpulseKgM2S+=next.dragImpulseKgM2S;
  ledger.ionPhaseRad+=dtS*next.ionRadS;ledger.neutralPhaseRad+=dtS*next.neutralRadS;
  for(const key of Object.keys(next.energyIncrement) as (keyof typeof next.energyIncrement)[])ledger[key]+=next.energyIncrement[key];
  const minimumGasK=gasEnergy&&model.thermalGas?fuelGasState(state.lightMass,state.heavyMass,gasEnergy,{...model.thermalGas,radiusM:c.radiusM,lightFraction:c.lightFraction}).minK:gasK;
  model.maxCellExponent=Math.max(model.maxCellExponent,Math.max(...model.speciesMassKg)*(next.neutralRadS*c.radiusM)**2/(2*K*minimumGasK*n));
 }
 applyEvents(start);capture(start);
 let time=start;
 let transientStart=start,relaxationS=Infinity,proposalS=Infinity,attempts=0;
 function save(){return {state,gasEnergy,linerEnergy,gasK,wallK,ohmicEnergyJ,coolingEnergyJ,ledger:{...ledger},
  maxCellExponent:model.maxCellExponent,maxCouplingIterations:model.maxCouplingIterations};}
 function restore(saved:ReturnType<typeof save>){
  ({state,gasEnergy,linerEnergy,gasK,wallK,ohmicEnergyJ,coolingEnergyJ}=saved);Object.assign(ledger,saved.ledger);
  model.maxCellExponent=saved.maxCellExponent;model.maxCouplingIterations=saved.maxCouplingIterations;
 }
 function restartTransient(){
  transientStart=time;
  proposalS=Infinity;
  // The positive two-rotor decay rates sum to this trace. Its reciprocal
  // bounds the fastest relaxation time, using the accepted gas inertia.
  relaxationS=1/(m.gamma/m.ii+m.gamma/checkpoints.at(-1)!.neutralInertiaKgM2+m.drag/m.nn);
 }
 function advanceTo(target:number){
  while(time<target){
   // At the default 512 intervals, resolve the initial relaxation scale
   // with at least 64 steps. Grow spacing with transient age, then let
   // the quadratic base grid bound the slower thermal/transport evolution.
   const next=thermal.gas?Math.min(target,time+(time-transientStart+relaxationS)*8/model.steps,
    accuracy?time+proposalS:Infinity):target;
   if(next<=time)throw new RangeError('Requested rotor timestep is below floating-point time resolution.');
   if(accuracy){
    if(++attempts>100000)throw new RangeError('Temporal accuracy exceeded its step budget; reduce the run horizon or relax tolerances explicitly.');
    const before=save(),h=next-time,midpoint=time+h/2;
    if(midpoint<=time||midpoint>=next)throw new RangeError('Requested accuracy is below floating-point time resolution.');
    let accepted=false;
    try{
     advance(h);const coarse=observe(next);restore(before);
     advance(midpoint-time);const half=observe(midpoint);
     advance(next-midpoint);const fine=observe(next);
     const error=fuelTemporalError(coarse,fine,accuracy,initialGas,initialWall,capacity*initialGas);
     proposalS=h*Math.max(.2,Math.min(2,.9/Math.sqrt(Math.max(error,1e-12))));
     if(error>1){model.timeControl!.rejectedSteps++;continue;}
     model.timeControl!.acceptedPairs++;model.timeControl!.maxErrorRatio=Math.max(model.timeControl!.maxErrorRatio,error);
     accepted=true;retain(half,false);time=next;
     if(time<target)retain(fine,false);
    }finally{if(!accepted)restore(before);}
    continue;
   }
   advance(next-time);time=next;
   if(time<target)capture(time,false);
  }
 }
 restartTransient();
 const stride=Math.max(1,Math.ceil(model.steps/100));
 for(let j=1;j<=model.steps&&c.durationS>0;j++){
  const target=j===model.steps?c.durationS:thermal.gas?c.durationS*(j/model.steps)**2:j*dt;
  if(target<=start)continue;
  while(eventIndex<events.length&&events[eventIndex].timeS<=target){
   const eventTime=events[eventIndex].timeS;advanceTo(eventTime);
   applyEvents(time);capture(time);restartTransient();
  }
  if(target>time){advanceTo(target);capture(time,j%stride===0||j===model.steps);}
 }
 model.snapshots=snapshots;model.checkpoints=checkpoints;
 model.maxBalanceError=0;model.maxAngularMomentumRelativeError=0;model.maxEnergyRelativeError=0;
 for(const s of checkpoints){
  model.maxBalanceError=Math.max(model.maxBalanceError,Math.abs(s.balances.light-1),Math.abs(s.balances.heavy-1));
  model.maxAngularMomentumRelativeError=Math.max(model.maxAngularMomentumRelativeError,s.angularMomentum.relativeResidual);
  model.maxEnergyRelativeError=Math.max(model.maxEnergyRelativeError,s.energy.relativeResidual);
 }
 if([model.maxBalanceError,model.maxAngularMomentumRelativeError,model.maxEnergyRelativeError].some(v=>!Number.isFinite(v)||v>2e-8))
  throw new RangeError('Operating history failed inventory or mechanical conservation.');
 return model;
}
