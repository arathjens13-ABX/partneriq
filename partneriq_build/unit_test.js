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

t.group('partner report — model and document');
evalIn(ctx, `(() => {
  DataStore.reset();
  DataStore.zoomphBrandPerf = [
    { Brand: 'Nike', _reportMonth: '2025-06', ViewsImpressions: 999, BrandValue: 999, Engagements: 1, OrganicPosts: 1 },
    { Brand: 'Nike', _reportMonth: '2025-07', ViewsImpressions: 217, BrandValue: 5, Engagements: 10, OrganicPosts: 3 },
    { Brand: 'Nike', _reportMonth: '2025-08', ViewsImpressions: 28,  BrandValue: 1, Engagements: 4,  OrganicPosts: 2 },
  ];
  DataStore.surveys = [
    { Brand: 'Nike', Survey: '2025-26 Early', Season: '2025-26', Phase: 'Early', UnaidedPct: 0.3, UnaidedRecallRank: 2, AidedPct: 0, AidedRecallRank: null, LocalHQPct: null },
  ];
  canonicalizeAllBrandData(true);
})()`);
const rm = JSON.parse(evalIn(ctx, `JSON.stringify((() => { const m = buildReportModel('Nike', '2025-26'); return { organic: m.sections.organic.totals, orgCount: m.sections.organic.count, tv: m.sections.tv.available, survey: m.sections.survey.kpis.map(k => k.value) }; })())`));
t.eq('organic sums the season\'s monthly reports (Jul–Jun)', rm.organic.views, 245);
t.eq('June belongs to the previous season',                 rm.orgCount, '2 reports');
t.eq('sections without data are unavailable, not zero',     rm.tv, false);
t.eq('0% with no rank reads as "not asked"',                rm.survey[1], '—');
const docHtml = evalIn(ctx, `renderReportDocument(buildReportModel('Nike', '2025-26'), {})`);
t.check('document embeds the design-system fonts',          docHtml.includes('font-family:"League Gothic"') && docHtml.includes('data:font/woff2;base64,'));
t.check('document is light only (no dark theme)',           !/prefers-color-scheme|data-theme="dark"/.test(docHtml));
t.check('document names the partner and season',            docHtml.includes('<title>Nike — Partnership report 2025-26</title>'));
t.check('dashboard source never closes its own <script>',   !evalIn(ctx, `RPT_PAGINATE_JS`).includes('</script'));

t.group('partner report — partner feedback round');
const fbRow = (date, season, qimv, loc, mins) => ({ ...tvRow(date, season, true, qimv), Location: loc, 'Duration (Minutes)': mins });
const fbTv = [
  fbRow('2025-10-01', '2025-26', 100, 'Court', 5), fbRow('2025-10-05', '2025-26', 100, 'Court', 5),
  fbRow('2025-10-05', '2025-26', 50, 'Upper Billboard', 5), fbRow('2025-10-05', '2025-26', 40, 'Tunnel', 5),
  fbRow('2024-10-01', '2024-25', 80, 'Court', 5), fbRow('2024-10-05', '2024-25', 80, 'Court', 5),
  fbRow('2024-10-05', '2024-25', 1, 'Tunnel', 0.2),
];
const fbSurvey = [
  { Brand: 'Moda Health', Survey: '2024-25 Early', Season: '2024-25', Phase: 'Early', UnaidedPct: 0.20, UnaidedRecallRank: 5, AidedPct: 0.50, AidedRecallRank: 4 },
  { Brand: 'Moda Health', Survey: '2025-26 Early', Season: '2025-26', Phase: 'Early', UnaidedPct: 0.25, UnaidedRecallRank: 3, AidedPct: 0.49, AidedRecallRank: 6 },
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((b, i) => ({ Brand: b, Survey: '2025-26 Early', Season: '2025-26', Phase: 'Early', UnaidedPct: 0.1, UnaidedRecallRank: i + 1, AidedPct: 0.3, AidedRecallRank: i + 1 })),
];
evalIn(ctx, `(() => {
  DataStore.reset();
  DataStore.tvSignage = ${JSON.stringify(fbTv)};
  DataStore.surveys = ${JSON.stringify(fbSurvey)};
  canonicalizeAllBrandData(true);
  comparisonMode = 'auto-match';
  DataStore.paidSocial = { 'Moda Health': [
    { CampaignName: 'Big push', Season: '2025-26', AmountSpentUSD: 9000, Impressions: 90000, LinkClicks: 450 },
    { CampaignName: 'Small push', Season: '2025-26', AmountSpentUSD: 1000, Impressions: 10000, LinkClicks: 150 },
  ] };
  globalThis.__fb = buildReportModel('Moda Health', '2025-26');
})()`);
const fb = JSON.parse(evalIn(ctx, `JSON.stringify(globalThis.__fb.sections)`));
t.eq('In-arena LED prints last',                       evalIn(ctx, `REPORT_SECTION_DEFS[REPORT_SECTION_DEFS.length - 1].key`), 'ancLED');
t.eq('TV breakdown is "Top signage locations"',          fb.tv.bars.title, 'Top signage locations · 2025-26');
t.check('TV breakdown prints above the chart',          fb.tv.bars.first === true);
t.eq('a location carries its own change',                fb.tv.bars.items.find(i => i.label === 'Court').delta, 0.25);
t.eq('a location new this season reads "New"',           fb.tv.bars.items.find(i => i.label === 'Upper Billboard').delta, 'new');
t.eq('under a minute on screen last season → no %',     fb.tv.bars.items.find(i => i.label === 'Tunnel').delta, null);
t.eq('broadcast tile says local broadcasts',             fb.tv.kpis[2].label, 'Local broadcasts');
t.eq('unaided rank tile',                                fb.survey.kpis[2].value + ' ' + fb.survey.kpis[2].suffix, '#3 of 7');
t.eq('rank change is places gained (5th → 3rd)',         fb.survey.kpis[2].delta, 2);
t.eq('aided rank drop is negative (4th → 6th)',          fb.survey.kpis[3].delta, -2);
t.check('survey takeaways are two at most',             fb.survey.insights.length <= 2);
t.check('paid never prints spend',                      !JSON.stringify(fb.paid.kpis).includes('Spend') && !fb.paid.table.columns.some(c => c.label === 'Spend') && !/\$/.test(fb.paid.insights.map(i => i.html).join(' ')));
t.eq('paid campaigns ranked by impressions',             fb.paid.table.title, 'Campaigns by impressions');
const fbDoc = opts => evalIn(ctx, `renderReportDocument(globalThis.__fb, ${JSON.stringify(opts)})`);
t.check('survey ranks are on by default',               fbDoc({}).includes('Unaided rank'));
t.check('survey ranks can be switched off',             !fbDoc({ surveyRanks: false }).includes('Unaided rank'));
t.check('location changes print with Compare on',       fbDoc({}).includes('class="bl wd"'));
t.check('and not with Compare off',                     !fbDoc({ compare: false }).includes('class="bl wd"'));
t.check('a section\'s chart can be hidden',              !fbDoc({ parts: { survey: { chart: false } } }).includes('Recall by survey wave'));
t.check('methodology names Nielsen and Qualtrics',      /Nielsen-defined/.test(fbDoc({})) && /Qualtrics/.test(fbDoc({})));
evalIn(ctx, `(() => { DataStore.reset(); DataStore.webBlazersBanners = [{ Brand: 'Nike', Season: '2025-26', LineItem: 'ROS Banner', Impressions: 5000, Clicks: 10 }]; canonicalizeAllBrandData(true); })()`);
const web = JSON.parse(evalIn(ctx, `JSON.stringify((() => { const m = buildReportModel('Nike', '2025-26'); return { sec: m.sections.webDisplay, doc: renderReportDocument(m, {}) }; })())`));
t.eq('web uses "Banner ad impressions"',                 web.sec.kpis[0].label, 'Banner ad impressions');
t.check('no pre-roll wording without pre-roll plays',   web.sec && !/pre-roll/i.test(web.doc));
t.check('TrailBlazers.com, not Blazers.com',            web.doc.includes('TrailBlazers.com') && !/[^l]Blazers\.com/.test(web.doc));

t.group('season pace — conservative projection');
// A season shape where 60% of value lands in the first half (a back-half fade).
t.check('a historical fade lowers the projection below straight pace',
  evalIn(ctx, `(() => { const fade = [0.3, 0.6, 0.8, 1.0]; return rptProject(100, 2, 4, [fade]) < 100 * 4 / 2; })()`));
t.eq('projection with a fade', evalIn(ctx, `Math.round(rptProject(100, 2, 4, [[0.3, 0.6, 0.8, 1.0]]))`), 167);
t.eq('a historically stronger finish is never assumed', evalIn(ctx, `rptProject(100, 2, 4, [[0.2, 0.4, 0.7, 1.0]])`), 200);
t.eq('no history → straight pace', evalIn(ctx, `rptProject(100, 2, 4, [])`), 200);

t.eq('pace is offered only from home game 14 to 20', evalIn(ctx, `RPT_PACE_MIN_GAMES + '-' + RPT_PACE_MAX_GAMES`), '14-20');
t.check('pace is off unless asked for', (() => {
  const h = evalIn(ctx, `renderReportDocument({ brand: 'X', season: '2025-26', generated: new Date(), period: { std: true, throughGame: 20, total: 41, throughDate: '2026-01-17', dates: [] },
    sections: Object.fromEntries(REPORT_SECTION_DEFS.map(d => [d.key, { ...d, available: d.key === 'tv', count: '', kpis: [], insights: [], source: '',
      pace: { value: 5, lo: 4, hi: 6, n: 20, G: 41 }, paceInsight: { html: 'On pace for 4–6', estimated: true }, perMinute: { label: 'Per minute', value: '1' }, totals: {} }])) }, {})`);
  return !h.includes('On pace for');
})());

t.group('local home broadcasts — season setting');
evalIn(ctx, `(() => { DataStore.reset(); setLocalHomeBroadcasts('2025-26', 38); })()`);
t.eq('setting is read back',                 evalIn(ctx, `getLocalHomeBroadcasts('2025-26')`), 38);
t.eq('setting is included in exports',       evalIn(ctx, `getSerializableDataStore().seasonSettings['2025-26'].localHomeBroadcasts`), 38);
t.eq('period uses it as the season length',  evalIn(ctx, `getReportPeriodInfo('2025-26').total`), 38);
evalIn(ctx, `setLocalHomeBroadcasts('2025-26', null)`);
t.eq('clearing it removes the season entry', evalIn(ctx, `JSON.stringify(DataStore.seasonSettings)`), '{}');
t.eq('reset clears season settings',         evalIn(ctx, `(() => { setLocalHomeBroadcasts('2025-26', 38); DataStore.reset(); return JSON.stringify(DataStore.seasonSettings); })()`), '{}');

t.group('rankings — off by default, top three only, category families');
evalIn(ctx, `(() => {
  DataStore.reset();
  DataStore.partnerRoster = [
    { Account: 'Coca-Cola', Category: 'Beverage - Soft Drink' }, { Account: 'Sprite', Category: 'Beverage - Soft Drink' },
    { Account: 'Gatorade', Category: 'Beverage - Isotonic Sports Drink' }, { Account: 'Polar', Category: 'Beverage - Other' },
    { Account: 'Nike', Category: 'Athletic Apparel & Footwear' }, { Account: 'Adidas', Category: 'Athletic Apparel & Footwear' },
  ];
  canonicalizeAllBrandData(true);
})()`);
const rk = JSON.parse(evalIn(ctx, `JSON.stringify(rptRank('Gatorade', { 'Coca-Cola': 9, Sprite: 8, Gatorade: 7, Polar: 1, Nike: 50, Adidas: 40, 'Not A Partner': 99 }))`));
t.eq('overall rank ignores non-partners',            rk.overall.rank + '/' + rk.overall.of, '5/6');
t.eq('category rank uses the family ("Beverage")',   rk.category.rank + '/' + rk.category.of + ' ' + rk.category.label, '3/4 Beverage partners');
t.eq('a family under three partners gets no rank',   evalIn(ctx, `rptRank('Nike', { Nike: 5, Adidas: 4 }).category`), null);
const sec = { rankable: { metric: 'm', ranks: { overall: { rank: 5, of: 6, label: 'x' }, category: { rank: 3, of: 4, label: 'y' } } } };
ctx.__sec = sec;
t.eq('rankings are off by default',                  evalIn(ctx, `rptShownRank(globalThis.__sec, {})`), null);
t.eq('a 5th place is never shown',                   evalIn(ctx, `rptShownRank(globalThis.__sec, { rank: 'overall' })`), null);
t.eq('a 3rd place in category is shown',             evalIn(ctx, `rptShownRank(globalThis.__sec, { rank: 'category' }).rank`), 3);

t.group('version constant');
t.check('DASHBOARD_VERSION is defined', typeof ctx.DASHBOARD_VERSION === 'string' && /^v\d+\.\d+$/.test(ctx.DASHBOARD_VERSION));

t.finish();
