import {simulateFusionBeam,MaterialSlabDomainError,DTCrossSectionDomainError,type FusionBeamConfig} from './fusion-reactor.js';
import {E_CHARGE} from './physics.js';

type FusionPlaygroundCurve = ReturnType<typeof simulateFusionBeam>['curves'][number] & {
 yDomain?:readonly [number,number]; selectedX?:number;
};

export interface FusionPlaygroundData {
 excludedEnergiesKeV:number[];
 spotRadiusM:number;
 metrics:[string,number|null,string][];
 profiles:FusionPlaygroundCurve[];
 curves:FusionPlaygroundCurve[];
}

function energyScan(c:FusionBeamConfig){
 const energy=[...new Set([...Array.from({length:25},(_,i)=>20+20*i),c.beamEnergyKeV])].sort((a,b)=>a-b);
 // Fixed toy column/fractional slowing is a family of imposed stopping laws,
 // not an energy scan of one measured material. Include the actual input point.
 const excludedEnergiesKeV:number[]=[];
 const scan=energy.flatMap(beamEnergyKeV=>{
  try{return [simulateFusionBeam({...c,beamEnergyKeV})];}
  catch(error){if(!(error instanceof MaterialSlabDomainError||error instanceof DTCrossSectionDomainError))throw error;excludedEnergiesKeV.push(beamEnergyKeV);return [];}
 });
 const scanEnergy=scan.map(s=>s.config.beamEnergyKeV);
 return {excludedEnergiesKeV,scanEnergy,probability:scan.map(s=>s.fusionProbability)};
}
function present(r:ReturnType<typeof simulateFusionBeam>,scan:ReturnType<typeof energyScan>):FusionPlaygroundData{
 const c=r.config,{excludedEnergiesKeV,scanEnergy,probability}=scan;
 const specificYield=probability.map((value,i)=>c.acceleratorEfficiency*value/(scanEnergy[i]*1000*E_CHARGE));
 return {
  excludedEnergiesKeV,
  spotRadiusM:Math.sqrt(c.beamAreaM2/Math.PI),
  metrics:[
   ['D–T neutron production',r.neutronRateS,'s⁻¹'],
   ['Fusion probability',r.fusionProbability*1e6,'per million D⁺'],
   ['Incident beam',r.beamPowerW,'W'],
   ['Assembly heat¹',r.assemblyHeatIfTransmittedBeamStoppedW,'W'],
   ['Heat / beam area¹',r.assemblyHeatIfTransmittedBeamStoppedW/c.beamAreaM2,'W/m²'],
   ['Fusion / beam power',r.beamGain,''],
  ],
  profiles:r.curves.map((curve,i)=>i===0?{...curve,yDomain:[0,1] as const}:i===1?{...curve,yDomain:[0,Math.max(...curve.y)||1] as const}:curve),
  curves:[
   {label:'Fusion probability',x:scanEnergy,y:probability,xLabel:'D⁺ laboratory energy (keV)',yLabel:'Fusion probability per incident D⁺',selectedX:c.beamEnergyKeV,yDomain:[0,Math.max(...probability)||1]},
   {label:'Accelerator only',x:scanEnergy,y:specificYield,xLabel:'D⁺ laboratory energy (keV)',yLabel:'D–T neutrons per accelerator joule',selectedX:c.beamEnergyKeV,yDomain:[0,Math.max(...specificYield)||1]},
  ],
 };
}

/** Display geometry and sensitivity curves for the existing illustrative slab. */
export function fusionPlaygroundData(r:ReturnType<typeof simulateFusionBeam>):FusionPlaygroundData{
 return present(r,energyScan(r.config));
}

/** Retain one probability scan for accepted source results. Scaling inputs do not change its physical trajectory. */
export function createFusionPlaygroundData(){
 let previous:{key:string;scan:ReturnType<typeof energyScan>}|null=null;
 return (result:ReturnType<typeof simulateFusionBeam>)=>{
  const c=result.config,key=JSON.stringify([c.beamEnergyKeV,c.targetColumnM2,c.stoppingModel??'linear',c.stoppingFraction,c.materialColumnM2,c.intervals]);
  if(previous?.key!==key)previous={key,scan:energyScan(c)};
  return present(result,previous.scan);
 };
}
