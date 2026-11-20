import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {floatingPlayback} from '../src/floating-playback.js';

const rect=(top:number,height:number)=>({left:0,top,width:800,height,right:800,bottom:top+height,x:0,y:top,toJSON(){}});
function fixture(t:{after:(fn:()=>void)=>void},saved?:string,mounted=true){
 const dom=new JSDOM('<main class="sim-workspace" style="--world-bottom:100px"><section><div class="fuel-motion"></div></section><nav class="world-dock"></nav></main>',{url:'https://example.org'});
 const win=dom.window,parent=win.document.querySelector('section')!,panel=win.document.querySelector('.fuel-motion') as HTMLElement,dock=win.document.querySelector('nav')!;
 let height=436,dockTop=700;const observers=new Map<Element,()=>void>();
 Object.defineProperty(win,'ResizeObserver',{value:class{constructor(private callback:()=>void){}observe(target:Element){observers.set(target,this.callback);}disconnect(){}}});
 parent.getBoundingClientRect=()=>rect(64,height);
 panel.getBoundingClientRect=()=>({...rect(64+(parseFloat(panel.style.top)||64),120),width:400,right:400});
 dock.getBoundingClientRect=()=>rect(dockTop,56);
 const workspace=win.document.querySelector('main')!;if(!mounted)workspace.classList.remove('sim-workspace');
 if(saved)win.localStorage.setItem('mass-spinner-playback-v1',saved);
 const ui=floatingPlayback(panel),grip=panel.querySelector('button')!;
 t.after(()=>{ui.dispose();dom.window.close();});
 return {panel,parent,dock,win,grip,ui,
  down(){for(let i=0;i<40;i++)grip.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));},
  resize(value:number){height=value;observers.get(parent)?.();},
  resizeDock(value:number){dockTop=value;observers.get(dock)?.();},
  mount(){workspace.classList.add('sim-workspace');ui.refresh();},
  bottom:()=>panel.getBoundingClientRect().bottom};
}

test('tutorial playback reaches the scene bottom without reserving the dock twice',t=>{
 const f=fixture(t);f.down();
 assert.equal(f.bottom(),f.parent.getBoundingClientRect().bottom-8);
});

test('playback finds the workspace assembled after control initialization',t=>{
 const f=fixture(t,undefined,false);f.mount();f.resize(736);f.down();
 assert.equal(f.bottom(),688);
 f.resizeDock(650);assert.equal(f.bottom(),638);
});

test('full-height playback keeps the dock clear and responds to a taller dock',t=>{
 const f=fixture(t);f.resize(736);f.down();
 assert.equal(f.bottom(),f.dock.getBoundingClientRect().top-12);
 f.resizeDock(650);assert.equal(f.bottom(),638);
});

test('saved bottom placement follows scene size and keeps version-one positions valid',t=>{
 const f=fixture(t,'{"version":1,"x":0.5,"y":1}');
 assert.equal(f.bottom(),492);
 f.resize(736);assert.equal(f.bottom(),688);
 f.resize(436);assert.equal(f.bottom(),492);
 f.grip.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 assert.equal(f.panel.style.top,'');assert.equal(f.win.localStorage.getItem('mass-spinner-playback-v1'),null);
});
