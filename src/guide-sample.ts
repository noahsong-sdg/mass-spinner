/** Example counts after separation. This is not an extraction-flow model. */
function shuffledSlots(size:number,seed:number){
 const slots=Array.from({length:size},(_,i)=>i);
 for(let i=size-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1),value=slots[i];slots[i]=slots[j];slots[j]=value;
 }
 return slots;
}
const innerSlots=shuffledSlots(100,41),outerSlots=shuffledSlots(900,83),sampleSlots=shuffledSlots(100,127);
export const sampleAtoms=Array.from({length:1000},(_,id)=>{
 const order=id<10?id*10+9:id>=76&&id<166?Math.floor((id-76)/9)*10+(id-76)%9:-1;
 const slot=order>=0?innerSlots[order]:outerSlots[id<76?id-10:id-100];
 const radius=order>=0?45*Math.sqrt((slot+.5)/100):Math.sqrt(53**2+(slot+.5)/900*(115**2-53**2));
 const angle=slot*Math.PI*(3-Math.sqrt(5)),x=165+radius*Math.cos(angle),y=166+radius*Math.sin(angle);
 const target=order<0?0:sampleSlots[order];
 return {id,light:id<76,order,x,y,dx:order<0?0:445+(target%10)*12-x,dy:order<0?0:114+Math.floor(target/10)*12-y};
});
export function sampleInventory(count:number){
 if(!Number.isInteger(count)||count<0||count>100)throw new RangeError('Sample atom count must be an integer from 0 to 100.');
 const light=Math.floor(count/10),heavy=count-light;
 return {light,heavy,remainingLight:76-light,remainingHeavy:924-heavy,purity:count?light/count:null,recovery:light/76};
}
export function sampleDiagram(){
 return `<figure class="sample-example" data-sample-example data-motion="paused">
 <div class="drive-heading"><span>Collect gas near the axis.</span><button type="button" data-sample-play disabled>Play collection</button></div>
 <p class="diagram-reading">Separation changes the mixture inside the vessel. Collection removes some of that mixture for use. The circle shows the gas from one end.</p>
 <p class="diagram-reading">An outlet near the axis can remove gas with a higher light-isotope percentage. It takes both isotopes, not only light atoms. Here, the marked inner gas becomes the sample.</p>
 <p class="sample-key"><span>● Light</span><span>● Heavy</span><span>Each dot = one atom</span></p>
 <svg viewBox="0 0 600 330" role="img" aria-labelledby="sample-title sample-description">
 <title id="sample-title">A richer sample can contain few of the original light atoms</title>
 <desc id="sample-description">Look into the end of the gas vessel after separation. The marked inner region contains 10 light and 90 heavy atoms. Collect both isotopes from this region. Leave the outer gas. The sample has 10 percent purity and 13.2 percent light recovery. Counts and positions are examples.</desc>
 <text x="165" y="20" text-anchor="middle">Gas after separation</text><text x="500" y="77" text-anchor="middle">Collected sample</text>
 <ellipse cx="165" cy="166" rx="121" ry="121" class="sample-vessel"/>
 <ellipse cx="165" cy="166" rx="49" ry="49" class="sample-region" data-sample-region/>
 <rect x="425" y="95" width="150" height="150" rx="10" class="sample-vessel"/>
 <path d="M202 130 310 43" class="sample-leader"/><text x="310" y="35" text-anchor="middle">Collect inner gas</text>
 <path d="M292 167H411m-8-6 8 6-8 6" class="sample-direction"/>
 ${sampleAtoms.map(a=>`<circle cx="${a.x}" cy="${a.y}" r="2.7" class="sample-${a.light?'light':'heavy'}"${a.order<0?'':` data-sample-atom="${a.order}" data-dx="${a.dx}" data-dy="${a.dy}"`}/>`).join('')}
 <text x="165" y="309" text-anchor="middle" data-sample-left>76 light + 924 heavy</text><text x="500" y="269" text-anchor="middle" data-sample-kept>0 light + 0 heavy</text>
 </svg>
 <div class="sample-controls"><label>Atoms in sample <output data-sample-count>0 / 100</output><input type="range" min="0" max="100" step="1" value="0" aria-label="Atoms collected in example sample" disabled></label><button type="button" data-sample-replay disabled>Replay</button></div>
 <dl class="sample-metrics"><div><dt>Purity · light / all atoms in sample</dt><dd data-sample-purity>0 / 0 · undefined</dd></div><div><dt>Light recovery · kept / original light</dt><dd data-sample-recovery>0 / 76 = 0.0%</dd></div></dl>
 <p class="diagram-reading" data-sample-reading aria-live="polite">The marked inner gas contains 10 light and 90 heavy atoms. Collect all 100, not only the light atoms.</p>
 <figcaption>The moving dots show atom counts, not paths through an outlet. A real outlet changes the gas left inside. This closed-vessel example does not calculate that flow or replacement gas. The counts, dot positions and marked radius are examples, not predictions for your run. Playback takes about 22 seconds. Count an atom in the sample only after it enters.</figcaption></figure>`;
}
export function setupSampleDiagram(figure:HTMLElement,win:Window & typeof globalThis){
 const range=figure.querySelector<HTMLInputElement>('input')!,play=figure.querySelector<HTMLButtonElement>('[data-sample-play]')!,replay=figure.querySelector<HTMLButtonElement>('[data-sample-replay]')!;
 const atoms=[...figure.querySelectorAll<SVGElement>('[data-sample-atom]')];
 const flight=10,end=99+flight;
 let progress=0,frame:number|null=null,last:number|undefined,running=false;
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
  if(last!==undefined)progress=Math.min(end,progress+Math.min(64,now-last)/200);last=now;paint();
  if(progress===end){pause();paint(true);}else frame=win.requestAnimationFrame(tick);
 }
 function start(){if(progress===end)progress=0;running=true;figure.dataset.motion='running';play.textContent='Pause collection';last=undefined;figure.querySelector('[data-sample-reading]')!.textContent='Both isotopes enter the sample. Purity uses all atoms in the sample. Recovery uses the original 76 light atoms.';paint();frame=win.requestAnimationFrame(tick);}
 range.disabled=play.disabled=replay.disabled=false;paint();
 play.addEventListener('click',()=>running?pause():start());
 replay.addEventListener('click',()=>{pause();progress=0;start();});
 range.addEventListener('input',()=>{progress=range.valueAsNumber===0?0:range.valueAsNumber+flight-1;pause();paint(true);});
 win.document.addEventListener('visibilitychange',()=>{if(win.document.hidden)pause();});
 reduced?.addEventListener?.('change',()=>{if(reduced.matches)pause();});
 // Let the reader inspect the collection region before playback.
 if(typeof win.IntersectionObserver==='function')new win.IntersectionObserver(entries=>{
  if(entries.every(entry=>!entry.isIntersecting))pause();
 }).observe(figure);
}
