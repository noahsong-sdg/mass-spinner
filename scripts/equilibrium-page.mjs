import {Marked} from 'marked';
import {equationMarkup} from './equation-links.mjs';
/** @param {string} markdown */
export function equilibriumPage(markdown){
 let equationPlot='';
 const parser=new Marked({renderer:{
  html({text}){if(!text.startsWith('<!-- equation:'))return false;const marker=/^<!-- equation:([a-z][a-z-]*) -->\s*$/.exec(text);if(!marker)throw new Error('Invalid equation marker');equationPlot=marker[1];return '';},
  code({lang,text}){if(lang!=='math')return false;const html=equationMarkup(text,equationPlot);equationPlot='';return html;},
 }});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Equilibrium calculator · Mass Spinner</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/guide.css"><link rel="stylesheet" href="/equation-plots.css"><link rel="stylesheet" href="/guide-katex/katex.min.css"><script type="module" src="/guide-reader.js"></script></head><body><header><a href="/?level=2&guide=physics&topic=bias&try=equilibrium" target="_top" data-guide-action="equilibrium">← Open calculator</a></header><main>${parser.parse(markdown)}</main></body></html>`;
}
