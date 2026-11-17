import {loadRecordedArgonReference,type RecordedArgonReference} from './argon-reference.js';
import {renderPlots} from './laboratory.js';

/** An inspectable offline reference, isolated from the live lithium controls. */
export function mountArgonReference(host: HTMLElement,{fetcher=fetch}: {fetcher?: typeof fetch}={}){
 const doc=host.ownerDocument,el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const detail=el('details');detail.className='argon-reference';detail.append(el('summary','Spatial argon reference'));
 const status=el('p','Recorded scikit-fem solution · not experimentally qualified. Open to load.');status.setAttribute('role','status');
 const label=el('label','Recorded condition'),select=el('select');select.id='argon-reference-case';label.htmlFor=select.id;select.disabled=true;
 const retry=el('button','Retry reference');retry.type='button';retry.hidden=true;
 const plot=el('div');plot.className='live-plots';
 const scope=el('p','100 A per branch · 0.13 T · 6 cm radius · 48 cm length. Steady, angular-only argon flow; no evolving density, heat or meridional flow. Ideal ring contacts and prescribed transport are assumptions. Contact potential and Joule heating are singular in this ideal-contact model; these records cannot supply a thermal or electron-energy closure.');
 const diagnostic=el('p','Uniform-emissivity Doppler centroids at 11 saved sightlines—not local gas speeds or the experiment’s unresolved spectral estimator. Lines only join recorded samples. Lithium sliders do not change these records.');
 const evidence=el('details');evidence.append(el('summary','Reference identity'));
 const link=el('a','Numerical protocol ↗');link.href='https://github.com/noahsong-sdg/mass-spinner/blob/main/NONRIGID-FLOW-V98.md';link.target='_blank';link.rel='noopener';
 evidence.append(link);detail.append(status,label,select,retry,scope,diagnostic,plot,evidence);host.append(detail);
 let data: RecordedArgonReference | undefined,pending: Promise<RecordedArgonReference | null> | undefined,controller: AbortController | undefined,disposed=false;
 const render=()=>{
  if(disposed||!data||!detail.open)return;
  const current=data;
  const [scenario,anode]=select.value.split('/'),rows=current.cases.filter(c=>c.scenario===scenario&&c.anodeCenterM===Number(anode)).sort((a,b)=>a.refinement-b.refinement);
  renderPlots(plot,rows.map((c,i)=>({label:`Saved mesh refinement ${c.refinement}`,x:current.manifest.chordsM.map(r=>r*100),y:c.chordVelocityMS,
   xLabel:'Sightline offset (cm)',yLabel:'Uniform-emissivity apparent speed (m/s)',dash:['2 4','7 4',''][i]})));
 };
 const load=(): Promise<RecordedArgonReference | null>=>{
  if(disposed)return Promise.resolve(null);
  if(data){render();return Promise.resolve(data);}
  if(pending)return pending;
  controller=new AbortController();retry.hidden=true;status.textContent='Loading recorded argon reference…';
  pending=loadRecordedArgonReference(fetcher,controller.signal).then(packet=>{
   if(disposed)return null;
   data=packet;select.replaceChildren();
   for(const s of data.scenarios)for(const a of [.07,.08]){
    const option=el('option',`${s.shape} property profile · Te ${s.electronTemperatureEV} eV · anode z ${Math.round(a*100)} cm`);option.value=`${s.name}/${a}`;select.append(option);
   }
   select.disabled=false;status.textContent='Recorded non-rigid reference · numerical screens passed; experimental accuracy unqualified.';
   for(const [name,value]of Object.entries(data.origin)){const p=el('p');p.append(el('span',`${name}: `),el('code',value));evidence.append(p);}
   render();return data;
  }).catch(error=>{
   const failure=error as Error;
   if(!disposed){status.textContent=`Reference unavailable: ${failure.message}`;retry.hidden=false;select.disabled=true;renderPlots(plot,[]);}
   return null;
  }).finally(()=>{pending=undefined;controller=undefined;});
  return pending;
 };
 const opened=()=>{if(detail.open)void load();};
 detail.addEventListener('toggle',opened);select.addEventListener('change',render);retry.addEventListener('click',load);
 return {element:detail,load,dispose(){
  disposed=true;controller?.abort();detail.removeEventListener('toggle',opened);select.removeEventListener('change',render);retry.removeEventListener('click',load);renderPlots(plot,[]);detail.remove();
 }};
}
