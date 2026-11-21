/** Prescribed atom bookkeeping. This is not an extraction-flow model. */
export const sampleAtoms=Array.from({length:1000},(_,id)=>{
 const slot=id*37%1000,order=id<10?id*10+9:id>=76&&id<166?Math.floor((id-76)/9)*10+(id-76)%9:-1;
 const x=28+(slot%40)*7.8,y=64+Math.floor(slot/40)*7.8;
 return {id,light:id<76,order,x,y,dx:order<0?0:445+(order%10)*12-x,dy:order<0?0:114+Math.floor(order/10)*12-y};
});
export function sampleInventory(count:number){
 if(!Number.isInteger(count)||count<0||count>100)throw new RangeError('Sample atom count must be an integer from 0 to 100.');
 const light=Math.floor(count/10),heavy=count-light;
 return {light,heavy,remainingLight:76-light,remainingHeavy:924-heavy,purity:count?light/count:null,recovery:light/76};
}
export function sampleDiagram(){
 return `<figure class="sample-example" data-sample-example data-motion="paused">
 <div class="drive-heading"><span>Follow the atoms into a small sample.</span><button type="button" data-sample-play disabled>Play collection</button></div>
 <p class="sample-key"><span>● Light</span><span>● Heavy</span><span>Each dot = one atom</span></p>
 <svg viewBox="0 0 600 295" role="img" aria-labelledby="sample-title sample-description">
 <title id="sample-title">A richer sample can contain few of the original light atoms</title>
 <desc id="sample-description">Start with 76 light atoms and 924 heavy atoms. Move 10 light and 90 heavy atoms into a sample. Its purity becomes 10 percent, but it contains only 10 of the original 76 light atoms. Every atom remains visible.</desc>
 <text x="180" y="25" text-anchor="middle">Outside the sample</text><text x="500" y="77" text-anchor="middle">Sample</text>
 <rect x="15" y="43" width="330" height="224" rx="10" class="sample-vessel"/><rect x="425" y="95" width="150" height="150" rx="10" class="sample-vessel"/>
 <path d="M355 167H411m-8-6 8 6-8 6" class="sample-direction"/>
 ${sampleAtoms.map(a=>`<circle cx="${a.x}" cy="${a.y}" r="2.7" class="sample-${a.light?'light':'heavy'}"${a.order<0?'':` data-sample-atom="${a.order}" data-dx="${a.dx}" data-dy="${a.dy}"`}/>`).join('')}
 <text x="180" y="288" text-anchor="middle" data-sample-left>76 light + 924 heavy</text><text x="500" y="269" text-anchor="middle" data-sample-kept>0 light + 0 heavy</text>
 </svg>
 <div class="sample-controls"><label>Atoms in sample <output data-sample-count>0 / 100</output><input type="range" min="0" max="100" step="1" value="0" aria-label="Atoms collected in example sample" disabled></label><button type="button" data-sample-replay disabled>Replay</button></div>
 <dl class="sample-metrics"><div><dt>Purity · light / all atoms in sample</dt><dd data-sample-purity>0 / 0 · undefined</dd></div><div><dt>Light recovery · kept / original light</dt><dd data-sample-recovery>0 / 76 = 0.0%</dd></div></dl>
 <p class="diagram-reading" data-sample-reading aria-live="polite">The original mixture is 76 / 1,000 = 7.6% light. Collect a sample to compare its purity and recovery.</p>
 <figcaption>This prescribed sample shows atom counts, not your run or an extraction-flow calculation. Positions and motion are illustrative. Atoms in transit remain outside the sample until arrival.</figcaption></figure>`;
}
export function setupSampleDiagram(figure:HTMLElement,win:Window & typeof globalThis){
 const range=figure.querySelector<HTMLInputElement>('input')!,play=figure.querySelector<HTMLButtonElement>('[data-sample-play]')!,replay=figure.querySelector<HTMLButtonElement>('[data-sample-replay]')!;
 const atoms=[...figure.querySelectorAll<SVGElement>('[data-sample-atom]')];
 const flight=12,end=99+flight;
 let progress=0,frame:number|null=null,last:number|undefined,running=false,started=false;
 const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 function paint(announce=false){
  const count=Math.max(0,Math.floor(progress-flight+1)),s=sampleInventory(count);
  for(const atom of atoms){const p=Math.max(0,Math.min(1,(progress-Number(atom.dataset.sampleAtom))/flight)),ease=p*p*(3-2*p);atom.setAttribute('transform',`translate(${Number(atom.dataset.dx)*ease} ${Number(atom.dataset.dy)*ease})`);}
  range.value=String(count);figure.dataset.collected=String(count);
  figure.querySelector('[data-sample-count]')!.textContent=`${count} / 100`;
  figure.querySelector('[data-sample-left]')!.textContent=`${s.remainingLight} light + ${s.remainingHeavy} heavy`;
  figure.querySelector('[data-sample-kept]')!.textContent=`${s.light} light + ${s.heavy} heavy`;
  figure.querySelector('[data-sample-purity]')!.textContent=`${s.light} / ${count} · ${s.purity===null?'undefined':`${(100*s.purity).toFixed(1)}%`}`;
  figure.querySelector('[data-sample-recovery]')!.textContent=`${s.light} / 76 = ${(100*s.recovery).toFixed(1)}%`;
  if(announce)figure.querySelector('[data-sample-reading]')!.textContent=count===0?'The original mixture is 76 / 1,000 = 7.6% light. The sample is empty. Its purity is undefined.':count===100?'The sample has 10% purity, above the original 7.6%. But it keeps only 10 of 76 light atoms: 13.2% recovery.':`${s.light} light atoms and ${s.heavy} heavy atoms have arrived. All other atoms remain outside the sample.`;
 }
 function pause(){running=false;figure.dataset.motion='paused';play.textContent=progress===end?'Replay collection':'Play collection';last=undefined;if(frame!==null)win.cancelAnimationFrame(frame);frame=null;}
 function tick(now:number){
  frame=null;if(!running)return;
  if(last!==undefined)progress=Math.min(end,progress+Math.min(64,now-last)/50);last=now;paint();
  if(progress===end){pause();paint(true);}else frame=win.requestAnimationFrame(tick);
 }
 function start(){if(progress===end)progress=0;running=started=true;figure.dataset.motion='running';play.textContent='Pause collection';last=undefined;paint();frame=win.requestAnimationFrame(tick);}
 range.disabled=play.disabled=replay.disabled=false;paint();
 play.addEventListener('click',()=>running?pause():start());
 replay.addEventListener('click',()=>{pause();progress=0;start();});
 range.addEventListener('input',()=>{progress=range.valueAsNumber===0?0:range.valueAsNumber+flight-1;pause();paint(true);});
 win.document.addEventListener('visibilitychange',()=>{if(win.document.hidden)pause();});
 reduced?.addEventListener?.('change',()=>{if(reduced.matches)pause();});
 // Start only when the reader reaches this figure. Do not animate off-screen.
 if(typeof win.IntersectionObserver==='function')new win.IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting)){if(!started&&!reduced?.matches)start();}else pause();
 },{threshold:.25}).observe(figure);
}
