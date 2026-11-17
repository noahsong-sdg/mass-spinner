export type ComponentContext = {level?: string; model?: string; closure?: string};
export type ComponentDestination = {panel: 'target' | 'plots' | 'controls'; selector: string | null; settings?: boolean};
export type ComponentActions = {parameters: (event: MouseEvent) => void; results: (event: MouseEvent) => void};
/** Shortcuts focus original controls; selecting hardware never edits a physical input. */
export function componentDestination(id: string,{level,model,closure}: ComponentContext={}): ComponentDestination{
 if(level==='2'){
  if(id==='target'||id==='substrate')return {panel:'target',selector:id==='target'?'#coupled-filmThicknessM':'#coupled-backHeatTransferWM2K',settings:true};
  if(id==='neutrons')return {panel:'plots',selector:'#neutron-transport-thickness'};
  const parameters: Record<string, string>={accelerator:'beamEnergyKeV',beam:'beamAreaM2',source:'beamCurrentA','rf-source':'beamCurrentA',current:'beamCurrentA'};
  const parameter=parameters[id];
  return {panel:'controls',selector:parameter?`#fusion-${parameter}`:null};
 }
 if(model==='centrifuge')return {panel:'controls',selector:id==='collectors'?'#radial-cut':id==='coils'?(closure==='corotating'?null:'#gaussian-field'):id==='electrodes'?'#rotation':id==='source'?'#axis-fraction':null};
 if(model==='icr'&&id==='electrodes')return {panel:'controls',selector:'#rf-amplitude'};
 if(['vessel','insulators','seals','fittings','supports'].includes(id))return {panel:'controls',selector:null};
 if(['gyro','curved'].includes(model??'')&&id==='electrodes')return {panel:'controls',selector:null};
 if(id==='source')return {panel:'controls',selector:model==='gyro'?'#parameter-temperatureEV':model==='curved'?'#parameter-beamEV':model==='doublewell'?'#parameter-canonicalMomentum':model==='doublewell-dynamics'?'#dw-ionTemperatureEV':'#energy'};
 if(id==='collectors')return {panel:'plots',selector:null};
 const prefix=model==='doublewell-dynamics'?'dw-':model==='rotating'||model==='icr'?'':'parameter-';
 const magnetic=['coils','magnet','magnets','field'].includes(id);
 const selector=prefix?`#${prefix}${magnetic?'magneticT':'voltage'}`:`#${magnetic?'field':'voltage'}`;
 return {panel:'controls',selector};
}
export function appendComponentActions(readout: Element | null | undefined,{parameters,results}: ComponentActions){
 if(!readout)return;const doc=readout.ownerDocument,bar=doc.createElement('div');bar.className='component-actions';
 readout.querySelector('.component-actions')?.remove();
 for(const [label,action]of [['Parameters',parameters],['Results',results]] satisfies [string, (event: MouseEvent) => void][]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);bar.append(button);}
 readout.insertBefore(bar,readout.children[1]??null);
}
