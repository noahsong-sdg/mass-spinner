export const NEUTRON_RESPONSE_FAMILY='h1-cylinder-ce-v38-r1';
const RAW_SHA='3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af';
export const RESPONSE_SCORES=['absorption','total'] as const;
type Score=typeof RESPONSE_SCORES[number];
interface Estimate {mean:number;stdError:number}
interface ResponseNode {thicknessM:number;seed:number;scores:Record<Score,Estimate>}
export interface NeutronResponsePacket {
 schemaVersion:1;family:string;qualified:boolean;openmcVersion:string;
 historiesPerCase:number;batches:number;processing:{code:string;version:string;relativeTolerance:number};
 photonTransport:false;
 source:{energyMeV:number;normalization:string};
 geometry:{radiusM:number;frontM:number;outerRadiusM:number};
 material:{nuclide:string;atomDensityM3:number;temperatureK:number;rawSHA256:string;processedSHA256:string};
 nodes:ResponseNode[];holdouts:ResponseNode[];
 qualification:{controlsPassed:boolean;absoluteTolerance:Record<Score,number>;sigmaMultiplier:number;scatterFloorCmInv:number};
}
const finiteNonnegative=(x:number)=>Number.isFinite(x)&&x>=0;
function interpolate(nodes:ResponseNode[],x:number,score:Score){
 const exact=nodes.find(n=>n.thicknessM===x);if(exact)return {...exact.scores[score],node:true};
 const upper=nodes.findIndex(n=>n.thicknessM>x),a=nodes[upper-1],b=nodes[upper];
 if(!a||!b)throw new Error('Outside the qualified thickness grid; extrapolation is withheld.');
 const w=(x-a.thicknessM)/(b.thicknessM-a.thicknessM);
 return {mean:(1-w)*a.scores[score].mean+w*b.scores[score].mean,
  stdError:Math.hypot((1-w)*a.scores[score].stdError,w*b.scores[score].stdError),node:false};
}

/** A fixed-source, fixed-material/geometry response family, never a replacement for arbitrary live geometry. */
export function evaluateNeutronResponse(packet:NeutronResponsePacket,thicknessM:number,sourceEnergyMeV:number,sourceRateS:number){
 if(packet?.schemaVersion!==1||packet.family!==NEUTRON_RESPONSE_FAMILY||packet.openmcVersion!=='0.16.0'
  ||packet.source?.normalization!=='per emitted isotropic source neutron'||packet.source.energyMeV!==14.1
  ||packet.material?.nuclide!=='H1'||packet.material.rawSHA256!==RAW_SHA
  ||!/^[a-f0-9]{64}$/.test(packet.material.processedSHA256)||packet.material.atomDensityM3!==6e28||packet.material.temperatureK!==293.6
  ||packet.geometry?.radiusM!==.1||packet.geometry.frontM!==.1||packet.geometry.outerRadiusM!==1
  ||packet.historiesPerCase!==1000000||packet.batches!==100||packet.photonTransport!==false||packet.processing?.code!=='NJOY2016'||packet.processing.version!=='2016.78'||packet.processing.relativeTolerance!==.001)
  throw new Error('Unsupported or stale neutron response data/geometry identity.');
 const {nodes,holdouts,qualification:q}=packet;
 if(!packet.qualified||!q?.controlsPassed||q.scatterFloorCmInv!==1e-10||q.sigmaMultiplier!==4||q.absoluteTolerance?.absorption!==.000005||q.absoluteTolerance.total!==.0005
  ||!Array.isArray(nodes)||nodes.length!==6||!Array.isArray(holdouts)||holdouts.length!==nodes.length-1)
  throw new Error('Response qualification is incomplete; results are withheld.');
 const seeds=new Set<number>();
 for(const [i,node]of [...nodes,...holdouts].entries()){
  if(!finiteNonnegative(node.thicknessM)||!Number.isSafeInteger(node.seed)||seeds.has(node.seed))throw new Error('Invalid response node or reused Monte Carlo seed.');
  seeds.add(node.seed);
  if(i<nodes.length&&node.thicknessM!==[.02,.04,.06,.1,.14,.18][i])throw new Error('Unsupported response grid identity.');
  if(i<nodes.length&&i>0&&node.thicknessM<=nodes[i-1].thicknessM)throw new Error('Response grid must increase.');
  for(const score of RESPONSE_SCORES)if(!node.scores?.[score]||!finiteNonnegative(node.scores[score].mean)||!finiteNonnegative(node.scores[score].stdError))throw new Error('Invalid response mean or Monte Carlo standard error.');
  if(node.scores.absorption.mean>1||node.scores.absorption.mean>node.scores.total.mean)throw new Error('Invalid nonmultiplying response channels.');
 }
 const residuals=Object.fromEntries(RESPONSE_SCORES.map(score=>[score,[] as number[]])) as Record<Score,number[]>;
 for(let i=0;i<holdouts.length;i++){
  const h=holdouts[i];
  if(!(h.thicknessM>nodes[i].thicknessM&&h.thicknessM<nodes[i+1].thicknessM))throw new Error('Missing independent holdout in each interpolation interval.');
  for(const score of RESPONSE_SCORES){
   const prediction=interpolate(nodes,h.thicknessM,score),residual=Math.abs(prediction.mean-h.scores[score].mean);
   const noise=q.sigmaMultiplier*Math.hypot(prediction.stdError,h.scores[score].stdError);
   if(residual>noise+q.absoluteTolerance[score])throw new Error('Independent interpolation holdout gate failed; results are withheld.');
   residuals[score].push(residual);
  }
 }
 if(!finiteNonnegative(thicknessM)||!finiteNonnegative(sourceRateS)||sourceEnergyMeV!==packet.source.energyMeV)throw new Error('Response requires a finite nonnegative source and the exact 14.1 MeV monoenergetic reference.');
 if(thicknessM<nodes[0].thicknessM||thicknessM>nodes.at(-1)!.thicknessM)throw new Error('Outside the qualified thickness grid; extrapolation is withheld.');
 const scores=Object.fromEntries(RESPONSE_SCORES.map(score=>{
  const value=interpolate(nodes,thicknessM,score),rateS=value.mean*sourceRateS,rateStdErrorS=value.stdError*sourceRateS;
  if(!Number.isFinite(rateS)||!Number.isFinite(rateStdErrorS))throw new Error('Scaled response exceeds the finite numerical domain.');
  return [score,{...value,rateS,rateStdErrorS,
   maxObservedHoldoutResidual:Math.max(...residuals[score]),interpolationAbsoluteGate:q.absoluteTolerance[score]}];
 }));
 return {family:packet.family,thicknessM,sourceRateS,sourceEnergyMeV,scores,
  limitations:'Monte Carlo SE and observed midpoint interpolation residuals are separate; neither includes nuclear-data, geometry or source-spectrum uncertainty.'};
}
