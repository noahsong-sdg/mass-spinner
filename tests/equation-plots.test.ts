import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {equationPlots,equationGroups,sampleEquation,type EquationPlotId,type EquationPlot} from '../src/equation-plots.js';
import {setupEquationPlots} from '../src/equation-dialog.js';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {equilibriumPage} from '../scripts/equilibrium-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';
import {equationDerivations} from '../src/equation-derivations.js';
import {equationMarkup,withEquationDerivations} from '../scripts/equation-links.mjs';

const near=(a:number,b:number,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const defaults=(id:EquationPlotId)=>Object.fromEntries(equationPlots[id].inputs.map(c=>[c.key,c.value]));
const at=(id:EquationPlotId,x:number,parameters:Record<string,number>={})=>equationPlots[id].values(x,{...defaults(id),...parameters});

test('every displayed tutorial, calculator and summary equation has an explicit plot',t=>{
 const revision='445eb36aa4b862cf5ef021359206fdb8c2493fe8';
 const sources=[{source:readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8'),tutorial:undefined},...numberedTutorials.map(tutorial=>({source:readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${tutorial.number}.md`,'utf8'),tutorial}))];
 let count=0;
 for(const {source,tutorial}of sources){
  const dom=new JSDOM(understandingPage(source,revision,tutorial));t.after(()=>dom.window.close());
  const buttons=dom.window.document.querySelectorAll<HTMLButtonElement>('.equation button');
  assert.equal(buttons.length,[...source.matchAll(/^```math$/gm)].length);
  for(const button of buttons){assert.ok(Object.hasOwn(equationGroups,button.dataset.equationPlot!));assert.match(button.textContent!,/Plot \+ derivation ↗/);assert.ok(button.querySelector('math'));assert.equal(button.hasAttribute('aria-label'),false,'the button name must include its visible equation');assert.match(button.title,/^Plot: /);assert.equal((button.nextElementSibling as HTMLTemplateElement).dataset.equationDerivation,button.dataset.equationPlot);}
  count+=buttons.length;
 }
 const calculator=new JSDOM(equilibriumPage(readFileSync('docs/EQUILIBRIUM-COMPOSITION.md','utf8')));t.after(()=>calculator.window.close());
 assert.equal(calculator.window.document.querySelectorAll('.equation button[data-equation-plot]').length,5);
 assert.equal(count,20);
 const summary=new JSDOM(withEquationDerivations(readFileSync('web-assets/how-it-works.html','utf8')));t.after(()=>summary.window.close());
 assert.equal(summary.window.document.querySelectorAll('.equation button[data-equation-plot]').length,2);
 assert.equal(summary.window.document.querySelectorAll('template[data-equation-derivation]').length,2);
 assert.ok(summary.window.document.querySelector('link[href="/guide-katex/katex.min.css"]'));
 assert.throws(()=>understandingPage('```math\nx=1\n```',revision),/known plot marker/);
 assert.throws(()=>understandingPage('<!-- equation:missing -->\n\n```math\nx=1\n```',revision),/known plot marker/);
});

test('every equation group has a motivated, typeset derivation with assumptions and calculation steps',t=>{
 assert.deepEqual(Object.keys(equationDerivations).sort(),Object.keys(equationGroups).sort());
 for(const [id,d]of Object.entries(equationDerivations)){
  const dom=new JSDOM(equationMarkup('x=1',id));t.after(()=>dom.window.close());
  const template=dom.window.document.querySelector<HTMLTemplateElement>('template')!;
  assert.equal(template.dataset.equationDerivation,id);
  assert.equal(template.content.querySelector('h3')!.textContent,d.title);
  assert.ok(template.content.textContent!.includes(d.why));assert.ok(template.content.textContent!.includes(d.symbols));
  assert.equal(template.content.querySelector('.equation-assumptions')!.textContent,d.assumptions);
  assert.ok(d.steps.length>=3);assert.equal(template.content.querySelectorAll('li math').length,d.steps.length);
  assert.equal(template.content.querySelectorAll('script,.katex-error').length,0);
  assert.equal(dom.window.document.querySelectorAll('math').length,1,'template equations must stay inert until the dialog opens');
 }
 assert.throws(()=>withEquationDerivations('<button data-equation-plot="missing">x</button>'),/known derivation/);
});

test('every plot stays finite throughout its exposed input domain',()=>{
 for(const ids of Object.values(equationGroups))for(const id of ids)assert.ok(Object.hasOwn(equationPlots,id));
 for(const [id,plot]of Object.entries(equationPlots) as [EquationPlotId,EquationPlot][]){
  let parameters=[defaults(id)];
  for(const c of plot.inputs)parameters=parameters.flatMap(p=>[c.min,c.value,c.max].map(value=>({...p,[c.key]:value})));
  for(const p of parameters)for(const sample of sampleEquation(id,p,12)){
   assert.equal(sample.y.length,plot.labels.length,id);
   for(const y of sample.y)assert.ok(y===null||Number.isFinite(y),`${id}: ${JSON.stringify(p)}`);
  }
 }
});

test('neutral radial references obey force balance, temperature scaling and cylindrical inventory',()=>{
 const k=1.380649e-23,m=6.0151228874*1.66053906892e-27;
 assert.deepEqual(at('density',12,{omega:0}),[1,1]);
 near(Math.log(at('density',12,{temperature:1000})[0]!),Math.log(at('density',12,{temperature:500})[0]!)/2);
 near(Math.log(at('density',6)[0]!),Math.log(at('density',12)[0]!)/4);
 const dr=.0001;
 const derivative=(at('gas-pressure',6+dr)[0]!-at('gas-pressure',6-dr)[0]!)/(2*dr/100);
 near(derivative,at('pressure',6)[0]!,1e-7);
 near(at('density-gradient',6)[0]!*k*500,at('pressure',6)[0]!);
 near(at('mass-density',6)[0]!/m,at('gas-pressure',6)[0]!/(k*500));
 near(at('log-gradient',6)[0]!,m*12500**2*.06/(k*500));
 near(at('separation',1000)[0]!**2,at('separation',500)[0]!);
 near(at('normalization',0)[0]!,1);
 const b=2,n=10000;
 let integral=0;for(let i=0;i<n;i++)integral+=Math.exp(b*(i+.5)/n)/n;
 near(at('normalization',b)[0]!,integral,1e-8);
 for(const r of [0,3,6,12]){
  near(at('species-cut',r,{omega:0})[0]!,100*(r/12)**2);
  near(at('composition',r,{omega:0})[0]!,7.59);assert.equal(at('composition',r).length,1,'show the light fraction without a dominant complementary curve');
 }
 assert.equal(at('collection',0)[0],null);
 near(at('collection',12)[0]!,7.59);near(at('collection',12)[1]!,100);
 assert.equal(at('collection',6,{feed:0})[1],null);
 near(at('collection',6,{feed:1})[0]!,100);
 const volume=Math.PI*.12**2*.8;
 near(at('species-density',6,{omega:0})[0]!*1e22,1e20*.0759/volume);
});

test('drive, collision and heat plots retain signs, units and conservation',()=>{
 assert.equal(at('magnetic-force',180)[0],0);assert.equal(at('force-density',180)[0],0);
 near(at('magnetic-force',0)[0]!,0);near(at('magnetic-force',90,{charge:0})[0]!,0);
 near(at('magnetic-force',90,{charge:-1})[0]!,-at('magnetic-force',90)[0]!);
 near(at('force-density',90,{currentDensity:-10})[0]!,-5);
 near(at('torque',1)[0]!,1000*.5*(.12**2-.036**2)/2);
 near(at('power',.4)[0]!,2*at('power',.2)[0]!);near(at('power',.4)[1]!,4*at('power',.2)[1]!);
 near(at('slip',-30)[0]!,at('slip',30)[0]!);near(at('slip',0)[0]!,0);
 for(const t of [0,.1,1,2]){
  const [ion,gas]=at('coupled-speeds',t),[di,dn,total]=at('coupled-rates',t);
  near(ion!+gas!,10*t);near(di!+dn!,total!);near(total!,10);
 }
 for(const drag of [0,2]){
  const dt=1e-5,t=.8;
  const a=at('coupled-speeds',t-dt,{drag}),b=at('coupled-speeds',t+dt,{drag});
  const rates=at('coupled-rates',t,{drag});
  for(let j=0;j<2;j++)near((b[j]!-a[j]!)/(2*dt),rates[j]!,1e-7);
 }
 assert.deepEqual(at('coupled-speeds',1,{coupling:0}),[10,0]);
 assert.deepEqual(at('coupled-speeds',1,{torque:0}),[0,0]);
 near(at('momentum-time',1,{drive:0,loss:2})[0]!,-2);
 const energy=at('energy',2);near(energy[0]!-energy[1]!,energy[2]!);
 near(at('diffusion',24)[0]!,4*at('diffusion',12)[0]!);
 near(at('conduction',-1000)[0]!,100);near(at('conduction',1000)[0]!,-100);
});

test('pumping and fuel references use the stated boundary conditions and consumed flow',()=>{
 const s=.02,c=.05,q=at('pump-load',s)[0]!,upstream=at('pump-pressure',s,{conductance:c})[0]!;
 near(q,.2);near(upstream,1+q/c);near(at('pump-speed',s,{conductance:c})[0]!,q/upstream);
 near(at('pump-speed',0)[0]!,0);
 near(at('inventory',1)[0]!,0);near(at('inventory',.05,{delay:0})[0]!,0);
 near(at('inventory',.05,{power:0})[0]!,0);
 const burn=1000e6/(17.6e6*1.602176634e-19);
 near(at('fuel-burn',1000)[0]!,burn/1e20);
 near(at('inventory',.05)[0]!,burn*19*100*3.016049282*1.66053906892e-27*1000);
});

test('equation dialog updates curves, preserves undefined results and returns focus',t=>{
 const dom=new JSDOM(equationMarkup(String.raw`P_\ell=N_\ell/N`,'collection')+equationMarkup(String.raw`v=r\Omega`,'speed'),{url:'https://example.org/guide.html'});t.after(()=>dom.window.close());
 const doc=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
 setupEquationPlots(doc);
 const source=doc.querySelector('button')!;source.click();
 const dialog=doc.querySelector('dialog')!,radius=dialog.querySelector<HTMLInputElement>('[name="radius"]')!;
 assert.equal(dialog.open,true);assert.match(dialog.textContent!,/Equation reference, not your run/);
 assert.equal(dialog.querySelector('[name="feed"]')!.previousElementSibling!.querySelector('output')!.textContent,'0.0759');
 const path=dialog.querySelector('.equation-line-0')!.getAttribute('d');
 const omega=dialog.querySelector<HTMLInputElement>('[name="omega"]')!;omega.value='0';omega.dispatchEvent(new dom.window.Event('input'));
 assert.notEqual(dialog.querySelector('.equation-line-0')!.getAttribute('d'),path);
 radius.value='0';radius.dispatchEvent(new dom.window.Event('input'));
 assert.match(dialog.querySelector('[data-equation-reading]')!.textContent!,/Light purity: undefined/);
 assert.doesNotMatch(dialog.innerHTML,/NaN|Infinity/);
 const tabs=[...dialog.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
 tabs[1].click();assert.equal(tabs[1].getAttribute('aria-selected'),'true');
 assert.equal(dialog.querySelector<HTMLElement>('#equation-plot-panel')!.hidden,true);
 assert.equal(dialog.querySelector<HTMLElement>('#equation-derivation-panel')!.hidden,false);
 assert.equal(dialog.querySelector('#equation-derivation-panel h3')!.textContent,equationDerivations.collection.title);
 tabs[1].focus();tabs[1].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 assert.equal(doc.activeElement,tabs[0]);assert.equal(tabs[0].getAttribute('aria-selected'),'true');
 assert.equal(radius.value,'0','tab switches must preserve plot inputs');
 for(const [key,index]of [['End',1],['Home',0],['ArrowLeft',1]] as const){
  doc.activeElement!.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true}));assert.equal(doc.activeElement,tabs[index]);
 }
 let escaped=false;doc.addEventListener('keydown',()=>{escaped=true;});
 dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(escaped,false);
 dialog.querySelector<HTMLButtonElement>('[data-equation-close]')!.click();assert.equal(dialog.open,false);assert.equal(doc.activeElement,source);
 const second=doc.querySelectorAll<HTMLButtonElement>('[data-equation-plot]')[1];second.click();
 assert.equal(tabs[0].getAttribute('aria-selected'),'true','a new equation starts on its plot');
 assert.equal(dialog.querySelector('#equation-derivation-panel h3')!.textContent,equationDerivations.speed.title,'a new equation must replace the previous derivation');
 assert.equal(dialog.querySelectorAll('#equation-derivation-panel li').length,3);
 assert.equal(doc.querySelectorAll('template')[0].content.querySelectorAll('li').length,4,'opening a derivation must not consume its template');
});
