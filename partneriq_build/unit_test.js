// Unit tests for the pure functions: number/date formatting, season normalization,
// brand alias resolution, and file-type detection.
//
// These are the functions that silently produce wrong numbers rather than throwing,
// so they are the ones worth pinning down. Run with:  node unit_test.js
const { loadDashboard, expose, evalIn, createRunner } = require('./test_harness');

const ctx = loadDashboard();
expose(ctx, [
  'formatNum', 'formatCurrency', 'formatPct', 'pctChange',
  'normalizeSeasonLabel', 'resolveCanonicalBrandName', 'compactBrandToken',
  'detectFileType', 'escapeHTML', 'escapeAttr', 'Papa', 'DataStore',
  'brandTokenSimilarity', 'findNearMissBrandPairs', 'getBrandNamingReport',
  'DASHBOARD_VERSION',
]);

const t = createRunner('unit_test');
const {
  formatNum, formatCurrency, formatPct, pctChange,
  normalizeSeasonLabel, resolveCanonicalBrandName,
  detectFileType, escapeHTML, escapeAttr, Papa,
} = ctx;

// ────────────────────────────────────────────────────────────
t.group('formatNum / formatCurrency — magnitude and guards');
t.eq('0 stays 0',                       formatNum(0), '0');
t.eq('999 is not abbreviated',          formatNum(999), '999');
t.eq('1,000 becomes 1.0K',              formatNum(1000), '1.0K');
t.eq('999,999 rolls up to millions',    formatNum(999999), '1.00M');
t.eq('999,949 stays in thousands',      formatNum(999949), '999.9K');
t.eq('1,000,000 becomes 1.00M',         formatNum(1000000), '1.00M');
t.eq('999,999,999 rolls up to 1.00B',   formatNum(999999999), '1.00B');
t.eq('negatives keep their sign',       formatNum(-1500), '-1.5K');
t.eq('NaN renders as a dash',           formatNum(NaN), '—');
t.eq('null renders as a dash',          formatNum(null), '—');
t.eq('Infinity renders as a dash',      formatNum(Infinity), '—');
t.eq('-Infinity renders as a dash',     formatNum(-Infinity), '—');
t.eq('currency rolls up too',           formatCurrency(999999), '$1.00M');
t.eq('currency rejects Infinity',       formatCurrency(Infinity), '—');
t.eq('currency handles zero',           formatCurrency(0), '$0');
t.eq('formatPct rounds to digits',      formatPct(0.12345, 2), '12.35%');
t.eq('formatPct rejects Infinity',      formatPct(Infinity), '—');

// ────────────────────────────────────────────────────────────
t.group('pctChange — division guards');
t.eq('zero prior yields null',          pctChange(10, 0), null);
t.eq('null prior yields null',          pctChange(10, null), null);
t.eq('drop to zero is -100%',           pctChange(0, 10), -1);
t.eq('normal growth',                   pctChange(15, 10), 0.5);
t.eq('negative prior yields null',      pctChange(10, -5), null);

// ────────────────────────────────────────────────────────────
t.group('normalizeSeasonLabel — season strings only');
t.eq('canonical form passes through',   normalizeSeasonLabel('2024-25'), '2024-25');
t.eq('four-digit range normalizes',     normalizeSeasonLabel('2024-2025'), '2024-25');
t.eq('prefixed range normalizes',       normalizeSeasonLabel('NBA 2024-2025'), '2024-25');
t.eq('slash range normalizes',          normalizeSeasonLabel('FY 2024/25'), '2024-25');
t.eq('en-dash range normalizes',        normalizeSeasonLabel('2024–25'), '2024-25');
t.eq('two-digit range expands',         normalizeSeasonLabel('24-25'), '2024-25');
t.eq('bare year becomes a season',      normalizeSeasonLabel('2025'), '2024-25');
t.eq('an ISO date is rejected',         normalizeSeasonLabel('2025-01-15'), '');
t.eq('a US date is rejected',           normalizeSeasonLabel('1/5/2025'), '');
t.eq('empty stays empty',               normalizeSeasonLabel(''), '');
t.eq('null stays empty',                normalizeSeasonLabel(null), '');

// ────────────────────────────────────────────────────────────
t.group('resolveCanonicalBrandName — alias resolution');
t.eq('exact alias key',                 resolveCanonicalBrandName('Moda'), 'Moda Health');
t.eq('uppercase alias variant',         resolveCanonicalBrandName('MODA ASSIST'), 'Moda Health');
t.eq('dealership rolls up',             resolveCanonicalBrandName('Toyota of Portland'), 'Toyota');
t.eq('whitespace is trimmed',           resolveCanonicalBrandName('  Adidas '), 'Adidas');
t.eq('spacing variant of canonical',    resolveCanonicalBrandName('McDonalds'), "McDonald's");
t.eq('canonical passes through',        resolveCanonicalBrandName("McDonald's"), "McDonald's");
t.eq('case variant of a canonical',     resolveCanonicalBrandName('NIKE'), 'Nike');
t.eq('lowercase variant of canonical',  resolveCanonicalBrandName('nike'), 'Nike');
t.eq('no-space variant of canonical',   resolveCanonicalBrandName('DeltaDental'), 'Delta Dental');
t.eq('season suffix stripped (Spirit)', resolveCanonicalBrandName('Spirit Mountain 2024-25'), 'Spirit Mountain Casino');
t.eq('season suffix stripped (Umpqua)', resolveCanonicalBrandName('Umpqua 2025-26'), 'Columbia Bank');
t.eq('season suffix stripped (Moda)',   resolveCanonicalBrandName('Moda 2025-26'), 'Moda Health');
t.eq('season suffix stripped (Coke)',   resolveCanonicalBrandName('Coke Sprite 2025-26'), 'Coca-Cola');
t.eq('future season strips the same',   resolveCanonicalBrandName('Umpqua 2027-28'), 'Columbia Bank');
t.eq('Umpqua Bank rolls into Columbia', resolveCanonicalBrandName('Umpqua Bank'), 'Columbia Bank');
t.eq('spelling fixed (Deschutes)',      resolveCanonicalBrandName('Deshutes Brewing'), 'Deschutes Brewing');
t.eq('spelling fixed (Windermere)',     resolveCanonicalBrandName('Windemere Real Estate'), 'Windermere Real Estate');
t.eq('bare Deschutes resolves',         resolveCanonicalBrandName('Deschutes'), 'Deschutes Brewing');
t.eq('FY-form season strips too',       resolveCanonicalBrandName('Moda FY26'), 'Moda Health');
t.eq('and/& variant maps',              resolveCanonicalBrandName('Boys and Girls Club'), 'Boys & Girls Club');
t.eq('bare number is NOT a season stub',resolveCanonicalBrandName('Studio 54'), 'Studio 54');
t.eq('trailing year alone not stripped',resolveCanonicalBrandName('Unknown Brand Co'), 'Unknown Brand Co');
t.eq('empty stays empty',               resolveCanonicalBrandName(''), '');
t.check('memoization is transparent',
  resolveCanonicalBrandName('Moda') === resolveCanonicalBrandName('Moda'));

// ────────────────────────────────────────────────────────────
t.group('detectFileType — no silent misclassification');
t.eq('roster by prefix',                detectFileType('Partners_2025.csv', []), 'roster');
t.eq('tv by explicit token',            detectFileType('TV_signage.csv', []), 'tv');
t.eq('tv CamelCase, no separators',     detectFileType('TVVisibleSignage.csv', []), 'tv');
t.eq('tv CamelCase with a date suffix', detectFileType('TVVisibleSignage 2024-25.csv', []), 'tv');
t.eq('tv by column schema, odd name',   detectFileType('export_final_v3.csv', [{ Brand: 'X', Tool: 'Broadcast', Matchdate: '1/5/2025' }]), 'tv');
t.eq('paid by token',                   detectFileType('Q3_paid_meta.csv', []), 'paid');
t.eq('survey by prefix',                detectFileType('Survey_Wave1.csv', []), 'survey');
t.eq('general survey by prefix',        detectFileType('GeneralSurvey_W1.csv', []), 'generalSurvey');
t.eq('"tv" inside a word is not tv',    detectFileType('shortvideo_report.csv', []), 'unknown');
t.eq('Netvibes is not tv',              detectFileType('Netvibes.csv', []), 'unknown');
t.eq('unknown files are not organic',   detectFileType('budget.csv', []), 'unknown');
t.eq('random files are not organic',    detectFileType('meeting-notes.csv', []), 'unknown');
t.eq('organic still detected by prefix',
  detectFileType('BrandedPartnerPerformance_Q1.csv', []), 'zoomphBrand');
t.eq('organic detected by column shape',
  detectFileType('anything.csv', [{ Partner: 'X', PartnerExposureDate: '1/5/2025', Impressions: 10 }]), 'organic');

// ────────────────────────────────────────────────────────────
t.group('CSV shim — parsing fidelity');
const dup = Papa.parse('A,Segment,Segment\n1,Reg,Pre Season', { header: true }).data[0];
t.eq('duplicate headers are suffixed',  Object.keys(dup), ['A', 'Segment', 'Segment_1']);
t.eq('first duplicate keeps its value', dup.Segment, 'Reg');
t.eq('second duplicate is preserved',   dup.Segment_1, 'Pre Season');

const zip = Papa.parse('Zip\n07030', { header: true, dynamicTyping: true }).data[0];
t.eq('leading zeros survive',           zip.Zip, '07030');

const plain = Papa.parse('N\n1234', { header: true, dynamicTyping: true }).data[0];
t.eq('ordinary numbers still coerce',   plain.N, 1234);

const neg = Papa.parse('N\n-12.5', { header: true, dynamicTyping: true }).data[0];
t.eq('negative decimals coerce',        neg.N, -12.5);

const quoted = Papa.parse('A,B\n"x, y","he said ""hi"""', { header: true }).data[0];
t.eq('quoted commas survive',           quoted.A, 'x, y');
t.eq('escaped quotes survive',          quoted.B, 'he said "hi"');

const crlf = Papa.parse('A\r\n1\r\n2\r\n', { header: true, skipEmptyLines: true }).data;
t.eq('CRLF rows parse',                 crlf.length, 2);

// ────────────────────────────────────────────────────────────
t.group('escaping');
t.eq('escapeHTML covers the five',      escapeHTML(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
t.eq('escapeHTML handles null',         escapeHTML(null), '');
t.eq('escapeAttr neutralizes quotes',   escapeAttr(`McDonald's`), 'McDonald&#39;s');
t.eq('escapeAttr neutralizes doubles',  escapeAttr('say "hi"'), 'say &quot;hi&quot;');

// ────────────────────────────────────────────────────────────
t.group('brand naming report — alias tooling');
t.check('similarity is 1 for identical',  ctx.brandTokenSimilarity('Toyota', 'Toyota') === 1);
t.check('similarity is high for typo',    ctx.brandTokenSimilarity('Spirit Mountain', 'Spirit Mountian') > 0.85);
t.check('similarity is low for unrelated', ctx.brandTokenSimilarity('Toyota', 'Adidas') < 0.4);
t.check('near-miss pairs are found', (() => {
  const pairs = ctx.findNearMissBrandPairs(['Alaska Airlines', 'Alaska Airlnes', 'Toyota']);
  return pairs.some(p =>
    (p.a === 'Alaska Airlines' && p.b === 'Alaska Airlnes') ||
    (p.b === 'Alaska Airlines' && p.a === 'Alaska Airlnes'));
})());
t.check('identical names are not flagged as near-misses',
  ctx.findNearMissBrandPairs(['Toyota', 'Adidas', 'Nike']).length === 0);

// ────────────────────────────────────────────────────────────
// Calculation fixes from the v0.53 data review. These use small synthetic
// datasets so each one pins the exact behaviour that was wrong.
t.group('TV YoY — prior window matches venue, not just game count');
t.eq('home fixture is home',            evalIn(ctx, `isHomeBroadcast({ Match: 'Phoenix Suns @ Portland Trail Blazers' })`), true);
t.eq('away fixture is away',            evalIn(ctx, `isHomeBroadcast({ Match: 'Portland Trail Blazers @ Phoenix Suns' })`), false);
t.eq('unnamed fixture is unknown',      evalIn(ctx, `isHomeBroadcast({ Match: 'Unspecified' })`), null);
const tvRow = (date, season, home, qimv) => ({
  Brand: 'Moda Health', Tool: 'On Surface Branding', Location: 'Court', Matchdate: date, Season: season,
  Match: home ? 'Opp @ Portland Trail Blazers' : 'Portland Trail Blazers @ Opp', 'QI Media Value ($)': qimv,
});
const tvFixture = [
  tvRow('2025-10-01', '2025-26', true, 100), tvRow('2025-10-05', '2025-26', true, 100),
  // prior season: an away game falls between the first two home games
  tvRow('2024-10-01', '2024-25', true, 80), tvRow('2024-10-03', '2024-25', false, 1),
  tvRow('2024-10-05', '2024-25', true, 80), tvRow('2024-10-07', '2024-25', true, 80),
];
evalIn(ctx, `(() => { DataStore.reset(); DataStore.tvSignage = ${JSON.stringify(tvFixture)}; canonicalizeAllBrandData(true); comparisonMode = 'auto-match'; })()`);
t.eq('window takes the first 2 home dates, skipping the away game',
  evalIn(ctx, `[...getPortfolioPriorWindow('2025-26', '2024-25').dates].sort().join(',')`), '2024-10-01,2024-10-05');
t.eq('portfolio YoY compares 200 with 160',
  evalIn(ctx, `(() => { const s = getPortfolioYoYRowSets('2025-26'); return sum(s.currRows, 'QI Media Value ($)') + '/' + sum(s.priorRows, 'QI Media Value ($)'); })()`), '200/160');
t.eq('partner YoY uses the same window', evalIn(ctx, `computeYoYForMetric('Moda Health', '2025-26', 'QI Media Value ($)').prev`), 160);
t.check('basis names home broadcasts',  /home broadcasts/.test(evalIn(ctx, `getPortfolioYoYRowSets('2025-26').basis`)));

t.group('virtual signage — date matching and shared slots');
t.eq('ISO dates normalise',             evalIn(ctx, `normalizeVSDate('2025-10-22')`), '2025-10-22');
t.eq('schedule dates normalise',        evalIn(ctx, `normalizeVSDate('10/22/25')`), '2025-10-22');
const vsRow = (brand, date, loc, qimv) => ({ Brand: brand, Tool: 'Virtual Branding', Location: loc, Matchdate: date, Season: '2025-26', Match: 'Opp @ Portland Trail Blazers', 'QI Media Value ($)': qimv });
evalIn(ctx, `(() => {
  DataStore.reset();
  DataStore.tvSignage = ${JSON.stringify([vsRow("McDonald's", '2026-01-17', 'Center', 30), vsRow('Mortgage Matchup', '2026-01-17', 'Center', 28), vsRow('Toyota', '2026-01-19', 'Center', 50)])};
  DataStore.virtualSignageSchedule = [
    { DateRaw: '1/17/26', IsHome: true,  BrandA: "McDonald's", _rawBrandA: "McDonald's" },
    { DateRaw: '1/19/26', IsHome: true,  BrandA: 'Toyota',     _rawBrandA: 'Toyota' },
    { DateRaw: '1/21/26', IsHome: false, BrandA: 'Toyota',     _rawBrandA: 'Toyota' },
  ];
  canonicalizeAllBrandData(true);
})()`);
const vsStats = JSON.parse(evalIn(ctx, `JSON.stringify(getVirtualSignagePartnerStats())`));
const mcd = vsStats.find(p => p.brand === "McDonald's"), toy = vsStats.find(p => p.brand === 'Toyota');
t.eq('shared slot credits only the scheduled brand', mcd.qimv, 30);
t.eq('home game with a TV row is measured',          mcd.measuredGames, 1);
t.eq('away game is estimated from the slot mean',    toy.estimatedQimv, 40);
t.eq('measured and estimated add up',                toy.measuredQimv + toy.estimatedQimv, toy.qimv);

t.group('dates — spreadsheet serials');
t.eq('46113 is Apr 1, 2026',            evalIn(ctx, `parseDateLoose('46113').toDateString()`), 'Wed Apr 01 2026');
t.eq('serial rewritten for display',    evalIn(ctx, `fixSpreadsheetDateString('46113')`), '4/1/2026');
t.eq('normal dates are untouched',      evalIn(ctx, `fixSpreadsheetDateString('4/1/2026')`), '4/1/2026');
t.eq('small numbers are not dates',     evalIn(ctx, `spreadsheetSerialToDate('12345')`), null);
t.eq('far-future years are rejected',   evalIn(ctx, `parseDateLoose('Jan 1, 46113')`), null);

t.group('paid — season comes from the campaign name');
t.eq('June-flighted 2025-26 campaign is 2025-26', evalIn(ctx, `normalizePaidRow({ 'Campaign name': '2025-26_GS_PupCity_TRF_CLKS_META_6/25/25_Traffic', Starts: '6/25/2025', Ends: '7/26/2025', 'Amount spent (USD)': 1 }).Season`), '2025-26');
t.eq('no season in name → flight date',  evalIn(ctx, `normalizePaidRow({ 'Campaign name': 'Spring push', Starts: '3/1/2025', Ends: '3/9/2025', 'Amount spent (USD)': 1 }).Season`), '2024-25');

t.group('organic — Brand Performance sums monthly reports');
evalIn(ctx, `(() => {
  DataStore.reset();
  DataStore.zoomphBrandPerf = [
    { Brand: 'Nike', _reportMonth: '2025-07', ViewsImpressions: 217, Engagements: 10, BrandValue: 5 },
    { Brand: 'Nike', _reportMonth: '2025-08', ViewsImpressions: 28,  Engagements: 4,  BrandValue: 1 },
  ];
  organicPortfolioDateMode = 'all';
})()`);
t.eq('all months = sum, not latest',    evalIn(ctx, `getOrganicPortfolioRowsForTab('perf')[0].ViewsImpressions`), 245);
t.eq('months counted',                  evalIn(ctx, `getOrganicPortfolioRowsForTab('perf')[0].rowCount`), 2);

t.group('brand aliases — roster and schedule spellings');
[['Polar Beverages', 'Polar'], ['Vortex', 'Vortex Legacy Group'], ['KeyBank - National', 'KeyBank'],
 ['Comcast Cable Communications', 'Xfinity'], ['Yakama Nation Legends Casino Hotel', 'Legends Casino']]
  .forEach(([raw, want]) => t.eq(`${raw} → ${want}`, resolveCanonicalBrandName(raw), want));

t.group('export — built from a template, not the live page');
const tmpl = `<!DOCTYPE html>\n<html lang="en" class="stale">\n<script>/* PRELOADED_DATA_START */\nconst PRELOADED_DATA = null;\n/* PRELOADED_DATA_END */\n/* DASHBOARD_META_START */\nconst DASHBOARD_META = {};\n/* DASHBOARD_META_END */\n/* VIEWER_MODE_START */\nconst VIEWER_MODE = false;\n/* VIEWER_MODE_END */</script></html>`;
ctx.__tmpl = tmpl;
const built = evalIn(ctx, `buildExportHTML(globalThis.__tmpl, { tvSignage: [{ Brand: 'Nike' }] }, { updateNotes: "Up $' and $& too" }, true)`);
t.check('opens in light mode',             /<html lang="en" data-theme="light" class="pqi-preboot">/.test(built));
t.check('editor exports skip the intro cover', !/pqi-preboot/.test(evalIn(ctx, `buildExportHTML(globalThis.__tmpl, {}, {}, false)`)));
t.check('viewer mode switched on',         built.includes('const VIEWER_MODE = true;'));
t.check('"$\'" and "$&" in notes survive', built.includes("Up $' and $\\u0026 too")); // & is JSON-escaped
t.eq('payload round-trips',                evalIn(ctx, `JSON.parse(LZString.decompressFromBase64(globalThis.__built.match(/decompressFromBase64\\('([^']+)'/)[1])).tvSignage[0].Brand`.replace('globalThis.__built', JSON.stringify(built))), 'Nike');
t.check('tvRatings is no longer exported', !('tvRatings' in evalIn(ctx, `getSerializableDataStore()`)));

t.group('TV Ratings files are recognised and declined');
t.eq('Nielsen schema detected', detectFileType('vw_nielsen_tv_metrics.csv', [{ 'HH Rtg': 1, Demo: 'HH', Opponent: 'PHX' }]), 'tvRatings');

t.group('version constant');
t.check('DASHBOARD_VERSION is defined', typeof ctx.DASHBOARD_VERSION === 'string' && /^v\d+\.\d+$/.test(ctx.DASHBOARD_VERSION));

t.finish();
