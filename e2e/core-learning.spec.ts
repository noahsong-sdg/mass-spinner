import {test,expect,type Page} from '@playwright/test';

async function accepted(page:Page){
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(page.locator('#fuel-render > .apparatus-frame:not(.fuel-baseline) canvas')).toBeVisible();
}

test('the first session connects current, equilibrium, heat and collection in one workspace',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2&try=currentExperiment&lesson=/start.html%23current');await accepted(page);
 const reader=page.frameLocator('#physics-guide-frame');
 await expect(reader.locator('#exercises > .guide-contents a')).toHaveCount(4);
 const current=page.getByRole('spinbutton',{name:'Radial discharge current (A)',exact:true});
 await current.fill('0');await current.press('Enter');await accepted(page);
 await page.locator('#fuel-motion-time').press('End');
 const neutral=page.locator('#fuel-plots .fuel-metrics > div').filter({has:page.getByText('Current neutral speed',{exact:true})}).locator('strong');
 await expect(neutral).toHaveText('0 m/s');
 await reader.locator('[data-guide-action="currentExperiment"]').click();await current.fill('0.03');await current.press('Enter');await accepted(page);
 await page.locator('#fuel-motion-time').press('End');
 await expect.poll(async()=>Number((await neutral.innerText()).replace(/[^0-9.e+-]/g,''))).toBeGreaterThan(0);
 await reader.locator('[data-guide-action="temperature"]').click();
 await expect(page.locator('#fuel-learning-comparisons')).toContainText('rotation fixed');
 await expect(page.locator('#fuel-learning-comparisons')).toContainText('500 K');
 await expect(page.locator('#fuel-learning-comparisons')).toContainText('1000 K');
 await expect(page.locator('#fuel-currentA')).toHaveValue('0.03');

 await reader.locator('[data-guide-action="heatExperiment"]').click();
 await expect(page.locator('.guide-experiment')).toContainText('pin A');
 await page.locator('#fuel-motion-time').press('End');
 await reader.locator('[aria-labelledby="heat"] [data-guide-action="pin"]').click();
 await reader.locator('[data-guide-action="heatExperiment"]').click();
 await page.locator('#fuel-thermal-enabled').check();await accepted(page);
 await page.locator('#fuel-motion-time').press('End');
 await expect(page.locator('#fuel-plot')).toHaveValue('thermal');
 await expect(page.locator('#fuel-result-scope')).toContainText('Temperature changes');
 await expect(page.locator('[aria-label="Accepted inputs: A to B"]')).toContainText('Temperature evolution: off → on');
 await expect(page.locator('#fuel-plots > .live-plots')).toContainText('Liner');
 await expect(page.locator('#fuel-plots > .live-plots')).toContainText('Neutral gas');

 await reader.locator('[data-guide-action="collectionExperiment"]').click();
 await expect(page.locator('.fuel-metrics')).toContainText('Configured cut radius / a');
 const plot=page.locator('#fuel-plots > .live-plots svg').first();
 const summary=await page.locator('.fuel-metrics').innerText(),configured=await page.locator('#fuel-cutFraction').inputValue();
 await plot.press('Home');await expect(page.locator('#fuel-plots > .live-plots .plot-readout')).toContainText('Inner light purity: 0, —');
 await plot.press('End');await expect(page.locator('#fuel-plots > .live-plots .plot-readout')).toContainText('Light recovery: 1, 100');
 expect(await page.locator('.fuel-metrics').innerText()).toBe(summary);
 await expect(page.locator('#fuel-cutFraction')).toHaveValue(configured);
 await expect(page.locator('#window-guide')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
 await info.attach('four-question-workspace',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('equilibrium controls change the calculation without changing the live run',async({page})=>{
 await page.goto('/?level=2&try=equilibrium&lesson=/start.html%23competition');await accepted(page);
 const current=await page.locator('#fuel-currentA').inputValue(),time=await page.locator('#fuel-motion-time').inputValue();
 const metrics=page.locator('#equilibrium-metrics');
 const purity=()=>metrics.locator('dt').filter({hasText:'⁶Li inner purity'}).locator('+ dd');
 const initial=Number((await purity().innerText()).replace('%',''));
 await page.locator('#equilibrium-temperatureK').fill('1000');
 await expect.poll(async()=>Number((await purity().innerText()).replace('%',''))).toBeLessThan(initial);
 await page.locator('#equilibrium-cutFraction').press('End');
 await expect(purity()).toHaveText('7.59%');
 await expect(metrics.locator('dt').filter({hasText:'⁶Li recovery'}).locator('+ dd')).toHaveText('100%');
 await page.locator('#equilibrium-cutFraction').press('Home');await expect(purity()).toHaveText('—');
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
});
