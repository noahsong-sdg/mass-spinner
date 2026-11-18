import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import type {AcceptedFuelSnapshot} from '../src/fuel-comparison-ui.ts';

async function exported(page:Page){
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const pending=page.waitForEvent('download');await page.locator('#fuel-export').click();
 const download=await pending,path=await download.path();if(!path)throw new Error('Missing accepted-run download.');
 const bytes=await readFile(path),data=download.suggestedFilename().endsWith('.gz')?gunzipSync(bytes):bytes;
 return JSON.parse(data.toString()) as Pick<AcceptedFuelSnapshot,'result'>;
}

test('centrifuge: accepted controls, timeline, plots, hardware and keyboard navigation',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 await expect(page.locator('#fuel-render .fuel-status')).not.toContainText('unavailable');
 await page.getByRole('button',{name:'Plots',exact:true}).click();
 const before=await exported(page);
 await page.getByRole('button',{name:'Close Plots',exact:true}).click();
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 const changedAt=Date.now();
 const field=page.locator('#fuel-magneticT'),maximum=Number(await field.getAttribute('max'));
 await field.press('End');
 await expect(field).toHaveValue(String(maximum));
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await page.getByRole('button',{name:'Plots',exact:true}).click();
 const after=await exported(page);
 const controlLatencyMS=Date.now()-changedAt;
 expect(after.result.config.magneticT).toBe(maximum);
 expect(after.result.mechanics.torque).toBeCloseTo(maximum/before.result.config.magneticT*before.result.mechanics.torque,12);
 if(await page.locator('#fuel-motion-play').getAttribute('aria-pressed')==='true')await page.locator('#fuel-motion-play').click();
 await page.locator('#fuel-plot').selectOption('momentum');
 await page.locator('#fuel-motion-time').press('Home');
 const start=await page.locator('#fuel-plots').innerHTML();
 await page.locator('#fuel-motion-time').press('End');
 await expect.poll(()=>page.locator('#fuel-plots').innerHTML()).not.toBe(start);
 await expect(page.locator('#fuel-plots svg').first()).toBeVisible();
 await page.getByRole('button',{name:'Close Plots',exact:true}).click();
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 await page.locator('#fuel-component').selectOption('coils');
 await expect(page.locator('#fuel-inspect')).toContainText('Materials & model');
 await page.getByRole('button',{name:'Frame component',exact:true}).click();
 await page.getByRole('button',{name:'Close Inspect',exact:true}).click();
 await expect(page.locator('body')).toHaveAttribute('data-level','2');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('centrifuge',{body:await page.screenshot(),contentType:'image/png'});
 const assets=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/models/')).map(e=>{const r=e as PerformanceResourceTiming;return {url:r.name,durationMS:r.duration,bytes:r.decodedBodySize};}));
 expect(assets.some(r=>r.bytes>0&&r.bytes<=1_200_000)).toBe(true);
 await info.attach('performance',{body:JSON.stringify({backend:'Chromium software ANGLE/SwiftShader',controlLatencyMS,assets}),contentType:'application/json'});
 expect(errors).toEqual([]);
});

test('gas cutaway: live density, movable slice and rotation-averaged samples',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 if(await page.locator('#fuel-motion-play').getAttribute('aria-pressed')==='true')await page.locator('#fuel-motion-play').click();
 await page.locator('#fuel-motion-time').press('End');
 await page.getByRole('button',{name:'View',exact:true}).click();
 await page.locator('#fuel-view-representation').selectOption('both');
 await page.locator('#fuel-view-layer').selectOption('density');
 await page.getByRole('spinbutton',{name:'Axial position / length precisely'}).fill('0.25');
 await expect(page.locator('#fuel-view-slice')).toHaveValue('0.25');
 await page.locator('#fuel-view details').getByText('Assembly',{exact:true}).click();
 await page.getByRole('button',{name:'Cutaway',exact:true}).click();
 await expect(page.locator('#fuel-view .fuel-probe')).not.toContainText('NaN');
 await page.getByRole('button',{name:'Close View',exact:true}).click();
 await info.attach('gas-density-cutaway',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'View',exact:true}).click();
 await page.locator('#fuel-view-representation').selectOption('tracers');
 await page.getByRole('button',{name:'Close View',exact:true}).click();
 await expect(page.locator('.fuel-gas-2')).toContainText('rotation averaged');
 await info.attach('gas-density-samples',{body:await page.screenshot(),contentType:'image/png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('human scale: person comparison and return to apparatus close-up',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 if(await page.locator('#fuel-motion-play').getAttribute('aria-pressed')==='true')await page.locator('#fuel-motion-play').click();
 const button=page.getByRole('button',{name:'Human scale: 5 foot 9 person',exact:true});
 await expect(button).toHaveAttribute('aria-pressed','false');await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');await expect(button).toHaveText('5′9″ · 1.75 m');
 await expect.poll(async()=>{
  const frame=await page.locator('#fuel-render > .apparatus-frame').boundingBox(),panel=await page.locator('.fuel-motion').boundingBox();
  return frame&&panel?frame.y+frame.height<=panel.y:false;
 }).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('human-scale',{body:await page.screenshot(),contentType:'image/png'});
 await button.click();await expect(button).toHaveAttribute('aria-pressed','false');expect(errors).toEqual([]);
});

test('guide: local links, native action and accessible reading layout',async({page,context},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/guide.html#goal');
 await page.getByRole('link',{name:'Every menu option is explained below'}).click();
 await expect(page.locator('#guide-chapter')).toHaveValue('views');
 await page.getByRole('link',{name:'§4',exact:true}).first().click();
 await expect(page.locator('#guide-chapter')).toHaveValue('momentum');
 await expect(page.locator('.katex-error')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 const audit=await new AxeBuilder({page}).analyze();expect(audit.violations).toEqual([]);
 const profiler=await context.newCDPSession(page);
 await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
 try{
  await page.locator('a[href*="topic=momentum&try=spin"]').click();
  await expect(page.locator('#fuel-plot')).toHaveValue('spin');
  await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
  expect(errors).toEqual([]);
 }finally{
  const {profile}=await profiler.send('Profiler.stop');
  await info.attach('guide-startup.cpuprofile',{body:JSON.stringify(profile),contentType:'application/json'});
  await profiler.detach();
 }
});

for(const level of ['1','3','4'])test(`Advanced playground ${level} loads its production module`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`/?level=${level}`);await expect(page.locator('body')).toHaveAttribute('data-level',level);
 await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('control tutorial: zero drive and driven endpoint',async({page})=>{
 await page.goto('/?level=2&guide=start&try=currentExperiment');
 await expect(page.locator('#fuel-currentA')).toBeFocused({timeout:30_000});
 await page.locator('#fuel-currentA').press('Home');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 if(await page.locator('#window-guide').isHidden())await page.getByRole('button',{name:'Start here',exact:true}).click();
 await page.getByRole('button',{name:'Show end-of-run speeds',exact:true}).click();
 const zero=await exported(page);
 expect(zero.result.config.currentA).toBe(0);
 expect(zero.result.transport!.snapshots.at(-1)!.neutralRadS).toBe(0);
 await page.getByRole('button',{name:'Close Plots',exact:true}).click();
 // Start here can remain open in a desktop column and becomes a single sheet on a phone.
 if(await page.locator('#window-guide').isHidden())await page.getByRole('button',{name:'Start here',exact:true}).click();
 await page.getByRole('button',{name:'Start from rest & edit current',exact:true}).click();
 await page.getByRole('button',{name:'Set Radial discharge current precisely',exact:true}).click();
 const current=page.getByRole('spinbutton',{name:'Radial discharge current (A)',exact:true});
 await current.fill('0.03');await current.press('Enter');
 await expect(page.locator('#fuel-currentA')).toHaveValue('0.03');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 if(await page.locator('#window-guide').isHidden())await page.getByRole('button',{name:'Start here',exact:true}).click();
 await page.getByRole('button',{name:'Show end-of-run speeds',exact:true}).click();
 const driven=await exported(page);
 expect(driven.result.config.currentA).toBe(.03);
 expect(driven.result.transport!.snapshots.at(-1)!.neutralRadS).toBeGreaterThan(0);
 expect(driven.result.config.durationS).toBe(zero.result.config.durationS);
 await expect(page.locator('#fuel-plots .plot-readout')).toContainText('Neutrals: 1,');
 await page.getByRole('button',{name:'Close Plots',exact:true}).click();
});

test('Inspect: liner reference changes its response without changing gas temperature',async({page},info)=>{
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 await page.locator('#fuel-component').selectOption('liner');
 await expect(page.locator('#fuel-inspect [data-effect]')).toContainText('Thermal evolution is off');
 await page.getByRole('spinbutton',{name:'Initial / reference liner temperature (K) precisely'}).fill('1200');
 await expect(page.locator('#fuel-inspect [data-show-response]')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Show liner vapor pressure',exact:true}).click();
 await expect(page.locator('#fuel-plot')).toHaveValue('lithium');
 await expect(page.locator('#fuel-plots .plot-readout')).toContainText('1200,');
 const liner=await exported(page);expect(liner.result.config.linerK).toBe(1200);expect(liner.result.config.gasK).toBe(500);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('component-response',{body:await page.screenshot(),contentType:'image/png'});
});
