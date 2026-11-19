import {test,expect} from '@playwright/test';

test('tutorial reconnects after simulator reload and reports rejected actions honestly',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const reader=await popup;
 await expect(reader.locator('#reader-status')).toBeEmpty();
 await expect.poll(()=>reader.evaluate(()=>sessionStorage.getItem('mass-spinner:reader-capability'))).toBeTruthy();
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
 await expect(reader.locator('#reader-status')).toBeEmpty();await reader.goto('/guide.html#momentum');
 await expect.poll(()=>reader.evaluate(()=>sessionStorage.getItem('mass-spinner:reader-capability'))).toBeTruthy();
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
 await expect(reader.locator('#reader-status')).toBeEmpty();await reader.goto('/guide.html#momentum');
 await expect.poll(()=>reader.evaluate(()=>sessionStorage.getItem('mass-spinner:reader-capability'))).toBeTruthy();
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


test('direct tutorial links open the requested view and acknowledge the first action',async({page})=>{
 await page.goto('/start.html');await expect(page.locator('#reader-status')).toBeEmpty();
 const popup=page.waitForEvent('popup');await page.locator('[data-guide-action="look"]').click();const simulator=await popup;
 await expect(page.locator('#reader-status')).toHaveText('Opened in the simulator.');
 await expect(simulator.locator('#fuel-view-representation')).toHaveValue('both');
 await expect(simulator.locator('#fuel-view-drive')).toHaveValue('all');
 await page.locator('[data-guide-action="coils"]').click();
 await expect(simulator.locator('#fuel-component')).toHaveValue('coils');
 await expect(simulator.getByRole('region',{name:'Examine',exact:true})).toBeVisible();
 await expect(page.locator('#reader-status')).toHaveText('Opened in the simulator.');
 await simulator.close();
});

test('each simulator opens a reader connected to itself rather than an older named reader',async({page,context})=>{
 await page.goto('/?level=2');
 const firstPopup=page.waitForEvent('popup');await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const first=await firstPopup;
 const secondSimulator=await context.newPage();await secondSimulator.goto('/?level=2');
 const secondPopup=secondSimulator.waitForEvent('popup');await secondSimulator.getByRole('button',{name:'Docs & tutorials',exact:true}).click();const second=await secondPopup;
 expect(second).not.toBe(first);await expect(second.locator('#reader-status')).toBeEmpty();
 await second.goto('/start.html');await second.locator('[data-guide-action="coils"]').click();
 await expect(second.locator('#reader-status')).toHaveText('Opened in the simulator.');
 await expect(secondSimulator.locator('#fuel-component')).toHaveValue('coils');
 await expect(secondSimulator.getByRole('region',{name:'Examine',exact:true})).toBeVisible();
 await first.close();await second.close();await secondSimulator.close();
});
