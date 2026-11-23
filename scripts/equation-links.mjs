import katex from 'katex';
import {tsImport} from 'tsx/esm/api';
const {equationGroups,equationPlots}=/** @type {typeof import('../src/equation-plots.js')} */(await tsImport('../src/equation-plots.ts',import.meta.url));
/** Explicit source markers keep equations connected to their own plots. */
/** @param {string} text @param {string} id */
export function equationMarkup(text,id){
 if(!Object.hasOwn(equationGroups,id))throw new Error(`Equation needs a known plot marker: ${id}`);
 const group=equationGroups[/** @type {keyof typeof equationGroups} */(id)];
 return `<div class="equation" role="group" aria-label="Equation with interactive plot"><button type="button" class="equation-trigger" data-equation-plot="${id}" aria-label="Plot: ${equationPlots[group[0]].title}">${katex.renderToString(text,{displayMode:true,throwOnError:true,trust:false})}<span class="equation-hint">Plot ↗</span></button></div>`;
}
