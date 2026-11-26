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
 await expect(page.locator('#fuel-motion-clock')).toBeVisible();await expect(page.locator('#fuel-motion-time-label')).not.toBeVisible();await expect(page.locator('.fuel-motion-legend')).toBeVisible();
 const expanded=(await panel.boundingBox())!,body=(await details.locator('.fuel-motion-details-body').boundingBox())!;
 expect(body.width).toBeGreaterThan(expanded.width-24);
 expect(expanded.height).toBeLessThan(360);
 await expect(page.locator('#fuel-scene-state')).toBeVisible();await expect(page.locator('#fuel-scene-state')).toContainText('Coupled run');
 expect((await page.locator('#fuel-render > .apparatus-frame:not(.fuel-baseline)').boundingBox())!.height).toBeGreaterThan(200);
 await expect.poll(inset).toBeGreaterThan(closedInset);
 await expect(page.locator('#fuel-currentA')).toHaveValue(current);await expect(page.locator('#fuel-motion-time')).toHaveValue(time);
 await page.locator('#fuel-motion-restart').focus();
 await page.setViewportSize({width:1000,height:844});await expect(panel).not.toHaveClass(/fuel-motion-compact/);await expect(details).toHaveAttribute('open','');
 await page.setViewportSize({width:390,height:844});await expect(details).not.toHaveAttribute('open');await expect(summary).toBeFocused();
 await page.setViewportSize({width:1000,height:844});await expect(panel).not.toHaveClass(/fuel-motion-compact/);await expect(page.locator('#fuel-motion-restart')).toBeFocused();
 await page.setViewportSize({width:520,height:390});await expect(panel).toHaveClass(/fuel-motion-compact/);
 await expect.poll(async()=>{const a=(await panel.boundingBox())!,b=(await page.locator('#fuel-render').boundingBox())!;return a.y-b.y;}).toBeGreaterThanOrEqual(7);
 await summary.click();await expect(details).toHaveAttribute('open','');
 await expect.poll(async()=>{const a=(await panel.boundingBox())!,b=(await page.locator('#fuel-render').boundingBox())!;return a.y-b.y;}).toBeGreaterThanOrEqual(7);
 await info.attach('compact-playback-landscape',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('saved playback placement remains bounded when full-width details expand',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('mass-spinner-playback-v1',JSON.stringify({version:1,x:.95,y:.95})));
 await page.goto('/?level=2');await accepted(page);
 const panel=page.locator('.fuel-motion'),details=panel.locator('.fuel-motion-details');
 await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
 await expect.poll(async()=>{
  const p=(await panel.boundingBox())!,scene=(await page.locator('#fuel-render').boundingBox())!,dock=(await page.locator('.world-dock').boundingBox())!;
  return p.x>=scene.x+7&&p.x+p.width<=scene.x+scene.width-7&&p.y>=scene.y+63&&p.y+p.height<=dock.y-8;
 }).toBe(true);
 expect((await details.locator('.fuel-motion-details-body').boundingBox())!.width).toBeGreaterThan((await panel.boundingBox())!.width-24);
});

test('saved right-edge playback stays usable when the tutorial opens and the scene resizes',async({page},info)=>{
 await page.setViewportSize({width:1280,height:900});
 await page.addInitScript(()=>localStorage.setItem('mass-spinner-playback-v1',JSON.stringify({version:1,x:1,y:0})));
 await page.goto('/?level=2&lesson=/guide.html%23rotation&try=momentum');await accepted(page);
 const panel=page.locator('.fuel-motion'),play=page.locator('#fuel-motion-play'),time=page.locator('#fuel-motion-time');
 const bounded=async()=>{
  const p=(await panel.boundingBox())!,scene=(await page.locator('#fuel-render').boundingBox())!,button=(await play.boundingBox())!;
  return p.width>=Math.min(300,scene.width-16)&&p.x>=scene.x+7&&p.x+p.width<=scene.x+scene.width-7
   &&p.y>=scene.y+63&&p.y+p.height<=scene.y+scene.height-7
   &&button.x>=p.x&&button.x+button.width<=p.x+p.width&&button.y>=p.y&&button.y+button.height<=p.y+p.height;
 };
 await expect(page.locator('#window-guide')).toBeVisible();await expect(page.locator('#window-plots')).toBeVisible();
 await expect(panel).toHaveClass(/fuel-motion-moved/);await expect.poll(bounded).toBe(true);
 await expect(play).toBeInViewport({ratio:1});await time.press('Home');await expect(time).toHaveValue('0');
 await play.click();
 await expect.poll(()=>page.evaluate(()=>{
  const elapsed=Number((document.getElementById('fuel-motion-time') as HTMLInputElement).value);
  const scene=document.getElementById('fuel-scene-state')!,plot=document.getElementById('fuel-plot-state')!;
  return elapsed>0&&scene.dataset.model==='Coupled run'&&plot.dataset.model==='Coupled run'
   &&Number(scene.dataset.timeS)===elapsed&&Number(plot.dataset.timeS)===elapsed;
 }),{timeout:30_000}).toBe(true);
 if(await play.getAttribute('aria-pressed')==='true')await play.click();
 const elapsed=await time.inputValue();
 await page.getByRole('button',{name:'Close Tutorials',exact:true}).click();await expect(page.locator('#window-guide')).toBeHidden();await expect.poll(bounded).toBe(true);
 await page.getByRole('button',{name:'Docs & tutorials',exact:true}).click();await expect(page.locator('#window-guide')).toBeVisible();await expect.poll(bounded).toBe(true);
 await expect(time).toHaveValue(elapsed);
 await page.setViewportSize({width:390,height:844});await expect(panel).toHaveClass(/fuel-motion-compact/);await expect.poll(bounded).toBe(true);
 await expect(time).toHaveValue(elapsed);
 await info.attach('saved-right-edge-playback',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('reference controls use current exact limits and Composition retains keyboard focus',async({page})=>{
 await page.goto('/?level=2');await accepted(page);await page.locator('#fuel-motion-time').press('End');
 const time=await page.locator('#fuel-motion-time').inputValue();
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 await page.locator('#fuel-controls').getByText('Collection & stages',{exact:true}).click();
 await page.getByRole('button',{name:'Set the exact value of Ideal countercurrent stages',exact:true}).click();
 const stages=page.getByRole('spinbutton',{name:'Ideal countercurrent stages',exact:true});await stages.fill('12');await stages.press('Enter');
 await expect(page.locator('#fuel-feedStage')).toHaveAttribute('max','12');
 const feedOutput=page.getByRole('button',{name:'Set the exact value of Feed stage',exact:true}),beforeFocus=(await feedOutput.boundingBox())!;
 await feedOutput.focus();expect((await feedOutput.boundingBox())!.y).toBeCloseTo(beforeFocus.y,1);
 await feedOutput.click();
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
