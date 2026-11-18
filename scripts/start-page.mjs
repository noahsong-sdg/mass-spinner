import {tsImport} from 'tsx/esm/api';
import {guideDiagram} from './guide-diagrams.mjs';
const {playgroundSteps}=/** @type {typeof import('../src/playground-guide-steps.js')} */(await tsImport('../src/playground-guide-steps.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function startPage(){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Start here · Mass Spinner</title><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough">
 <header><a href="/?level=2" data-guide-simulator>Simulator ↗</a><a href="/guide.html">Physics & equations →</a><a href="/learn.html">More investigations →</a></header>
 <main><h1>Make the gas turn.<br>Keep a useful sample.</h1><p class="walkthrough-intro">Can an inner sample become richer in lithium-6 while retaining enough of it? Keep this page beside the simulator. Follow current → rotation → mixture → collection.</p>
 <p id="reader-status" role="status" aria-live="polite"></p>
 <div data-learning-controls hidden><label for="learning-mode">Guidance</label><select id="learning-mode"><option value="show" selected>Show me</option><option value="investigate">Investigate</option><option value="explore">Explore</option></select><p id="learning-mode-description" role="status"></p></div>
 <p class="learning-notes" id="learning-notes">Predictions are optional. Notes stay in this page and disappear on reload; copy anything you want to keep.</p>
 <nav aria-label="Walkthrough chapters"><label for="guide-chapter">Your next experiment</label><select id="guide-chapter">${playgroundSteps.map((step,i)=>`<option value="${step.id}">${i+1}. ${escape(step.title)}</option>`).join('')}</select></nav>
 ${playgroundSteps.map((step,i)=>`<section aria-labelledby="${step.id}" class="walkthrough-step">
 <span class="step-number">${i+1} / ${playgroundSteps.length}</span><h2 id="${step.id}">${escape(step.title)}</h2><p>${escape(step.intro)}</p>
 <div class="learning-prediction"><label for="prediction-${step.id}">Predict: ${escape(step.predict)}</label><textarea id="prediction-${step.id}" rows="2" aria-describedby="learning-notes" placeholder="Your prediction and why (optional)"></textarea></div>
 <details data-learning-hint open><summary>How to try it</summary><ol>${step.do.map(text=>`<li>${escape(text)}</li>`).join('')}</ol></details>
 <div class="try-actions" role="group" aria-label="Try ${escape(step.title)}">${step.actions.map(([action,label])=>`<a data-guide-action="${action}" href="/?level=2&try=${action}">${escape(label)} ↗</a>`).join('')}</div>
 <p class="learning-measure"><strong>Observe. </strong>${escape(step.observe)}</p>
 <details data-learning-explanation><summary>Compare with the explanation</summary><div class="walkthrough-observation"><p>${escape(step.notice)}</p></div>${i===0?guideDiagram('drive'):''}<p class="learning-boundary">${escape(step.note)}</p></details>
 <div class="learning-transfer"><strong>Try a new case</strong><p>${escape(step.transfer)}</p><details><summary>Check the reasoning</summary><p>${escape(step.transferAnswer)}</p></details></div>
 ${i<playgroundSteps.length-1?`<a class="walkthrough-next" href="#${playgroundSteps[i+1].id}">Next: ${escape(playgroundSteps[i+1].title)} →</a>`:'<a href="/learn.html">Choose your next investigation →</a>'}
 </section>`).join('')}
 </main><footer><a href="/guide.html">Physics & equations →</a> · <a href="/learn.html">More investigations →</a></footer></body></html>`;
}
