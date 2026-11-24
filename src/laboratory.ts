import {DEFAULT_GEOMETRY, type GeometryConfig} from './geometries.js';
import {DEFAULT_TRANSPORT, type TransportConfig, type TransportMode} from './transport.js';
import {METHOD_GUIDES, type MethodGuide} from './methods.js';
import type {IonSpecies, SpeciesResult} from './physics.js';

export interface PlotCurve {
 label: string; x: readonly number[]; y: readonly (number | null)[]; xLabel: string; yLabel: string;
 low?: readonly (number | null)[]; high?: readonly (number | null)[]; xDomain?: readonly [number, number]; yDomain?: readonly [number, number];
 selectedX?: number; equalAspect?: boolean; color?: string; dash?: string; muted?: boolean;
 /** Reconstruct a chronological ordinate from canonical state between accepted knots. */
 sampleAt?: (x: number) => number | null;
 /** Keep physical event knots and their neighboring samples in dense history displays. */
 eventX?: readonly number[];
}
export interface PlotOptions {onSelect?: (x: number) => void; announce?: boolean; /** Reveal chronological history through this time; setCursor advances or rewinds it. */ revealUntil?: number}
export interface PlotController {setCursor(value: number | undefined): void}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const geometryModes=['gyro','curved','doublewell','mirror','centrifugal','poms','azimuthal'];
export const transportModes=['advection','diffusion','mobility','ionization','transit'];
export const coreModes=['centrifuge','rotating','doublewell','doublewell-dynamics','gyro','icr','curved'];
export const isReduced=(mode: string)=>geometryModes.includes(mode)||transportModes.includes(mode);
export const isInfo=(mode: string)=>!isReduced(mode)&&!['rotating','icr','centrifuge','doublewell-dynamics'].includes(mode);
export const guide=(mode: string)=>METHOD_GUIDES.find(g=>g.id===mode);
// Labels include SI units. Log sliders represent positive physical quantities,
// never hidden phenomenological strength controls.
type NumericConfigKey = {[K in keyof typeof defaults]-?: NonNullable<typeof defaults[K]> extends number ? K : never}[keyof typeof defaults];
type ControlDefinition = readonly [key: NumericConfigKey, label: string, unit: string, min: number, max: number, step: number, modes: string, log?: boolean];
const definitions: readonly ControlDefinition[]=[
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
type ControlKey = NumericConfigKey;
type ReducedConfig = (GeometryConfig | TransportConfig) & Partial<Record<ControlKey, number>> & {collisionModel?: TransportConfig['collisionModel']; ionizationModel?: TransportConfig['ionizationModel']};
const defaults={...DEFAULT_TRANSPORT,...DEFAULT_GEOMETRY};
const elements=new Map<ControlKey, {box: HTMLDivElement; read: () => number}>();
export function setupLaboratory(onInput: () => void){
 const host=document.getElementById('reduced-controls')!;
 for(const [key,label,unit,min,max,step,modes,log] of definitions){
  const box=document.createElement('div');box.className='control';box.dataset.modes=modes;
  const l=document.createElement('label'),title=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');
  input.type='range';input.id='parameter-'+key;input.min=String(min);input.max=String(max);input.step=String(step);l.htmlFor=input.id;title.textContent=label;
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;
  const initial=defaults[key]??(log?10**((min+max)/2):(min+max)/2);
  input.value=String(log?Math.log10(initial):initial);
  const read=()=>log?10**Number(input.value):Number(input.value);
  const update=()=>out.textContent=`${read().toLocaleString(undefined,{maximumSignificantDigits:4})} ${unit}`;
  update();input.addEventListener('input',()=>{update();onInput();});
  l.append(title,out);box.append(l,input);host.append(box);elements.set(key,{box,read});
 }
 const system=document.getElementById('system') as HTMLSelectElement;
 for(const item of METHOD_GUIDES.filter(item=>coreModes.includes(item.id)))if(![...system.options].some(option=>option.value===item.id)){
  const option=document.createElement('option');option.value=item.id;option.textContent=`${item.title} · §${item.section}${isInfo(item.id)?' · overview':''}`;system.add(option);
 }
 const directory=document.getElementById('method-directory')!;
 for(const g of METHOD_GUIDES.filter(item=>coreModes.includes(item.id))){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`§${g.section} · ${g.title}`;details.append(summary);
  appendGuide(details,g);const button=document.createElement('button');button.className='text-button';button.textContent=isInfo(g.id)?'Read the method description ↗':'Open this model ↗';
  button.addEventListener('click',()=>{system.value=g.id;system.dispatchEvent(new Event('change'));system.scrollIntoView({behavior:'smooth'});});details.append(button);directory.append(details);
 }
}
function appendGuide(host: HTMLElement,g: MethodGuide){
 const mechanism=document.createElement('p');mechanism.textContent=g.mechanism;host.append(mechanism);
 for(const [title,list]of [['Advantages',g.advantages],['Disadvantages',g.disadvantages]] as const){
  const section=document.createElement('div');section.className='guide-tradeoff';
  const h=document.createElement('h3');h.textContent=title;const ul=document.createElement('ul');list.forEach(text=>{const li=document.createElement('li');li.textContent=text;ul.append(li);});section.append(h,ul);host.append(section);
 }
 const fidelity=document.createElement('p');fidelity.className='fidelity-note';fidelity.textContent='Model boundary: '+g.fidelity;host.append(fidelity);
}
export function showLaboratory(mode: string){
 document.getElementById('frequency-readout')!.hidden=isReduced(mode)||mode==='doublewell-dynamics';
 for(const [key,{box}]of elements){
  box.hidden=!box.dataset.modes!.split(' ').includes(mode);
  if(mode==='diffusion'){const coulomb=(document.getElementById('diffusion-closure') as HTMLSelectElement).value==='coulomb-heavy-light';if(key==='collisionHz')box.hidden=coulomb;if(['densityM3','backgroundMassU','coulombLog'].includes(key))box.hidden=!coulomb;}
  if(key==='duration')box.querySelector('label span')!.textContent=mode==='transit'?'Minimum plot duration':'Observation time';
  if(key==='temperatureEV')box.querySelector('label span')!.textContent=geometryModes.includes(mode)?'Reference transverse kinetic energy':'Ion temperature';
  if(key==='beamEV')box.querySelector('label span')!.textContent=['mirror','centrifugal'].includes(mode)?'Total injection kinetic energy':'Axial beam energy';
 }
 const host=document.getElementById('method-guide')!;host.replaceChildren();const g=guide(mode);if(g)appendGuide(host,g);
}
export function reducedConfig(mode: TransportMode, ions: readonly IonSpecies[]): TransportConfig;
export function reducedConfig(mode: string, ions: readonly IonSpecies[]): GeometryConfig | TransportConfig;
export function reducedConfig(mode: string,ions: readonly IonSpecies[]): ReducedConfig {
 const c: ReducedConfig={...(geometryModes.includes(mode)?DEFAULT_GEOMETRY:DEFAULT_TRANSPORT)};
 for(const [key,{box,read}] of elements)if(box.dataset.modes!.split(' ').includes(mode))c[key]=read();
 Object.assign(c,{massA:ions[0].massU,massB:ions[1].massU,chargeA:ions[0].chargeState,chargeB:ions[1].chargeState});
 if(mode==='diffusion')c.collisionModel=(document.getElementById('diffusion-closure') as HTMLSelectElement).value as TransportConfig['collisionModel'];
 if(mode==='ionization')c.ionizationModel='step-cross-section';
 return c;
}
const NS='http://www.w3.org/2000/svg';
function svgElement<K extends keyof SVGElementTagNameMap>(tag: K,attributes: Record<string, string | number>={},text?: string): SVGElementTagNameMap[K] {const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attributes))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
const format=(n: number | null | undefined)=>!finite(n)?'—':n===0?'0':Math.abs(n)>=1e4||Math.abs(n)<.001?n.toExponential(2):Number(n.toPrecision(4)).toString();
type PlotGroupController={figure:HTMLElement;setCursor(value:number|undefined):void;update(group:PlotCurve[],options:PlotOptions):void;dispose():void};
const plotGroups=new WeakMap<HTMLElement,Map<string,PlotGroupController>>();
function upperBound(values:readonly number[],target:number){
 let low=0,high=values.length;
 while(low<high){const middle=(low+high)>>>1;if(values[middle]<=target)low=middle+1;else high=middle;}
 return low;
}
/** Reduce display paths only. Keep extrema, missing-data boundaries, and physical events. */
function displayCurve(series:PlotCurve,pixels:number):PlotCurve{
 const {x,y,low,high}=series,n=x.length,buckets=Math.max(1,Math.floor(pixels));
 if(series.equalAspect||series.xLabel!=='Time (s)'||n<=buckets*4)return series;
 for(let i=0;i<n;i++)if(!finite(x[i])||i>0&&x[i]<x[i-1])return series;
 const span=x[n-1]-x[0];if(!(span>0))return series;
 const keep=new Set<number>([0,n-1]),ordinates=[y,...(low?[low]:[]),...(high?[high]:[])];
 let start=0;
 while(start<n){
  const bucket=Math.floor((x[start]-x[0])/span*buckets);let end=start+1;
  while(end<n&&Math.floor((x[end]-x[0])/span*buckets)===bucket)end++;
  keep.add(start);keep.add(end-1);
  for(const values of ordinates){
   let min=-1,max=-1;
   for(let i=start;i<end;i++)if(finite(values[i])){if(min<0||values[i]!<values[min]!)min=i;if(max<0||values[i]!>values[max]!)max=i;}
   if(min>=0)keep.add(min);if(max>=0)keep.add(max);
  }
  start=end;
 }
 for(let i=1;i<n;i++)if(x[i]===x[i-1]||ordinates.some(values=>finite(values[i])!==finite(values[i-1]))){keep.add(i-1);keep.add(i);}
 for(const event of series.eventX??[]){const next=upperBound(x,event);for(const i of [next-2,next-1,next])if(i>=0&&i<n)keep.add(i);}
 const indices=[...keep].sort((a,b)=>a-b);
 return {...series,x:indices.map(i=>x[i]),y:indices.map(i=>y[i]),low:low&&indices.map(i=>low[i]),high:high&&indices.map(i=>high[i])};
}
function plotData(group:readonly PlotCurve[]){
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 const abscissas=new Set<number>(),spatial:{x:number;y:number}[]=[];
 const include=(x:number,y:number|null|undefined)=>{if(finite(y)){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);abscissas.add(x);}};
 for(const series of group)for(let i=0;i<series.x.length;i++){
  const x=series.x[i];if(!finite(x))continue;
  include(x,series.y[i]);include(x,series.low?.[i]);include(x,series.high?.[i]);
  if(group[0].equalAspect&&finite(series.y[i]))spatial.push({x,y:series.y[i]!});
 }
 return {xmin,xmax,ymin,ymax,samples:group[0].equalAspect?spatial:[...abscissas].sort((a,b)=>a-b).map(x=>({x,y:undefined}))};
}
// SVG user units track CSS pixels. Hidden figures use the existing finite
// layout until ResizeObserver supplies their visible content-box width.
function plotWidth(figure: HTMLElement){
 const bounds=figure.getBoundingClientRect?.();
 const style=figure.ownerDocument?.defaultView?.getComputedStyle(figure);
 return Number(bounds?.width)-(parseFloat(style?.paddingLeft??'')||0)-(parseFloat(style?.paddingRight??'')||0)
  -(parseFloat(style?.borderLeftWidth??'')||0)-(parseFloat(style?.borderRightWidth??'')||0);
}
function plotLines(text: string,width: number){
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
export function renderPlots(host: HTMLElement,curves: readonly PlotCurve[],options: PlotOptions={}): PlotController {
 const groups=new Map<string,PlotCurve[]>(),previous=plotGroups.get(host)??new Map<string,PlotGroupController>(),current=new Map<string,PlotGroupController>();
 for(const curve of curves){const key=JSON.stringify([curve.xLabel,curve.yLabel,!!curve.equalAspect]);if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(curve);}
 for(const [key,group]of groups){
  if(!group.some(series=>series.x.some((x,i)=>finite(x)&&[series.y[i],series.low?.[i],series.high?.[i]].some(finite))))continue;
  const view=previous.get(key);
  if(view&&Array.from(host.children).includes(view.figure)){view.update(group,options);current.set(key,view);}
  else{view?.dispose();const created=createPlotGroup(host,group,options);if(created)current.set(key,created);}
 }
 for(const [key,view]of previous)if(!current.has(key)){view.dispose();view.figure.remove();}
 let index=0;for(const view of current.values()){if(host.children[index]!==view.figure)host.insertBefore(view.figure,host.children[index]??null);index++;}
 plotGroups.set(host,current);
 return {setCursor(value){for(const view of current.values())view.setCursor(value);}};
}
function createPlotGroup(host:HTMLElement,initialGroup:PlotCurve[],options:PlotOptions):PlotGroupController|undefined{
  let group=initialGroup,c=group[0],{onSelect,announce=true,revealUntil}=options,revealed=revealUntil;
  const updates:(()=>void)[]=[];
  let chronological=new Set(group.filter(series=>series.xLabel==='Time (s)'&&series.x.every((x,i)=>finite(x)&&(i===0||x>=series.x[i-1]))));
  function point(series:PlotCurve,time:number){
   const next=upperBound(series.x,time),last=next-1;
   if(last<0||next>=series.x.length||series.x[last]===time)return {x:series.x[Math.max(0,last)],y:series.y[Math.max(0,last)],low:series.low?.[Math.max(0,last)],high:series.high?.[Math.max(0,last)]};
   const fraction=(time-series.x[last])/(series.x[next]-series.x[last]);
   const interpolate=(values:readonly (number|null)[]|undefined)=>values&&finite(values[last])&&finite(values[next])?values[last]+(values[next]-values[last])*fraction:null;
   return {x:time,y:series.sampleAt?series.sampleAt(time):interpolate(series.y),low:interpolate(series.low),high:interpolate(series.high)};
  }
  function visible(series:PlotCurve,source=series):PlotCurve{
   if(!finite(revealed))return series;
   const n=upperBound(series.x,revealed);if(n===series.x.length)return series;
   const x=series.x.slice(0,n),y=series.y.slice(0,n),low=series.low?.slice(0,n),high=series.high?.slice(0,n),next=upperBound(source.x,revealed);
   if(next&&next<source.x.length&&(!n||series.x[n-1]<revealed)){const endpoint=point(source,revealed);x.push(endpoint.x);y.push(endpoint.y);if(low)low.push(endpoint.low??null);if(high)high.push(endpoint.high??null);}
   return {...series,x,y,low,high};
  }
  const left=75;let width=800,height=c.equalAspect?800:310,bottom=height-60,top=45,right=750,xmin=0,xmax=0,ymin=0,ymax=0,sx: ((x: number) => number) | undefined,sy: (y: number) => number;
  const figure=document.createElement('figure'),caption=document.createElement('figcaption'),svg=svgElement('svg',{preserveAspectRatio:'xMidYMid meet',role:'img'});
  caption.textContent=c.yLabel+' against '+c.xLabel+(c.equalAspect?' · equal spatial scale':'');svg.setAttribute('aria-label',caption.textContent);
  let data=plotData(group);
  if(!finite(data.xmin))return;
  const draw=(nextWidth: number)=>{
  width=nextWidth;svg.replaceChildren();updates.length=0;
  const columns=Math.max(1,Math.floor((width-100)/220)),columnWidth=(width-100)/columns;
  const legends=group.map(series=>plotLines(series.label,columnWidth-32));
  const rows: number[]=[];let legendY=18;
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
  ({xmin,xmax,ymin,ymax}=data);
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
   const color=series.color??['#a4c4b1','#d2956b','#95b3d4','#d1bc87'][index%4],dash=series.dash??'';
   const layer=revealUntil===undefined?svg:svgElement('g',{'data-series':series.label});if(layer!==svg)svg.append(layer);
   const source=series,display=displayCurve(series,right-left),update=()=>{
   const series=visible(display,source);if(layer!==svg)layer.replaceChildren();let path='',connected=false;
   if(series.low&&series.high){
    // Each finite contiguous segment gets its own uncertainty band; missing
    // bootstrap bounds must not be connected across an undefined collector.
    let segment: number[]=[];
    const flush=()=>{if(segment.length){const points=[...segment.map(i=>[sx!(series.x[i]),sy(series.low![i]!)]),...[...segment].reverse().map(i=>[sx!(series.x[i]),sy(series.high![i]!)])];layer.append(svgElement('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:color,'fill-opacity':.14}));segment=[];}};
    series.x.forEach((x,i)=>{if([x,series.low![i],series.high![i]].every(Number.isFinite))segment.push(i);else flush();});flush();
   }
   series.x.forEach((x,i)=>{const y=series.y[i];if(!finite(x)||!finite(y)){connected=false;return;}path+=`${connected?'L':'M'}${sx!(x)} ${sy(y)} `;connected=true;});
   layer.append(svgElement('path',{d:path,stroke:color,'stroke-width':2,'stroke-dasharray':dash,'stroke-opacity':series.muted?.18:1,fill:'none'}));
   const last=series.x.length-1;
   if(finite(revealed)&&last>=0&&finite(series.y[last]))layer.append(svgElement('circle',{cx:sx!(series.x[last]),cy:sy(series.y[last]),r:3,fill:color}));
   };updates.push(update);update();
   const lx=80+(index%columns)*columnWidth,ly=rows[Math.floor(index/columns)];
   svg.append(svgElement('path',{d:`M${lx} ${ly-4}h20`,stroke:color,'stroke-width':2,'stroke-dasharray':dash,fill:'none'}));
   const legend=svgElement('text',{x:lx+26,y:ly,fill:color,'font-size':12});
   legend.append(svgElement('title',{},series.label));
   legends[index].forEach((line,i)=>legend.append(svgElement('tspan',{x:lx+26,dy:i?15:0},line)));svg.append(legend);
  });
  if(finite(c.selectedX)){
   const x=sx(c.selectedX);svg.append(svgElement('path',{d:`M${x} ${top}V${bottom}`,stroke:'#e8eae4','stroke-dasharray':'4 4'}));
   for(const series of group){const i=c.equalAspect?series.x.indexOf(c.selectedX):series.x.lastIndexOf(c.selectedX);if(i>=0&&Number.isFinite(series.y[i]))svg.append(svgElement('circle',{cx:x,cy:sy(series.y[i]!),r:4,fill:'#e8eae4'}));}
  }
  cursor=svgElement('path',{stroke:'#e8eae4','stroke-dasharray':'4 4','pointer-events':'none'});svg.append(cursor);updateCursor(selected);
  };
  let cursor: SVGPathElement | undefined,selected=c.selectedX??revealUntil;
  function updateCursor(value: number | undefined){selected=value;if(!cursor||!sx)return;cursor.setAttribute('d',finite(value)&&value>=xmin&&value<=xmax?`M${sx(value)} ${top}V${bottom}`:'');}
  function moveCursor(value: number | undefined){if(revealUntil!==undefined&&finite(value)&&value!==revealed){revealed=value;svg.dataset.visibleUntil=String(value);for(const update of updates)update();}updateCursor(value);}
  const setCursor=(value:number|undefined)=>{moveCursor(value);if(finite(value)){readout.setAttribute('aria-live','off');inspect(value);}};
  const readout=document.createElement('p');readout.className='plot-readout';readout.setAttribute('aria-live',announce?'polite':'off');
  let samples: {x:number;y?:number}[]=data.samples,sample=0;
  const inspect=(target: number,targetY?: number)=>{
   const distance=(x: number,y?: number | null)=>c.equalAspect?Math.hypot(x-target,y!-targetY!):Math.abs(x-target);
   if(c.equalAspect)sample=samples.reduce((best,p,i)=>distance(p.x,p.y)<distance(samples[best].x,samples[best].y)?i:best,0);
   else{let low=0,high=samples.length;while(low<high){const middle=(low+high)>>>1;if(samples[middle].x<=target)low=middle+1;else high=middle;}sample=low===0?0:low===samples.length?low-1:target-samples[low-1].x<=samples[low].x-target?low-1:low;}
   readout.textContent=group.map(source=>{
    if(!c.equalAspect&&chronological.has(source)){
     const end=finite(revealed)?upperBound(source.x,revealed):source.x.length,next=upperBound(source.x,target),before=Math.min(end-1,next-1),after=next<end?Math.min(end-1,upperBound(source.x,source.x[next])-1):-1;
     let closest=before;
     if(after>=0&&(closest<0||distance(source.x[after])<distance(source.x[closest])))closest=after;
     let selected=closest>=0?{x:source.x[closest],y:source.y[closest],low:source.low?.[closest],high:source.high?.[closest]}:null;
     if(finite(revealed)&&end>0&&end<source.x.length&&source.x[end-1]<revealed&&(!selected||distance(revealed)<distance(selected.x)))selected=point(source,revealed);
     return !selected?`${source.label}: —`:`${source.label}: ${format(selected.x)}, ${format(selected.y)}`+(source.low?` [${format(selected.low)}, ${format(selected.high)}]`:'');
    }
    const series=visible(source);let closest=-1,best=Infinity;
    // Repeated abscissas use the post-event value.
    series.x.forEach((x,i)=>{if(!finite(x)||(c.equalAspect&&!finite(series.y[i])))return;const d=distance(x,series.y[i]);if(d<best||(!c.equalAspect&&d===best&&x===series.x[closest])){best=d;closest=i;}});
    return closest<0?`${series.label}: —`:`${series.label}: ${format(series.x[closest])}, ${format(series.y[closest])}`+(series.low?` [${format(series.low[closest])}, ${format(series.high?.[closest])}]`:'');
   }).join(' · ');
  };
  svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',caption.textContent+'. Use the arrow keys to examine samples. Home and End select the endpoints.');
  svg.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const i=event.key==='Home'?0:event.key==='End'?samples.length-1:Math.max(0,Math.min(samples.length-1,sample+(event.key==='ArrowRight'?1:-1))),before=samples,chosen=samples[i];moveCursor(chosen.x);inspect(chosen.x,chosen.y);sample=i;onSelect?.(chosen.x);
   // A shared-clock callback may silently update this same readout. Announce
   // the deliberate keyboard sample after that callback, never every RAF tick.
   readout.setAttribute('aria-live','polite');readout.textContent='';inspect(chosen.x,chosen.y);if(samples===before)sample=i;
  });
  const inspectPointer=(event: PointerEvent)=>{
   const bounds=svg.getBoundingClientRect(),scale=Math.min(bounds.width/width,bounds.height/height);
   if(scale<=0)return;
   const px=(event.clientX-bounds.left-(bounds.width-width*scale)/2)/scale;
   const py=(event.clientY-bounds.top-(bounds.height-height*scale)/2)/scale;
   if(px<left||px>right||py<top||py>bottom)return;
   const target=xmin+(px-left)/(right-left)*(xmax-xmin);
   const targetY=ymax-(py-top)/(bottom-top)*(ymax-ymin);inspect(target,targetY);if(event.type==='pointerdown'||event.buttons===1){moveCursor(samples[sample].x);inspect(samples[sample].x,samples[sample].y);onSelect?.(samples[sample].x);}
  };
  svg.addEventListener('pointermove',inspectPointer);svg.addEventListener('pointerdown',inspectPointer);
  inspect(finite(selected)?selected:samples[0].x,samples[0].y);
  if(finite(revealed))svg.dataset.visibleUntil=String(revealed);
  figure.append(caption,svg,readout);host.append(figure);
  const measured=plotWidth(figure);draw(Number.isFinite(measured)&&measured>0?Math.max(180,measured):800);
  const Observer=figure.ownerDocument?.defaultView?.ResizeObserver??globalThis.ResizeObserver;
  let observer:ResizeObserver|undefined;
  if(Observer){
   observer=new Observer(entries=>{
    const measured=entries.find(entry=>entry.target===figure)?.contentRect.width;
    if(finite(measured)&&measured>0&&Math.abs(Math.max(180,measured)-width)>.5)draw(Math.max(180,measured));
   });observer.observe(figure);
  }
  return {figure,setCursor,update(nextGroup,nextOptions){
   group=nextGroup;c=group[0];chronological=new Set(group.filter(series=>series.xLabel==='Time (s)'&&series.x.every((x,i)=>finite(x)&&(i===0||x>=series.x[i-1]))));({onSelect,announce=true,revealUntil}=nextOptions);revealed=revealUntil;selected=c.selectedX??revealed??selected;
   caption.textContent=c.yLabel+' against '+c.xLabel+(c.equalAspect?' · equal spatial scale':'');
   data=plotData(group);samples=data.samples;
   readout.setAttribute('aria-live',announce?'polite':'off');
   if(finite(revealed))svg.dataset.visibleUntil=String(revealed);else delete svg.dataset.visibleUntil;
   draw(width);if(samples.length)inspect(finite(selected)?selected:samples[0].x,samples[0].y);
  },dispose(){observer?.disconnect();}};
}
export function orbitCurves(result: {species: readonly Pick<SpeciesResult, 'impacts'>[]}): PlotCurve[]{
 const curves: PlotCurve[]=[];
 result.species.forEach((s,i)=>{
  const label=['A','B'][i];
  for(const [field,title,scale]of [['time','Collected transit time (µs)',1e6],['kineticEV','Impact energy (eV)',1]] as const){
   const values=s.impacts.map(p=>p[field]*scale).sort((a,b)=>a-b);
   if(values.length)curves.push({label,x:values,y:values.map((_,i)=>(i+1)/values.length),xLabel:title,yLabel:'Collected-ion cumulative fraction'});
  }
 });return curves;
}
