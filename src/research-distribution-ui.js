import {validateDistributionPacket,distributionCurves} from './research-distribution.js';
import {renderPlots} from './laboratory.js';

/** Lazily add actual recorded distributions while keeping moment replay independent. */
export function setupResearchDistributions(fetcher=fetch){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const root=make('details'),summary=make('summary','Distributions & convergence'),button=make('button','Load recorded distributions'),axis=make('select'),status=make('p'),plots=make('div'),evidence=make('details'),comparison=make('select'),gateRows=make('div');
 root.className='model-info';root.setAttribute('style','grid-column:1 / -1');button.type='button';plots.className='live-plots';status.setAttribute('role','status');
 for(const [i,name] of ['x','y','z'].entries()){const option=make('option',`Velocity ${name}`);option.value=String(i);axis.append(option);}axis.value='0';axis.setAttribute('aria-label','Recorded velocity marginal axis');
 comparison.setAttribute('aria-label','Archived coarse and fine comparison');
 evidence.append(make('summary','Recorded convergence gates'),comparison,gateRows,
  make('p','Unchanged archived decisions. v16 isotropic passes do not qualify the different v17 general-3D operator. A lower witness is not a full L¹ integral.'));
 const raw=make('a','Raw arrays & source hashes');raw.href='/research-depth/recorded-distributions.json';raw.className='quiet-link';
 root.append(summary,button,axis,status,plots,evidence,raw);axis.hidden=true;
 let packet,caseId,step,pending;
 function renderGates(){
  const group=packet.refinements[Number(comparison.value)],table=make('table'),head=make('tr');
  for(const label of ['Comparison / time','Gate','Species 1','Species 2'])head.append(make('th',label));table.append(head);
  for(const record of group.records){
   const pair=record.left?`${record.left} → ${record.right}`:group.comparison.id;
   const row=make('tr');row.append(make('td',`${pair} · ${(record.timeS*1e6).toPrecision(4)} µs`),make('td',record.gate));
   for(const s of record.species){const value=s.incrementL1??s.characteristicLowerWitness??s.bound?.upperBound;
    row.append(make('td',`${s.incrementL1!==undefined?'L¹':s.characteristicLowerWitness!==undefined?'L¹ ≥':'bound'} ${Number.isFinite(value)?value.toExponential(3):s.gate??'unresolved'}`));}
   table.append(row);
  }
  const source=make('p',`${group.study} · ${group.source}`);source.className='instrument-note';gateRows.replaceChildren(table,source);
 }
 function update(){
  if(!packet)return;
  try{
   const selected=distributionCurves(packet,caseId,step,Number(axis.value));renderPlots(plots,selected.curves);
   status.textContent=`Saved positive-mixture marginals · ${caseId}, step ${step}. Physical entropy gate: ${selected.case.gates.physicalEntropy}; integration: ${selected.state.physicalEntropy.quadratureGate}. Integration sensitivity is an estimate, not a confidence interval or proof of an H theorem. Qualification withheld.`;
  }catch(error){renderPlots(plots,[]);status.textContent=error.message;}
 }
 button.addEventListener('click',async()=>{
  if(pending)return;button.disabled=true;status.textContent='Loading saved arrays…';
  pending=(async()=>{
   try{
    const response=await fetcher('/research-depth/recorded-distributions.json');if(!response.ok)throw new Error('Recorded distributions could not be loaded.');
    packet=validateDistributionPacket(await response.json());axis.hidden=false;button.hidden=true;
    comparison.replaceChildren(...packet.refinements.map((group,i)=>{const option=make('option',`${group.study} · ${group.comparison.id}`);option.value=String(i);return option;}));comparison.value='0';renderGates();
    update();
   }catch(error){packet=null;renderPlots(plots,[]);status.textContent=error.message;button.disabled=false;}
   finally{pending=null;}
  })();await pending;
 });
 axis.addEventListener('change',update);
 comparison.addEventListener('change',renderGates);
 return {element:root,update(id,savedStep){caseId=id;step=savedStep;update();}};
}
