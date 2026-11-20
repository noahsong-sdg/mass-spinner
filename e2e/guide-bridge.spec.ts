import {test,expect,type Page} from '@playwright/test';

async function readerFrame(page:Page){
 await expect(page.locator('#window-guide')).toBeVisible();
 const iframe=await page.locator('#physics-guide-frame').elementHandle(),frame=await iframe!.contentFrame();
 if(!frame)throw new Error('Missing simulator tutorial frame.');
 await expect(frame.locator('h1')).toBeVisible();return frame;
}

async function reader(page:Page){
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 return readerFrame(page);
}

test('all six tutorials share one simulator and expose a specific observation',async({page,context},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page);const count=context.pages().length;
 await page.locator('#fuel-motion-time').press('End');
 const input=await page.locator('#fuel-currentA').inputValue(),time=await page.locator('#fuel-motion-time').inputValue(),duration=await page.locator('#fuel-durationS').inputValue();
 for(const [route,action,plot]of [['/start.html','look',''],['/guide.html','momentum','momentum'],['/tutorial-03.html','work','heat'],['/tutorial-04.html','collectionExperiment','cut'],['/tutorial-05.html','inventoryExperiment','inventory'],['/tutorial-06.html','separationPlot','separation']]){
  await frame.goto(route);await frame.locator(`[data-guide-action="${action}"]`).first().click();
  await expect(page.locator('#window-guide')).toBeVisible();await expect(page.getByRole('complementary',{name:'What to look for'})).toBeVisible();
  if(plot)await expect(page.locator('#fuel-plot')).toHaveValue(plot);
  await expect(page.locator('#fuel-currentA')).toHaveValue(input);await expect(page.locator('#fuel-durationS')).toHaveValue(duration);await expect(page.locator('#fuel-motion-time')).toHaveValue(time);await expect(page.locator('#fuel-motion-clock')).toBeVisible();expect(context.pages().length).toBe(count);
 }
 await info.attach('shared-tutorial-workspace',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});expect(errors).toEqual([]);
});

test('gas view clears unrelated windows and stages field, current, force and gas without changing inputs',async({page},info)=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page);await frame.goto('/start.html');
 await frame.locator('[data-guide-action="coils"]').click();await expect(page.locator('#fuel-component')).toHaveValue('coils');
 const current=await page.locator('#fuel-currentA').inputValue();
 await frame.locator('[data-guide-action="look"]').click();
 await expect(page.locator('#window-inspect')).toBeHidden();await expect(page.locator('#window-guide')).toBeVisible();
 await expect(page.locator('#fuel-view-representation')).toHaveValue('tracers');await expect(page.locator('.fuel-motion-legend')).toBeVisible();
 const cue=page.getByRole('complementary',{name:'What to look for'});
 for(const [label,value]of [['Field','B'],['Current','J'],['Force','force'],['Gas','all']]){
  await cue.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('#fuel-view-drive')).toHaveValue(value);
  if(value==='force')await info.attach('force-direction-glyphs',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 }
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);
 await cue.getByRole('button',{name:'Replay motion',exact:true}).click();await expect(page.locator('#fuel-plot')).toHaveValue('spin');
 await expect(page.locator('#fuel-motion-mode')).toHaveValue('spin');await expect(page.locator('#fuel-motion-play')).toHaveAttribute('aria-pressed','true');
 await info.attach('gas-drive-focus',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('direct reading action opens the same-tab workspace at its clicked section',async({page,context})=>{
 await page.goto('/start.html#current');const count=context.pages().length;
 await page.locator('[data-guide-action="look"]').click();
 const frame=await readerFrame(page);await expect.poll(()=>frame.url()).toMatch(/\/start(?:\.html)?#machine$/);
 await expect(frame.locator('#machine')).toBeInViewport();
 await expect(page.locator('#fuel-view-drive')).toHaveValue('all');expect(context.pages().length).toBe(count);
});

test('a delayed accepted result waits and a newer command replaces it without replay',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});const frame=await reader(page);await frame.goto('/guide.html');
 await page.locator('#fuel-export').evaluate((button:HTMLButtonElement)=>{button.disabled=true;});
 await frame.locator('[data-guide-action="spin"]').first().click();await expect(frame.locator('#reader-status')).toContainText('Waiting for the calculated run');
 await frame.locator('[data-guide-action="momentum"]').click();
 await page.locator('#fuel-export').evaluate((button:HTMLButtonElement)=>{button.disabled=false;});
 await expect(page.locator('#fuel-plot')).toHaveValue('momentum');await expect(frame.locator('#reader-status')).toBeEmpty();
});

test('untrusted reader routes cannot replace the tutorial document',async({page})=>{
 await page.goto('/?level=2&lesson=https://example.org/');await expect(page.locator('#window-guide')).toBeHidden();
 await expect(page.locator('#physics-guide-frame')).not.toHaveAttribute('src');
});


test('tutorial controls keep their plot, clock and current reading section',async({page},info)=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page);await frame.goto('/start.html#current');
 await frame.locator('[data-guide-action="currentExperiment"]').click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('#window-plots')).toBeVisible();await expect(page.locator('#window-guide')).toBeVisible();
 if(info.project.name==='phone')for(const panel of ['#window-controls','#window-plots']){
  const bounds=await page.locator(panel).boundingBox(),width=page.viewportSize()!.width;
  expect(bounds!.width).toBeGreaterThan(width-24);expect(bounds!.x).toBeGreaterThanOrEqual(-1);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);
 }
 await expect(page.locator('#fuel-plot')).toHaveValue('spin');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(page.locator('#fuel-motion-clock')).toBeVisible();
 await frame.locator('a[href="#machine"]').click();
 const full=page.getByRole('link',{name:'Reading page'});
 await full.evaluate(link=>link.addEventListener('click',event=>event.preventDefault(),{once:true}));await full.click();await expect(full).toHaveAttribute('href',/^\/start(?:\.html)?#machine$/);
 await page.locator('#window-controls').scrollIntoViewIfNeeded();
 await info.attach('tutorial-controls-and-results',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await page.getByRole('button',{name:'Close Tutorials',exact:true}).click();await expect(page.locator('#window-guide')).toBeHidden();
 await expect(page.locator('#window-controls')).toBeVisible();if(info.project.name==='phone')await expect(page.locator('#window-plots')).toBeHidden();else await expect(page.locator('#window-plots')).toBeVisible();
});


test('tutorial actions return from the reactor to the centrifuge without replacing its inputs',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const current=await page.locator('#fuel-currentA').inputValue(),frame=await reader(page);await frame.goto('/start.html');
 await frame.locator('[data-guide-action="look"]').click();
 await expect(page.getByRole('complementary',{name:'What to look for'})).toBeVisible();
 await frame.goto('/tutorial-05.html');
 await page.getByRole('button',{name:'Reactor',exact:true}).click();await expect(page.locator('#marathon-apparatus')).toHaveValue('source');
 await expect(page.getByRole('complementary',{name:'What to look for'})).toBeHidden();
 await expect(page.locator('#window-guide')).toBeVisible();
 await frame.locator('[data-guide-action="inventoryExperiment"]').click();await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');
 await expect(page.locator('#fuel-plot')).toHaveValue('inventory');await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(page.locator('#window-guide')).toBeVisible();
});


test('standalone beam entry and advanced navigation keep the reader with the correct apparatus',async({page})=>{
 await page.goto('/?level=2&try=beamDynamics&lesson=/tutorial-05.html%23beam');
 await expect(page.locator('#marathon-apparatus')).toHaveValue('source');await expect(page.locator('#coupled-plot')).toHaveValue('source');await expect(page.locator('#window-guide')).toBeVisible();
 await page.getByText('Advanced',{exact:true}).click();await page.getByRole('button',{name:'Models',exact:true}).click();
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 const frame=await readerFrame(page);await frame.goto('/guide.html');
 await frame.locator('[data-guide-action="currentExperiment"]').click();
 await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');await expect(page.locator('#window-guide')).toBeVisible();await expect(page.locator('#fuel-currentA')).toBeFocused();
});


test('reference pages use the existing simulator rather than nesting a second app',async({page,context})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page),pages=context.pages().length,current=await page.locator('#fuel-currentA').inputValue();
 await frame.goto('/equilibrium.html');const calculator=frame.getByRole('link',{name:'← Open calculator',exact:true});
 await expect(calculator).toBeVisible();await calculator.click();
 await expect(page.locator('#fuel-equilibrium-calculator')).toBeVisible();await expect(page.locator('#window-guide')).toBeVisible();
 await frame.goto('/how-it-works.html');await expect(frame.locator('.sources a').first()).toHaveAttribute('target','_blank');
 await frame.locator('.brand').click();await expect(page.locator('#window-guide')).toBeHidden();
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 await frame.goto('/qualification.html');await frame.getByRole('link',{name:'Mass Spinner'}).click();
 await expect(page.locator('#window-guide')).toBeHidden();await expect(page.locator('#fuel-currentA')).toHaveValue(current);
 expect(context.pages().length).toBe(pages);await expect(page.locator('.sim-workspace')).toHaveCount(1);
});
