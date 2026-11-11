import {fuelLithiumNeutralTransport} from './fuel-momentum.js';
/** Mutation++v1.0.5 collisions.xml Ar–Ar Q22, Wright2005, linear table.
 * Values are Å² BEFORE the source's explicit π multiplier. Neutral component
 * only; neither hot-plasma composition nor electron transport is predicted.
 */
const temperatures=[300,500,1000,2000,4000,5000,6000,8000,10000,15000,20000];
const q22=[12.88,11.12,9.66,8.60,7.57,7.23,6.96,6.53,6.20,5.60,5.17];
export function fuelArgonNeutralTransport(temperatureK:number){
 if(!Number.isFinite(temperatureK)||temperatureK<300||temperatureK>20000)throw new RangeError('Neutral Ar table requires300–20000K.');
 let i=0;while(i<temperatures.length-2&&temperatureK>temperatures[i+1])i++;
 const fraction=(temperatureK-temperatures[i])/(temperatures[i+1]-temperatures[i]);
 const collisionIntegralM2=Math.PI*1e-20*(q22[i]+fraction*(q22[i+1]-q22[i]));
 const mass=39.948*1.66053906892e-27,K=1.380649e-23;
 const viscosityPaS=5/16*Math.sqrt(Math.PI*mass*K*temperatureK)/collisionIntegralM2;
 return {viscosityPaS,conductivityWmK:15*K*viscosityPaS/(4*mass),collisionIntegralM2};
}
export function fuelNeutralTransport(material:'lithium'|'argon',temperatureK:number){
 if(material==='lithium')return fuelLithiumNeutralTransport(temperatureK);
 if(material==='argon')return fuelArgonNeutralTransport(temperatureK);
 throw new RangeError('Unsupported neutral transport material.');
}
