import {Marked} from 'marked';
import katex from 'katex';
export function equilibriumPage(markdown){
 const parser=new Marked({renderer:{code({lang,text}){return lang==='math'?`<div class="equation" tabindex="0">${katex.renderToString(text,{displayMode:true,throwOnError:true,trust:false})}</div>`:false;}}});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Equilibrium calculator · Mass Spinner</title><link rel="stylesheet" href="/guide.css"><link rel="stylesheet" href="/guide-katex/katex.min.css"></head><body><header><a href="/?level=2&guide=physics&topic=bias&try=equilibrium">← Open calculator</a></header><main>${parser.parse(markdown)}</main></body></html>`;
}
