import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupExperience} from '../src/experience-ui.js';

test('active playground remains in its own navigation viewport after refresh and mobile resize',t=>{
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=2'}),{document}=window;
 for(const [key,value]of Object.entries({document,location:window.location,history:window.history})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 const navigation=document.querySelector<HTMLElement>('.level-navigation')!,primary=navigation.querySelector<HTMLButtonElement>(':scope > button')!,advanced=document.getElementById('advanced-simulators') as HTMLDetailsElement,summary=advanced.querySelector('summary')!;
 let width=300;
 Object.defineProperties(navigation,{clientWidth:{get:()=>width},clientLeft:{value:2}});
 navigation.getBoundingClientRect=()=>({left:20,right:24+width}) as DOMRect;
 for(const [node,offset,itemWidth]of [[primary,0,100],[summary,100,80]] as const)node.getBoundingClientRect=()=>{
  const left=22+offset-navigation.scrollLeft;return {left,right:left+itemWidth} as DOMRect;
 };
 for(const button of advanced.querySelectorAll<HTMLButtonElement>('button[data-level]'))button.getBoundingClientRect=()=>{assert.fail('Closed Advanced choices must reveal their visible summary, not a hidden button.');};
 // Native scrollIntoView may also scroll the page or open sheets; only this scrollport may move.
 window.HTMLElement.prototype.scrollIntoView=()=>{assert.fail('Navigation must not scroll its ancestors.');};
 window.scrollTo=()=>{assert.fail('Navigation must not scroll the document.');};
 document.body.scrollTop=42;document.documentElement.scrollTop=17;navigation.scrollTop=19;
 const ui=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){}});
 t.after(()=>{ui.dispose();window.close();});
 const focus=document.getElementById('share-playground')!;focus.focus();
 assert.equal(navigation.scrollLeft,0,'The desktop tab is already visible.');
 width=100;window.dispatchEvent(new window.Event('resize'));
 assert.equal(navigation.scrollLeft,0,'The first Centrifuge choice still fits the mobile viewport.');
 assert.equal(document.activeElement,focus);
 assert.equal(document.body.scrollTop,42);assert.equal(document.documentElement.scrollTop,17);assert.equal(navigation.scrollTop,19);
 window.dispatchEvent(new window.Event('resize'));assert.equal(navigation.scrollLeft,0,'An already visible choice must stay still.');
 navigation.scrollLeft=230;ui.refresh();assert.equal(navigation.scrollLeft,0,'Refreshing reveals the primary choice clipped on the left.');
 advanced.open=true;advanced.querySelector<HTMLButtonElement>('[data-level="3"]')!.click();
 assert.equal(advanced.open,false);assert.equal(document.activeElement,summary);
 assert.equal(navigation.scrollLeft,80,'An advanced playground reveals the visible Advanced summary.');
 window.dispatchEvent(new window.Event('resize'));assert.equal(navigation.scrollLeft,80,'An already visible summary must stay still.');
 navigation.scrollLeft=230;ui.refresh();assert.equal(navigation.scrollLeft,100,'Refreshing must reveal an active tab clipped on the left.');
 width=60;window.dispatchEvent(new window.Event('resize'));assert.equal(navigation.scrollLeft,100,'An oversized tab aligns to its start.');
 window.dispatchEvent(new window.Event('resize'));assert.equal(navigation.scrollLeft,100,'An oversized tab must not oscillate between edges.');
 ui.dispose();navigation.scrollLeft=0;window.dispatchEvent(new window.Event('resize'));assert.equal(navigation.scrollLeft,0,'Disposal removes the resize listener.');
});
