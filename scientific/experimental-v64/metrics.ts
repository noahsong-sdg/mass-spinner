/** Scientific comparison operators, not new production closures. */
export type Marker={rCm:number;vMS:number;split:'train'|'test';rHalfWidthCm:number;vHalfWidthMS:number};
export function fitRigid(points:readonly Marker[]){
 const train=points.filter(p=>p.split==='train');
 if(train.length<2||points.some(p=>!Number.isFinite(p.rCm)||p.rCm<=0||!Number.isFinite(p.vMS)||p.vMS<0))throw new RangeError('Need positive finite chord positions and at least two training markers.');
 return train.reduce((s,p)=>s+p.rCm*.01*p.vMS,0)/train.reduce((s,p)=>s+(p.rCm*.01)**2,0);
}
export function rigidMetric(points:readonly Marker[],omega:number){
 const test=points.filter(p=>p.split==='test'),peak=Math.max(...points.map(p=>p.vMS));
 if(!test.length||!(peak>0))throw new RangeError('Need held-out markers and a resolved velocity scale.');
 return Math.sqrt(test.reduce((s,p)=>s+(omega*p.rCm*.01-p.vMS)**2,0)/test.length)/peak;
}
export function lambdaEnvelope(massU:number,v:number,t:number,f:number){
 if(![massU,v,t,f].every(Number.isFinite)||massU<=0||v<0||t<=0||f<0||f>=1)throw new RangeError('Invalid bounded kinetic/thermal inputs.');
 const lambda=massU*1.66053906892e-27*v*v/(2*1.380649e-23*t);
 return {lambda,lambdaEnvelope:[lambda*(1-f)**2/(1+f),lambda*(1+f)**2/(1-f)]};
}
