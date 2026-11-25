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
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="darkreader-lock"><title>Tutorial 1 · Fusion and its fuel supply · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide.css"><script type="module" src="/guide-reader.js"></script></head><body class="walkthrough">
 <header><a href="/?level=2" target="_top" data-guide-simulator>Simulator ↗</a><a href="/guide.html">Physics & equations →</a><a href="/learn.html">Docs & tutorials</a></header>
 <main><h1>Tutorial 1 · Fusion and its fuel supply</h1><p id="reader-status" role="status" aria-live="polite"></p>
 <p>A fusion power plant needs two things: energy from nuclear reactions and a fuel supply that can keep those reactions going. Marathon develops equipment for this fuel supply and a separate compact neutron source. Start with the plant, then find where each machine fits.</p>
 ${guideContents([['fusion','What does fusion do?'],['plant','What does a power plant need?'],['lithium','Why does lithium enter the picture?'],['marathon','Where does Marathon fit?'],['exercises','Centrifuge exercises']])}
 <section aria-labelledby="fusion">
 <h2 id="fusion">What does fusion do?</h2>
 <p>The nucleus is the central part of an atom. It contains protons, which have positive electric charge, and usually neutrons, which have no electric charge. Fusion joins light nuclei and can release energy.</p>
 <p>Here, the fuels are deuterium (D) and tritium (T). They are hydrogen isotopes: both have one proton, but D has one neutron and T has two. Their fusion reaction produces a helium nucleus and a fast neutron:</p>
 <figure class="fusion-overview" aria-label="Deuterium–tritium fusion reaction">
 <div class="fusion-reaction"><div class="fusion-pair"><span>Deuterium<br><small>1 proton + 1 neutron</small></span><span>+</span><span>Tritium<br><small>1 proton + 2 neutrons</small></span></div><span class="fusion-arrow" aria-label="produces">→</span><div class="fusion-pair"><span>Helium nucleus<br><small>2 protons + 2 neutrons</small></span><span>+</span><span>Neutron</span></div></div>
 <figcaption>The products carry the released energy as motion. When they slow down in material, they transfer energy as heat.</figcaption>
 </figure>
 <p>The products have less total mass than the starting nuclei. The mass difference appears as released energy.</p>
 <p>The nuclei repel each other because both have positive charge. They must approach very closely before fusion can occur. A power-reactor design heats and confines the fuel to obtain enough reactions. A beam source instead accelerates ions into a target. An ion is an atom with electric charge.</p>
 <p><a href="https://www.energy.gov/science/doe-explainsdeuterium-tritium-fusion-fuel">DOE: deuterium and tritium</a></p>
 </section>
 <section aria-labelledby="plant">
 <h2 id="plant">What does a power plant need?</h2>
 <p>Making fusion reactions is only one part of a power plant. The equipment must supply fuel, collect energy, and remove waste heat.</p>
 <dl class="fusion-needs">
 <div><dt>Chamber</dt><dd>Hold the reacting fuel. In magnetic-confinement designs, magnetic fields help confine hot plasma: a gas with ions and free electrons. Other reactor designs use different confinement methods.</dd></div>
 <div><dt>Blanket</dt><dd>Surround the chamber with material that absorbs neutron energy. Lithium in this material can also produce replacement tritium.</dd></div>
 <div><dt>Cooling and generator</dt><dd>Carry heat out with a coolant. Convert part of this heat into electricity. Reject the remaining heat to the environment.</dd></div>
 <div><dt>Fuel processing</dt><dd>Recover unburned fuel and remove impurities. Extract new tritium from the blanket. Prepare fuel for return to the chamber.</dd></div>
 </dl>
 <p>The plant must supply more electricity than its equipment uses to export electrical power. Fusion energy alone does not establish this balance.</p>
 </section>
 <section aria-labelledby="lithium">
 <h2 id="lithium">Why does lithium enter the picture?</h2>
 <p>Fusion consumes tritium, and natural supplies are very small. A future D–T plant must produce replacement tritium. Neutrons from fusion can react with lithium in the blanket to make it. This process is called tritium breeding.</p>
 <p>One breeding reaction is neutron + lithium-6 → tritium + helium. Lithium-7 also has a breeding reaction, but it requires a sufficiently energetic neutron. The best lithium mixture depends on the blanket design.</p>
 <p>Ordinary lithium already contains lithium-6 and lithium-7. Both have three protons. Lithium-6 has three neutrons; lithium-7 has four. Increasing the lithium-6 percentage can help a blanket produce sufficient tritium.</p>
 <p>This gives isotope separation a purpose. Enrichment separates existing lithium isotopes into different mixtures. It does not turn lithium-7 into lithium-6.</p>
 <p>The lithium remains in the blanket material. Separate equipment extracts and processes the new tritium before it enters the fuel supply. The plant also needs an initial tritium supply before its own breeding can start.</p>
 <p><a href="https://www.iter.org/machine/supporting-systems/fuelling">ITER: fuel supply and recovery</a> · <a href="/tutorial-05.html#chronology">The complete fuel cycle</a></p>
 </section>
 <section aria-labelledby="marathon">
 <h2 id="marathon">Where does Marathon fit?</h2>
 <p>These are separate machines. The lithium centrifuge is not a fusion reactor, and its gas does not need fusion temperatures.</p>
 <dl class="fusion-needs">
 <div><dt>Plasma centrifuge</dt><dd>Turns gas to separate isotopes. Marathon describes lithium enrichment for blankets and hydrogen-isotope processing for the fuel cycle. This simulator focuses on the rotation, heating, and separation mechanisms.</dd></div>
 <div><dt>Beam source</dt><dd>Fires deuterium ions into a solid lithium tritide target, which contains tritium. D–T fusion produces neutrons in the target. Most beam ions slow down without fusion and heat the target. The Reactor tab explores this source; it does not predict net electrical power.</dd></div>
 <div><dt>Power-plant blanket proposal</dt><dd>Uses fusion neutrons for breeding and other nuclear reactions. Marathon also proposes mercury reactions for gold production. That proposal is separate from the beam source and is not necessary to understand the centrifuge.</dd></div>
 </dl>
 <p>These are simplified models, not predictions for Marathon hardware.</p>
 <p>The next question is now specific: how can electrical drive turn gas and change its isotope mixture? <a href="/guide.html">Tutorial 2 explains rotation and separation.</a> <a href="#machine">The centrifuge exercises below show the controls.</a></p>
 <p><a href="https://www.marathonfusion.com/fusion-energy/">Marathon: fuel cycle</a> · <a href="https://www.marathonfusion.com/beam-driven-fusion/">Marathon: beam source</a> · <a href="https://arxiv.org/abs/2507.13461">Marathon: blanket proposal</a></p>
 </section>
 <details id="exercises" class="centrifuge-exercises"><summary>Centrifuge exercises</summary>
 ${guideContents(questions.map(([step])=>[step.id,step.title]))}
 ${questions.map(steps=>`<div data-core-question="${steps[0].id}">${steps.map((step,i)=>section(step,i?'h3':'h2')).join('')}</div>`).join('')}
 <aside aria-labelledby="compare">${section(compare,'h3')}</aside>
 </details>
 </main><footer><a href="/guide.html">Physics & equations →</a> · <a href="/learn.html">Docs & tutorials</a></footer></body></html>`;
}
