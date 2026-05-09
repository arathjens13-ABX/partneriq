// ============================================================
// TV RATINGS DASHBOARD — Nielsen Broadcast Viewership
// ============================================================
// Data source: DW > vw_viewership > vw_nielsen_tv_metrics
// Exported as: vw_nielsen_tv_metrics__vw_viewership_DW_vw_nielsen_tv_metrics.csv
//   (or any name — detection is column-schema-based, not filename-based)
//
// THIS FILE WILL CHANGE. The export format and column names are expected
// to be updated. When that happens:
//   1. Update normalizeTVRatingsRow() in 14_organic_section.js to remap columns
//   2. If column names change, update the detectFileType() schema check
//      (looks for: 'hh rtg' + 'demo' + 'opponent')
//   3. This rendering file (22_tv_ratings_section.js) reads only the normalized
//      fields: date, season, demo, segment, opponent, imp, rtg, shr, hhImp, hhRtg, hhShr
//
// Data structure after normalization:
//   Each row = one demographic (HH / P2+ / P18-49 / M18-49 / etc.) × one segment
//   (Game / Pre Game / Post Game) for a given game date and opponent.
//   gameType = "Regular Game" | "Pre Season" — derived from Segment columns.
//   All averages and charts exclude Pre Season games (gameType !== "Regular Game").
//   To get a game's HH Rating: filter demo="HH", segment="Game", gameType="Regular Game".
// ============================================================

let tvRatingsSeasonFilter = 'latest'; // 'latest' | season string | 'all'
let tvRatingsChartMetric  = 'hhRtg';  // 'hhRtg' | 'p2Rtg' | 'hhImp' | 'p2Imp'
let tvRatingsYoY          = false;    // overlay prior season on line chart
let tvRatingsOpponentSort = { key: 'avgHHRtg', dir: 'desc' };
let tvRatingsGamesSort    = { key: 'date', dir: 'desc' };

// Known preseason game dates per season — fallback for when column-based detection misses them.
// Update this list each season as needed.
const TV_RATINGS_KNOWN_PRESEASON = {
  '2025-26': ['10/8/2025', '10/14/2025'],
};

// ── Navigation ───────────────────────────────────────────────
function openTVRatingsPage() {
  currentBrand = null;
  currentPage  = 'tv-ratings';
  renderApp();
}

// ── Data helpers ─────────────────────────────────────────────
function getTVRatingsSeasons() {
  const s = new Set((DataStore.tvRatings || []).map(r => r.season).filter(Boolean));
  return [...s].sort();
}

function getTVRatingsActiveSeason() {
  const seasons = getTVRatingsSeasons();
  if (!seasons.length) return null;
  if (tvRatingsSeasonFilter === 'all') return 'all';
  if (tvRatingsSeasonFilter === 'latest' || !seasons.includes(tvRatingsSeasonFilter)) {
    return seasons[seasons.length - 1];
  }
  return tvRatingsSeasonFilter;
}

function getTVRatingsRows(season) {
  const rows = DataStore.tvRatings || [];
  return season === 'all' ? rows : rows.filter(r => r.season === season);
}

function isRegularSeason(r) {
  if (r.gameType === 'Pre Season') return false;
  // Fallback: check known preseason dates for seasons where column detection failed
  const knownPreseason = TV_RATINGS_KNOWN_PRESEASON[r.season] || [];
  if (knownPreseason.length > 0 && r.date) {
    const rTime = new Date(r.date).getTime();
    if (!isNaN(rTime) && knownPreseason.some(d => new Date(d).getTime() === rTime)) return false;
  }
  return true;
}

// Returns sorted unique regular-season game dates (segment=Game) for a season
function getTVRatingsGameDates(season) {
  const rows = getTVRatingsRows(season).filter(r => r.segment === 'Game' && isRegularSeason(r));
  const dates = [...new Set(rows.map(r => r.date).filter(Boolean))];
  return dates.sort((a, b) => new Date(a) - new Date(b));
}

function avgTVMetric(rows, key) {
  const valid = rows.filter(r => r[key] > 0);
  if (!valid.length) return null;
  return valid.reduce((s, r) => s + r[key], 0) / valid.length;
}

function maxTVMetric(rows, key) {
  const valid = rows.filter(r => r[key] > 0);
  if (!valid.length) return null;
  return Math.max(...valid.map(r => r[key]));
}

function formatTVDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTVDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRtg(v) {
  if (v === null || v === undefined) return '—';
  return v.toFixed(1);
}

function fmtImp(v) {
  if (v === null || v === undefined || v === 0) return '—';
  return formatNum(Math.round(v));
}

function fmtShr(v) {
  if (v === null || v === undefined) return '—';
  return v.toFixed(1) + '%';
}

// ── Main page renderer ────────────────────────────────────────
function renderTVRatingsPage(main) {
  const seasons = getTVRatingsSeasons();
  const hasData = DataStore.tvRatings && DataStore.tvRatings.length > 0;

  if (!hasData) {
    main.innerHTML = `
      ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'TV Ratings'}])}
      <div class="brand-header">
        <div class="brand-title-block">
          <div class="eyebrow">TV Ratings · Nielsen Viewership</div>
          <h1 class="brand-title">TV Ratings</h1>
        </div>
      </div>
      <div class="section-unavailable" style="margin-top:24px;">
        Upload the Nielsen TV metrics export to view game ratings, impressions, and demographic breakdowns.<br><br>
        <strong>Expected file:</strong> <code>vw_nielsen_tv_metrics__vw_viewership_DW_vw_nielsen_tv_metrics.csv</code><br>
        <strong>Source:</strong> DW &gt; vw_viewership &gt; vw_nielsen_tv_metrics<br>
        <strong>Detection:</strong> Column-schema based — file will be recognized by the presence of
        <code>HH Rtg</code>, <code>Demo</code>, and <code>Opponent</code> columns regardless of filename.
      </div>`;
    return;
  }

  const activeSeason  = getTVRatingsActiveSeason();
  const displaySeason = activeSeason === 'all' ? null : activeSeason;
  const rows          = getTVRatingsRows(displaySeason || activeSeason);

  // Regular-season rows only for all averages and charts
  const regRows       = rows.filter(r => isRegularSeason(r));
  const gameRows      = regRows.filter(r => r.segment === 'Game');
  const hhGameRows    = gameRows.filter(r => r.demo === 'HH');
  const p2GameRows    = gameRows.filter(r => r.demo === 'P2+');
  const gameDates     = getTVRatingsGameDates(displaySeason || activeSeason);
  const gameCount     = gameDates.length;

  const avgHHRtg  = avgTVMetric(hhGameRows, 'hhRtg');
  const avgHHImp  = avgTVMetric(hhGameRows, 'hhImp');
  const avgP2Rtg  = avgTVMetric(p2GameRows, 'rtg');
  const avgP2Imp  = avgTVMetric(p2GameRows, 'imp');
  const peakHHRtg = maxTVMetric(hhGameRows, 'hhRtg');

  // Prior season for YoY
  const seasonIdx    = seasons.indexOf(displaySeason);
  const priorSeason  = seasonIdx > 0 ? seasons[seasonIdx - 1] : null;
  const priorRows    = priorSeason ? getTVRatingsRows(priorSeason).filter(r => isRegularSeason(r)) : null;
  const priorHHGame  = priorRows ? priorRows.filter(r => r.segment === 'Game' && r.demo === 'HH') : null;
  const priorP2Game  = priorRows ? priorRows.filter(r => r.segment === 'Game' && r.demo === 'P2+') : null;
  const prevAvgHHRtg = priorHHGame ? avgTVMetric(priorHHGame, 'hhRtg') : null;
  const prevAvgP2Rtg = priorP2Game ? avgTVMetric(priorP2Game, 'rtg')   : null;

  const yoyBadge = (curr, prev) => {
    if (curr === null || prev === null || prev === 0) return '';
    const chg = pctChangeFromValues(curr, prev);
    return `<div class="home-card-note" style="color:${chg >= 0 ? 'var(--positive)' : 'var(--negative)'};">${formatSignedPercent(chg)} vs ${priorSeason}</div>`;
  };

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'TV Ratings'}])}
    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">TV Ratings · Nielsen Viewership</div>
        <h1 class="brand-title">TV Ratings Dashboard</h1>
        <div class="brand-subtitle">
          <span class="channel-tag active">${gameCount} Game${gameCount === 1 ? '' : 's'}</span>
          <span class="channel-tag active">${seasons.length} Season${seasons.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
        <div class="period-selector">
          ${seasons.map(s => `<button class="period-btn ${activeSeason === s ? 'active' : ''}" data-tvrtg-season="${s}">${s}</button>`).join('')}
          <button class="period-btn ${activeSeason === 'all' ? 'active' : ''}" data-tvrtg-season="all">All Seasons</button>
        </div>
      </div>
    </div>

    <div class="data-status">
      <div><span class="data-status-dot"></span> Latest update · <strong>${DASHBOARD_META.latestUpdateLabel}</strong>${DASHBOARD_META.latestUpdateDate ? ` · ${DASHBOARD_META.latestUpdateDate}` : ''}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:0.04em;">Regular season only · pre-season games excluded from all averages</div>
    </div>

    <!-- Segment takeaway block -->
    ${renderTVRatingsSegmentTakeaway(regRows)}

    <!-- 5 most recent games -->
    ${renderTVRatingsRecentGames(gameDates, rows)}

    <!-- KPI Cards (regular season game only) -->
    <div class="home-grid" style="margin-bottom:24px;">
      <div class="home-card">
        <div class="home-card-label">Games Tracked</div>
        <div class="home-card-value">${gameCount}</div>
        <div class="home-card-note">${activeSeason === 'all' ? 'All seasons' : activeSeason} · reg. season</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Avg HH Rating</div>
        <div class="home-card-value">${fmtRtg(avgHHRtg)}</div>
        ${yoyBadge(avgHHRtg, prevAvgHHRtg)}
        <div class="home-card-note">Household · game avg</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Avg HH Impressions</div>
        <div class="home-card-value">${fmtImp(avgHHImp)}</div>
        ${yoyBadge(avgHHImp, avgTVMetric(priorHHGame || [], 'hhImp'))}
        <div class="home-card-note">Household · game avg</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Avg P2+ Rating</div>
        <div class="home-card-value">${fmtRtg(avgP2Rtg)}</div>
        ${yoyBadge(avgP2Rtg, prevAvgP2Rtg)}
        <div class="home-card-note">Persons 2+ · game avg</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Peak HH Rating</div>
        <div class="home-card-value">${fmtRtg(peakHHRtg)}</div>
        <div class="home-card-note">Single-game high · reg. season</div>
      </div>
    </div>

    <!-- Season trend line chart -->
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <span class="card-title">Season Rating Trend</span>
        <span class="card-sub">Regular season games only · click a metric to switch</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
        ${[
          ['hhRtg', 'HH Rating'],
          ['p2Rtg', 'P2+ Rating'],
          ['hhImp', 'HH Impressions'],
          ['p2Imp', 'P2+ Impressions'],
        ].map(([k, lbl]) => `
          <button class="period-btn ${tvRatingsChartMetric === k ? 'active' : ''}" data-tvrtg-metric="${k}" style="font-size:11px;">${lbl}</button>
        `).join('')}
        ${priorSeason ? `
          <button class="period-btn ${tvRatingsYoY ? 'active' : ''}" data-tvrtg-yoy="1" style="font-size:11px;margin-left:8px;">
            ${tvRatingsYoY ? '▪' : '◦'} vs ${priorSeason}
          </button>
        ` : ''}
      </div>
      ${renderTVRatingsLineChart(displaySeason || activeSeason, priorSeason)}
    </div>

    <!-- Segment comparison (Pre / Game / Post) -->
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <span class="card-title">Pre-Game / Game / Post-Game Comparison</span>
        <span class="card-sub">Avg HH Rating &amp; P2+ Rating by broadcast segment · regular season</span>
      </div>
      ${renderTVRatingsSegmentComparison(regRows)}
    </div>

    <!-- Opponent table (collapsible) -->
    <section class="section collapsible ${openSections['tvrtg-opponent'] ? 'open' : ''}" id="tvrtg-opponent">
      <button class="section-toggle" type="button" data-section-toggle="tvrtg-opponent">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Opponent Ratings Breakdown</div>
          <div class="section-meta">Avg HH &amp; P2+ ratings by matchup · game segment only</div>
        </div>
      </button>
      <div class="section-body">
        ${renderTVRatingsOpponentTable(displaySeason || activeSeason)}
      </div>
    </section>

    <!-- Advertiser demo spotlight (collapsible) -->
    <section class="section collapsible ${openSections['tvrtg-demos'] ? 'open' : ''}" id="tvrtg-demos">
      <button class="section-toggle" type="button" data-section-toggle="tvrtg-demos">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Advertiser Demo Spotlight</div>
          <div class="section-meta">Avg game rating — key advertiser demographics only (excludes HH &amp; P2+)</div>
        </div>
      </button>
      <div class="section-body">
        ${renderTVRatingsAdDemoChart(gameRows)}
      </div>
    </section>

    <!-- Top games table (collapsible) -->
    <section class="section collapsible ${openSections['tvrtg-games'] ? 'open' : ''}" id="tvrtg-games">
      <button class="section-toggle" type="button" data-section-toggle="tvrtg-games">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Game Log</div>
          <div class="section-meta">All tracked games · sortable · game segment only</div>
        </div>
      </button>
      <div class="section-body">
        ${renderTVRatingsGamesTable(displaySeason || activeSeason)}
      </div>
    </section>
  `;

  wireTVRatingsPage();
  wireSectionToggles();
}

// ── Segment takeaway block ────────────────────────────────────
function renderTVRatingsSegmentTakeaway(regRows) {
  const segs = [
    { key: 'Pre Game',  label: 'Pre-Game',  bold: false },
    { key: 'Game',      label: 'Game',      bold: true  },
    { key: 'Post Game', label: 'Post-Game', bold: false },
  ];

  const cell = (v, bold) =>
    `<td style="text-align:right;padding:10px 18px;font-family:var(--font-mono);font-size:${bold ? '15px' : '13px'};
      font-weight:${bold ? '600' : '400'};color:${bold ? 'var(--text)' : 'var(--text-dim)'};">${v}</td>`;

  const rowHTML = (seg) => {
    const hhRows = regRows.filter(r => r.segment === seg.key && r.demo === 'HH');
    const p2Rows = regRows.filter(r => r.segment === seg.key && r.demo === 'P2+');
    const hhRtg = avgTVMetric(hhRows, 'hhRtg');
    const hhImp = avgTVMetric(hhRows, 'hhImp');
    const p2Imp = avgTVMetric(p2Rows, 'imp');
    const games = [...new Set(hhRows.map(r => r.date))].length;
    if (!games) return '';
    const bg = seg.bold ? 'background:var(--bg-elev-2);' : '';
    return `<tr style="${bg}border-radius:4px;">
      <td style="padding:10px 18px;font-family:var(--font-mono);font-size:${seg.bold ? '12px' : '11px'};
        letter-spacing:0.06em;text-transform:uppercase;font-weight:${seg.bold ? '700' : '400'};
        color:${seg.bold ? 'var(--text)' : 'var(--text-muted)'};white-space:nowrap;">
        ${seg.label}${seg.bold ? '' : `<span style="font-size:9px;margin-left:6px;opacity:0.6;">${games} games</span>`}
      </td>
      ${cell(fmtRtg(hhRtg),  seg.bold)}
      ${cell(fmtImp(hhImp),  seg.bold)}
      ${cell(fmtImp(p2Imp),  seg.bold)}
    </tr>`;
  };

  return `
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header" style="padding-bottom:0;border-bottom:none;">
        <span class="card-title">Segment Averages</span>
        <span class="card-sub">HH Rating · HH Impressions · P2+ Impressions · regular season</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-soft);">
              <th style="text-align:left;padding:8px 18px;font-family:var(--font-mono);font-size:10px;
                letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-weight:400;">Segment</th>
              <th style="text-align:right;padding:8px 18px;font-family:var(--font-mono);font-size:10px;
                letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-weight:400;">HH Rating</th>
              <th style="text-align:right;padding:8px 18px;font-family:var(--font-mono);font-size:10px;
                letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-weight:400;">HH Impressions</th>
              <th style="text-align:right;padding:8px 18px;font-family:var(--font-mono);font-size:10px;
                letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);font-weight:400;">P2+ Impressions</th>
            </tr>
          </thead>
          <tbody>
            ${segs.map(rowHTML).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 5 most recent games ───────────────────────────────────────
function renderTVRatingsRecentGames(gameDates, allRows) {
  const recent = [...gameDates].sort((a, b) => new Date(b) - new Date(a)).slice(0, 5);
  if (!recent.length) return '';

  const byDate = {};
  allRows.filter(r => r.segment === 'Game' && isRegularSeason(r)).forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = {};
    byDate[r.date][r.demo] = r;
  });

  const cards = recent.map(date => {
    const byDemo = byDate[date] || {};
    const hh  = byDemo['HH']  || {};
    const p2  = byDemo['P2+'] || {};
    const opp = Object.values(byDemo)[0]?.opponent || '—';
    return `
      <div style="background:var(--bg-elev);border:1px solid var(--border);
        border-radius:8px;padding:14px 16px;">
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;
          color:var(--text-muted);margin-bottom:2px;">${formatTVDate(date)}</div>
        <div style="font-size:18px;font-weight:700;font-family:var(--font-mono);letter-spacing:0.06em;
          color:var(--text);margin-bottom:10px;">vs ${opp}</div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">HH RTG</span>
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text);">${fmtRtg(hh.hhRtg || null)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">HH IMP</span>
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text);">${fmtImp(hh.hhImp || null)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">P2+ IMP</span>
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text);">${fmtImp(p2.imp || null)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
        color:var(--text-muted);margin-bottom:12px;">5 Most Recent Games</div>
      <div style="display:grid;grid-template-columns:repeat(${recent.length},1fr);gap:10px;">
        ${cards}
      </div>
    </div>
  `;
}

// ── Season line chart ─────────────────────────────────────────
function renderTVRatingsLineChart(season, priorSeason) {
  const cfgMap = {
    hhRtg: { label: 'HH Rating',       demo: 'HH',  key: 'hhRtg', fmtTip: v => v.toFixed(1) },
    p2Rtg: { label: 'P2+ Rating',      demo: 'P2+', key: 'rtg',   fmtTip: v => v.toFixed(1) },
    hhImp: { label: 'HH Impressions',  demo: 'HH',  key: 'hhImp', fmtTip: v => formatNum(Math.round(v)) },
    p2Imp: { label: 'P2+ Impressions', demo: 'P2+', key: 'imp',   fmtTip: v => formatNum(Math.round(v)) },
  };
  const cfg = cfgMap[tvRatingsChartMetric] || cfgMap.hhRtg;

  const buildPoints = (seasonStr) => {
    const dates = getTVRatingsGameDates(seasonStr); // already excludes preseason
    const rowsByDate = {};
    getTVRatingsRows(seasonStr)
      .filter(r => r.segment === 'Game' && r.demo === cfg.demo && isRegularSeason(r))
      .forEach(r => { rowsByDate[r.date] = r; });
    return dates.map((d, i) => ({
      i, date: d,
      opponent: rowsByDate[d] ? rowsByDate[d].opponent : '',
      val: rowsByDate[d] ? rowsByDate[d][cfg.key] : null,
    }));
  };

  const currPoints = buildPoints(season === 'all' ? null : season);
  if (!currPoints.length) return '<div style="padding:24px;color:var(--text-muted);font-size:13px;">No game data available for this season.</div>';

  const priorPoints = (tvRatingsYoY && priorSeason) ? buildPoints(priorSeason) : null;

  const allVals = [
    ...currPoints.map(p => p.val).filter(v => v !== null && v > 0),
    ...(priorPoints || []).map(p => p.val).filter(v => v !== null && v > 0),
  ];
  if (!allVals.length) return '<div style="padding:24px;color:var(--text-muted);font-size:13px;">No values available for this metric.</div>';

  const W = 1080, H = 260, padL = 52, padR = 24, padT = 16, padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = Math.max(...allVals) * 1.12;
  const minVal = 0;
  const nPts   = currPoints.length;

  const xScale = i  => padL + (nPts > 1 ? (i / (nPts - 1)) * plotW : plotW / 2);
  const yScale = v  => padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const buildPath = (points) => {
    let d = ''; let inPath = false;
    points.forEach(p => {
      if (!p.val || p.val <= 0) { inPath = false; return; }
      const x = xScale(p.i), y = yScale(p.val);
      if (!inPath) { d += `M${x.toFixed(1)},${y.toFixed(1)}`; inPath = true; }
      else          d += `L${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return d;
  };

  // Gridlines (4 steps)
  const gridLines = Array.from({length: 5}, (_, i) => {
    const v = minVal + (maxVal - minVal) * (i / 4);
    const label = cfg.key === 'hhRtg' || cfg.key === 'rtg' ? v.toFixed(1) : formatNum(Math.round(v));
    return { y: yScale(v), label };
  });

  // X-axis label interval — show ~8 labels max
  const labelInterval = Math.max(1, Math.ceil(nPts / 8));

  // Avg line
  const currVals = currPoints.map(p => p.val).filter(v => v !== null && v > 0);
  const avg = currVals.reduce((s, v) => s + v, 0) / currVals.length;
  const avgY = yScale(avg);
  const avgLabel = cfg.key === 'hhRtg' || cfg.key === 'rtg' ? avg.toFixed(1) : formatNum(Math.round(avg));

  // Align prior points to same game-number index as current (YoY overlay by game #)
  const priorAligned = priorPoints ? priorPoints.map((p, i) => ({
    ...p,
    i: i < nPts ? i : i,  // align by game number
  })).filter(p => p.i < nPts) : [];

  const dispSeason = season === 'all' ? 'All Seasons' : season;

  return `
    <div style="overflow-x:auto;">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;font-family:var(--font-mono);" role="img">
      <!-- gridlines -->
      ${gridLines.map(g => `
        <line x1="${padL}" y1="${g.y.toFixed(1)}" x2="${W - padR}" y2="${g.y.toFixed(1)}" stroke="var(--border-soft)" stroke-width="1"/>
        <text x="${padL - 6}" y="${(g.y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text-muted)">${g.label}</text>
      `).join('')}

      <!-- avg line -->
      <line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}"
        stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="${(W - padR + 4).toFixed(1)}" y="${(avgY + 3).toFixed(1)}" font-size="9" fill="var(--text-muted)">avg ${avgLabel}</text>

      ${priorAligned.length ? `
      <!-- prior season line -->
      <path d="${buildPath(priorAligned)}" fill="none" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.7"/>
      ${priorAligned.filter(p => p.val && p.val > 0 && p.i < nPts).map(p => {
        const x = xScale(p.i), y = yScale(p.val);
        const tip = `${priorSeason} · vs ${p.opponent} · Game ${p.i + 1} · ${cfg.label}: ${cfg.fmtTip(p.val)}`;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="var(--text-dim)" opacity="0.7"
          onmouseenter="showTooltip(event,'${tip.replace(/'/g,'&#39;')}')" onmouseleave="hideTooltip()"/>`;
      }).join('')}
      ` : ''}

      <!-- current season line -->
      <path d="${buildPath(currPoints)}" fill="none" stroke="var(--brand-red)" stroke-width="2.2"/>

      <!-- current season dots -->
      ${currPoints.filter(p => p.val && p.val > 0).map(p => {
        const x = xScale(p.i), y = yScale(p.val);
        const tip = `${dispSeason} · vs ${p.opponent} · ${formatTVDate(p.date)} · ${cfg.label}: ${cfg.fmtTip(p.val)}`;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--brand-red)" stroke="var(--bg)" stroke-width="1.5"
          style="cursor:default;"
          onmouseenter="showTooltip(event,'${tip.replace(/'/g,'&#39;')}')" onmouseleave="hideTooltip()"/>`;
      }).join('')}

      <!-- x-axis labels -->
      ${currPoints.filter((_, i) => i % labelInterval === 0 || i === nPts - 1).map(p => {
        const x = xScale(p.i);
        const lbl = formatTVDate(p.date);
        return `<text x="${x.toFixed(1)}" y="${(H - padB + 14).toFixed(1)}" text-anchor="middle" font-size="8" fill="var(--text-muted)"
          transform="rotate(-35 ${x.toFixed(1)},${(H - padB + 14).toFixed(1)})">${lbl}</text>`;
      }).join('')}

      <!-- axis line -->
      <line x1="${padL}" y1="${(padT + plotH).toFixed(1)}" x2="${W - padR}" y2="${(padT + plotH).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
    </svg>
    </div>

    ${priorAligned.length ? `
    <div style="display:flex;gap:16px;margin-top:8px;font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">
      <span><svg width="20" height="2" style="vertical-align:middle;"><line x1="0" y1="1" x2="20" y2="1" stroke="var(--brand-red)" stroke-width="2.5"/></svg> ${dispSeason}</span>
      <span><svg width="20" height="2" style="vertical-align:middle;"><line x1="0" y1="1" x2="20" y2="1" stroke="var(--text-dim)" stroke-width="2" stroke-dasharray="4,2"/></svg> ${priorSeason}</span>
    </div>
    ` : ''}
  `;
}

// ── Pre / Game / Post comparison ──────────────────────────────
function renderTVRatingsSegmentComparison(rows) {
  const segments = ['Pre Game', 'Game', 'Post Game'];
  const segLabels = { 'Pre Game': 'Pre-Game', 'Game': 'Game', 'Post Game': 'Post-Game' };

  // Gather avg HH Rtg and P2+ Rtg per segment
  const data = segments.map(seg => {
    const hhRows = rows.filter(r => r.segment === seg && r.demo === 'HH');
    const p2Rows = rows.filter(r => r.segment === seg && r.demo === 'P2+');
    return {
      seg,
      label:   segLabels[seg],
      avgHHRtg: avgTVMetric(hhRows, 'hhRtg'),
      avgP2Rtg: avgTVMetric(p2Rows, 'rtg'),
      avgHHImp: avgTVMetric(hhRows, 'hhImp'),
      avgP2Imp: avgTVMetric(p2Rows, 'imp'),
      count:    [...new Set(hhRows.map(r => r.date))].length,
    };
  }).filter(d => d.count > 0);

  if (!data.length) return '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No segment data available.</div>';

  const maxHH = Math.max(...data.map(d => d.avgHHRtg || 0));
  const maxP2 = Math.max(...data.map(d => d.avgP2Rtg || 0));

  const barRow = (d, metric, maxVal, color) => {
    const val = d[metric];
    if (!val) return '';
    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
    const fmt = val.toFixed(1);
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="width:80px;font-size:11px;font-family:var(--font-mono);color:var(--text-dim);text-align:right;flex-shrink:0;">${d.label}</div>
        <div style="flex:1;background:var(--bg-elev-2);border-radius:3px;height:18px;position:relative;overflow:hidden;">
          <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};border-radius:3px;opacity:0.85;transition:width 0.3s;"></div>
        </div>
        <div style="width:44px;font-size:11px;font-family:var(--font-mono);color:var(--text);text-align:right;flex-shrink:0;">${fmt}</div>
      </div>`;
  };

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
          HH Rating — Avg by Segment
        </div>
        ${data.map(d => barRow(d, 'avgHHRtg', maxHH, 'var(--brand-red)')).join('')}
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
          P2+ Rating — Avg by Segment
        </div>
        ${data.map(d => barRow(d, 'avgP2Rtg', maxP2, 'var(--brand-red)')).join('')}
      </div>
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-soft);">
      <table class="data-table" style="font-size:12px;">
        <thead><tr>
          <th style="text-align:left;">Segment</th>
          <th class="num">Games</th>
          <th class="num">Avg HH Rtg</th>
          <th class="num">Avg HH Imp</th>
          <th class="num">Avg P2+ Rtg</th>
          <th class="num">Avg P2+ Imp</th>
        </tr></thead>
        <tbody>
          ${data.map(d => `
            <tr>
              <td style="font-weight:500;">${d.label}</td>
              <td class="num">${d.count}</td>
              <td class="num">${fmtRtg(d.avgHHRtg)}</td>
              <td class="num">${fmtImp(d.avgHHImp)}</td>
              <td class="num">${fmtRtg(d.avgP2Rtg)}</td>
              <td class="num">${fmtImp(d.avgP2Imp)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Opponent table ────────────────────────────────────────────
function renderTVRatingsOpponentTable(season) {
  const gameRows = getTVRatingsRows(season).filter(r => r.segment === 'Game' && isRegularSeason(r));
  if (!gameRows.length) return '<div style="padding:16px;color:var(--text-muted);">No game data available.</div>';

  const opponents = [...new Set(gameRows.map(r => r.opponent).filter(Boolean))].sort();
  const rows = opponents.map(opp => {
    const hhRows = gameRows.filter(r => r.opponent === opp && r.demo === 'HH');
    const p2Rows = gameRows.filter(r => r.opponent === opp && r.demo === 'P2+');
    const games  = [...new Set(hhRows.map(r => r.date))].length;
    return {
      opponent:  opp,
      games,
      avgHHRtg:  avgTVMetric(hhRows, 'hhRtg'),
      avgHHImp:  avgTVMetric(hhRows, 'hhImp'),
      avgP2Rtg:  avgTVMetric(p2Rows, 'rtg'),
      avgP2Imp:  avgTVMetric(p2Rows, 'imp'),
      peakHHRtg: maxTVMetric(hhRows, 'hhRtg'),
      avgHHShr:  avgTVMetric(hhRows, 'hhShr'),
    };
  });

  const { key, dir } = tvRatingsOpponentSort;
  rows.sort((a, b) => {
    const av = a[key] ?? -Infinity, bv = b[key] ?? -Infinity;
    if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === 'asc' ? av - bv : bv - av;
  });

  const th = (label, sortKey, cls = '') => {
    const active = key === sortKey;
    const indicator = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="num ${cls}" style="cursor:pointer;white-space:nowrap;" data-tvrtg-oppsort="${sortKey}">${label}${indicator}</th>`;
  };

  return `
    <div style="overflow-x:auto;">
    <table class="data-table" id="tvrtg-opp-table">
      <thead><tr>
        <th style="text-align:left;cursor:pointer;" data-tvrtg-oppsort="opponent">Opponent ${key === 'opponent' ? (dir === 'asc' ? '▲' : '▼') : ''}</th>
        ${th('Games', 'games')}
        ${th('Avg HH Rtg', 'avgHHRtg')}
        ${th('Avg HH Imp', 'avgHHImp')}
        ${th('Avg P2+ Rtg', 'avgP2Rtg')}
        ${th('Avg P2+ Imp', 'avgP2Imp')}
        ${th('Peak HH Rtg', 'peakHHRtg')}
        ${th('Avg HH Shr', 'avgHHShr')}
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="font-weight:600;font-family:var(--font-mono);letter-spacing:0.05em;">${r.opponent}</td>
            <td class="num">${r.games}</td>
            <td class="num">${fmtRtg(r.avgHHRtg)}</td>
            <td class="num">${fmtImp(r.avgHHImp)}</td>
            <td class="num">${fmtRtg(r.avgP2Rtg)}</td>
            <td class="num">${fmtImp(r.avgP2Imp)}</td>
            <td class="num">${fmtRtg(r.peakHHRtg)}</td>
            <td class="num">${fmtShr(r.avgHHShr)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>
  `;
}

// ── Advertiser demo spotlight ─────────────────────────────────
// Shows only P18-49, M18-49, P25-54, M25-54 — comparable targeted demos.
// HH and P2+ are intentionally excluded: P2+ captures all viewers and HH
// captures all households, making them non-comparable to targeted age/gender cuts.
function renderTVRatingsAdDemoChart(gameRows) {
  const demoConfig = [
    { demo: 'P18-49', label: 'P18–49', color: 'var(--brand-red)' },
    { demo: 'M18-49', label: 'M18–49', color: 'var(--brand-red)' },
    { demo: 'P25-54', label: 'P25–54', color: 'var(--brand-red)' },
    { demo: 'M25-54', label: 'M25–54', color: 'var(--brand-red)' },
  ];

  const demoData = demoConfig.map(({ demo, label, color }) => {
    const rows = gameRows.filter(r => r.demo === demo);
    const avgRtg = avgTVMetric(rows, 'rtg');
    const avgImp = avgTVMetric(rows, 'imp');
    const gamesCount = [...new Set(rows.map(r => r.date))].length;
    return { demo, label, color, avgRtg, avgImp, gamesCount };
  }).filter(d => d.gamesCount > 0);

  if (!demoData.length) {
    return `<div style="padding:16px;color:var(--text-muted);font-size:13px;">
      No advertiser demo data available. Ensure the Nielsen file contains P18-49, M18-49, P25-54, and M25-54 rows.
    </div>`;
  }

  const maxRtg = Math.max(...demoData.map(d => d.avgRtg || 0));
  const maxImp = Math.max(...demoData.map(d => d.avgImp || 0));

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
          Avg Game Rating by Demo
        </div>
        ${demoData.map(d => {
          if (!d.avgRtg) return '';
          const pct = maxRtg > 0 ? (d.avgRtg / maxRtg) * 100 : 0;
          return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:56px;font-size:11px;font-family:var(--font-mono);color:var(--text-dim);text-align:right;flex-shrink:0;">${d.label}</div>
              <div style="flex:1;background:var(--bg-elev-2);border-radius:3px;height:20px;position:relative;overflow:hidden;">
                <div style="width:${pct.toFixed(1)}%;height:100%;background:${d.color};border-radius:3px;opacity:0.8;"></div>
              </div>
              <div style="width:36px;font-size:11px;font-family:var(--font-mono);color:var(--text);text-align:right;flex-shrink:0;">${fmtRtg(d.avgRtg)}</div>
            </div>`;
        }).join('')}
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
          Avg Game Impressions by Demo
        </div>
        ${demoData.map(d => {
          if (!d.avgImp) return '';
          const pct = maxImp > 0 ? (d.avgImp / maxImp) * 100 : 0;
          return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:56px;font-size:11px;font-family:var(--font-mono);color:var(--text-dim);text-align:right;flex-shrink:0;">${d.label}</div>
              <div style="flex:1;background:var(--bg-elev-2);border-radius:3px;height:20px;position:relative;overflow:hidden;">
                <div style="width:${pct.toFixed(1)}%;height:100%;background:${d.color};border-radius:3px;opacity:0.8;"></div>
              </div>
              <div style="width:52px;font-size:11px;font-family:var(--font-mono);color:var(--text);text-align:right;flex-shrink:0;">${fmtImp(d.avgImp)}</div>
            </div>`;
        }).join('')}
      </div>
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-soft);">
      <table class="data-table" style="font-size:12px;">
        <thead><tr>
          <th style="text-align:left;">Demo</th>
          <th class="num">Avg Rating</th>
          <th class="num">Avg Impressions</th>
          <th class="num">Avg Share</th>
          <th class="num">Games</th>
        </tr></thead>
        <tbody>
          ${demoData.map(d => {
            const rows = gameRows.filter(r => r.demo === d.demo);
            const avgShr = avgTVMetric(rows, 'shr');
            return `<tr>
              <td style="font-weight:500;font-family:var(--font-mono);">${d.label}</td>
              <td class="num">${fmtRtg(d.avgRtg)}</td>
              <td class="num">${fmtImp(d.avgImp)}</td>
              <td class="num">${fmtShr(avgShr)}</td>
              <td class="num">${d.gamesCount}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Game log table ────────────────────────────────────────────
function renderTVRatingsGamesTable(season) {
  const dates = getTVRatingsGameDates(season); // regular season only
  if (!dates.length) return '<div style="padding:16px;color:var(--text-muted);">No game data available.</div>';

  const allGameRows = getTVRatingsRows(season).filter(r => r.segment === 'Game' && isRegularSeason(r));
  const rowsByDate  = {};
  allGameRows.forEach(r => {
    if (!rowsByDate[r.date]) rowsByDate[r.date] = {};
    rowsByDate[r.date][r.demo] = r;
  });

  const games = dates.map(date => {
    const byDemo = rowsByDate[date] || {};
    const hh     = byDemo['HH']  || {};
    const p2     = byDemo['P2+'] || {};
    const first  = Object.values(byDemo)[0] || {};
    return {
      date, opponent: first.opponent || '', season: first.season || '',
      hhRtg: hh.hhRtg||0, hhImp: hh.hhImp||0, hhShr: hh.hhShr||0,
      p2Rtg: p2.rtg||0,   p2Imp: p2.imp||0,   p2Shr: p2.shr||0,
    };
  });

  const { key, dir } = tvRatingsGamesSort;
  games.sort((a, b) => {
    if (key === 'date') {
      const diff = new Date(a.date) - new Date(b.date);
      return dir === 'asc' ? diff : -diff;
    }
    return dir === 'asc' ? (a[key]||0) - (b[key]||0) : (b[key]||0) - (a[key]||0);
  });

  const th = (label, sortKey) => {
    const active = key === sortKey;
    const ind = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="num" style="cursor:pointer;white-space:nowrap;" data-tvrtg-gamessort="${sortKey}">${label}${ind}</th>`;
  };

  return `
    <div style="overflow-x:auto;">
    <table class="data-table" id="tvrtg-games-table">
      <thead><tr>
        <th style="text-align:left;cursor:pointer;white-space:nowrap;" data-tvrtg-gamessort="date">Date ${key === 'date' ? (dir === 'asc' ? '▲' : '▼') : ''}</th>
        <th style="text-align:left;">Opponent</th>
        ${season === 'all' ? '<th style="text-align:left;">Season</th>' : ''}
        ${th('HH Rating',    'hhRtg')}
        ${th('HH Imp',       'hhImp')}
        ${th('HH Share',     'hhShr')}
        ${th('P2+ Rating',   'p2Rtg')}
        ${th('P2+ Imp',      'p2Imp')}
        ${th('P2+ Share',    'p2Shr')}
      </tr></thead>
      <tbody>
        ${games.map(g => `
          <tr>
            <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap;">${formatTVDateFull(g.date)}</td>
            <td style="font-weight:600;font-family:var(--font-mono);letter-spacing:0.05em;">${g.opponent}</td>
            ${season === 'all' ? `<td style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);">${g.season}</td>` : ''}
            <td class="num">${fmtRtg(g.hhRtg  || null)}</td>
            <td class="num">${fmtImp(g.hhImp  || null)}</td>
            <td class="num">${fmtShr(g.hhShr  || null)}</td>
            <td class="num">${fmtRtg(g.p2Rtg  || null)}</td>
            <td class="num">${fmtImp(g.p2Imp  || null)}</td>
            <td class="num">${fmtShr(g.p2Shr  || null)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>
  `;
}

// ── Wiring ────────────────────────────────────────────────────
function wireTVRatingsPage() {
  // Season selector
  document.querySelectorAll('[data-tvrtg-season]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-tvrtg-season');
      tvRatingsSeasonFilter = val === 'all' ? 'all' : val;
      openTVRatingsPage();
    });
  });

  // Chart metric toggle
  document.querySelectorAll('[data-tvrtg-metric]').forEach(btn => {
    btn.addEventListener('click', () => {
      tvRatingsChartMetric = btn.getAttribute('data-tvrtg-metric');
      openTVRatingsPage();
    });
  });

  // YoY overlay toggle
  document.querySelectorAll('[data-tvrtg-yoy]').forEach(btn => {
    btn.addEventListener('click', () => {
      tvRatingsYoY = !tvRatingsYoY;
      openTVRatingsPage();
    });
  });

  // Opponent table sort
  document.querySelectorAll('[data-tvrtg-oppsort]').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.getAttribute('data-tvrtg-oppsort');
      if (tvRatingsOpponentSort.key === k) {
        tvRatingsOpponentSort.dir = tvRatingsOpponentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        tvRatingsOpponentSort = { key: k, dir: 'desc' };
      }
      openTVRatingsPage();
    });
  });

  // Games table sort
  document.querySelectorAll('[data-tvrtg-gamessort]').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.getAttribute('data-tvrtg-gamessort');
      if (tvRatingsGamesSort.key === k) {
        tvRatingsGamesSort.dir = tvRatingsGamesSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        tvRatingsGamesSort = { key: k, dir: k === 'date' ? 'desc' : 'desc' };
      }
      openTVRatingsPage();
    });
  });
}
