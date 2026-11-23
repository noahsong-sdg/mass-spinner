import {test,expect} from '@playwright/test';

test('the density equation has linked radius and temperature plots',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/guide.html#composition');
 const figure=page.locator('[data-density-scan]'),temperature=figure.getByRole('slider',{name:'Equilibrium temperature (K)'});
 const radius=figure.getByRole('slider',{name:'Equilibrium radius (cm)'}),selected=figure.locator('[data-density-selected]');
 await expect(temperature).toBeEnabled();await expect(selected).toContainText('⁶Li 5.09× · ⁷Li 6.68×');
 const thermal=await figure.locator('[data-density-line="temperature-1"]').getAttribute('d');
 await temperature.press('End');
 await expect(figure.locator('[data-density-held="radius"]')).toHaveText('Temperature stays at 1500 K.');
 await expect(selected).toContainText('⁶Li 1.72× · ⁷Li 1.88×');
 await expect(figure.locator('[data-density-line="temperature-1"]')).toHaveAttribute('d',thermal!);
 await radius.press('Home');await expect(selected).toContainText('⁶Li 1.00× · ⁷Li 1.00×');
 await expect(figure.locator('[data-density-held="temperature"]')).toHaveText('Radius stays at 0.0 cm.');
 await radius.press('End');await temperature.press('Home');
 await expect(selected).toContainText('⁶Li 25.93× · ⁷Li 44.58×');
 for(const svg of await figure.locator('svg').all())await expect(svg).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await info.attach('density-radius-temperature',{body:await figure.screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});
