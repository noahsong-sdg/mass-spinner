import {guideContents} from './guide-contents.mjs';
import {Marked,Renderer} from 'marked';
import {equationMarkup} from './equation-links.mjs';
import {tsImport} from 'tsx/esm/api';
const {guideTopics,guideActions}=/** @type {typeof import('../src/guide-topics.js')} */(await tsImport('../src/guide-topics.ts',import.meta.url));
import {guideDiagram} from './guide-diagrams.mjs';
import {releaseSourceBase} from './release-links.mjs';

/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/** Render the same guide as GitHub. Compile equations during the build. */
/** @param {string} markdown @param {string} revision @param {{title:string;number:string;topics:readonly import('../src/guide-topics.js').GuideTopic[]}=} tutorial */
export function understandingPage(markdown,revision,tutorial){
 /** @type {readonly import('../src/guide-topics.js').GuideTopic[]} */
 const topics=tutorial?.topics??guideTopics;
 const title=tutorial?`Tutorial ${Number(tutorial.number)} · ${tutorial.title}`:'Tutorial 2 · Rotation and separation';
 const ownPath=tutorial?`/tutorial-${tutorial.number}.html`:'/guide.html';
 let section='',equationPlot='';
 const sourceBase=releaseSourceBase(revision)+'docs/';
 const diagrams=new Set(topics.flatMap(topic=>topic.diagram??[])),usedDiagrams=new Set();
 const baseRenderer=new Renderer();
 const parser=new Marked({renderer:{
  code({lang,text}){if(lang!=='math')return false;const html=equationMarkup(text,equationPlot);equationPlot='';return html;},
  table(token){return baseRenderer.table.call(this,token).replace('<table>','<table tabindex="0" aria-label="Comparison table. If necessary, scroll horizontally.">');},
  html({text}){
   if(text.startsWith('<!-- equation:')){const marker=/^<!-- equation:([a-z][a-z-]*) -->\s*$/.exec(text);if(!marker)throw new Error('Invalid equation marker');equationPlot=marker[1];return '';}
   if(!text.startsWith('<!-- diagram:'))return false;
   const marker=/^<!-- diagram:([a-z][a-z-]*) -->\s*$/.exec(text),id=marker?.[1];
   if(!id||!diagrams.has(id)||usedDiagrams.has(id))throw new Error(`Invalid or repeated guide diagram: ${text.trim()}`);
   usedDiagrams.add(id);return guideDiagram(id);
  },
  link({href,tokens}){
   const label=this.parser.parseInline(tokens);
   if(href.startsWith('/?')){
    const target=new URL(href,'https://mass-spinner.invalid'),params=target.searchParams,action=params.get('try');
    if(params.get('level')!=='2'||!action||!guideActions.has(action))throw new Error(`Unknown guide action: ${href}`);
    params.set('lesson',ownPath+(section?`#${section}`:''));
    return `<a data-guide-action="${action}" target="_top" href="${escape(target.pathname+target.search)}">${label}</a>`;
   }
   const part=href.match(/^UNDERSTANDING-MASS-SPINNER-(0[2-6])\.md(#[\w-]+)?$/);
   if(part)return `<a href="${part[1]==='02'?'/guide.html':`/tutorial-${part[1]}.html`}${part[2]??''}">${label}</a>`;
   if(href.startsWith('#'))return `<a href="${escape(href)}">${label}</a>`;
   if(href.endsWith('/start.html'))return `<a href="/start.html">${label}</a>`;
   if(href.startsWith('/learn'))return `<a href="${escape(href)}">${label}</a>`;
   if(href.startsWith('/tutorial-')||href==='/guide.html')return `<a href="${escape(href)}">${label}</a>`;
   return `<a href="${escape(new URL(href,sourceBase).href)}" target="_blank" rel="noopener">${label}</a>`;
  },
  heading({tokens,depth}){
   const text=tokens.map(token=>token.raw).join(''),topic=topics.find(topic=>topic.heading===text);
   if(depth===2)section=topic?.id??'';
   const heading=`<h${depth}${topic?` id="${topic.id}"`:''}>${this.parser.parseInline(tokens)}</h${depth}>`;
   return heading+(depth===1?guideContents(topics.map(topic=>[topic.id,topic.heading.replace(/^\d\. /,'')])):'');
  },
 }});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="darkreader-lock"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>${escape(title)} · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide-katex/katex.min.css"><link rel="stylesheet" href="/guide.css"><link rel="stylesheet" href="/equation-plots.css">
 <script type="module" src="/guide-reader.js"></script></head><body>
 <header><a href="/?level=2" target="_top" data-guide-simulator>Simulator ↗</a><a href="/learn.html">Docs & tutorials</a><a class="standalone" href="${ownPath}" target="_blank" rel="noopener">Open separate page ↗</a></header>
<main><p id="reader-status" role="status" aria-live="polite"></p>${parser.parse(markdown)}</main><footer><a href="/learn.html">Docs & tutorials</a></footer></body></html>`;
}
