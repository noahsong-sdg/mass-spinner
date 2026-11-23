import {turningDensity} from './guide-force.js';

const masses=[6.0151228874,7.0160034366] as const;
const left=48,right=378,top=50,bottom=250;
const text=(x:number,y:number,value:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${value}</text>`;

function plot(kind:'radius'|'temperature'){
 const radial=kind==='radius',ticks=radial?[0,3,6,9,12]:[250,500,750,1000,1250,1500];
 const x=(value:number)=>left+(right-left)*(radial?value/12:(value-250)/1250);
 return `<div><h3>Against ${kind}</h3><p data-density-held="${kind}"></p>
 <svg viewBox="0 0 400 304" role="img" aria-labelledby="density-${kind}-title density-${kind}-description">
 <title id="density-${kind}-title">Density ratio against ${kind}</title>
 <desc id="density-${kind}-description">${radial?'Temperature stays constant along each curve.':'Radius stays constant along each curve. Temperature is uniform throughout each equilibrium.'} Both isotope curves use their own axis density. The points show the selected radius and temperature.</desc>
 ${text(210,22,'Density ÷ its own axis density')}<g data-density-grid="${kind}"></g>
 <path d="M${left} ${top}V${bottom}H${right}" class="diagram-axis"/>
 ${ticks.map(value=>text(x(value),272,String(value))).join('')}${text(213,297,radial?'Radius r (cm)':'Temperature T (K)')}
 <path data-density-cursor="${kind}" class="density-scan-cursor"/>
 ${masses.map((_,i)=>`<path data-density-line="${kind}-${i}" class="turning-density-${i}"/><circle r="4.5" data-density-point="${kind}-${i}" class="turning-density-dot-${i}"/>`).join('')}
 </svg></div>`;
}

export function densityScanDiagram(){
 return `<figure class="density-scan" id="density-equation" data-density-scan>
 <div class="drive-heading">Change radius and temperature.</div>
 <p class="diagram-reading">Each curve shows the density equation above. Move either slider. The points show the same selected state on both plots.</p>
 <div class="density-scan-controls">
 <label>Temperature <output data-density-temperature>500 K</output><input type="range" min="250" max="1500" step="10" value="500" aria-label="Equilibrium temperature (K)" disabled></label>
 <label>Radius <output data-density-radius>12.0 cm · wall</output><input type="range" min="0" max="12" step="0.1" value="12" aria-label="Equilibrium radius (cm)" disabled></label>
 </div><div class="density-scan-plots">${plot('radius')}${plot('temperature')}</div>
 <div class="density-key"><span>━ ⁶Li · lighter</span><span>┄ ⁷Li · heavier</span></div>
 <p data-density-selected aria-live="polite"></p>
 <figcaption>Ideal neutral equilibrium, not your run. Assumed vessel radius: 12 cm. Angular speed stays at Ω = 12,500 rad/s, giving 1,500 m/s at the wall. Temperature is uniform within each equilibrium. Each curve uses its own axis density; the ratios are not isotope percentages. The vertical scale changes with the inputs.</figcaption></figure>`;
}

/** Calculate two parameter scans from the same equilibrium equation. */
export function densityScan(radiusCm:number,temperature:number){
 const radius=radiusCm/12;
 return {
  selected:masses.map(mass=>turningDensity(radius,mass,temperature)),
  radius:masses.map(mass=>Array.from({length:101},(_,i)=>turningDensity(i/100,mass,temperature))),
  temperature:masses.map(mass=>Array.from({length:101},(_,i)=>turningDensity(radius,mass,250+12.5*i))),
 };
}

export function setupDensityScan(figure:HTMLElement){
 const temperature=figure.querySelector<HTMLInputElement>('[aria-label="Equilibrium temperature (K)"]')!;
 const radius=figure.querySelector<HTMLInputElement>('[aria-label="Equilibrium radius (cm)"]')!;
 function paint(){
  const r=radius.valueAsNumber,t=temperature.valueAsNumber,data=densityScan(r,t);
  figure.querySelector('[data-density-temperature]')!.textContent=`${t} K`;
  figure.querySelector('[data-density-radius]')!.textContent=`${r.toFixed(1)} cm${r===0?' · axis':r===12?' · wall':''}`;
  for(const kind of ['radius','temperature'] as const){
   const curves=data[kind],maximum=Math.max(...curves.flat()),rawStep=maximum/4;
   const unit=10**Math.floor(Math.log10(rawStep)),step=[1,2,2.5,5,10].find(n=>n*unit>=rawStep)!*unit;
   const ceiling=Math.ceil(maximum/step)*step,y=(value:number)=>bottom-(bottom-top)*value/ceiling;
   const selectedX=left+(right-left)*(kind==='radius'?r/12:(t-250)/1250);
   figure.querySelector(`[data-density-held="${kind}"]`)!.textContent=kind==='radius'?`Temperature stays at ${t} K.`:`Radius stays at ${r.toFixed(1)} cm.`;
   figure.querySelector(`[data-density-grid="${kind}"]`)!.innerHTML=Array.from({length:Math.round(ceiling/step)+1},(_,i)=>{
    const v=i*step;return `<path d="M${left} ${y(v)}H${right}" class="diagram-grid"/>${text(28,y(v)+5,Number(v.toPrecision(3)).toString()+'×')}`;
   }).join('');
   figure.querySelector(`[data-density-cursor="${kind}"]`)!.setAttribute('d',`M${selectedX} ${top}V${bottom}`);
   curves.forEach((curve,i)=>{
    figure.querySelector(`[data-density-line="${kind}-${i}"]`)!.setAttribute('d',curve.map((v,j)=>`${j?'L':'M'}${left+(right-left)*j/100} ${y(v)}`).join(''));
    const point=figure.querySelector(`[data-density-point="${kind}-${i}"]`)!;
    point.setAttribute('cx',String(selectedX));point.setAttribute('cy',String(y(data.selected[i])));
   });
  }
  figure.querySelector('[data-density-selected]')!.textContent=`At ${r.toFixed(1)} cm and ${t} K: ⁶Li ${data.selected[0].toFixed(2)}× · ⁷Li ${data.selected[1].toFixed(2)}× its own axis density.`;
 }
 for(const input of [temperature,radius]){input.disabled=false;input.addEventListener('input',paint);}
 paint();
}
