import {createBaselineStore} from './baseline-state.js';
import {renderPlots} from './laboratory.js';

/** One baseline per plot family, attached to an accepted result and its exact scenario. */
export function setupBaseline(host,{capture,restore}={}){
 const store=createBaselineStore(),doc=host.ownerDocument,bar=doc.createElement('div'),status=doc.createElement('span');
 bar.className='baseline-bar';let current=null,pending=false,captureError='';
 const button=(name,handler)=>{const el=doc.createElement('button');el.type='button';el.textContent=name;el.addEventListener('click',handler);bar.append(el);return el;};
 const pin=button('Pin baseline',()=>{if(!current||pending||captureError)return;store.pin(current);draw();});
 const load=button('Restore',()=>{const scenario=store.scenario();if(scenario)restore(scenario);});
 const clear=button('Clear',()=>{store.clear();draw();});bar.append(status);host.before(bar);
 function combined(){
  if(!current)return [];
  if(captureError)return current.curves;
  const compared=store.compare(current);return [...current.curves,...compared.curves];
 }
 function draw(){
  pin.disabled=!current||pending||!!captureError;load.disabled=clear.disabled=!store.read();
  status.textContent=captureError?`Baseline unavailable: ${captureError}`:pending?'Previous run · updating…':store.read()?(current&&!store.compare(current).compatible?store.compare(current).reason:'Baseline pinned'):'';
  if(current)renderPlots(host,combined());
 }
 return {update(curves,identity,metadata={}){
   let scenario;captureError='';
   if(curves)try{scenario=capture();}catch(error){captureError=error.message||'Scenario capture failed.';}
   current=curves?{scenario,identity,curves,metadata}:null;pending=false;draw();return current?combined():[];
  },setPending(value){pending=!!value;draw();},clearCurrent(){current=null;pending=false;captureError='';draw();},get pinned(){return store.read();}};
}
