import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {floatingPlayback} from '../src/floating-playback.js';

const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){}});
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function fixture(t:any,saved?:string){
 const dom=new JSDOM('<main class="sim-workspace"><section class="world-stage"><div id="fuel-render"><div class="apparatus-frame"></div><div class="fuel-motion"><input type="range"></div></div></section></main>',{url:'https://example.org'});
 const win=dom.window,doc=win.document,parent=doc.querySelector('#fuel-render') as HTMLElement,panel=doc.querySelector('.fuel-motion') as HTMLElement;
 let width=320,panelTop=451,panelHeight=199,resize=()=>{};
 Object.defineProperty(win,'innerWidth',{get:()=>width});
 Object.defineProperty(win,'ResizeObserver',{value:class{constructor(callback:()=>void){resize=callback;}observe(){}disconnect(){}}});
 parent.getBoundingClientRect=()=>rect(0,64,width,676);
 panel.getBoundingClientRect=()=>rect(parseFloat(panel.style.left)||8,panel.style.top?64+parseFloat(panel.style.top):panelTop,width-16,panelHeight);
 if(saved)win.localStorage.setItem('mass-spinner-playback-v1',saved);
 const ui=floatingPlayback(panel),grip=panel.querySelector('button')!;
 t.after(()=>{ui.dispose();dom.window.close();});
 return {dom,doc,parent,panel,grip,ui,inset:()=>parent.style.getPropertyValue('--fuel-playback-inset'),resizePanel(top:number,height:number){panelTop=top;panelHeight=height;resize();},viewport(value:number){width=value;win.dispatchEvent(new win.Event('resize'));}};
}

test('mobile camera allocation reserves the measured default playback and dock footprint',t=>{
 const f=fixture(t);
 assert.equal(f.inset(),'297px'); // Parent bottom740 − panel top451 + eight-pixel gap.
 f.resizePanel(396,254);assert.equal(f.inset(),'352px','wrapped controls resize the reserved footprint');
 const style=f.doc.createElement('style');style.textContent=readFileSync('src/fuel-playground.css','utf8');f.doc.head.append(style);
 const media=[...style.sheet!.cssRules].find((r:any)=>r.conditionText?.includes('600px')) as CSSMediaRule;
 assert.ok(media,'reservation is limited to mobile layout');
 const rule=[...media.cssRules].find((r:any)=>r.selectorText?.replace(/\s*>\s*/g,'>')==='.world-stage #fuel-render:not(.fuel-comparing)>.apparatus-frame') as CSSStyleRule;
 assert.ok(rule);
 assert.equal(rule.style.getPropertyValue('bottom'),'var(--fuel-playback-inset,0px)');
 assert.equal(rule.style.getPropertyValue('height'),'auto','camera frame consumes the unobscured height');
 f.viewport(1000);assert.equal(f.inset(),'0px','desktop retains its full apparatus allocation');
 f.viewport(320);assert.equal(f.inset(),'352px');
});

test('free placement releases mobile reservation and Home restores measured default composition',t=>{
 const f=fixture(t);
 f.grip.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
 assert.ok(f.panel.classList.contains('fuel-motion-moved'));assert.equal(f.inset(),'0px');
 f.grip.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 assert.equal(f.panel.classList.contains('fuel-motion-moved'),false);assert.equal(f.inset(),'297px');
 const restored=fixture(t,'{"version":1,"x":0.5,"y":0.5}');
 assert.equal(restored.inset(),'0px','saved user placement retains full camera allocation');
 restored.ui.reset();assert.equal(restored.inset(),'297px');
});

test('hidden playback and split comparisons release reservation without requiring a window resize',async t=>{
 const f=fixture(t);assert.equal(f.inset(),'297px');
 f.panel.hidden=true;await flush();assert.equal(f.inset(),'0px');
 f.panel.hidden=false;await flush();assert.equal(f.inset(),'297px');
 f.parent.classList.add('fuel-comparing');await flush();assert.equal(f.inset(),'0px','comparison half-panes keep their separate composition');
 f.parent.classList.remove('fuel-comparing');await flush();assert.equal(f.inset(),'297px');
 f.ui.dispose();assert.equal(f.inset(),'');
});
