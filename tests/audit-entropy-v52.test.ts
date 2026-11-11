import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';

const sum=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
const relativeDensityEntropy=(p:readonly number[])=>sum(p.map(v=>v===0?0:v*Math.log(v*p.length)));
function close(actual:number,expected:number,scale:number,message:string){
 assert.ok(Math.abs(actual-expected)<=2e-9*Math.max(scale,1e-12),`${message}: ${actual} versus ${expected}`);
}

for(const coolantK of [350,900])test(`independent total gas/liner/coolant entropy is monotone through drive, cut and coast (${coolantK} K coolant)`,()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:.04,gasK:500,linerK:650,pressurePa:8,lightFraction:.3,
  ionFraction:.05,collisionHz:30,dragHz:.7,radialDiffusivityM2S:.008,durationS:.22};
 const thermal={enabled:true,wallCapacityJK:.003,gasWallWK:.003,coolingWK:.001,coolantK};
 const events=[{timeS:.07,currentA:0},{timeS:.16,currentA:.025}];
 const model=simulateFuelOperation(simulateFuelCentrifuge(c),{schemaVersion:1,events,thermal},{cells:12,steps:256});
 assert.ok(model.checkpoints,'Entropy must be examined at accepted integration states, including current-event endpoints.');
 const rows=model.checkpoints!,volume=Math.PI*c.radiusM**2*c.lengthM;
 // N kB is fixed from the INITIAL inventory. Recomputing it using evolved T
 // would change the thermodynamic system and invalidate this entropy balance.
 const nk=c.pressurePa*volume/c.gasK,cg=1.5*nk,cw=thermal.wallCapacityJK;
 const mixing=(s:typeof rows[number])=>-nk*(c.lightFraction*relativeDensityEntropy(s.lightMass)+(1-c.lightFraction)*relativeDensityEntropy(s.heavyMass));
 const entropy=(s:typeof rows[number])=>cg*Math.log(s.thermal!.gasK/c.gasK)+cw*Math.log(s.thermal!.linerK/c.linerK)+mixing(s);
 let reservoirEntropy=0,previousEntropy=entropy(rows[0]),integratedCooling=0,productionBound=0;
 for(let i=1;i<rows.length;i++){
  const a=rows[i-1],b=rows[i],dt=b.timeS-a.timeS,t=b.thermal!,old=a.thermal!;
  assert.ok(dt>0,'Every accepted state must have a strictly increasing physical time.');
  const qgw=dt*thermal.gasWallWK*(t.gasK-t.linerK);
  const qc=dt*thermal.coolingWK*(t.linerK-coolantK);
  const qo=dt*a.currentA!**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
  const qs=b.energy.slipDissipationJ-a.energy.slipDissipationJ;
  const qd=b.energy.dragDissipationJ-a.energy.dragDissipationJ;
  const wr=b.energy.redistributionWorkJ-a.energy.redistributionWorkJ;
  const scale=Math.abs(qo)+Math.abs(qgw)+Math.abs(qc)+Math.abs(qs)+Math.abs(qd)+Math.abs(wr)+cg*t.gasK+cw*t.linerK;
  // Separate neutral/liner first laws explicitly omit backward-Euler loss.
  // This prevents a passing total-energy gate from disguising numerical heat.
  close(cg*(t.gasK-old.gasK),qs+wr+qo-qgw,scale,'Neutral physical heat excludes numerical dissipation');
  close(cw*(t.linerK-old.linerK),qd+qgw-qc,scale,'Liner physical heat excludes numerical dissipation');
  integratedCooling+=qc;
  // Positive Qc leaves gas+wall, so the external reservoir GAINS Qc/Tc.
  // Negative Qc for hot coolant removes entropy from that reservoir.
  reservoirEntropy+=qc/coolantK;
  const totalEntropy=entropy(b)+reservoirEntropy;
  const lower=qs/t.gasK+qo/t.gasK+qd/t.linerK+
   qgw*(1/t.linerK-1/t.gasK)+qc*(1/coolantK-1/t.linerK);
  assert.ok(lower>=-1e-14,'Endpoint friction and conductance entropy production must be nonnegative.');
  const tolerance=2e-9*(cg+cw+Math.abs(reservoirEntropy));
  assert.ok(totalEntropy-previousEntropy>=lower-tolerance,
   `Discrete second law failed at ${b.timeS} s: increment ${totalEntropy-previousEntropy}, physical lower bound ${lower}.`);
  productionBound+=lower;previousEntropy=totalEntropy;
  close(t.coolingEnergyJ,integratedCooling,Math.abs(integratedCooling)+scale,'Cooling ledger agrees with independently integrated reservoir flux');
 }
 assert.ok(productionBound>0&&previousEntropy>0,'Driven heat exchange must produce positive total entropy.');
 assert.ok(rows.at(-1)!.energy.numericalDissipationJ>1e-12,'The case must exercise nonzero numerical loss without depositing it as heat.');
 assert.ok(integratedCooling*(coolantK<c.linerK?1:-1)>0,'Both signs of the external reservoir heat transfer must be exercised.');
 assert.ok(rows.some(s=>s.currentA===0&&s.neutralRadS>0),'The second-law gate must include actual coasting after the power cut.');
});
