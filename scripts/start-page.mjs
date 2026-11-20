import {tsImport} from 'tsx/esm/api';
import {guideContents} from './guide-contents.mjs';
import {guideDiagram} from './guide-diagrams.mjs';
const {playgroundSteps}=/** @type {typeof import('../src/playground-guide-steps.js')} */(await tsImport('../src/playground-guide-steps.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function startPage(){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutorial 1 · Using the simulator · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough">
 <header><a href="/?level=2" data-guide-simulator>Simulator ↗</a><a href="/guide.html">Physics & equations →</a><a href="/learn.html">Docs & tutorials</a></header>
 <main><h1>Tutorial 1 · Using the simulator</h1><p id="reader-status" role="status" aria-live="polite"></p>
 ${guideContents(playgroundSteps.map(step=>[step.id,step.title]))}
 ${playgroundSteps.map(step=>`<section aria-labelledby="${step.id}" class="walkthrough-step">
 <h2 id="${step.id}">${escape(step.title)}</h2>${step.intro.split('\n\n').map(text=>`<p>${escape(text)}</p>`).join('')}
 <div class="try-actions" role="group" aria-label="Try ${escape(step.title)}">${step.actions.map(([action,label])=>`<a data-guide-action="${action}" href="/?level=2&try=${action}">${escape(label)} ↗</a>`).join('')}</div>
 ${step.do.map(text=>`<p>${escape(text)}</p>`).join('')}
 ${guideDiagram(step.diagram)}
 <details data-learning-explanation><summary>Explanation</summary>${step.notice.split('\n\n').map(text=>`<p>${escape(text)}</p>`).join('')}<p>${escape(step.note)}</p></details>
 </section>`).join('')}
 </main><footer><a href="/guide.html">Physics & equations →</a> · <a href="/learn.html">Docs & tutorials</a></footer></body></html>`;
}
