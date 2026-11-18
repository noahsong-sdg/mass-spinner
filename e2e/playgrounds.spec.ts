import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import type {AcceptedFuelSnapshot} from '../src/fuel-comparison-ui.ts';

async function dimensionLabelsDoNotOverlap(page:Page,host:string){
 const note=await page.locator(`${host} .apparatus-scale-note`).boundingBox(),disclosure=await page.locator(`${host} .apparatus-provenance`).boundingBox();
 expect(note).not.toBeNull();expect(disclosure).not.toBeNull();
 expect(note!.x+note!.width<=disclosure!.x||disclosure!.x+disclosure!.width<=note!.x||note!.y+note!.height<=disclosure!.y||disclosure!.y+disclosure!.height<=note!.y).toBe(true);
}

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

test('four gas modes reveal their geometry and explain their physical scope',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 for(const [mode,representation,reading]of [['equilibrium','both','Ideal settled'],['spin','tracers','Blue: ions'],['flow','tracers','dashed routes'],['transport','both','equal-count']] as const){
  await page.locator('#fuel-motion-mode').selectOption(mode);
  if(mode==='spin'||mode==='transport')await page.locator('#fuel-motion-time').press('End');
  await expect(page.locator('#fuel-mode-reading')).toContainText(reading);
  await page.getByRole('button',{name:'View',exact:true}).click();
  await expect(page.locator('#fuel-view-representation')).toHaveValue(representation);
  await page.getByRole('button',{name:'Close View',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await info.attach(`gas-mode-${mode}`,{body:await page.screenshot(),contentType:'image/png'});
 }
 expect(errors).toEqual([]);
});

test('Start here opens a full-page walkthrough while preserving the running simulator',async({page},info)=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:'Plots',exact:true}).click();const before=await exported(page);await page.getByRole('button',{name:'Close Plots',exact:true}).click();
 const popup=page.waitForEvent('popup');
 await page.getByRole('button',{name:'Start here',exact:true}).click();const reader=await popup;
 await expect(reader).toHaveURL(/\/start(?:\.html)?$/);
 await expect(reader.getByRole('heading',{name:'Can the current make the gas turn?',exact:true})).toBeVisible();
 await expect(reader.locator('iframe')).toHaveCount(0);await expect(page.locator('#window-guide')).toBeHidden();
 await reader.locator('[data-guide-action="endSpin"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('spin');await expect(page.locator('#window-plots')).toBeVisible();
 const after=await exported(page);expect(after.result).toEqual(before.result);
 expect(await reader.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect((await new AxeBuilder({page:reader}).analyze()).violations).toEqual([]);
 await info.attach('standalone-start-guide',{body:await reader.screenshot(),contentType:'image/png'});await reader.close();
});

test('Marathon reference geometry discloses paper dimensions and unknown hardware size',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');
 await page.getByRole('button',{name:'Reactor',exact:true}).click();
 await expect(page.locator('#show-reactor')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#fusion-apparatus canvas')).toBeVisible();
 await page.locator('#marathon-apparatus').selectOption('blanket');
 await expect(page.locator('#blanket-render canvas')).toBeVisible();
 const blanket=page.locator('#blanket-render');
 await expect(blanket.locator('.apparatus-scale')).toHaveCount(0);
 await expect(blanket.locator('.apparatus-scale-note')).toHaveText('Power reference · R 4.2 m · a 1.2 m · outer hardware conceptual');
 await blanket.getByLabel('Geometry and material fidelity',{exact:true}).click();
 await expect(blanket.locator('.apparatus-provenance')).toContainText('not as-built');
 await dimensionLabelsDoNotOverlap(page,'#blanket-render');
 await expect(blanket.getByRole('link',{name:'Dimension source ↗'})).toHaveAttribute('href','https://www.marathonfusion.com/alchemy.pdf#page=13');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('blanket-paper-dimensions',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 await page.locator('#window-inspect [aria-label="Inspect a component"]:visible').selectOption('tf-coils');
 await expect(page.locator('#window-inspect')).toContainText('Toroidal-field magnets');
 await expect(page.locator('#window-inspect')).toContainText('unspecified');
 await page.getByRole('button',{name:'Close Inspect',exact:true}).click();
 await page.locator('#marathon-apparatus').selectOption('source');
 const beam=page.locator('#fusion-apparatus');
 await expect(beam.locator('canvas')).toBeVisible();
 await expect(beam.locator('.apparatus-scale')).toHaveCount(0);
 await expect(beam.locator('.apparatus-scale-note')).toHaveText('Assumed dimensions · not published');
 await beam.getByLabel('Geometry and material fidelity',{exact:true}).click();
 await expect(beam.locator('.apparatus-provenance')).toContainText('dimensions are not published');
 await dimensionLabelsDoNotOverlap(page,'#fusion-apparatus');
 await expect(beam.locator('.apparatus-provenance')).not.toContainText('210 mm');
 expect(errors).toEqual([]);
});

test('reactor internals respond to source controls and distinguish normalized power reference',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await page.getByRole('button',{name:'Reactor',exact:true}).click();
 const processes=page.locator('#fusion-apparatus .reactor-processes');
 await expect(processes).toHaveAttribute('data-basis','initial source');
 const initial=Number(await processes.getAttribute('data-beam-count'));expect(initial).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Controls',exact:true}).click();await page.locator('#fusion-beamCurrentA').press('ArrowRight');
 await expect.poll(async()=>Number(await processes.getAttribute('data-beam-count'))).toBeGreaterThan(initial);
 await page.locator('#fusion-beamEnergyKeV').press('ArrowRight');await expect(processes).toHaveAttribute('data-energy-ke-v','105');
 await page.locator('#fusion-target-enabled').uncheck();await expect(processes).toHaveAttribute('data-neutron-count','0');
 expect(Number(await processes.getAttribute('data-heat-w'))).toBeGreaterThan(0);
 await page.locator('#fusion-beam-enabled').uncheck();await expect(processes).toHaveAttribute('data-beam-count','0');await expect(processes).toHaveAttribute('data-heat-w','0');
 await page.locator('#fusion-target-enabled').check();await page.locator('#fusion-beam-enabled').check();
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await processes.locator('summary').click();await expect(processes).toContainText('slowed separately');
 await expect(processes.getByRole('button',{name:'Pause motion',exact:true})).toBeDisabled();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(processes.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();
 await processes.getByRole('button',{name:'Pause motion',exact:true}).click();
 await expect(processes.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 await processes.locator('summary').click();await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Target',exact:true}).click();
 await page.getByRole('button',{name:'Use material model',exact:true}).click();
 await expect(processes).toHaveAttribute('data-basis','selected target state',{timeout:30_000});
 await expect(page.locator('#coupled-time')).toBeEnabled();await page.locator('#coupled-time').press('End');
 await page.getByRole('button',{name:'Close Target',exact:true}).click();
 await processes.locator('summary').click();
 await expect(processes.locator('.reactor-heat svg')).toBeVisible();
 await expect(processes.locator('.reactor-heat figcaption')).toHaveText('Heat flow · depth expanded separately');
 await expect(processes).toHaveAttribute('data-heat-direction','toward coolant');
 expect(Number(await processes.getAttribute('data-coolant-w'))).toBeGreaterThan(0);
 const heatWidth=await processes.locator('.reactor-heat svg').evaluate(node=>node.getBoundingClientRect().width);expect(heatWidth).toBeGreaterThanOrEqual(240);
 await processes.locator('summary').click();
 await info.attach('beam-live-processes',{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('#marathon-apparatus').selectOption('blanket');
 const reference=page.locator('#blanket-render .reactor-processes');await expect(reference).toHaveAttribute('data-basis','power-reference');
 await reference.locator('summary').click();await expect(reference).toContainText('not calculated');await expect(reference).toHaveAttribute('data-beam-count','0');
 await expect(reference.getByLabel('Show beam',{exact:true})).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('guide: local links, native action and accessible reading layout',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/guide.html#goal');
 await page.getByRole('link',{name:'Every menu option is explained below'}).click();
 await expect(page.locator('#guide-chapter')).toHaveValue('views');
 await page.getByRole('link',{name:'§4',exact:true}).first().click();
 await expect(page.locator('#guide-chapter')).toHaveValue('momentum');
 await expect(page.locator('.katex-error')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 const audit=await new AxeBuilder({page}).analyze();expect(audit.violations).toEqual([]);
 const popup=page.waitForEvent('popup');await page.locator('a[href*="topic=momentum&try=spin"]').click();const simulator=await popup;
 await expect(simulator.locator('#fuel-plot')).toHaveValue('spin');await expect(simulator.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 expect(errors).toEqual([]);await simulator.close();
});

for(const level of ['1','3','4'])test(`Advanced playground ${level} loads its production module`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`/?level=${level}`);await expect(page.locator('body')).toHaveAttribute('data-level',level);
 await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('control tutorial changes the existing run through the separate reader',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Start here',exact:true}).click();const reader=await popup;
 await reader.locator('[data-guide-action="currentExperiment"]').click();
 await expect(page.locator('#fuel-currentA')).toBeFocused();await page.locator('#fuel-currentA').press('Home');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await reader.locator('[data-guide-action="endSpin"]').click();
 const zero=await exported(page);expect(zero.result.config.currentA).toBe(0);expect(zero.result.transport!.snapshots.at(-1)!.neutralRadS).toBe(0);
 await reader.locator('[data-guide-action="currentExperiment"]').click();
 await page.getByRole('button',{name:'Set Radial discharge current precisely',exact:true}).click();
 const current=page.getByRole('spinbutton',{name:'Radial discharge current (A)',exact:true});await current.fill('0.03');await current.press('Enter');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});await reader.locator('[data-guide-action="endSpin"]').click();
 const driven=await exported(page);expect(driven.result.config.currentA).toBe(.03);expect(driven.result.transport!.snapshots.at(-1)!.neutralRadS).toBeGreaterThan(0);
 expect(driven.result.config.durationS).toBe(zero.result.config.durationS);await expect(page.locator('#window-guide')).toBeHidden();await reader.close();
});

test('Inspect: liner reference changes its response without changing gas temperature',async({page},info)=>{
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 await page.locator('#fuel-component').selectOption('liner');
 await expect(page.locator('#fuel-inspect [data-effect]')).toContainText('Thermal evolution is off');
 await expect(page.locator('#fuel-inspect input')).toHaveCount(0);
 await page.locator('#fuel-inspect [data-control="linerK"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();
 await expect(page.locator('#fuel-linerK')).toBeFocused();
 await page.getByRole('button',{name:'Set Initial / reference liner temperature precisely',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Initial / reference liner temperature (K)',exact:true}).fill('1200');
 await page.getByRole('button',{name:'Apply Initial / reference liner temperature',exact:true}).click();
 await expect(page.locator('#fuel-inspect [data-show-response]')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await page.getByRole('button',{name:'Show liner vapor pressure',exact:true}).click();
 await expect(page.locator('#fuel-plot')).toHaveValue('lithium');
 await expect(page.locator('#fuel-plots .plot-readout')).toContainText('1200,');
 const liner=await exported(page);expect(liner.result.config.linerK).toBe(1200);expect(liner.result.config.gasK).toBe(500);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('component-response',{body:await page.screenshot(),contentType:'image/png'});
});
