// SURVEY & PARTNER ROSTER HELPERS
// ============================================================

function parseSurveyPct(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).replace('%', '').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // handles both "44" (percent integer) and "0.44" (decimal)
  return n > 1 ? n / 100 : n;
}

function parseSurveyInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function normalizeSurveyRow(row) {
  const surveyRaw = String(row.Survey || row.survey || '').trim();
  // Parse "2023-24 Early" or "2023-24 Late"
  const m = surveyRaw.match(/^(20\d{2}-\d{2})\s+(Early|Late)$/i);
  const season = m ? normalizeSeasonLabel(m[1]) : normalizeSeasonLabel(surveyRaw.replace(/\s+(Early|Late)\s*$/i, '').trim());
  const phase  = m ? (m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase()) : '';
  const brand  = resolveCanonicalBrandName(String(row.Brand || row.brand || row.Partner || '').trim());

  return {
    Brand: brand,
    UnaidedRecall:     parseSurveyInt(row['Unaided Recall']),
    UnaidedRecallRank: parseSurveyInt(row['Unaided Recall Rank']),
    AidedRecall:       parseSurveyInt(row['Aided Recall']),
    AidedRecallRank:   parseSurveyInt(row['Aided Recall Rank']),
    // Local HQ column sometimes has a trailing space in headers
    LocalHQRecall:     parseSurveyInt(row['Local HQ Recall'] ?? row['Local HQ Recall '] ?? null),
    LocalHQRecallRank: parseSurveyInt(row['Local HQ Recall Rank'] ?? row['Local HQ Recall Rank '] ?? null),
    Date:   String(row.Date || '').trim(),
    Survey: surveyRaw,
    Season: season,
    Phase:  phase,
    TotalSurveyResponses: parseSurveyInt(row['Total Survey Responses']),
    UnaidedPct:  parseSurveyPct(row['UnAided Recall %'] ?? row['Unaided Recall %'] ?? null),
    AidedPct:    parseSurveyPct(row['Aided Recall %'] ?? null),
    LocalHQPct:  parseSurveyPct(row['Local HQ %'] ?? null),
  };
}

// Accessors
function getBrandSurveyData(brand, season = 'all', phase = 'all') {
  let rows = (DataStore.surveys || []).filter(r => r.Brand === brand);
  if (season !== 'all') rows = rows.filter(r => r.Season === season);
  if (phase  !== 'all') rows = rows.filter(r => r.Phase  === phase);
  return rows;
}

function getSurveySeasons() {
  return [...new Set((DataStore.surveys || []).map(r => r.Season).filter(Boolean))].sort();
}

function getSurveyBrandList() {
  return [...new Set((DataStore.surveys || []).map(r => r.Brand).filter(Boolean))].sort();
}

// Latest and prior survey waves for a brand + phase (for YoY)
function getSurveyLatestWave(brand, phase) {
  const rows = getBrandSurveyData(brand, 'all', phase);
  if (!rows.length) return null;
  return [...rows].sort((a, b) => b.Season.localeCompare(a.Season))[0];
}

function getSurveyPriorWave(brand, phase) {
  const rows = getBrandSurveyData(brand, 'all', phase);
  if (rows.length < 2) return null;
  return [...rows].sort((a, b) => b.Season.localeCompare(a.Season))[1];
}

// Chronological trend for a brand+phase
function getSurveyTrend(brand, phase) {
  return [...getBrandSurveyData(brand, 'all', phase)].sort((a, b) => a.Season.localeCompare(b.Season));
}

// Recall metric YoY — always same phase
function getSurveyMetricYoY(brand, phase, metric) {
  const latest = getSurveyLatestWave(brand, phase);
  const prior  = getSurveyPriorWave(brand, phase);
  if (!latest || !prior) return null;
  const curr = latest[metric], prev = prior[metric];
  if (curr === null || prev === null) return null;
  const change = typeof prev === 'number' && prev !== 0 ? (curr - prev) / Math.abs(prev) : null;
  return { change, curr, prev, currSeason: latest.Season, priorSeason: prior.Season };
}

// ---- Partner Roster ----
function getPartnerRoster() { return DataStore.partnerRoster || []; }

function isCurrentPartner(brand) {
  const roster = getPartnerRoster();
  if (!roster.length) return true; // no roster loaded = treat everyone as partner
  const canonical = resolveCanonicalBrandName(brand);
  return roster.some(r => resolveCanonicalBrandName(r.Account || r.account || '') === canonical);
}

function getPartnerCategory(brand) {
  const roster = getPartnerRoster();
  const canonical = resolveCanonicalBrandName(brand);
  const entry = roster.find(r => resolveCanonicalBrandName(r.Account || r.account || '') === canonical);
  return entry ? (entry.Category || entry.category || null) : null;
}

// ---- Survey SVG trend chart ----
function renderSurveyTrendChart(brand, phase) {
  const waves = getSurveyTrend(brand, phase);
  if (waves.length < 2) {
    return `<div style="padding:28px 0; text-align:center; color:var(--text-muted); font-size:13px;">
      Need at least two ${phase} survey waves to show a trend.
    </div>`;
  }

  const W = 900, H = 260;
  const pL = 58, pR = 20, pT = 22, pB = 46;
  const cW = W - pL - pR, cH = H - pT - pB;
  const xScale = i => pL + (i / Math.max(1, waves.length - 1)) * cW;
  const yScale = v => pT + (1 - Math.max(0, Math.min(1, v))) * cH;

  // Build grid and axes
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  let svg = `<svg class="survey-trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  yTicks.forEach(v => {
    const y = yScale(v);
    svg += `<line class="survey-trend-grid" x1="${pL}" x2="${W-pR}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="survey-trend-tick" x="${pL-6}" y="${y+4}" text-anchor="end">${Math.round(v*100)}%</text>`;
  });
  svg += `<line class="survey-trend-axis" x1="${pL}" x2="${pL}" y1="${pT}" y2="${H-pB}"/>`;
  svg += `<line class="survey-trend-axis" x1="${pL}" x2="${W-pR}" y1="${H-pB}" y2="${H-pB}"/>`;

  // X-axis season labels
  waves.forEach((w, i) => {
    const x = xScale(i);
    svg += `<text class="survey-trend-tick" x="${x}" y="${H-pB+16}" text-anchor="middle">${w.Season}</text>`;
  });

  // Lines — only draw if we have data points
  function buildPath(metric) {
    const pts = waves.map((w, i) => w[metric] !== null ? { x: xScale(i), y: yScale(w[metric]) } : null).filter(Boolean);
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  const dAided    = buildPath('AidedPct');
  const dUnaided  = buildPath('UnaidedPct');
  const dLocalHQ  = buildPath('LocalHQPct');
  if (dUnaided) svg += `<path class="survey-line-unaided" d="${dUnaided}"/>`;
  if (dLocalHQ) svg += `<path class="survey-line-localhq" d="${dLocalHQ}"/>`;
  if (dAided)   svg += `<path class="survey-line-aided"   d="${dAided}"/>`;

  // Interactive dots with embedded data attributes for hover. Each dot
  // also gets a small percentage label so AMs can read values without hovering.
  waves.forEach((w, i) => {
    const x = xScale(i);
    [['AidedPct','aided','var(--text)'],['UnaidedPct','unaided','var(--text-dim)'],['LocalHQPct','localhq','var(--positive)']].forEach(([metric, cls, color]) => {
      if (w[metric] === null) return;
      const y = yScale(w[metric]);
      const rank = cls === 'aided' ? w.AidedRecallRank : cls === 'unaided' ? w.UnaidedRecallRank : w.LocalHQRecallRank;
      const label = cls === 'aided' ? 'Aided' : cls === 'unaided' ? 'Unaided' : 'Local HQ';
      const pctLabel = Math.round(w[metric] * 100) + '%';
      svg += `<g class="survey-dot"
        data-season="${w.Season}" data-phase="${w.Phase}" data-metric="${label}"
        data-pct="${(w[metric]*100).toFixed(1)}" data-rank="${rank||'—'}"
        data-responses="${w.TotalSurveyResponses||'—'}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="1.5"/>
        <text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" text-anchor="middle"
          style="fill:${color};font-family:var(--font-mono);font-size:10px;font-weight:600;paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round;pointer-events:none;">${pctLabel}</text>
      </g>`;
    });
  });

  svg += `</svg>`;

  const hasLocalHQ = waves.some(w => w.LocalHQPct !== null);
  const legendItems = [
    `<span class="survey-legend-item"><span class="survey-legend-swatch"></span>Aided Recall</span>`,
    `<span class="survey-legend-item"><span class="survey-legend-swatch unaided"></span>Unaided Recall</span>`,
    hasLocalHQ ? `<span class="survey-legend-item"><span class="survey-legend-swatch localhq"></span>Local HQ</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="survey-trend-wrap" id="survey-trend-wrap-${brand.replace(/[^a-z0-9]/gi,'-').toLowerCase()}">
      ${svg}
      <div class="survey-legend">${legendItems}</div>
      <div class="quadrant-hover" id="survey-trend-hover" style="display:none;position:absolute;"></div>
    </div>`;
}

// ---- Survey section on partner pages ----
// Consolidated Survey Research rendering lives below the survey file accessors,
// so it can use Brand Awareness, GeneralSurvey_, Program_, and ModaDeltaDental_ helpers.

function renderSurveyWaveTable(brand) {
  const waves = [...(getBrandSurveyData(brand))].sort((a, b) => {
    const s = b.Season.localeCompare(a.Season);
    if (s !== 0) return s;
    return (b.Phase === 'Late' ? 1 : 0) - (a.Phase === 'Late' ? 1 : 0);
  });
  if (!waves.length) return '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No waves found.</div>';
  return `
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr>
        <th>Season</th><th>Phase</th><th>Date</th>
        <th class="num">Unaided %</th><th class="num">Unaided Rank</th>
        <th class="num">Aided %</th><th class="num">Aided Rank</th>
        <th class="num">Local HQ %</th><th class="num">Local HQ Rank</th>
        <th class="num">Respondents</th>
      </tr></thead>
      <tbody>
        ${waves.map(w => `<tr>
          <td>${w.Season}</td>
          <td><span class="phase-badge ${(w.Phase||'').toLowerCase()}">${w.Phase||'—'}</span></td>
          <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);">${w.Date||'—'}</td>
          <td class="num" style="font-weight:500;">${w.UnaidedPct !== null ? Math.round(w.UnaidedPct*100)+'%' : '—'}</td>
          <td class="num">${w.UnaidedRecallRank !== null ? '#'+w.UnaidedRecallRank : '—'}</td>
          <td class="num" style="font-weight:500;">${w.AidedPct !== null ? Math.round(w.AidedPct*100)+'%' : '—'}</td>
          <td class="num">${w.AidedRecallRank !== null ? '#'+w.AidedRecallRank : '—'}</td>
          <td class="num">${w.LocalHQPct !== null ? Math.round(w.LocalHQPct*100)+'%' : '—'}</td>
          <td class="num">${w.LocalHQRecallRank !== null ? '#'+w.LocalHQRecallRank : '—'}</td>
          <td class="num">${w.TotalSurveyResponses !== null ? formatNum(w.TotalSurveyResponses) : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
}

function wireSurveyTrendHovers() {
  const hover = document.getElementById('survey-trend-hover');
  if (!hover) return;
  document.querySelectorAll('.survey-dot').forEach(dot => {
    dot.addEventListener('mouseenter', (e) => {
      hover.style.display = 'block';
      hover.innerHTML = `
        <div class="hover-title">${dot.dataset.metric}</div>
        <div class="hover-row"><span>Season</span><span class="val">${dot.dataset.season} ${dot.dataset.phase}</span></div>
        <div class="hover-row"><span>Recall</span><span class="val">${dot.dataset.pct}%</span></div>
        <div class="hover-row"><span>Rank</span><span class="val">#${dot.dataset.rank}</span></div>
        <div class="hover-row"><span>Respondents</span><span class="val">${dot.dataset.responses}</span></div>
      `;
      hover.classList.add('visible');
    });
    dot.addEventListener('mousemove', (e) => {
      const wrap = hover.closest('.survey-trend-wrap') || hover.parentElement;
      const rect = (wrap || document.body).getBoundingClientRect();
      let x = e.clientX - rect.left + 10;
      let y = e.clientY - rect.top + 10;
      hover.style.left = x + 'px'; hover.style.top = y + 'px';
    });
    dot.addEventListener('mouseleave', () => { hover.classList.remove('visible'); hover.style.display = 'none'; });
  });
}

// ============================================================
// SURVEY PORTFOLIO PAGE — tabbed layout
// Tabs: Brand Awareness | Fan Insights | Programs & Community
// ============================================================
let surveyPortfolioTab = 'awareness'; // 'awareness' | 'insights' | 'programs'

// Tab state for Brand Awareness (formerly top-level state)
let surveyPortfolioPhase = 'Early';
let surveyPortfolioPartnersOnly = true;
let surveyPortfolioSortKey = 'unaidedRank';
let surveyPortfolioSortDir = 'asc';

// Tab state for Fan Insights
let surveyInsightsWave = '';        // currently selected wave key e.g. "2025-26 Early"
let surveyInsightsQuestion = '';    // currently selected question text

// Tab state for Programs
let surveyProgramsSubTab = 'Q4';    // 'Q4' (in-game) | 'Q41' (community)
let surveyProgramsWave = '';        // currently selected wave


function renderSurveyPortfolioPage(main) {
  const hasAwareness = (DataStore.surveys || []).length > 0;
  const hasInsights  = (DataStore.surveyGeneral || []).length > 0;
  const hasPrograms  = (DataStore.surveyPrograms || []).length > 0;
  if (!hasAwareness && !hasInsights && !hasPrograms) {
    main.innerHTML = `<div class="empty-state"><h1>No survey data loaded.</h1>
      <p>Upload a <code>Survey_</code>, <code>GeneralSurvey_</code>, or <code>Program_</code> file to populate this page. Moda / Delta Dental specific questions now live on their partner pages.</p></div>`;
    return;
  }

  const availableTabs = [
    hasAwareness ? 'awareness' : null,
    hasInsights ? 'insights' : null,
    hasPrograms ? 'programs' : null,
  ].filter(Boolean);
  if (!availableTabs.includes(surveyPortfolioTab)) surveyPortfolioTab = availableTabs[0];

  const TABS = [
    { key: 'awareness', label: '📊 Brand Awareness', enabled: hasAwareness },
    { key: 'insights',  label: '📋 Fan Insights',    enabled: hasInsights },
    { key: 'programs',  label: '🎯 Programs & Community', enabled: hasPrograms },
  ];

  const tabBarHtml = `
    <div class="survey-portfolio-tab-bar" style="display:flex;gap:4px;margin-bottom:24px;border-bottom:2px solid var(--border);padding-bottom:0;">
      ${TABS.map(t => `
        <button class="survey-portfolio-tab-btn${surveyPortfolioTab === t.key ? ' active' : ''}${!t.enabled ? ' disabled' : ''}"
          data-survey-tab="${t.key}" ${!t.enabled ? 'disabled' : ''}
          style="padding:10px 18px;background:none;border:none;border-bottom:${surveyPortfolioTab === t.key ? '2px solid var(--brand-red)' : '2px solid transparent'};
          margin-bottom:-2px;color:${surveyPortfolioTab === t.key ? 'var(--text)' : 'var(--text-muted)'};
          font-size:13px;font-weight:${surveyPortfolioTab === t.key ? '600' : '400'};cursor:${t.enabled ? 'pointer' : 'default'};
          opacity:${t.enabled ? 1 : 0.35};transition:color 0.15s,border-color 0.15s;">
          ${t.label}
        </button>`).join('')}
    </div>`;

  main.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">📊 Survey Research</h2>
        <span class="section-meta">Brand awareness · Fan insights · Programs</span>
      </div>
      ${tabBarHtml}
      <div id="survey-tab-content"></div>
    </section>`;

  // Wire tab buttons
  document.querySelectorAll('[data-survey-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyPortfolioTab = btn.dataset.surveyTab;
      renderSurveyPortfolioPage(main);
    });
  });

  // Render active tab
  const tabContent = document.getElementById('survey-tab-content');
  if (surveyPortfolioTab === 'awareness') renderBrandAwarenessTab(tabContent, main);
  else if (surveyPortfolioTab === 'insights') renderFanInsightsTab(tabContent, main);
  else if (surveyPortfolioTab === 'programs') renderProgramsTab(tabContent, main);
}

// ---- Tab: Brand Awareness (existing content, extracted verbatim) ----
function renderBrandAwarenessTab(container, main) {
  const seasons = getSurveySeasons();
  const latestSeason = seasons[seasons.length - 1] || null;
  if (!latestSeason) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:24px 0;">No brand awareness survey data loaded. Upload a <code>Survey_</code> file.</p>`;
    return;
  }

  const rows = (DataStore.surveys || []).filter(r => r.Phase === surveyPortfolioPhase && r.Season === latestSeason);
  let displayRows = surveyPortfolioPartnersOnly ? rows.filter(r => isCurrentPartner(r.Brand)) : rows;

  displayRows = [...displayRows].sort((a, b) => {
    let av, bv;
    if (surveyPortfolioSortKey === 'unaidedRank')     { av = a.UnaidedRecallRank ?? 9999; bv = b.UnaidedRecallRank ?? 9999; }
    else if (surveyPortfolioSortKey === 'aidedRank')  { av = a.AidedRecallRank   ?? 9999; bv = b.AidedRecallRank   ?? 9999; }
    else if (surveyPortfolioSortKey === 'unaidedPct') { av = -(a.UnaidedPct ?? -1);       bv = -(b.UnaidedPct ?? -1); }
    else if (surveyPortfolioSortKey === 'aidedPct')   { av = -(a.AidedPct   ?? -1);       bv = -(b.AidedPct   ?? -1); }
    else if (surveyPortfolioSortKey === 'localhqPct') { av = -(a.LocalHQPct ?? -1);       bv = -(b.LocalHQPct ?? -1); }
    else if (surveyPortfolioSortKey === 'brand')      { av = a.Brand; bv = b.Brand; return surveyPortfolioSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
    else { av = a.UnaidedRecallRank ?? 9999; bv = b.UnaidedRecallRank ?? 9999; }
    return surveyPortfolioSortDir === 'asc' ? av - bv : bv - av;
  });

  const rosterLoaded = getPartnerRoster().length > 0;
  const totalInWave = rows.length;
  const trendMetric = surveyPortfolioSortKey === 'aidedPct' || surveyPortfolioSortKey === 'aidedRank'
    ? 'AidedPct'
    : (surveyPortfolioSortKey === 'localhqPct' ? 'LocalHQPct' : 'UnaidedPct');
  const trendMetricLabel = trendMetric === 'AidedPct' ? 'Aided recall' : (trendMetric === 'LocalHQPct' ? 'Local HQ recall' : 'Unaided recall');
  const awarenessTrendBrands = displayRows.map(r => r.Brand);

  function sortTh(label, key, hint = '') {
    const active = surveyPortfolioSortKey === key;
    const dir = active ? (surveyPortfolioSortDir === 'asc' ? '▲' : '▼') : '↕';
    return `<th class="num sortable-survey-th" data-skey="${key}" title="${hint}" style="cursor:pointer;">${label} <span style="opacity:${active?1:0.4}">${dir}</span></th>`;
  }

  container.innerHTML = `
    <div class="survey-portfolio-controls">
      <div class="comparison-toggle">
        ${['Early','Late'].map(p => `<button class="${p === surveyPortfolioPhase ? 'active' : ''}" data-survey-portfolio-phase="${p}">${p}</button>`).join('')}
      </div>
      ${rosterLoaded ? `
        <label class="survey-partner-toggle">
          <input type="checkbox" id="surveyPartnersOnlyToggle" ${surveyPortfolioPartnersOnly ? 'checked' : ''}>
          Current partners only
        </label>
      ` : `<span class="comparison-basis">Load a Partners_ file to enable partner filter.</span>`}
      <span class="comparison-basis" style="margin-left:auto;">${displayRows.length} brand${displayRows.length === 1 ? '' : 's'} shown · ${latestSeason} ${surveyPortfolioPhase}</span>
    </div>
    <div class="card">
      <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th class="num">Row</th>
          <th class="sortable-survey-th" data-skey="brand" style="cursor:pointer;text-align:left;">Brand ${surveyPortfolioSortKey === 'brand' ? (surveyPortfolioSortDir === 'asc' ? '▲' : '▼') : '↕'}</th>
          ${sortTh('Unaided %',   'unaidedPct', 'Sort by unaided recall percentage')}
          ${sortTh('Unaided Rank','unaidedRank','Sort by unaided recall rank (lower = better)')}
          ${sortTh('Aided %',     'aidedPct',   'Sort by aided recall percentage')}
          ${sortTh('Aided Rank',  'aidedRank',  'Sort by aided recall rank (lower = better)')}
          ${sortTh('Local HQ %',  'localhqPct', 'Sort by local HQ recall percentage')}
          <th class="num">Unaided YoY</th>
          <th class="num">Aided YoY</th>
        </tr></thead>
        <tbody>
          ${displayRows.map((r, idx) => {
            const isPartner = isCurrentPartner(r.Brand);
            const uYoY = getSurveyMetricYoY(r.Brand, surveyPortfolioPhase, 'UnaidedPct');
            const aYoY = getSurveyMetricYoY(r.Brand, surveyPortfolioPhase, 'AidedPct');
            const fmtYoY = yoy => {
              if (!yoy || yoy.change === null) return '—';
              const cls = yoy.change >= 0 ? 'up' : 'down';
              return `<span class="yoy-change ${cls}">${yoy.change >= 0 ? '▲' : '▼'} ${Math.abs(yoy.change * 100).toFixed(1)}%</span>`;
            };
            return `<tr style="cursor:pointer;" onclick="selectBrandFromSurvey('${r.Brand.replace(/'/g,"\'")}')">
              <td class="num" style="color:var(--text-muted);">${idx + 1}</td>
              <td style="text-align:left;font-weight:500;">${r.Brand}${isPartner && rosterLoaded ? `<span class="brand-option-roster-dot" title="Current partner"></span>` : ''}</td>
              <td class="num" style="font-weight:500;">${r.UnaidedPct !== null ? Math.round(r.UnaidedPct*100)+'%' : '—'}</td>
              <td class="num">${r.UnaidedRecallRank !== null ? '#'+r.UnaidedRecallRank : '—'}</td>
              <td class="num" style="font-weight:500;">${r.AidedPct !== null ? Math.round(r.AidedPct*100)+'%' : '—'}</td>
              <td class="num">${r.AidedRecallRank !== null ? '#'+r.AidedRecallRank : '—'}</td>
              <td class="num">${r.LocalHQPct !== null ? Math.round(r.LocalHQPct*100)+'%' : '—'}</td>
              <td class="num">${fmtYoY(uYoY)}</td>
              <td class="num">${fmtYoY(aYoY)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
    <div class="card survey-chart-card">
      <div class="card-header">
        <div>
          <span class="card-title">${trendMetricLabel} trend</span>
          <span class="card-sub">Select up to 8 brands from the current table subset · hover points for instant detail · expand for a larger view</span>
        </div>
      </div>
      ${renderSurveyMultiTrendChart({
        title: `${trendMetricLabel} over time`,
        subtitle: `${surveyPortfolioPhase} waves · current table subset`,
        valueType: 'percent',
        yMax: 1,
        emptyMessage: 'Add more Survey_ waves to compare partner survey trends over time.',
        series: buildAwarenessPortfolioTrendSeries(awarenessTrendBrands, surveyPortfolioPhase, trendMetric),
      })}
    </div>`;

  document.querySelectorAll('[data-survey-portfolio-phase]').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyPortfolioPhase = btn.dataset.surveyPortfolioPhase;
      renderBrandAwarenessTab(container, main);
    });
  });

  const tog = document.getElementById('surveyPartnersOnlyToggle');
  if (tog) tog.addEventListener('change', () => {
    surveyPortfolioPartnersOnly = tog.checked;
    renderBrandAwarenessTab(container, main);
  });

  document.querySelectorAll('.sortable-survey-th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.skey;
      if (surveyPortfolioSortKey === key) {
        surveyPortfolioSortDir = surveyPortfolioSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        surveyPortfolioSortKey = key;
        surveyPortfolioSortDir = 'asc';
      }
      renderBrandAwarenessTab(container, main);
    });
  });
}

function selectBrandFromSurvey(brand) {
  currentBrand = brand;
  currentPage = 'brand';
  currentPeriod = null;
  openSections = {};
  const search = document.getElementById('brandSearch');
  if (search) search.value = brand;
  renderApp();
  updateBrandDropdown('');
}



// ============================================================
// GENERAL SURVEY (File 1 — GeneralSurvey_) — normalization & accessors
// ============================================================

// IMPORTANT: The source CSV column "Answer Count" is misleadingly named.
// It actually contains the answer option label text (e.g., "Coca-Cola"),
// NOT a numeric count. Frequency (the numeric respondent count) is a
// separate column. This comment exists so future maintainers don't get
// confused by the source column name. We map it to AnswerOption below.
function normalizeGeneralSurveyRow(row) {
  const surveyRaw = String(row.Survey || '').trim();
  const m = surveyRaw.match(/^(20\d{2}-\d{2})\s+(Early|Late)$/i);
  const season = m ? normalizeSeasonLabel(m[1]) : normalizeSeasonLabel(surveyRaw.replace(/\s+(Early|Late)\s*$/i,'').trim());
  const phase  = m ? (m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase()) : '';

  // "Answer Count" column is the answer option label — see comment above
  const answerOption = String(row['Answer Count'] || '').trim();

  return {
    Question:       String(row.Question || '').trim(),
    AnswerOption:   answerOption,   // source col: "Answer Count" — label text, not a count
    Frequency:      parseSurveyInt(row.Frequency),
    Percentage:     parseSurveyPct(row.Percentage),
    Rank:           parseSurveyInt(row.Rank),
    Survey:         surveyRaw,
    Season:         season,
    Phase:          phase,
    Sheet:          String(row.Sheet || '').trim(),
    Date:           String(row.Date || '').trim(),
    TotalResponses: parseSurveyInt(row['Responses '] ?? row['Responses'] ?? null),
    _partner:       null, // populated by applyGeneralSurveyAssignmentRules()
  };
}

// Applies stored assignment rules to set _partner on each row.
// Called after ingestion and after any rule is saved in the review modal.
function applyGeneralSurveyAssignmentRules(rows) {
  const target = rows || DataStore.surveyGeneral;
  const rules = DataStore.surveyGeneralAssignmentRules || {};
  target.forEach(r => {
    if (rules[r.AnswerOption] !== undefined) {
      r._partner = rules[r.AnswerOption] || null;
    } else {
      // Auto-extract from answer option text if no explicit rule
      r._partner = autoExtractPartnerFromText(r.AnswerOption);
    }
  });
}

// Attempts to identify a canonical partner name from a text string.
// Used for both answer options (File 1) and presented-by extraction (File 3).
// Checks "presented by X" pattern first, then tries prefix-matching
// against the full brand alias list.
function getSurveyAutoMatchCandidates() {
  const candidates = new Map();
  function add(alias, canonical) {
    const a = String(alias || '').trim();
    const c = resolveCanonicalBrandName(canonical || alias);
    if (!a || !c || compactBrandToken(a).length < 3) return;
    candidates.set(a, c);
  }
  (DataStore.getBrandList ? DataStore.getBrandList() : []).forEach(brand => add(brand, brand));
  Object.entries(getBrandMergeRules()).forEach(([alias, canonical]) => {
    add(alias, canonical);
    add(canonical, canonical);
  });
  getPartnerRoster().forEach(row => {
    const brand = normalizePartnerName(row.Brand || row.Partner || row.Account || row.Name);
    if (brand) add(brand, brand);
  });
  return [...candidates.entries()]
    .map(([alias, canonical]) => ({ alias, canonical, compact: compactBrandToken(alias) }))
    .sort((a, b) => b.compact.length - a.compact.length || b.alias.length - a.alias.length);
}

function hasSurveyAliasTextMatch(clean, alias) {
  const cleanNorm = ' ' + String(clean || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  const aliasNorm = String(alias || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!aliasNorm) return false;
  if (cleanNorm.includes(' ' + aliasNorm + ' ')) return true;
  const compactAlias = compactBrandToken(alias);
  if (compactAlias.length < 5) return false;
  return compactBrandToken(clean).includes(compactAlias);
}

// Attempts to identify a canonical partner name from a text string.
// Used for both answer options (File 1) and presented-by extraction (File 3).
// Checks explicit presenter language first, then does longest-alias matching
// against loaded partners plus default/custom brand aliases.
function autoExtractPartnerFromText(text) {
  if (!text) return null;
  const clean = String(text).trim();
  const normalizedClean = clean.replace(/[–—]/g, '-').replace(/\s+/g, ' ');

  // "presented by [Brand]" / "brought to you by [Brand]" / "sponsored by [Brand]" patterns.
  const presMatch = normalizedClean.match(/(?:presented|sponsored|powered|brought to you)\s+by\s+(.+?)(?:\s*[-|•:].*)?$/i);
  if (presMatch) {
    const raw = presMatch[1].trim();
    const candidates = getSurveyAutoMatchCandidates();
    const matched = candidates.find(c => hasSurveyAliasTextMatch(raw, c.alias));
    if (matched) return matched.canonical;
    const resolved = resolveCanonicalBrandName(raw);
    return resolved || raw;
  }

  // Whole-string alias match first.
  const full = resolveCanonicalBrandName(normalizedClean);
  if (full && full !== normalizedClean) return full;

  // Longest alias / canonical partner match anywhere in the answer text. This catches
  // entries like "Delta Dental Smile Cam", "Moda Assist Program", "McDonald's 100 Point Play",
  // and answer options where the partner is not the first token.
  const matched = getSurveyAutoMatchCandidates().find(c => hasSurveyAliasTextMatch(normalizedClean, c.alias));
  return matched ? matched.canonical : null;
}

function getGeneralSurveyQuestions() {
  return [...new Set((DataStore.surveyGeneral || []).map(r => r.Question).filter(Boolean))];
}

function getGeneralSurveyWaves() {
  return [...new Set((DataStore.surveyGeneral || []).map(r => r.Survey).filter(Boolean))].sort();
}

// Returns all answer options for a given question + wave, sorted by Frequency desc
function getGeneralSurveyOptions(question, wave) {
  let rows = (DataStore.surveyGeneral || []).filter(r => r.Question === question);
  if (wave) rows = rows.filter(r => r.Survey === wave);
  // Deduplicate by AnswerOption within the same wave (Early+Late appear separately)
  const seen = new Set();
  return rows.filter(r => {
    const key = r.AnswerOption + '||' + r.Survey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
}

// Returns all general survey rows where _partner matches the given brand
function getGeneralSurveyForBrand(brand) {
  return (DataStore.surveyGeneral || []).filter(r => r._partner === brand);
}

// ============================================================
// PARTNER SURVEY (File 2 — ModaDeltaDental_) — normalization & accessors
// ============================================================

// Top-2 box response sets by question type
const TOP2_BOX_FAMILIARITY  = ['very familiar', 'extremely familiar'];
const TOP2_BOX_LIKELIHOOD   = ['likely', 'extremely likely'];
const TOP2_BOX_AGREEMENT    = ['agree', 'strongly agree'];
const TOP2_BOX_RECOMMEND    = ['likely', 'extremely likely'];
const TOP2_BOX_VALUE        = ['very valuable', 'extremely valuable'];

function getTop2BoxSet(question) {
  const q = (question || '').toLowerCase();
  if (q.includes('familiar'))   return TOP2_BOX_FAMILIARITY;
  if (q.includes('recommend'))  return TOP2_BOX_RECOMMEND;
  if (q.includes('likelihood') || q.includes('likely') || q.includes('consider')) return TOP2_BOX_LIKELIHOOD;
  if (q.includes('valuable') || q.includes('value'))  return TOP2_BOX_VALUE;
  if (q.includes('agree') || q.includes('member') || q.includes('community')) return TOP2_BOX_AGREEMENT;
  return [];
}

// Determines which partner owns a question by scanning question text.
// Uses text matching rather than Q_ numbers to stay robust if numbers change.
function detectPartnerFromQuestion(questionText) {
  const q = (questionText || '').toLowerCase();
  if (q.includes('delta dental')) return 'Delta Dental';
  if (q.includes('moda assist') || q.includes('moda health') || q.includes('moda is') || q.includes('moda ')) return 'Moda Health';
  return null;
}

function normalizePartnerSurveyRow(row) {
  const surveyRaw = String(row.Survey || '').trim();
  const m = surveyRaw.match(/^(20\d{2}-\d{2})\s+(Early|Late)$/i);
  const season = m ? normalizeSeasonLabel(m[1]) : normalizeSeasonLabel(surveyRaw.replace(/\s+(Early|Late)\s*$/i,'').trim());
  const phase  = m ? (m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase()) : '';

  const question = String(row.Question || '').trim();
  const response = String(row.Response || '').trim();
  const partner  = detectPartnerFromQuestion(question);

  const isYesNo = ['yes','no'].includes(response.toLowerCase()) ||
                  (question.toLowerCase().includes('do you currently'));
  const isYes   = response.toLowerCase() === 'yes';
  const top2Set = getTop2BoxSet(question);
  const isTopBox = top2Set.includes(response.toLowerCase());

  return {
    Question:       question,
    QuestionKey:    String(row.Q_ || row['Q_'] || '').trim(),
    Response:       response,
    Frequency:      parseSurveyInt(row.Frequency),
    Percentage:     parseSurveyPct(row.Percentage),
    Survey:         surveyRaw,
    Season:         season,
    Phase:          phase,
    Date:           String(row.Date || '').trim(),
    TotalResponses: parseSurveyInt(row.Responses ?? null),
    Partner:        partner,
    IsTopBox:       isTopBox,
    IsYesNo:        isYesNo,
    IsYes:          isYes,
  };
}

function getPartnerSurveyData(brand) {
  return (DataStore.surveyPartner || []).filter(r => r.Partner === brand);
}

function getPartnerSurveyQuestions(brand) {
  const rows = getPartnerSurveyData(brand);
  return [...new Set(rows.map(r => r.Question).filter(Boolean))];
}

function getPartnerSurveyWaves(brand) {
  const rows = getPartnerSurveyData(brand);
  return [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
}

// Computes top-2 box % for a given question + wave, or % Yes for yes/no questions.
// Returns a value 0–1 (or null if no data).
function getPartnerSurveyTopBoxPct(brand, question, wave) {
  const rows = (DataStore.surveyPartner || []).filter(r =>
    r.Partner === brand && r.Question === question && r.Survey === wave
  );
  if (!rows.length) return null;
  const total = rows[0].TotalResponses || rows.reduce((s, r) => s + (r.Frequency || 0), 0);
  if (!total) return null;

  const isYN = rows[0].IsYesNo;
  const relevant = rows.filter(r => isYN ? r.IsYes : r.IsTopBox);
  const freqSum = relevant.reduce((s, r) => s + (r.Frequency || 0), 0);
  return total > 0 ? freqSum / total : null;
}

// Returns chronological trend for a question: [{Survey, Season, Phase, pct}]
function getPartnerSurveyTrend(brand, question, phase) {
  const waves = getPartnerSurveyWaves(brand)
    .filter(w => !phase || w.includes(phase));
  return waves.map(wave => {
    const waveRows = (DataStore.surveyPartner || []).filter(r =>
      r.Partner === brand && r.Question === question && r.Survey === wave
    );
    const season = waveRows[0]?.Season || '';
    const wPhase = waveRows[0]?.Phase  || '';
    const pct    = getPartnerSurveyTopBoxPct(brand, question, wave);
    return { Survey: wave, Season: season, Phase: wPhase, pct };
  });
}

// ============================================================
// PROGRAMS SURVEY (File 3 — Program_) — normalization & accessors
// ============================================================

function extractCoreProgramName(programName) {
  if (!programName) return '';
  return String(programName).replace(/\s+presented by .+$/i, '').trim();
}

function extractProgramSponsor(programName) {
  if (!programName) return null;
  const clean = String(programName).trim();

  // "presented by [Brand]" — highest confidence
  const presMatch = clean.match(/presented by (.+)$/i);
  if (presMatch) {
    const raw = presMatch[1].trim();
    const resolved = resolveCanonicalBrandName(raw);
    return resolved || raw;
  }

  // Try prefix matching using brand alias list (covers "McDonald's 100 Point Play",
  // "Delta Dental Smile Cam", "ULTRA Courtside", "Moda Assist Program", etc.)
  const rules = getBrandMergeRules();
  const words = clean.split(/\s+/);
  for (let n = Math.min(words.length, 5); n >= 1; n--) {
    const candidate = words.slice(0, n).join(' ');
    // Check direct alias match
    if (rules[candidate]) return rules[candidate];
    // Check compact token match
    const compacted = compactBrandToken(candidate);
    const match = Object.entries(rules).find(([alias]) => compactBrandToken(alias) === compacted);
    if (match) return match[1];
    // Try resolveCanonicalBrandName for full resolution
    const resolved = resolveCanonicalBrandName(candidate);
    if (resolved && resolved !== candidate) return resolved;
  }
  return null;
}

function normalizeProgramSurveyRow(row) {
  const surveyRaw = String(row.Survey || '').trim();
  const m = surveyRaw.match(/^(20\d{2}-\d{2})\s+(Early|Late)$/i);
  const season = m ? normalizeSeasonLabel(m[1]) : normalizeSeasonLabel(surveyRaw.replace(/\s+(Early|Late)\s*$/i,'').trim());
  const phase  = m ? (m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase()) : '';

  const programName = String(row.Brand || '').trim();
  const questionKey = String(row.Q || '').trim();
  const questionLabel = questionKey === 'Q41' ? 'Community Programs' : 'In-Game Programs';

  return {
    ProgramName:      programName,
    CoreName:         extractCoreProgramName(programName),
    Sponsor:          extractProgramSponsor(programName),
    Frequency:        parseSurveyInt(row.Frequency),
    AnswerPercentage: parseSurveyPct(row['Answer Percentage'] ?? null),
    QuestionKey:      questionKey,
    QuestionLabel:    questionLabel,
    Survey:           surveyRaw,
    Season:           season,
    Phase:            phase,
    Date:             String(row.Date || '').trim(),
    Sheet:            String(row.sheet || row.Sheet || '').trim(),
    TotalResponses:   parseSurveyInt(row.Responses ?? null),
  };
}

function getProgramsForSponsor(brand) {
  return (DataStore.surveyPrograms || []).filter(r => r.Sponsor === brand);
}

// Returns all unique programs grouped by CoreName, with full wave history.
// Shape: [{ coreName, questionKey, questionLabel, waves: [{Survey, Season, Phase, Sponsor, ProgramName, Frequency, AnswerPercentage}] }]
function getAllProgramsGrouped(questionKey) {
  const source = (DataStore.surveyPrograms || []).filter(r => !questionKey || r.QuestionKey === questionKey);
  const grouped = new Map();
  source.forEach(r => {
    const key = r.CoreName + '||' + r.QuestionKey;
    if (!grouped.has(key)) {
      grouped.set(key, { coreName: r.CoreName, questionKey: r.QuestionKey, questionLabel: r.QuestionLabel, waves: [] });
    }
    grouped.get(key).waves.push({
      Survey: r.Survey, Season: r.Season, Phase: r.Phase,
      Sponsor: r.Sponsor, ProgramName: r.ProgramName,
      Frequency: r.Frequency, AnswerPercentage: r.AnswerPercentage,
    });
  });
  // Sort waves chronologically within each program
  grouped.forEach(g => g.waves.sort((a, b) => a.Survey.localeCompare(b.Survey)));
  return [...grouped.values()];
}

// Returns unique sorted wave list for programs data
function getProgramWaves() {
  return [...new Set((DataStore.surveyPrograms || []).map(r => r.Survey).filter(Boolean))].sort();
}

// ============================================================
// FAN INSIGHTS TAB — portfolio overview for GeneralSurvey_ data
// ============================================================
function renderFanInsightsTab(container, main) {
  const questions = getGeneralSurveyQuestions();
  const allWaves  = getGeneralSurveyWaves();

  if (!questions.length) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:24px 0;">No Fan Insights data loaded. Upload a file starting with <code>GeneralSurvey_</code>.</p>`;
    return;
  }

  if (!surveyInsightsWave || !allWaves.includes(surveyInsightsWave)) {
    surveyInsightsWave = allWaves[allWaves.length - 1] || '';
  }
  if (!surveyInsightsQuestion || !questions.includes(surveyInsightsQuestion)) {
    surveyInsightsQuestion = questions[0] || '';
  }

  const selectedRows = (DataStore.surveyGeneral || []).filter(r => r.Question === surveyInsightsQuestion);
  const waveRows = selectedRows.filter(r => r.Survey === surveyInsightsWave)
    .sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
  const totalResp = waveRows[0]?.TotalResponses || null;
  const partnerLinked = waveRows.filter(r => !!r._partner).length;
  const trendSeries = buildGeneralQuestionTrendSeries(surveyInsightsQuestion, null, null);

  const controlsHtml = `
    <div class="survey-portfolio-controls" style="align-items:flex-end;gap:14px;">
      <label style="display:flex;flex-direction:column;gap:6px;min-width:320px;flex:1;">
        <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.07em;">Question</span>
        <select id="surveyInsightsQuestionSelect" style="background:var(--bg-elev-2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:8px 10px;font-size:12px;">
          ${questions.map(q => `<option value="${escapeHTML(q)}" ${q === surveyInsightsQuestion ? 'selected' : ''}>${escapeHTML(q)}</option>`).join('')}
        </select>
      </label>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Table wave</div>
        <div class="comparison-toggle" style="flex-wrap:wrap;">
          ${allWaves.map(w => `<button class="${w === surveyInsightsWave ? 'active' : ''}" data-insights-wave="${w}">${w}</button>`).join('')}
        </div>
      </div>
    </div>`;

  const kpis = renderSurveyKpiCards([
    { label: 'Questions loaded', value: questions.length, sub: 'Fan insights prompts' },
    { label: 'Selected wave', value: surveyInsightsWave || '—', sub: totalResp ? formatNum(totalResp) + ' respondents' : 'Respondent base pending' },
    { label: 'Answer options', value: waveRows.length, sub: partnerLinked ? partnerLinked + ' linked to partners' : 'No partner links in wave' },
  ]);

  const tableHtml = waveRows.length ? `
    <div class="card">
      <div class="card-header">
        <div>
          <span class="card-title">Answer option table</span>
          <span class="card-sub">Clean text table for ${escapeHTML(surveyInsightsWave)}</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table survey-text-table">
          <thead><tr>
            <th class="num">Rank</th>
            <th style="text-align:left;">Answer option</th>
            <th style="text-align:left;">Linked partner</th>
            <th class="num">Responses</th>
            <th class="num">%</th>
            <th class="num">Respondents</th>
          </tr></thead>
          <tbody>
            ${waveRows.map((r, idx) => `
              <tr>
                <td class="num">${idx + 1}</td>
                <td style="text-align:left;font-weight:500;">${escapeHTML(r.AnswerOption)}</td>
                <td style="text-align:left;color:var(--text-muted);">${r._partner ? escapeHTML(r._partner) : '—'}</td>
                <td class="num">${r.Frequency !== null ? formatNum(r.Frequency) : '—'}</td>
                <td class="num">${formatSurveyPctValue(r.Percentage !== null ? r.Percentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null))}</td>
                <td class="num">${r.TotalResponses ? formatNum(r.TotalResponses) : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `<p style="color:var(--text-muted);padding:16px 0;">No answer options for this wave.</p>`;

  container.innerHTML = `
    ${controlsHtml}
    ${kpis}
    ${tableHtml}
    <div class="card survey-chart-card">
      <div class="card-header">
        <div>
          <span class="card-title">Answer option trend</span>
          <span class="card-sub">Select up to 8 answer options · hover points for instant detail · expand for a larger view</span>
        </div>
      </div>
      ${renderSurveyMultiTrendChart({
        title: 'Fan Insights trend',
        subtitle: surveyInsightsQuestion,
        valueType: 'percent',
        yMax: 1,
        emptyMessage: 'Fan Insights trend scaffolding is ready. Add future GeneralSurvey_ waves and this chart will populate automatically.',
        series: trendSeries,
      })}
    </div>
  `;

  container.querySelectorAll('[data-insights-wave]').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyInsightsWave = btn.dataset.insightsWave;
      renderFanInsightsTab(container, main);
    });
  });
  const questionSelect = container.querySelector('#surveyInsightsQuestionSelect');
  if (questionSelect) questionSelect.addEventListener('change', () => {
    surveyInsightsQuestion = questionSelect.value;
    renderFanInsightsTab(container, main);
  });
}

// ============================================================
// PROGRAMS TAB — portfolio overview for Program_ data
// ============================================================
function renderProgramsTab(container, main) {
  const allWaves = getProgramWaves();

  if (!allWaves.length) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:24px 0;">No program data loaded. Upload a file starting with <code>Program_</code>.</p>`;
    return;
  }

  if (!surveyProgramsWave || !allWaves.includes(surveyProgramsWave)) {
    surveyProgramsWave = allWaves[allWaves.length - 1] || '';
  }

  const subTabs = [
    { key: 'Q4',  label: '🎮 In-Game Programs' },
    { key: 'Q41', label: '🤝 Community Programs' },
  ];

  const waveRows = (DataStore.surveyPrograms || []).filter(r =>
    r.QuestionKey === surveyProgramsSubTab && r.Survey === surveyProgramsWave
  );
  const programRows = waveRows.filter(r => r.ProgramName !== 'None of these')
    .sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
  const noneRow = waveRows.find(r => r.ProgramName === 'None of these');
  const totalResp = programRows[0]?.TotalResponses || noneRow?.TotalResponses || null;
  const latestTop = programRows[0] || null;
  const trendSeries = buildProgramTrendSeries(surveyProgramsSubTab, null, null);

  const subTabHtml = `
    <div style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;">
      ${subTabs.map(t => `
        <button data-programs-subtab="${t.key}"
          style="padding:7px 16px;background:${surveyProgramsSubTab===t.key?'var(--bg-elev-2)':'none'};
          border:1px solid ${surveyProgramsSubTab===t.key?'var(--border)':'transparent'};border-radius:5px;
          font-size:12px;font-weight:${surveyProgramsSubTab===t.key?'600':'400'};
          color:${surveyProgramsSubTab===t.key?'var(--text)':'var(--text-muted)'};cursor:pointer;">
          ${t.label}
        </button>`).join('')}
    </div>`;

  const waveSelectHtml = `
    <div class="survey-portfolio-controls" style="align-items:center;">
      <div>
        <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Table wave</span>
        <div class="comparison-toggle" style="flex-wrap:wrap;">
          ${allWaves.map(w => `<button class="${w===surveyProgramsWave?'active':''}" data-programs-wave="${w}">${w}</button>`).join('')}
        </div>
      </div>
    </div>`;

  const avgPct = programRows.length
    ? programRows.reduce((sum, r) => sum + (r.AnswerPercentage !== null ? r.AnswerPercentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : 0)), 0) / programRows.length
    : null;

  const kpis = renderSurveyKpiCards([
    { label: 'Programs shown', value: programRows.length, sub: subTabs.find(t => t.key === surveyProgramsSubTab)?.label.replace(/^\S+\s/, '') || 'Programs' },
    { label: 'Top program', value: latestTop ? Math.round(((latestTop.AnswerPercentage !== null ? latestTop.AnswerPercentage : (latestTop.TotalResponses && latestTop.Frequency ? latestTop.Frequency / latestTop.TotalResponses : null)) || 0) * 100) + '%' : '—', sub: latestTop ? latestTop.CoreName : 'No ranked program' },
    { label: 'Average awareness', value: avgPct !== null ? Math.round(avgPct * 100) + '%' : '—', sub: surveyProgramsWave || 'No wave selected' },
    { label: 'Respondents', value: totalResp ? formatNum(totalResp) : '—', sub: 'Current table wave' },
  ]);

  const tableRows = programRows.map((r, idx) => {
    const pct = r.AnswerPercentage !== null ? r.AnswerPercentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null);
    const prior = getPriorProgramWaveRow(r.CoreName, r.QuestionKey, r.Survey);
    const priorPct = prior ? (prior.AnswerPercentage !== null ? prior.AnswerPercentage : (prior.TotalResponses && prior.Frequency ? prior.Frequency / prior.TotalResponses : null)) : null;
    const change = (pct !== null && priorPct !== null) ? surveyPctChangeFromValues(pct, priorPct) : null;
    const waveCount = (DataStore.surveyPrograms || []).filter(x => x.CoreName === r.CoreName && x.QuestionKey === r.QuestionKey).length;
    return `
      <tr>
        <td class="num" style="color:var(--text-muted);">${idx + 1}</td>
        <td style="text-align:left;">
          <div style="font-weight:500;font-size:12px;">${escapeHTML(r.CoreName)}</div>
          <div style="font-size:11px;color:var(--text-muted);">${r.Sponsor ? escapeHTML(r.Sponsor) : 'No sponsor'}</div>
        </td>
        <td class="num">${r.Frequency !== null ? formatNum(r.Frequency) : '—'}</td>
        <td class="num" style="font-weight:600;">${formatSurveyPctValue(pct)}</td>
        <td class="num">${change !== null ? formatSurveyPctChangeHTML(change) : '—'}</td>
        <td class="num">${waveCount}</td>
      </tr>`;
  }).join('');

  const noneHtml = noneRow && noneRow.Frequency
    ? `<div class="leaderboard-note" style="margin-top:12px;">
        <strong>None of these:</strong> ${formatNum(noneRow.Frequency)} respondents
        ${noneRow.TotalResponses ? `(${Math.round(noneRow.Frequency / noneRow.TotalResponses * 100)}% had no awareness of any program)` : ''}
      </div>` : '';

  const tableHtml = programRows.length ? `
    <div class="card">
      <div class="card-header">
        <div>
          <span class="card-title">Program awareness table</span>
          <span class="card-sub">Text-first view for ${escapeHTML(surveyProgramsWave)}</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table survey-text-table">
          <thead><tr>
            <th class="num">#</th>
            <th style="text-align:left;">Program</th>
            <th class="num">Responses</th>
            <th class="num">Awareness %</th>
            <th class="num">Prior wave</th>
            <th class="num">Waves</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${noneHtml}
    </div>` : `<p style="color:var(--text-muted);padding:16px 0;">No program data for this wave.</p>`;

  container.innerHTML = `
    ${subTabHtml}
    ${waveSelectHtml}
    ${kpis}
    ${tableHtml}
    <div class="card survey-chart-card">
      <div class="card-header">
        <div>
          <span class="card-title">Program awareness trend</span>
          <span class="card-sub">Select up to 8 programs · hover points for instant detail · expand for a larger view</span>
        </div>
      </div>
      ${renderSurveyMultiTrendChart({
        title: 'Programs & Community trend',
        subtitle: subTabs.find(t => t.key === surveyProgramsSubTab)?.label || '',
        valueType: 'percent',
        yMax: 1,
        emptyMessage: 'Add more Program_ survey waves and this trend will show movement over time.',
        series: trendSeries,
      })}
    </div>`;

  container.querySelectorAll('[data-programs-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyProgramsSubTab = btn.dataset.programsSubtab;
      renderProgramsTab(container, main);
    });
  });
  container.querySelectorAll('[data-programs-wave]').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyProgramsWave = btn.dataset.programsWave;
      renderProgramsTab(container, main);
    });
  });
}

// ============================================================
// PARTNER PAGE SURVEY RESEARCH — general survey dropdown + partner-specific dropdown
// ============================================================
function hasSurveyResearchDataForBrand(brand) {
  return !!(
    getBrandSurveyData(brand).length ||
    getGeneralSurveyForBrand(brand).length ||
    getProgramsForSponsor(brand).length ||
    getPartnerSurveyData(brand).length
  );
}

function sortSurveyPhases(phases) {
  return [...new Set((phases || []).filter(Boolean))]
    .sort((a, b) => (a === 'Early' ? -1 : a === 'Late' ? 1 : 0) - (b === 'Early' ? -1 : b === 'Late' ? 1 : 0));
}

function getSurveyResearchPhasesForBrand(brand) {
  return sortSurveyPhases([
    ...getBrandSurveyData(brand).map(r => r.Phase),
    ...getGeneralSurveyForBrand(brand).map(r => r.Phase),
    ...getProgramsForSponsor(brand).map(r => r.Phase),
  ]);
}

function getPartnerSpecificSurveyPhasesForBrand(brand) {
  return sortSurveyPhases(getPartnerSurveyData(brand).map(r => r.Phase));
}

function hasGeneralSurveyResearchDataForBrand(brand) {
  return getBrandSurveyData(brand).length > 0 || getGeneralSurveyForBrand(brand).length > 0 || getProgramsForSponsor(brand).length > 0;
}

function renderSurveyTimingToggle(phases, activePhase, attrName, label) {
  return phases.length ?
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">' +
      '<span style="font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);">Survey timing</span>' +
      '<div class="comparison-toggle">' +
        phases.map(p => '<button class="' + (p === activePhase ? 'active' : '') + '" ' + attrName + '="' + escapeHTML(p) + '">' + escapeHTML(p) + '</button>').join('') +
      '</div>' +
      '<span class="comparison-basis">' + escapeHTML(label || 'Charts and tables below are filtered to the selected wave timing.') + '</span>' +
    '</div>' : '';
}

function renderSurveySection(brand) {
  const slot = document.getElementById('survey-slot');
  if (!slot) return;
  if (!hasSurveyResearchDataForBrand(brand)) return;

  const generalHtml = renderGeneralSurveyResearchSection(brand);
  const partnerHtml = renderPartnerSpecificSurveyDropdown(brand);
  slot.innerHTML = generalHtml + partnerHtml;

  slot.querySelectorAll('[data-survey-phase]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSurveyPhase = btn.dataset.surveyPhase;
      renderSurveySection(brand);
    });
  });
  slot.querySelectorAll('[data-partner-survey-phase]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPartnerSurveyPhase = btn.dataset.partnerSurveyPhase;
      renderSurveySection(brand);
    });
  });
  wireSectionToggles();
}

function renderGeneralSurveyResearchSection(brand) {
  if (!hasGeneralSurveyResearchDataForBrand(brand)) return '';

  const phases = getSurveyResearchPhasesForBrand(brand);
  if (phases.length && !phases.includes(currentSurveyPhase)) currentSurveyPhase = phases[0];

  const sectionId = 'section-survey';
  const isOpen = !!openSections[sectionId];

  const latestAwareness = getSurveyLatestWave(brand, currentSurveyPhase) || getSurveyLatestWave(brand, 'all');
  const summaryHTML = latestAwareness ?
    '<div class="section-summary-stat"><span class="label">Unaided</span><span class="value">' + (latestAwareness.UnaidedPct !== null ? Math.round(latestAwareness.UnaidedPct * 100) + '%' : '—') + '</span></div>' +
    '<div class="section-summary-stat"><span class="label">Aided</span><span class="value">' + (latestAwareness.AidedPct !== null ? Math.round(latestAwareness.AidedPct * 100) + '%' : '—') + '</span></div>' +
    '<div class="section-summary-stat"><span class="label">Local HQ</span><span class="value">' + (latestAwareness.LocalHQPct !== null ? Math.round(latestAwareness.LocalHQPct * 100) + '%' : '—') + '</span></div>'
    : '<span class="section-summary-empty">survey detail inside</span>';

  const phaseToggle = renderSurveyTimingToggle(
    phases,
    currentSurveyPhase,
    'data-survey-phase',
    'Charts and tables below are filtered to ' + (currentSurveyPhase || 'all') + ' waves.'
  );

  return '<section class="section collapsible ' + (isOpen ? 'open' : '') + '" id="' + sectionId + '">' +
      '<button class="section-toggle" type="button" data-section-toggle="' + sectionId + '">' +
        '<svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>' +
        '<div>' +
          '<div class="section-title">Survey Research</div>' +
          '<div class="section-meta" style="margin-top:2px;">Brand awareness · Fan insights · Programs &amp; Community</div>' +
        '</div>' +
        '<div class="section-toggle-meta">' + summaryHTML + '</div>' +
      '</button>' +
      '<div class="section-body">' +
        phaseToggle +
        renderPartnerAwarenessResearchBlock(brand, currentSurveyPhase) +
        renderPartnerProgramsResearchBlock(brand, currentSurveyPhase) +
        renderPartnerFanInsightsResearchBlock(brand, currentSurveyPhase) +
      '</div>' +
    '</section>';
}

function renderPartnerSpecificSurveyDropdown(brand) {
  const allRows = getPartnerSurveyData(brand);
  if (!allRows.length) return '';

  const phases = getPartnerSpecificSurveyPhasesForBrand(brand);
  if (phases.length && !phases.includes(currentPartnerSurveyPhase)) currentPartnerSurveyPhase = phases[0];
  const phase = currentPartnerSurveyPhase;
  const rows = allRows.filter(r => !phase || r.Phase === phase);
  const sectionId = 'section-partner-specific-survey';
  const isOpen = !!openSections[sectionId];
  const latestWave = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort().pop();
  const latestRows = rows.filter(r => r.Survey === latestWave);
  const summaryQuestions = [...new Set(rows.map(r => r.Question).filter(Boolean))].length;
  const summaryHTML = latestWave ?
    '<div class="section-summary-stat"><span class="label">Questions</span><span class="value">' + formatNum(summaryQuestions) + '</span></div>' +
    '<div class="section-summary-stat"><span class="label">Latest</span><span class="value">' + escapeHTML(latestWave) + '</span></div>' +
    '<div class="section-summary-stat"><span class="label">Rows</span><span class="value">' + formatNum(latestRows.length) + '</span></div>'
    : '<span class="section-summary-empty">partner-specific survey detail inside</span>';
  const phaseToggle = renderSurveyTimingToggle(
    phases,
    phase,
    'data-partner-survey-phase',
    'Partner-specific charts and tables are filtered to ' + (phase || 'all') + ' waves.'
  );

  return '<section class="section collapsible ' + (isOpen ? 'open' : '') + '" id="' + sectionId + '">' +
      '<button class="section-toggle" type="button" data-section-toggle="' + sectionId + '">' +
        '<svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>' +
        '<div>' +
          '<div class="section-title">' + escapeHTML(brand) + ' Specific Survey Questions</div>' +
          '<div class="section-meta" style="margin-top:2px;">Moda / Delta Dental question battery · grouped response trends · full wave history</div>' +
        '</div>' +
        '<div class="section-toggle-meta">' + summaryHTML + '</div>' +
      '</button>' +
      '<div class="section-body">' +
        phaseToggle +
        renderPartnerSpecificResearchBlock(brand, phase) +
      '</div>' +
    '</section>';
}

function renderPartnerAwarenessResearchBlock(brand, phase) {
  const allRows = getBrandSurveyData(brand);
  if (!allRows.length) return '';
  const latest = getSurveyLatestWave(brand, phase);
  if (!latest) return `<div class="card" style="margin-bottom:16px;"><div class="leaderboard-note">Brand Awareness data exists for ${escapeHTML(brand)}, but not for the selected ${escapeHTML(phase)} wave timing.</div></div>`;

  // YoY badge: same phase one year prior (Early→Early, Late→Late). Matches TV signage treatment.
  const yoyLine = (yoyData) => yoyData
    ? { cls: getSurveyChangeClass(yoyData.change), text: formatSurveyPctChangeText(yoyData.change) + ' YoY' }
    : { cls: 'neutral', text: '— YoY' };
  const unaidedYoY = getSurveyMetricYoY(brand, phase, 'UnaidedPct');
  const aidedYoY   = getSurveyMetricYoY(brand, phase, 'AidedPct');
  const localYoY   = getSurveyMetricYoY(brand, phase, 'LocalHQPct');

  const kpis = renderSurveyKpiCards([
    { label: 'Unaided recall',  value: latest.UnaidedPct !== null ? Math.round(latest.UnaidedPct * 100) + '%' : '—',
      subLines: [latest.UnaidedRecallRank ? '#' + latest.UnaidedRecallRank + ' rank' : latest.Survey, yoyLine(unaidedYoY)] },
    { label: 'Aided recall',    value: latest.AidedPct !== null ? Math.round(latest.AidedPct * 100) + '%' : '—',
      subLines: [latest.AidedRecallRank ? '#' + latest.AidedRecallRank + ' rank' : latest.Survey, yoyLine(aidedYoY)] },
    { label: 'Local HQ recall', value: latest.LocalHQPct !== null ? Math.round(latest.LocalHQPct * 100) + '%' : '—',
      subLines: [latest.LocalHQRecallRank ? '#' + latest.LocalHQRecallRank + ' rank' : 'Local association', yoyLine(localYoY)] },
    { label: 'Respondents',     value: latest.TotalSurveyResponses ? formatNum(latest.TotalSurveyResponses) : '—', sub: latest.Survey },
  ]);

  return `
    <div class="survey-research-subsection">
      <div class="survey-subsection-heading">
        <div>
          <h3>Brand Awareness</h3>
          <p>Recall and local association, filtered to ${escapeHTML(phase)} waves.</p>
        </div>
      </div>
      ${kpis}
      <div class="card survey-chart-card">
        <div class="card-header"><div><span class="card-title">Recall trend</span><span class="card-sub">Click chart to expand</span></div></div>
        ${renderAwarenessTrendChart(brand, phase)}
      </div>
      <div class="card">
        <div class="card-header"><div><span class="card-title">Full wave history</span><span class="card-sub">Brand Awareness survey rows</span></div></div>
        ${renderSurveyWaveTable(brand)}
      </div>
    </div>`;
}

function renderPartnerProgramsResearchBlock(brand, phase) {
  const rows = getProgramsForSponsor(brand).filter(r => !phase || r.Phase === phase);
  if (!rows.length) return '';
  const sections = ['Q4', 'Q41'].map(qKey => {
    const qRows = rows.filter(r => r.QuestionKey === qKey && r.ProgramName !== 'None of these');
    if (!qRows.length) return '';
    const waves = [...new Set(qRows.map(r => r.Survey).filter(Boolean))].sort();
    const latestWave = waves[waves.length - 1];
    const latestRows = qRows.filter(r => r.Survey === latestWave).sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
    const top = latestRows[0] || null;
    const avgPct = latestRows.length ? latestRows.reduce((sum, r) => sum + (r.AnswerPercentage !== null ? r.AnswerPercentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : 0)), 0) / latestRows.length : null;
    const label = qKey === 'Q41' ? 'Community Programs' : 'In-Game Programs';
    const kpis = renderSurveyKpiCards([
      { label: 'Programs', value: [...new Set(qRows.map(r => r.CoreName))].length, sub: label },
      { label: 'Latest top program', value: top ? formatSurveyPctValue(top.AnswerPercentage !== null ? top.AnswerPercentage : (top.TotalResponses && top.Frequency ? top.Frequency / top.TotalResponses : null)) : '—', sub: top ? top.CoreName : latestWave || 'No latest wave' },
      { label: 'Average latest awareness', value: avgPct !== null ? Math.round(avgPct * 100) + '%' : '—', sub: latestWave || 'No wave' },
    ]);

    return `
      <div class="card survey-chart-card">
        <div class="card-header"><div><span class="card-title">${label}</span><span class="card-sub">Top sponsored program trends · click chart to expand</span></div></div>
        ${kpis}
        ${renderSurveyMultiTrendChart({
          title: `${brand} ${label} trend`,
          subtitle: `${phase || 'All'} waves`,
          valueType: 'percent',
          yMax: 1,
          emptyMessage: 'Program trend structure is ready. Add additional Program_ waves to see year-over-year movement.',
          series: buildProgramTrendSeries(qKey, brand, null, phase),
        })}
        ${renderProgramHistoryTable(qRows)}
      </div>`;
  }).join('');

  return sections ? `
    <div class="survey-research-subsection">
      <div class="survey-subsection-heading">
        <div><h3>Programs & Community</h3><p>Sponsored program awareness from Program_ files.</p></div>
      </div>
      ${sections}
    </div>` : '';
}

function renderPartnerFanInsightsResearchBlock(brand, phase) {
  const rows = getGeneralSurveyForBrand(brand).filter(r => !phase || r.Phase === phase);
  if (!rows.length) return '';
  const byQuestion = new Map();
  rows.forEach(r => {
    if (!byQuestion.has(r.Question)) byQuestion.set(r.Question, []);
    byQuestion.get(r.Question).push(r);
  });

  const questionCards = [...byQuestion.entries()].map(([question, qRows]) => {
    const waves = [...new Set(qRows.map(r => r.Survey).filter(Boolean))].sort();
    const latestWave = waves[waves.length - 1];
    const latestRows = qRows.filter(r => r.Survey === latestWave).sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
    const top = latestRows[0] || null;
    const kpis = renderSurveyKpiCards([
      { label: 'Latest mention', value: top ? formatSurveyPctValue(top.Percentage !== null ? top.Percentage : (top.TotalResponses && top.Frequency ? top.Frequency / top.TotalResponses : null)) : '—', sub: top ? top.AnswerOption : latestWave || 'No wave' },
      { label: 'Answer options', value: [...new Set(qRows.map(r => r.AnswerOption))].length, sub: 'Linked to this partner' },
      { label: 'Waves', value: waves.length, sub: phase || 'All wave timing' },
    ]);
    return `
      <div class="card survey-chart-card">
        <div class="card-header"><div><span class="card-title">${escapeHTML(question)}</span><span class="card-sub">Fan Insights trend · click chart to expand</span></div></div>
        ${kpis}
        ${renderSurveyMultiTrendChart({
          title: `${brand} Fan Insights trend`,
          subtitle: question,
          valueType: 'percent',
          yMax: 1,
          emptyMessage: 'Fan Insights has been structured for future YoY waves. Additional GeneralSurvey_ uploads will populate this trend.',
          series: buildGeneralQuestionTrendSeries(question, brand, null, phase),
        })}
        ${renderGeneralHistoryTable(qRows)}
      </div>`;
  }).join('');

  return `
    <div class="survey-research-subsection">
      <div class="survey-subsection-heading">
        <div><h3>Fan Insights</h3><p>General survey answer options that mention or have been assigned to ${escapeHTML(brand)}.</p></div>
      </div>
      ${questionCards}
    </div>`;
}

function renderPartnerSpecificResearchBlock(brand, phase) {
  const rows = getPartnerSurveyData(brand).filter(r => !phase || r.Phase === phase);
  if (!rows.length) return '';
  const questions = [...new Set(rows.map(r => r.Question).filter(Boolean))];
  return `
    <div class="survey-research-subsection">
      <div class="survey-subsection-heading">
        <div><h3>${escapeHTML(brand)} Specific Questions</h3><p>Moda / Delta Dental survey questions using grouped response trend lines and full history text tables.</p></div>
      </div>
      ${questions.map(q => renderPartnerSpecificQuestionCard(brand, q, phase)).join('')}
    </div>`;
}

function renderPartnerSpecificQuestionCard(brand, question, phase) {
  const rows = getPartnerSurveyData(brand).filter(r => r.Question === question && (!phase || r.Phase === phase));
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const latestWave = waves[waves.length - 1];
  const latestRows = rows.filter(r => r.Survey === latestWave);
  const groupedLatest = getPartnerSpecificQuestionLatestGroups(brand, question, phase);
  const groupedKpis = groupedLatest.length ? groupedLatest.map(group => ({
    label: group.label,
    value: formatSurveyPctValue(group.value),
    subLines: [
      latestWave || 'Latest wave',
      group.surveyDeltaFrom ? formatSurveyKpiChangeLine(group.surveyPctChange, 'vs prior survey') : { cls: 'neutral', text: 'Vs prior survey: —' },
      group.yoyDeltaFrom ? formatSurveyKpiChangeLine(group.yoyPctChange, 'YoY same timing') : { cls: 'neutral', text: 'YoY same timing: —' },
    ],
  })) : [];
  const fallbackKpis = !groupedKpis.length ? getTop3ResponsesForPartnerQuestion(brand, question, phase).map((response, idx) => {
    const r = latestRows.find(x => x.Response === response);
    const pct = r ? (r.Percentage !== null ? r.Percentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null)) : null;
    return { label: `Top ${idx + 1} response`, value: formatSurveyPctValue(pct), sub: response || '—' };
  }) : [];
  const kpis = renderSurveyKpiCards([
    { label: 'Latest wave', value: latestWave || '—', sub: phase || 'All wave timing' },
    ...(groupedKpis.length ? groupedKpis : fallbackKpis),
  ].slice(0, 4));
  const trendSubhead = groupedKpis.length
    ? 'Grouped response trend · positive, middle, and negative lines · click chart to expand'
    : 'Top-three response trend · click chart to expand';

  return `
    <div class="card survey-chart-card">
      <div class="card-header"><div><span class="card-title">${escapeHTML(question)}</span><span class="card-sub">${trendSubhead}</span></div></div>
      ${kpis}
      ${renderSurveyMultiTrendChart({
        title: `${brand} specific question trend`,
        subtitle: groupedKpis.length ? 'Grouped positive, middle, and negative response buckets' : question,
        valueType: 'percent',
        yMax: 1,
        maxVisible: 3,
        emptyMessage: 'This chart will become more useful as additional ModaDeltaDental_ waves are loaded.',
        series: buildPartnerSpecificQuestionSeries(brand, question, phase),
      })}
      ${renderPartnerSpecificHistoryTable(rows)}
    </div>`;
}

function renderAwarenessTrendChart(brand, phase) {
  const rows = getBrandSurveyData(brand).filter(r => !phase || r.Phase === phase).sort((a, b) => a.Survey.localeCompare(b.Survey));
  const series = [
    { label: 'Unaided recall', points: rows.map(r => ({ label: r.Survey, value: r.UnaidedPct })) },
    { label: 'Aided recall', points: rows.map(r => ({ label: r.Survey, value: r.AidedPct })) },
    { label: 'Local HQ recall', points: rows.map(r => ({ label: r.Survey, value: r.LocalHQPct })) },
  ];
  return renderSurveyMultiTrendChart({
    title: `${brand} recall trend`,
    subtitle: `${phase || 'All'} waves`,
    valueType: 'percent',
    yMax: 1,
    emptyMessage: 'Add more Survey_ waves to see recall movement over time.',
    series,
  });
}

function renderSurveyKpiCards(cards) {
  const renderLine = line => {
    if (line && typeof line === 'object') {
      const cls = line.cls || 'neutral';
      if (line.html) return `<span class="kpi-change ${cls}">${line.html}</span>`;
      return `<span class="kpi-change ${cls}">${escapeHTML(String(line.text || ''))}</span>`;
    }
    return `<span class="kpi-change neutral">${escapeHTML(String(line || ''))}</span>`;
  };
  return `<div class="kpi-grid survey-kpi-grid">
    ${cards.map(card => {
      const lines = Array.isArray(card.subLines) && card.subLines.length ? card.subLines : [card.sub || 'Latest wave'];
      return `
      <div class="kpi">
        <span class="kpi-label">${escapeHTML(String(card.label || ''))}</span>
        <span class="kpi-value">${escapeHTML(String(card.value ?? '—'))}</span>
        ${lines.map(renderLine).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

function formatSurveyPctValue(v) {
  return v !== null && v !== undefined && !Number.isNaN(v) ? Math.round(v * 100) + '%' : '—';
}

function surveyPctChangeFromValues(curr, prev) {
  if (curr === null || curr === undefined || prev === null || prev === undefined || Number.isNaN(curr) || Number.isNaN(prev) || !isFinite(curr) || !isFinite(prev) || prev === 0) return null;
  return (curr - prev) / prev;
}

function surveyPctChangeFromDelta(curr, delta) {
  if (curr === null || curr === undefined || delta === null || delta === undefined || Number.isNaN(curr) || Number.isNaN(delta)) return null;
  return surveyPctChangeFromValues(curr, curr - delta);
}

function getSurveyChangeClass(change) {
  if (change === null || change === undefined || Number.isNaN(change) || !isFinite(change)) return 'neutral';
  if (change > 0.0005) return 'up';
  if (change < -0.0005) return 'down';
  return 'neutral';
}

function formatSurveyPctChangeText(change) {
  if (change === null || change === undefined || Number.isNaN(change) || !isFinite(change)) return '—';
  const arrow = change > 0.0005 ? '▲' : change < -0.0005 ? '▼' : '•';
  const sign = change > 0.0005 ? '+' : change < -0.0005 ? '-' : '';
  return `${arrow} ${sign}${Math.abs(change * 100).toFixed(1)}%`;
}

function formatSurveyPctChangeHTML(change, suffix = '') {
  const cls = getSurveyChangeClass(change);
  return `<span class="yoy-change ${cls}">${formatSurveyPctChangeText(change)}${suffix ? ' ' + escapeHTML(suffix) : ''}</span>`;
}

function formatSurveyKpiChangeLine(change, label) {
  return {
    cls: getSurveyChangeClass(change),
    text: `${formatSurveyPctChangeText(change)} ${label}`,
  };
}

function formatPointChange(v) {
  return formatSurveyPctChangeText(v);
}

function formatSurveyComparisonDelta(v, prefix = '', currentValue = null) {
  const change = currentValue !== null && currentValue !== undefined
    ? surveyPctChangeFromDelta(currentValue, v)
    : surveyPctChangeFromDelta(1, v);
  const text = formatSurveyPctChangeText(change);
  return prefix ? prefix + ': ' + text : text;
}

function getSurveyPointPhase(label) {
  const match = String(label || '').match(/\b(Early|Late)\b/i);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() : '';
}

function enrichSurveySeriesPointChanges(series) {
  return (series || []).map(s => {
    const points = (s.points || []).map(p => ({ ...p }));
    const valid = points
      .filter(p => p.value !== null && p.value !== undefined && !Number.isNaN(p.value))
      .sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    valid.forEach((pt, idx) => {
      const current = points.find(p => p.label === pt.label);
      if (!current) return;
      const priorSurvey = idx > 0 ? valid[idx - 1] : null;
      const phase = getSurveyPointPhase(pt.label);
      const priorSamePhase = phase
        ? [...valid.slice(0, idx)].reverse().find(p => getSurveyPointPhase(p.label) === phase)
        : null;
      current.surveyDelta = priorSurvey ? pt.value - priorSurvey.value : null;
      current.surveyPctChange = priorSurvey ? surveyPctChangeFromValues(pt.value, priorSurvey.value) : null;
      current.surveyDeltaFrom = priorSurvey ? priorSurvey.label : '';
      current.yoyDelta = priorSamePhase ? pt.value - priorSamePhase.value : null;
      current.yoyPctChange = priorSamePhase ? surveyPctChangeFromValues(pt.value, priorSamePhase.value) : null;
      current.yoyDeltaFrom = priorSamePhase ? priorSamePhase.label : '';
      current.phase = phase;
    });
    return { ...s, points };
  });
}

function getPartnerSpecificRowValue(row) {
  if (!row) return null;
  return row.Percentage !== null ? row.Percentage : (row.TotalResponses && row.Frequency ? row.Frequency / row.TotalResponses : null);
}

function getPartnerSpecificRowComparison(row, mode = 'survey') {
  if (!row || !row.Partner || !row.Question || !row.Response || !row.Survey) return null;
  const currentValue = getPartnerSpecificRowValue(row);
  if (currentValue === null || currentValue === undefined || Number.isNaN(currentValue)) return null;
  const candidates = getPartnerSurveyData(row.Partner)
    .filter(r => r.Question === row.Question && r.Response === row.Response && r.Survey && r.Survey < row.Survey)
    .sort((a, b) => b.Survey.localeCompare(a.Survey));
  const prior = mode === 'yoy'
    ? candidates.find(r => r.Phase && row.Phase && r.Phase === row.Phase)
    : candidates[0];
  const priorValue = getPartnerSpecificRowValue(prior);
  if (!prior || priorValue === null || priorValue === undefined || Number.isNaN(priorValue)) return null;
  return { delta: currentValue - priorValue, pctChange: surveyPctChangeFromValues(currentValue, priorValue), priorWave: prior.Survey };
}

function getPriorProgramWaveRow(coreName, questionKey, wave) {
  const rows = (DataStore.surveyPrograms || [])
    .filter(r => r.CoreName === coreName && r.QuestionKey === questionKey && r.Survey < wave)
    .sort((a, b) => b.Survey.localeCompare(a.Survey));
  return rows[0] || null;
}

function buildAwarenessPortfolioTrendSeries(brands, phase, metric = 'UnaidedPct') {
  const uniqueBrands = [...new Set((brands || []).filter(Boolean))];
  return uniqueBrands.map(brand => {
    const rows = getBrandSurveyData(brand)
      .filter(r => !phase || r.Phase === phase)
      .sort((a, b) => a.Survey.localeCompare(b.Survey));
    return {
      label: brand,
      points: rows.map(r => ({ label: r.Survey, value: r[metric] !== undefined ? r[metric] : null })),
    };
  });
}

function buildProgramTrendSeries(questionKey, sponsor = null, limit = 8, phase = null) {
  let rows = (DataStore.surveyPrograms || []).filter(r => r.QuestionKey === questionKey && r.ProgramName !== 'None of these');
  if (sponsor) rows = rows.filter(r => r.Sponsor === sponsor);
  if (phase) rows = rows.filter(r => r.Phase === phase);
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const latestWave = waves[waves.length - 1];
  const latestRows = rows.filter(r => r.Survey === latestWave)
    .sort((a, b) => ((b.AnswerPercentage ?? 0) - (a.AnswerPercentage ?? 0)) || ((b.Frequency || 0) - (a.Frequency || 0)))
    .slice(0, limit === null ? undefined : limit);
  const names = [...new Set(latestRows.map(r => r.CoreName))];
  return names.map(name => ({
    label: name,
    points: waves.map(w => {
      const match = rows.find(r => r.CoreName === name && r.Survey === w);
      const value = match ? (match.AnswerPercentage !== null ? match.AnswerPercentage : (match.TotalResponses && match.Frequency ? match.Frequency / match.TotalResponses : null)) : null;
      return { label: w, value };
    }),
  }));
}

function buildGeneralQuestionTrendSeries(question, partner = null, limit = 8, phase = null) {
  let rows = (DataStore.surveyGeneral || []).filter(r => r.Question === question);
  if (partner) rows = rows.filter(r => r._partner === partner);
  if (phase) rows = rows.filter(r => r.Phase === phase);
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const latestWave = waves[waves.length - 1];
  const latestRows = rows.filter(r => r.Survey === latestWave)
    .sort((a, b) => ((b.Percentage ?? 0) - (a.Percentage ?? 0)) || ((b.Frequency || 0) - (a.Frequency || 0)))
    .slice(0, limit === null ? undefined : limit);
  const options = [...new Set(latestRows.map(r => r.AnswerOption))];
  return options.map(opt => ({
    label: opt,
    points: waves.map(w => {
      const match = rows.find(r => r.AnswerOption === opt && r.Survey === w);
      const value = match ? (match.Percentage !== null ? match.Percentage : (match.TotalResponses && match.Frequency ? match.Frequency / match.TotalResponses : null)) : null;
      return { label: w, value };
    }),
  }));
}

function normalizeSurveyResponseLabel(label) {
  return String(label || '').toLowerCase().replace(/[’']/g, '').replace(/s+/g, ' ').trim();
}

function getPartnerResponseGroupLabel(groupKey, question) {
  const q = String(question || '').toLowerCase();
  if (groupKey === 'positive') {
    if (q.includes('familiar')) return 'Very + extremely familiar';
    if (q.includes('valuable') || q.includes('value')) return 'Very + extremely valuable';
    if (q.includes('agree') || q.includes('member') || q.includes('community')) return 'Agree + strongly agree';
    if (q.includes('do you currently')) return 'Yes';
    return 'Extremely likely + likely';
  }
  if (groupKey === 'middle') {
    if (q.includes('familiar')) return 'Somewhat familiar / neutral';
    if (q.includes('valuable') || q.includes('value')) return 'Somewhat valuable / neutral';
    if (q.includes('agree') || q.includes('member') || q.includes('community')) return 'Somewhat agree / neutral';
    return 'Somewhat likely / neutral';
  }
  if (q.includes('familiar')) return 'Not familiar';
  if (q.includes('valuable') || q.includes('value')) return 'Not valuable';
  if (q.includes('agree') || q.includes('member') || q.includes('community')) return 'Disagree + strongly disagree';
  if (q.includes('do you currently')) return 'No';
  return 'Unlikely + extremely unlikely';
}

function classifyPartnerSpecificResponse(response, question = '') {
  const r = normalizeSurveyResponseLabel(response);
  if (!r) return null;
  if ([
    'extremely likely', 'very likely', 'likely',
    'strongly agree', 'agree',
    'extremely familiar', 'very familiar',
    'extremely valuable', 'very valuable',
    'yes'
  ].includes(r)) return 'positive';
  if ([
    'extremely unlikely', 'very unlikely', 'unlikely', 'not at all likely',
    'strongly disagree', 'disagree',
    'not familiar', 'not at all familiar', 'not very familiar',
    'not valuable', 'not at all valuable', 'not very valuable',
    'no'
  ].includes(r)) return 'negative';
  if (r.includes('somewhat') || r.includes('neutral') || r.includes('neither') || r.includes('unsure') || r.includes('not sure') || r.includes('no opinion')) return 'middle';
  return null;
}

function getTop3BoxSet(question) {
  const q = (question || '').toLowerCase();
  if (q.includes('familiar')) return ['somewhat familiar', 'very familiar', 'extremely familiar'];
  if (q.includes('recommend')) return ['somewhat likely', 'likely', 'extremely likely'];
  if (q.includes('likelihood') || q.includes('likely') || q.includes('consider')) return ['somewhat likely', 'likely', 'extremely likely'];
  if (q.includes('valuable') || q.includes('value')) return ['somewhat valuable', 'very valuable', 'extremely valuable'];
  if (q.includes('agree') || q.includes('member') || q.includes('community')) return ['somewhat agree', 'agree', 'strongly agree'];
  return [];
}

function getTop3ResponsesForPartnerQuestion(brand, question, phase = null) {
  let rows = getPartnerSurveyData(brand).filter(r => r.Question === question && (!phase || r.Phase === phase));
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const latestWave = waves[waves.length - 1];
  const latestRows = rows.filter(r => r.Survey === latestWave);
  const available = [...new Set(rows.map(r => r.Response).filter(Boolean))];
  const preferred = getTop3BoxSet(question);
  const preferredMatches = preferred
    .map(p => available.find(a => a.toLowerCase() === p))
    .filter(Boolean);
  if (preferredMatches.length >= 2) return preferredMatches.slice(0, 3);
  return latestRows
    .sort((a, b) => ((b.Percentage ?? 0) - (a.Percentage ?? 0)) || ((b.Frequency || 0) - (a.Frequency || 0)))
    .map(r => r.Response)
    .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
    .slice(0, 3);
}

function getPartnerSpecificQuestionGroupedSeries(brand, question, phase = null) {
  const rows = getPartnerSurveyData(brand).filter(r => r.Question === question && (!phase || r.Phase === phase));
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  if (!rows.length || !waves.length) return [];
  const groupOrder = ['positive', 'middle', 'negative'];
  const series = groupOrder.map(groupKey => ({
    label: getPartnerResponseGroupLabel(groupKey, question),
    points: waves.map(w => {
      const matches = rows.filter(r => r.Survey === w && classifyPartnerSpecificResponse(r.Response, question) === groupKey);
      if (!matches.length) return { label: w, value: null };
      const value = matches.reduce((sum, r) => {
        const pct = r.Percentage !== null ? r.Percentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : 0);
        return sum + (pct || 0);
      }, 0);
      return { label: w, value: Math.max(0, Math.min(1, value)) };
    }),
  }));
  const populated = series.filter(s => (s.points || []).some(p => p.value !== null && p.value !== undefined && !Number.isNaN(p.value)));
  return populated.length >= 2 ? enrichSurveySeriesPointChanges(series) : [];
}

function getPartnerSpecificQuestionLatestGroups(brand, question, phase = null) {
  const rows = getPartnerSurveyData(brand).filter(r => r.Question === question && (!phase || r.Phase === phase));
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const latestWave = waves[waves.length - 1];
  if (!latestWave) return [];
  const seriesList = buildPartnerSpecificQuestionSeries(brand, question, phase);
  return seriesList.map(series => {
    const pt = (series.points || []).find(p => p.label === latestWave);
    return {
      label: series.label,
      value: pt ? pt.value : null,
      wave: latestWave,
      surveyDelta: pt ? pt.surveyDelta : null,
      surveyPctChange: pt ? pt.surveyPctChange : null,
      surveyDeltaFrom: pt ? pt.surveyDeltaFrom : '',
      yoyDelta: pt ? pt.yoyDelta : null,
      yoyPctChange: pt ? pt.yoyPctChange : null,
      yoyDeltaFrom: pt ? pt.yoyDeltaFrom : '',
    };
  });
}

function buildPartnerSpecificQuestionSeries(brand, question, phase = null) {
  const grouped = getPartnerSpecificQuestionGroupedSeries(brand, question, phase);
  if (grouped.length) return grouped;
  const rows = getPartnerSurveyData(brand).filter(r => r.Question === question && (!phase || r.Phase === phase));
  const waves = [...new Set(rows.map(r => r.Survey).filter(Boolean))].sort();
  const responses = getTop3ResponsesForPartnerQuestion(brand, question, phase);
  const series = responses.map(resp => ({
    label: resp,
    points: waves.map(w => {
      const match = rows.find(r => r.Response === resp && r.Survey === w);
      const value = match ? (match.Percentage !== null ? match.Percentage : (match.TotalResponses && match.Frequency ? match.Frequency / match.TotalResponses : null)) : null;
      return { label: w, value };
    }),
  }));
  return enrichSurveySeriesPointChanges(series);
}

function renderGeneralHistoryTable(rows) {
  const sorted = [...rows].sort((a, b) => b.Survey.localeCompare(a.Survey) || (b.Frequency || 0) - (a.Frequency || 0));
  return `<div style="overflow-x:auto;margin-top:14px;">
    <table class="data-table survey-text-table">
      <thead><tr><th style="text-align:left;">Wave</th><th style="text-align:left;">Answer option</th><th class="num">Responses</th><th class="num">%</th><th class="num">Respondents</th></tr></thead>
      <tbody>${sorted.map(r => `<tr><td style="text-align:left;">${escapeHTML(r.Survey)}</td><td style="text-align:left;font-weight:500;">${escapeHTML(r.AnswerOption)}</td><td class="num">${r.Frequency !== null ? formatNum(r.Frequency) : '—'}</td><td class="num">${formatSurveyPctValue(r.Percentage !== null ? r.Percentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null))}</td><td class="num">${r.TotalResponses ? formatNum(r.TotalResponses) : '—'}</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function renderProgramHistoryTable(rows) {
  const sorted = [...rows].sort((a, b) => b.Survey.localeCompare(a.Survey) || a.CoreName.localeCompare(b.CoreName));
  return `<div style="overflow-x:auto;margin-top:14px;">
    <table class="data-table survey-text-table">
      <thead><tr><th style="text-align:left;">Wave</th><th style="text-align:left;">Program</th><th class="num">Responses</th><th class="num">Awareness %</th><th class="num">Respondents</th></tr></thead>
      <tbody>${sorted.map(r => `<tr><td style="text-align:left;">${escapeHTML(r.Survey)}</td><td style="text-align:left;font-weight:500;">${escapeHTML(r.CoreName)}</td><td class="num">${r.Frequency !== null ? formatNum(r.Frequency) : '—'}</td><td class="num">${formatSurveyPctValue(r.AnswerPercentage !== null ? r.AnswerPercentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null))}</td><td class="num">${r.TotalResponses ? formatNum(r.TotalResponses) : '—'}</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function renderPartnerSpecificHistoryTable(rows) {
  const sorted = [...rows].sort((a, b) => b.Survey.localeCompare(a.Survey) || a.Response.localeCompare(b.Response));
  return `<div style="overflow-x:auto;margin-top:14px;">
    <table class="data-table survey-text-table">
      <thead><tr><th style="text-align:left;">Wave</th><th style="text-align:left;">Response</th><th class="num">Responses</th><th class="num">%</th><th class="num">Vs prior survey</th><th class="num">YoY same timing</th><th class="num">Respondents</th></tr></thead>
      <tbody>${sorted.map(r => {
        const surveyDelta = getPartnerSpecificRowComparison(r, 'survey');
        const yoyDelta = getPartnerSpecificRowComparison(r, 'yoy');
        return `<tr><td style="text-align:left;">${escapeHTML(r.Survey)}</td><td style="text-align:left;font-weight:500;">${escapeHTML(r.Response)}</td><td class="num">${r.Frequency !== null ? formatNum(r.Frequency) : '—'}</td><td class="num">${formatSurveyPctValue(r.Percentage !== null ? r.Percentage : (r.TotalResponses && r.Frequency ? r.Frequency / r.TotalResponses : null))}</td><td class="num" title="${surveyDelta ? 'Compared with ' + escapeHTML(surveyDelta.priorWave) : ''}">${surveyDelta ? formatSurveyPctChangeHTML(surveyDelta.pctChange) : '—'}</td><td class="num" title="${yoyDelta ? 'Compared with ' + escapeHTML(yoyDelta.priorWave) : ''}">${yoyDelta ? formatSurveyPctChangeHTML(yoyDelta.pctChange) : '—'}</td><td class="num">${r.TotalResponses ? formatNum(r.TotalResponses) : '—'}</td></tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

let surveyTrendChartCounter = 0;
const SURVEY_TREND_MAX_VISIBLE = 8;
const SURVEY_TREND_CHARTS = {};

function renderSurveyMultiTrendChart(payload) {
  const series = (payload.series || []).filter(s => (s.points || []).some(p => p.value !== null && p.value !== undefined && !Number.isNaN(p.value)));
  const pointCount = series.reduce((max, s) => Math.max(max, (s.points || []).filter(p => p.value !== null && p.value !== undefined && !Number.isNaN(p.value)).length), 0);
  if (!series.length || pointCount < 2) {
    return `<div class="survey-empty-trend">${escapeHTML(payload.emptyMessage || 'Trend will populate when at least two waves are available.')}</div>`;
  }

  const chartId = `surveyTrendChart${++surveyTrendChartCounter}`;
  const maxVisible = Math.max(1, Math.min(payload.maxVisible || SURVEY_TREND_MAX_VISIBLE, series.length));
  const selected = series.map((_, i) => i).slice(0, maxVisible);
  SURVEY_TREND_CHARTS[chartId] = {
    payload: { ...payload, series },
    selected,
    maxVisible,
  };

  const controls = series.length > 1 ? renderSurveyTrendControls(chartId) : '';
  return `<div class="survey-trend-widget" data-survey-trend-id="${chartId}">
    <div class="survey-chart-toolbar">
      <div>
        <span class="survey-chart-toolbar-kicker">Interactive trend</span>
        <span class="survey-chart-toolbar-note" id="${chartId}-count">${selected.length}/${series.length} shown</span>
      </div>
      <button type="button" class="survey-chart-popout" onclick="openSurveyTrendModalFromChart('${chartId}')">Expand ↗</button>
    </div>
    ${controls}
    <div class="survey-trend-surface" id="${chartId}-surface" onclick="openSurveyTrendModalFromChart('${chartId}')" title="Click to expand chart">
      ${renderSurveyTrendChartSurface(chartId, false)}
    </div>
  </div>`;
}

function renderSurveyTrendControls(chartId) {
  const state = SURVEY_TREND_CHARTS[chartId];
  if (!state || !state.payload || !Array.isArray(state.payload.series)) return '';
  const series = state.payload.series;
  if (series.length <= 1) return '';
  return `<div class="survey-series-selector" aria-label="Select chart series">
    <div class="survey-series-selector-note">Click to swap series in/out · max ${state.maxVisible}</div>
    <div class="survey-series-chip-row">
      ${series.map((s, idx) => `<button type="button" class="survey-series-chip ${state.selected.includes(idx) ? 'active' : ''}" data-series-index="${idx}" onclick="toggleSurveyTrendSeries('${chartId}', ${idx})">${escapeHTML(String(s.label || `Series ${idx + 1}`))}</button>`).join('')}
    </div>
  </div>`;
}

function renderSurveyTrendChartSurface(chartId, expanded) {
  const state = SURVEY_TREND_CHARTS[chartId];
  if (!state) return '';
  const selectedSeries = state.selected
    .map(idx => state.payload.series[idx])
    .filter(Boolean);
  return renderSurveyTrendSvgPayload({ ...state.payload, series: selectedSeries, chartId }, expanded) + renderSurveyTrendLegend(selectedSeries, expanded);
}

function getSurveyTrendSeriesColors() {
  return ['var(--brand-red)', 'var(--text)', 'var(--positive)', 'var(--accent-line)', 'var(--text-dim)', 'var(--negative)', 'var(--border-strong)', 'var(--accent-soft)'];
}

function renderSurveyTrendLegend(series, expanded = false) {
  const colors = getSurveyTrendSeriesColors();
  if (!series || !series.length) return '';
  return '<div class="survey-trend-legend ' + (expanded ? 'expanded' : '') + '">' +
    series.map((s, si) => '<span class="survey-trend-legend-item"><span class="survey-trend-legend-swatch" style="background:' + colors[si % colors.length] + '"></span>' + escapeHTML(String(s.label || ('Series ' + (si + 1)))) + '</span>').join('') +
  '</div>';
}

function refreshSurveyTrendChart(chartId) {
  const state = SURVEY_TREND_CHARTS[chartId];
  const root = document.querySelector(`[data-survey-trend-id="${chartId}"]`);
  const surface = document.getElementById(`${chartId}-surface`);
  if (!state || !surface) return;
  surface.innerHTML = renderSurveyTrendChartSurface(chartId, false);
  const count = document.getElementById(`${chartId}-count`);
  if (count) count.textContent = `${state.selected.length}/${state.payload.series.length} shown`;
  if (root) {
    root.querySelectorAll('.survey-series-chip').forEach(btn => {
      const idx = Number(btn.dataset.seriesIndex);
      btn.classList.toggle('active', state.selected.includes(idx));
    });
  }
}

function toggleSurveyTrendSeries(chartId, index) {
  const state = SURVEY_TREND_CHARTS[chartId];
  if (!state) return;
  const pos = state.selected.indexOf(index);
  if (pos >= 0) {
    if (state.selected.length === 1) return;
    state.selected.splice(pos, 1);
  } else {
    if (state.selected.length >= state.maxVisible) state.selected.shift();
    state.selected.push(index);
  }
  refreshSurveyTrendChart(chartId);
}

function renderSurveyTrendSvgPayload(payload, expanded) {
  const series = payload.series || [];
  const labels = [...new Set(series.flatMap(s => (s.points || []).map(p => p.label).filter(Boolean)))].sort();
  const W = expanded ? 1040 : 900;
  const H = expanded ? 460 : 300;
  const pL = expanded ? 78 : 62;
  const pR = expanded ? 34 : 26;
  const pT = expanded ? 30 : 24;
  const pB = expanded ? 66 : 54;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const yMax = payload.yMax || Math.max(1, ...series.flatMap(s => (s.points || []).map(p => p.value || 0)));
  const yTicks = payload.valueType === 'percent' ? [0, .25, .5, .75, 1] : [0, .25, .5, .75, 1].map(v => v * yMax);
  const colors = getSurveyTrendSeriesColors();
  const xScale = idx => pL + (idx / Math.max(labels.length - 1, 1)) * cW;
  const yScale = v => pT + (1 - Math.max(0, Math.min(yMax, v)) / yMax) * cH;
  const fmt = v => payload.valueType === 'percent' ? Math.round(v * 100) + '%' : formatNum(v);
  const chartIdAttr = payload.chartId ? ' data-chart-id="' + escapeHTML(payload.chartId) + '"' : '';

  let svg = '<svg class="survey-multi-trend-svg"' + chartIdAttr + ' viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + escapeHTML(payload.title || 'Survey trend chart') + '">';
  svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="8" fill="transparent"/>';

  yTicks.forEach(t => {
    const y = yScale(t);
    svg += '<line class="survey-chart-gridline" x1="' + pL + '" y1="' + y.toFixed(1) + '" x2="' + (W - pR) + '" y2="' + y.toFixed(1) + '"/>';
    svg += '<text x="' + (pL - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="survey-axis-label">' + fmt(t) + '</text>';
  });
  svg += '<line class="survey-chart-axis" x1="' + pL + '" y1="' + pT + '" x2="' + pL + '" y2="' + (H - pB) + '"/>';
  svg += '<line class="survey-chart-axis" x1="' + pL + '" y1="' + (H - pB) + '" x2="' + (W - pR) + '" y2="' + (H - pB) + '"/>';

  labels.forEach((label, idx) => {
    const x = xScale(idx);
    const compact = label.replace(' Early',' E').replace(' Late',' L');
    svg += '<text x="' + x.toFixed(1) + '" y="' + (H - pB + 20) + '" text-anchor="middle" class="survey-axis-label">' + escapeHTML(compact) + '</text>';
  });

  series.forEach((s, si) => {
    const color = colors[si % colors.length];
    const pts = labels.map((label, idx) => {
      const match = (s.points || []).find(p => p.label === label);
      if (!match || match.value === null || match.value === undefined || Number.isNaN(match.value)) return null;
      return {
        x: xScale(idx),
        y: yScale(match.value),
        label,
        value: match.value,
        surveyDelta: match.surveyDelta,
        surveyPctChange: match.surveyPctChange,
        surveyDeltaFrom: match.surveyDeltaFrom,
        yoyDelta: match.yoyDelta,
        yoyPctChange: match.yoyPctChange,
        yoyDeltaFrom: match.yoyDeltaFrom,
      };
    }).filter(Boolean);
    if (pts.length < 2) return;
    const d = pts.map((pt, i) => (i === 0 ? 'M' : 'L') + ' ' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1)).join(' ');
    const seriesLabel = escapeHTML(String(s.label || ('Series ' + (si + 1))));
    svg += '<path class="survey-series-line" data-series-index="' + si + '" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (expanded ? 2.8 : 2.35) + '" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(pt => {
      const valueLabel = fmt(pt.value);
      svg += '<circle class="survey-point-dot" data-series-index="' + si + '" cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (expanded ? 4.2 : 3.6) + '" fill="' + color + '" stroke="var(--bg-elev)" stroke-width="1.5"/>';
      const surveyDeltaLabel = pt.surveyDeltaFrom ? 'Vs prior survey: ' + formatSurveyPctChangeText(pt.surveyPctChange) + ' (' + pt.surveyDeltaFrom + ')' : '';
      const yoyDeltaLabel = pt.yoyDeltaFrom ? 'YoY same timing: ' + formatSurveyPctChangeText(pt.yoyPctChange) + ' (' + pt.yoyDeltaFrom + ')' : '';
      svg += '<circle class="survey-point-hit" data-series-index="' + si + '" data-series-label="' + seriesLabel + '" data-point-label="' + escapeHTML(pt.label) + '" data-value-label="' + escapeHTML(valueLabel) + '" data-survey-delta-label="' + escapeHTML(surveyDeltaLabel) + '" data-yoy-delta-label="' + escapeHTML(yoyDeltaLabel) + '" cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="12" fill="transparent" onmouseenter="showSurveyTrendTooltip(event)" onmousemove="moveSurveyTrendTooltip(event)" onmouseleave="hideSurveyTrendTooltip(event)"/>';
    });
  });

  svg += '</svg>';
  return svg;
}

function openSurveyTrendModalFromChart(chartId) {
  const state = SURVEY_TREND_CHARTS[chartId];
  if (!state) return;
  const selectedSeries = state.selected.map(idx => state.payload.series[idx]).filter(Boolean);
  openSurveyTrendModalPayload({ ...state.payload, series: selectedSeries, chartId: `${chartId}-modal` });
}

function openSurveyTrendModal(encodedPayload) {
  let payload;
  try { payload = JSON.parse(decodeURIComponent(encodedPayload)); }
  catch (e) { return; }
  openSurveyTrendModalPayload(payload);
}

function openSurveyTrendModalPayload(payload) {
  const existing = document.getElementById('surveyTrendModalBackdrop');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'surveyTrendModalBackdrop';
  modal.innerHTML = `
    <div class="modal modal-wide survey-trend-modal">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${escapeHTML(payload.title || 'Survey trend')}</h2>
          ${payload.subtitle ? `<div class="leaderboard-note" style="margin:8px 0 0;">${escapeHTML(payload.subtitle)}</div>` : ''}
        </div>
        <button class="modal-close" onclick="closeSurveyTrendModal()">✕</button>
      </div>
      <div>${renderSurveyTrendSvgPayload(payload, true)}${renderSurveyTrendLegend(payload.series || [], true)}</div>
    </div>`;
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'surveyTrendModalBackdrop') closeSurveyTrendModal();
  });
  document.body.appendChild(modal);
}

function closeSurveyTrendModal() {
  const modal = document.getElementById('surveyTrendModalBackdrop');
  if (modal) modal.remove();
}

function ensureSurveyTrendTooltip() {
  let tip = document.getElementById('surveyTrendTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'surveyTrendTooltip';
    tip.className = 'survey-trend-tooltip';
    document.body.appendChild(tip);
  }
  return tip;
}

function showSurveyTrendTooltip(event) {
  const target = event.currentTarget;
  const svg = target.closest('svg');
  if (svg) {
    svg.classList.add('survey-hovering');
    const idx = target.dataset.seriesIndex;
    svg.querySelectorAll('.survey-series-line, .survey-point-dot').forEach(el => el.classList.toggle('active', el.dataset.seriesIndex === idx));
  }
  const tip = ensureSurveyTrendTooltip();
  const extra = [target.dataset.surveyDeltaLabel, target.dataset.yoyDeltaLabel].filter(Boolean);
  tip.innerHTML = `<strong>${escapeHTML(target.dataset.seriesLabel || '')}</strong><span>${escapeHTML(target.dataset.pointLabel || '')}</span><em>${escapeHTML(target.dataset.valueLabel || '')}</em>${extra.map(x => `<span class="survey-tooltip-detail">${escapeHTML(x)}</span>`).join('')}`;
  tip.classList.add('active');
  moveSurveyTrendTooltip(event);
}

function moveSurveyTrendTooltip(event) {
  const tip = ensureSurveyTrendTooltip();
  const pad = 14;
  const rect = tip.getBoundingClientRect();
  let left = event.clientX + pad;
  let top = event.clientY + pad;
  if (left + rect.width > window.innerWidth - 10) left = event.clientX - rect.width - pad;
  if (top + rect.height > window.innerHeight - 10) top = event.clientY - rect.height - pad;
  tip.style.left = `${Math.max(10, left)}px`;
  tip.style.top = `${Math.max(10, top)}px`;
}

function hideSurveyTrendTooltip(event) {
  const svg = event.currentTarget && event.currentTarget.closest ? event.currentTarget.closest('svg') : null;
  if (svg) {
    svg.classList.remove('survey-hovering');
    svg.querySelectorAll('.survey-series-line, .survey-point-dot').forEach(el => el.classList.remove('active'));
  }
  const tip = document.getElementById('surveyTrendTooltip');
  if (tip) tip.classList.remove('active');
}

// ============================================================
// PARTNER PAGE — General Survey section (Fan Insights mentions)
// ============================================================
function renderGeneralSurveySection(brand) {
  const slot = document.getElementById('insights-slot');
  if (!slot) return;

  const matches = getGeneralSurveyForBrand(brand);
  if (!matches.length) return; // silently skip — no partner mentions

  // Group by question
  const byQuestion = new Map();
  matches.forEach(r => {
    if (!byQuestion.has(r.Question)) byQuestion.set(r.Question, []);
    byQuestion.get(r.Question).push(r);
  });

  const sectionId = 'section-insights';
  const isOpen = !!openSections[sectionId];

  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Questions</span>
      <span class="value">${byQuestion.size}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Answer options</span>
      <span class="value">${[...new Set(matches.map(r => r.AnswerOption))].length}</span>
    </div>`;

  const questionsHtml = [...byQuestion.entries()].map(([q, rows]) => {
    const waves = [...new Set(rows.map(r => r.Survey))].sort();
    const optionKeys = [...new Set(rows.map(r => r.AnswerOption))];

    const waveRows = optionKeys.map(opt => {
      const waveData = waves.map(w => {
        const match = rows.find(r => r.AnswerOption === opt && r.Survey === w);
        return { wave: w, freq: match?.Frequency ?? null, pct: match?.Percentage ?? null };
      });
      const latestData = waveData[waveData.length - 1];
      return { opt, waveData, latestFreq: latestData?.freq, latestPct: latestData?.pct };
    }).sort((a, b) => (b.latestFreq || 0) - (a.latestFreq || 0));

    const barsHtml = waveRows.map(({ opt, waveData, latestFreq, latestPct }) => {
      const trendPoints = waveData.filter(d => d.freq !== null);
      const trendNote = trendPoints.length >= 2
        ? ` · ${waves.length} waves`
        : '';
      const pctLabel = latestPct !== null
        ? `${Math.round(latestPct * 100)}%`
        : (latestFreq ? formatNum(latestFreq) : '—');
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
          <div style="width:200px;font-size:12px;color:var(--text);text-align:right;flex-shrink:0;">${escapeHTML(opt)}</div>
          <div style="font-size:12px;color:var(--brand-red);font-family:var(--font-mono);font-weight:600;min-width:42px;">${pctLabel}</div>
          <div style="font-size:11px;color:var(--text-muted);">${waves[waves.length-1]}${trendNote}</div>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;font-style:italic;">${escapeHTML(q)}</div>
        ${barsHtml}
      </div>`;
  }).join('');

  slot.innerHTML = `
    <div class="section-block section-toggleable" id="${sectionId}">
      <div class="section-block-header" data-section-toggle="${sectionId}">
        <div class="section-block-title">
          <span class="section-block-icon">📋</span>
          <span>Fan Insights</span>
        </div>
        <div class="section-summary">${summaryHTML}</div>
        <span class="section-toggle-icon">${isOpen ? '▼' : '▶'}</span>
      </div>
      <div class="section-block-body" style="display:${isOpen ? 'block' : 'none'};">
        <div class="leaderboard-note">
          Answer options mentioning or linked to ${escapeHTML(brand)} across all Fan Insights survey questions.
          Partner links are auto-extracted or manually assigned via the survey assignment review.
        </div>
        <div style="padding:12px 0;">${questionsHtml}</div>
      </div>
    </div>`;

  wireSectionToggles();
}

// ============================================================
// PARTNER PAGE — Partner Survey section (Moda Health / Delta Dental)
// ============================================================
function renderPartnerSurveySection(brand) {
  const slot = document.getElementById('partner-survey-slot');
  if (!slot) return;

  const validPartners = ['Moda Health', 'Delta Dental'];
  if (!validPartners.includes(brand)) return;

  const rows = getPartnerSurveyData(brand);
  if (!rows.length) return;

  const questions = getPartnerSurveyQuestions(brand);
  const allWaves  = getPartnerSurveyWaves(brand);

  const sectionId = 'section-partner-survey';
  const isOpen = !!openSections[sectionId];

  // Headline stats from latest wave (all phases combined)
  const latestWave = allWaves[allWaves.length - 1] || '';
  const firstQ     = questions[0] || '';
  const latestPct  = getPartnerSurveyTopBoxPct(brand, firstQ, latestWave);

  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Questions</span>
      <span class="value">${questions.length}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Waves</span>
      <span class="value">${allWaves.length}</span>
    </div>`;

  // Build a card per question
  const questionCardsHtml = questions.map(q => {
    const isYN   = (rows.find(r => r.Question === q) || {}).IsYesNo;
    const metricLabel = isYN ? '% Yes' : 'Top-2 Box';
    const trend  = getPartnerSurveyTrend(brand, q, null); // all phases
    const latestTrend = trend[trend.length - 1];
    const priorTrend  = trend.length >= 2 ? trend[trend.length - 2] : null;
    const latestVal   = latestTrend?.pct ?? null;
    const priorVal    = priorTrend?.pct ?? null;
    const yoyDelta    = (latestVal !== null && priorVal !== null) ? latestVal - priorVal : null;

    // Response breakdown for latest wave
    const latestWaveQ = latestTrend?.Survey || '';
    const breakdownRows = (DataStore.surveyPartner || [])
      .filter(r => r.Partner === brand && r.Question === q && r.Survey === latestWaveQ)
      .sort((a, b) => (b.Frequency || 0) - (a.Frequency || 0));
    const totalResp = breakdownRows[0]?.TotalResponses || breakdownRows.reduce((s, r) => s + (r.Frequency || 0), 0);
    const maxFreq = Math.max(...breakdownRows.map(r => r.Frequency || 0), 1);

    // Mini trend SVG (top-2 box % over waves)
    const trendSvg = renderPartnerSurveyTrendSvg(trend);

    const breakdownHtml = breakdownRows.map(r => {
      const freq = r.Frequency || 0;
      const pct  = totalResp ? freq / totalResp : 0;
      const barW = maxFreq > 0 ? Math.round((freq / maxFreq) * 100) : 0;
      const isTop = r.IsTopBox || (r.IsYesNo && r.IsYes);
      return `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <div style="width:220px;font-size:11px;color:${isTop ? 'var(--text)' : 'var(--text-dim)'};text-align:right;flex-shrink:0;font-weight:${isTop ? 600 : 400};">${escapeHTML(r.Response)}</div>
          <div style="flex:1;background:var(--bg-elev-2);border-radius:3px;height:14px;position:relative;overflow:hidden;">
            <div style="position:absolute;left:0;top:0;height:100%;width:${barW}%;background:${isTop ? 'var(--brand-red)' : 'var(--border)'};border-radius:3px;"></div>
          </div>
          <div style="width:80px;font-size:11px;font-family:var(--font-mono);color:var(--text-dim);text-align:right;">
            ${freq ? formatNum(freq) : '—'} <span style="color:var(--text-muted)">(${Math.round(pct * 100)}%)</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom:14px;">
        <div class="card-header">
          <div>
            <span class="card-title" style="font-size:13px;">${escapeHTML(q)}</span>
            <span class="card-sub">${metricLabel} · ${allWaves.length} waves</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:700;color:var(--text);">${latestVal !== null ? Math.round(latestVal * 100) + '%' : '—'}</div>
            ${yoyDelta !== null ? `<div style="font-size:11px;">
              ${formatSurveyPctChangeHTML(surveyPctChangeFromValues(latestVal, priorVal), 'vs ' + (priorTrend?.Survey || '—'))}
            </div>` : ''}
          </div>
        </div>
        ${trend.length >= 2 ? `<div style="margin-bottom:12px;">${trendSvg}</div>` : ''}
        ${breakdownRows.length ? `
          <div>
            <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">
              Response breakdown · ${escapeHTML(latestWaveQ)}${totalResp ? ` · ${formatNum(totalResp)} respondents` : ''}
            </div>
            ${breakdownHtml}
          </div>` : ''}
      </div>`;
  }).join('');

  slot.innerHTML = `
    <div class="section-block section-toggleable" id="${sectionId}">
      <div class="section-block-header" data-section-toggle="${sectionId}">
        <div class="section-block-title">
          <span class="section-block-icon">🔬</span>
          <span>Partner Survey Questions</span>
        </div>
        <div class="section-summary">${summaryHTML}</div>
        <span class="section-toggle-icon">${isOpen ? '▼' : '▶'}</span>
      </div>
      <div class="section-block-body" style="display:${isOpen ? 'block' : 'none'};">
        <div class="leaderboard-note">
          Survey questions specifically about ${escapeHTML(brand)} — familiarity, consideration, likelihood to recommend, and community perception.
          Top-2 box scores highlight the most positive response buckets. Trend chart shows movement across all survey waves.
        </div>
        <div style="padding:12px 0;">${questionCardsHtml}</div>
      </div>
    </div>`;

  wireSectionToggles();
}

// Small SVG trend chart for partner survey top-2 box % across waves
function renderPartnerSurveyTrendSvg(trend) {
  const filtered = trend.filter(t => t.pct !== null);
  if (filtered.length < 2) return '';
  const W = 500, H = 80, pL = 10, pR = 10, pT = 10, pB = 20;
  const cW = W - pL - pR, cH = H - pT - pB;
  const xScale = i => pL + (i / Math.max(filtered.length - 1, 1)) * cW;
  const yScale = v => pT + (1 - Math.max(0, Math.min(1, v))) * cH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:80px;" preserveAspectRatio="xMidYMid meet">`;
  const pts = filtered.map((t, i) => `${xScale(i).toFixed(1)},${yScale(t.pct).toFixed(1)}`).join(' ');
  svg += `<polyline points="${pts}" fill="none" stroke="var(--brand-red)" stroke-width="2" stroke-linejoin="round"/>`;
  filtered.forEach((t, i) => {
    const x = xScale(i), y = yScale(t.pct);
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--brand-red)" stroke="var(--bg)" stroke-width="1.5"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" style="font-size:9px;fill:var(--text-dim);font-family:var(--font-mono);">${Math.round(t.pct * 100)}%</text>`;
    svg += `<text x="${x.toFixed(1)}" y="${(H - 4).toFixed(1)}" text-anchor="middle" style="font-size:9px;fill:var(--text-muted);font-family:var(--font-mono);">${t.Survey.replace(' Early','E').replace(' Late','L')}</text>`;
  });
  svg += '</svg>';
  return svg;
}

// ============================================================
// PARTNER PAGE — Programs section
// ============================================================
function renderProgramsSurveySection(brand) {
  const slot = document.getElementById('programs-slot');
  if (!slot) return;

  const programRows = getProgramsForSponsor(brand);
  if (!programRows.length) return;

  const sectionId = 'section-programs-survey';
  const isOpen = !!openSections[sectionId];

  // Group by CoreName
  const grouped = new Map();
  programRows.forEach(r => {
    if (!grouped.has(r.CoreName)) grouped.set(r.CoreName, []);
    grouped.get(r.CoreName).push(r);
  });
  // Sort each group chronologically
  grouped.forEach(g => g.sort((a, b) => a.Survey.localeCompare(b.Survey)));

  const uniquePrograms = grouped.size;
  const latestWaveOverall = [...programRows].sort((a, b) => b.Survey.localeCompare(a.Survey))[0]?.Survey || '';
  const latestRows = programRows.filter(r => r.Survey === latestWaveOverall);
  const latestMaxFreq = Math.max(...latestRows.map(r => r.Frequency || 0), 1);

  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Programs</span>
      <span class="value">${uniquePrograms}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Latest wave</span>
      <span class="value" style="font-size:11px;">${latestWaveOverall}</span>
    </div>`;

  const programCardsHtml = [...grouped.entries()].map(([coreName, waves]) => {
    const latestWave = waves[waves.length - 1];
    const priorWave  = waves.length >= 2 ? waves[waves.length - 2] : null;
    const latestFreq = latestWave.Frequency;
    const priorFreq  = priorWave?.Frequency ?? null;
    const yoyDelta   = (latestFreq !== null && priorFreq !== null) ? latestFreq - priorFreq : null;
    const totalResp  = latestWave.TotalResponses;
    const latestPct  = latestWave.AnswerPercentage !== null
      ? latestWave.AnswerPercentage
      : (totalResp && latestFreq ? latestFreq / totalResp : null);

    // Sponsor history — check if this coreName had a different sponsor in other waves
    const allCoreRows = (DataStore.surveyPrograms || []).filter(r => r.CoreName === coreName);
    const allSponsors = [...new Set(allCoreRows.map(r => r.Sponsor || '(no sponsor)'))];
    const hadOtherSponsor = allSponsors.some(s => s !== brand && s !== '(no sponsor)');
    const hadNoSponsor    = allSponsors.includes('(no sponsor)');
    const sponsorNote = hadOtherSponsor
      ? `<div class="leaderboard-note" style="margin:8px 0 0;">
           ℹ️ This program has had other sponsors across waves: ${allSponsors.filter(s => s !== brand).map(s => `<em>${escapeHTML(s)}</em>`).join(', ')}
         </div>`
      : hadNoSponsor
        ? `<div class="leaderboard-note" style="margin:8px 0 0;">
             ℹ️ This program ran without a named sponsor in earlier waves before ${escapeHTML(brand)} became the presenting partner.
           </div>`
        : '';

    // Small trend chart
    const trendSvg = (() => {
      if (waves.length < 2) return '';
      const wFreqs = waves.map(w => w.Frequency || 0);
      const mx = Math.max(...wFreqs, 1);
      const W2 = 300, H2 = 50, pL2 = 5, pR2 = 5, pT2 = 8, pB2 = 14;
      const cW2 = W2 - pL2 - pR2, cH2 = H2 - pT2 - pB2;
      const pts = waves.map((w, i) => {
        const x = pL2 + (i / Math.max(waves.length - 1, 1)) * cW2;
        const y = pT2 + (1 - (w.Frequency || 0) / mx) * cH2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      let s2 = `<svg viewBox="0 0 ${W2} ${H2}" style="width:100%;max-height:50px;" preserveAspectRatio="xMidYMid meet">`;
      s2 += `<polyline points="${pts}" fill="none" stroke="var(--brand-red)" stroke-width="1.5" stroke-linejoin="round"/>`;
      waves.forEach((w, i) => {
        const x = pL2 + (i / Math.max(waves.length - 1, 1)) * cW2;
        const y = pT2 + (1 - (w.Frequency || 0) / mx) * cH2;
        s2 += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="var(--brand-red)" stroke="var(--bg)" stroke-width="1"/>`;
        s2 += `<text x="${x.toFixed(1)}" y="${(H2 - 2).toFixed(1)}" text-anchor="middle" style="font-size:8px;fill:var(--text-muted);font-family:var(--font-mono);">${w.Survey.replace(' Early','E').replace(' Late','L')}</text>`;
      });
      s2 += '</svg>';
      return s2;
    })();

    return `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <div>
            <span class="card-title">${escapeHTML(coreName)}</span>
            <span class="card-sub">${latestWave.QuestionLabel} · ${waves.length} wave${waves.length===1?'':'s'} as ${escapeHTML(brand)}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:700;color:var(--text);">
              ${latestFreq !== null ? formatNum(latestFreq) : '—'}
            </div>
            <div style="font-size:11px;color:var(--text-muted);">
              ${latestPct !== null ? Math.round(latestPct * 100) + '% awareness' : 'responses'}
              ${yoyDelta !== null ? `· ${formatSurveyPctChangeHTML(surveyPctChangeFromValues(latestFreq, priorFreq))}` : ''}
            </div>
          </div>
        </div>
        ${trendSvg ? `<div style="margin-top:8px;">${trendSvg}</div>` : ''}
        ${sponsorNote}
      </div>`;
  }).join('');

  slot.innerHTML = `
    <div class="section-block section-toggleable" id="${sectionId}">
      <div class="section-block-header" data-section-toggle="${sectionId}">
        <div class="section-block-title">
          <span class="section-block-icon">🎯</span>
          <span>Programs & Community</span>
        </div>
        <div class="section-summary">${summaryHTML}</div>
        <span class="section-toggle-icon">${isOpen ? '▼' : '▶'}</span>
      </div>
      <div class="section-block-body" style="display:${isOpen ? 'block' : 'none'};">
        <div class="leaderboard-note">
          In-game and community programs sponsored by ${escapeHTML(brand)} — awareness frequency across survey waves.
          Programs that had different sponsors in other seasons are noted below.
        </div>
        <div style="padding:12px 0;">${programCardsHtml}</div>
      </div>
    </div>`;

  wireSectionToggles();
}
function renderChangelogPage(main) {
  const categoryClass = cat => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('fix') || lower.includes('bug')) return 'fix';
    if (lower.includes('design') || lower.includes('layout') || lower.includes('visual')) return 'design';
    if (lower.includes('alias') || lower.includes('data') || lower.includes('infra')) return 'data';
    return 'feature';
  };

  const entriesHtml = CHANGELOG.map((entry, idx) => {
    const isLatest = idx === 0;
    const sourceClass = (entry.source || '').toLowerCase();
    const groupsHtml = (entry.changes || []).map(group => `
      <div class="changelog-group">
        <div class="changelog-group-label ${categoryClass(group.category)}">${group.category}</div>
        <ul class="changelog-items">
          ${(group.items || []).map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    return `
      <div class="changelog-entry">
        <div class="changelog-sidebar">
          <div class="changelog-version ${isLatest ? 'latest' : ''}">${entry.version}</div>
          <div class="changelog-date">${entry.date || ''}</div>
          <span class="changelog-source-tag ${sourceClass}">${entry.source || 'Manual'}</span>
        </div>
        <div class="changelog-body">
          <div class="changelog-title">${entry.title || ''}</div>
          ${groupsHtml}
        </div>
      </div>
    `;
  }).join('');

  main.innerHTML = `
    <div class="changelog-page">
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Changelog</h2>
          <span class="section-meta">${CHANGELOG.length} versions · ${CHANGELOG[0] ? CHANGELOG[0].version : ''} latest</span>
        </div>
        <div style="margin-bottom: 28px;">
          <p style="color: var(--text-dim); font-size: 13px; line-height: 1.6; max-width: 680px;">
            Complete history of every version of PartnerIQ — what changed, when, and who made the change.
            Source tags indicate whether changes were made in a Claude session, a ChatGPT session, or manually.
            Add a new entry to the <code>CHANGELOG</code> constant at the top of the file when making future changes.
          </p>
        </div>
        ${entriesHtml}
      </section>
    </div>
  `;
}


// ============================================================
// ORGANIC SOCIAL (ZOOMPH) — 3-file ingestion & rendering
