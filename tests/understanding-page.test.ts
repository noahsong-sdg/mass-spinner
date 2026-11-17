import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {guideTopics,guideActions} from '../src/guide-topics.js';
import {setupGuideReader} from '../src/guide-reader.js';

const markdown=readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8');

test('the website renders every guide equation and its derivation, with accessible schematic diagrams',t=>{
 const dom=new JSDOM(understandingPage(markdown));t.after(()=>dom.window.close());const doc=dom.window.document;
 const count=[...markdown.matchAll(/^```math$/gm)].length;
 assert.equal(doc.querySelectorAll('.equation').length,count);assert.equal(doc.querySelectorAll('math').length,count);
 assert.equal(doc.querySelectorAll('.katex-error').length,0);assert.equal(doc.querySelectorAll('details math').length,2);
 assert.equal(doc.querySelectorAll('figure svg').length,3);
 for(const svg of doc.querySelectorAll('figure svg')){
  assert.equal(svg.getAttribute('role'),'img');
  for(const id of svg.getAttribute('aria-labelledby')!.split(' '))assert.ok(doc.getElementById(id)?.textContent);
 }
 assert.match(doc.getElementById('drive-description')!.textContent!,/inward to the left.*counterclockwise torque/);
 assert.match(doc.body.textContent!,/Schematic trend, not computed data/);
 assert.match(doc.body.textContent!,/not a reconstruction/);
 for(const topic of guideTopics){
  assert.equal(doc.getElementById(topic.id)?.textContent,topic.heading);
  for(const [key]of topic.actions)assert.ok(doc.querySelector(`#${topic.id} ~ .try-actions a[data-guide-action="${key}"]`));
 }
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[data-guide-action]')){
  assert.ok(guideActions.has(link.dataset.guideAction!));
  const url=new URL(link.getAttribute('href')!,'https://example.org');
  assert.equal(url.searchParams.get('guide'),'physics');assert.equal(url.searchParams.get('try'),link.dataset.guideAction);
 }
 assert.equal(doc.querySelector('link[href="/guide-katex/katex.min.css"]')?.getAttribute('rel'),'stylesheet');
 assert.deepEqual([...doc.querySelectorAll('script')].map(node=>node.getAttribute('src')),['/guide-reader.js']);
 assert.ok([...doc.querySelectorAll('a')].some(node=>node.href.includes('/blob/main/src/fuel-transport.ts')));
});

test('a malformed equation fails the build instead of publishing raw or broken mathematics',()=>{
 assert.throws(()=>understandingPage('```math\n\\notARealCommand{1}\n```'),/Undefined control sequence/);
});

test('the chapter picker remains reachable and leaves room for anchored headings',t=>{
 const dom=new JSDOM(understandingPage(markdown));t.after(()=>dom.window.close());
 const style=dom.window.document.createElement('style');style.textContent=readFileSync('web-assets/guide.css','utf8');dom.window.document.head.append(style);
 const nav=dom.window.getComputedStyle(dom.window.document.querySelector('nav')!);
 assert.equal(nav.position,'sticky');assert.equal(nav.top,'0px');
 const heading=dom.window.getComputedStyle(dom.window.document.querySelector('h2')!);
 assert.equal(heading.scrollMarginTop,'104px');
});

test('the embedded reader keeps actions in the parent simulator and Escape exits the reading window',t=>{
 const dom=new JSDOM(understandingPage(markdown),{url:'https://example.org/guide.html#energy'});t.after(()=>dom.window.close());
 const messages:any[]=[],win=dom.window;
 Object.defineProperty(win,'parent',{value:{postMessage:(...args:any[])=>messages.push(args)}});
 setupGuideReader(win);assert.ok(win.document.body.classList.contains('embedded'));
 assert.equal((win.document.getElementById('guide-chapter') as HTMLSelectElement).value,'energy');
 win.document.querySelector<HTMLAnchorElement>('a[data-guide-action="current"]')!.click();
 assert.deepEqual(messages.pop(),[{type:'mass-spinner:guide-action',action:'current'},'https://example.org']);
 win.document.querySelector<HTMLAnchorElement>('a[data-guide-view]')!.click();
 assert.deepEqual(messages.pop(),[{type:'mass-spinner:guide-view',view:'experiments'},'https://example.org']);
 win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.deepEqual(messages.pop(),[{type:'mass-spinner:guide-close'},'https://example.org']);
 assert.equal(win.location.pathname,'/guide.html');
});

test('standalone reading retains ordinary links and does not impersonate an embedded simulator',t=>{
 const dom=new JSDOM(understandingPage(markdown),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 setupGuideReader(dom.window);assert.equal(dom.window.document.body.classList.contains('embedded'),false);
 const chapters=dom.window.document.getElementById('guide-chapter') as HTMLSelectElement;chapters.value='composition';chapters.dispatchEvent(new dom.window.Event('change'));
 assert.equal(dom.window.location.hash,'#composition');
 assert.ok(dom.window.document.querySelector('a[href="/?level=2&guide=physics&topic=momentum&try=collisions"]'));
});
