import {test,expect} from '@playwright/test';

// Keep this post-deployment contract stable across qualified release versions.
// Detailed behavior is tested by the selected artifact's own successful Verify run.
test('deployed release renders its centrifuge and exposes responsive controls and plots',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('/?level=2');
 await expect(page.locator('#fuel-render canvas')).toBeVisible({timeout:30_000});
 await expect(page.locator('#fuel-render .fuel-status')).not.toContainText('unavailable');
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 const current=page.locator('#fuel-currentA');await expect(current).toBeVisible();
 const before=await current.inputValue();await current.press('ArrowRight');
 await expect(current).not.toHaveValue(before);
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await page.getByRole('button',{name:'Plots',exact:true}).click();
 await page.locator('#fuel-plot').selectOption('momentum');
 await expect(page.locator('#fuel-plots svg').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
 await info.attach('deployment-health',{body:await page.screenshot(),contentType:'image/png'});
});
