import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {pinReleaseLinks,releaseSourceBase} from '../scripts/release-links.mjs';

const revision='8cab091a3458a050142049f9227238d18e51b53d';

test('published help pins implementation and evidence links while retaining independent sources',t=>{
 const dom=new JSDOM(pinReleaseLinks(readFileSync('web-assets/how-it-works.html','utf8'),revision));t.after(()=>dom.window.close());
 const links=[...dom.window.document.querySelectorAll<HTMLAnchorElement>('.sources a')];
 const repo=links.filter(a=>a.hostname==='github.com');
 assert.equal(repo.length,3);
 for(const link of repo)assert.ok(link.href.startsWith(releaseSourceBase(revision)));
 assert.ok(links.some(a=>a.href==='https://www.grc.nasa.gov/www/wind/valid/tutorial/overview.html'));
 assert.ok(links.some(a=>a.href==='https://www.marathonfusion.com/fusion-energy/'));
 const pinned=`https://github.com/noahsong-sdg/mass-spinner/blob/${'a'.repeat(40)}/src/fuel-operation.ts`;
 assert.equal(pinReleaseLinks(pinned,revision),pinned);
});

test('missing or moving release identities cannot publish plausible but untraceable source links',()=>{
 for(const revision of [undefined,'','main','codex/linked-physics-guide','8cab091','" onclick="alert(1)'])
  assert.throws(()=>releaseSourceBase(revision),/exact Git revision/);
});
