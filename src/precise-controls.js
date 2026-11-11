/** Exact entry augments an existing range/readout; its input event remains the model API.
 * Log scales and integer domains must be declared, never inferred from captions. */
export function setupPreciseControls(root,{describeRange=()=>({})}={}){
 const controls=[];
 for(const range of root.querySelectorAll('.control input[type=range]')){
  if(range.dataset.preciseControl||range.dataset.precision==='off')continue;
  const box=range.closest('.control'),output=box.querySelector('output');if(!output)continue;
  const doc=range.ownerDocument,descriptor=describeRange(range)??{},scale=descriptor.scale??range.dataset.rangeScale??'linear';
  if(!['linear','log10'].includes(scale))throw new Error(`Unsupported range scale: ${scale}`);
  const unit=descriptor.unit??range.dataset.unit??'',integer=descriptor.integer??range.dataset.integer==='true';
  const name=descriptor.label??box.querySelector('label span')?.textContent??range.getAttribute('aria-label')??range.id;
  const originalStep=range.step||'1',initial=range.value,toPhysical=value=>scale==='log10'?10**value:value;
  const min=Number(range.min||0),max=Number(range.max||100),physicalMin=toPhysical(min),physicalMax=toPhysical(max);
  const editor=doc.createElement('div'),input=doc.createElement('input'),error=doc.createElement('span');
  editor.className='precise-editor';editor.hidden=true;input.type='number';input.step='any';input.min=String(physicalMin);input.max=String(physicalMax);
  input.setAttribute('aria-label',`${name}${unit?` (${unit})`:''}`);error.className='precise-error';error.setAttribute('role','alert');
  const errorId=`${range.id}-precision-error`;error.id=errorId;input.setAttribute('aria-describedby',errorId);
  const button=(text,label,action)=>{const node=doc.createElement('button');node.type='button';node.textContent=text;node.setAttribute('aria-label',label);node.addEventListener('click',action);return node;};
  const close=()=>{editor.hidden=true;output.removeAttribute('aria-expanded');error.textContent='';input.removeAttribute('aria-invalid');output.focus();};
  const emit=()=>range.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
  const setValue=value=>{
   // Native range inputs quantize against step. 'any' deliberately preserves an exact
   // off-grid value until an explicit slider gesture chooses a stepped value again.
   range.step='any';range.value=String(value);emit();
  };
  const commit=()=>{
   const value=input.valueAsNumber;
   if(!Number.isFinite(value)||value<physicalMin||value>physicalMax||(scale==='log10'&&value<=0)||(integer&&!Number.isInteger(value))){
    error.textContent=`Enter ${integer?'an integer':'a number'} from ${physicalMin} to ${physicalMax}${unit?' '+unit:''}.`;input.setAttribute('aria-invalid','true');input.focus();return;
   }
   setValue(scale==='log10'?Math.log10(value):value);close();
  };
  const reset=()=>{range.step=originalStep;range.value=initial;emit();if(!editor.hidden){input.value=String(toPhysical(Number(range.value)));error.textContent='';input.removeAttribute('aria-invalid');}};
  editor.append(input,button('Apply',`Apply ${name}`,commit),button('Reset',`Reset ${name}`,reset),button('×',`Cancel ${name}`,close),error);box.append(editor);
  const open=()=>{if(range.disabled)return;editor.hidden=false;input.value=String(toPhysical(Number(range.value)));output.setAttribute('aria-expanded','true');input.focus();input.select();};
  output.tabIndex=0;output.setAttribute('role','button');output.setAttribute('aria-label',`Set ${name} precisely`);output.title='Enter exact value';
  output.addEventListener('click',event=>{event.preventDefault();open();});output.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
  const restoreStep=()=>{const before=range.value;range.step=originalStep;if(range.value!==before)emit();};
  range.addEventListener('pointerdown',restoreStep);
  range.addEventListener('keydown',event=>{
   const direction={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[event.key];
   if(direction===undefined&&!['Home','End'].includes(event.key))return;
   const step=Number(originalStep);if(!Number.isFinite(step)||step<=0)return;event.preventDefault();
   const value=event.key==='Home'?min:event.key==='End'?max:min+(Math.round((Number(range.value)-min)/step)+direction)*step;
   range.step=originalStep;range.value=String(Math.max(min,Math.min(max,value)));emit();
  });
  range.dataset.preciseControl='true';controls.push({range,reset});
 }
 return {reset(scope=root){for(const control of controls)if(scope.contains(control.range))control.reset();}};
}
