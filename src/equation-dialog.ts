import {equationGroups,equationPlots,sampleEquation,type EquationGroupId,type EquationPlotId,type EquationPlot} from './equation-plots.js';

const format=(n:number)=>n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e6?n.toExponential(2):n.toLocaleString('en-US',{maximumSignificantDigits:4});
export function setupEquationPlots(doc:Document){
 const triggers=doc.querySelectorAll<HTMLButtonElement>('[data-equation-plot]');
 if(!triggers.length)return;
 const dialog=doc.createElement('dialog');dialog.className='equation-dialog';dialog.setAttribute('aria-labelledby','equation-plot-title');
 dialog.innerHTML=`<header><h2 id="equation-plot-title"></h2><button type="button" data-equation-close aria-label="Close equation plot">Close ×</button></header>
 <label data-equation-choice>Plot <select aria-label="Equation plot"></select></label>
 <div data-equation-controls></div><p data-equation-y></p>
 <svg viewBox="0 0 560 325" role="img" aria-labelledby="equation-chart-title equation-chart-description"><title id="equation-chart-title"></title><desc id="equation-chart-description"></desc><g data-equation-chart></g></svg>
 <p data-equation-key></p><p data-equation-reading aria-live="polite"></p><p data-equation-note></p>`;
 doc.body.append(dialog);
 const node=(s:string)=>dialog.querySelector<HTMLElement>(s)!;
 const select=dialog.querySelector<HTMLSelectElement>('select')!;
 let id:EquationPlotId='speed',source:HTMLButtonElement;
 const close=()=>dialog.close();
 node('[data-equation-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>source.focus());
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 function paint(){
  const plot:EquationPlot=equationPlots[id],values:Record<string,number>={};
  for(const control of dialog.querySelectorAll<HTMLInputElement>('input')){
   values[control.name]=control.valueAsNumber;control.previousElementSibling!.querySelector('output')!.textContent=format(control.valueAsNumber);
  }
  const data=sampleEquation(id,values),all=data.flatMap(p=>p.y).filter((y):y is number=>y!==null);
  const low=Math.min(0,...all),high=Math.max(0,...all),span=high-low||1;
  const yMin=low<0?low-span*.06:0,yMax=high>0?high+span*.06:low<0?0:1;
  const x=(v:number)=>112+414*(v-plot.x.min)/(plot.x.max-plot.x.min),y=(v:number)=>260-226*(v-yMin)/(yMax-yMin);
  const selected=values[plot.x.key],selectedY=plot.values(selected,values);
  const text=(x:number,y:number,s:string,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
  node('[data-equation-chart]').innerHTML=Array.from({length:5},(_,i)=>{
   const v=yMin+(yMax-yMin)*i/4;return `<path d="M112 ${y(v)}H526" class="diagram-grid"/>${text(104,y(v)+4,format(v),'end')}`;
  }).join('')+`<path d="M112 34V260H526" class="diagram-axis"/>`+
  Array.from({length:5},(_,i)=>{const v=plot.x.min+(plot.x.max-plot.x.min)*i/4;return text(x(v),282,format(v));}).join('')+
  text(319,312,plot.x.label)+`<path d="M${x(selected)} 34V260" class="density-scan-cursor"/>`+
  plot.labels.map((_,j)=>{
   let pen=false;const path=data.map(p=>{const v=p.y[j];if(v===null){pen=false;return '';}const segment=`${pen?'L':'M'}${x(p.x)} ${y(v)}`;pen=true;return segment;}).join('');
   return `<path d="${path}" class="equation-line equation-line-${j}"/>${selectedY[j]===null?'':`<circle cx="${x(selected)}" cy="${y(selectedY[j])}" r="4" class="equation-point-${j}"/>`}`;
  }).join('');
  node('[data-equation-reading]').textContent=`${plot.x.label}: ${format(selected)}. ${plot.labels.map((label,j)=>`${label}: ${selectedY[j]===null?'undefined':format(selectedY[j])}`).join(' · ')}.`;
 }
 function showPlot(){
  id=select.value as EquationPlotId;const plot:EquationPlot=equationPlots[id];
  node('#equation-plot-title').textContent=plot.title;
  node('[data-equation-y]').textContent=plot.y;
  node('#equation-chart-title').textContent=`${plot.title} against ${plot.x.label}`;
  node('#equation-chart-description').textContent=`${plot.y} against ${plot.x.label}. ${plot.note}`;
  node('[data-equation-note]').textContent=`Equation reference, not your run. ${plot.note} The vertical scale changes with the inputs.`;
  node('[data-equation-key]').innerHTML=plot.labels.map((label,i)=>`<span class="equation-key-${i}">${['━','┄','···'][i]} ${label}</span>`).join('');
  node('[data-equation-controls]').innerHTML=[plot.x,...plot.inputs].map(c=>`<label><span>${c.label}<output>${format(c.value)}</output></span><input type="range" name="${c.key}" aria-label="${c.label}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"></label>`).join('');
  for(const control of dialog.querySelectorAll('input'))control.addEventListener('input',paint);
  paint();
 }
 select.addEventListener('change',showPlot);
 for(const trigger of triggers)trigger.addEventListener('click',()=>{
  source=trigger;const group=equationGroups[trigger.dataset.equationPlot as EquationGroupId];
  select.replaceChildren(...group.map(key=>{const option=doc.createElement('option');option.value=key;option.textContent=equationPlots[key].title;return option;}));
  node('[data-equation-choice]').hidden=group.length===1;showPlot();dialog.showModal();
 });
}
