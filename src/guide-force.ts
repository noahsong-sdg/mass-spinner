/** Dimensionless point-mass reference: radius = 1 and angular speed = 1. */
export function turningReference(angle:number){
 return {x:Math.cos(angle),y:-Math.sin(angle),vx:-Math.sin(angle),vy:-Math.cos(angle),ax:-Math.cos(angle),ay:Math.sin(angle),freeX:1,freeY:-angle};
}
/** Ideal neutral equilibrium at 1,500 m/s wall speed and uniform 500 K. */
export function turningDensity(radius:number,massU:number){return Math.exp(massU*1.66053906892e-27*1500**2*radius**2/(2*1.380649e-23*500));}
const steps=[
 {label:'1 Motion',reading:'Velocity gives speed and direction of motion. Inward force changes that direction. Without this force, the point follows the tangent: a straight line.',note:'Point-mass reference. The dashed circle is a reference path, not a wall. Arrows show direction, not a shared scale. Real gas atoms also have random motion.'},
 {label:'2 Pressure',reading:'Pressure is force per unit area. It acts on both sides of a small gas volume. Higher pressure on the outer side gives a larger inward force. The difference gives a net inward force, which turns the gas.',note:'The enlarged gas volume shows radial forces only. Arrow lengths are examples. The net pressure force supplies the inward force. It is not an extra force.'},
 {label:'3 Density',reading:'At the same rotation speed and temperature, the heavy-isotope density increases more from axis to wall. The heavy/light density ratio increases outward. The inner gas has a higher light percentage.',note:'Ideal neutral equilibrium, not your run. Both curves use their own axis density. These density ratios are not isotope percentages. Wall speed: 1,500 m/s. Temperature: 500 K.'},
];
const label=(x:number,y:number,s:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${s}</text>`;
function svg(id:string,title:string,body:string){return `<svg viewBox="0 0 300 260" role="img" aria-labelledby="turning-${id}-title"><title id="turning-${id}-title">${title}</title><defs>${['velocity','force','pressure'].map(kind=>`<marker id="turning-${id}-${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" class="turning-${kind}-head"/></marker>`).join('')}</defs>${body}</svg>`;}
const arrow=(id:string,kind:string,x1:number,y1:number,x2:number,y2:number,attrs='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="turning-${kind}" marker-end="url(#turning-${id}-${kind})" ${attrs}/>`;
const track='<circle cx="150" cy="140" r="75" class="turning-track"/><circle cx="150" cy="140" r="2" class="turning-point"/><text x="150" y="162" text-anchor="middle">axis</text>';
export function forceDiagram(){
 return `<figure class="turning-example" data-turning-example data-motion="paused">
 <div class="drive-heading"><span>What keeps the gas turning?</span><button type="button" data-turning-play disabled>Play motion</button></div>
 <div class="diagram-cases" role="group" aria-label="From motion to density">${steps.map((s,i)=>`<button type="button" data-turning-step="${i}" aria-pressed="${i===0}" disabled>${s.label}</button>`).join('')}</div>
 <p class="diagram-reading" data-turning-reading aria-live="polite">${steps[0].reading}</p>
 <div class="turning-panels" data-turning-panel="0">
 ${svg('curved','Inward force bends the path',`${label(150,24,'With inward force')}${track}<path class="turning-trail" data-turning-trail/><circle cx="225" cy="140" r="7" class="turning-point" data-turning-dot/>${arrow('curved','velocity',225,140,225,111,'data-turning-velocity')}${arrow('curved','force',225,140,184,140,'data-turning-force')}${label(150,242,'The force changes direction.')}`)}
 ${svg('straight','Without inward force, motion stays tangent to the circle',`${label(150,24,'Without inward force')}${track}<path d="M225 140V50" class="turning-trail"/><circle cx="225" cy="140" r="4" class="turning-start"/><circle cx="225" cy="140" r="7" class="turning-point" data-turning-free/>${arrow('straight','velocity',225,140,225,111,'data-turning-free-velocity')}${label(150,242,'The point moves in a straight line.')}`)}
 <p class="turning-key"><span>→ Velocity</span><span>→ Inward force</span></p></div>
 <div class="turning-panels" data-turning-panel="1" hidden>
 ${svg('parcel','The net pressure force turns a small gas volume',`${label(150,24,'Follow a small gas volume')}${track}<g data-turning-parcel><rect x="215" y="131" width="20" height="18" class="turning-cell"/>${arrow('parcel','force',215,140,178,140)}</g>${label(150,242,'Net force points toward the axis.')}`)}
 ${svg('pressure','Higher outer pressure gives an inward net force',`${label(66,32,'Axis side')}${label(232,32,'Wall side')}${label(66,61,'Lower pressure')}${label(232,61,'Higher pressure')}<rect x="126" y="95" width="48" height="70" class="turning-cell"/>${arrow('pressure','pressure',90,130,126,130,'data-pressure-inner')}${arrow('pressure','pressure',240,130,174,130,'data-pressure-outer')}${label(150,187,'Enlarged gas volume')}${arrow('pressure','force',170,215,140,215,'data-pressure-net')}${label(150,248,'Net = inward force − outward force')}`)}
 </div>
 <div class="turning-density" data-turning-panel="2" hidden>
 ${svg('density','The heavy isotope has a steeper relative density gradient',`${label(150,22,'Density ÷ its own axis density')}${[1,3,5,7].map(n=>`<path d="M42 ${211-(n-1)*25}H270" class="diagram-grid"/>${label(23,216-(n-1)*25,`${n}×`)}`).join('')}<path d="M42 48V211H270" class="diagram-axis"/>${[0,1].map(i=>`<path class="turning-density-${i}" data-turning-curve="${i}"/><circle r="4" class="turning-density-dot-${i}" data-turning-density-dot="${i}"/>`).join('')}${label(42,238,'axis')}${label(270,238,'wall')}`)}
 <p class="turning-density-key"><span>━ ⁶Li · light</span><span>┄ ⁷Li · heavy</span></p><p data-turning-ratios></p></div>
 <div class="turning-controls"><label>Progress <span data-turning-progress aria-hidden="true">0%</span><input type="range" min="0" max="100" step="1" value="0" aria-label="Force explanation progress" disabled></label><button type="button" data-turning-replay disabled>Replay</button></div>
 <figcaption data-turning-note>${steps[0].note} The eight-second animation does not show elapsed physical time.</figcaption></figure>`;
}
export function setupForceDiagram(figure:HTMLElement,win:Window & typeof globalThis){
 const range=figure.querySelector<HTMLInputElement>('input')!,play=figure.querySelector<HTMLButtonElement>('[data-turning-play]')!;
 const node=(selector:string)=>figure.querySelector<SVGElement>(selector)!;
 let progress=0,elapsed=0,step=0,frame:number|null=null,last:number|undefined,running=false;
 function paint(){
  const angle=progress,s=turningReference(angle),x=150+75*s.x,y=140+75*s.y;
  node('[data-turning-dot]').setAttribute('cx',String(x));node('[data-turning-dot]').setAttribute('cy',String(y));
  for(const [selector,dx,dy]of [['[data-turning-velocity]',29*s.vx,29*s.vy],['[data-turning-force]',41*s.ax,41*s.ay]] as const){
   const line=node(selector);for(const [key,value]of Object.entries({x1:x,y1:y,x2:x+dx,y2:y+dy}))line.setAttribute(key,String(value));
  }
  node('[data-turning-trail]').setAttribute('d',`M225 140${progress>0?`A75 75 0 0 0 ${x} ${y}`:''}`);
  const freeY=140+75*s.freeY;node('[data-turning-free]').setAttribute('cy',String(freeY));
  node('[data-turning-free-velocity]').setAttribute('y1',String(freeY));node('[data-turning-free-velocity]').setAttribute('y2',String(freeY-29));
  node('[data-turning-parcel]').setAttribute('transform',`rotate(${-angle*180/Math.PI} 150 140)`);
  const ratios=[6.0151228874,7.0160034366].map((mass,i)=>{
   const ratio=turningDensity(progress,mass);
   node(`[data-turning-curve="${i}"]`).setAttribute('d',Array.from({length:61},(_,j)=>{const r=progress*j/60;return `${j?'L':'M'}${42+228*r} ${211-(turningDensity(r,mass)-1)*25}`;}).join(''));
   const dot=node(`[data-turning-density-dot="${i}"]`);dot.setAttribute('cx',String(42+228*progress));dot.setAttribute('cy',String(211-(ratio-1)*25));return ratio;
  });
  figure.querySelector('[data-turning-ratios]')!.textContent=`At ${(progress*100).toFixed(0)}% of the radius: ⁶Li ${ratios[0].toFixed(2)}× · ⁷Li ${ratios[1].toFixed(2)}×`;
  range.value=String(Math.round(progress*100));figure.querySelector('[data-turning-progress]')!.textContent=`${Math.round(progress*100)}%`;
 }
 function pause(){running=false;figure.dataset.motion='paused';play.textContent=progress===1?'Replay motion':'Play motion';last=undefined;if(frame!==null)win.cancelAnimationFrame(frame);frame=null;}
 function tick(now:number){frame=null;if(!running)return;if(last!==undefined){elapsed=Math.min(8000,elapsed+Math.min(64,now-last));progress=elapsed/8000;}last=now;paint();if(progress===1)pause();else frame=win.requestAnimationFrame(tick);}
 function start(){if(progress===1)progress=0;elapsed=progress*8000;running=true;figure.dataset.motion='running';play.textContent='Pause motion';last=undefined;paint();frame=win.requestAnimationFrame(tick);}
 for(const button of figure.querySelectorAll<HTMLButtonElement>('[data-turning-step]')){
  button.disabled=false;button.addEventListener('click',()=>{
   progress=0;pause();step=Number(button.dataset.turningStep);
   for(const choice of figure.querySelectorAll('[data-turning-step]'))choice.setAttribute('aria-pressed',String(choice===button));
   for(const panel of figure.querySelectorAll<HTMLElement>('[data-turning-panel]'))panel.hidden=Number(panel.dataset.turningPanel)!==step;
   figure.querySelector('[data-turning-reading]')!.textContent=steps[step].reading;
   figure.querySelector('[data-turning-note]')!.textContent=`${steps[step].note} The eight-second animation does not show elapsed physical time.`;paint();
  });
 }
 play.disabled=range.disabled=false;play.addEventListener('click',()=>running?pause():start());
 const replay=figure.querySelector<HTMLButtonElement>('[data-turning-replay]')!;replay.disabled=false;replay.addEventListener('click',()=>{pause();progress=0;start();});
 range.addEventListener('input',()=>{progress=range.valueAsNumber/100;pause();paint();});
 win.document.addEventListener('visibilitychange',()=>{if(win.document.hidden)pause();});
 win.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',event=>{if(event.matches)pause();});
 if(typeof win.IntersectionObserver==='function')new win.IntersectionObserver(entries=>{if(entries.every(entry=>!entry.isIntersecting))pause();}).observe(figure);
 paint();
}
