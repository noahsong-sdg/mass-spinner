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
 const input=await page.locator('#fuel-currentA').inputValue();
 for(const [route,action,plot]of [['/start.html','look',''],['/guide.html','momentum','momentum'],['/tutorial-03.html','work','heat'],['/tutorial-04.html','cut','cut'],['/tutorial-05.html','fuelInventory','inventory'],['/tutorial-06.html','separationPlot','separation']]){
  await frame.goto(route);await frame.locator(`[data-guide-action="${action}"]`).first().click();
  await expect(page.locator('#window-guide')).toBeVisible();await expect(page.getByRole('complementary',{name:'What to watch'})).toBeVisible();
  if(plot)await expect(page.locator('#fuel-plot')).toHaveValue(plot);
  await expect(page.locator('#fuel-currentA')).toHaveValue(input);expect(context.pages().length).toBe(count);
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
 await expect(page.locator('#fuel-view-representation')).toHaveValue('tracers');
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
 await page.locator('[data-guide-action="look"]').click();await expect(page).toHaveURL(/lesson=%2Fstart.html%23machine/);
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
