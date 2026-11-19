import type {ReactorMotionState} from './reactor-motion.js';

const fmt=(n:number)=>n===0?'0':Math.abs(n)>=1e5||Math.abs(n)<.001?n.toExponential(2):Number(n.toPrecision(3)).toString();
const NS='http://www.w3.org/2000/svg';

/** A depth microscope, deliberately separate from the true-scale 3D hardware. */
export function createReactorHeatInset(parent:HTMLElement){
 const doc=parent.ownerDocument,element=doc.createElement('figure'),caption=doc.createElement('figcaption'),readout=doc.createElement('p');
 const svg=doc.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 288 82');svg.setAttribute('role','img');
 element.className='reactor-heat';element.append(caption,svg,readout);parent.append(element);
 let arrows:{path:SVGPathElement;x:number;sign:number}[]=[],direction='none',coolantW:number|null=null;
 function node<K extends keyof SVGElementTagNameMap>(tag:K,attributes:Record<string,string|number>,text?:string){
  const n=doc.createElementNS(NS,tag);for(const [key,value]of Object.entries(attributes))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;svg.append(n);return n;
 }
 function arrow(x:number,flux:number){
  if(flux===0)return;
  const opacity=.15+.85*Math.abs(flux)/(Math.abs(flux)+1e4),path=node('path',{fill:'none',stroke:flux>0?'#e69a59':'#94c9e7','stroke-width':2,opacity});
  arrows.push({path,x,sign:Math.sign(flux)});
 }
 function tick(phase:number){
  for(const a of arrows){const x=a.x+a.sign*((phase%1)-.5)*5;a.path.setAttribute('d',`M ${x-a.sign*6} 38 L ${x} 42 L ${x-a.sign*6} 46`);}
 }
 function update(state:ReactorMotionState){
  svg.replaceChildren();arrows=[];coolantW=null;direction='none';
  if(state.kind==='power-reference'||!state.heatGeometry){
   const reference=state.kind==='power-reference',power=state.kind==='beam'?state.depositedPowerW:0,area=state.kind==='beam'?state.areaM2:1;
   caption.textContent=reference?'Heat · reference direction':'Heat · conditional stopping balance';
   svg.setAttribute('aria-label',caption.textContent);
   node('text',{x:12,y:20},reference?'Plasma':'Target');node('text',{x:178,y:20},reference?'Blanket':'Stopping substrate');
   node('line',{x1:18,x2:270,y1:42,y2:42,stroke:'#516356','stroke-width':2});
   if(reference||power>0)for(const x of [65,130,195,260])arrow(x,reference?1e5:power/area);
   readout.textContent=reference?'Direction only; no heat transport is calculated.':`If the transmitted beam stops here, the heat input is ${fmt(power)} W. This view gives no depth temperature.`;
   direction=reference?'reference':power>0?'stopping budget':'none';tick(0);return {direction,coolantW};
  }
  const {faceDepthM,filmThicknessM,backingThicknessM}=state.heatGeometry,flux=state.heatFacesWM2;
  caption.textContent='Heat flow · enlarged depth view';svg.setAttribute('aria-label','Film and backing heat flux at physical face depths. Each material has a separate enlarged view.');
  for(const [title,start,width,x]of [['Film',0,filmThicknessM,12],['Backing',filmThicknessM,backingThicknessM,158]] as const){
   node('text',{x,y:17},`${title} · ${fmt(width*1e6)} µm`);
   node('rect',{x,y:30,width:114,height:24,fill:'#24382c',stroke:'#516356'});
   const faces=faceDepthM.map((depth,i)=>({depth,flux:flux[i]})).filter(f=>f.depth>=start&&f.depth<=start+width);
   // Preserve every physical face; limit only chevrons, retaining boundaries and strongest fluxes.
   const glyphs=new Set([0,faces.length-1].filter(i=>faces[i].flux!==0));
   for(const {i}of faces.map((f,i)=>({i,magnitude:Math.abs(f.flux)})).sort((a,b)=>b.magnitude-a.magnitude)){
    if(glyphs.size>=6)break;
    if(faces[i].flux!==0&&[...glyphs].every(j=>114*Math.abs(faces[i].depth-faces[j].depth)/width>=18))glyphs.add(i);
   }
   for(const [i,f]of faces.entries()){
    const px=x+114*(f.depth-start)/width;
    const gap=114/width*Math.min(i>0?f.depth-faces[i-1].depth:Infinity,i+1<faces.length?faces[i+1].depth-f.depth:Infinity);
    const face=node('line',{x1:px,x2:px,y1:31,y2:53,stroke:f.flux<0?'#94c9e7':'#e69a59',opacity:Math.abs(f.flux)/(Math.abs(f.flux)+1e4),'stroke-width':Math.min(3,.8*gap)});
    const marker=doc.createElementNS(NS,'title');marker.textContent=`${fmt(f.depth*1e6)} µm: ${fmt(f.flux)} W/m²`;face.append(marker);
    if(glyphs.has(i))arrow(px,f.flux);
   }
  }
  const back=flux.at(-1)!,internal=flux.slice(1,-1).some(q=>q!==0);coolantW=back*state.areaM2;
  direction=back>0?'toward coolant':back<0?'toward target':internal?'internal only':'none';
  const transfer=back===0?'Coolant: 0 W':`${back>0?'To':'From'} coolant: ${fmt(Math.abs(coolantW))} W`;
  node('text',{x:12,y:75},'Arrows: direction · shade: |flux|');
  readout.textContent=`${transfer}${back===0&&internal?' · internal redistribution':''} · max |q| ${fmt(Math.max(...flux.map(Math.abs)))} W/m²`;
  tick(0);return {direction,coolantW};
 }
 return {element,update,tick,get running(){return !element.hidden&&arrows.length>0;}};
}
