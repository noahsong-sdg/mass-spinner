import {Marked} from 'marked';
import {releaseSourceBase} from './release-links.mjs';

/** @param {string} value */
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/** Build the reviewed repository report. User-supplied Markdown is not an input. */
/** @param {string} markdown @param {string} revision */
export function qualificationPage(markdown,revision){
 const evidenceBase=releaseSourceBase(revision)+'docs/';
 const parser=new Marked({renderer:{link({href,tokens}){
  return `<a href="${escape(new URL(href,evidenceBase).href)}">${this.parser.parseInline(tokens)}</a>`;
 }}});
 const content=parser.parse(markdown.replace('../scientific/public-data-campaign/results/comparison.png','/qualification-comparison.png'));
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Public-data qualification · Mass Spinner</title><link rel="stylesheet" href="/fonts.css">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:auto;max-width:1040px;padding:28px 24px 80px;background:#111715;color:#e3e7e2;font:16px/1.65 'Commissioner',sans-serif}
h1,h2,h3{font-family:Literata,serif}nav{margin-bottom:48px}a{color:#e6b37f;text-underline-offset:3px}a:focus-visible{outline:2px solid #e6b37f;outline-offset:4px}h1{font-size:clamp(28px,5vw,44px);line-height:1.15}h2{font-size:24px;margin-top:48px}p,li{max-width:80ch}li{margin:10px 0}img{display:block;width:100%;height:auto;background:white;margin:28px 0}code{font-size:.9em;overflow-wrap:anywhere}table{display:block;overflow-x:auto;border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #35413b;min-width:150px}th{color:#e6b37f}strong{color:#fff}@media(max-width:480px){body{padding:20px 16px 56px}nav{margin-bottom:32px}}
</style><script type="module" src="/guide-reader.js"></script></head><body><nav><a href="/?level=2" data-guide-simulator>← Mass Spinner</a></nav><main>${content}</main></body></html>`;
}
