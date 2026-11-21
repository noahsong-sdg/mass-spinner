import {guideContents} from './guide-contents.mjs';
import {tsImport} from 'tsx/esm/api';
const {numberedTutorials}=/** @type {typeof import('../src/guide-topics.js')} */(await tsImport('../src/guide-topics.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
/** @param {string} title @param {string} body @param {readonly (readonly [string,string])[]} chapters */
function page(title,body,chapters){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough"><header><a href="/?level=2" target="_top" data-guide-simulator>Simulator ↗</a><a href="/learn.html">Docs & tutorials</a></header><main><h1>${escape(title)}</h1><p id="reader-status" role="status" aria-live="polite"></p>${guideContents(chapters)}${body}</main><footer><a href="/guide.html">Physics & equations</a> · <a href="/guide.html#views">Controls & plot reference</a></footer></body></html>`;
}
/** Build the documentation index. @returns {string} */
export function documentationPage(){
 const tutorials=`<section><h2 id="tutorials">Tutorials</h2><ul><li><a href="/start.html">Tutorial 1 · Using the simulator</a></li><li><a href="/guide.html">Tutorial 2 · Rotation and separation</a></li>${numberedTutorials.map(tutorial=>`<li><a href="/tutorial-${tutorial.number}.html">Tutorial ${Number(tutorial.number)} · ${escape(tutorial.title)}</a></li>`).join('')}</ul></section>`;
 const documentation='<section><h2 id="documentation">Documentation</h2><ul><li><a href="/guide.html#views">Controls & plot reference</a></li><li><a href="/how-it-works.html">Simulation methods & assumptions</a></li><li><a href="/equilibrium.html">Equilibrium composition & collection</a></li><li><a href="/qualification.html">Experimental evidence & accuracy limits</a></li></ul></section>';
 return page('Docs & tutorials',tutorials+documentation,[['tutorials','Tutorials'],['documentation','Documentation']]);
}
