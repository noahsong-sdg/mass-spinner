import {test,expect} from '@playwright/test';

test('tutorial reconnects after simulator reload and reports rejected actions honestly',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const reader=await popup;
 await expect(reader.locator('#reader-status')).toHaveText('Simulator ready.');
 await page.reload();await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await reader.goto('/guide.html#momentum');await reader.locator('[data-guide-action="spin"]').first().click();
 await expect(reader.locator('#reader-status')).toHaveText('Opened in the simulator.');
 await expect(page.locator('#fuel-plot')).toHaveValue('spin');await expect(page.locator('#fuel-motion-play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#fuel-motion-mode').selectOption('equilibrium');
 await reader.locator('[data-guide-action="cutPower"]').click();
 await expect(reader.locator('#reader-status')).toContainText('Before you cut power, select Coupled separation or Coupled spin-up');
 await expect(page.locator('#fuel-motion-mode')).toHaveValue('equilibrium');expect(errors).toEqual([]);
 await reader.close();
});

test('tutorial action waits through delayed simulator startup without duplicating a command',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const reader=await popup;
 await expect(reader.locator('#reader-status')).toHaveText('Simulator ready.');await reader.goto('/guide.html#momentum');
 let unblock!:()=>void,blocked!:()=>void;
 const release=new Promise<void>(resolve=>{unblock=resolve;}),requested=new Promise<void>(resolve=>{blocked=resolve;});
 let held=false;
 await page.route('**/*',async route=>{
  if(!held&&route.request().resourceType()==='script'){held=true;blocked();await release;}
  await route.continue();
 });
 const reload=page.reload({waitUntil:'domcontentloaded'});
 await requested;
 await reader.locator('[data-guide-action="spin"]').first().click();
 await reader.locator('[data-guide-action="momentum"]').click();
 await expect(reader.locator('#reader-status')).toHaveText('Waiting for the simulator…');
 unblock();await reload;
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(reader.locator('#reader-status')).toHaveText('Opened in the simulator.');
 await expect(page.locator('#fuel-plot')).toHaveValue('momentum');
 await reader.close();
});

test('reloading while a tutorial action waits reports interruption rather than replaying it',async({page})=>{
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const reader=await popup;
 await expect(reader.locator('#reader-status')).toHaveText('Simulator ready.');await reader.goto('/guide.html#momentum');
 // Hold the accepted-result gate closed without changing any physical input.
 await page.locator('#fuel-export').evaluate((button:HTMLButtonElement)=>{button.disabled=true;});
 await reader.locator('[data-guide-action="spin"]').first().click();
 await expect(reader.locator('#reader-status')).toHaveText('Waiting for the calculated run and controls…');
 await page.reload();
 await expect(reader.locator('#reader-status')).toContainText('The simulator reloaded.');
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(reader.locator('#reader-status')).toContainText('action status is unknown');
 await reader.close();
});
