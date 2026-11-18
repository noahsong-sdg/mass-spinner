import {tsImport} from 'tsx/esm/api';
import {guideDiagram} from './guide-diagrams.mjs';
const {playgroundSteps}=/** @type {typeof import('../src/playground-guide-steps.js')} */(await tsImport('../src/playground-guide-steps.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function startPage(){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Start here · Mass Spinner</title><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough">
 <header><a href="/?level=2" data-guide-simulator>Simulator ↗</a><a href="/guide.html">Physics & equations →</a></header>
 <main><h1>Make the gas turn.<br>See what separates.</h1><p class="walkthrough-intro">Keep this guide open beside the simulator. Start with one change—electrical current—then follow its effect on rotation and the mixture.</p>
 <p id="reader-status" role="status" aria-live="polite"></p>
 <nav aria-label="Walkthrough chapters"><label for="guide-chapter">Your next experiment</label><select id="guide-chapter">${playgroundSteps.map((step,i)=>`<option value="${step.id}">${i+1}. ${escape(step.title)}</option>`).join('')}</select></nav>
 ${playgroundSteps.map((step,i)=>`<section aria-labelledby="${step.id}" class="walkthrough-step"><span class="step-number">${i+1} / ${playgroundSteps.length}</span><h2 id="${step.id}">${escape(step.title)}</h2><p>${escape(step.intro)}</p>${i===0?guideDiagram('drive'):''}<ol>${step.do.map(text=>`<li>${escape(text)}</li>`).join('')}</ol><div class="try-actions" role="group" aria-label="Try ${escape(step.title)}">${step.actions.map(([action,label])=>`<a data-guide-action="${action}" href="/?level=2&try=${action}">${escape(label)} ↗</a>`).join('')}</div><div class="walkthrough-observation"><strong>What to look for</strong><p>${escape(step.notice)}</p></div><details><summary>Assumptions & details</summary><p>${escape(step.note)}</p></details>${i<playgroundSteps.length-1?`<a class="walkthrough-next" href="#${playgroundSteps[i+1].id}">Next: ${escape(playgroundSteps[i+1].title)} →</a>`:'<a href="/guide.html">Understand the equations behind these experiments →</a>'}</section>`).join('')}
 </main></body></html>`;
}
