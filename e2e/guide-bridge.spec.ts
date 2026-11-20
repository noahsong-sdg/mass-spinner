import {test,expect,type Page} from '@playwright/test';

async function reader(page:Page){
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 const view=page.frameLocator('#physics-guide-frame');await expect(view.locator('h1')).toBeVisible();
 return page.frames().find(frame=>frame.parentFrame()===page.mainFrame())!;
}

test('all six tutorials share one simulator and expose a specific observation',async({page,context},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page);const count=context.pages().length;
 await page.locator('#fuel-motion-time').press('End');
 const input=await page.locator('#fuel-currentA').inputValue(),time=await page.locator('#fuel-motion-time').inputValue(),duration=await page.locator('#fuel-durationS').inputValue();
 for(const [route,action,plot]of [['/start.html','look',''],['/guide.html','momentum','momentum'],['/tutorial-03.html','work','heat'],['/tutorial-04.html','cut','cut'],['/tutorial-05.html','fuelInventory','inventory'],['/tutorial-06.html','separationPlot','separation']]){
  await frame.goto(route);await frame.locator(`[data-guide-action="${action}"]`).first().click();
  await expect(page.locator('#window-guide')).toBeVisible();await expect(page.getByRole('complementary',{name:'What to watch'})).toBeVisible();
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
 const cue=page.getByRole('complementary',{name:'What to watch'});
 for(const [label,value]of [['Field','B'],['Current','J'],['Force','force'],['Gas','all']]){
  await cue.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('#fuel-view-drive')).toHaveValue(value);
 }
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);
 await cue.getByRole('button',{name:'Replay motion',exact:true}).click();await expect(page.locator('#fuel-plot')).toHaveValue('spin');
 await expect(page.locator('#fuel-motion-mode')).toHaveValue('spin');await expect(page.locator('#fuel-motion-play')).toHaveAttribute('aria-pressed','true');
 await info.attach('gas-drive-focus',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('direct reading action opens the same-tab workspace at its clicked section',async({page,context})=>{
 await page.goto('/start.html#current');const count=context.pages().length;
 await page.locator('[data-guide-action="look"]').click();await expect(page).toHaveURL(/lesson=%2Fstart(?:\.html)?%23machine/);
 await expect(page.locator('#window-guide')).toBeVisible();await expect(page.frameLocator('#physics-guide-frame').locator('#machine')).toBeVisible();
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
 await frame.locator('[data-guide-action="current"]').first().click();
 await expect(page.locator('#window-controls')).toBeVisible();await expect(page.locator('#window-plots')).toBeVisible();await expect(page.locator('#window-guide')).toBeVisible();
 await expect(page.locator('#fuel-plot')).toHaveValue('spin');await expect(page.locator('#fuel-motion-clock')).toBeVisible();
 await frame.locator('a[href="#machine"]').click();
 const full=page.getByRole('link',{name:'Reading page'});
 await full.evaluate(link=>link.addEventListener('click',event=>event.preventDefault(),{once:true}));await full.click();await expect(full).toHaveAttribute('href',/^\/start(?:\.html)?#machine$/);
 await page.locator('#window-controls').scrollIntoViewIfNeeded();
 await info.attach('tutorial-controls-and-results',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});


test('tutorial actions return from the reactor to the centrifuge without replacing its inputs',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const current=await page.locator('#fuel-currentA').inputValue(),frame=await reader(page);await frame.goto('/tutorial-05.html');
 await frame.locator('[data-guide-action="beamSource"]').click();await expect(page.locator('#marathon-apparatus')).toHaveValue('source');
 await frame.locator('[data-guide-action="fuelInventory"]').click();await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');
 await expect(page.locator('#fuel-plot')).toHaveValue('inventory');await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(page.locator('#window-guide')).toBeVisible();
});


test('standalone beam entry and advanced navigation keep the reader with the correct apparatus',async({page})=>{
 await page.goto('/?level=2&try=beamDynamics&lesson=/tutorial-05.html%23beam');
 await expect(page.locator('#marathon-apparatus')).toHaveValue('source');await expect(page.locator('#coupled-plot')).toHaveValue('source');await expect(page.locator('#window-guide')).toBeVisible();
 await page.getByText('Advanced',{exact:true}).click();await page.getByRole('button',{name:'Models',exact:true}).click();
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();
 const frame=page.frames().find(frame=>frame.parentFrame()===page.mainFrame())!;await frame.goto('/guide.html');
 await frame.locator('[data-guide-action="current"]').first().click();
 await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');await expect(page.locator('#window-guide')).toBeVisible();await expect(page.locator('#fuel-currentA')).toBeFocused();
});


test('reference pages use the existing simulator rather than nesting a second app',async({page,context})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const frame=await reader(page),pages=context.pages().length,current=await page.locator('#fuel-currentA').inputValue();
 await frame.goto('/equilibrium.html');await frame.getByRole('link',{name:'Open calculator'}).click();
 await expect(page.locator('#fuel-equilibrium-calculator')).toBeVisible();await expect(page.locator('#window-guide')).toBeVisible();
 await frame.goto('/qualification.html');await frame.getByRole('link',{name:'Mass Spinner'}).click();
 await expect(page.locator('#window-guide')).toBeHidden();await expect(page.locator('#fuel-currentA')).toHaveValue(current);
 expect(context.pages().length).toBe(pages);await expect(page.locator('.sim-workspace')).toHaveCount(1);
});
