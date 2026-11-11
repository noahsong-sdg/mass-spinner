export function needsLegacyScene(level:string,model:string,view:string):boolean {
 return ['1','3'].includes(level)&&['rotating','icr'].includes(model)&&['hardware','orbits','fields'].includes(view);
}

/** A hidden first visit allocates nothing; concurrent first visits share creation. */
export function createLazyScene(needed:()=>boolean,create:()=>Promise<{dispose():void}>,failed:(error:unknown)=>void){
 let resource:{dispose():void}|null=null,pending:Promise<void>|null=null;
 return {
  ensure():Promise<void>{
   if(!needed()||resource)return Promise.resolve();
   if(!pending)pending=Promise.resolve().then(()=>needed()?create():null).then(value=>{resource=value;}).catch(failed).finally(()=>{pending=null;});
   return pending;
  },
  reset(){resource?.dispose();resource=null;},
 };
}
