import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('optional guidance preserves predictions and gives keyboard access to explanations',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/start.html');
 const mode=page.locator('#learning-mode');await expect(mode).toBeVisible();
 await expect(mode).toHaveValue('show');
 const current=page.locator('section[aria-labelledby="current"]');
 await mode.selectOption('investigate');
 await expect(current.locator('[data-learning-explanation]')).not.toHaveAttribute('open','');
 await current.locator('textarea').fill('The ions turn first; the neutrals follow.');
 const explanation=current.locator('[data-learning-explanation] summary');
 await explanation.focus();await explanation.press('Enter');
 await expect(current.locator('[data-learning-explanation]')).toHaveAttribute('open','');
 await mode.selectOption('explore');await mode.selectOption('show');
 await expect(current.locator('textarea')).toHaveValue('The ions turn first; the neutrals follow.');
 await page.locator('#guide-chapter').selectOption('collection');
 await expect(page).toHaveURL(/#collection$/);
 await expect(current.locator('textarea')).toHaveValue('The ions turn first; the neutrals follow.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await info.attach('optional-guidance',{body:await page.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('all investigation pages open independently with working navigation and no mobile overflow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 for(const name of ['learn','learn-controls','learn-transport','learn-thermal','learn-beam','learn-collection','learn-evidence']){
  await page.goto(`/${name}.html`);await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
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
