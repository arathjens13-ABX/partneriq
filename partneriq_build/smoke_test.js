// Smoke test for the file-manager change. Extracts the JS from dist/partneriq.html,
// loads it with minimal DOM stubs, and exercises ingest → tag → remove → serialize.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'dist', 'partneriq.html'), 'utf-8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

function makeEl() {
  return {
    innerHTML: '', value: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, removeChild() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    click() {},
  };
}
global.document = {
  addEventListener() {},
  getElementById: () => makeEl(),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => makeEl(),
  documentElement: { dataset: {}, outerHTML: '' },
  body: makeEl(),
};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.window = global;
global.confirm = () => true;
global.prompt = () => null;
global.alert = () => {};
global.navigator = { userAgent: 'node' };

const vm = require('vm');
const ctx = vm.createContext(global);
scripts.forEach((s, i) => {
  // Test-only: make PRELOADED_DATA reassignable so the hydrate round-trip can inject a payload
  const src = s.replace('const PRELOADED_DATA', 'let PRELOADED_DATA');
  try { vm.runInContext(src, ctx); }
  catch (e) { console.error(`script block ${i} failed to load:`, e.message); process.exit(1); }
});
// const/let bindings live in the context's lexical scope, not on globalThis — bridge what the tests need
vm.runInContext('globalThis.DataStore = DataStore; globalThis.__setPreloaded = v => { PRELOADED_DATA = v; };', ctx);

let failures = 0;
function check(name, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + name);
  if (!cond) failures++;
}

function fakeFile(name, csv) { return { name, text: async () => csv }; }

(async () => {
  const TV_CSV = 'Brand,Season,Location,Tool,Matchdate,QI Media Value ($),Sponsorship QI Impressions,Duration (Minutes),Source Exposures\n' +
    'Acme Corp,2024-25,LED Ribbon,Broadcast,1/5/2025,1000,50000,2.5,10\n' +
    'Acme Corp,2024-25,Jumbotron,Broadcast,1/5/2025,2000,80000,1.5,8\n';
  const TV_CSV_V2 = 'Brand,Season,Location,Tool,Matchdate,QI Media Value ($),Sponsorship QI Impressions,Duration (Minutes),Source Exposures\n' +
    'Acme Corp,2024-25,LED Ribbon,Broadcast,1/5/2025,1100,51000,2.5,10\n' +
    'Acme Corp,2024-25,Jumbotron,Broadcast,1/5/2025,2100,81000,1.5,8\n' +
    'Acme Corp,2024-25,Dasher Board,Broadcast,1/8/2025,500,20000,1.0,4\n';

  console.log('1. ingest tags rows and registers the file');
  const r1 = await ctx.ingestFile(fakeFile('TV_signage_test.csv', TV_CSV));
  check('ingest succeeded as tv', r1.success && r1.type === 'tv');
  check('result carries fileId', !!r1.fileId);
  check('2 rows stored', ctx.DataStore.tvSignage.length === 2);
  check('all rows tagged with fileId', ctx.DataStore.tvSignage.every(r => r._fileId === r1.fileId));
  check('brand registered', ctx.DataStore.brands.has('Acme Corp'));

  console.log('2. handleFiles replaces a duplicate filename instead of duplicating (confirm → OK)');
  ctx.DataStore.loadedFiles.push({ ...r1, loadedAt: '2026-06-09' });
  await ctx.handleFiles([fakeFile('TV_signage_test.csv', TV_CSV_V2)]);
  check('registry holds exactly one entry', ctx.DataStore.loadedFiles.length === 1);
  const entry2 = ctx.DataStore.loadedFiles[0];
  check('rows swapped, not added (3, not 5)', ctx.DataStore.tvSignage.length === 3);
  check('new fileId differs', entry2.fileId !== r1.fileId);
  check('all rows belong to new file', ctx.DataStore.tvSignage.every(r => r._fileId === entry2.fileId));

  console.log('3. removeFileDataById strips rows and registry entry');
  ctx.removeFileDataById(entry2.fileId);
  ctx.canonicalizeAllBrandData();
  check('tvSignage empty', ctx.DataStore.tvSignage.length === 0);
  check('registry empty', ctx.DataStore.loadedFiles.length === 0);
  check('brand gone after rebuild', !ctx.DataStore.brands.has('Acme Corp'));

  console.log('4. brand-keyed collections (organic fallback) empty out cleanly');
  const o1 = await ctx.ingestFile(fakeFile('AcmeCorp_Jan2025.csv', 'Partner,PartnerExposureDate,Impressions\nAcme Corp,1/5/2025,1000\n'));
  check('organic ingest succeeded', o1.success && o1.type === 'organic');
  const brandKey = Object.keys(ctx.DataStore.organicSocial)[0];
  check('bucket created', !!brandKey);
  ctx.removeFileDataById(o1.fileId);
  check('empty bucket deleted', Object.keys(ctx.DataStore.organicSocial).length === 0);

  console.log('5. serialize → hydrate round-trips the registry');
  const r3 = await ctx.ingestFile(fakeFile('TV_signage_test.csv', TV_CSV));
  ctx.DataStore.loadedFiles.push({ ...r3, loadedAt: '2026-06-09' });
  ctx.DataStore.loadedFiles.push({ success: false, error: 'bad file', filename: 'broken.csv', fileId: 'f-err' });
  const snap = ctx.getSerializableDataStore();
  check('export includes loadedFiles', Array.isArray(snap.loadedFiles));
  check('error entries excluded from export', snap.loadedFiles.length === 1 && snap.loadedFiles[0].filename === 'TV_signage_test.csv');
  check('exported rows keep _fileId', snap.tvSignage.every(r => r._fileId === r3.fileId));
  const json = JSON.parse(JSON.stringify(snap));
  ctx.__setPreloaded(json);
  check('hydrate restores registry', ctx.loadPreloadedData() === true && ctx.DataStore.loadedFiles.length === 1);
  check('hydrated rows still removable', (() => {
    ctx.removeFileDataById(ctx.DataStore.loadedFiles[0].fileId);
    return ctx.DataStore.tvSignage.length === 0 && ctx.DataStore.loadedFiles.length === 0;
  })());

  console.log('7. brand-alias CSV writes rules, resolves data, and reverts on remove');
  ctx.DataStore.reset();
  // A source file that uses a variant spelling the alias sheet will map.
  const TV_VARIANT = 'Brand,Season,Location,Tool,Matchdate,QI Media Value ($),Sponsorship QI Impressions,Duration (Minutes),Source Exposures\n' +
    'Widgets NW,2024-25,LED Ribbon,Broadcast,1/5/2025,1000,50000,2.5,10\n';
  const tvRes = await ctx.ingestFile(fakeFile('TV_widgets.csv', TV_VARIANT));
  ctx.DataStore.loadedFiles.push({ ...tvRes, loadedAt: '2026-09-08' });
  check('variant brand present before aliasing', ctx.DataStore.brands.has('Widgets NW'));

  const ALIAS_CSV = 'Source Name,Canonical Name\nWidgets NW,Widgets Northwest\nWidgets NW,Widgets Northwest\n,\nSame,Same\n';
  await ctx.handleFiles([fakeFile('Aliases_master.csv', ALIAS_CSV)]);
  const aliasEntry = ctx.DataStore.loadedFiles.find(f => f.type === 'brandAliases');
  check('alias file registered as brandAliases', !!aliasEntry && aliasEntry.type === 'brandAliases');
  check('one usable mapping recorded (dupes/blank/self-map skipped)', aliasEntry.rows === 1);
  check('alias rule written to brandMergeRules', ctx.DataStore.brandMergeRules['Widgets NW'] === 'Widgets Northwest');
  check('resolution now maps the variant', ctx.resolveCanonicalBrandName('Widgets NW') === 'Widgets Northwest');
  check('TV rows re-canonicalized to the mapped name', ctx.DataStore.tvSignage.every(r => r.Brand === 'Widgets Northwest'));
  check('brand set carries the canonical, not the variant',
    ctx.DataStore.brands.has('Widgets Northwest') && !ctx.DataStore.brands.has('Widgets NW'));

  console.log('8. alias rules travel with an export and survive hydrate');
  const aliasSnap = JSON.parse(JSON.stringify(ctx.getSerializableDataStore()));
  check('brandMergeRules exported', aliasSnap.brandMergeRules && aliasSnap.brandMergeRules['Widgets NW'] === 'Widgets Northwest');
  check('alias registry entry exported', (aliasSnap.loadedFiles || []).some(f => f.type === 'brandAliases'));
  ctx.__setPreloaded(aliasSnap);
  ctx.loadPreloadedData();
  check('alias rule restored on hydrate', ctx.resolveCanonicalBrandName('Widgets NW') === 'Widgets Northwest');

  console.log('9. removing the alias file reverts its rules');
  const aliasFileId = ctx.DataStore.loadedFiles.find(f => f.type === 'brandAliases').fileId;
  ctx.removeFileDataById(aliasFileId);
  ctx.canonicalizeAllBrandData();
  check('alias rule dropped from brandMergeRules', ctx.DataStore.brandMergeRules['Widgets NW'] === undefined);
  check('resolution no longer maps the variant', ctx.resolveCanonicalBrandName('Widgets NW') === 'Widgets NW');
  check('a shipped default alias is untouched by all this', ctx.resolveCanonicalBrandName('Comcast') === 'Xfinity');

  console.log('6. reset clears the registry');
  ctx.DataStore.loadedFiles.push({ success: true, filename: 'x.csv', fileId: 'f-x' });
  ctx.DataStore.reset();
  check('loadedFiles cleared by reset', ctx.DataStore.loadedFiles.length === 0);

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll smoke tests passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('Test harness error:', e); process.exit(1); });
