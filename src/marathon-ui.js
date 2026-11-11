import {setupFusionLaboratory} from './fusion-ui.js';
import {setupTargetExposure} from './target-exposure-ui.js';
import {setupTargetLoading} from './target-loading-ui.js';
import {setupNeutronGeometry} from './neutron-geometry-ui.js';
import {setupCoupledTarget} from './coupled-target-ui.js';
import {setupNeutronTransport} from './neutron-transport-ui.js';
import implantationReference from '../web-assets/marathon-reference/implantation-v35.json';
import finiteFilmReference from '../web-assets/marathon-reference/finite-film-v38.json';
import {setupFiniteFilmReference} from './finite-film-ui.js';

/** One source, one evolving target, and explicitly separate frozen references. */
export function setupMarathonModels({onState=()=>{},onStatus=()=>{},transformPlots,requestTarget}={}){
 const node=id=>document.getElementById(id);
 const geometry=setupNeutronGeometry(node('neutron-geometry'));
 const exposure=setupTargetExposure(node('target-exposure'),{active:false});
 const loading=setupTargetLoading(node('target-loading'),{active:false,deferWhenClosed:true});
 const initial=document.createElement('details'),initialTitle=document.createElement('summary');
 initial.id='initial-source-reference';initial.className='fusion-model-notes';initialTitle.textContent='Initial source';
 node('neutron-geometry').before(initial);initial.append(initialTitle);
 for(const selector of ['.fusion-monitor','#fusion-response','#neutron-geometry','.fusion-ledger'])initial.append(document.querySelector(selector));
 const targetHost=document.createElement('div'),neutronHost=document.createElement('div');
 targetHost.id='coupled-target';neutronHost.id='neutron-transport';
 node('target-exposure').before(targetHost);initial.after(neutronHost);
 const neutrons=setupNeutronTransport(neutronHost);
 const target=setupCoupledTarget(targetHost,{
  request:requestTarget,
  implantationReference,
  transformPlots,
  onStatus(value){neutrons.setPending?.(value.phase==='pending');onStatus(value);},
  onMaterialMode(){
   const select=node('fusion-stopping-model');select.value='geant4-bragg';
   select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));
  },
  onUpdate(value){
   neutrons.update(value?{sourceRateS:value.state.neutronRateS,sourceEnergyMeV:value.state.neutronMeanEnergyMeV}:null);
   onState(value);
  },
 });
 target.referenceHost.append(node('target-exposure'),node('target-loading'));
 target.referenceHost.addEventListener('toggle',()=>{
  exposure.setActive(target.referenceHost.open);loading.setActive(target.referenceHost.open);
 });
 setupFiniteFilmReference(target.referenceHost,finiteFilmReference);
 const source=setupFusionLaboratory({exposureHost:target.durationHost,onUpdate(value){
  geometry.update(value);exposure.update(value);loading.update(value);target.update(value);
 }});
 return {source,target,neutrons,geometry,exposure,loading};
}
