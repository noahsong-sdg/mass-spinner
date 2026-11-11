import {readFileSync,writeFileSync} from 'node:fs';
import {fitRigid,rigidMetric,type Marker} from './metrics.js';
const packet=JSON.parse(readFileSync(process.argv[2],'utf8'));
const points:Marker[]=packet.profile.points;
let low=Infinity,high=-Infinity,omegaLow=Infinity,omegaHigh=-Infinity;
// Exhaust all corners of the declared extraction-coordinate box, keeping the
// nominal marker identities/split frozen even at the 3 cm boundary marker.
// This is a finite corner sensitivity, not a proven bound on interior extrema.
for(let mask=0;mask<2**(points.length*2);mask++){
 const perturbed=points.map((p,i)=>({...p,
  rCm:p.rCm+((mask&(1<<(2*i)))?1:-1)*p.rHalfWidthCm,
  vMS:p.vMS+((mask&(1<<(2*i+1)))?1:-1)*p.vHalfWidthMS}));
 const omega=fitRigid(perturbed),score=rigidMetric(perturbed,omega);
 low=Math.min(low,score);high=Math.max(high,score);
 omegaLow=Math.min(omegaLow,omega);omegaHigh=Math.max(omegaHigh,omega);
}
const scales=[.85,1,1.15].map(scale=>{
 const scaled=points.map(p=>({...p,vMS:scale*p.vMS}));
 return {scale,heldoutRmsOverPeak:rigidMetric(scaled,fitRigid(scaled))};
});
const result={schemaVersion:1,corners:2**(points.length*2),splitFrozen:true,
 heldoutRmsOverPeakCornerRange:[low,high],fitOmegaCornerRange:[omegaLow,omegaHigh],
 maximumScoreChange:Math.max(Math.abs(low-packet.profile.heldoutRmsOverPeak),Math.abs(high-packet.profile.heldoutRmsOverPeak)),
 commonReproducibilityScale:scales,confidenceInterval:false,
 warning:'Source-to-reproduction error unknown; finite corners do not certify an interior-extremum bound'};
writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
