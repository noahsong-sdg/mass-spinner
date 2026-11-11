export type ExperienceLevel = '1' | '2' | '3' | '4';
export const PLAY_DEFAULTS = {field:.10, voltage:400, energy:.5, massB:84};
export type PlaySettings = typeof PLAY_DEFAULTS;
const bounds = {field:[.04,.25,.01], voltage:[0,800,20], energy:[0,20,.5], massB:[20,200,1]} as const;

/** A versioned link describes the small, fixed collisionless playground only. */
export function readExperience(search:string){
 const query=new URLSearchParams(search),candidate=query.get('level');
 const level:ExperienceLevel=['1','2','3','4'].includes(candidate??'')?candidate as ExperienceLevel:'1';
 const settings={...PLAY_DEFAULTS};
 const supplied=Object.keys(bounds).some(key=>query.has(key));
 if(!supplied)return {level,settings,invalid:false};
 if(query.get('v')!=='1')return {level,settings,invalid:true};
 for(const key of Object.keys(bounds) as (keyof PlaySettings)[]){
  const raw=query.get(key);if(raw===null)continue;
  const value=Number(raw),[min,max,step]=bounds[key];
  if(!raw.trim()||!Number.isFinite(value)||value<min||value>max||Math.abs((value-min)/step-Math.round((value-min)/step))>1e-8)
   return {level,settings:{...PLAY_DEFAULTS},invalid:true};
  settings[key]=value;
 }
 return {level,settings,invalid:false};
}

export function playgroundLink(href:string,settings:PlaySettings){
 const url=new URL(href);url.search='';url.hash='';
 url.searchParams.set('level','1');url.searchParams.set('v','1');
 for(const [key,value] of Object.entries(settings))url.searchParams.set(key,String(value));
 return url.href;
}
