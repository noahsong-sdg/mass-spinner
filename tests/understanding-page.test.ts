import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {guideTopics,guideActions,numberedTutorials} from '../src/guide-topics.js';
import {setupGuideReader} from '../src/guide-reader.js';

const markdown=readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8');
const revision='8cab091a3458a050142049f9227238d18e51b53d';

test('energy readers explain the separation and cooling decision before introducing power equations',t=>{
 for(const tutorial of [undefined,numberedTutorials[0]]){
  const source=tutorial?readFileSync('docs/UNDERSTANDING-MASS-SPINNER-03.md','utf8'):markdown;
  const dom=new JSDOM(understandingPage(source,revision,tutorial));t.after(()=>dom.window.close());
  const heading=dom.window.document.getElementById(tutorial?'budget':'energy')!;
  let lead='';for(let node=heading.nextElementSibling;node&&!node.classList.contains('equation');node=node.nextElementSibling)lead+=` ${node.textContent}`;
  assert.match(lead,/random thermal motion|random thermal\s+motion/);
  assert.match(lead,/same rotation speed|given rotation speed/,'temperature effect must be conditional on rotation');
  assert.match(lead,/[Cc]ooling/);assert.match(lead,/decreases separation|less separation/);
  assert.match(lead,/More current can increase speed and temperature|Does more current still increase separation when it increases temperature/,'motivate a decision, not just an energy bookkeeping exercise');
 }
});

test('the website renders every guide equation and its derivation, with accessible schematic diagrams',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());const doc=dom.window.document;
 const count=[...markdown.matchAll(/^```math$/gm)].length;
 assert.equal(doc.querySelectorAll('.equation').length,count);assert.equal(doc.querySelectorAll('math').length,count);
 for(const equation of doc.querySelectorAll('.equation'))assert.equal(equation.getAttribute('role'),'group');
 for(const table of doc.querySelectorAll('table')){assert.equal(table.getAttribute('tabindex'),'0');assert.ok(table.getAttribute('aria-label'));}
 assert.equal(doc.querySelectorAll('.katex-error').length,0);assert.equal(doc.querySelectorAll('details math').length,2);
 assert.equal(doc.querySelectorAll('figure svg').length,4);
 for(const svg of doc.querySelectorAll('figure svg')){
  assert.equal(svg.getAttribute('role'),'img');
  for(const id of svg.getAttribute('aria-labelledby')!.split(' '))assert.ok(doc.getElementById(id)?.textContent);
 }
 assert.match(doc.getElementById('drive-description')!.textContent!,/inward to the left.*counterclockwise torque/);
 assert.match(doc.getElementById('drive-description')!.textContent!,/Hollow circles show ions and filled dots show neutral atoms/);
 assert.match(doc.body.textContent!,/This ideal equilibrium example is not your run/);
 assert.match(doc.body.textContent!,/not proprietary equipment or a fusion reactor/);
 for(const topic of guideTopics){
  assert.equal(doc.getElementById(topic.id)?.textContent,topic.heading);
  assert.equal(doc.getElementById(topic.id)!.nextElementSibling?.tagName,'P','motivate the question before showing diagrams and controls');
 }
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[data-guide-action]')){
  assert.ok(guideActions.has(link.dataset.guideAction!));
  const url=new URL(link.getAttribute('href')!,'https://example.org');
  assert.equal(url.searchParams.get('level'),'2');assert.equal(url.searchParams.get('try'),link.dataset.guideAction);
 }
 assert.equal(doc.querySelector('link[href="/guide-katex/katex.min.css"]')?.getAttribute('rel'),'stylesheet');
 assert.deepEqual([...doc.querySelectorAll('script')].map(node=>node.getAttribute('src')),['/guide-reader.js']);
 for(const file of ['fuel-centrifuge.ts','fuel-transport.ts','fuel-operation.ts'])
  assert.ok(doc.querySelector(`a[href="https://github.com/noahsong-sdg/mass-spinner/blob/${revision}/src/${file}"]`));
 assert.ok(doc.querySelector('a[href="https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf"]'));
 assert.ok(!doc.body.innerHTML.includes('/blob/main/'));
});

test('the drive illustration separates current, ion rotation and neutral entrainment, with a working motion control',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 const win=dom.window,doc=win.document;setupGuideReader(win);
 const figure=doc.querySelector<HTMLElement>('[data-drive-diagram]')!,motion=figure.querySelector<HTMLButtonElement>('[data-drive-motion]')!;
 assert.equal(figure.dataset.stage,'gas');assert.equal(figure.dataset.motion,'running');
 for(const [stage,phrase] of [['current',/outer electrode to the inner/],['ions',/counterclockwise/],['gas',/collisions.*neutral gas/]] as const){
  const button=figure.querySelector<HTMLButtonElement>(`[data-drive-stage="${stage}"]`)!;button.click();
  assert.equal(figure.dataset.stage,stage);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(figure.querySelectorAll('[data-drive-stage][aria-pressed="true"]').length,1);
  assert.match(doc.getElementById('drive-explanation')!.textContent!,phrase);
 }
 motion.click();assert.equal(figure.dataset.motion,'paused');assert.equal(motion.textContent,'Play motion');assert.equal(motion.hasAttribute('aria-pressed'),false,'changing action labels use an ordinary button');
 figure.querySelector<HTMLButtonElement>('[data-drive-stage="ions"]')!.click();assert.equal(figure.dataset.motion,'paused','changing explanation must not override pause');
 motion.click();assert.equal(figure.dataset.motion,'running');assert.equal(motion.textContent,'Pause motion');
 assert.match(figure.textContent!,/not simulated particle paths/);assert.match(figure.textContent!,/Outer electrode · stationary/);
 assert.ok(figure.querySelector('.drive-ions circle'));assert.ok(figure.querySelector('.drive-neutrals circle'));
});

test('reduced motion starts paused, and the full static explanation remains available before scripts run',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 const win=dom.window,figure=win.document.querySelector<HTMLElement>('[data-drive-diagram]')!;
 assert.equal(figure.dataset.motion,'paused');assert.equal(figure.dataset.stage,'gas');
 Object.defineProperty(win,'matchMedia',{value:()=>({matches:true})});setupGuideReader(win);
 assert.equal(figure.dataset.motion,'paused');assert.equal(figure.querySelector('[data-drive-motion]')!.textContent,'Play motion');
 figure.querySelector<HTMLButtonElement>('[data-drive-motion]')!.click();assert.equal(figure.dataset.motion,'running','explicit play is available after respecting the initial preference');
});

test('the end-view force arrows give the same counterclockwise torque in all four quadrants',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());
 const doc=dom.window.document,forces=[...doc.querySelectorAll('.drive-forces path')],currents=[...doc.querySelectorAll('.drive-currents path')];
 assert.equal(forces.length,4);assert.equal(currents.length,4);
 for(const node of forces){
  assert.equal(node.getAttribute('marker-end'),'url(#drive-force)','every force gets its own visible arrowhead');
  const [,xText,yText,axis,endText]=/^M(\d+) (\d+)([HV])(\d+)$/.exec(node.getAttribute('d')!)!;
  const x=Number(xText)-160,y=Number(yText)-160,dx=axis==='H'?Number(endText)-Number(xText):0,dy=axis==='V'?Number(endText)-Number(yText):0;
  assert.ok(x*dy-y*dx<0,'SVG y points down: negative screen-space torque is counterclockwise');
 }
 for(const node of currents){
  assert.equal(node.getAttribute('marker-end'),'url(#drive-current)');
  const [,xText,yText,axis,endText]=/^M(\d+) (\d+)([HV])(\d+)$/.exec(node.getAttribute('d')!)!;
  const x=Number(xText)-160,y=Number(yText)-160,dx=axis==='H'?Number(endText)-Number(xText):0,dy=axis==='V'?Number(endText)-Number(yText):0;
  assert.ok(x*dx+y*dy<0,'current must point inward in every quadrant');
 }
 const style=readFileSync('web-assets/guide.css','utf8');assert.match(style,/@keyframes drive-turn\{to\{transform:rotate\(-360deg\)\}\}/);
 assert.match(style,/\.drive-ions\{fill:none;/,'hollow ions must match the live 3D marker convention');
});

test('a malformed equation fails the build instead of publishing raw or broken mathematics',()=>{
 assert.throws(()=>understandingPage('```math\n\\notARealCommand{1}\n```',revision),/Undefined control sequence/);
});

test('the density-gradient example follows the ideal-gas exponent and keeps the three cases distinct',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 const doc=dom.window.document,figure=doc.querySelector<HTMLElement>('[data-density-example]')!;setupGuideReader(dom.window);
 for(const [id,v,T]of [['rest',0,500],['spin',1500,500],['warm',1500,1000]] as const){
  (figure.querySelector(`[data-density-select="${id}"]`) as HTMLButtonElement).click();
  assert.equal(figure.dataset.case,id);assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
  const curves=[...figure.querySelectorAll<SVGPathElement>(`g[data-density-case="${id}"] path`)];
  for(const curve of curves){const m=Number(curve.dataset.mass)*1.66053906892e-27,beta=m*v*v/(2*1.380649e-23*T);assert.ok(Math.abs(Number(curve.dataset.beta)-beta)<1e-14);assert.ok(Math.abs(Number(curve.dataset.wall)-Math.exp(beta))<1e-12);}
  if(v>0)assert.ok(Number(curves[1].dataset.wall)>Number(curves[0].dataset.wall));
 }
 assert.match(figure.textContent!,/equal-size volumes.*not whole rings/);
 assert.match(figure.textContent!,/not isotope percentages/);
});

test('linked contents need no sticky picker and leave room for anchored headings',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());
 const style=dom.window.document.createElement('style');style.textContent=readFileSync('web-assets/guide.css','utf8');dom.window.document.head.append(style);
 const nav=dom.window.getComputedStyle(dom.window.document.querySelector('.guide-contents')!);
 assert.equal(nav.position,'static');assert.equal(dom.window.document.querySelector('#guide-chapter'),null);
 const heading=dom.window.getComputedStyle(dom.window.document.querySelector('h2')!);
 assert.equal(heading.scrollMarginTop,'24px');
});

test('the embedded reader keeps actions in the parent simulator and Escape exits the reading window',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision),{url:'https://example.org/guide.html#energy'});t.after(()=>dom.window.close());
 const messages:[unknown,string][]=[],win=dom.window;
 const parent={closed:false,postMessage:(data:unknown,target:string)=>messages.push([data,target])} as unknown as Window;
 Object.defineProperty(win,'parent',{value:parent});
 const receive=(data:unknown,source=parent,origin='https://example.org')=>win.dispatchEvent(new win.MessageEvent('message',{source,origin,data}));
 setupGuideReader(win);assert.ok(win.document.body.classList.contains('embedded'));
 assert.deepEqual(messages.at(-1),[{type:'mass-spinner:guide-hello',capability:''},'https://example.org']);
 assert.ok(win.document.querySelector('.guide-contents a[href="#energy"]'));assert.equal(win.location.hash,'#energy');
 win.document.querySelector<HTMLAnchorElement>('a[data-guide-action="work"]')!.click();
 const status=win.document.getElementById('reader-status')!;
 assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');
 const ready={type:'mass-spinner:guide-ready',capability:'authorized-parent',instance:'simulator-1'};
 const before=messages.length;
 receive(ready,parent,'https://wrong.example');receive(ready,win as unknown as Window);
 assert.equal(messages.length,before);assert.match(status.textContent!,/Waiting for the simulator/);
 receive(ready);
 const [request,target]=messages.at(-1)! as [{type:string;action:string;requestId:string},string];
 assert.equal(request.type,'mass-spinner:guide-action');assert.equal(request.action,'work');assert.ok(request.requestId);
 assert.equal(target,'https://example.org');assert.match(status.textContent!,/Waiting for the action result/);
 const result={type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'};
 receive(result,parent,'https://wrong.example');receive(result,win as unknown as Window);
 assert.match(status.textContent!,/Waiting for the action result/);
 receive(result);assert.equal(status.textContent,'Opened in the simulator.');
 assert.ok(win.document.querySelector('a[href="/start.html"]'));
 win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.deepEqual(messages.pop(),[{type:'mass-spinner:guide-close'},'https://example.org']);
 assert.equal(win.location.pathname,'/guide.html');
});

test('standalone reading retains ordinary links and does not impersonate an embedded simulator',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 setupGuideReader(dom.window);assert.equal(dom.window.document.body.classList.contains('embedded'),false);
 assert.ok(dom.window.document.querySelector('.guide-contents a[href="#composition"]'));assert.equal(dom.window.document.querySelector('#guide-chapter'),null);
 assert.ok(dom.window.document.querySelector('a[href="/?level=2&guide=physics&topic=momentum&try=spin"]'));
});

test('the rotation chapter motivates one drive-and-coast experiment instead of emitting a shortcut bank',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('.try-actions').length,0);
 const section:Element[]=[];
 for(let node=doc.getElementById('momentum')!.nextElementSibling;node&&node.tagName!=='H2';node=node.nextElementSibling)section.push(node);
 const links=section.flatMap(node=>[...node.querySelectorAll<HTMLAnchorElement>('[data-guide-action]')]);
 assert.deepEqual(links.map(link=>link.dataset.guideAction),['spin','cutPower','momentum']);
 const equations=section.filter(node=>node.classList.contains('equation'));
 assert.equal(equations.length,3);
 assert.ok(equations.at(-1)!.compareDocumentPosition(links[0])&dom.window.Node.DOCUMENT_POSITION_FOLLOWING,'introduce torque before asking the reader to drive the gas');
 const steps=links.map(link=>link.closest('li')!);
 assert.equal(new Set(steps).size,3,'each action belongs to its own explained step');
 for(const step of steps){assert.ok(step);assert.ok(step.textContent!.length>100,'each step states what to observe');}
 assert.equal(doc.querySelectorAll('[data-guide-action="currentExperiment"]').length,1,'do not repeat the introductory current experiment');
 for(const action of ['axis','wall','density','inertia','collisions','drag','duration','diffusion','pin','thermal','thermalPlot']){
  assert.equal(doc.querySelector(`[data-guide-action="${action}"]`),null,'specialist shortcuts stay out of the main experiment sequence');
  assert.ok(guideActions.has(action),'previously shared simulator deep links remain valid');
 }
});

test('only explicitly authored, allowlisted local actions become simulator links',t=>{
 const source='## 4. What sets the rotation speed?\n\nFirst explain torque.\n\n[Replay now](/?level=2&try=spin)';
 const dom=new JSDOM(understandingPage(source,revision));t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('[data-guide-action]').length,1);
 const link=doc.querySelector<HTMLAnchorElement>('[data-guide-action]')!;
 assert.equal(link.dataset.guideAction,'spin');assert.equal(link.getAttribute('href'),'/?level=2&try=spin');assert.equal(link.hasAttribute('target'),false);
 assert.equal(doc.getElementById('momentum')!.nextElementSibling!.textContent,'First explain torque.');
 for(const href of ['/?level=2&try=notAnAction','/?level=3&try=spin','/?level=2'])assert.throws(()=>understandingPage(`[Go](${href})`,revision),/Unknown guide action/);
});


test('the model-building order and old deep links survive the guide rewrite',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.deepEqual([...doc.querySelectorAll('main h2[id]')].map(node=>node.id),['goal','composition','bias','drive','momentum','energy','collection','limits','views','path']);
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')){
  assert.ok(doc.getElementById(link.hash.slice(1)),`missing same-page destination: ${link.hash}`);
  assert.equal(link.hasAttribute('target'),false,'embedded chapter links stay in the reader');
  assert.equal(link.hasAttribute('data-guide-action'),false,'reading a section must not operate the simulator');
 }
 assert.ok(doc.querySelector('a[href="#views"]'));assert.ok(doc.querySelector('a[href="#path"]'));
 for(const id of ['views','path']){
  assert.ok(doc.querySelector(`.guide-contents a[href="#${id}"]`));
  assert.notEqual(doc.getElementById(id)!.nextElementSibling?.className,'try-actions','reference sections should not emit empty action groups');
 }
});

test('the reading plan uses the documentation index instead of duplicating its experiment directory',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());const doc=dom.window.document;
 const path=doc.getElementById('path')!;
 assert.equal(path.nextElementSibling?.tagName,'P');
 assert.equal(doc.querySelector('#path ~ table'),null,'the experiment directory belongs only in Docs & tutorials');
 for(const href of ['/learn.html','/tutorial-03.html','/tutorial-04.html','/tutorial-05.html','/tutorial-06.html'])assert.ok(doc.querySelector(`main a[href="${href}"]`),href);
});


test('condensed reference tables explain each entry once',t=>{
 const dom=new JSDOM(understandingPage(markdown,revision));t.after(()=>dom.window.close());
 for(const table of dom.window.document.querySelectorAll('table')){
  const labels=[...table.querySelectorAll('tbody tr')].map(row=>row.querySelector('td')!.textContent!.trim());
  assert.equal(new Set(labels).size,labels.length,'duplicate reference entry');
 }
});
