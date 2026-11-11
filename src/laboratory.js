import {DEFAULT_GEOMETRY} from './geometries.ts';
import {DEFAULT_TRANSPORT} from './transport.ts';
import {METHOD_GUIDES} from './methods.ts';
export const geometryModes=['gyro','curved','doublewell','mirror','centrifugal','poms','azimuthal'];
export const transportModes=['advection','diffusion','mobility','ionization','transit'];
export const coreModes=['centrifuge','rotating','doublewell','doublewell-dynamics','gyro','icr','curved'];
export const isReduced=mode=>geometryModes.includes(mode)||transportModes.includes(mode);
export const isInfo=mode=>!isReduced(mode)&&!['rotating','icr','centrifuge','doublewell-dynamics'].includes(mode);
export const guide=mode=>METHOD_GUIDES.find(g=>g.id===mode);
// Labels include SI units. Log sliders represent positive physical quantities,
// never hidden phenomenological strength controls.
const definitions=[
 ['magneticT','Magnetic field','T',.02,.5,.01,'gyro curved doublewell poms azimuthal advection diffusion'],
 ['voltage','Prescribed potential amplitude','V',0,1200,20,'doublewell poms azimuthal'],
 ['quadraticShape','Quadratic potential coefficient κ','',0,2,.05,'doublewell'],
 ['canonicalMomentum','Canonical momentum Pθ / (qBa²)','',-.3,.3,.01,'doublewell'],
 ['plotInnerFraction','Plot inner radius r/a (view only)','',0,.8,.01,'doublewell'],
 ['temperatureEV','Ion temperature / transverse energy','eV',.1,30,.1,'gyro curved doublewell advection diffusion mobility'],
 ['beamEV','Axial beam energy','eV',1,2000,1,'gyro curved mirror centrifugal poms azimuthal transit'],
 ['radius','Reference radius','m',.05,1,.01,'doublewell mirror centrifugal poms azimuthal'],
 ['length','Flight / channel length','m',.1,10,.1,'curved azimuthal transit'],
 ['curvatureRadius','Curvature radius','m',.2,10,.1,'curved'],
 ['mirrorRatio','Magnetic mirror ratio','',1,8,.1,'mirror centrifugal'],
 ['endRadiusRatio','Outward end / source radius ratio','',1,3,.05,'mirror centrifugal'],
 ['pitchDeg','Injection pitch angle','degrees',1,85,1,'mirror centrifugal'],
 ['rotationRadS','Imposed angular speed','rad/s',0,50000,500,'mirror centrifugal'],
 ['collisionHz','Prescribed collision frequency','s⁻¹',1,7,.05,'advection diffusion mobility',true],
 ['electricVM','Prescribed electric field','V/m',0,1000,5,'advection mobility'],
 ['duration','Observation time','s',-6,-2,.05,'gyro poms azimuthal advection diffusion mobility ionization transit',true],
 ['densityM3','Density (electron density for ionization)','m⁻³',14,20,.1,'diffusion ionization',true],
 ['electronTemperatureEV','Electron temperature','eV',.2,30,.2,'ionization'],
 ['thresholdAEV','A ionization threshold','eV',1,30,.1,'ionization'],
 ['thresholdBEV','B ionization threshold','eV',1,30,.1,'ionization'],
 ['ionizationCrossSectionA','A assumed step cross section','m²',-22,-18,.1,'ionization',true],
 ['ionizationCrossSectionB','B assumed step cross section','m²',-22,-18,.1,'ionization',true],
 ['backgroundMassU','Light background ion mass','u',1,4,.1,'diffusion'],
 ['coulombLog','Coulomb logarithm','',2,15,.5,'diffusion'],
 ['energySpreadFraction','Fractional beam-energy spread','',.01,.5,.01,'transit'],
 ['pulseWidthS','Source pulse width','s',-7,-3,.1,'transit',true],
];
const defaults={...DEFAULT_TRANSPORT,...DEFAULT_GEOMETRY};
const elements=new Map();
export function setupLaboratory(onInput){
 const host=document.getElementById('reduced-controls');
 for(const [key,label,unit,min,max,step,modes,log] of definitions){
  const box=document.createElement('div');box.className='control';box.dataset.modes=modes;
  const l=document.createElement('label'),title=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');
  input.type='range';input.id='parameter-'+key;input.min=min;input.max=max;input.step=step;l.htmlFor=input.id;title.textContent=label;
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;
  const initial=defaults[key]??(log?10**((min+max)/2):(min+max)/2);
  input.value=log?Math.log10(initial):initial;
  const read=()=>log?10**Number(input.value):Number(input.value);
  const update=()=>out.textContent=`${read().toLocaleString(undefined,{maximumSignificantDigits:4})} ${unit}`;
  update();input.addEventListener('input',()=>{update();onInput();});
  l.append(title,out);box.append(l,input);host.append(box);elements.set(key,{box,read});
 }
 const system=document.getElementById('system');
 for(const item of METHOD_GUIDES.filter(item=>coreModes.includes(item.id)))if(![...system.options].some(option=>option.value===item.id)){
  const option=document.createElement('option');option.value=item.id;option.textContent=`${item.title} · §${item.section}${isInfo(item.id)?' · overview':''}`;system.add(option);
 }
 const directory=document.getElementById('method-directory');
 for(const g of METHOD_GUIDES.filter(item=>coreModes.includes(item.id))){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`§${g.section} · ${g.title}`;details.append(summary);
  appendGuide(details,g);const button=document.createElement('button');button.className='text-button';button.textContent=isInfo(g.id)?'Read method overview ↗':'Explore this model ↗';
  button.addEventListener('click',()=>{system.value=g.id;system.dispatchEvent(new Event('change'));document.getElementById('system').scrollIntoView({behavior:'smooth'});});details.append(button);directory.append(details);
 }
}
function appendGuide(host,g){
 const mechanism=document.createElement('p');mechanism.textContent=g.mechanism;host.append(mechanism);
 for(const [title,list]of [['Advantages',g.advantages],['Disadvantages',g.disadvantages]]){
  const section=document.createElement('div');section.className='guide-tradeoff';
  const h=document.createElement('h3');h.textContent=title;const ul=document.createElement('ul');list.forEach(text=>{const li=document.createElement('li');li.textContent=text;ul.append(li);});section.append(h,ul);host.append(section);
 }
 const fidelity=document.createElement('p');fidelity.className='fidelity-note';fidelity.textContent='Model boundary: '+g.fidelity;host.append(fidelity);
}
export function showLaboratory(mode){
 document.getElementById('frequency-readout').hidden=isReduced(mode)||mode==='doublewell-dynamics';
 for(const [key,{box}]of elements){
  box.hidden=!box.dataset.modes.split(' ').includes(mode);
  if(mode==='diffusion'){const coulomb=document.getElementById('diffusion-closure').value==='coulomb-heavy-light';if(key==='collisionHz')box.hidden=coulomb;if(['densityM3','backgroundMassU','coulombLog'].includes(key))box.hidden=!coulomb;}
  if(key==='duration')box.querySelector('label span').textContent=mode==='transit'?'Minimum plot horizon':'Observation time';
  if(key==='temperatureEV')box.querySelector('label span').textContent=geometryModes.includes(mode)?'Reference transverse kinetic energy':'Ion temperature';
  if(key==='beamEV')box.querySelector('label span').textContent=['mirror','centrifugal'].includes(mode)?'Total injection kinetic energy':'Axial beam energy';
 }
 const host=document.getElementById('method-guide');host.replaceChildren();const g=guide(mode);if(g)appendGuide(host,g);
}
export function reducedConfig(mode,ions){
 const c={...(geometryModes.includes(mode)?DEFAULT_GEOMETRY:DEFAULT_TRANSPORT)};
 for(const [key,{box,read}] of elements)if(box.dataset.modes.split(' ').includes(mode))c[key]=read();
 Object.assign(c,{massA:ions[0].massU,massB:ions[1].massU,chargeA:ions[0].chargeState,chargeB:ions[1].chargeState});
 if(mode==='diffusion')c.collisionModel=document.getElementById('diffusion-closure').value;
 if(mode==='ionization')c.ionizationModel='step-cross-section';
 return c;
}
const NS='http://www.w3.org/2000/svg';
function svgElement(tag,attributes={},text){const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attributes))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
const format=n=>!Number.isFinite(n)?'—':n===0?'0':Math.abs(n)>=1e4||Math.abs(n)<.001?n.toExponential(2):Number(n.toPrecision(4)).toString();
const plotObservers=new WeakMap();
// SVG user units track CSS pixels. Hidden figures use the existing finite
// layout until ResizeObserver supplies their visible content-box width.
function plotWidth(figure){
 const bounds=figure.getBoundingClientRect?.();
 const style=figure.ownerDocument?.defaultView?.getComputedStyle(figure);
 return bounds?.width-(parseFloat(style?.paddingLeft)||0)-(parseFloat(style?.paddingRight)||0)
  -(parseFloat(style?.borderLeftWidth)||0)-(parseFloat(style?.borderRightWidth)||0);
}
function plotLines(text,width){
 const limit=Math.max(8,Math.floor(width/7.2)),lines=[];
 let line='';
 for(const word of String(text).split(/\s+/)){
  if(line&&line.length+word.length+1>limit){lines.push(line);line='';}
  for(let start=0;start<word.length;start+=limit){
   const part=word.slice(start,start+limit);
   if(start){lines.push(line);line=part;}else line+=(line?' ':'')+part;
  }
 }
 if(line)lines.push(line);return lines;
}
export function renderPlots(host,curves,{onSelect,announce=true}={}){
 for(const observer of plotObservers.get(host)??[])observer.disconnect();
 const observers=[];plotObservers.set(host,observers);
 host.replaceChildren();const groups=new Map(),cursors=[];
 for(const c of curves){const key=c.xLabel+'|'+c.yLabel+'|'+!!c.equalAspect;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 for(const group of groups.values()){
  const c=group[0];let width=800,height=c.equalAspect?800:310,bottom=height-60,top=45,left=75,right=750,xmin,xmax,ymin,ymax,sx,sy;
  const figure=document.createElement('figure'),caption=document.createElement('figcaption'),svg=svgElement('svg',{preserveAspectRatio:'xMidYMid meet',role:'img'});
  caption.textContent=c.yLabel+' against '+c.xLabel+(c.equalAspect?' · equal spatial scale':'');svg.setAttribute('aria-label',caption.textContent);
  const pairs=group.flatMap(s=>s.x.flatMap((x,i)=>[s.y[i],s.low?.[i],s.high?.[i]].map(y=>[x,y]))).filter(p=>p.every(Number.isFinite));
  if(!pairs.length)continue;
  const draw=nextWidth=>{
  width=nextWidth;svg.replaceChildren();
  const columns=Math.max(1,Math.floor((width-100)/220)),columnWidth=(width-100)/columns;
  const legends=group.map(series=>plotLines(series.label,columnWidth-32));
  const rows=[];let legendY=18;
  for(let i=0;i<group.length;i+=columns){
   rows.push(legendY);legendY+=Math.max(...legends.slice(i,i+columns).map(lines=>lines.length))*15;
  }
  top=legendY+12;
  // Preserve the historical one-row 800px layout; add height, not compressed
  // typography or plotting area, when a narrow legend needs extra lines.
  const xLines=plotLines(c.xLabel,width-100),footer=60+(xLines.length-1)*15;
  height=c.equalAspect?Math.max(width,top+160+footer):310+(top-45)+(footer-60);
  bottom=height-footer;right=width-(width<500?20:50);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('style',`width:100%;min-width:180px;height:${height}px;display:block`);
  figure.setAttribute('style','overflow-x:auto');
  xmin=Infinity;xmax=-Infinity;ymin=Infinity;ymax=-Infinity;
  for(const [x,y] of pairs){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  if(c.yDomain)[ymin,ymax]=c.yDomain;
  if(c.xDomain)[xmin,xmax]=c.xDomain;
  if(c.equalAspect){
   // A metre has the same display length on both spatial axes, including
   // straight/zero-energy orbits with one or both coordinate spans zero.
   const unit=Math.max((xmax-xmin)/(right-left),(ymax-ymin)/(bottom-top))||1/(bottom-top);
   const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
   xmin=cx-(right-left)*unit/2;xmax=cx+(right-left)*unit/2;ymin=cy-(bottom-top)*unit/2;ymax=cy+(bottom-top)*unit/2;
  }else{
   if(xmin===xmax)xmax=xmin+1;if(ymin===ymax){const d=ymin===0?1:Math.max(Number.MIN_VALUE,Math.abs(ymin)*.05);ymin-=d;ymax+=d;}
  }
  sx=x=>left+(right-left)*(x-xmin)/(xmax-xmin);sy=y=>bottom-(bottom-top)*(y-ymin)/(ymax-ymin);
  for(let i=0;i<=4;i++){
   const y=ymin+(ymax-ymin)*i/4;
   svg.append(svgElement('path',{d:`M${left} ${sy(y)}H${right}`,stroke:'#34403a',fill:'none'}),svgElement('text',{x:left-10,y:sy(y)+4,'text-anchor':'end',fill:'#a8b4ae','font-size':12},format(y)));
  }
  const ticks=Math.max(1,Math.min(4,Math.floor((right-left)/100)));
  for(let i=0;i<=ticks;i++){
   const x=xmin+(xmax-xmin)*i/ticks;
   svg.append(svgElement('text',{x:sx(x),y:bottom+22,'text-anchor':i===0?'start':i===ticks?'end':'middle',fill:'#a8b4ae','font-size':12},format(x)));
  }
  xLines.forEach((line,i)=>svg.append(svgElement('text',{x:(left+right)/2,y:bottom+50+15*i,'text-anchor':'middle',fill:'#d7ded7','font-size':12},line)));
  group.forEach((series,index)=>{
   const color=series.color??['#a4c4b1','#d2956b','#95b3d4','#d1bc87'][index%4],dash=series.dash??'';let path='',connected=false;
   if(series.low&&series.high){
    // Each finite contiguous segment gets its own uncertainty band; missing
    // bootstrap bounds must not be connected across an undefined collector.
    let segment=[];
    const flush=()=>{if(segment.length){const points=[...segment.map(i=>[sx(series.x[i]),sy(series.low[i])]),...segment.toReversed().map(i=>[sx(series.x[i]),sy(series.high[i])])];svg.append(svgElement('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:color,'fill-opacity':.14}));segment=[];}};
    series.x.forEach((x,i)=>{if([x,series.low[i],series.high[i]].every(Number.isFinite))segment.push(i);else flush();});flush();
   }
   series.x.forEach((x,i)=>{const y=series.y[i];if(!Number.isFinite(x)||!Number.isFinite(y)){connected=false;return;}path+=`${connected?'L':'M'}${sx(x)} ${sy(y)} `;connected=true;});
   svg.append(svgElement('path',{d:path,stroke:color,'stroke-width':2,'stroke-dasharray':dash,'stroke-opacity':series.muted?.18:1,fill:'none'}));
   const lx=80+(index%columns)*columnWidth,ly=rows[Math.floor(index/columns)];
   svg.append(svgElement('path',{d:`M${lx} ${ly-4}h20`,stroke:color,'stroke-width':2,'stroke-dasharray':dash,fill:'none'}));
   const legend=svgElement('text',{x:lx+26,y:ly,fill:color,'font-size':12});
   legend.append(svgElement('title',{},series.label));
   legends[index].forEach((line,i)=>legend.append(svgElement('tspan',{x:lx+26,dy:i?15:0},line)));svg.append(legend);
  });
  if(Number.isFinite(c.selectedX)){
   const x=sx(c.selectedX);svg.append(svgElement('path',{d:`M${x} ${top}V${bottom}`,stroke:'#e8eae4','stroke-dasharray':'4 4'}));
   for(const series of group){const i=c.equalAspect?series.x.indexOf(c.selectedX):series.x.lastIndexOf(c.selectedX);if(i>=0&&Number.isFinite(series.y[i]))svg.append(svgElement('circle',{cx:x,cy:sy(series.y[i]),r:4,fill:'#e8eae4'}));}
  }
  cursor=svgElement('path',{stroke:'#e8eae4','stroke-dasharray':'4 4','pointer-events':'none'});svg.append(cursor);updateCursor(selected);
  };
  let cursor,selected=c.selectedX;
  function updateCursor(value){selected=value;if(!cursor||!sx)return;cursor.setAttribute('d',Number.isFinite(value)&&value>=xmin&&value<=xmax?`M${sx(value)} ${top}V${bottom}`:'');}
  cursors.push(value=>{updateCursor(value);if(Number.isFinite(value)){readout.setAttribute('aria-live','off');inspect(value);}});
  const readout=document.createElement('p');readout.className='plot-readout';readout.setAttribute('aria-live',announce?'polite':'off');
  const samples=c.equalAspect?group.flatMap(series=>series.x.flatMap((x,i)=>[x,series.y[i]].every(Number.isFinite)?[{x,y:series.y[i]}]:[])):
   [...new Set(pairs.map(p=>p[0]))].sort((a,b)=>a-b).map(x=>({x}));let sample=0;
  const inspect=(target,targetY)=>{
   const distance=(x,y)=>c.equalAspect?Math.hypot(x-target,y-targetY):Math.abs(x-target);
   sample=samples.reduce((best,p,i)=>distance(p.x,p.y)<distance(samples[best].x,samples[best].y)?i:best,0);
   readout.textContent=group.map(series=>{
    let closest=-1,best=Infinity;
    // A response discontinuity uses the last (post-event) value at a repeated
    // abscissa, matching the right-continuous cumulative-incidence producer.
    series.x.forEach((x,i)=>{if(![x,series.y[i]].every(Number.isFinite))return;const d=distance(x,series.y[i]);if(d<best||(!c.equalAspect&&d===best&&x===series.x[closest])){best=d;closest=i;}});
    return closest<0?`${series.label}: —`:`${series.label}: ${format(series.x[closest])}, ${format(series.y[closest])}`+(series.low?` [${format(series.low[closest])}, ${format(series.high[closest])}]`:'');
   }).join(' · ');
  };
  svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',caption.textContent+'. Arrow keys inspect samples; Home and End select endpoints.');
  svg.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const i=event.key==='Home'?0:event.key==='End'?samples.length-1:Math.max(0,Math.min(samples.length-1,sample+(event.key==='ArrowRight'?1:-1)));inspect(samples[i].x,samples[i].y);sample=i;updateCursor(samples[i].x);onSelect?.(samples[i].x);
   // A shared-clock callback may silently update this same readout. Announce
   // the deliberate keyboard sample after that callback, never every RAF tick.
   readout.setAttribute('aria-live','polite');readout.textContent='';inspect(samples[i].x,samples[i].y);sample=i;
  });
  const inspectPointer=event=>{
   const bounds=svg.getBoundingClientRect(),scale=Math.min(bounds.width/width,bounds.height/height);
   if(scale<=0)return;
   const px=(event.clientX-bounds.left-(bounds.width-width*scale)/2)/scale;
   const py=(event.clientY-bounds.top-(bounds.height-height*scale)/2)/scale;
   if(px<left||px>right||py<top||py>bottom)return;
   const target=xmin+(px-left)/(right-left)*(xmax-xmin);
   const targetY=ymax-(py-top)/(bottom-top)*(ymax-ymin);inspect(target,targetY);if(event.type==='pointerdown'||event.buttons===1){updateCursor(samples[sample].x);onSelect?.(samples[sample].x);}
  };
  svg.addEventListener('pointermove',inspectPointer);svg.addEventListener('pointerdown',inspectPointer);
  inspect(Number.isFinite(c.selectedX)?c.selectedX:samples[0].x,samples[0].y);
  figure.append(caption,svg,readout);host.append(figure);
  const measured=plotWidth(figure);draw(Number.isFinite(measured)&&measured>0?Math.max(180,measured):800);
  const Observer=figure.ownerDocument?.defaultView?.ResizeObserver??globalThis.ResizeObserver;
  if(Observer){
   const observer=new Observer(entries=>{
    const measured=entries.find(entry=>entry.target===figure)?.contentRect.width;
    if(Number.isFinite(measured)&&measured>0&&Math.abs(Math.max(180,measured)-width)>.5)draw(Math.max(180,measured));
   });observer.observe(figure);observers.push(observer);
  }
 }
 return {setCursor(value){for(const cursor of cursors)cursor(value);}};
}
export function orbitCurves(result){
 const curves=[];
 result.species.forEach((s,i)=>{
  const label=['A','B'][i];
  for(const [field,title,scale]of [['time','Collected transit time (µs)',1e6],['kineticEV','Impact energy (eV)',1]]){
   const values=s.impacts.map(p=>p[field]*scale).sort((a,b)=>a-b);
   if(values.length)curves.push({label,x:values,y:values.map((_,i)=>(i+1)/values.length),xLabel:title,yLabel:'Collected-ion cumulative fraction'});
  }
 });return curves;
}
