// ============================================================
// PARTNER REPORT
// ============================================================
// Three layers, each usable on its own:
//
//   1. Model     buildReportModel(brand, season) — every figure the report can
//                show, per section, for ONE season. Uses the same accessors as
//                the dashboard pages, so a number on the report always matches
//                the number on screen.
//   2. Document  renderReportDocument(model, opts) — a self-contained HTML
//                document styled with the Trail Blazers design system (League
//                Gothic / Trade Gothic, light only). It paginates itself onto US
//                Letter pages in the browser, so the preview is exactly what
//                prints: nothing is ever cut across a page.
//   3. Builder   openReportModal(brand) — one screen: choices on the left, the
//                live preview on the right, "Save as PDF" prints the preview.
//
// Fonts and logos come from REPORT_BRAND_ASSETS (src/24_report_brand_assets.js,
// generated from brand/).
// ============================================================

// ── Partner logos (also used by the partner pages and browse grid) ──
// Resolves a partner name to a baked-in logo. Exact key first, then a
// compact-token match (case, spaces and punctuation stripped) so filenames
// don't have to be byte-identical to the canonical brand name.
let _partnerLogoIndex = null;
function lookupPartnerLogo(brand) {
  if (typeof PARTNER_LOGOS === 'undefined' || !PARTNER_LOGOS || !brand) return null;
  if (PARTNER_LOGOS[brand]) return PARTNER_LOGOS[brand];
  if (!_partnerLogoIndex) {
    _partnerLogoIndex = new Map();
    Object.keys(PARTNER_LOGOS).forEach(name => {
      const key = compactBrandToken(name);
      if (key && !_partnerLogoIndex.has(key)) _partnerLogoIndex.set(key, PARTNER_LOGOS[name]);
    });
  }
  return _partnerLogoIndex.get(compactBrandToken(brand)) || null;
}

// Three tiers: DataStore override (future logo manager) → logos/ folder → initials badge.
function renderPartnerLogo(brand, size = 36) {
  const dsLogo = (DataStore.partnerLogos || {})[brand];
  const logo = dsLogo || lookupPartnerLogo(brand);
  if (logo) {
    return logo.type === 'svg'
      ? `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${logo.data}</div>`
      : `<img src="${logo.data}" width="${size}" height="${size}" style="object-fit:contain;flex-shrink:0;" alt="${escapeAttr(brand)}"/>`;
  }
  const initials = brand.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `<div style="width:${size}px;height:${size}px;background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.12);border-radius:4px;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    font-family:var(--fd,'Arial Narrow','Helvetica Neue',Arial,sans-serif);font-weight:700;
    font-size:${Math.max(9, Math.round(size * 0.32))}px;
    letter-spacing:0.04em;color:rgba(255,255,255,0.6);">${escapeHTML(initials)}</div>`;
}


// ============================================================
// 1. MODEL
// ============================================================

// Report order. VS sits beside TV because both are QI media value. In-arena LED
// comes last: it confirms the creative ran rather than measuring value.
const REPORT_SECTION_DEFS = [
  { key: 'tv',             label: 'TV visible signage' },
  { key: 'virtualSignage', label: 'On-court virtual signage' },
  { key: 'organic',        label: 'Organic social' },
  { key: 'survey',         label: 'Brand awareness survey' },
  { key: 'paid',           label: 'Paid social' },
  { key: 'affidavit',      label: 'TV & radio spots' },
  { key: 'webDisplay',     label: 'Web & digital' },
  { key: 'ancLED',         label: 'In-arena LED' },
];

function rptPriorSeason(season) {
  const m = String(season || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const start = Number(m[1]) - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

// The season the single-season exports (affidavits, ANC LED, RoseQuarter.com,
// virtual signage schedule) describe: they carry no season of their own, so
// they belong to the newest season the TV data covers.
function rptCurrentSeason() {
  const s = getPortfolioSeasons();
  return s[s.length - 1] || null;
}

function rptSeasonOfMonth(ym) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return fiscalSeasonFromDate(new Date(y, m - 1, 15));
}

// A survey percentage of 0 with no rank means the brand wasn't asked about in
// that wave, not that nobody recalled it.
function rptSurveyPct(pct, rank) {
  if (pct === null || pct === undefined) return null;
  if (pct === 0 && !rank) return null;
  return pct;
}

// Shared dashboard helpers print "—" for a missing value; the report says
// "n/a" instead (house style: no em dashes in partner-facing text).
function rptNA(v) { return v === '—' ? 'n/a' : v; }

function rptFmtPct0(p) { return p === null || p === undefined ? 'n/a' : `${Math.round(p * 100)}%`; }
function rptShortSeason(s) { return String(s || '').replace(/^20(\d{2})-(\d{2})$/, '$1-$2'); }
function rptMonthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

// Seasons in which the partner has anything reportable, newest first.
function getReportSeasonsForBrand(brand) {
  const s = new Set();
  getBrandTVData(brand).forEach(r => r.Season && s.add(r.Season));
  getBrandSurveyData(brand).forEach(r => r.Season && s.add(r.Season));
  getBrandPaidData(brand).forEach(r => r.Season && r.Season !== 'Unknown' && s.add(r.Season));
  getBrandZoomphPerf(brand).forEach(r => { const x = rptSeasonOfMonth(r._reportMonth); if (x) s.add(x); });
  getBlazersBannersForBrand(brand).forEach(r => { const x = normalizeSeasonLabel(r.Season || ''); if (x) s.add(x); });
  const cur = rptCurrentSeason();
  if (cur && (hasAffidavitDataForBrand(brand) || hasANCLEDDataForBrand(brand) || hasVirtualSignageDataForBrand(brand) || hasWebDisplayDataForBrand(brand))) s.add(cur);
  return [...s].filter(x => /^\d{4}-\d{2}$/.test(x)).sort().reverse();
}

// ── Per-section builders ─────────────────────────────────────
// Each returns null when the partner has nothing for that season, otherwise
// { count, kpis, chart?, table?, bars?, banner?, insights, source }.
// Figures are raw numbers; formatting happens in the document layer.

// ── Period: full season or season to date ──────────────────────
// "Season to date" is anchored on home broadcasts: through home game N means
// every source up to that game's date. Prior-season comparisons use the same
// point in the prior season (its first N home broadcasts) for TV, the same
// months for organic, and the same wave for the survey.

function rptISO(v) {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = v instanceof Date ? v : parseDateLoose(v);
  if (!d || isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Days since October 1 of the season's start year — lines seasons up by calendar.
function rptDayOfSeason(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const start = m >= 7 ? y : y - 1;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(start, 9, 1)) / 864e5);
}

function rptHomeDates(season) {
  return season ? splitMatchdatesByVenue(getTVRowsForPeriod(season)).home : [];
}

// The local home broadcasts set for a season (fewer than usual when some home
// games are national-only and carry no local TV measurement), or null.
function getLocalHomeBroadcasts(season) {
  const v = ((DataStore.seasonSettings || {})[season] || {}).localHomeBroadcasts;
  return Number.isFinite(v) && v > 0 ? v : null;
}

function setLocalHomeBroadcasts(season, value) {
  if (!DataStore.seasonSettings) DataStore.seasonSettings = {};
  const n = Math.round(Number(value));
  const cur = DataStore.seasonSettings[season] || {};
  if (Number.isFinite(n) && n > 0) cur.localHomeBroadcasts = n; else delete cur.localHomeBroadcasts;
  if (Object.keys(cur).length) DataStore.seasonSettings[season] = cur; else delete DataStore.seasonSettings[season];
}

// Home broadcasts measured so far, how many this season will have (the
// "Local home broadcasts" setting, else the median of earlier full seasons),
// and whether the season is over (every expected broadcast measured, or its
// latest game as late in the calendar as earlier seasons' last games).
function getReportPeriodInfo(season) {
  const dates = rptHomeDates(season);
  const prior = getPortfolioSeasons().filter(s => s < season).map(rptHomeDates).filter(d => d.length >= 30);
  const counts = prior.map(d => d.length).sort((a, b) => a - b);
  const usual = counts.length ? counts[Math.floor(counts.length / 2)] : 41;
  const local = getLocalHomeBroadcasts(season);
  const total = Math.max(local || usual, dates.length);
  const lastDays = prior.map(d => rptDayOfSeason(d[d.length - 1]));
  const complete = dates.length >= total ||
    (lastDays.length > 0 && dates.length > 0 && rptDayOfSeason(dates[dates.length - 1]) >= Math.min(...lastDays) - 3);
  return { dates, total, complete, usual, local, national: local && usual > local ? usual - local : 0 };
}

function rptContext(season, period) {
  const info = getReportPeriodInfo(season);
  const std = !!(period && period.mode === 'std' && info.dates.length);
  const n = std ? Math.min(Math.max(1, period.throughGame || info.dates.length), info.dates.length) : null;
  const through = std ? info.dates[n - 1] : null;
  return {
    season, std, info, throughGame: n, throughDate: through,
    inWindow: v => { if (!std) return true; const iso = rptISO(v); return !!iso && iso <= through; },
  };
}

// ── Season pace (TV QI media value) ────────────────────────────
// Projects the rest of the season conservatively: the remaining home games are
// valued at the LOWER of (a) the pace so far and (b) what earlier seasons
// delivered after the same point. So a season that historically fades in the
// back half pulls the projection down, but the projection never assumes the
// back half will be stronger than the pace so far.
//
// Backtested on 2021-22 → 2024-25 (104 partner-seasons): the typical miss is
// ~34% from game 10, ~19% from game 20, ~10% from game 30 — the same as a
// straight per-game pace, with the least over-projection early. Hence no
// projection before RPT_PACE_MIN_GAMES, and a range drawn from those misses.
//
// Product rules: off by default; offered only between home games
// RPT_PACE_MIN_GAMES and RPT_PACE_MAX_GAMES (mid-season, when a pace is both
// meaningful and still useful); and always shown as a range, never a single
// figure. No range → no projection.

const RPT_PACE_MIN_GAMES = 14;
const RPT_PACE_MAX_GAMES = 20;
const _rptPaceCache = new Map();

// Per-home-game QIMV for each brand in a season: { dates, byBrand: {brand: [v…]}, portfolio: [v…] }
function rptSeasonGameValues(season) {
  const key = 'games|' + season + '|' + (DataStore.tvSignage || []).length;
  if (_rptPaceCache.has(key)) return _rptPaceCache.get(key);
  const dates = rptHomeDates(season);
  const idx = new Map(dates.map((d, i) => [d, i]));
  const byBrand = {}, portfolio = dates.map(() => 0);
  getTVRowsForPeriod(season).forEach(r => {
    const i = idx.get(String(r.Matchdate));
    if (i === undefined) return;
    const v = Number(r['QI Media Value ($)']) || 0;
    (byBrand[r.Brand] = byBrand[r.Brand] || dates.map(() => 0))[i] += v;
    portfolio[i] += v;
  });
  const out = { dates, byBrand, portfolio };
  _rptPaceCache.set(key, out);
  return out;
}

function rptCumulative(vals) {
  let s = 0; const c = vals.map(v => (s += v));
  return c;
}

// Cumulative share of the season's value at a fraction of the way through.
function rptShareAt(cumShare, frac) {
  const G = cumShare.length, x = frac * G, i = Math.floor(x);
  const lo = i <= 0 ? 0 : cumShare[Math.min(i, G) - 1], hi = cumShare[Math.min(i, G - 1)];
  return lo + (hi - lo) * (x - i);
}

// Season shapes (portfolio cumulative share by game) for complete seasons.
function rptSeasonShapes(seasons) {
  return seasons.map(s => {
    const v = rptSeasonGameValues(s).portfolio;
    const t = v.reduce((a, b) => a + b, 0);
    return t > 0 ? rptCumulative(v).map(c => c / t) : null;
  }).filter(Boolean);
}

function rptProject(toDate, n, G, shapes) {
  const linear = toDate * G / n;
  if (!shapes.length) return linear;
  const F = shapes.reduce((a, c) => a + rptShareAt(c, n / G), 0) / shapes.length;
  return F > 0 ? Math.min(linear, toDate / F) : linear;
}

function rptCompleteSeasonsBefore(season) {
  return getPortfolioSeasons().filter(s => s < season && rptHomeDates(s).length >= 30);
}

// How far the method missed in earlier seasons at this point: the 20th and 80th
// percentile of actual ÷ projected, over every partner present all season.
function rptPaceRange(season, n, G) {
  const key = `range|${season}|${n}|${G}|${(DataStore.tvSignage || []).length}`;
  if (_rptPaceCache.has(key)) return _rptPaceCache.get(key);
  const pool = rptCompleteSeasonsBefore(season);
  const ratios = [];
  pool.forEach(target => {
    const others = rptSeasonShapes(pool.filter(s => s !== target));
    const { dates, byBrand } = rptSeasonGameValues(target);
    const Gt = dates.length, nt = Math.max(1, Math.round(n / G * Gt));
    Object.values(byBrand).forEach(v => {
      if (v.filter(x => x > 0).length < Gt * 0.8) return;
      const actual = v.reduce((a, b) => a + b, 0);
      const toDate = v.slice(0, nt).reduce((a, b) => a + b, 0);
      if (actual > 0 && toDate > 0) ratios.push(actual / rptProject(toDate, nt, Gt, others));
    });
  });
  ratios.sort((a, b) => a - b);
  const q = p => ratios[Math.min(ratios.length - 1, Math.max(0, Math.round(p * (ratios.length - 1))))];
  const out = ratios.length >= 10 ? { lo: q(0.2), hi: q(0.8), cases: ratios.length } : null;
  _rptPaceCache.set(key, out);
  return out;
}

// { value, lo, hi, n, G } for one brand's TV QIMV, or null with a reason.
function rptSeasonPace(brand, ctx) {
  const { info, throughGame: n } = ctx;
  if (!ctx.std) return null;
  if (info.complete && n >= info.dates.length) return { unavailable: 'The season is over, so there is nothing left to project.' };
  if (n < RPT_PACE_MIN_GAMES || n > RPT_PACE_MAX_GAMES) return { unavailable: `Only when the report runs through home game ${RPT_PACE_MIN_GAMES}–${RPT_PACE_MAX_GAMES}.` };
  const G = info.total;
  const v = (rptSeasonGameValues(ctx.season).byBrand[brand] || []).slice(0, n);
  const toDate = v.reduce((a, b) => a + b, 0);
  if (!(toDate > 0)) return null;
  const value = rptProject(toDate, n, G, rptSeasonShapes(rptCompleteSeasonsBefore(ctx.season)));
  const range = rptPaceRange(ctx.season, n, G);
  if (!range) return { unavailable: 'Not enough earlier seasons to give a range.' };
  return { value, lo: value * range.lo, hi: value * range.hi, n, G, toDate };
}

// ── Rankings (off by default; shown only for a top-3 finish) ───
// Overall = among current partners (every brand if no roster is loaded).
// Category = among current partners in the same category family — the part of
// the roster category before " - " ("Beverage - Soft Drink" → "Beverage") —
// and only when the family has at least three partners with data.
const RPT_RANK_SHOW_MAX = 3;

function rptCategoryFamily(brand) {
  const r = (DataStore.partnerRoster || []).find(x => resolveCanonicalBrandName(x.Account || '') === brand);
  return r && r.Category ? String(r.Category).split(' - ')[0].trim() : null;
}

function rptRank(brand, valuesByBrand) {
  const hasRoster = (DataStore.partnerRoster || []).length > 0;
  const pool = Object.entries(valuesByBrand).filter(([b, v]) => v > 0 && (!hasRoster || isCurrentPartner(b)));
  const rankIn = list => {
    const sorted = list.slice().sort((a, b) => b[1] - a[1]);
    const i = sorted.findIndex(x => x[0] === brand);
    return i < 0 ? null : { rank: i + 1, of: sorted.length };
  };
  const overall = rankIn(pool);
  const fam = rptCategoryFamily(brand);
  const famPool = fam ? pool.filter(([b]) => rptCategoryFamily(b) === fam) : [];
  const category = famPool.length >= 3 ? rankIn(famPool) : null;
  return {
    overall: overall && { ...overall, label: hasRoster ? 'current partners' : 'brands' },
    category: category && { ...category, label: `${fam} partners` },
  };
}

// Section builders take (brand, season, ctx) — ctx from rptContext().

function rptBuildTV(brand, season, ctx) {
  const rows = getBrandTVData(brand, season).filter(r => ctx.inWindow(r.Matchdate));
  if (!rows.length) return null;
  const qimv = sum(rows, 'QI Media Value ($)');
  const imp  = sum(rows, 'Sponsorship QI Impressions');
  const mins = sum(rows, 'Duration (Minutes)');
  const games = getUniqueMatchdates(rows).length;
  const portfolioRows = getTVRowsForPeriod(season).filter(r => ctx.inWindow(r.Matchdate));
  const portfolioGames = getUniqueMatchdates(portfolioRows).length;

  // Comparison with the same broadcasts last season.
  let dq = null, di = null, basis = null, priorSeason = null, priorRows = null;
  if (ctx.std) {
    priorSeason = getPreviousPortfolioSeason(season);
    if (priorSeason && comparisonMode === 'auto-match') {
      const win = getMatchedPriorWindow(portfolioRows, getTVRowsForPeriod(priorSeason));
      const prev = getBrandTVData(brand, priorSeason).filter(r => win.dates.has(String(r.Matchdate)));
      priorRows = prev;
      dq = pctChange(qimv, sum(prev, 'QI Media Value ($)'));
      di = pctChange(imp, sum(prev, 'Sponsorship QI Impressions'));
      basis = describePriorWindow(win, priorSeason);
    }
  } else {
    const yq = computeYoYForMetric(brand, season, 'QI Media Value ($)');
    const yi = computeYoYForMetric(brand, season, 'Sponsorship QI Impressions');
    const sets = getYoYRowSets(brand, season);
    dq = yq && yq.change; di = yi && yi.change;
    basis = yq ? yq.basis.replace(/^.*?\bvs\s+/, '') : null;
    priorSeason = sets ? sets.priorSeason : null;
    priorRows = yq && sets ? sets.priorRows : null;
  }
  const vsPrior = priorSeason ? `vs ${priorSeason}` : '';

  const byBrand = {};
  portfolioRows.forEach(r => { byBrand[r.Brand] = (byBrand[r.Brand] || 0) + (Number(r['QI Media Value ($)']) || 0); });
  const ranks = rptRank(brand, byBrand);

  const byLocation = (list, key) => {
    const m = {};
    list.forEach(r => { const loc = r.Location || 'No location'; m[loc] = (m[loc] || 0) + (Number(r[key]) || 0); });
    return m;
  };
  const locMap = byLocation(rows, 'QI Media Value ($)');
  // Each location's change over the same broadcasts as the headline change.
  // A location with no value in that window reads "New", not +∞%; one with
  // under a minute on screen on either side gets no percentage (the
  // dashboard's small-sample rule), since a few seconds last season would
  // turn into a meaningless +20,000%.
  const priorLoc = priorRows ? byLocation(priorRows, 'QI Media Value ($)') : null;
  const priorMin = priorRows ? byLocation(priorRows, 'Duration (Minutes)') : null;
  const locMin = byLocation(rows, 'Duration (Minutes)');
  const locDelta = names => {
    if (!priorLoc) return undefined;
    const total = (m, ns) => ns.reduce((s, n) => s + (m[n] || 0), 0);
    const prev = total(priorLoc, names);
    if (!(prev > 0)) return 'new';
    if (total(priorMin, names) < TV_ASSET_SMALL_SAMPLE_MIN_MINUTES || total(locMin, names) < TV_ASSET_SMALL_SAMPLE_MIN_MINUTES) return null;
    return pctChange(total(locMap, names), prev);
  };
  let locs = Object.entries(locMap).map(([label, value]) => ({ label, value, delta: locDelta([label]) })).sort((a, b) => b.value - a.value);
  if (locs.length > 8) {
    const others = locs.slice(7);
    locs = locs.slice(0, 7).concat([{ label: `Other (${others.length})`, value: others.reduce((s, l) => s + l.value, 0), delta: locDelta(others.map(l => l.label)) }]);
  }
  if (locs.length) locs[0].highlight = true;
  const top = locs[0];

  const pace = rptSeasonPace(brand, ctx);
  let chart = null;
  if (ctx.std) {
    // Pacing: cumulative QI media value by home game, this season vs last.
    const cur = rptSeasonGameValues(season).byBrand[brand] || [];
    const prevVals = priorSeason ? (rptSeasonGameValues(priorSeason).byBrand[brand] || []) : [];
    chart = {
      kind: 'pace', title: 'QI media value by home game, cumulative',
      G: ctx.info.total, curr: rptCumulative(cur.slice(0, ctx.throughGame)),
      prior: prevVals.length ? rptCumulative(prevVals) : null, priorLabel: priorSeason,
      pace: pace && !pace.unavailable ? pace : null, format: formatCurrency,
    };
  } else {
    const allSeasons = [...new Set(getBrandTVData(brand).map(r => r.Season).filter(Boolean))].sort()
      .filter(s => s <= season).slice(-5);
    const history = allSeasons.map(s => {
      const sr = getBrandTVData(brand, s);
      return { label: s, value: sum(sr, 'QI Media Value ($)'), highlight: s === season,
               flag: splitMatchdatesByVenue(sr).away.length > 0 };
    });
    if (history.length > 1) chart = { kind: 'column', title: 'QI media value by season', data: history, format: formatCurrency,
      footnote: history.some(h => h.flag) ? '* Season also measured away broadcasts, so its total isn\'t directly comparable.' : '' };
  }

  const insights = [];
  insights.push({ html: ctx.std
      ? `<b>${formatCurrency(qimv)}</b> in QI media value through home game ${ctx.throughGame} of ${ctx.info.total}${ctx.info.local ? ' local broadcasts' : ''}.`
      : `<b>${formatCurrency(qimv)}</b> in QI media value across <b>${games}</b> of ${portfolioGames} measured local broadcasts.`,
    delta: dq !== null && dq !== undefined && basis && { change: dq, basis } });
  // The pace line is controlled by the "Season pace" option, not the takeaway
  // ticks, so it lives outside the tickable list (which keeps the same order in
  // both periods).
  const paceInsight = pace && !pace.unavailable
    ? { html: `On pace for <b>${formatCurrency(pace.lo)}</b> to <b>${formatCurrency(pace.hi)}</b> over ${pace.G} ${ctx.info.local ? 'local home broadcasts' : 'home games'}.`, estimated: true }
    : null;
  if (top && qimv > 0) insights.push({ html: `<b>${escapeHTML(top.label)}</b> delivered <b>${formatCurrency(top.value)}</b>, ${Math.round(top.value / qimv * 100)}% of the total.` });
  if (imp > 0) insights.push({ html: `<b>${formatNum(imp)}</b> quality-adjusted impressions over <b>${formatDurationFromMinutes(mins)}</b> on screen.`, delta: di !== null && di !== undefined && basis && { change: di, basis } });
  if (mins > 0) insights.push({ html: `<b>${formatCurrency(qimv / mins)}</b> of QI media value per on-screen minute.` });

  const perMinute = { label: 'Per minute', value: mins > 0 ? formatCurrency(qimv / mins) : 'n/a', meta: 'QI media value per on-screen minute' };
  const fourth = pace && !pace.unavailable
    ? { label: 'Season pace', value: `${formatCurrency(pace.lo)}–${formatCurrency(pace.hi)}`, meta: `likely range over ${pace.G} ${ctx.info.local ? 'local broadcasts' : 'home games'}`, estimated: true, small: true }
    : perMinute;

  return {
    count: ctx.std ? `${games} of ${ctx.info.total} ${ctx.info.local ? 'local home broadcasts' : 'home games'}` : `${games} local broadcast${games === 1 ? '' : 's'}`,
    kpis: [
      { label: ctx.std ? 'QI media value to date' : 'QI media value', value: formatCurrency(qimv), delta: dq, cmp: ctx.std ? 'vs same point last season' : vsPrior },
      { label: 'QI impressions', value: formatNum(imp), delta: di, cmp: ctx.std ? 'vs same point last season' : vsPrior },
      { label: ctx.std ? (ctx.info.local ? 'Local home broadcasts' : 'Home games') : 'Local broadcasts', value: ctx.std ? `${games} of ${ctx.info.total}` : `${games} of ${portfolioGames}`, meta: ctx.std ? `through ${formatShortDate(parseDateLoose(ctx.throughDate))}` : 'with this partner visible' },
      fourth,
    ],
    rankable: { metric: 'TV QI media value', ranks, kpiIndex: pace && !pace.unavailable ? null : 3 },
    pace, perMinute, paceInsight,
    chart,
    bars: { title: `Top signage locations · ${season}${ctx.std ? ' to date' : ''}`, items: locs, format: formatCurrency,
            first: true, deltaBasis: priorLoc && basis ? `Change vs ${basis}` : '' },
    insights,
    source: `TV visible signage (QI media value).${basis ? ` Changes compare this season with the ${basis}.` : ''}`,
    totals: { qimv, imp, games, portfolioGames, delta: dq, cmp: ctx.std ? 'vs same point last season' : vsPrior },
  };
}

function rptBuildVS(brand, season, ctx) {
  if (season !== rptCurrentSeason() || !hasVirtualSignageDataForBrand(brand)) return null;
  const upTo = ctx.std ? g => { const d = normalizeVSDate(g.DateRaw); return !!d && d <= ctx.throughDate; } : null;
  const group = groupVSPartnerStats(getVirtualSignagePartnerStats(upTo))
    .find(g => g.brand === brand || g.members.some(m => m.brand === brand));
  if (!group || !group.totalGames) return null;
  const est = group.estimatedGames > 0;
  // Positions are valued at their season average, so the report gives the
  // combined figure only: no measured/estimated split, no per-position detail.
  // "Est." still marks any figure that includes an estimate.
  const insights = [
    { html: `<b>${formatCurrency(group.qimv)}</b> in QI media value across <b>${group.totalGames}</b> scheduled game${group.totalGames === 1 ? '' : 's'} (${group.homeGames} home, ${group.awayGames} away).`, estimated: est },
  ];
  if (group.qiImp > 0) insights.push({ html: `<b>${formatNum(group.qiImp)}</b> QI impressions, <b>${formatCurrency(group.qimv / group.totalGames)}</b> of QI media value per game.`, estimated: est });
  return {
    count: `${group.totalGames} game${group.totalGames === 1 ? '' : 's'}`,
    kpis: [
      { label: 'QI media value', value: formatCurrency(group.qimv), estimated: est },
      { label: 'QI impressions', value: formatNum(group.qiImp), estimated: est },
      { label: 'Games', value: String(group.totalGames), meta: `${group.homeGames} home, ${group.awayGames} away` },
      { label: 'Per game', value: formatCurrency(group.qimv / group.totalGames), meta: 'QI media value per game', estimated: est },
    ],
    insights,
    source: 'Virtual signage schedule. Home games use Nielsen TV measurement. Away games and unmeasured home games are estimated, as described in the methodology.',
    totals: { qimv: group.qimv, estimated: est },
  };
}

// A monthly report counts toward season-to-date once its month has ended.
function rptMonthInWindow(ym, ctx) {
  if (!ctx.std) return true;
  const [y, m] = ym.split('-').map(Number);
  return rptISO(new Date(y, m, 0)) <= ctx.throughDate;
}

function rptBuildOrganic(brand, season, ctx) {
  const all = getBrandZoomphPerf(brand);
  const inSeason = r => rptSeasonOfMonth(r._reportMonth) === season && rptMonthInWindow(r._reportMonth, ctx);
  const rows = all.filter(inSeason);
  if (!rows.length) return null;
  const tot = k => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const views = tot('ViewsImpressions'), eng = tot('Engagements'), value = tot('BrandValue'),
        posts = tot('OrganicPosts'), logo = tot('LogoImpressions');
  const months = rows.map(r => r._reportMonth).sort();

  // Like-for-like change: only when the prior season has every one of these months.
  const priorByMonth = new Map(all.map(r => [r._reportMonth, r]));
  const priorRows = months.map(m => priorByMonth.get(`${Number(m.slice(0, 4)) - 1}${m.slice(4)}`)).filter(Boolean);
  const comparable = priorRows.length === months.length;
  const pv = k => priorRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const d = k => comparable ? pctChange(tot(k), pv(k)) : null;

  const monthly = [...rows].sort((a, b) => a._reportMonth.localeCompare(b._reportMonth))
    .map(r => ({ label: rptMonthLabel(r._reportMonth), value: Number(r.BrandValue) || 0 }));
  const peakIdx = monthly.reduce((bi, m, i, arr) => m.value > arr[bi].value ? i : bi, 0);
  if (monthly.length) monthly[peakIdx].highlight = true;

  const topOf = arr => {
    const m = {};
    arr.filter(inSeason).forEach(r => { m[r.Name] = (m[r.Name] || 0) + (Number(r.BrandValue) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0];
  };
  const topSeries = topOf(getBrandZoomphSeries(brand));
  const topAsset  = topOf(getBrandZoomphAssets(brand));
  const range = months.length > 1 ? `${rptMonthLabel(months[0])} to ${rptMonthLabel(months[months.length - 1])}` : rptMonthLabel(months[0]);

  const insights = [
    { html: `<b>${formatCurrency(value)}</b> in brand value from <b>${formatNum(posts)}</b> posts across ${months.length} monthly report${months.length === 1 ? '' : 's'} (${range}).`, delta: d('BrandValue') !== null && { change: d('BrandValue'), basis: 'same months last season' } },
    { html: `<b>${formatNum(views)}</b> views and impressions and <b>${formatNum(eng)}</b> engagements (${formatPct(views ? eng / views : 0, 2)} engagement rate).` },
  ];
  if (monthly.length > 1 && monthly[peakIdx].value > 0) insights.push({ html: `<b>${monthly[peakIdx].label}</b> was the peak month at ${formatCurrency(monthly[peakIdx].value)}.` });
  if (topSeries && topSeries[1] > 0) insights.push({ html: `<b>${escapeHTML(topSeries[0])}</b> was the top content series at ${formatCurrency(topSeries[1])}.` });
  if (topAsset && topAsset[1] > 0) insights.push({ html: `<b>${escapeHTML(topAsset[0])}</b> was the top branded asset at ${formatCurrency(topAsset[1])}.` });

  const valueByBrand = {};
  (DataStore.zoomphBrandPerf || []).filter(inSeason).forEach(r => { valueByBrand[r.Brand] = (valueByBrand[r.Brand] || 0) + (Number(r.BrandValue) || 0); });

  return {
    count: `${months.length} report${months.length === 1 ? '' : 's'}`,
    rankable: { metric: 'organic brand value', ranks: rptRank(brand, valueByBrand), kpiIndex: null },
    kpis: [
      { label: 'Brand value', value: formatCurrency(value), delta: d('BrandValue'), cmp: 'vs same months last season' },
      { label: 'Views / impressions', value: formatNum(views), delta: d('ViewsImpressions'), cmp: 'vs same months last season' },
      { label: 'Engagements', value: formatNum(eng), meta: `${formatPct(views ? eng / views : 0, 2)} engagement rate` },
      { label: 'Organic posts', value: formatNum(posts), meta: `${formatNum(logo)} logo impressions` },
    ],
    banner: value === 0 && logo === 0
      ? { tone: 'info', title: 'Not measured.', text: 'Zoomph reports no logo impressions or brand value for this partner. This usually means Zoomph is not tracking the logo yet.' }
      : null,
    chart: monthly.length > 1 ? { kind: 'column', title: 'Brand value by month', data: monthly, format: formatCurrency } : null,
    insights,
    source: `Zoomph monthly reports on Trail Blazers organic social posts, ${range}. Paid and earned media are not included.`,
    totals: { views, value },
  };
}

function rptBuildSurvey(brand, season, ctx) {
  const phaseOrder = p => (p === 'Late' ? 1 : 0);
  const waves = getBrandSurveyData(brand)
    .map(w => ({ ...w,
      u: rptSurveyPct(w.UnaidedPct, w.UnaidedRecallRank),
      a: rptSurveyPct(w.AidedPct, w.AidedRecallRank),
      h: rptSurveyPct(w.LocalHQPct, w.LocalHQRecallRank) }))
    .filter(w => w.Season && w.Season <= season && (w.Season < season || ctx.inWindow(w.Date)))
    .sort((x, y) => x.Season.localeCompare(y.Season) || phaseOrder(x.Phase) - phaseOrder(y.Phase));
  const inSeason = waves.filter(w => w.Season === season && (w.u !== null || w.a !== null));
  if (!inSeason.length) return null;
  const latest = inSeason[inSeason.length - 1];
  const prior = waves.filter(w => w.Season === rptPriorSeason(season) && w.Phase === latest.Phase)[0] || null;
  const pp = k => (prior && prior[k] !== null && latest[k] !== null) ? latest[k] - prior[k] : null;
  const wave = `${latest.Season} ${latest.Phase}`;
  const vsPrior = prior ? `vs ${prior.Season} ${prior.Phase}` : '';

  // Recall rank within the wave, straight from the survey file (1 = highest).
  // Shown by default through the "Survey recall ranks" option: a small drop in
  // recall reads differently when the partner still ranks near the top.
  const waveRows = (DataStore.surveys || []).filter(r => r.Survey === latest.Survey);
  const rankTile = (label, rankKey) => {
    const r = Number(latest[rankKey]);
    if (!(r > 0)) return { label, value: 'n/a', meta: 'not ranked this wave' };
    const of = waveRows.filter(x => Number(x[rankKey]) > 0).length;
    const pr = prior ? Number(prior[rankKey]) : 0;
    return { label, value: `#${r}`, suffix: `of ${of}`, meta: `among brands in the ${wave} wave`,
             delta: pr > 0 ? pr - r : null, places: true, cmp: vsPrior };
  };
  const ranks = [rankTile('Unaided rank', 'UnaidedRecallRank'), rankTile('Aided rank', 'AidedRecallRank')];

  const chartWaves = waves.slice(-8);
  const insights = [];
  const both = latest.u !== null && latest.a !== null;
  insights.push({
    html: both ? `<b>${rptFmtPct0(latest.u)}</b> unaided and <b>${rptFmtPct0(latest.a)}</b> aided recall in the ${wave} survey.`
      : latest.u !== null ? `<b>${rptFmtPct0(latest.u)}</b> unaided recall in the ${wave} survey.`
      : `<b>${rptFmtPct0(latest.a)}</b> aided recall in the ${wave} survey.`,
    delta: pp(latest.u !== null ? 'u' : 'a') !== null && { change: pp(latest.u !== null ? 'u' : 'a'), basis: `${prior.Season} ${prior.Phase}`, points: true },
  });
  // One movement line: across this season's waves when there are two,
  // otherwise since the first wave on record.
  const earlyNow = inSeason.find(w => w.Phase !== 'Late' && w.u !== null);
  const firstU = waves.find(w => w.u !== null);
  if (earlyNow && earlyNow !== latest && latest.u !== null) {
    insights.push({ html: `Unaided recall moved from ${rptFmtPct0(earlyNow.u)} in the ${earlyNow.Phase} wave to <b>${rptFmtPct0(latest.u)}</b> in the ${latest.Phase} wave.` });
  } else if (firstU && firstU !== latest && latest.u !== null) {
    insights.push({ html: `Unaided recall has moved from ${rptFmtPct0(firstU.u)} (${firstU.Season} ${firstU.Phase}) to <b>${rptFmtPct0(latest.u)}</b>.` });
  }

  return {
    count: `${inSeason.length} wave${inSeason.length === 1 ? '' : 's'}`,
    kpis: [
      { label: 'Unaided recall', value: rptFmtPct0(latest.u), delta: pp('u'), points: true, cmp: vsPrior },
      { label: 'Aided recall', value: rptFmtPct0(latest.a), delta: pp('a'), points: true, cmp: vsPrior },
      ...ranks,
    ],
    // Tiles 3–4 when the recall ranks are switched off.
    kpisNoRank: [
      { label: 'Local HQ', value: rptFmtPct0(latest.h), meta: latest.h !== null ? 'see the partner as local' : 'not asked' },
      { label: 'Latest wave', value: wave, small: true, meta: `${inSeason.length} wave${inSeason.length === 1 ? '' : 's'} this season` },
    ],
    chart: chartWaves.length > 1 ? {
      kind: 'line', title: 'Recall by survey wave',
      labels: chartWaves.map(w => [rptShortSeason(w.Season), w.Phase]),
      // Unaided is the headline measure, so it takes series-1 (red).
      series: [
        { name: 'Unaided', data: chartWaves.map(w => w.u) },
        { name: 'Aided', data: chartWaves.map(w => w.a) },
      ],
      format: rptFmtPct0,
    } : null,
    table: {
      title: 'Survey waves',
      columns: [{ label: 'Wave' }, { label: 'Unaided', num: true }, { label: 'Aided', num: true }, { label: 'Local HQ', num: true }],
      rows: chartWaves.slice().reverse().map(w => [`${w.Season} ${w.Phase}`, rptFmtPct0(w.u), rptFmtPct0(w.a), rptFmtPct0(w.h)]),
    },
    insights,
    source: `Trail Blazers Partnership Survey (Qualtrics), ${wave} wave. "n/a" means the brand was not on the list that wave. Changes are percentage points vs the same wave last season.`,
    totals: { unaided: latest.u, rank: latest.UnaidedRecallRank, wave },
  };
}

function rptBuildPaid(brand, season, ctx) {
  const rows = getBrandPaidData(brand, season).filter(r => ctx.inWindow(r.DailyDate || r.ReportingStart));
  if (!rows.length) return null;
  const agg = paidAggregate(rows);
  // With spend no longer printed, a section with no delivery has nothing to say.
  if (!(agg.impressions > 0)) return null;
  // Spend stays internal: the report never prints it, and campaigns are ranked
  // by what the partner saw delivered.
  const camps = aggregatePaidByCampaign(rows).sort((a, b) => b.impressions - a.impressions);
  const nameOf = c => c.rows[0] && c.rows[0].ActivationName ? c.rows[0].ActivationName : c.name;
  const shown = camps.slice(0, 8);
  const tableRows = shown.map(c => [nameOf(c), c.objective, formatNum(c.impressions), formatNum(c.clicks), formatPct(c.ctr, 2)]);
  if (camps.length > shown.length) tableRows.push([`+ ${camps.length - shown.length} more campaigns`, '', '', '', '']);
  // Takeaways say what the tiles can't: which campaigns carried the results.
  const insights = [];
  const top = camps[0];
  if (top && top.impressions > 0) {
    insights.push({ html: camps.length > 1
      ? `<b>${escapeHTML(nameOf(top))}</b> delivered the most impressions: <b>${formatNum(top.impressions)}</b>, ${Math.round(top.impressions / agg.impressions * 100)}% of the total.`
      : `<b>${escapeHTML(nameOf(top))}</b> delivered <b>${formatNum(top.impressions)}</b> impressions.` });
  }
  const bestCtr = camps.filter(c => c.impressions >= 1000 && c.clicks > 0).sort((a, b) => b.ctr - a.ctr)[0];
  if (camps.length > 1 && bestCtr && bestCtr.ctr > agg.ctr) {
    insights.push({ html: `<b>${escapeHTML(nameOf(bestCtr))}</b> had the highest click-through at <b>${formatPct(bestCtr.ctr, 2)}</b>.` });
  }
  return {
    count: `${agg.campaignCount} campaign${agg.campaignCount === 1 ? '' : 's'}`,
    kpis: [
      { label: 'Impressions', value: formatNum(agg.impressions) },
      { label: 'Link clicks', value: formatNum(agg.clicks) },
      { label: 'Click-through', value: formatPct(agg.ctr, 2) },
      { label: 'Campaigns', value: String(agg.campaignCount) },
    ],
    table: {
      title: 'Campaigns by impressions',
      columns: [{ label: 'Campaign' }, { label: 'Objective' }, { label: 'Impr.', num: true }, { label: 'Clicks', num: true }, { label: 'CTR', num: true }],
      rows: tableRows,
    },
    insights,
    source: 'Meta Ads Manager export, with the season taken from the campaign name. Campaigns not yet assigned to a partner are not included. Reach is not shown because it counts the same people more than once across campaigns.',
    totals: { impressions: agg.impressions },
  };
}

function rptBuildANC(brand, season, ctx) {
  const rows = getANCLEDRowsForBrand(brand)
    .filter(r => (fiscalSeasonFromDate(r.StartDate) || rptCurrentSeason()) === season);
  if (!rows.length) return null;
  const totalTime = rows.reduce((a, r) => a + (r.TimeTotal || 0), 0);
  const perEvent  = rows.reduce((a, r) => a + (r.EventAvg || 0), 0);
  const byAsset = {};
  rows.forEach(r => { byAsset[r.Asset] = (byAsset[r.Asset] || 0) + (r.TimeTotal || 0); });
  const items = Object.entries(byAsset).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  if (items.length) items[0].highlight = true;
  const variants = new Set(rows.map(r => r.Variant)).size;
  const start = rows.map(r => r.StartDate).filter(Boolean).sort()[0];
  const end = rows.map(r => r.EndDate).filter(Boolean).sort().pop();
  return {
    count: `${items.length} asset${items.length === 1 ? '' : 's'}`,
    kpis: [
      { label: 'Total exposure', value: formatDuration(totalTime), meta: 'on-screen time' },
      { label: 'Per event', value: formatDuration(perEvent), meta: 'average' },
      { label: 'Board locations', value: String(Object.keys(byAsset).length), meta: 'LED boards it ran on' },
      { label: 'Ad versions', value: String(variants), meta: 'different creatives shown' },
    ],
    bars: { title: 'Exposure time by board location', items, format: formatDuration },
    insights: [
      { html: `<b>${formatDuration(totalTime)}</b> of in-arena LED exposure, <b>${formatDuration(perEvent)}</b> per event on average.` },
      ...(items[0] ? [{ html: `<b>${escapeHTML(items[0].label)}</b> carried the most time (${formatDuration(items[0].value)}).` }] : []),
      { html: `Ran on <b>${Object.keys(byAsset).length}</b> board location${Object.keys(byAsset).length === 1 ? '' : 's'} with <b>${variants}</b> ad version${variants === 1 ? '' : 's'}.` },
    ],
    source: `ANC LED sponsor reports, Moda Center${start ? `, ${start} to ${end}` : ''}.`,
    totals: { totalTime },
  };
}

function rptBuildAffidavit(brand, season, ctx) {
  if (season !== rptCurrentSeason()) return null;
  const a = getAffidavitSummary(brand);
  if (!a || !a.totalSpots) return null;
  const labels = { Pregame: 'Pregame', PlayByPlay: 'Play-by-play', Postgame: 'Postgame' };
  const rows = AFFIDAVIT_DAYPARTS.map(dp => {
    const b = a.breakdown[dp];
    return [labels[dp] || dp, formatNum(b.tvContracted), formatNum(b.tvBonused), formatNum(b.radioContracted), formatNum(b.radioBonused),
      formatNum(b.tvContracted + b.tvBonused + b.radioContracted + b.radioBonused)];
  });
  rows.push(['Total', formatNum(a.tvContracted), formatNum(a.tvBonused), formatNum(a.radioContracted), formatNum(a.radioBonused), formatNum(a.totalSpots)]);
  const pre = (a.seasonBreakdown.Preseason || {}).total || 0;
  return {
    count: `${formatNum(a.totalSpots)} spots`,
    kpis: [
      { label: 'Total spots', value: formatNum(a.totalSpots) },
      { label: 'TV spots', value: formatNum(a.tvTotal), meta: `${formatNum(a.tvContracted)} contracted` },
      { label: 'Radio spots', value: formatNum(a.radioTotal), meta: `${formatNum(a.radioContracted)} contracted` },
      { label: 'Bonus rate', value: a.bonusRate === null ? 'n/a' : formatPct(a.bonusRate, 0), meta: 'bonus vs contracted spots' },
    ],
    table: {
      title: 'Spots by daypart',
      columns: [{ label: 'Daypart' }, { label: 'TV contracted', num: true }, { label: 'TV bonus', num: true }, { label: 'Radio contracted', num: true }, { label: 'Radio bonus', num: true }, { label: 'Total', num: true }],
      rows, totalRow: true,
    },
    insights: [
      { html: `<b>${formatNum(a.totalSpots)}</b> broadcast spots: <b>${formatNum(a.tvTotal)}</b> on TV and <b>${formatNum(a.radioTotal)}</b> on radio.` },
      ...(a.totalBonused ? [{ html: `<b>${formatNum(a.totalBonused)}</b> bonus spots on top of ${formatNum(a.totalContracted)} contracted (${formatPct(a.bonusRate || 0, 0)}).` }] : []),
    ],
    source: `TV and radio affidavits, which report season totals without air dates.${pre ? ` Includes ${formatNum(pre)} preseason spots.` : ''}`,
    totals: { spots: a.totalSpots },
  };
}

function rptBuildWeb(brand, season, ctx) {
  const cur = rptCurrentSeason();
  const banners = getBlazersBannersForBrand(brand).filter(r => normalizeSeasonLabel(r.Season || '') === season && !isWebDNU(r.LineItem || ''));
  const rq = season === cur ? getRQBannersForBrand(brand) : [];
  const pre = getPreRollForBrand(brand).filter(r => fiscalSeasonFromDate(r.EventDate) === season);
  const b = aggregateWebBannerRows(banners), q = aggregateWebBannerRows(rq);
  const plays = pre.reduce((s, r) => s + (Number(r.Plays) || 0), 0);
  const bi = b.impressions || 0, qi = q.impressions || 0;
  if (!bi && !qi && !plays) return null;
  const clicks = (b.clicks || 0) + (q.clicks || 0);
  const items = [
    { label: 'TrailBlazers.com', value: bi },
    { label: 'RoseQuarter.com', value: qi },
  ].filter(x => x.value > 0);
  if (items.length) items[0].highlight = true;
  const sites = items.map(x => x.label).join(' and ');
  return {
    count: `${formatNum(bi + qi)} impressions`,
    kpis: [
      { label: 'Banner ad impressions', value: formatNum(bi + qi) },
      { label: 'Clicks', value: formatNum(clicks) },
      { label: 'Click-through', value: bi + qi ? formatPct(clicks / (bi + qi), 2) : 'n/a' },
      // Pre-roll only when the partner ran it.
      plays ? { label: 'Pre-roll plays', value: formatNum(plays) }
            : { label: 'TrailBlazers.com', value: formatNum(bi), meta: 'banner ad impressions' },
    ],
    bars: items.length > 1 ? { title: 'Banner ad impressions by site', items, format: formatNum } : null,
    insights: [
      ...(bi + qi ? [{ html: `<b>${formatNum(bi + qi)}</b> banner ad impressions and <b>${formatNum(clicks)}</b> clicks${sites ? ` on ${sites}` : ''}.` }] : []),
      ...(plays ? [{ html: `<b>${formatNum(plays)}</b> pre-roll video plays.` }] : []),
    ],
    source: [sites && `${sites} ad server delivery.`, plays && 'Pre-roll plays from the video platform.'].filter(Boolean).join(' '),
    totals: { impressions: bi + qi, plays, sites },
  };
}

const REPORT_SECTION_BUILDERS = {
  tv: rptBuildTV, virtualSignage: rptBuildVS, organic: rptBuildOrganic, survey: rptBuildSurvey,
  paid: rptBuildPaid, ancLED: rptBuildANC, affidavit: rptBuildAffidavit, webDisplay: rptBuildWeb,
};

// These sources carry season totals, not dates, so they can't be cut to a date.
const RPT_SEASON_TOTALS_ONLY = new Set(['ancLED', 'affidavit', 'webDisplay']);

// Every figure the report can show for one partner and season. Sections with
// nothing to show come back as { available: false, reason } so the builder can
// grey them out instead of printing zeros.
// period: { mode: 'full' } (default) or { mode: 'std', throughGame: N }.
function buildReportModel(brand, season, period) {
  const ctx = rptContext(season, period);
  const sections = {};
  REPORT_SECTION_DEFS.forEach(def => {
    if (ctx.std && RPT_SEASON_TOTALS_ONLY.has(def.key)) {
      sections[def.key] = { ...def, available: false, reason: 'Season totals only' };
      return;
    }
    let data = null, error = null;
    try { data = REPORT_SECTION_BUILDERS[def.key](brand, season, ctx); }
    catch (e) { error = e; console.warn(`Report section ${def.key} failed`, e); }
    sections[def.key] = data ? { ...def, available: true, ...data } : { ...def, available: false, error, reason: `No ${season} data` };
  });
  return {
    brand, season, priorSeason: rptPriorSeason(season), sections, generated: new Date(),
    period: { std: ctx.std, throughGame: ctx.throughGame, throughDate: ctx.throughDate, total: ctx.info.total,
              local: ctx.info.local, usual: ctx.info.usual, national: ctx.info.national,
              measured: ctx.info.dates.length, complete: ctx.info.complete, dates: ctx.info.dates },
  };
}


// ============================================================
// 2. DOCUMENT
// ============================================================
// US Letter at 96 px/in: 816 × 1056. The content column is 712px wide; charts
// are drawn at their printed size (viewBox = rendered width), so 12px in the
// SVG is 12px on paper: the design system's floor for Trade Gothic.

const RPT_CARD_W = 680; // chart width inside a card (712 − padding − border)

// unit: falsy = percent change, true = percentage points, 'places' = rank
// places gained (positive = moved up the ranking).
function rptDeltaHTML(change, unit) {
  if (change === null || change === undefined || !isFinite(change)) return '';
  const dir = change > 0.0005 ? 'up' : change < -0.0005 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬';
  if (unit === 'places') {
    const n = Math.abs(Math.round(change));
    return `<span class="dl ${dir}">${arrow} ${n ? `${n} place${n === 1 ? '' : 's'}` : 'same rank'}</span>`;
  }
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const v = Math.abs(change * 100).toFixed(1);
  return `<span class="dl ${dir}">${arrow} ${sign}${v}${unit ? ' pts' : '%'}</span>`;
}

function rptKpiHTML(k, opts, hero) {
  const delta = opts.compare ? rptDeltaHTML(k.delta, k.places ? 'places' : k.points) : '';
  const sub = delta ? `${delta}${k.cmp ? ` ${escapeHTML(k.cmp)}` : ''}` : (k.meta ? escapeHTML(k.meta) : '&nbsp;');
  return `<div class="kpi${hero ? ' hero' : ''}${k.estimated ? ' est' : ''}">
    <div class="kpi-l">${escapeHTML(k.label)}${k.estimated ? '<span class="estflag">Est.</span>' : ''}</div>
    <div class="kpi-v${k.small ? ' sm' : ''}">${escapeHTML(rptNA(k.value))}${k.suffix ? ` <span class="of">${escapeHTML(k.suffix)}</span>` : ''}</div>
    <div class="kpi-d">${sub}</div>
  </div>`;
}

function rptSvgColumns(data, format, W = RPT_CARD_W, H = 184) {
  const padT = 22, padB = 28, ph = H - padT - padB;
  const n = data.length, slot = W / n, bw = Math.min(24, slot * 0.6);
  const max = Math.max(...data.map(d => d.value), 0) || 1;
  const base = padT + ph;
  const marks = data.map((d, i) => {
    const x = slot * i + (slot - bw) / 2, cx = x + bw / 2;
    const h = d.value > 0 ? Math.max(2, d.value / max * ph) : 0, y = base - h, r = Math.min(4, h);
    const bar = h ? `<path d="M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${base} Z" fill="var(${d.highlight ? '--accent' : '--bar-neutral'})"/>` : '';
    return `${bar}
      <text x="${cx}" y="${y - 7}" text-anchor="middle" class="${d.highlight ? 'vl hl' : 'vl'}">${escapeHTML(format(d.value))}</text>
      <text x="${cx}" y="${H - 8}" text-anchor="middle" class="xl">${escapeHTML(d.label)}${d.flag ? '*' : ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
    <line x1="0" x2="${W}" y1="${base}" y2="${base}" class="ax"/>${marks}</svg>`;
}

function rptSvgLine(labels, series, format, W = RPT_CARD_W, H = 214) {
  const padL = 40, padR = 104, padT = 12, padB = 40;
  const pw = W - padL - padR, ph = H - padT - padB;
  const vals = series.flatMap(s => s.data).filter(v => v !== null && v !== undefined);
  const vmax = Math.max(...vals, 0.01);
  const step = vmax > 0.5 ? 0.25 : 0.1;
  const yMax = Math.min(1, Math.ceil((vmax + step * 0.2) / step) * step) || step;
  const n = labels.length;
  const X = i => padL + (n === 1 ? pw / 2 : i * pw / (n - 1));
  const Y = v => padT + ph - (v / yMax) * ph;
  let grid = '';
  for (let t = 0; t <= yMax + 1e-9; t += step) {
    grid += `<line x1="${padL}" x2="${padL + pw}" y1="${Y(t)}" y2="${Y(t)}" class="${t === 0 ? 'ax' : 'gr'}"/>
      <text x="${padL - 8}" y="${Y(t) + 4}" text-anchor="end" class="yl">${Math.round(t * 100)}%</text>`;
  }
  const xl = labels.map((l, i) => `<text x="${X(i)}" y="${padT + ph + 18}" text-anchor="middle" class="xl">${escapeHTML(l[0])}</text>
    <text x="${X(i)}" y="${padT + ph + 33}" text-anchor="middle" class="xl">${escapeHTML(l[1])}</text>`).join('');
  const colors = ['--series-1', '--series-2', '--series-3', '--series-4'];
  const ends = [];
  const lines = series.map((s, si) => {
    const c = `var(${colors[si]})`;
    let d = '', pen = false;
    s.data.forEach((v, i) => {
      if (v === null || v === undefined) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${X(i)},${Y(v)} `; pen = true;
    });
    const dots = s.data.map((v, i) => v === null || v === undefined ? '' : `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${c}" stroke="#fff" stroke-width="2"/>`).join('');
    let li = -1; s.data.forEach((v, i) => { if (v !== null && v !== undefined) li = i; });
    if (li >= 0) ends.push({ y: Y(s.data[li]), x: X(li), text: `${s.name} ${format(s.data[li])}`, c });
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>${dots}`;
  }).join('');
  // Direct end labels (text in text-secondary, never the series colour), spread
  // apart so two series ending close together don't overlap.
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  const endLabels = ends.map(e => `<line x1="${padL + pw + 12}" x2="${padL + pw + 24}" y1="${e.y}" y2="${e.y}" stroke="${e.c}" stroke-width="2"/>
    <text x="${padL + pw + 28}" y="${e.y + 4}" class="el">${escapeHTML(e.text)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">${grid}${xl}${lines}${endLabels}</svg>`;
}

// Cumulative value by home game: this season (solid red, to date), last season
// (teal, full), and the pace estimate (dashed red to the season's last game,
// with its likely range as a bracket).
function rptSvgPace(c, W = RPT_CARD_W, H = 224) {
  const padL = 54, padR = 118, padT = 12, padB = 34;
  const pw = W - padL - padR, ph = H - padT - padB;
  const G = c.G, curr = c.curr, prior = c.prior ? c.prior.slice(0, G) : null;
  const top = Math.max(curr[curr.length - 1] || 0, prior ? prior[prior.length - 1] : 0, c.pace ? c.pace.hi : 0) * 1.06 || 1;
  const X = g => padL + (G <= 1 ? 0 : (g - 1) / (G - 1) * pw);
  const Y = v => padT + ph - v / top * ph;
  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = top / 4 * k;
    grid += `<line x1="${padL}" x2="${padL + pw}" y1="${Y(v)}" y2="${Y(v)}" class="${k ? 'gr' : 'ax'}"/>
      <text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" class="yl">${escapeHTML(c.format(v))}</text>`;
  }
  const ticks = [1, ...[10, 20, 30, 40].filter(t => t < G - 3), G];
  const xl = ticks.map(t => `<text x="${X(t)}" y="${padT + ph + 18}" text-anchor="middle" class="xl">${t}</text>`).join('') +
    `<text x="${padL + pw / 2}" y="${H - 2}" text-anchor="middle" class="xl">Home game</text>`;
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1)},${Y(v)}`).join(' ');
  const ends = [];
  let marks = '';
  if (prior && prior.length) {
    marks += `<path d="${path(prior)}" fill="none" stroke="var(--series-2)" stroke-width="2"/>`;
    ends.push({ y: Y(prior[prior.length - 1]), c: 'var(--series-2)', text: `${c.priorLabel} ${c.format(prior[prior.length - 1])}` });
  }
  const n = curr.length, last = curr[n - 1] || 0;
  if (c.pace) {
    // The likely range as a shaded cone from today to the season's last game.
    marks += `<path d="M${X(n)},${Y(last)} L${X(G)},${Y(c.pace.hi)} L${X(G)},${Y(c.pace.lo)} Z" fill="var(--series-1)" opacity="0.12"/>
      <path d="M${X(n)},${Y(last)} L${X(G)},${Y(c.pace.hi)} M${X(n)},${Y(last)} L${X(G)},${Y(c.pace.lo)}" fill="none" stroke="var(--series-1)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    ends.push({ y: Y((c.pace.lo + c.pace.hi) / 2), c: 'var(--series-1)', dash: true, text: `Pace ${c.format(c.pace.lo)}–${c.format(c.pace.hi)}` });
  }
  if (n) {
    marks += `<path d="${path(curr)}" fill="none" stroke="var(--series-1)" stroke-width="2"/>
      <circle cx="${X(n)}" cy="${Y(last)}" r="4" fill="var(--series-1)" stroke="#fff" stroke-width="2"/>
      <text x="${X(n)}" y="${Y(last) - 10}" text-anchor="middle" class="vl hl">${escapeHTML(c.format(last))}</text>`;
  }
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  const endLabels = ends.map(e => `<line x1="${padL + pw + 12}" x2="${padL + pw + 24}" y1="${e.y}" y2="${e.y}" stroke="${e.c}" stroke-width="2"${e.dash ? ' stroke-dasharray="4 3"' : ''}/>
    <text x="${padL + pw + 28}" y="${e.y + 4}" class="el">${escapeHTML(e.text)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">${grid}${xl}${marks}${endLabels}</svg>`;
}

// withDelta: add a change column from each item's `delta` (a ratio, or 'new'
// when there's nothing to compare with).
function rptBarListHTML(items, format, withDelta) {
  const max = Math.max(...items.map(i => i.value), 0) || 1;
  const d = i => i.delta === 'new' ? '<span class="dl flat">New</span>' : rptDeltaHTML(i.delta) || '<span class="dl flat">n/a</span>';
  return `<div class="bl${withDelta ? ' wd' : ''}">${items.map(i => `<div class="bl-r">
      <div class="bl-l">${escapeHTML(i.label)}</div>
      <div class="bl-t"><div class="bl-b${i.highlight ? ' hl' : ''}" style="width:${Math.max(0.5, i.value / max * 100).toFixed(1)}%"></div></div>
      <div class="bl-v">${escapeHTML(rptNA(format(i.value)))}</div>${withDelta ? `
      <div class="bl-d">${d(i)}</div>` : ''}
    </div>`).join('')}</div>`;
}

function rptTableHTML(t) {
  const last = t.rows.length - 1;
  return `<table class="dt"><thead><tr>${t.columns.map(c => `<th class="${c.num ? 'n' : ''}">${escapeHTML(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map((r, ri) => `<tr class="${t.totalRow && ri === last ? 'tot' : ''}">${r.map((v, i) => `<td class="${t.columns[i].num ? 'n' : ''}">${escapeHTML(rptNA(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function rptCard(title, sub, inner, extraClass = '') {
  return `<div class="card ${extraClass}"><div class="card-h"><div class="card-t">${escapeHTML(title)}</div>${sub ? `<div class="card-s">${sub}</div>` : ''}</div>${inner}</div>`;
}

function rptInsightHTML(ins, opts) {
  const d = opts.compare && ins.delta ? ` ${rptDeltaHTML(ins.delta.change, ins.delta.points)} vs ${escapeHTML(ins.delta.basis)}` : '';
  return `<li>${ins.html}${ins.estimated ? ' <span class="estflag">Est.</span>' : ''}${d}</li>`;
}

// Blocks are the unit of pagination: each is kept whole on one page.
// data-keep="next" glues a block to the one after it (a heading never ends a
// page); data-break="before" starts a new page.
function rptBlock(html, attrs = '') { return `<div class="blk"${attrs ? ' ' + attrs : ''}>${html}</div>`; }

// The rank to print for a section, or null: only when rankings are switched on
// and the partner finished in the top three of the chosen pool.
function rptShownRank(sec, opts) {
  if (!opts.rank || opts.rank === 'off' || !sec.rankable) return null;
  const r = sec.rankable.ranks[opts.rank];
  return r && r.rank <= RPT_RANK_SHOW_MAX ? { ...r, metric: sec.rankable.metric } : null;
}
function rptOrdinal(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`; }

function rptSectionBlocks(sec, opts) {
  const out = [];
  // "Season pace" switched off: drop the pace tile, line and chart segment.
  if (!opts.pace && sec.pace && !sec.pace.unavailable) {
    sec = { ...sec, kpis: sec.kpis.map(k => k.label === 'Season pace' ? sec.perMinute : k),
            chart: sec.chart && { ...sec.chart, pace: null },
            rankable: sec.rankable && { ...sec.rankable, kpiIndex: 3 } };
  }
  const tag = `data-sec="${escapeAttr(sec.label)}"`;
  const blockIn = (html, attrs = '') => rptBlock(html, `${tag}${attrs ? ' ' + attrs : ''}`);
  out.push(blockIn(`<div class="sec-h"><h2>${escapeHTML(sec.label)}</h2><div class="sec-m">${escapeHTML(sec.count)} · ${escapeHTML(opts.season)}${opts.std ? ' to date' : ''}</div></div>`, 'data-keep="next"'));
  if (sec.banner) {
    const icon = sec.banner.tone === 'warning' ? '!' : 'i';
    out.push(blockIn(`<div class="banner ${sec.banner.tone}"><span class="bi">${icon}</span><div><b>${escapeHTML(sec.banner.title)}</b> ${escapeHTML(sec.banner.text)}</div></div>`, 'data-keep="next"'));
  }
  // Survey recall ranks: on unless switched off.
  if (sec.kpisNoRank && opts.surveyRanks === false) sec = { ...sec, kpis: sec.kpis.slice(0, 2).concat(sec.kpisNoRank) };
  // Per-section "Show" switches for the chart, breakdown and table.
  const part = { chart: true, bars: true, table: true, ...((opts.parts || {})[sec.key]) };
  const shown = rptShownRank(sec, opts);
  let kpis = sec.kpis;
  if (shown && sec.rankable.kpiIndex !== null && sec.rankable.kpiIndex !== undefined) {
    kpis = kpis.slice();
    kpis[sec.rankable.kpiIndex] = { label: opts.rank === 'category' ? 'Category rank' : 'Partner rank', value: `#${shown.rank}`, meta: `of ${shown.of} ${shown.label}` };
  }
  out.push(blockIn(`<div class="kpis">${kpis.map(k => rptKpiHTML(k, opts)).join('')}</div>`));
  const barsBlock = () => {
    if (!part.bars || !sec.bars || !sec.bars.items.length) return;
    const withDelta = !!opts.compare && sec.bars.items.some(i => i.delta !== undefined);
    const sub = withDelta && sec.bars.deltaBasis ? escapeHTML(sec.bars.deltaBasis) : '';
    out.push(blockIn(rptCard(sec.bars.title, sub, rptBarListHTML(sec.bars.items, sec.bars.format, withDelta))));
  };
  if (sec.bars && sec.bars.first) barsBlock();
  const chart = part.chart ? sec.chart : null;
  if (chart && chart.kind === 'column') {
    const fn = chart.footnote ? `<div class="card-f">${escapeHTML(chart.footnote)}</div>` : '';
    out.push(blockIn(rptCard(chart.title, '', rptSvgColumns(chart.data, chart.format) + fn)));
  }
  if (chart && chart.kind === 'pace') {
    const legend = `<span class="lg"><i style="background:var(--series-1)"></i>${escapeHTML(opts.season)}</span>` +
      (chart.prior ? `<span class="lg"><i style="background:var(--series-2)"></i>${escapeHTML(chart.priorLabel)}</span>` : '') +
      (chart.pace ? `<span class="lg"><i class="dash"></i>Pace (est.)</span>` : '');
    out.push(blockIn(rptCard(chart.title, legend, rptSvgPace(chart))));
  }
  if (chart && chart.kind === 'line') {
    const legend = chart.series.map((s, i) => `<span class="lg"><i style="background:var(--series-${i + 1})"></i>${escapeHTML(s.name)}</span>`).join('');
    out.push(blockIn(rptCard(chart.title, legend, rptSvgLine(chart.labels, chart.series, chart.format))));
  }
  if (!(sec.bars && sec.bars.first)) barsBlock();
  if (part.table && sec.table && sec.table.rows.length) out.push(blockIn(rptCard(sec.table.title, '', rptTableHTML(sec.table), 'tbl')));
  const chosen = (opts.insights && opts.insights[sec.key]) || sec.insights.map((_, i) => i).slice(0, 3);
  // The pace line follows the "Season pace" option, not the takeaway ticks.
  const ins = chosen.map(i => sec.insights[i]).filter(Boolean);
  if (sec.paceInsight && !!opts.pace) ins.splice(Math.min(1, ins.length), 0, sec.paceInsight);
  if (shown) ins.unshift({ html: `<b>${rptOrdinal(shown.rank)}</b> in ${escapeHTML(shown.metric)} among ${shown.of} ${escapeHTML(shown.label)}.` });
  const note = ((opts.notes || {})[sec.key] || '').trim();
  if (ins.length || note) {
    out.push(blockIn(`${ins.length ? `<ul class="ins">${ins.map(x => rptInsightHTML(x, opts)).join('')}</ul>` : ''}${note ? `<p class="unote">${escapeHTML(note)}</p>` : ''}`, 'data-keep="next" data-tail="1"'));
  }
  out.push(blockIn(`<p class="src">${escapeHTML(sec.source)}</p>`, `data-gap="section"${ins.length || note ? '' : ' data-tail="1"'}`));
  return out;
}

// Each entry is a list of [term, definition], or a function (sec, opts) that
// returns one when the wording depends on what the section shows.
const RPT_METHODOLOGY = {
  tv: [['QI media value', 'Defined by Nielsen. The dollar value of on-screen exposure during broadcasts, discounted for logo clarity, size, position and duration.'],
       ['QI impressions', 'Defined by Nielsen. Gross impressions adjusted by the same quality score.'],
       ['Season comparisons', 'Changes compare the same number of home broadcasts in each season. If this season has 38 home broadcasts, they are compared with the first 38 of last season. Seasons that also measured away broadcasts are not compared on full-season totals.']],
  virtualSignage: [['Away game valuation', 'Virtual signage runs on home and away broadcasts, and Nielsen measures home broadcasts only. Home games with a Nielsen measurement use that value. Away games and unmeasured home games are valued at the season average for the same on-court position (center court or 3-point line), which is the average QI media value per game across all measured home games this season. Figures that include an estimate are marked Est.']],
  organic: [['Organic social (via Zoomph)', 'Measured by Zoomph, a third-party provider. Includes organic posts on the Trail Blazers\' own social accounts. Paid promotion and earned media, such as other accounts posting about the partner, are not included.'],
            ['Brand value', 'Zoomph\'s estimate of the value of the partner\'s logo and mentions in that content.'],
            ['Monthly reports', 'Zoomph reports each month separately, and a season figure adds up its months. Seasons run July to June.']],
  survey: (sec, opts) => [
    ['Brand awareness survey', 'A Trail Blazers-run Partnership Survey conducted through Qualtrics in two waves each season, Early (October and November) and Late (March).'],
    ['Aided recall', 'Share of respondents who recognize the partner from a provided list.'],
    ['Unaided recall', 'Share of respondents who name the partner without prompting.'],
    ['Not on the list', 'A 0% aided score means the brand was not on the aided list that wave. Those waves show "n/a" instead of zero.'],
    ...(opts.surveyRanks === false ? [] : [['Recall rank', 'The partner\'s position among all brands measured in the same wave, where #1 is the highest recall. Rank changes compare with the same wave last season.']]),
  ],
  paid: [['Paid social', 'Meta campaigns linked to the partner. Click-through is link clicks divided by impressions. Unassigned campaigns are excluded.']],
  ancLED: [['Board locations', 'The Moda Center LED boards (for example stanchions or the 360 ring) the partner\'s creative ran on, from the ANC sponsor reports.'],
           ['Ad versions', 'The number of different creatives rotated across those boards.'],
           ['LED exposure', 'Time the creative was on screen, shown as a total for the period and as an average per event.']],
  affidavit: [['Contracted vs bonus', 'Contracted spots are in the agreement. Bonus spots ran in addition at no charge.']],
  webDisplay: sec => [
    ['Banner ads', `Banner ad impressions served on ${sec.totals.sites || 'TrailBlazers.com and RoseQuarter.com'}. Click-through is clicks divided by impressions.`],
    ...(sec.totals.plays ? [['Pre-roll plays', 'Video ad starts.']] : []),
  ],
};

function rptPeriodLabel(model) {
  return model.period.std ? `${model.season} · through home game ${model.period.throughGame}` : model.season;
}

function rptSummaryBlocks(model, keys, opts) {
  const S = model.sections, out = [];
  const tv = keys.includes('tv') ? S.tv : null, vs = keys.includes('virtualSignage') ? S.virtualSignage : null;
  const tiles = [];
  if (tv || vs) {
    const q = (tv ? tv.totals.qimv : 0) + (vs ? vs.totals.qimv : 0);
    const parts = [tv && `TV signage ${formatCurrency(tv.totals.qimv)}`, vs && `virtual on-court ${formatCurrency(vs.totals.qimv)}${vs.totals.estimated ? ' (est.)' : ''}`].filter(Boolean);
    const pace = tv && tv.pace && !tv.pace.unavailable && !!opts.pace ? tv.pace : null;
    tiles.push({ label: model.period.std ? 'QI media value to date' : 'Total QI media value', value: formatCurrency(q),
      delta: !vs && tv ? tv.totals.delta : null, cmp: tv && tv.totals.cmp,
      meta: pace && !vs ? `TV on pace for ${formatCurrency(pace.lo)}–${formatCurrency(pace.hi)} (est.)`
        : parts.length > 1 ? parts.join(' + ') : (tv ? `${tv.totals.games} local broadcasts` : ''),
      estimated: !!(vs && vs.totals.estimated && !tv) });
  }
  // In-arena LED is a delivery check, not a result, so it stays out of the
  // summary.
  const pick = [
    ['tv', sec => sec.kpis[1]], ['organic', sec => sec.kpis[0]], ['survey', sec => sec.kpis[0]],
    ['paid', sec => sec.kpis[0]], ['affidavit', sec => sec.kpis[0]],
    ['webDisplay', sec => sec.kpis[0]], ['organic', sec => sec.kpis[1]],
  ];
  for (const [k, f] of pick) {
    if (tiles.length >= 4) break;
    if (keys.includes(k)) { const t = f(S[k]); if (t && !tiles.includes(t)) tiles.push(t); }
  }
  out.push(rptBlock(`<div class="sec-h"><h2>Executive summary</h2><div class="sec-m">${escapeHTML(rptPeriodLabel(model))}</div></div>`, 'data-keep="next"'));
  out.push(rptBlock(`<div class="kpis${tv || vs ? ' sum' : ''}">${tiles.map((t, i) => rptKpiHTML(t, opts, i === 0 && (tv || vs))).join('')}</div>`, 'data-keep="next"'));
  const lead = keys.filter(k => k !== 'ancLED').map(k => {
    const chosen = (opts.insights && opts.insights[k]) || [0];
    return S[k].insights[chosen[0]];
  }).filter(x => x && (!x.estimated || !!opts.pace)).slice(0, 6);
  if (lead.length) out.push(rptBlock(`<ul class="ins">${lead.map(x => rptInsightHTML(x, opts)).join('')}</ul>`, 'data-gap="section"'));
  return out;
}

function rptReportCSS() {
  const F = REPORT_BRAND_ASSETS.fonts;
  return `
@font-face{font-family:"League Gothic";src:url(${F.leagueGothic}) format("woff2");font-weight:100 900;}
@font-face{font-family:"Trade Gothic";src:url(${F.tradeGothic}) format("woff2");font-weight:400;}
@font-face{font-family:"Trade Gothic";src:url(${F.tradeGothicBold}) format("woff2");font-weight:700;}
:root{
  --surface-page:#f4f1ec;--surface-card:#ffffff;--surface-sunken:#ebebec;
  --text-primary:#000000;--text-secondary:#5e5e60;--text-muted:#6b6c6e;--text-accent:#c8102e;
  --border:#dcddde;--grid:#dcddde;--axis:#b7b9bc;--accent:#c8102e;--accent-wash:rgba(200,16,46,.08);
  --bar-neutral:#939598;--series-1:#c8102e;--series-2:#0e8fa8;--series-3:#8a9a20;--series-4:#ce6099;
  --delta-up:#136c48;--delta-down:#a6192e;--status-warning:#8f5a10;
  --display:"League Gothic","Arial Narrow","Helvetica Neue Condensed",sans-serif;
  --body:"Trade Gothic","Arial Narrow","Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--surface-page);color:var(--text-primary);font-family:var(--body);font-size:14px;line-height:1.4;}
#flow{position:absolute;left:-10000px;top:0;width:712px}
#pages{padding:24px 0}
.page{width:816px;height:1056px;margin:0 auto 24px;background:var(--surface-card);box-shadow:0 4px 12px rgba(6,25,34,.10);
  display:flex;flex-direction:column;padding:44px 52px 0;position:relative;overflow:hidden}
.page.first{border-top:3px solid var(--accent);padding-top:41px}
.page-head{height:30px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);margin-bottom:18px;
  font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
.page-body{flex:1;overflow:hidden}
.page-foot{height:56px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);
  font-size:12px;color:var(--text-muted)}
.page-foot img{height:10px;width:auto;margin-right:10px;vertical-align:-1px}
.blk{padding-bottom:14px}
.blk[data-gap="section"]{padding-bottom:28px}
.page-body.tight .blk{padding-bottom:8px}.page-body.tight .blk[data-gap="section"]{padding-bottom:16px}
.cover{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:6px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-accent)}
.name{font-family:var(--display);font-size:64px;line-height:.92;letter-spacing:.012em;text-transform:uppercase;margin:10px 0 10px;font-weight:400}
.meta{font-size:13px;color:var(--text-secondary)}
.cover-logos{display:flex;align-items:center;gap:18px;flex-shrink:0}
.cover-logos .pl{height:56px;width:auto;max-width:150px;object-fit:contain}
.cover-logos .bl-lock{height:72px;width:auto}
.cover-logos .sep{width:1px;height:56px;background:var(--border)}
.rule{border-bottom:1px solid var(--border);margin-bottom:0}
.sec-h{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--accent);padding-bottom:6px}
.sec-h h2{font-family:var(--display);font-weight:400;font-size:30px;line-height:1;letter-spacing:.02em;text-transform:uppercase}
.sec-m{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding-bottom:3px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpis.sum{grid-template-columns:2fr 1fr 1fr 1fr}
.kpi{border:1px solid var(--border);border-radius:6px;padding:10px 12px 11px;background:var(--surface-card);min-width:0}
.kpi.hero{border-top:3px solid var(--accent);padding-top:8px}
.kpi.est{border-style:dashed}
.kpi-l{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary);display:flex;gap:6px;align-items:center}
.estflag{font-size:12px;letter-spacing:.04em;border:1px solid var(--status-warning);color:var(--status-warning);border-radius:3px;padding:0 4px;line-height:15px}
.kpi-v{font-family:var(--display);font-size:40px;line-height:1.02;letter-spacing:.02em;margin-top:4px;white-space:nowrap}
.kpi.hero .kpi-v{font-size:60px;line-height:.95}
.kpi-v.sm{font-size:28px;line-height:1.1;margin-top:9px;margin-bottom:5px}
.kpi-d{font-size:12px;color:var(--text-muted);margin-top:3px;line-height:1.3}
.dl{font-weight:700;white-space:nowrap}.dl.up{color:var(--delta-up)}.dl.down{color:var(--delta-down)}.dl.flat{color:var(--text-secondary)}
.card{border:1px solid var(--border);border-radius:6px;padding:12px 15px 12px;background:var(--surface-card)}
.card-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:12px}
.card-t{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.card-s{font-size:12px;color:var(--text-secondary);display:flex;gap:14px}
.card-f{font-size:12px;color:var(--text-muted);margin-top:6px}
.lg{display:inline-flex;align-items:center;gap:6px}.lg i{display:inline-block;width:14px;height:2px}
.lg i.dash{background:repeating-linear-gradient(90deg,var(--series-1) 0 4px,transparent 4px 7px)}
.meta.through{font-weight:700;color:var(--text-primary);margin-bottom:3px}
.ins .estflag{display:inline-block;margin-left:4px;vertical-align:1px}
svg{display:block;font-family:var(--body)}
svg .vl{font-size:12px;fill:var(--text-secondary)}svg .vl.hl{fill:var(--text-primary);font-weight:700}
svg .xl,svg .yl{font-size:12px;fill:var(--text-muted)}svg .el{font-size:12px;fill:var(--text-secondary)}
svg .ax{stroke:var(--axis);stroke-width:1}svg .gr{stroke:var(--grid);stroke-width:1}
.bl{display:flex;flex-direction:column;gap:7px}
.bl-r{display:grid;grid-template-columns:170px 1fr 74px;align-items:center;gap:12px;font-size:13px}
.bl-l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}
.bl-t{height:12px;background:var(--surface-sunken);border-radius:4px;overflow:hidden}
.bl-b{height:100%;background:var(--bar-neutral);border-radius:4px}.bl-b.hl{background:var(--accent)}
.bl-v{text-align:right;color:var(--text-secondary)}
.bl.wd .bl-r{grid-template-columns:170px 1fr 74px 92px}
.bl-d{text-align:right;font-size:12px}
.kpi-v .of{font-size:22px;color:var(--text-secondary)}
table.dt{width:100%;border-collapse:collapse;font-size:13px}
.dt th{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary);text-align:left;padding:0 8px 6px;border-bottom:1px solid var(--axis)}
.dt td{padding:5px 8px;border-bottom:1px solid var(--grid)}
.dt th:first-child,.dt td:first-child{padding-left:0}.dt th:last-child,.dt td:last-child{padding-right:0}
.dt .n{text-align:right}.dt tr.tot td{font-weight:700;border-bottom:none;border-top:1px solid var(--axis)}
.dt tr:last-child td{border-bottom:none}
.ins{list-style:none;display:flex;flex-direction:column;gap:5px}
.ins li{padding-left:16px;position:relative;font-size:14px;line-height:1.4}
.ins li::before{content:"▸";position:absolute;left:0;top:0;color:var(--accent)}
.unote{margin-top:8px;font-size:14px;padding:8px 12px;background:var(--surface-page);border-radius:6px}
.src{font-size:12px;color:var(--text-muted);line-height:1.4}
.banner{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:13px;background:var(--surface-card)}
.banner .bi{flex-shrink:0;width:18px;height:18px;border-radius:50%;color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;background:var(--text-secondary)}
.banner.warning .bi{background:var(--status-warning)}.banner.warning b{color:var(--status-warning)}
.defs{display:grid;grid-template-columns:170px 1fr;gap:6px 16px;font-size:13px}
.defs dt{font-weight:700}.defs dd{color:var(--text-secondary)}
@page{size:letter;margin:0}
@media print{
  body{background:#fff}
  #pages{padding:0;zoom:1!important}
  .page{margin:0;box-shadow:none;break-after:page;height:1056px}
  .page:last-child{break-after:auto}
}`;
}

// The in-document paginator. Moves each block from #flow onto the current page
// and starts a new page when it doesn't fit, so a block is never split. Runs
// after the fonts load, because block heights depend on them.
const RPT_PAGINATE_JS = `
(function(){
  var HEAD = document.getElementById('pq-head').innerHTML;
  var FOOT = document.getElementById('pq-foot').innerHTML;
  var pagesEl = document.getElementById('pages');
  function newPage(n){
    var pg = document.createElement('section');
    pg.className = 'page' + (n === 0 ? ' first' : '');
    pg.innerHTML = (n === 0 ? '' : '<div class="page-head">' + HEAD + '</div>') +
      '<div class="page-body"></div><div class="page-foot"><span>' + FOOT + '</span><span class="pn"></span></div>';
    pagesEl.appendChild(pg);
    return pg.querySelector('.page-body');
  }
  function paginate(){
    var blocks = Array.prototype.slice.call(document.getElementById('flow').children);
    var n = 0, body = newPage(n++);
    function over(){ return body.scrollHeight > body.clientHeight + 0.5; }
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.getAttribute('data-break') === 'before' && body.children.length) body = newPage(n++);
      var group = [b], j = i;
      while (blocks[j].getAttribute('data-keep') === 'next' && j + 1 < blocks.length) { j++; group.push(blocks[j]); }
      var hadContent = body.children.length > 0;
      group.forEach(function(g){ body.appendChild(g); });
      if (over() && hadContent) {
        // A small overflow: tighten this page's spacing before giving up on it,
        // so a two-line tail doesn't become a page of its own.
        // Once a page has tightened it stays tight: earlier blocks may rely on it.
        var wasTight = body.classList.contains('tight');
        body.classList.add('tight');
        if (!over()) { i = j; continue; }
        if (!wasTight) body.classList.remove('tight');
        group.forEach(function(g){ g.remove(); });
        // Widow rule: a section's takeaways never open a page by themselves.
        // Bring the block before them (and anything glued to it) along.
        var pulled = [];
        if (group[0].getAttribute('data-tail')) {
          var prev = body.lastElementChild;
          while (prev) {
            pulled.unshift(prev);
            var before = prev.previousElementSibling;
            if (before && before.getAttribute('data-keep') === 'next') prev = before; else break;
          }
          if (pulled.length >= body.children.length) pulled = []; // would empty the page
        }
        var wasTightPage = body.classList.contains('tight');
        pulled.forEach(function(g){ g.remove(); });
        if (wasTightPage) { body.classList.remove('tight'); if (over()) body.classList.add('tight'); }
        body = newPage(n++);
        pulled.concat(group).forEach(function(g){ body.appendChild(g); });
      }
      i = j;
    }
    var pages = pagesEl.querySelectorAll('.page');
    pages.forEach(function(p, k){
      p.querySelector('.pn').textContent = 'Page ' + (k + 1) + ' of ' + pages.length;
      // A page that opens mid-section names the section it continues.
      var first = p.querySelector('.page-body > .blk');
      var ph = p.querySelector('.page-head');
      if (ph && first && first.getAttribute('data-sec') && !first.querySelector('.sec-h')) {
        ph.lastElementChild.textContent = first.getAttribute('data-sec') + ' (continued)';
      }
    });
    window.reportPageCount = pages.length;
  }
  function fit(){ pagesEl.style.zoom = Math.min(1, (window.innerWidth - 32) / 816); }
  // fonts.ready alone can resolve before a face is even requested (nothing is
  // laid out yet), which paginated with fallback metrics and let pages overflow
  // once League Gothic arrived. Ask for every face explicitly first.
  var fontsLoaded = document.fonts
    ? Promise.all(['400 40px "League Gothic"', '400 14px "Trade Gothic"', '700 14px "Trade Gothic"'].map(function(f){ return document.fonts.load(f); }))
        .then(function(){ return document.fonts.ready; }, function(){ return null; })
    : Promise.resolve();
  window.reportReady = fontsLoaded.then(function(){
    paginate(); fit(); window.addEventListener('resize', fit); return window.reportPageCount;
  });
})();`;

// opts: { sections: {key: bool}, insights: {key: [index]}, notes: {key: text},
//         compare: bool, methodology: bool, preparedBy }
function renderReportDocument(model, opts) {
  opts = { compare: true, methodology: true, pace: false, rank: 'off', surveyRanks: true, parts: {}, ...opts, season: model.season, std: model.period.std };
  const keys = REPORT_SECTION_DEFS.map(d => d.key)
    .filter(k => model.sections[k].available && (!opts.sections || opts.sections[k]));
  const brand = model.brand;
  const latest = getLatestDataDate();
  const generated = model.generated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const partnerLogo = lookupPartnerLogo(brand);
  const L = REPORT_BRAND_ASSETS.logos;
  const P = model.period;
  const throughTxt = P.std ? `Through home game ${P.throughGame} of ${P.total}${P.local ? ' local broadcasts' : ''} (${formatShortDate(parseDateLoose(P.throughDate))})` : '';
  const title = `${brand} Partnership Report ${model.season}${P.std ? ` through game ${P.throughGame}` : ''}`;

  const blocks = [];
  blocks.push(rptBlock(`<div class="cover">
      <div>
        <div class="eyebrow">Partnership report · ${escapeHTML(model.season)}${P.std ? ' season to date' : ''}</div>
        <h1 class="name">${escapeHTML(brand)}</h1>
        ${throughTxt ? `<div class="meta through">${escapeHTML(throughTxt)}</div>` : ''}
        <div class="meta">Prepared by ${escapeHTML(opts.preparedBy || (DASHBOARD_META && DASHBOARD_META.preparedBy) || 'Partnership Strategy')} · Generated ${generated}${latest && model.season === rptCurrentSeason() && !P.std ? ` · Data through ${formatShortDate(latest)}` : ''}</div>
      </div>
      <div class="cover-logos">
        ${partnerLogo && partnerLogo.type !== 'svg' ? `<img class="pl" src="${partnerLogo.data}" alt="${escapeAttr(brand)}"><span class="sep"></span>` : ''}
        <img class="bl-lock" src="${L.stacked}" alt="Portland Trail Blazers">
      </div>
    </div>`, 'data-gap="section"'));

  if (!keys.length) {
    blocks.push(rptBlock(`<div class="banner"><span class="bi">i</span><div><b>No sections selected.</b> Choose at least one section with data for ${escapeHTML(model.season)}.</div></div>`));
  } else {
    // A summary of one or two sections would just repeat them.
    if (keys.length >= 3) blocks.push(...rptSummaryBlocks(model, keys, opts));
    keys.forEach(k => blocks.push(...rptSectionBlocks(model.sections[k], opts)));
    if (opts.methodology) {
      const defs = keys.flatMap(k => {
        const m = RPT_METHODOLOGY[k];
        return typeof m === 'function' ? m(model.sections[k], opts) : m || [];
      });
      if (P.std && P.local) defs.unshift(['Local home broadcasts', `This season has ${P.local} local home broadcasts${P.national ? ` (${P.national} home game${P.national === 1 ? ' is' : 's are'} national-only, with no local TV measurement)` : ''}. Game counts and the season pace use ${P.local}.`]);
      if (P.std) defs.unshift(['Season to date', `Every section runs through home game ${P.throughGame} (${formatShortDate(parseDateLoose(P.throughDate))}). TV compares with the same number of home broadcasts last season, organic social with the same completed months, and the survey with the same wave. Sources that only report season totals are not included.`]);
      if (P.std && keys.includes('tv') && model.sections.tv.pace && !model.sections.tv.pace.unavailable && !!opts.pace) {
        defs.push(['Season pace (estimate)', `Values the remaining home games at the lower of two rates: the pace so far, or the share of value earlier seasons delivered after the same point. A season that usually slows down late lowers the estimate, and a stronger finish is never assumed. The range shows how far this method missed for partners in earlier seasons at the same point (20th to 80th percentile). It is offered only between home games ${RPT_PACE_MIN_GAMES} and ${RPT_PACE_MAX_GAMES}.`]);
      }
      const shownRanks = keys.map(k => rptShownRank(model.sections[k], opts)).filter(Boolean);
      if (shownRanks.length) defs.push(['Rankings', opts.rank === 'category' ? 'Among current partners in the same category family, shown only for a top-three position.' : 'Among current partners, shown only for a top-three position.']);
      blocks.push(rptBlock(`<div class="sec-h"><h2>Methodology and definitions</h2><div class="sec-m">${escapeHTML(model.season)}</div></div>`, 'data-keep="next"'));
      // Not forced onto its own page: in a short report it sits under the
      // content; in a long one it moves to a fresh page when it won't fit.
      // Sources aren't repeated here — each section already ends with its own.
      blocks.push(rptBlock(`<dl class="defs">${defs.map(([t, d]) => `<dt>${escapeHTML(t)}</dt><dd>${escapeHTML(d)}</dd>`).join('')}</dl>`));
    }
  }

  const head = `<span>${escapeHTML(brand)} · Partnership report</span><span>${escapeHTML(model.season)}</span>`;
  const foot = `<img src="${L.wordmark}" alt="Portland Trail Blazers">PartnerIQ · Confidential`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHTML(title)}</title>
<style>${rptReportCSS()}</style></head>
<body>
<template id="pq-head">${head}</template><template id="pq-foot">${foot}</template>
<div id="pages"></div>
<div id="flow">${blocks.join('\n')}</div>
<script>${RPT_PAGINATE_JS}<\/script>
</body></html>`;
}


// ============================================================
// 3. BUILDER
// ============================================================
// One screen: partner, season, sections (each with its takeaways and an
// optional note), options, and a live preview of the exact pages that print.

const _rb = {
  brand: null, season: null, seasons: [], model: null,
  sections: {}, insights: {}, notes: {}, open: {},
  compare: true, methodology: true, timer: null, renderId: 0,
  period: 'full', throughGame: null, pace: false, rank: 'off',
  surveyRanks: true, parts: {},
};

function rptDefaultBrand() {
  const season = rptCurrentSeason();
  const byQimv = {};
  getTVRowsForPeriod(season).forEach(r => { byQimv[r.Brand] = (byQimv[r.Brand] || 0) + (Number(r['QI Media Value ($)']) || 0); });
  const ranked = Object.keys(byQimv).filter(isCurrentPartner).sort((a, b) => byQimv[b] - byQimv[a]);
  return ranked[0] || DataStore.getBrandList()[0] || null;
}

function rptPlainText(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }

// preserve: keep the current section/takeaway choices where they still apply
// (switching the period shouldn't undo someone's picks).
function rbLoadModel(preserve) {
  const prev = preserve ? { sections: _rb.sections, insights: _rb.insights } : null;
  _rb.model = buildReportModel(_rb.brand, _rb.season, { mode: _rb.period, throughGame: _rb.throughGame });
  _rb.sections = {}; _rb.insights = {};
  REPORT_SECTION_DEFS.forEach(def => {
    const sec = _rb.model.sections[def.key];
    const keep = prev && prev.sections[def.key] !== undefined;
    _rb.sections[def.key] = sec.available && (keep ? prev.sections[def.key] || !prev.insights[def.key] || !prev.insights[def.key].length : true);
    const kept = keep ? (prev.insights[def.key] || []).filter(i => i < (sec.insights || []).length) : null;
    _rb.insights[def.key] = sec.available ? (kept && kept.length ? kept : sec.insights.map((_, i) => i).slice(0, 3)) : [];
  });
}

function rbSetBrand(brand) {
  if (brand !== _rb.brand) { _rb.notes = {}; _rb.open = {}; _rb.parts = {}; }
  _rb.brand = brand;
  _rb.seasons = getReportSeasonsForBrand(brand);
  if (!_rb.seasons.includes(_rb.season)) _rb.season = _rb.seasons[0] || rptCurrentSeason();
  _rb.throughGame = null;
  rbLoadModel();
}

function openReportModal(prefilledBrand = null) {
  const brand = prefilledBrand || currentBrand || rptDefaultBrand();
  if (!brand) { showErrorToast('Load partner data before building a report.'); return; }
  _rb.season = null;
  _rb.period = 'full';
  rbSetBrand(brand);
  document.getElementById('reportModalBackdrop').classList.add('active');
  rbRenderPanel();
  rbRefreshPreview(true);
}

function closeReportModal() {
  document.getElementById('reportModalBackdrop').classList.remove('active');
}

function rbRenderPanel() {
  const body = document.getElementById('reportModalBody');
  if (!body) return;
  const m = _rb.model;
  const brands = DataStore.getBrandList();
  const current = brands.filter(isCurrentPartner), others = brands.filter(b => !isCurrentPartner(b));
  const opts = list => list.map(b => `<option value="${escapeAttr(b)}"></option>`).join('');
  const secRows = REPORT_SECTION_DEFS.map(def => {
    const sec = m.sections[def.key];
    const on = !!_rb.sections[def.key], open = !!_rb.open[def.key] && sec.available;
    // Show switches, named after what they show ("Top signage locations").
    const parts = (sec.bars && sec.bars.first ? [['bars', sec.bars], ['chart', sec.chart]] : [['chart', sec.chart], ['bars', sec.bars]])
      .concat([['table', sec.table]])
      .filter(([, x]) => x && x.title && (!x.items || x.items.length) && (!x.rows || x.rows.length));
    const shownParts = { chart: true, bars: true, table: true, ...(_rb.parts[def.key] || {}) };
    const detail = open ? `<div class="rb-detail">
        ${parts.length ? `<div class="rb-mini">Show</div>
        ${parts.map(([p, x]) => `<label class="rb-ins"><input type="checkbox" data-rb-part="${def.key}" value="${p}" ${shownParts[p] ? 'checked' : ''}><span>${escapeHTML(x.title)}</span></label>`).join('')}` : ''}
        <div class="rb-mini">Takeaways to include</div>
        ${sec.insights.map((ins, i) => `<label class="rb-ins"><input type="checkbox" data-rb-ins="${def.key}" value="${i}" ${_rb.insights[def.key].includes(i) ? 'checked' : ''}><span>${escapeHTML(rptPlainText(ins.html))}</span></label>`).join('')}
        <textarea class="rb-note" data-rb-note="${def.key}" rows="2" placeholder="Add a note for this section (optional)">${escapeHTML(_rb.notes[def.key] || '')}</textarea>
      </div>` : '';
    return `<div class="rb-sec${sec.available ? '' : ' off'}${open ? ' open' : ''}">
      <div class="rb-sec-row">
        <label class="rb-check"><input type="checkbox" data-rb-sec="${def.key}" ${on ? 'checked' : ''} ${sec.available ? '' : 'disabled'}>
          <span class="rb-sec-name">${escapeHTML(def.label)}</span></label>
        <span class="rb-sec-meta">${sec.available ? escapeHTML(sec.count) : escapeHTML(sec.reason || `No ${_rb.season} data`)}</span>
        ${sec.available ? `<button type="button" class="rb-exp" data-rb-open="${def.key}" aria-expanded="${open}" title="Takeaways and note">${open ? '▾' : '▸'}</button>` : '<span class="rb-exp-sp"></span>'}
      </div>${detail}</div>`;
  }).join('');
  const prior = rptPriorSeason(_rb.season);
  const P = m.period;
  const tv = m.sections.tv;
  const paceInfo = tv && tv.available ? tv.pace : null;
  const paceNote = !P.std ? '' : paceInfo && paceInfo.unavailable ? paceInfo.unavailable : !paceInfo ? 'Needs TV data to date.' : '';
  const gameOpts = P.dates.map((d, i) => `<option value="${i + 1}" ${i + 1 === P.throughGame ? 'selected' : ''}>Game ${i + 1} · ${escapeHTML(formatShortDate(parseDateLoose(d)))}</option>`).reverse().join('');
  const hasCategory = !!rptCategoryFamily(_rb.brand);

  body.innerHTML = `<div class="rb">
    <aside class="rb-side">
      <div class="rb-scroll">
        <div class="rb-field"><label class="rb-lbl" for="rbPartner">Partner</label>
          <input id="rbPartner" class="select-control rb-input" list="rbPartnerList" value="${escapeAttr(_rb.brand)}" autocomplete="off" spellcheck="false">
          <datalist id="rbPartnerList">${opts(current)}${opts(others)}</datalist></div>
        <div class="rb-field"><label class="rb-lbl" for="rbSeason">Season</label>
          <select id="rbSeason" class="select-control rb-input">${_rb.seasons.map(s => `<option value="${s}" ${s === _rb.season ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="rb-field"><span class="rb-lbl">Period</span>
          <div class="rb-seg" role="group" aria-label="Period">
            <button type="button" data-rb-period="full" class="${P.std ? '' : 'on'}" aria-pressed="${!P.std}">Full season</button>
            <button type="button" data-rb-period="std" class="${P.std ? 'on' : ''}" aria-pressed="${P.std}" ${P.dates.length ? '' : 'disabled'}>Season to date</button>
          </div>
          ${P.std ? `<select id="rbThrough" class="select-control rb-input rb-through" aria-label="Through home game">${gameOpts}</select>
            <div class="rb-hint">Through home game ${P.throughGame} of ${P.total}${P.local ? ` local broadcasts (${P.national} national)` : ''}</div>` : ''}
        </div>
        <div class="rb-group-h"><span class="rb-lbl">Sections</span>
          <span><button type="button" class="rb-link" data-rb-all="1">All</button> · <button type="button" class="rb-link" data-rb-all="0">None</button></span></div>
        <div class="rb-secs">${secRows}</div>
        <div class="rb-group-h"><span class="rb-lbl">Options</span></div>
        <label class="rb-check rb-opt"><input type="checkbox" id="rbCompare" ${_rb.compare ? 'checked' : ''}><span>Compare with ${escapeHTML(prior || 'last season')}</span></label>
        <label class="rb-check rb-opt"><input type="checkbox" id="rbMethod" ${_rb.methodology ? 'checked' : ''}><span>Methodology page</span></label>
        <label class="rb-check rb-opt${m.sections.survey.available ? '' : ' dis'}"><input type="checkbox" id="rbSurveyRanks" ${_rb.surveyRanks ? 'checked' : ''} ${m.sections.survey.available ? '' : 'disabled'}><span>Survey recall ranks</span></label>
        ${P.std ? `<label class="rb-check rb-opt${paceNote ? ' dis' : ''}"><input type="checkbox" id="rbPace" ${_rb.pace && !paceNote ? 'checked' : ''} ${paceNote ? 'disabled' : ''}><span>Season pace (estimate)</span></label>
          ${paceNote ? `<div class="rb-hint rb-hint-in">${escapeHTML(paceNote)}</div>` : ''}
          ${_rb.pace && !paceNote ? `<div class="rb-local">
            <label for="rbLocal">Local home broadcasts this season</label>
            <input id="rbLocal" type="number" class="select-control" min="${P.measured}" max="${P.usual}" step="1" value="${P.local || P.usual}">
            <div class="rb-hint">Lower it when home games are national-only (no local TV). Saved with the data.</div>
          </div>` : ''}` : ''}
        <div class="rb-field rb-rank"><label class="rb-lbl" for="rbRank">Rankings</label>
          <select id="rbRank" class="select-control rb-input">
            <option value="off" ${_rb.rank === 'off' ? 'selected' : ''}>Off</option>
            <option value="overall" ${_rb.rank === 'overall' ? 'selected' : ''}>Overall (among current partners)</option>
            <option value="category" ${_rb.rank === 'category' ? 'selected' : ''} ${hasCategory ? '' : 'disabled'}>Category${hasCategory ? ` (${escapeHTML(rptCategoryFamily(_rb.brand))})` : ' (no roster category)'}</option>
          </select>
          <div class="rb-hint">TV and organic social. Shown only where the partner is in the top ${RPT_RANK_SHOW_MAX}.</div></div>
      </div>
      <div class="rb-foot">
        <div class="rb-status" id="rbStatus">Building preview…</div>
        <button type="button" class="btn btn-primary rb-print" id="rbPrint">Save as PDF</button>
      </div>
    </aside>
    <div class="rb-preview"><iframe id="rbFrame" title="Report preview"></iframe></div>
  </div>`;
  rbWire(body);
}

function rbWire(body) {
  if (body._rbWired) return;
  body._rbWired = true;
  body.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'rbPartner') {
      if (DataStore.getBrandList().includes(t.value)) { rbSetBrand(t.value); rbRenderPanel(); rbRefreshPreview(true); }
      else t.value = _rb.brand;
    } else if (t.id === 'rbSeason') {
      _rb.season = t.value; _rb.throughGame = null; rbLoadModel(); rbRenderPanel(); rbRefreshPreview(true);
    } else if (t.dataset.rbSec) {
      _rb.sections[t.dataset.rbSec] = t.checked; rbRefreshPreview();
    } else if (t.dataset.rbIns) {
      const k = t.dataset.rbIns;
      _rb.insights[k] = [...body.querySelectorAll(`[data-rb-ins="${k}"]:checked`)].map(x => Number(x.value));
      rbRefreshPreview();
    } else if (t.dataset.rbPart) {
      const k = t.dataset.rbPart;
      _rb.parts[k] = { ...(_rb.parts[k] || {}), [t.value]: t.checked };
      rbRefreshPreview();
    } else if (t.id === 'rbThrough') {
      _rb.throughGame = Number(t.value); rbLoadModel(true); rbRenderPanel(); rbRefreshPreview(true);
    } else if (t.id === 'rbPace') { _rb.pace = t.checked; rbRenderPanel(); rbRefreshPreview(); }
    else if (t.id === 'rbLocal') {
      const P = _rb.model.period;
      const v = Math.min(P.usual, Math.max(P.measured, Math.round(Number(t.value)) || P.usual));
      setLocalHomeBroadcasts(_rb.season, v === P.usual ? null : v);
      // A number box fires "change" on blur: redraw after the blur finishes, or
      // the panel is replaced while the browser is still moving focus.
      setTimeout(() => { rbLoadModel(true); rbRenderPanel(); rbRefreshPreview(true); }, 0);
    }
    else if (t.id === 'rbRank') { _rb.rank = t.value; rbRefreshPreview(); }
    else if (t.id === 'rbCompare') { _rb.compare = t.checked; rbRefreshPreview(); }
    else if (t.id === 'rbMethod') { _rb.methodology = t.checked; rbRefreshPreview(); }
    else if (t.id === 'rbSurveyRanks') { _rb.surveyRanks = t.checked; rbRefreshPreview(); }
  });
  body.addEventListener('input', e => {
    if (e.target.dataset.rbNote) { _rb.notes[e.target.dataset.rbNote] = e.target.value; rbRefreshPreview(); }
  });
  body.addEventListener('click', e => {
    const per = e.target.closest('[data-rb-period]');
    if (per && !per.disabled) {
      if (per.dataset.rbPeriod !== _rb.period) { _rb.period = per.dataset.rbPeriod; rbLoadModel(true); rbRenderPanel(); rbRefreshPreview(true); }
      return;
    }
    const open = e.target.closest('[data-rb-open]');
    if (open) { const k = open.dataset.rbOpen; _rb.open[k] = !_rb.open[k]; rbRenderPanel(); return; }
    const all = e.target.closest('[data-rb-all]');
    if (all) {
      REPORT_SECTION_DEFS.forEach(d => { if (_rb.model.sections[d.key].available) _rb.sections[d.key] = all.dataset.rbAll === '1'; });
      rbRenderPanel(); rbRefreshPreview(); return;
    }
    if (e.target.closest('#rbPrint')) rbPrint();
  });
}

function rbOptions() {
  return { sections: _rb.sections, insights: _rb.insights, notes: _rb.notes, compare: _rb.compare,
           methodology: _rb.methodology, pace: _rb.pace, rank: _rb.rank,
           surveyRanks: _rb.surveyRanks, parts: _rb.parts };
}

// Rebuilds the preview. Typing and ticking are debounced; brand/season changes
// render at once. The scroll position survives a rebuild.
function rbRefreshPreview(immediate) {
  clearTimeout(_rb.timer);
  const run = () => {
    const frame = document.getElementById('rbFrame');
    if (!frame) return;
    const id = ++_rb.renderId;
    let y = 0;
    try { y = frame.contentWindow ? frame.contentWindow.scrollY : 0; } catch (e) {}
    const status = document.getElementById('rbStatus');
    if (status) status.textContent = 'Building preview…';
    frame.onload = () => {
      const w = frame.contentWindow;
      if (!w || !w.reportReady) return;
      // Keys pressed while the preview has focus land in its document: pass
      // Escape through so the builder still closes.
      w.document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeReportModal(); });
      w.reportReady.then(n => {
        if (id !== _rb.renderId) return;
        try { w.scrollTo(0, y); } catch (e) {}
        const st = document.getElementById('rbStatus');
        if (st) st.textContent = `${n} page${n === 1 ? '' : 's'} · US Letter`;
      });
    };
    frame.srcdoc = renderReportDocument(_rb.model, rbOptions());
  };
  if (immediate) run(); else _rb.timer = setTimeout(run, 220);
}

// Prints the preview itself, so there's no pop-up window to block. The page
// title is borrowed for the moment of printing because browsers use it as the
// suggested PDF file name.
function rbPrint() {
  const frame = document.getElementById('rbFrame');
  const w = frame && frame.contentWindow;
  if (!w || !w.reportReady) return;
  w.reportReady.then(() => {
    const prev = document.title;
    document.title = w.document.title;
    w.focus();
    w.print();
    setTimeout(() => { document.title = prev; window.focus(); }, 500);
  });
}
