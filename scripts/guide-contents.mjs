/** @param {readonly (readonly [string,string])[]} chapters @param {string} [label] */
export function guideContents(chapters,label='Contents'){
 /** @param {string} value */
 const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return `<nav class="guide-contents" aria-label="${escape(label)}"><ol>${chapters.map(([id,label])=>`<li><a href="#${escape(id)}">${escape(label)}</a></li>`).join('')}</ol></nav>`;
}
