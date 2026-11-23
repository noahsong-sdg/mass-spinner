import {test,expect} from '@playwright/test';

test('every displayed equation opens its working plot on the same page',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let opened=0;
 for(const url of ['/guide.html','/tutorial-03.html','/tutorial-04.html','/tutorial-05.html','/equilibrium.html','/how-it-works.html']){
  await page.goto(url);
  const triggers=page.locator('[data-equation-plot]');
  for(let i=0;i<await triggers.count();i++){
   const trigger=triggers.nth(i),closed=trigger.locator('xpath=ancestor::details[not(@open)]/summary');
   if(await closed.count())await closed.click();
   await trigger.click();opened++;
   const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
   const select=dialog.getByRole('combobox'),options=await select.locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
   for(const option of options){
    if(options.length>1)await select.selectOption(option);
    await expect(dialog.locator('.equation-line-0')).toHaveAttribute('d',/^M/);
    const slider=dialog.getByRole('slider').first();await slider.press('Home');
    const first=await dialog.locator('[data-equation-reading]').innerText();await slider.press('End');
    await expect(dialog.locator('[data-equation-reading]')).not.toHaveText(first);
    expect(await dialog.locator('[data-equation-chart]').innerHTML()).not.toMatch(/NaN|Infinity/);
   }
   await dialog.getByRole('button',{name:'Close equation plot'}).click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(opened).toBe(28);expect(errors).toEqual([]);
 await page.goto('/guide.html#composition');await page.locator('[data-equation-plot="density"]').click();
 const dialog=page.getByRole('dialog'),path=dialog.locator('.equation-line-0'),initial=await path.getAttribute('d');
 await dialog.getByRole('slider',{name:'Temperature (K)',exact:true}).press('End');await expect(path).not.toHaveAttribute('d',initial!);
 const rect=await dialog.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 await info.attach('equation-plot',{body:await dialog.screenshot(),contentType:'image/png'});
 await dialog.press('Escape');await expect(dialog).not.toBeVisible();
});
