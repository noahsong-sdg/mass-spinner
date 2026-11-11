import {fields,rfField,type RunConfig,type Vec} from './physics.js';

/** Physical samples for the prescribed-field view, not a coil/antenna solution. */
export function fieldGraphics(c:RunConfig,time=0){
 const amplitude=c.mode==='icr'?(c.rfAmplitudeVM??0):0;
 const frequency=c.mode==='icr'?(c.rfFrequencyHz??0):0,handedness=c.rfHandedness??-1;
 if(![c.radius,c.length,c.voltage,c.magneticT,time,amplitude,frequency].every(Number.isFinite)
  ||c.radius<=0||c.length<=0||amplitude<0||frequency<0||![-1,1].includes(handedness))
  throw new Error('Field graphics require finite fields and positive chamber dimensions.');
 const rf=rfField(time,amplitude,frequency,handedness);
 const electric:{position:Vec;vector:Vec}[]=[],magnetic:{position:Vec;vector:Vec}[]=[];
 for(const z of [.2*c.length,.5*c.length,.8*c.length]){
  const position:Vec=[0,0,z];magnetic.push({position,vector:fields(position,c).magnetic});
  for(const fraction of [.25,.65])for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,position:Vec=[fraction*c.radius*Math.cos(angle),fraction*c.radius*Math.sin(angle),z];
   const dc=fields(position,c).electric;
   electric.push({position,vector:dc.map((v,i)=>v+rf[i]) as Vec});
  }
 }
 return {electric,magnetic,electricReferenceVM:2*Math.abs(c.voltage)/c.radius+amplitude,
  magneticReferenceT:Math.abs(c.magneticT),time};
}
