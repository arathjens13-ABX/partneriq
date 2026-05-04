// ============================================================
// ORGANIC SOCIAL PORTFOLIO — state, constants, helpers
// ============================================================
// All of the below are consumed by renderOrganicSocialPortfolioPage and its
// event wiring. Without these declarations the page errors on click.

// Tab definitions for the leaderboard (one tab per Zoomph source file).
const ORGANIC_PORTFOLIO_TABS = [
  { key: 'perf',   label: 'Overall Brand Performance', source: 'BrandedPartnerPerformance', entityLabel: 'Brand',  countLabel: 'Snapshots' },
  { key: 'series', label: 'Brand Content Series',      source: 'BrandedContentSeries',      entityLabel: 'Series', countLabel: 'Months'    },
  { key: 'assets', label: 'Brand on Asset',            source: 'BrandOnAsset',              entityLabel: 'Asset',  countLabel: 'Months'    },
];

// Page state — mutated by the wiring at the bottom of the page render fn.
let organicPortfolioTab        = 'perf';                // 'perf' | 'series' | 'assets'
let organicPortfolioDateMode   = 'month';               // 'all' | 'month' | 'range'
let organicPortfolioMonth      = '';                    // YYYY-MM (resolves to latest on first render)
let organicPortfolioStartMonth = '';                    // YYYY-MM (range mode)
let organicPortfolioEndMonth   = '';                    // YYYY-MM (range mode)
let organicPortfolioSortKey    = 'posts';               // matches the tab-click default for 'perf'
let organicPortfolioSortDir    = 'desc';

// -- Data accessors ------------------------------------------------------
function getOrganicPortfolioAllRows() {
  return [
    ...(DataStore.zoomphBrandPerf     || []),
    ...(DataStore.zoomphContentSeries || []),
    ...(DataStore.zoomphAssets        || []),
  ];
}

function getOrganicPortfolioSourceRows(tab) {
  if (tab === 'perf')   return DataStore.zoomphBrandPerf     || [];
  if (tab === 'series') return DataStore.zoomphContentSeries || [];
  if (tab === 'assets') return DataStore.zoomphAssets        || [];
  return [];
}

function getOrganicPortfolioMonths(rows) {
  const months = new Set();
  (rows || []).forEach(r => { if (r._reportMonth) months.add(r._reportMonth); });
  return [...months].sort();
}

function getOrganicPortfolioLatestMonth(rows) {
  const months = getOrganicPortfolioMonths(rows);
  return months.length ? months[months.length - 1] : '';
}

// -- Date filtering ------------------------------------------------------
function filterOrganicPortfolioRowsByDate(rows) {
  if (!rows || !rows.length) return [];
  if (organicPortfolioDateMode === 'all') return rows.slice();
  if (organicPortfolioDateMode === 'month') {
    if (!organicPortfolioMonth || organicPortfolioMonth === 'all') return rows.slice();
    return rows.filter(r => r._reportMonth === organicPortfolioMonth);
  }
  if (organicPortfolioDateMode === 'range') {
    const start = organicPortfolioStartMonth || '';
    const end   = organicPortfolioEndMonth   || '';
    return rows.filter(r => {
      const m = r._reportMonth || '';
      if (start && m < start) return false;
      if (end   && m > end)   return false;
      return true;
    });
  }
  return rows.slice();
}

// -- Aggregation: produce the row set the leaderboard table will display.
//    'perf'              → one row per brand: their latest snapshot in the date window
//    'series' / 'assets' → roll up by Brand + Name across the date window
function getOrganicPortfolioRowsForTab(tab) {
  const sourceRows = filterOrganicPortfolioRowsByDate(getOrganicPortfolioSourceRows(tab));

  if (tab === 'perf') {
    const byBrand = new Map();
    sourceRows.forEach(r => {
      const key = r.Brand || r.Name || '';
      if (!key) return;
      const existing = byBrand.get(key);
      if (!existing || (r._reportMonth || '') > (existing._reportMonth || '')) {
        byBrand.set(key, r);
      }
    });
    return [...byBrand.values()];
  }

  // 'series' or 'assets' — aggregate by Brand + Name
  const agg = new Map();
  sourceRows.forEach(r => {
    const brand = r.Brand || '';
    const name  = r.Name  || '';
    const key   = brand + '||' + name;
    let row = agg.get(key);
    if (!row) {
      row = {
        Brand:           brand,
        Name:            name,
        OrganicPosts:    0,
        Engagements:     0,
        ViewsImpressions:0,
        SocialValue:     0,
        LogoImpressions: 0,
        BrandValue:      0,
        VideoViews:      0,
        rowCount:        0,
        _reportMonth:    '',
      };
      agg.set(key, row);
    }
    row.OrganicPosts     += r.OrganicPosts     || 0;
    row.Engagements      += r.Engagements      || 0;
    row.ViewsImpressions += r.ViewsImpressions || 0;
    row.SocialValue      += r.SocialValue      || 0;
    row.LogoImpressions  += r.LogoImpressions  || 0;
    row.BrandValue       += r.BrandValue       || 0;
    row.VideoViews       += r.VideoViews       || 0;
    row.rowCount         += 1;
    if ((r._reportMonth || '') > row._reportMonth) row._reportMonth = r._reportMonth || '';
  });
  // Derive a weighted engagement rate from the aggregated totals.
  return [...agg.values()].map(row => {
    row.EngagementRate = row.ViewsImpressions ? row.Engagements / row.ViewsImpressions : null;
    return row;
  });
}

// -- Sorting -------------------------------------------------------------
function sortOrganicPortfolioRows(rows) {
  const key = organicPortfolioSortKey;
  const dir = organicPortfolioSortDir === 'asc' ? 1 : -1;

  const numericExtractors = {
    posts:       r => r.OrganicPosts     || 0,
    views:       r => r.ViewsImpressions || 0,
    engagements: r => r.Engagements      || 0,
    engRate:     r => r.EngagementRate   || 0,
    logoImpr:    r => r.LogoImpressions  || 0,
    brandValue:  r => r.BrandValue       || 0,
    socialValue: r => r.SocialValue      || 0,
    rowCount:    r => r.rowCount         || 0,
  };
  const stringExtractors = {
    brand: r => (r.Brand || '').toLowerCase(),
    name:  r => (r.Name  || '').toLowerCase(),
  };

  if (numericExtractors[key]) {
    return [...rows].sort((a, b) => (numericExtractors[key](a) - numericExtractors[key](b)) * dir);
  }
  if (stringExtractors[key]) {
    return [...rows].sort((a, b) => stringExtractors[key](a).localeCompare(stringExtractors[key](b)) * dir);
  }
  return rows.slice();
}

// -- Labels --------------------------------------------------------------
function formatOrganicMonthLabel(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  if (!y || !mo) return m;
  const d = new Date(Number(y), Number(mo) - 1, 1);
  if (isNaN(d)) return m;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getOrganicPortfolioDateLabel() {
  if (organicPortfolioDateMode === 'all') return 'All months';
  if (organicPortfolioDateMode === 'month') {
    return organicPortfolioMonth && organicPortfolioMonth !== 'all'
      ? formatOrganicMonthLabel(organicPortfolioMonth)
      : 'All months';
  }
  if (organicPortfolioDateMode === 'range') {
    const s = organicPortfolioStartMonth ? formatOrganicMonthLabel(organicPortfolioStartMonth) : '—';
    const e = organicPortfolioEndMonth   ? formatOrganicMonthLabel(organicPortfolioEndMonth)   : '—';
    return `${s} – ${e}`;
  }
  return 'All months';
}

// ============================================================
// ORGANIC SOCIAL PORTFOLIO PAGE
// ============================================================
function renderOrganicSocialPortfolioPage(main) {
  const sourceCounts = {
    perf: (DataStore.zoomphBrandPerf || []).length,
    series: (DataStore.zoomphContentSeries || []).length,
    assets: (DataStore.zoomphAssets || []).length,
  };
  const legacyBrands = Object.keys(DataStore.organicSocial || {}).filter(b => (DataStore.organicSocial[b]||[]).length > 0);
  const totalZoomphRows = sourceCounts.perf + sourceCounts.series + sourceCounts.assets;

  if (!totalZoomphRows && !legacyBrands.length) {
    main.innerHTML = `<div class="empty-state">
      <h1>No organic social data loaded.</h1>
      <p>Upload the three Zoomph files — <code>BrandedPartnerPerformance</code>, <code>BrandedContentSeries</code>, and <code>BrandOnAsset</code> — to populate this page. Add a <code>ReportDate</code> column (YYYY-MM-DD) to each file before uploading.</p>
    </div>`;
    return;
  }

  if (!sourceCounts[organicPortfolioTab]) {
    organicPortfolioTab = sourceCounts.perf ? 'perf' : sourceCounts.series ? 'series' : sourceCounts.assets ? 'assets' : 'perf';
  }

  const allZoomphRows = getOrganicPortfolioAllRows();
  const allMonths = getOrganicPortfolioMonths(allZoomphRows);
  const latestMonth = getOrganicPortfolioLatestMonth(allZoomphRows);
  const earliestMonth = allMonths[0] || '';

  if (organicPortfolioDateMode === 'month' && (!organicPortfolioMonth || organicPortfolioMonth === 'all')) {
    organicPortfolioMonth = latestMonth || 'all';
  }
  if (organicPortfolioDateMode === 'range') {
    if (!organicPortfolioStartMonth) organicPortfolioStartMonth = earliestMonth;
    if (!organicPortfolioEndMonth) organicPortfolioEndMonth = latestMonth || earliestMonth;
  }

  const activeTab = ORGANIC_PORTFOLIO_TABS.find(t => t.key === organicPortfolioTab) || ORGANIC_PORTFOLIO_TABS[0];
  const activeSourceRows = filterOrganicPortfolioRowsByDate(getOrganicPortfolioSourceRows(organicPortfolioTab));
  const activeRows = sortOrganicPortfolioRows(getOrganicPortfolioRowsForTab(organicPortfolioTab));
  const displayOrganicRows = limitRowsForTable(activeRows, 'organicPortfolio');
  const isPerf = organicPortfolioTab === 'perf';

  function sortTh(label, key, alignLeft = false) {
    const active = organicPortfolioSortKey === key;
    const arrow = active ? (organicPortfolioSortDir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="${alignLeft ? '' : 'num'} organic-sort-th" data-okey="${key}"
      style="cursor:pointer;${alignLeft ? 'text-align:left;' : ''}">${label}${arrow}</th>`;
  }

  const totals = {
    brandValue: activeRows.reduce((s,r) => s + (r.BrandValue || 0), 0),
    socialValue: activeRows.reduce((s,r) => s + (r.SocialValue || 0), 0),
    views: activeRows.reduce((s,r) => s + (r.ViewsImpressions || 0), 0),
    engagements: activeRows.reduce((s,r) => s + (r.Engagements || 0), 0),
    logoImpr: activeRows.reduce((s,r) => s + (r.LogoImpressions || 0), 0),
  };

  const tabNote = isPerf
    ? 'Overall Brand Performance uses each brand’s latest Brand Performance snapshot within the selected date window.'
    : `${activeTab.label} ranks the individual ${activeTab.entityLabel.toLowerCase()} rows. Multiple months roll up by brand + ${activeTab.entityLabel.toLowerCase()}.`;

  const dateFilterHtml = `
    <div class="organic-date-filter" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
      <div class="survey-phase-toggle" style="margin:0;">
        ${['all','month','range'].map(mode => `<button type="button" class="${organicPortfolioDateMode === mode ? 'active' : ''}" data-organic-date-mode="${mode}">${mode === 'all' ? 'All months' : mode === 'month' ? 'Month' : 'Range'}</button>`).join('')}
      </div>
      <select id="organicMonthSelect" class="select-control" style="min-width:150px;${organicPortfolioDateMode === 'month' ? '' : 'display:none;'}">
        ${allMonths.map(m => `<option value="${m}" ${organicPortfolioMonth === m ? 'selected' : ''}>${formatOrganicMonthLabel(m)}</option>`).join('')}
      </select>
      <div id="organicRangeControls" style="display:${organicPortfolioDateMode === 'range' ? 'flex' : 'none'};align-items:center;gap:6px;">
        <input id="organicStartMonth" type="month" class="select-control" value="${organicPortfolioStartMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
        <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;">to</span>
        <input id="organicEndMonth" type="month" class="select-control" value="${organicPortfolioEndMonth || latestMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
      </div>
    </div>`;

  const emptyColspan = isPerf ? 11 : 12;

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Organic Social'}])}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">📱 Organic Social Portfolio</h2>
        <span class="section-meta">Zoomph · ${getOrganicPortfolioDateLabel()} · Latest snapshot: ${latestMonth || '—'} · ${activeRows.length} ${isPerf ? 'brands' : 'items'}</span>
      </div>

      <div class="kpi-grid" style="margin-bottom:22px;">
        <div class="kpi">
          <span class="kpi-label">Brand Value ${makeInfoIcon('Brand Exposure Value')}</span>
          <span class="kpi-value">${formatCurrency(totals.brandValue)}</span>
          <span class="kpi-change neutral">${activeTab.label}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Social Value</span>
          <span class="kpi-value">${formatCurrency(totals.socialValue)}</span>
          <span class="kpi-change neutral">${activeTab.label}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Views / Impressions ${makeInfoIcon('Impressions')}</span>
          <span class="kpi-value">${formatNum(totals.views)}</span>
          <span class="kpi-change neutral">${getOrganicPortfolioDateLabel()}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Engagements ${makeInfoIcon('Engagement')}</span>
          <span class="kpi-value">${formatNum(totals.engagements)}</span>
          <span class="kpi-change neutral">${getOrganicPortfolioDateLabel()}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Logo Impressions</span>
          <span class="kpi-value">${formatNum(totals.logoImpr)}</span>
          <span class="kpi-change neutral">${getOrganicPortfolioDateLabel()}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">${isPerf ? 'Partners tracked' : 'Items ranked'}</span>
          <span class="kpi-value">${activeRows.length}</span>
          <span class="kpi-change neutral">${formatNum(activeSourceRows.length)} source rows</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="align-items:flex-start;gap:14px;">
          <div>
            <span class="card-title">${isPerf ? 'Brand leaderboard' : activeTab.entityLabel + ' leaderboard'}</span>
            <span class="card-sub">${tabNote} · Click headers to sort · Click a row to open the mapped partner page</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
            ${dateFilterHtml}
            ${renderLimitControls('organicPortfolio', activeRows.length)}
            <div class="survey-phase-toggle" style="margin:0;justify-content:flex-end;">
              ${ORGANIC_PORTFOLIO_TABS.map(tab => `
                <button class="${organicPortfolioTab === tab.key ? 'active' : ''}" data-organic-tab="${tab.key}" title="${tab.source}: ${formatNum(sourceCounts[tab.key] || 0)} rows">
                  ${tab.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="leaderboard-note" style="margin-top:0;margin-bottom:14px;">
          ${tabNote} Showing ${displayOrganicRows.length} of ${activeRows.length} for <strong>${getOrganicPortfolioDateLabel()}</strong>. Source rows loaded: Overall ${formatNum(sourceCounts.perf)}, Content Series ${formatNum(sourceCounts.series)}, Brand on Asset ${formatNum(sourceCounts.assets)}.
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr>
            <th class="num">#</th>
            ${isPerf ? sortTh('Brand', 'brand', true) : sortTh(activeTab.entityLabel, 'name', true)}
            ${isPerf ? '' : sortTh('Brand', 'brand', true)}
            ${isPerf ? '' : sortTh(activeTab.countLabel, 'rowCount')}
            ${sortTh('Posts', 'posts')}
            ${sortTh('Views / Impr', 'views')}
            ${sortTh('Engagements', 'engagements')}
            ${sortTh('Eng Rate', 'engRate')}
            ${sortTh('Logo Impr', 'logoImpr')}
            ${sortTh('Brand Value', 'brandValue')}
            ${sortTh('Social Value', 'socialValue')}
            <th class="num">Latest Snapshot</th>
            ${isPerf ? '<th class="num">YoY Brand Value</th>' : ''}
          </tr></thead>
          <tbody>
            ${displayOrganicRows.length ? displayOrganicRows.map((r, i) => {
              const yoy = isPerf ? getZoomphYoY(r.Brand, 'BrandValue', r._reportMonth) : null;
              const yoyCls = !yoy ? 'neutral' : yoy.change >= 0 ? 'up' : 'down';
              const yoyStr = !yoy ? '—' : `<span class="yoy-change ${yoyCls}">${yoy.change >= 0 ? '▲' : '▼'} ${Math.abs(yoy.change*100).toFixed(1)}%</span>`;
              return `<tr class="organic-portfolio-row" data-organic-brand="${escapeHTML(r.Brand || '')}" style="cursor:pointer;">
                <td class="num" style="color:var(--text-muted);">${i+1}</td>
                <td style="text-align:left;font-weight:500;">${escapeHTML(isPerf ? r.Brand : r.Name)}</td>
                ${isPerf ? '' : `<td style="text-align:left;color:var(--text-dim);">${escapeHTML(r.Brand || '—')}</td>`}
                ${isPerf ? '' : `<td class="num">${formatNum(r.rowCount)}</td>`}
                <td class="num">${formatNum(r.OrganicPosts)}</td>
                <td class="num">${formatNum(r.ViewsImpressions)}</td>
                <td class="num">${formatNum(r.Engagements)}</td>
                <td class="num">${r.EngagementRate !== null && r.EngagementRate !== undefined ? formatPct(r.EngagementRate, 2) : '—'}</td>
                <td class="num">${formatNum(r.LogoImpressions)}</td>
                <td class="num" style="font-weight:500;">${formatCurrency(r.BrandValue)}</td>
                <td class="num">${formatCurrency(r.SocialValue)}</td>
                <td class="num" style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;">${r._reportMonth || '—'}</td>
                ${isPerf ? `<td class="num">${yoyStr}</td>` : ''}
              </tr>`;
            }).join('') : `<tr><td colspan="${emptyColspan}" style="text-align:center;color:var(--text-muted);padding:28px;">No rows loaded for ${activeTab.label} in ${getOrganicPortfolioDateLabel()}.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  `;

  // Wire row click-throughs
  document.querySelectorAll('.organic-portfolio-row').forEach(row => {
    row.addEventListener('click', () => {
      const brand = row.dataset.organicBrand;
      if (brand) selectBrandFromSurvey(brand);
    });
  });

  // Wire date mode buttons
  document.querySelectorAll('[data-organic-date-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      organicPortfolioDateMode = btn.dataset.organicDateMode;
      if (organicPortfolioDateMode === 'month' && (!organicPortfolioMonth || organicPortfolioMonth === 'all')) organicPortfolioMonth = latestMonth || 'all';
      if (organicPortfolioDateMode === 'range') {
        if (!organicPortfolioStartMonth) organicPortfolioStartMonth = earliestMonth;
        if (!organicPortfolioEndMonth) organicPortfolioEndMonth = latestMonth || earliestMonth;
      }
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  });

  const monthSelect = document.getElementById('organicMonthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', e => {
      organicPortfolioMonth = e.target.value;
      organicPortfolioDateMode = 'month';
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  }
  const startInput = document.getElementById('organicStartMonth');
  const endInput = document.getElementById('organicEndMonth');
  if (startInput) {
    startInput.addEventListener('change', e => {
      organicPortfolioStartMonth = e.target.value;
      organicPortfolioDateMode = 'range';
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  }
  if (endInput) {
    endInput.addEventListener('change', e => {
      organicPortfolioEndMonth = e.target.value;
      organicPortfolioDateMode = 'range';
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  }

  // Wire sort headers
  document.querySelectorAll('.organic-sort-th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.okey;
      organicPortfolioSortDir = organicPortfolioSortKey === key
        ? (organicPortfolioSortDir === 'asc' ? 'desc' : 'asc')
        : ((key === 'brand' || key === 'name') ? 'asc' : 'desc');
      organicPortfolioSortKey = key;
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  });

  // Wire organic portfolio tab buttons
  document.querySelectorAll('[data-organic-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTab = btn.dataset.organicTab;
      organicPortfolioTab = nextTab;
      organicPortfolioSortKey = nextTab === 'perf' ? 'posts' : 'brandValue';
      organicPortfolioSortDir = 'desc';
      renderOrganicSocialPortfolioPage(main);
      wireInfoIcons();
    });
  });
  wireInfoIcons();
  wireLimitControls();
}

// ============================================================
// PAID SOCIAL PORTFOLIO PAGE
// ============================================================
function getAllPaidFiscalSeasons() {
  const all = getAllPaidRows();
  return [...new Set(all.map(r => r.Season).filter(Boolean))].sort();
}

function getPaidRowsForPeriod(period) {
  const all = getAllPaidRows().filter(r => r.Brand !== UNASSIGNED_PAID_KEY);
  if (!period || period === 'all') return all;
  return all.filter(r => r.Season === period);
}
