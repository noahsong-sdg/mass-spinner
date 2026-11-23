export type Frame={time:number;ion:number;gas:number;ionPhase:number;gasPhase:number;cdf:number[][]};
export type ViewData={frames:Frame[];reference:Frame;turnoverHz:number};
const modes=[
 {id:'transport',label:'Coupled separation',question:'Where does the gas collect during the run?',reading:'The shaded rings show total gas density, not isotope percentage. Straight arrows show gas-shell displacement from the initial radii. They do not show force.'},
 {id:'spin',label:'Coupled spin-up',question:'How fast do ions and neutral gas turn?',reading:'Open markers show ions. Filled markers show neutral gas. Without the density surface, the motion is easier to see. The calculated state stays the same.'},
 {id:'equilibrium',label:'Equilibrium reference',question:'What does the ideal equilibrium predict?',reading:'This distribution uses the final speed of the uniform-inertia reference. It does not show the coupled run at the selected time.'},
 {id:'flow',label:'Flow · reference',question:'Does a pumping estimate calculate chamber flow?',reading:'No. The moving packet below the vessel shows reference throughput. It does not give a chamber velocity or an extraction path.'},
] as const;
const text=(x:number,y:number,value:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${value}</text>`;


export function viewsDiagram(data:ViewData){
 return `<figure class="view-example" data-view-example data-mode="transport" data-motion="paused" data-view-values='${JSON.stringify(data)}'>
 <div class="drive-heading"><span>Compare the four gas views.</span><button type="button" data-view-play disabled>Play example</button></div>
 <div class="diagram-cases" role="group" aria-label="Gas view examples">${modes.map((m,i)=>`<button type="button" data-view-mode="${m.id}" aria-pressed="${i===0}" disabled>${m.label}</button>`).join('')}</div>
 <p class="view-question" data-view-question>${modes[0].question}</p>
 <div class="view-panels"><svg viewBox="0 0 320 300" role="img" aria-labelledby="view-gas-title view-gas-description">
 <title id="view-gas-title">End view of the example gas</title><desc id="view-gas-description">Filled dots show neutral gas. Open rings show ions. Shading shows total neutral density. Straight arrows show radial displacement, not force. The wall stays still.</desc>
 <defs><marker id="view-displacement" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#edbe90"/></marker></defs>
 ${text(160,20,'End view · stationary wall')}<g data-view-density></g><circle cx="160" cy="140" r="105" class="view-wall"/>
 <g data-view-gas></g><g data-view-ions></g><g data-view-arrows></g><circle cx="160" cy="140" r="2" class="view-axis"/>${text(160,160,'axis')}
 <g data-view-route hidden><path d="M40 270H280" class="view-route"/><path d="M270 264L280 270L270 276" class="view-route"/><circle cy="270" r="5" data-view-packet class="view-heavy"/>${text(160,294,'Reference throughput Q · reduced display rate')}</g>
 <text x="160" y="276" text-anchor="middle" data-view-gas-label>Shading = neutral density</text></svg>
 <div><svg viewBox="0 0 320 260" role="img" aria-labelledby="view-plot-title view-plot-description">
 <title id="view-plot-title">The selected view and its calculated quantities</title><desc id="view-plot-description">Both coupled views use the same speed curves and time. Reference views show ideal density against radius, divided by each isotope’s own volume mean.</desc>
 <g data-view-grid></g><path d="M48 45V210H300" class="diagram-axis"/>
 <path data-view-line="0" class="view-ion-line"/><path data-view-line="1" class="view-neutral-line"/>
 <path data-view-cursor class="view-cursor"/><text x="175" y="20" text-anchor="middle" data-view-plot-label></text>
 <text x="175" y="251" text-anchor="middle" data-view-x-label></text></svg>
 <p class="view-key" data-view-plot-key></p><p class="view-values" data-view-speeds></p></div></div>
 <label class="view-time">Example time <output data-view-time>0.00 s</output><input type="range" min="0" max="1" step="0.001" value="0" aria-label="Gas view example time (s)" disabled></label>
 <p class="view-key"><span class="view-light-key">● ⁶Li · light</span> <span class="view-heavy-key">● ⁷Li · heavy</span> <span>○ Ions · extra markers for visibility</span></p>
 <p class="diagram-reading" data-view-reading aria-live="polite">${modes[0].reading}</p>
 <figcaption>Fixed example, not your run: 0.06 A current, constant 500 K temperature, 12 cm radius and 1 s duration.
 The existing solver calculates rotation and radial transport. One calculated second plays in 12 screen seconds, with a separate reduced scale for rotation.
 Markers show weighted populations, not atom paths. This example keeps the selected time when you change views.
 The simulator returns to time zero when you change Gas view.</figcaption></figure>`;
}

/** Interpolate CDFs and accumulated angles together, as in the live display. */
export function viewExampleFrame(data:ViewData,time:number):Frame{
 const hi=data.frames.findIndex(f=>f.time>=time);
 if(hi<=0)return data.frames[hi===0?0:data.frames.length-1];
 const a=data.frames[hi-1],b=data.frames[hi],f=(time-a.time)/(b.time-a.time),mix=(x:number,y:number)=>x+(y-x)*f;
 return {time,ion:mix(a.ion,b.ion),gas:mix(a.gas,b.gas),ionPhase:mix(a.ionPhase,b.ionPhase),gasPhase:mix(a.gasPhase,b.gasPhase),cdf:a.cdf.map((row,j)=>row.map((v,i)=>mix(v,b.cdf[j][i])))};
}
const neutralDensity=(cdf:number[][])=>cdf[0].slice(1).map((v,i)=>(.0759*(v-cdf[0][i])+.9241*(cdf[1][i+1]-cdf[1][i]))*(cdf[0].length-1));
function quantile(cdf:number[],p:number){
 const i=cdf.findIndex(value=>value>=p),a=cdf[i-1],b=cdf[i];
 return Math.sqrt((i-1+(p-a)/(b-a))/(cdf.length-1));
}

export function setupViewsDiagram(figure:HTMLElement){
 const win=figure.ownerDocument.defaultView!,data=JSON.parse(figure.dataset.viewValues!) as ViewData;
 const input=figure.querySelector<HTMLInputElement>('input')!,play=figure.querySelector<HTMLButtonElement>('[data-view-play]')!;
 let mode:typeof modes[number]=modes[0],time=0,referenceTime=0,frame:number|null=null,last:number|undefined;
 const densityMax=Math.ceil(Math.max(...[...data.frames,data.reference].flatMap(f=>neutralDensity(f.cdf))));
 const scale=1.8/(Math.max(...data.frames.map(f=>f.ion),data.reference.ion)/.12);
 const put=(selector:string,value:string)=>{figure.querySelector(selector)!.textContent=value;};
 function paint(){
  const coupled=mode.id==='transport'||mode.id==='spin',s=coupled?viewExampleFrame(data,time):data.reference;
  const phase=[coupled?s.gasPhase*scale:s.gas/.12*referenceTime*scale,coupled?s.ionPhase*scale:s.ion/.12*referenceTime*scale];
  figure.dataset.mode=mode.id;
  put('[data-view-question]',mode.question);put('[data-view-time]',`${time.toFixed(2)} s${coupled?'':' · reference ignores this time'}`);
  input.value=String(time);input.disabled=!coupled;
  put('[data-view-speeds]',`${coupled?'Selected time':'Final bulk reference'}: ions ${s.ion.toFixed(0)} / gas ${s.gas.toFixed(0)} m/s`);
  const density=neutralDensity(s.cdf);
  const rings=figure.querySelector<SVGGElement>('[data-view-density]')!;rings.style.display=mode.id==='spin'||mode.id==='flow'?'none':'';
  rings.innerHTML=density.map((d,i)=>{const n=density.length,r0=105*Math.sqrt(i/n),r1=105*Math.sqrt((i+1)/n);return `<circle cx="160" cy="140" r="${(r0+r1)/2}" fill="none" stroke="#90a393" stroke-width="${r1-r0+.1}" opacity="${.7*d/densityMax}"/>`;}).join('');
  for(const [kind,count]of [['gas',80],['ions',20]] as const){
   figure.querySelector(`[data-view-${kind}]`)!.innerHTML=Array.from({length:count},(_,i)=>{
    const light=i<Math.round(count*.0759),species=light?0:1,within=light?i:i-Math.round(count*.0759),amount=light?Math.round(count*.0759):count-Math.round(count*.0759);
    const q=(within+.5)/amount,r=105*(kind==='gas'?quantile(s.cdf[species],q):Math.sqrt(q)),angle=i*2.399963229728653+phase[kind==='gas'?0:1];
    return `<circle cx="${160+r*Math.cos(angle)}" cy="${140-r*Math.sin(angle)}" r="${kind==='gas'?2.6:3.5}" class="view-${light?'light':'heavy'}${kind==='ions'?' view-ion':''}"/>`;
   }).join('');
  }
  figure.querySelector('[data-view-arrows]')!.innerHTML=mode.id==='transport'?[.2,.5,.8].flatMap(q=>[0,1,2,3].map(j=>{
   const mixture=s.cdf[0].map((v,i)=>.0759*v+.9241*s.cdf[1][i]);
   const a=j*Math.PI/2+.4,r0=105*Math.sqrt(q),r1=105*quantile(mixture,q);
   return Math.abs(r1-r0)<1?'':`<path d="M${160+r0*Math.cos(a)} ${140-r0*Math.sin(a)}L${160+r1*Math.cos(a)} ${140-r1*Math.sin(a)}" class="view-displacement" marker-end="url(#view-displacement)"/>`;
  })).join(''):'';
  (figure.querySelector('[data-view-route]') as SVGElement).style.display=mode.id==='flow'?'':'none';figure.querySelector('[data-view-route]')!.removeAttribute('hidden');
  figure.querySelector('[data-view-packet]')!.setAttribute('cx',String(40+240*((referenceTime*data.turnoverHz)%1)));
  put('[data-view-gas-label]',mode.id==='flow'?'':mode.id==='spin'?'Open rings = ions · filled dots = neutral gas':`Shading: 0 → ${densityMax}× mean density`);
  const curves=coupled?[data.frames.map(f=>f.ion),data.frames.map(f=>f.gas)]:s.cdf.map(c=>c.slice(1).map((v,i)=>(v-c[i])*(c.length-1)));
  const max=Math.max(1,...curves.flat()),ceiling=Math.ceil(max/(coupled?500:1))*(coupled?500:1),y=(v:number)=>210-165*v/ceiling;
  figure.querySelector('[data-view-grid]')!.innerHTML=[0,.5,1].map(f=>`<path d="M48 ${y(f*ceiling)}H300" class="diagram-grid"/>${text(24,y(f*ceiling)+4,String(f*ceiling))}`).join('')+text(48,232,'0')+text(300,232,coupled?'1':'12');
  curves.forEach((curve,i)=>{
   const points=coupled?[...data.frames.filter(f=>f.time<time).map(f=>[f.time,i?f.gas:f.ion]),[time,i?s.gas:s.ion]]
    :curve.map((v,j)=>[Math.sqrt((j+.5)/curve.length),v]);
   figure.querySelector(`[data-view-line="${i}"]`)!.setAttribute('d',points.map(([x,v],j)=>`${j?'L':'M'}${48+252*x} ${y(v)}`).join(' '));
  });
  figure.querySelector('[data-view-cursor]')!.setAttribute('d',coupled?`M${48+252*time} 45V210`:'');
  put('[data-view-plot-label]',coupled?'Speed at the wall (m/s)':'Density ÷ its own volume mean');put('[data-view-x-label]',coupled?'Physical time (s)':'Radius (cm)');
  put('[data-view-plot-key]',coupled?'━ Ions · ┄ Neutral gas':'━ ⁶Li · ┄ ⁷Li');
 }
 function pause(){figure.dataset.motion='paused';play.textContent=time===1&&(mode.id==='transport'||mode.id==='spin')?'Replay example':'Play example';last=undefined;if(frame!==null)win.cancelAnimationFrame(frame);frame=null;}
 function tick(now:number){
  frame=null;if(last!==undefined){const dt=Math.min(.1,(now-last)/1000);if(mode.id==='transport'||mode.id==='spin')time=Math.min(1,time+dt/12);else referenceTime+=dt*Math.min(1,.25/data.turnoverHz);}
  last=now;paint();if(time===1&&(mode.id==='transport'||mode.id==='spin'))pause();else frame=win.requestAnimationFrame(tick);
 }
 play.disabled=false;play.addEventListener('click',()=>{
  if(figure.dataset.motion==='running'){pause();return;}
  if(time===1&&(mode.id==='transport'||mode.id==='spin'))time=0;
  figure.dataset.motion='running';play.textContent='Pause example';frame=win.requestAnimationFrame(tick);
 });
 input.addEventListener('input',()=>{time=input.valueAsNumber;pause();paint();});
 for(const button of figure.querySelectorAll<HTMLButtonElement>('[data-view-mode]')){
  button.disabled=false;button.addEventListener('click',()=>{mode=modes.find(m=>m.id===button.dataset.viewMode)!;pause();
   for(const choice of figure.querySelectorAll('[data-view-mode]'))choice.setAttribute('aria-pressed',String(choice===button));
   put('[data-view-reading]',mode.reading);paint();});
 }
 win.addEventListener('pagehide',pause);paint();
}
