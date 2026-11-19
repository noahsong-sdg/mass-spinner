import {guideContents} from './guide-contents.mjs';
import {tsImport} from 'tsx/esm/api';
const {learningPath}=/** @type {typeof import('../src/learning-path.js')} */(await tsImport('../src/learning-path.ts',import.meta.url));
const {numberedTutorials}=/** @type {typeof import('../src/guide-topics.js')} */(await tsImport('../src/guide-topics.ts',import.meta.url));
/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
/** @param {string} title @param {string} body @param {readonly (readonly [string,string])[]} chapters */
function page(title,body,chapters){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Mass Spinner</title><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough learning-path"><header><a href="/?level=2" data-guide-simulator>Simulator ↗</a><a href="/learn.html">Docs & tutorials</a></header><main><h1>${escape(title)}</h1><p id="reader-status" role="status" aria-live="polite"></p>${guideContents(chapters)}${body}</main><footer><a href="/guide.html">Physics & equations</a> · <a href="/guide.html#views">Controls & plot reference</a></footer></body></html>`;
}
/** @param {import('../src/learning-path.js').LearningModule} module */
function modulePage(module){
 /** @type {[string,string][]} */
 const chapters=[...module.experiments.map(e=>/** @type {[string,string]} */([e.id,e.title]))];
 if(module.id==='collection')chapters.splice(2,0,['fuel','Why fusion needs separate inventories']);
 const terms=module.equationTerms?`<details><summary>Connect equation terms to the simulator</summary><p>In the uniform-temperature rigid-equilibrium reference, ln α = Δm Ω²R² / (2 kB T). A current change is a different, coupled question.</p><dl>${module.equationTerms.map(term=>`<dt><a data-guide-action="${term.action}" href="/?level=2&try=${term.action}">${escape(term.symbol)} ↗</a></dt><dd>${escape(term.meaning)}</dd>`).join('')}</dl><a href="/guide.html#bias">Read the rendered equation and its derivation →</a></details>`:'';
 const equation=module.equation?`<a href="/guide.html#${escape(module.equation)}">Connect this to the equations →</a>`:'Read Target → Model info for the beam and material assumptions; its Equations & evidence link provides the technical record.';
 const intro=`<p>${escape(module.scope)}</p><p>${equation}</p>${terms}`;
 const experiments=module.experiments.map(e=>`<section class="walkthrough-step" aria-labelledby="${escape(e.id)}"><h2 id="${escape(e.id)}">${escape(e.title)}</h2><p>${escape(e.baseline)}</p><div class="try-actions" role="group" aria-label="Try ${escape(e.title)}">${e.actions.map(([key,label])=>`<a data-guide-action="${escape(key)}" href="/?level=2&try=${escape(key)}">${escape(label)} ↗</a>`).join('')}</div><ol>${e.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol><details data-learning-explanation><summary>Explanation</summary><p>${escape(e.observe)}</p><p>${escape(e.explain)}</p><p>${escape(e.boundary)}</p></details></section>`).join('');
 const fuel=module.id==='collection'?'<section id="fuel"><h2>Why fusion needs separate inventories</h2><p>Lithium enrichment changes the lithium isotope mix. A blanket can use lithium to breed tritium from neutron reactions. D–T exhaust processing recovers unburned fuel. These are different processes, not successive states of this closed centrifuge.</p><p>In the separate steady fuel-loop reference, lower single-pass tritium burn fraction increases the unburned exhaust at fixed burn demand. Longer processing delay ties up more tritium. Neither input predicts the burn fraction of a fusion plasma.</p><div class="try-actions"><a data-guide-action="inventoryExperiment" href="/?level=2&try=inventoryExperiment">Open fuel inventory experiment ↗</a></div><p>Try changing burn fraction and delay separately under Fuel inventory in Controls. Explain the holdup change before making a breeding or plant-throughput claim.</p></section>':'';
 return page(module.title,intro+experiments+fuel,chapters);
}
/** Build-only content: no independent solver, remote content or learner tracking. @returns {Record<string,string>} */
export function learningPages(){
 const tutorials=`<section><h2 id="tutorials">Tutorials</h2><ul><li><a href="/start.html">Tutorial 1 · Using the simulator</a></li><li><a href="/guide.html">Tutorial 2 · Rotation and separation</a></li>${numberedTutorials.map(tutorial=>`<li><a href="/tutorial-${tutorial.number}.html">Tutorial ${Number(tutorial.number)} · ${escape(tutorial.title)}</a></li>`).join('')}</ul></section>`;
 const documentation='<section><h2 id="documentation">Documentation</h2><ul><li><a href="/guide.html#views">Controls & plot reference</a></li><li><a href="/how-it-works.html">Simulation methods & assumptions</a></li><li><a href="/equilibrium.html">Equilibrium composition & collection</a></li><li><a href="/qualification.html">Experimental evidence & accuracy limits</a></li></ul></section>';
 const investigations=`<section><h2 id="experiments">Experiments</h2><ul>${learningPath.map(module=>`<li><a href="/learn-${module.id}.html">${escape(module.title)}</a></li>`).join('')}</ul></section>`;
 return {'learn.html':page('Docs & tutorials',tutorials+documentation+investigations,[['tutorials','Tutorials'],['documentation','Documentation'],['experiments','Experiments']]),...Object.fromEntries(learningPath.map(module=>[`learn-${module.id}.html`,modulePage(module)]))};
}
