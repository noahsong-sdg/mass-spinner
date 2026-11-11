import entries from '../web-assets/reference-atlas/manifest.json';

export function setupReferenceAtlas(){
 const host=document.getElementById('reference-atlas');
 for(const entry of entries){
  const article=document.createElement('article'),image=document.createElement('img'),body=document.createElement('div');
  image.src=entry.image;image.alt=entry.alt;image.width=1600;image.height=1000;image.loading='lazy';
  const section=document.createElement('span');section.className='overline';section.textContent='SECTION '+entry.section;
  const title=document.createElement('h3');title.textContent=entry.title;
  const mechanism=document.createElement('p');mechanism.textContent=entry.mechanism;body.append(section,title,mechanism);
  for(const [label,items] of [['Advantages',entry.pros],['Disadvantages',entry.cons]]){
   const heading=document.createElement('h4'),list=document.createElement('ul');heading.textContent=label;
   for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}body.append(heading,list);
  }
  const note=document.createElement('p');note.className='fidelity-note';note.textContent=entry.limitations;body.append(note);
  const sources=document.createElement('p');sources.className='atlas-sources';
  for(const source of entry.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title+' ↗';sources.append(a);}
  body.append(sources);article.append(image,body);host.append(article);
 }
}
