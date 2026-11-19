import {test,expect} from '@playwright/test';

// The numerical model is allowed to change. With its overlays hidden, the same
// SI hardware viewed from the same user pose must produce the same GPU frame.
test('reactor recalculation preserves a user-framed hardware view',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?level=2');
 await page.getByRole('button',{name:'Reactor',exact:true}).click();
 const reactor=page.locator('#fusion-apparatus'),canvas=reactor.locator('canvas');
 await expect(canvas).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:'Target',exact:true}).click();
 await page.getByRole('button',{name:'Use material model',exact:true}).click();
 await expect(page.locator('.coupled-target')).toHaveAttribute('data-status','accepted',{timeout:30_000});
 await page.getByRole('button',{name:'Close Target',exact:true}).click();
 const surfaces=reactor.locator('.apparatus-state');
 await surfaces.locator(':scope > summary').click();
 await surfaces.getByLabel('3D result layer',{exact:true}).selectOption('hardware');
 await surfaces.locator(':scope > summary').click();
 const processes=reactor.locator('.reactor-processes');
 await processes.locator(':scope > summary').click();
 for(const name of ['beam','neutrons','heat','reactions'])await processes.getByLabel(`Show ${name}`,{exact:true}).uncheck();
 await processes.locator(':scope > summary').click();
 await canvas.focus();await canvas.press('ArrowRight');await canvas.press('+');
 await expect(canvas).toBeFocused();
 // Locator screenshots composite HTML over the GPU canvas. Exclude its focus
 // outline and the floating dock without changing either layout or camera.
 const capture={style:'#fusion-apparatus canvas{outline:none!important}.world-dock{visibility:hidden!important}'};
 const before=await canvas.screenshot(capture);
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 const current=page.locator('#fusion-beamCurrentA'),oldCurrent=await current.inputValue();
 await current.press('ArrowRight');await expect(current).not.toHaveValue(oldCurrent);
 await expect(page.locator('.coupled-target')).toHaveAttribute('data-status','pending');
 await expect(page.locator('.coupled-target')).toHaveAttribute('data-status','accepted',{timeout:30_000});
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();
 await canvas.focus();await expect(canvas).toBeFocused();
 const after=await canvas.screenshot(capture);
 await info.attach('reactor-camera-before',{body:before,contentType:'image/png'});
 await info.attach('reactor-camera-after',{body:after,contentType:'image/png'});
 expect(after.equals(before),'same geometry must retain the orbit, zoom, pan and frame through pending and acceptance').toBe(true);
 expect(errors).toEqual([]);
});
