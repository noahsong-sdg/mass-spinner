import {simulateFusionBeam,MaterialSlabDomainError,DTCrossSectionDomainError} from './fusion-reactor.js';
import {E_CHARGE} from './physics.js';

/** Display geometry and sensitivity curves for the existing illustrative slab. */
export function fusionPlaygroundData(r:ReturnType<typeof simulateFusionBeam>){
 const c=r.config;
 const energy=[...new Set([...Array.from({length:25},(_,i)=>20+20*i),c.beamEnergyKeV])].sort((a,b)=>a-b);
 // Fixed toy column/fractional slowing is a family of imposed stopping laws,
 // not an energy scan of one measured material. Include the actual input point.
 const excludedEnergiesKeV:number[]=[];
 const scan=energy.flatMap(beamEnergyKeV=>{
  try{return [simulateFusionBeam({...c,beamEnergyKeV})];}
  catch(error){if(!(error instanceof MaterialSlabDomainError||error instanceof DTCrossSectionDomainError))throw error;excludedEnergiesKeV.push(beamEnergyKeV);return [];}
 });
 const scanEnergy=scan.map(s=>s.config.beamEnergyKeV);
 const probability=scan.map(s=>s.fusionProbability),specificYield=scan.map(s=>c.acceleratorEfficiency*s.fusionProbability/(s.config.beamEnergyKeV*1000*E_CHARGE));
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
  profiles:r.curves.map((curve,i)=>i===0?{...curve,yDomain:[0,1]}:i===1?{...curve,yDomain:[0,Math.max(...curve.y)||1]}:curve),
  curves:[
   {label:'Fusion probability',x:scanEnergy,y:probability,xLabel:'D⁺ laboratory energy (keV)',yLabel:'Fusion probability per incident D⁺',selectedX:c.beamEnergyKeV,yDomain:[0,Math.max(...probability)||1]},
   {label:'Accelerator only',x:scanEnergy,y:specificYield,xLabel:'D⁺ laboratory energy (keV)',yLabel:'D–T neutrons per accelerator joule',selectedX:c.beamEnergyKeV,yDomain:[0,Math.max(...specificYield)||1]},
  ],
 };
}
