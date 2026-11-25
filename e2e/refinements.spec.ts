import {test,expect,type Page} from '@playwright/test';

const examples=[
 ['heatExperiment','thermal'],['spatialHeatExperiment','thermalProfile'],['collectionExperiment','cut'],
 ['stageExperiment','cascade'],['pumpingExperiment','pump'],['inventoryExperiment','inventory'],
 ['diffusionExperiment','separation'],['dragExperiment','spin'],['fieldExperiment','field'],['surfaceExperiment','lithium'],
 ['beamSource','source'],['beamTarget','source'],
] as const;

function previousRun(action:string){
 const scenario={version:3,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-pair':'dt','fuel-application':'pump',
  'fuel-currentA':.031,'fuel-gasK':700,'fuel-durationS':1,'fusion-beamCurrentA':Math.log10(.017),'fusion-beamEnergyKeV':120},
 fuelRun:{initialCurrentA:.031,events:[],mode:'transport',timeS:.25}};
 return `/?${new URLSearchParams({level:'2',v:'3',scenario:JSON.stringify(scenario),try:action,lesson:action.startsWith('beam')?'/tutorial-07.html#current':'/guide.html#drive'})}`;
}
async function accepted(page:Page,beam=false){
 await expect(page.locator(beam?'#export-fusion':'#fuel-export')).toBeEnabled({timeout:30_000});
}
async function retainedInputs(page:Page){
 await expect(page.locator('#fuel-currentA')).toHaveValue('0.031');await expect(page.locator('#fuel-gasK')).toHaveValue('700');
 await expect(page.locator('#fuel-pair')).toHaveValue('dt');await expect(page.locator('#fuel-application')).toHaveValue('pump');
 await expect(page.locator('#fusion-beamCurrentA')).toHaveValue(String(Math.log10(.017)));await expect(page.locator('#fusion-beamEnergyKeV')).toHaveValue('120');
}

for(const [action,plot]of examples)test(`${action} preserves a shared run until explicit example replacement and restores it`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const beam=action.startsWith('beam');await page.goto(previousRun(action));await accepted(page,beam);
 const card=page.locator('.guide-experiment');await expect(card).toBeVisible();await retainedInputs(page);
 await expect(page.locator('#window-guide')).toBeVisible();const reading=await page.locator('#physics-guide-frame').getAttribute('src');
 await card.getByRole('button',{name:'Use my run',exact:true}).click();await retainedInputs(page);
 const disclosure=card.getByText('Example inputs',{exact:true});await disclosure.click();
 await expect(card.locator('dl dt').first()).toBeVisible();await expect(card.locator('dl dd').first()).not.toBeEmpty();
 await disclosure.click();await expect(card.getByRole('button',{name:'Restore previous run',exact:true})).toBeDisabled();
 await card.getByRole('button',{name:'Load example',exact:true}).click();await accepted(page,beam);
 await expect(card).toContainText('Example loaded');
 await expect(page.locator('#window-guide')).toBeVisible();await expect(page.locator('#physics-guide-frame')).toHaveAttribute('src',reading!);
 await expect(page.locator('#fuel-currentA')).toHaveValue('0.03');await expect(page.locator('#fuel-gasK')).toHaveValue('500');
 await expect(page.locator('#fuel-pair')).toHaveValue('lithium');
 if(beam){
  await expect(page.locator('#marathon-apparatus')).toHaveValue('source');
  await expect(page.locator('#fusion-beamCurrentA')).toHaveValue('-2');await expect(page.locator('#fusion-beamEnergyKeV')).toHaveValue('100');
  await expect(page.locator('#fusion-stopping-model')).toHaveValue('geant4-bragg');
  if(action==='beamTarget'){
   await expect(page.locator('#coupled-export')).toBeEnabled({timeout:30_000});
   await expect(page.locator('#coupled-time')).toHaveValue('0');await expect(page.locator('#coupled-plot')).toHaveValue(plot);
  }
 }else{
  await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');
  await expect(page.locator('#fuel-application')).toHaveValue(action==='pumpingExperiment'?'pump':'enrichment');
  await expect(page.locator('#fuel-plot')).toHaveValue(plot);await expect(page.locator('#fuel-motion-mode')).toHaveValue('transport');
  await expect(page.locator('#fuel-motion-time')).toHaveValue('0');
  await expect(page.locator('#fuel-thermal-enabled')).toBeChecked({checked:action==='spatialHeatExperiment'});
  if(action==='spatialHeatExperiment'){
   await expect(page.locator('#fuel-thermal-model')).toHaveValue('spatial');await expect(page.locator('#fuel-thermal-gasModel')).toHaveValue('spatial');
  }
 }
 await card.getByRole('button',{name:'Restore previous run',exact:true}).click();await accepted(page);
 await retainedInputs(page);await expect(page.locator('#marathon-apparatus')).toHaveValue('centrifuge');
 await expect(page.locator('#window-guide')).toBeVisible();await expect(page.locator('#physics-guide-frame')).toHaveAttribute('src',reading!);
 await expect(page.locator('#fuel-motion-time')).toHaveValue('0.25');
 await expect(card.getByRole('button',{name:'Restore previous run',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('scene and plot identify their coupled state and distinguish independent references',async({page})=>{
 await page.goto('/?level=2&try=momentum&lesson=/guide.html%23momentum');await accepted(page);
 await expect(page.locator('.fuel-motion #fuel-scene-state')).toBeVisible();
 const scene=page.locator('#fuel-scene-state'),plot=page.locator('#fuel-plot-state');
 await page.locator('#fuel-plots .live-plots svg').first().scrollIntoViewIfNeeded();await expect(plot).toBeInViewport();
 for(const mode of ['transport','spin']){
  await page.locator('#fuel-motion-mode').selectOption(mode);await page.locator('#fuel-motion-time').press('End');
  await expect(scene).toHaveAttribute('data-calculation-state','accepted');await expect(plot).toHaveAttribute('data-calculation-state','accepted');
  await expect(scene).toHaveAttribute('data-model','Coupled run');await expect(plot).toHaveAttribute('data-model','Coupled run');
  await expect.poll(()=>scene.getAttribute('data-time-s')).toBe(await plot.getAttribute('data-time-s'));
 }
 await page.locator('#fuel-motion-mode').selectOption('equilibrium');await page.locator('#fuel-plot').selectOption('composition');
 await expect(scene).toHaveAttribute('data-model','Equilibrium reference');await expect(plot).toHaveAttribute('data-model','Equilibrium reference');
 await page.locator('#fuel-motion-mode').selectOption('flow');await expect(scene).toHaveAttribute('data-model','Flow reference');
 await page.locator('#fuel-plot').selectOption('field');
 await expect(plot).toHaveAttribute('data-model','Separate reference calculation');await expect(plot).not.toHaveAttribute('data-time-s');
 await expect(page.locator('#fuel-plot optgroup')).toHaveCount(4);
});
