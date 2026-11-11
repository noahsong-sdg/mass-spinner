import test from 'node:test';
import assert from 'node:assert/strict';
import {splitInterfaceHeat} from '../src/coupled-target.ts';
import {advanceTargetConduction} from '../src/target-conduction.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=2e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('independent eliminated heated face obeys its original three-node equations',()=>{
 for(const [rl,rr] of [[.2,.8],[1e-12,.3],[.7,1e-12],[.3,.3],[1e8,.01]]){
  const q=357,tl=301,tr=309,ts=(q+tl/rl+tr/rr)/(1/rl+1/rr),g=1/(rl+rr);
  const split=splitInterfaceHeat(rl,rr);
  close(split.leftFraction+split.rightFraction,1);
  assert.ok(split.leftFraction>=0&&split.rightFraction>=0);
  // Compare the unsplit face balance at moderate resistance to avoid oracle cancellation.
  if(Math.min(rl,rr)>1e-8){close((ts-tl)/rl,g*(tr-tl)+q*split.leftFraction);close((ts-tr)/rr,g*(tl-tr)+q*split.rightFraction);}
  close(split.leftFraction,1/(1+rl/rr));close(split.rightFraction,1/(1+rr/rl));
 }
});
test('independent source placement produces exact two-cell backward Euler response',()=>{
 const left={widthM:.002,conductivityWMK:2,volumetricHeatCapacityJm3K:1e6};
 const right={widthM:.004,conductivityWMK:4,volumetricHeatCapacityJm3K:2e6};
 const contact=.03,h=100,tc=290,dt=.7,q=345,initial=[301,312];
 const rl=left.widthM/(2*left.conductivityWMK)+contact,rr=right.widthM/(2*right.conductivityWMK);
 const g=1/(rl+rr),gb=1/(rr+1/h),cl=left.widthM*left.volumetricHeatCapacityJm3K,cr=right.widthM*right.volumetricHeatCapacityJm3K;
 const a=cl/dt+g,b=-g,d=cr/dt+g+gb;
 const rhsL=cl/dt*initial[0]+q*rr/(rl+rr),rhsR=cr/dt*initial[1]+gb*tc+q*rl/(rl+rr);
 const determinant=a*d-b*b,expected=[(rhsL*d-b*rhsR)/determinant,(a*rhsR-b*rhsL)/determinant];
 const split=splitInterfaceHeat(rl,rr),actual=advanceTargetConduction({cells:[left,right],contactResistanceM2KPerW:[contact],coolantK:tc,backHeatTransferWM2K:h},initial,dt,[q*split.leftFraction,q*split.rightFraction]);
 actual.temperatureK.forEach((t,i)=>close(t,expected[i]));close(actual.depositedJm2,q*dt);
 close(cl*(actual.temperatureK[0]-initial[0])+cr*(actual.temperatureK[1]-initial[1])+actual.coolantJm2,q*dt);
});
test('independent steady interface heating leaves insulated film uniform despite contact',()=>{
 const q=1234,tc=300,film={widthM:.002,conductivityWMK:2,volumetricHeatCapacityJm3K:1e6},back={widthM:.01,conductivityWMK:20,volumetricHeatCapacityJm3K:2e6},contact=.03,h=100;
 const rl=film.widthM/(2*film.conductivityWMK)+contact,rr=back.widthM/(2*back.conductivityWMK),split=splitInterfaceHeat(rl,rr);
 const expected=[tc+q*(back.widthM/back.conductivityWMK+1/h),tc+q*(rr+1/h)];
 const actual=advanceTargetConduction({cells:[film,back],contactResistanceM2KPerW:[contact],coolantK:tc,backHeatTransferWM2K:h},expected,100,[q*split.leftFraction,q*split.rightFraction]);
 actual.temperatureK.forEach((t,i)=>close(t,expected[i]));close(actual.coolantJm2,100*q);close(actual.storedChangeJm2/(100*q),0);
});
