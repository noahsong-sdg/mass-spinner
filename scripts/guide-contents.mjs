/** @param {readonly (readonly [string,string])[]} chapters @param {string} [label] */
export function guideContents(chapters,label='Contents'){
 /** @param {string} value */
 const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return `<nav class="guide-contents" aria-label="${escape(label)}"><p class="guide-contents-title" aria-hidden="true">${escape(label)}</p><ol>${chapters.map(([id,label],index)=>`<li><a href="#${escape(id)}"><span aria-hidden="true">${String(index+1).padStart(2,'0')}</span>${escape(label)}</a></li>`).join('')}</ol></nav>`;
}
