import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('main-page Docs & tutorials opens full-page readers and keeps their controls connected',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const button=page.getByRole('button',{name:'Docs & tutorials',exact:true});await expect(button).toBeInViewport();
 const start=page.getByRole('button',{name:'Start here',exact:true});
 const [docsBox,startBox]=await Promise.all([button.boundingBox(),start.boundingBox()]);
 expect(docsBox&&startBox&&docsBox.x>=startBox.x+startBox.width).toBeTruthy();
 const sceneBox=await page.locator('.world-stage>.world-group:not([hidden])').boundingBox();
 expect(docsBox&&sceneBox&&docsBox.y+docsBox.height<=sceneBox.y).toBeTruthy();
 await button.focus();const opened=page.waitForEvent('popup');await button.press('Enter');const reader=await opened;
 await expect(reader.locator('h1')).toHaveText('Docs & tutorials');
 for(const href of ['/guide.html','/tutorial-03.html','/tutorial-04.html','/tutorial-05.html','/tutorial-06.html','/how-it-works.html','/equilibrium.html','/qualification.html'])await expect(reader.locator(`main a[href="${href}"]`)).toBeVisible();
 expect(await reader.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 const current=await page.locator('#fuel-currentA').inputValue();
 await reader.locator('main a[href="/tutorial-03.html"]').click();await reader.locator('[data-guide-action="heatExperiment"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('#fuel-thermal-enabled')).toBeFocused();
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(reader.locator('#reader-status')).toContainText('Sent to the simulator');
 await button.click();await expect(reader.locator('h1')).toHaveText('Docs & tutorials');
 await reader.locator('main a[href="/how-it-works.html"]').click();await expect(reader.locator('h1')).toBeVisible();
 await info.attach('main-page-docs-button',{body:await page.locator('.world-reading').screenshot(),contentType:'image/png'});
 await info.attach('full-page-documentation',{body:await reader.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);await reader.close();
});

test('heat and collection illustrations explain direction and inventory with accessible working controls',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/tutorial-03.html#flow');const heat=page.locator('[data-heat-example]');
 await expect(heat.locator('[data-heat-motion]')).toBeEnabled();
 await heat.getByRole('button',{name:'Wall hotter',exact:true}).click();await expect(heat).toHaveAttribute('data-case','wall');
 await expect(heat.locator('[data-heat-reading]')).toContainText('flows inward');
 await heat.getByRole('button',{name:'Pause motion',exact:true}).click();await expect(heat).toHaveAttribute('data-motion','paused');
 await info.attach('heat-direction',{body:await heat.screenshot(),contentType:'image/png'});
 await heat.getByRole('button',{name:'Same temperature',exact:true}).click();await expect(heat.locator('[data-heat-reading]')).toContainText('no conductive heat flow');
 expect(await heat.locator('.heat-flow:visible').count()).toBe(0);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(heat.locator('[data-heat-motion]')).toBeEnabled();
 await expect(heat).toHaveAttribute('data-motion','paused');await expect(heat.locator('[data-heat-motion]')).toHaveText('Play motion');
 await page.goto('/tutorial-04.html#sample');const cut=page.locator('[data-collection-example]'),radius=cut.getByRole('slider');
 await expect(radius).toBeEnabled();await radius.press('Home');
 await expect(cut.locator('[data-cut-purity]')).toHaveText('undefined');await expect(cut.locator('[data-cut-recovery]')).toHaveText('0.0%');
 await radius.press('ArrowRight');await expect(cut.locator('[data-cut-light]')).toHaveText('<0.1');await expect(cut.locator('[data-cut-heavy]')).toHaveText('<0.1');
 await expect(cut.locator('[data-cut-recovery]')).toHaveText('<0.1%');await expect(cut.locator('[data-cut-purity]')).not.toHaveText('undefined');
 await radius.press('End');await expect(cut.locator('[data-cut-purity]')).toHaveText('50.0%');await expect(cut.locator('[data-cut-recovery]')).toHaveText('100.0%');
 for(let i=0;i<35;i++)await radius.press('ArrowLeft');await expect(radius).toHaveValue('65');
 await expect(cut.locator('[data-cut-purity]')).not.toHaveText('50.0%');
 await info.attach('collection-cut',{body:await cut.screenshot(),contentType:'image/png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(errors).toEqual([]);
});

test('numbered tutorials 03–06 render independently with readable diagrams, math and mobile navigation',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const part of ['03','04','05','06']){
  await page.goto(`/tutorial-${part}.html`);await expect(page.locator('h1')).toContainText(part);
  await expect(page.locator('figure svg')).not.toHaveCount(0);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  const target=await page.locator('#guide-chapter option').last().getAttribute('value');
  await page.locator('#guide-chapter').selectOption(target!);await expect(page.locator(`#${target}`)).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 }
 await info.attach('numbered-evidence-tutorial',{body:await page.screenshot(),contentType:'image/png'});expect(errors).toEqual([]);
});

test('one tutorial flow preserves predictions and gives keyboard access to optional explanations',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/start.html');
 await expect(page.locator('#learning-mode,[data-learning-controls]')).toHaveCount(0);
 const current=page.locator('section[aria-labelledby="current"]');
 await expect(current.locator('[data-learning-hint]')).toHaveAttribute('open','');
 await expect(current.locator('[data-learning-explanation]')).not.toHaveAttribute('open','');
 await current.locator('textarea').fill('The ions turn first; the neutrals follow.');
 const explanation=current.locator('[data-learning-explanation] summary');
 await explanation.focus();await explanation.press('Enter');
 await expect(current.locator('[data-learning-explanation]')).toHaveAttribute('open','');
 await explanation.press('Enter');
 await expect(current.locator('[data-learning-explanation]')).not.toHaveAttribute('open','');
 await expect(current.locator('textarea')).toHaveValue('The ions turn first; the neutrals follow.');
 await page.locator('#guide-chapter').selectOption('collection');
 await expect(page).toHaveURL(/#collection$/);
 await expect(current.locator('textarea')).toHaveValue('The ions turn first; the neutrals follow.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await info.attach('single-tutorial-flow',{body:await page.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('all investigation pages open independently with working navigation and no mobile overflow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 for(const name of ['learn','learn-controls','learn-transport','learn-thermal','learn-beam','learn-collection','learn-evidence']){
  await page.goto(`/${name}.html`);await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('#learning-mode,[data-learning-controls]')).toHaveCount(0);
  const last=page.locator('#guide-chapter option').last(),target=await last.getAttribute('value');
  await page.locator('#guide-chapter').selectOption(target!);
  await expect(page.locator(`#${target}`)).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 }
 await info.attach('evidence-investigation',{body:await page.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('reader navigation keeps its simulator connection and tutorial plot actions preserve accepted inputs',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const pending=page.waitForEvent('popup');await page.getByRole('button',{name:'Start here',exact:true}).click();
 const reader=await pending;
 await reader.getByRole('link',{name:'More investigations →',exact:true}).first().click();
 await reader.locator('a[href="/learn-transport.html"]').click();
 await reader.locator('[data-guide-action="separationPlot"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('separation');
 await expect(page.locator('#window-plots')).toBeVisible();
 if(await page.locator('#fuel-motion-play').getAttribute('aria-pressed')==='true')await page.locator('#fuel-motion-play').click();
 const time=await page.locator('#fuel-motion-time').inputValue();
 await reader.locator('[data-guide-action="momentum"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('momentum');
 await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
 await expect(reader.locator('#reader-status')).toContainText('Sent to the simulator');
 await reader.locator('[data-guide-action="pin"]').click();
 await reader.locator('[data-guide-action="drag"]').click();
 const drag=page.locator('#fuel-dragHz'),before=await drag.inputValue();
 await drag.press('ArrowRight');await expect(drag).not.toHaveValue(before);
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 if(!await page.locator('#window-view').isVisible())await page.getByRole('button',{name:'View',exact:true}).click();
 await expect(page.locator('.fuel-comparison-inputs')).toBeVisible();
 await expect(page.locator('.fuel-comparison-inputs')).toContainText('Neutral wall drag rate');
 await reader.close();
});

test('an independently opened reader reconnects across guide navigation without resetting its simulator',async({page})=>{
 await page.goto('/start.html');
 const pending=page.waitForEvent('popup');await page.getByRole('link',{name:'Simulator ↗',exact:true}).click();
 const simulator=await pending;
 await expect(simulator.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await simulator.getByRole('button',{name:'Controls',exact:true}).click();
 const current=simulator.locator('#fuel-currentA'),before=await current.inputValue();
 await current.focus();await current.press('ArrowRight');await expect(current).not.toHaveValue(before);
 await expect(simulator.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const edited=await current.inputValue();
 await simulator.getByRole('button',{name:'Close Controls',exact:true}).click();
 await expect(simulator.locator('#window-controls')).not.toBeVisible();let navigations=0;
 simulator.on('framenavigated',frame=>{if(frame===simulator.mainFrame())navigations++;});
 await page.getByRole('banner').getByRole('link',{name:'Physics & equations →',exact:true}).click();
 await page.locator('[data-guide-action="work"]').click();
 await expect(simulator.locator('#window-plots')).toBeVisible();
 await expect(simulator.locator('#fuel-plot')).toHaveValue('heat');
 await expect(current).toHaveValue(edited);expect(navigations).toBe(0);
 await expect(page.locator('#reader-status')).toContainText('Sent to the simulator');
 await simulator.close();
});

test('tutorial experiment links put relevant controls and results within one action on desktop and phone',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const opened=page.waitForEvent('popup');await page.getByRole('button',{name:'Start here',exact:true}).click();const reader=await opened;
 await reader.goto('/tutorial-03.html#budget');const current=await page.locator('#fuel-currentA').inputValue();
 await reader.locator('[data-guide-action="heatExperiment"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('#fuel-thermal-enabled')).toBeFocused();
 await expect(page.locator('#fuel-thermal-enabled')).not.toBeChecked();await expect(page.locator('#fuel-currentA')).toHaveValue(current);
 await page.getByRole('button',{name:'Show temperature',exact:true}).click();
 await expect(page.locator('#window-plots')).toBeVisible();await expect(page.locator('#fuel-plot')).toHaveValue('thermal');
 await reader.locator('[data-guide-action="spatialHeatExperiment"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('.guide-experiment')).toContainText('Spatial mixture');
 await expect(page.locator('#fuel-thermal-model')).toBeVisible();await expect(page.locator('#fuel-thermal-gasModel')).toBeVisible();
 await reader.goto('/tutorial-04.html#stages');await reader.locator('[data-guide-action="stageExperiment"]').click();
 await expect(page.locator('#fuel-stages')).toBeFocused();await page.getByRole('button',{name:'Show stages',exact:true}).click();
 await expect(page.locator('#fuel-plot')).toHaveValue('cascade');await expect(page.locator('#window-plots')).toBeVisible();
 await reader.locator('[data-guide-action="pumpingExperiment"]').click();
 await expect(page.locator('#fuel-application')).toBeFocused();await expect(page.locator('#fuel-pumpSpeedM3S')).toBeVisible();
 await reader.goto('/tutorial-05.html#inventory');await reader.locator('[data-guide-action="inventoryExperiment"]').click();
 await expect(page.locator('#fuel-burnFraction')).toBeFocused();await expect(page.locator('#fuel-loopTimeS')).toBeVisible();
 await info.attach('tutorial-controls-ready',{body:await page.locator('#window-controls').screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'Show fuel inventory',exact:true}).click();await expect(page.locator('#fuel-plot')).toHaveValue('inventory');
 await reader.goto('/learn-beam.html');await reader.locator('[data-guide-action="beamSource"]').click();
 await expect(page.locator('#fusion-beamCurrentA')).toBeFocused();await expect(page.locator('#marathon-apparatus')).toHaveValue('source');
 await page.getByRole('button',{name:'Show source energy ledger',exact:true}).click();await expect(page.locator('#fusion-plots')).toBeVisible();
 await reader.locator('[data-guide-action="beamTarget"]').click();
 await expect(page.locator('#coupled-pulseDuty')).toBeFocused();await expect(page.locator('#coupled-view-settings')).toBeVisible();
 await page.getByRole('button',{name:'Show target dynamics',exact:true}).click();await expect(page.locator('#coupled-view-dynamics')).toBeVisible();
 expect(errors).toEqual([]);await reader.close();
});
