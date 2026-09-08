// Unit tests for the pure functions: number/date formatting, season normalization,
// brand alias resolution, and file-type detection.
//
// These are the functions that silently produce wrong numbers rather than throwing,
// so they are the ones worth pinning down. Run with:  node unit_test.js
const { loadDashboard, expose, createRunner } = require('./test_harness');

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
t.eq('unknown name is preserved',       resolveCanonicalBrandName('Unknown Brand Co'), 'Unknown Brand Co');
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
t.eq('brand aliases by filename prefix',
  detectFileType('Aliases_2026.csv', []), 'brandAliases');
t.eq('brand aliases, BrandAliases prefix',
  detectFileType('BrandAliases.csv', []), 'brandAliases');
t.eq('brand aliases by column schema',
  detectFileType('mapping.csv', [{ 'Source Name': 'MODA ASSIST', 'Canonical Name': 'Moda Health' }]), 'brandAliases');
t.eq('brand aliases, "Rolls Up To" header',
  detectFileType('x.csv', [{ Alias: 'POA', 'Rolls Up To': 'Pacific Office Automation' }]), 'brandAliases');
t.eq('roster still wins over the alias schema',
  detectFileType('Partners_2025.csv', [{ Account: 'Nike', Category: 'Apparel' }]), 'roster');

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

t.group('version constant');
t.check('DASHBOARD_VERSION is defined', typeof ctx.DASHBOARD_VERSION === 'string' && /^v\d+\.\d+$/.test(ctx.DASHBOARD_VERSION));

t.finish();
