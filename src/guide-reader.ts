/** The standalone reader links work without this enhancement; embeds use native app actions. */
export function setupGuideReader(win=window){
 const doc=win.document,embedded=win.parent!==win;doc.body.classList.toggle('embedded',embedded);
 const chapters=doc.getElementById('guide-chapter') as HTMLSelectElement;
 function sync(){if([...chapters.options].some(option=>`#${option.value}`===win.location.hash))chapters.value=win.location.hash.slice(1);}
 chapters.addEventListener('change',()=>{win.location.hash=chapters.value;});win.addEventListener('hashchange',sync);sync();
 doc.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-guide-action],a[data-guide-view]');if(!embedded||!link)return;
  event.preventDefault();
  win.parent.postMessage(link.dataset.guideAction?{type:'mass-spinner:guide-action',action:link.dataset.guideAction}:{type:'mass-spinner:guide-view',view:'experiments'},win.location.origin);
 });
 doc.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();win.parent.postMessage({type:'mass-spinner:guide-close'},win.location.origin);}});
}
if(typeof window!=='undefined')setupGuideReader();
