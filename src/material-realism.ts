import {DEUTERON_STOPPING_PROVENANCE} from './deuteron-stopping.js';
import {stoppingForComposition,type TargetSiteComposition} from './target-material.js';

export const MATERIAL_REALISM_PROVENANCE={
 coatingConcept:'https://www.marathonfusion.com/',
 stopping:'https://geant4.web.cern.ch/documentation/dev/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html',
 calibration:'Scenario inputs; no measured LiT density, deposition, erosion or chemical kinetics preset.',
} as const;

export interface MaterialGeometryInput {
 mode:'independent'|'number-density';materialColumnM2:number;filmThicknessM:number;numberDensityM3?:number;
}

/** A column counts Li host sites, not the sum of Li and hydrogen atoms.
 * Independent mode retains both supplied inputs. Linked mode preserves the
 * edited quantity and derives the other from the supplied Li-site density.
 */
export function resolveMaterialGeometry(input:MaterialGeometryInput,edited:'column'|'thickness'='thickness'){
 if(!['independent','number-density'].includes(input.mode)||!['column','thickness'].includes(edited)
  ||![input.materialColumnM2,input.filmThicknessM].every(x=>Number.isFinite(x)&&x>0)
  ||input.mode==='number-density'&&!(Number.isFinite(input.numberDensityM3)&&input.numberDensityM3!>0))
  throw new RangeError('Material geometry requires positive finite column, thickness and linked Li-site number density.');
 let materialColumnM2=input.materialColumnM2,filmThicknessM=input.filmThicknessM;
 if(input.mode==='number-density'){
  if(edited==='column')filmThicknessM=materialColumnM2/input.numberDensityM3!;
  else materialColumnM2=input.numberDensityM3!*filmThicknessM;
 }
 const numberDensityM3=materialColumnM2/filmThicknessM;
 if(![materialColumnM2,filmThicknessM,numberDensityM3].every(x=>Number.isFinite(x)&&x>0))
  throw new RangeError('Material geometry exceeds the finite numeric domain.');
 return {mode:input.mode,materialColumnM2,filmThicknessM,numberDensityM3,
  densityKind:'Li host sites per cubic metre' as const,calibration:'scenario' as const};
}

/** Reaction-specific metadata must travel with generic neutron scalar names.
 * D–D has no evaluated competing-hazard or product network in this solver.
 */
export const DT_ONLY_OUTPUT={
 reaction:'D–T' as const,rateLabel:'D–T neutrons (s⁻¹)',totalLabel:'D–T neutrons',
 omittedReactions:['D(d,n)³He','D(d,p)T'] as const,
 limitation:'D–D branches are omitted. These are D–T outputs, not total neutron or fusion yields; D-rich scenarios require a separate competing-reaction model.',
};

/** Continuous-slowing-down film-domain diagnostic, not an implantation or
 * retained-fraction prediction. Integrating dN/dE=1/S(E) never queries the
 * stopping closure below its supported lower energy. The refinement delta is
 * a numerical diagnostic, not a rigorous bound or physical uncertainty.
 */
export function stoppingDomainForFilm(energyKeV:number,materialColumnM2:number,composition:TargetSiteComposition,panels=512){
 const min=DEUTERON_STOPPING_PROVENANCE.minimumEnergyKeV,max=DEUTERON_STOPPING_PROVENANCE.maximumEnergyKeV;
 if(!Number.isFinite(energyKeV)||energyKeV<min||energyKeV>max||!Number.isFinite(materialColumnM2)||materialColumnM2<0
  ||!Number.isInteger(panels)||panels<32||panels>4096||panels%2!==0)
  throw new RangeError('Stopping map requires a supported energy, nonnegative finite film column and 32–4096 even panels.');
 const inv=(e:number)=>1/stoppingForComposition(e,composition).totalKeVM2;
 const integral=(a:number,b:number)=>(b-a)/6*(inv(a)+4*inv((a+b)/2)+inv(b));
 function grid(count:number){
  const values=[{energyKeV:energyKeV,columnM2:0}];let column=0;
  for(let i=1;i<=count;i++){
   const e=i===count?min:energyKeV*Math.exp(Math.log(min/energyKeV)*i/count),previous=values[i-1].energyKeV;
   column+=integral(e,previous);values.push({energyKeV:e,columnM2:column});
  }
  return values;
 }
 // Validate composition also for the zero-length map.
 inv(energyKeV);
 const samples=grid(panels),supportedColumnM2=samples.at(-1)!.columnM2;
 const refinementDeltaM2=Math.abs(supportedColumnM2-grid(panels/2).at(-1)!.columnM2);
 if(!Number.isFinite(supportedColumnM2))throw new RangeError('Stopping map exceeds the finite numeric domain.');
 let exitEnergyKeV:number|null=null;
 if(materialColumnM2<=supportedColumnM2){
  let lo=0,hi=panels;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].columnM2<materialColumnM2)lo=mid;else hi=mid;}
  let low=samples[hi].energyKeV,high=samples[lo].energyKeV;
  for(let i=0;i<48;i++){
   const mid=(low+high)/2,path=samples[lo].columnM2+integral(mid,samples[lo].energyKeV);
   if(path>materialColumnM2)low=mid;else high=mid;
  }
  exitEnergyKeV=materialColumnM2===0?energyKeV:(low+high)/2;
 }
 return {model:'atomic-CSDA-domain-map' as const,minimumEnergyKeV:min,maximumEnergyKeV:max,
  supportedColumnM2,refinementDeltaM2,exitEnergyKeV,
  unsupportedColumnM2:Math.max(0,materialColumnM2-supportedColumnM2),
  status:materialColumnM2>supportedColumnM2?'stopped-tail-unresolved' as const:'within-fit-domain' as const,
  samples,limitation:'Mean atomic stopping only; reaching the fit edge does not determine stopping, reflection, transmission or retention. The live solver retains its independent low-energy guard.'};
}
