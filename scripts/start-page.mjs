import {tsImport} from 'tsx/esm/api';
import {guideContents} from './guide-contents.mjs';
import {guideDiagram} from './guide-diagrams.mjs';
const {playgroundSteps}=/** @type {typeof import('../src/playground-guide-steps.js')} */(await tsImport('../src/playground-guide-steps.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const [machine,current,composition,competition,heat,collection,compare]=playgroundSteps;
const questions=[[machine,current],[composition,competition],[heat],[collection]];
/** @param {typeof playgroundSteps[number]} step @param {'h2'|'h3'} heading */
function section(step,heading){
 return `<section aria-labelledby="${step.id}" class="walkthrough-step">
 <${heading} id="${step.id}">${escape(step.title)}</${heading}>${step.intro.split('\n\n').map(text=>`<p>${escape(text)}</p>`).join('')}
 <div class="try-actions" role="group" aria-label="Try ${escape(step.title)}">${step.actions.map(([action,label])=>`<a data-guide-action="${action}" target="_top" href="/?level=2&amp;try=${action}&amp;lesson=${encodeURIComponent(`/start.html#${step.id}`)}">${escape(label)} ↗</a>`).join('')}</div>
 ${step.do.map(text=>`<p>${escape(text)}</p>`).join('')}
 ${guideDiagram(step.diagram)}
 <details data-learning-explanation><summary>Explanation</summary>${step.notice.split('\n\n').map(text=>`<p>${escape(text)}</p>`).join('')}<p>${escape(step.note)}</p><p><a href="${escape(step.reading[0])}">${escape(step.reading[1])} →</a></p></details>
 </section>`;
}
export function startPage(){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tutorial 1 · Using the simulator · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough">
 <header><a href="/?level=2" target="_top" data-guide-simulator>Simulator ↗</a><a href="/guide.html">Physics & equations →</a><a href="/learn.html">Docs & tutorials</a></header>
 <main><h1>Tutorial 1 · Using the simulator</h1><p id="reader-status" role="status" aria-live="polite"></p>
 ${guideContents(questions.map(([step])=>[step.id,step.title]))}
 ${questions.map(steps=>`<div data-core-question="${steps[0].id}">${steps.map((step,i)=>section(step,i?'h3':'h2')).join('')}</div>`).join('')}
 <aside aria-labelledby="compare">${section(compare,'h3')}</aside>
 </main><footer><a href="/guide.html">Physics & equations →</a> · <a href="/learn.html">Docs & tutorials</a></footer></body></html>`;
}
