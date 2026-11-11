import {mkdirSync,writeFileSync} from 'node:fs';
import {advanceOrbit,firstHit,step,type Particle} from '../src/physics.ts';

// Independent physical circle; no event polynomial or numerical dense output.
const initial:Particle={position:[.99999,0,.5],velocity:[.003,-.5,0]};
const model={radius:1,length:1,magneticT:1,voltage:0};
const physicalRadius=(t:number)=>{
 const [x,y]=initial.position,[vx,vy]=initial.velocity;
 return Math.hypot(x+vx*Math.sin(t)+vy*(1-Math.cos(t)),
  y+vy*Math.sin(t)-vx*(1-Math.cos(t)));
};
let low=0,high=.012;
for(let n=0;n<90;n++){const mid=(low+high)/2;if(physicalRadius(mid)>1)high=mid;else low=mid;}
const physicalContactS=(low+high)/2;
const rows=[];
for(const dt of [.03,.015,.0075,.00375,.001875,.0009375,.00046875]){
 let state=initial,time=0,event:null|number=null;
 for(let n=0;n<Math.ceil(.04/dt);n++){
  const out=advanceOrbit(state,1,dt,model);time+=out.elapsedS;state=out.particle;
  if(out.hit){event=time;break;}
 }
 let oldState=initial,oldTime=0,oldEvent:null|number=null;
 for(let n=0;n<Math.ceil(.04/dt);n++){
  const next=step(oldState,1,dt,()=>({electric:[0,0,0],magnetic:[0,0,1]}));
  const hit=firstHit(oldState.position,next.position,model);
  if(hit){oldEvent=oldTime+hit.fraction*dt;break;}oldState=next;oldTime+=dt;
 }
 if(event===null)throw new Error('Retained leaving/reentering witness missed.');
 rows.push({dt,correctedContactS:event,correctedRelativeError:(event-physicalContactS)/physicalContactS,
  chordContactS:oldEvent,chordRelativeError:oldEvent===null?null:(oldEvent-physicalContactS)/physicalContactS});
}
const output='collector-study-v32';
mkdirSync(output,{recursive:true});
writeFileSync(output+'/grazing-refinement.json',JSON.stringify({
 scope:'Single retained pure-B grazing witness; not a population accuracy estimate.',
 physicalContactS,exactPartialBorisContactS:2*Math.tan(physicalContactS/2),rows,
},null,2)+'\n');
console.log(JSON.stringify({physicalContactS,rows},null,2));
