import katex from 'katex';
import {tsImport} from 'tsx/esm/api';
const {equationGroups,equationPlots}=/** @type {typeof import('../src/equation-plots.js')} */(await tsImport('../src/equation-plots.ts',import.meta.url));
const {equationDerivations}=/** @type {typeof import('../src/equation-derivations.js')} */(await tsImport('../src/equation-derivations.ts',import.meta.url));
/** @param {string} text */
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** @param {string} text */
const renderMath=text=>katex.renderToString(text,{displayMode:true,throwOnError:true,trust:false});
/** Build-time math keeps the reader free of a client-side math renderer. */
/** @param {string} html */
export function withEquationDerivations(html){
 return html.replace(/<button\b[^>]*data-equation-plot="([^"]+)"[^>]*>[\s\S]*?<\/button>/g,(button,id)=>{
  if(!Object.hasOwn(equationDerivations,id))throw new Error(`Equation needs a known derivation: ${id}`);
  const d=equationDerivations[/** @type {keyof typeof equationDerivations} */(id)];
  return `${button}<template data-equation-derivation="${id}"><h3>${escape(d.title)}</h3><p>${escape(d.why)}</p><p>${escape(d.symbols)}</p><p class="equation-assumptions">${escape(d.assumptions)}</p><ol>${d.steps.map(s=>`<li><p>${escape(s.text)}</p><div class="equation-step-math" tabindex="0" role="region" aria-label="Calculation step">${renderMath(s.math)}</div></li>`).join('')}</ol></template>`;
 });
}
/** Explicit source markers keep equations connected to their own plots. */
/** @param {string} text @param {string} id */
export function equationMarkup(text,id){
 if(!Object.hasOwn(equationGroups,id))throw new Error(`Equation needs a known plot marker: ${id}`);
 const group=equationGroups[/** @type {keyof typeof equationGroups} */(id)];
 return withEquationDerivations(`<div class="equation" role="group" aria-label="Equation with plot and derivation"><button type="button" class="equation-trigger" data-equation-plot="${id}" title="Plot: ${equationPlots[group[0]].title}. Derivation included.">${renderMath(text)}<span class="equation-hint">Plot + derivation ↗</span></button></div>`);
}
