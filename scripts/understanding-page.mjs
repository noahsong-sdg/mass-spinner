import {Marked,Renderer} from 'marked';
import katex from 'katex';
import {tsImport} from 'tsx/esm/api';
const {guideTopics,guideActions}=/** @type {typeof import('../src/guide-topics.js')} */(await tsImport('../src/guide-topics.ts',import.meta.url));
import {guideDiagram} from './guide-diagrams.mjs';
import {releaseSourceBase} from './release-links.mjs';

/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/** Render the same reviewed guide as GitHub, with math compiled at build time. */
/** @param {string} markdown @param {string} revision @param {{title:string;number:string;topics:readonly import('../src/guide-topics.js').GuideTopic[]}=} tutorial */
export function understandingPage(markdown,revision,tutorial){
 const topics=tutorial?.topics??guideTopics,title=tutorial?`${tutorial.number} · ${tutorial.title}`:'Physics guide';
 const ownPath=tutorial?`/tutorial-${tutorial.number}.html`:'/guide.html';
 const sourceBase=releaseSourceBase(revision)+'docs/';
 let enhancement='';
 const baseRenderer=new Renderer();
 const parser=new Marked({renderer:{
  code({lang,text}){return lang==='math'?`<div class="equation" role="group" tabindex="0" aria-label="Equation, scroll horizontally if needed">${katex.renderToString(text,{displayMode:true,throwOnError:true,trust:false})}</div>`:false;},
  table(token){return baseRenderer.table.call(this,token).replace('<table>','<table tabindex="0" aria-label="Comparison table, scroll horizontally if needed">');},
  link({href,tokens}){
   const label=this.parser.parseInline(tokens);
   if(href.startsWith('/?')){
    const params=new URL(href,'https://mass-spinner.invalid').searchParams,action=params.get('try');
    if(params.get('level')!=='2'||!action||!guideActions.has(action))throw new Error(`Unknown guide action: ${href}`);
    return `<a data-guide-action="${action}" href="${escape(href)}">${label}</a>`;
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
   const heading=`<h${depth}${topic?` id="${topic.id}"`:''}>${this.parser.parseInline(tokens)}</h${depth}>`;
   enhancement=topic?.diagram?guideDiagram(topic.diagram):'';
   return heading;
  },
  paragraph({tokens}){
   const after=enhancement;enhancement='';
   return `<p>${this.parser.parseInline(tokens)}</p>`+after;
  },
 }});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>${escape(title)} · Mass Spinner</title><link rel="stylesheet" href="/guide-katex/katex.min.css"><link rel="stylesheet" href="/guide.css">
 <script type="module" src="/guide-reader.js"></script></head><body>
 <header><a href="/?level=2" data-guide-simulator>Simulator ↗</a><a href="/start.html">Start here →</a><a href="/learn.html">Investigations →</a><a class="standalone" href="${ownPath}" target="_blank" rel="noopener">Read on its own ↗</a></header>
 <nav aria-label="Guide chapters"><label for="guide-chapter">Jump to</label><select id="guide-chapter">${topics.map(topic=>`<option value="${topic.id}">${escape(topic.heading.replace(/^\d\. /,''))}</option>`).join('')}</select></nav>
 <main><p id="reader-status" role="status" aria-live="polite"></p>${parser.parse(markdown)}</main><footer><a href="/start.html">Try the seven experiments ↗</a></footer></body></html>`;
}
