import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('compact playground keeps the four original controls, labels and integration mounts',()=>{
 const html=readFileSync('index.html','utf8');
 for(const id of ['field','voltage','energy','play-mass-b']){
  assert.equal([...html.matchAll(new RegExp(`id="${id}"`,'g'))].length,1);
  assert.match(html,new RegExp(`for="${id}"`));
 }
 for(const id of ['separator-inspector','fusion-inspector','neutron-geometry','replay-retry'])
  assert.equal([...html.matchAll(new RegExp(`id="${id}"`,'g'))].length,1);
 assert.match(html,/<details><summary>[^<]+<\/summary><div id="fusion-assumption-controls"/);
 for(const target of ['workspace','live-plots','method-guide','failure-lab','model']){
  // Every visible section link must retain its actual destination.
  if(html.includes(`href="#${target}"`))assert.ok(html.includes(`id="${target}"`));
 }
});

test('narrow level-one grid outranks the shared legacy flex rule without changing model-lab layout',()=>{
 const css=readFileSync('src/style.css','utf8');
 assert.match(css,/@media\(max-width:740px\)\{\s*body\[data-level="1"\] \.controls\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/body\[data-level="1"\] \.controls>:is\(\.presets,\.cutoff-readout,\.run-button,\.run-status\)\{grid-column:1\/-1\}/);
 // The level attribute makes the corrective rule strictly more specific than
 // the later legacy .controls selector, independent of their source order.
 assert.ok(!css.includes('body[data-level="3"] .controls{display:grid'));
});
