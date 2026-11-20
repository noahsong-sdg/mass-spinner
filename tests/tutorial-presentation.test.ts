import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorialPresentation,tutorialRoute} from '../src/tutorial-presentation.js';
import {guideActions,numberedTutorials} from '../src/guide-topics.js';
import {playgroundSteps} from '../src/playground-guide-steps.js';

test('every tutorial action has a specific observation and physical scope',()=>{
 const actions=new Set([...guideActions,...playgroundSteps.flatMap(s=>s.actions.map(([key])=>key)),...numberedTutorials.flatMap(t=>t.topics.flatMap(s=>s.actions.map(([key])=>key)))]);
 for(const key of actions){const cue=tutorialPresentation(key);assert.ok(cue,key);assert.ok(cue.watch.length>10,key);assert.ok(cue.note.length>10,key);}
 assert.match(tutorialPresentation('spin')!.note,/not individual atom paths/);
 assert.match(tutorialPresentation('cut')!.note,/does not extract/);
 assert.match(tutorialPresentation('magneticLeverage')!.note,/adjusts current/);
 assert.match(tutorialPresentation('modelInfo')!.note,/does not establish experimental accuracy/);
 assert.equal(tutorialPresentation('not-an-action'),undefined);
});

test('reader routes accept all six tutorials but reject external or executable routes',()=>{
 for(const path of ['/start.html#current','/guide#energy','/learn.html','/how-it-works.html','/equilibrium.html','/qualification.html',...['03','04','05','06'].map(n=>`/tutorial-${n}.html#limits`)])assert.equal(tutorialRoute(path),path);
 for(const path of [null,'','//example.org/start.html','https://example.org/start.html','javascript:alert(1)','/index.html','/start.html?x=1','/start.html#<script>','/start.html/../index.html'])assert.equal(tutorialRoute(path),null);
});

test('prompts separate physical temperature changes, fixed-speed references and independent calculators',()=>{
 assert.match(tutorialPresentation('gasTemperature')!.note,/initial pressure.*inventory and inertia.*speed can change/s);
 assert.match(tutorialPresentation('temperature')!.watch,/same rotation speed/);
 assert.match(tutorialPresentation('equilibrium')!.watch,/Use sampled state first/);
 assert.match(tutorialPresentation('equilibrium')!.note,/imports.*once.*independent inputs/);
 for(const key of ['work','thermalPlot','separationPlot','spinPlot','current','collisions','drag']){
  const cue=tutorialPresentation(key)!;
  assert.match(cue.note,/plot shows coupled history.*reference view.*3D uses a separate state/);
  assert.equal(cue.replay,true);
 }
 assert.match(tutorialPresentation('thermal')!.watch,/Enable Evolve gas & liner temperature/);
 assert.match(tutorialPresentation('work')!.note,/does not include all resistive heat and cooling energy/);
 assert.match(tutorialPresentation('density')!.note,/vessel mean.*axis density/);
});
