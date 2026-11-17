import {Marked} from 'marked';
import katex from 'katex';
import {guideTopics} from '../src/guide-topics.js';
import {guideDiagram} from './guide-diagrams.mjs';
import {releaseSourceBase} from './release-links.mjs';

const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/** Render the same reviewed guide as GitHub, with math compiled at build time. */
export function understandingPage(markdown,revision){
 const sourceBase=releaseSourceBase(revision)+'docs/';
 const parser=new Marked({renderer:{
  code({lang,text}){return lang==='math'?`<div class="equation" tabindex="0" aria-label="Equation, scroll horizontally if needed">${katex.renderToString(text,{displayMode:true,throwOnError:true,trust:false})}</div>`:false;},
  link({href,tokens}){
   const label=this.parser.parseInline(tokens);
   if(href.endsWith('/?level=2&guide=start'))return `<a href="/?level=2&guide=start" data-guide-view="experiments">${label}</a>`;
   return `<a href="${escape(new URL(href,sourceBase).href)}" target="_blank" rel="noopener">${label}</a>`;
  },
  heading({tokens,depth}){
   const text=tokens.map(token=>token.raw).join(''),topic=guideTopics.find(topic=>topic.heading===text);
   const heading=`<h${depth}${topic?` id="${topic.id}"`:''}>${this.parser.parseInline(tokens)}</h${depth}>`;
   if(!topic)return heading;
   return heading+(topic.diagram?guideDiagram(topic.diagram):'')+`<div class="try-actions" aria-label="Try ${escape(topic.heading)}">${topic.actions.map(([key,label])=>`<a data-guide-action="${key}" href="/?level=2&guide=physics&topic=${topic.id}&try=${key}">${escape(label)}</a>`).join('')}</div>`;
  },
 }});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Physics guide · Mass Spinner</title><link rel="stylesheet" href="/guide-katex/katex.min.css"><link rel="stylesheet" href="/guide.css">
 <script type="module" src="/guide-reader.js"></script></head><body>
 <header><a href="/?level=2&guide=physics">Open beside the simulator ↗</a><a class="standalone" href="/guide.html" target="_blank" rel="noopener">Read on its own ↗</a></header>
 <nav aria-label="Guide chapters"><label for="guide-chapter">Jump to</label><select id="guide-chapter">${guideTopics.map(topic=>`<option value="${topic.id}">${escape(topic.heading.replace(/^\d\. /,''))}</option>`).join('')}</select></nav>
 <main>${parser.parse(markdown)}</main><footer><a href="/?level=2&guide=start" data-guide-view="experiments">Try the seven experiments ↗</a></footer></body></html>`;
}
