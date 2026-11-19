/** @param {readonly (readonly [string,string])[]} chapters */
export function guideContents(chapters){
 /** @param {string} value */
 const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return `<nav class="guide-contents" aria-label="Contents"><ol>${chapters.map(([id,label])=>`<li><a href="#${escape(id)}">${escape(label)}</a></li>`).join('')}</ol></nav>`;
}
