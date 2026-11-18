import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import type {simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';

async function exported(page:Page){
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const pending=page.waitForEvent('download');await page.locator('#fuel-export').click();
 const download=await pending,path=await download.path();if(!path)throw new Error('Missing accepted-run download.');
 const bytes=await readFile(path),data=download.suggestedFilename().endsWith('.gz')?gunzipSync(bytes):bytes;
 return JSON.parse(data.toString()) as {result:ReturnType<typeof simulateFuelCentrifuge>};
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

test('guide: local links, native action and accessible reading layout',async({page})=>{
 await page.goto('/guide.html#goal');
 await page.getByRole('link',{name:'Every menu option is explained below'}).click();
 await expect(page.locator('#guide-chapter')).toHaveValue('views');
 await page.getByRole('link',{name:'§4',exact:true}).first().click();
 await expect(page.locator('#guide-chapter')).toHaveValue('momentum');
 await expect(page.locator('.katex-error')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 const audit=await new AxeBuilder({page}).analyze();expect(audit.violations).toEqual([]);
 await page.locator('a[href*="topic=momentum&try=spin"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('spin');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
});

for(const level of ['1','3','4'])test(`Advanced playground ${level} loads its production module`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`/?level=${level}`);await expect(page.locator('body')).toHaveAttribute('data-level',level);
 await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
