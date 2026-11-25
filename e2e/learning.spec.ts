import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function readerFrame(page:Page){
 await expect(page.locator('#window-guide')).toBeVisible();
 const iframe=await page.locator('#physics-guide-frame').elementHandle();
 const reader=await iframe!.contentFrame();
 if(!reader)throw new Error('Missing simulator tutorial frame.');
 await expect(reader.locator('h1')).toBeVisible();
 return reader;
}

async function openReader(page:Page){
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 return readerFrame(page);
}

test('main-page Docs & tutorials keeps the reader and controls in one workspace',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const button=page.getByRole('button',{name:'Docs & tutorials',exact:true});await expect(button).toBeInViewport();
 await expect(page.getByRole('button',{name:'Start here',exact:true})).toHaveCount(0);
 const docsBox=await button.boundingBox();
 const sceneBox=await page.locator('.world-stage>.world-group:not([hidden])').boundingBox();
 expect(docsBox&&sceneBox&&docsBox.y+docsBox.height<=sceneBox.y).toBeTruthy();
 const pages=page.context().pages().length;
 await button.focus();await button.press('Enter');const reader=await readerFrame(page);
 expect(page.context().pages()).toHaveLength(pages);
 await expect(reader.locator('h1')).toHaveText('Docs & tutorials');
 for(const href of ['/guide.html','/tutorial-03.html','/tutorial-04.html','/tutorial-05.html','/tutorial-06.html','/how-it-works.html','/equilibrium.html','/qualification.html'])await expect(reader.locator(`main a[href="${href}"]`)).toBeVisible();
 expect(await reader.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 const current=await page.locator('#fuel-currentA').inputValue();
 await reader.locator('main a[href="/tutorial-03.html"]').click();await reader.locator('[data-guide-action="heatExperiment"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('#fuel-thermal-enabled')).toBeFocused();
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(reader.locator('#reader-status')).toBeEmpty();
 await expect(page.locator('#window-guide')).toBeVisible();
 await button.click();await expect(page.locator('#window-guide')).toBeHidden();
 await button.click();await expect(page.locator('#window-guide')).toBeVisible();
 await expect(reader.locator('h1')).toContainText('Tutorial 3');
 await reader.goto('/learn.html');
 await reader.locator('main a[href="/how-it-works.html"]').click();await expect(reader.locator('h1')).toBeVisible();
 await info.attach('main-page-docs-button',{body:await page.locator('.world-reading').screenshot(),contentType:'image/png'});
 await info.attach('attached-documentation',{body:await reader.locator('body').screenshot(),contentType:'image/png'});
 expect(page.context().pages()).toHaveLength(pages);expect(errors).toEqual([]);
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
 await heat.getByRole('button',{name:'Same temperature',exact:true}).click();await expect(heat.locator('[data-heat-reading]')).toContainText('no heat flow by conduction');
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
  await page.goto(`/tutorial-${part}.html`);await expect(page.locator('h1')).toContainText(`Tutorial ${Number(part)}`);
  await expect(page.locator('figure svg')).not.toHaveCount(0);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  const link=page.locator('.guide-contents a').last(),target=await link.getAttribute('href');
  await link.click();await expect(page.locator(target!)).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 }
 await info.attach('numbered-evidence-tutorial',{body:await page.screenshot(),contentType:'image/png'});expect(errors).toEqual([]);
});

test('concise tutorials have linked contents and keyboard access to optional explanations',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/start.html#current');
 await expect(page.locator('#learning-mode,[data-learning-controls]')).toHaveCount(0);
 const current=page.locator('section[aria-labelledby="current"]');
 await expect(page.locator('textarea,[data-learning-hint],#guide-chapter')).toHaveCount(0);
 await expect(current.locator('[data-learning-explanation]')).not.toHaveAttribute('open','');
 const explanation=current.locator('[data-learning-explanation] summary');
 await explanation.focus();await explanation.press('Enter');
 await expect(current.locator('[data-learning-explanation]')).toHaveAttribute('open','');
 await explanation.press('Enter');
 await expect(current.locator('[data-learning-explanation]')).not.toHaveAttribute('open','');
 await page.locator('.guide-contents a[href="#collection"]').click();
 await expect(page).toHaveURL(/#collection$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await info.attach('single-tutorial-flow',{body:await page.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('documentation index omits investigations and loads local typography without mobile overflow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 for(const name of ['learn']){
  await page.goto(`/${name}.html`);await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('a[href^="/learn-"]')).toHaveCount(0);
  await expect(page.locator('main section')).toHaveCount(2);
  expect(await page.evaluate(async()=>{
   const body=await document.fonts.load('400 16px Commissioner'),heading=await document.fonts.load('500 28px Literata');
   return {body:body.some(face=>face.status==='loaded'),heading:heading.some(face=>face.status==='loaded'),computedBody:getComputedStyle(document.body).fontFamily,computedHeading:getComputedStyle(document.querySelector('h1')!).fontFamily};
  })).toMatchObject({body:true,heading:true,computedBody:'Commissioner, sans-serif',computedHeading:'Literata, serif'});
  await expect(page.locator('#learning-mode,[data-learning-controls]')).toHaveCount(0);
  const last=page.locator('.guide-contents a').last(),target=await last.getAttribute('href');
  await last.click();await expect(page.locator(target!)).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 }
 await info.attach('documentation-index',{body:await page.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('reader navigation keeps its simulator connection and tutorial plot actions preserve accepted inputs',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const reader=await openReader(page);
 await reader.locator('a[href="/tutorial-06.html"]').click();
 await reader.locator('[data-guide-action="separationPlot"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('separation');
 await expect(page.locator('#window-plots')).toBeVisible();
 if(await page.locator('#fuel-motion-play').getAttribute('aria-pressed')==='true')await page.locator('#fuel-motion-play').click();
 const time=await page.locator('#fuel-motion-time').inputValue();
 await reader.goto('/guide.html#momentum');
 await reader.locator('[data-guide-action="momentum"]').click();
 await expect(page.locator('#fuel-plot')).toHaveValue('momentum');
 await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
 await expect(reader.locator('#reader-status')).toBeEmpty();
 await expect(page.locator('#window-guide')).toBeVisible();
 await reader.goto('/tutorial-06.html#sensitivity');
 await reader.locator('[data-guide-action="pin"]').click();
 await reader.locator('[data-guide-action="diffusion"]').click();
 const diffusivity=page.locator('#fuel-radialDiffusivityM2S'),before=await diffusivity.inputValue();
 await diffusivity.press('ArrowRight');await expect(diffusivity).not.toHaveValue(before);
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 if(!await page.locator('#window-view').isVisible())await page.getByRole('button',{name:'View',exact:true}).click();
 await expect(page.locator('.fuel-comparison-inputs')).toBeVisible();
 await expect(page.locator('.fuel-comparison-inputs')).toContainText('Changed A → B: Radial diffusivity:');
 await expect(page.locator('.fuel-comparison-inputs')).toContainText(`→ ${10**Number(await diffusivity.inputValue())} m²/s`);
});

test('a standalone tutorial enters one workspace and keeps accepted inputs across reader navigation',async({page})=>{
 await page.goto('/start.html#machine');const pages=page.context().pages().length;
 await page.locator('[data-guide-action="look"]').click();
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(page.getByRole('link',{name:'Reading page'})).toHaveAttribute('href','/start.html#machine');
 await expect(page.locator('#fuel-view-drive')).toHaveValue('all');
 expect(page.context().pages()).toHaveLength(pages);
 const reader=await readerFrame(page);
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 const current=page.locator('#fuel-currentA'),before=await current.inputValue();
 await current.focus();await current.press('ArrowRight');await expect(current).not.toHaveValue(before);
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const edited=await current.inputValue();
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await expect(page.locator('#window-controls')).not.toBeVisible();let navigations=0;
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
 await reader.goto('/guide.html#energy');
 await reader.getByRole('link',{name:'Tutorial 3: heating and cooling',exact:true}).click();
 await reader.locator('[data-guide-action="work"]').click();
 await expect(page.locator('#window-plots')).toBeVisible();
 await expect(page.locator('#fuel-plot')).toHaveValue('heat');
 await expect(current).toHaveValue(edited);expect(navigations).toBe(0);
 await expect(reader.locator('#reader-status')).toBeEmpty();await expect(page.locator('#window-guide')).toBeVisible();
});

test('tutorial experiment links put relevant controls and results within one action on desktop and phone',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const reader=await openReader(page);
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
 await page.goto('/?level=2&try=beamSource');
 await expect(page.locator('#fusion-beamCurrentA')).toBeFocused();await expect(page.locator('#marathon-apparatus')).toHaveValue('source');
 await page.getByRole('button',{name:'Show source energy ledger',exact:true}).click();await expect(page.locator('#fusion-plots')).toBeVisible();
 await page.goto('/?level=2&try=beamTarget');
 await expect(page.locator('#coupled-pulseDuty')).toBeFocused();await expect(page.locator('#coupled-view-settings')).toBeVisible();
 await page.getByRole('button',{name:'Show target dynamics',exact:true}).click();await expect(page.locator('#coupled-view-dynamics')).toBeVisible();
 expect(errors).toEqual([]);
});


test('local tutorial diagrams explain their cases and remain usable with reduced motion on desktop and phone',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of ['/start.html','/guide.html','/tutorial-03.html','/tutorial-04.html','/tutorial-05.html','/tutorial-06.html']){
  await page.goto(route);await expect(page.locator('#reader-status')).toBeEmpty();
  if(route==='/start.html')await page.locator('#exercises > summary').click();
  for(const figure of await page.locator('[data-concept-example]').all()){
   await expect(figure).toHaveAttribute('data-motion','paused');
   const choices=figure.locator('[data-concept-select]');
   for(let i=0;i<await choices.count();i++){
    await choices.nth(i).click();await expect(choices.nth(i)).toHaveAttribute('aria-pressed','true');
    await expect(figure.locator('[data-concept-panel]:not([hidden])')).toHaveCount(1);
    await expect(figure.locator('[data-concept-reading]')).not.toBeEmpty();
   }
   const motion=figure.locator('[data-concept-motion]');
   if(await motion.count()&&await motion.isVisible()){
    expect((await motion.boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    await motion.click();await expect(figure).toHaveAttribute('data-motion','running');
    await motion.click();await expect(figure).toHaveAttribute('data-motion','paused');
   }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await expect(page.locator('.katex-error')).toHaveCount(0);
 }
 await page.goto('/start.html#current');
 const spin=page.locator('[data-concept-example="spin"]');await spin.getByRole('button',{name:'Power off at 2',exact:true}).click();
 await expect(spin.locator('[data-concept-reading]')).toContainText('without changing its total');
 await info.attach('spin-reference',{body:await spin.screenshot(),contentType:'image/png'});
 await page.goto('/tutorial-03.html#limits');
 const magnetic=page.locator('[data-concept-example="magnetic"]');await magnetic.getByRole('button',{name:'B ×2',exact:true}).click();
 await expect(magnetic.locator('[data-concept-reading]')).toContainText('0.25');
 await info.attach('fixed-torque-reference',{body:await magnetic.screenshot(),contentType:'image/png'});
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(errors).toEqual([]);
});
