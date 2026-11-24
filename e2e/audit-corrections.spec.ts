import {test,expect,type Page} from '@playwright/test';

async function accepted(page:Page){
 await expect(page.locator('#fuel-export')).toBeEnabled({timeout:30_000});
 await expect(page.locator('#fuel-render > .apparatus-frame:not(.fuel-baseline) canvas')).toBeVisible({timeout:30_000});
}

test('compact playback retains primary controls, usable scene space and focus across layouts',async({page},info)=>{
 await page.goto('/?level=2');await accepted(page);
 await page.setViewportSize({width:390,height:844});
 const panel=page.locator('.fuel-motion'),details=panel.locator('.fuel-motion-details'),summary=details.locator('summary');
 await expect(panel).toHaveClass(/fuel-motion-compact/);await expect(details).not.toHaveAttribute('open');
 for(const id of ['fuel-motion-mode','fuel-motion-play','fuel-power','fuel-motion-time','fuel-motion-time-label'])await expect(page.locator('#'+id)).toBeVisible();
 const closed=(await panel.boundingBox())!;expect(closed.height).toBeLessThan(220);
 for(const id of ['fuel-motion-play','fuel-power'])expect((await page.locator('#'+id).boundingBox())!.height).toBeGreaterThanOrEqual(44);
 const current=await page.locator('#fuel-currentA').inputValue(),time=await page.locator('#fuel-motion-time').inputValue();
 const inset=()=>page.locator('#fuel-render').evaluate(node=>parseFloat((node as HTMLElement).style.getPropertyValue('--fuel-playback-inset')));
 const closedInset=await inset();expect(closedInset).toBeGreaterThan(0);
 await summary.click();await expect(details).toHaveAttribute('open','');
 await expect(page.locator('#fuel-motion-clock')).toBeVisible();await expect(page.locator('.fuel-motion-legend')).toBeVisible();
 await expect.poll(inset).toBeGreaterThan(closedInset);
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
 await page.locator('#fuel-motion-restart').focus();
 await page.setViewportSize({width:1000,height:844});await expect(details).toHaveAttribute('open','');
 await page.setViewportSize({width:390,height:844});await expect(details).not.toHaveAttribute('open');await expect(summary).toBeFocused();
 await page.setViewportSize({width:1000,height:844});await expect(page.locator('#fuel-motion-restart')).toBeFocused();
 await page.setViewportSize({width:520,height:390});await expect(panel).toHaveClass(/fuel-motion-compact/);
 await expect.poll(async()=>{const a=(await panel.boundingBox())!,b=(await page.locator('#fuel-render').boundingBox())!;return a.y-b.y;}).toBeGreaterThanOrEqual(7);
 await summary.click();await expect(details).toHaveAttribute('open','');
 await expect.poll(async()=>{const a=(await panel.boundingBox())!,b=(await page.locator('#fuel-render').boundingBox())!;return a.y-b.y;}).toBeGreaterThanOrEqual(7);
 await info.attach('compact-playback-landscape',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('reference controls use current exact limits and Composition retains keyboard focus',async({page})=>{
 await page.goto('/?level=2');await accepted(page);await page.locator('#fuel-motion-time').press('End');
 const time=await page.locator('#fuel-motion-time').inputValue();
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 await page.locator('#fuel-controls').getByText('Collection & stages',{exact:true}).click();
 await page.getByRole('button',{name:'Set the exact value of Ideal countercurrent stages',exact:true}).click();
 const stages=page.getByRole('spinbutton',{name:'Ideal countercurrent stages',exact:true});await stages.fill('12');await stages.press('Enter');
 await expect(page.locator('#fuel-feedStage')).toHaveAttribute('max','12');
 await page.getByRole('button',{name:'Set the exact value of Feed stage',exact:true}).click();
 const feed=page.getByRole('spinbutton',{name:'Feed stage',exact:true});await expect(feed).toHaveAttribute('max','12');await feed.fill('8');await feed.press('Enter');
 await expect(page.locator('#fuel-feedStage')).toHaveValue('8');await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
 await page.getByRole('button',{name:'Close Controls',exact:true}).click();await page.getByRole('button',{name:'Plots',exact:true}).click();
 await page.locator('#fuel-plot').selectOption('composition');
 const plot=page.locator('#fuel-plots > .live-plots svg').first(),radius=page.locator('#fuel-sample-radius');
 await plot.focus();await plot.evaluate(node=>node.setAttribute('data-audit-identity','retained'));
 await plot.press('Home');await expect(plot).toBeFocused();await expect(radius).toHaveValue('0');
 await plot.press('ArrowRight');const first=Number(await radius.inputValue());expect(first).toBeGreaterThan(0);
 await plot.press('ArrowRight');expect(Number(await radius.inputValue())).toBeGreaterThan(first);
 await expect(plot).toBeFocused();await expect(plot).toHaveAttribute('data-audit-identity','retained');
});
