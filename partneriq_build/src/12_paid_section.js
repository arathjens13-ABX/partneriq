function renderPaidPortfolioPage(main) {
  const allRows = getAllPaidRows();
  const partnerRows = allRows.filter(r => r.Brand && r.Brand !== UNASSIGNED_PAID_KEY);

  if (!partnerRows.length) {
    main.innerHTML = `<div class="empty-state"><h1>No paid social data loaded.</h1><p>Upload a Facebook Ads Manager CSV to populate this page. Files are detected by the keywords "paid", "meta", "facebook", or "admanager" in the filename.</p></div>`;
    return;
  }

  // -- Date-range filter (replaces the old fiscal-year selector) ----------
  // Discover the months present in the data so we can drive the Month / Range UI.
  const allMonthsSet = new Set();
  partnerRows.forEach(r => {
    if (r.DailyDate instanceof Date && !isNaN(r.DailyDate)) {
      allMonthsSet.add(r.DailyDate.toISOString().slice(0, 7));
    }
  });
  const allDateMonths = [...allMonthsSet].sort();
  const earliestMonth = allDateMonths[0] || '';
  const latestMonth   = allDateMonths[allDateMonths.length - 1] || '';

  if (paidPortfolioDateMode === 'month' && !paidPortfolioMonth) paidPortfolioMonth = latestMonth;
  if (paidPortfolioDateMode === 'range') {
    if (!paidPortfolioStartMonth) paidPortfolioStartMonth = earliestMonth;
    if (!paidPortfolioEndMonth)   paidPortfolioEndMonth   = latestMonth;
  }

  function inActiveDateWindow(dt) {
    if (!(dt instanceof Date) || isNaN(dt)) return paidPortfolioDateMode === 'all';
    const m = dt.toISOString().slice(0, 7);
    if (paidPortfolioDateMode === 'all') return true;
    if (paidPortfolioDateMode === 'month') return m === paidPortfolioMonth;
    if (paidPortfolioDateMode === 'range') {
      const s = paidPortfolioStartMonth || '';
      const e = paidPortfolioEndMonth   || '';
      if (s && m < s) return false;
      if (e && m > e) return false;
      return true;
    }
    return true;
  }

  function filterByActiveDate(rows) {
    if (paidPortfolioDateMode === 'all') return rows;
    return rows.filter(r => inActiveDateWindow(r.DailyDate));
  }

  function shiftMonth(m, deltaMonths) {
    if (!m) return '';
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 1 + deltaMonths, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function dateLabel() {
    if (paidPortfolioDateMode === 'all') return 'All months';
    if (paidPortfolioDateMode === 'month') return paidPortfolioMonth ? formatOrganicMonthLabel(paidPortfolioMonth) : 'All months';
    if (paidPortfolioDateMode === 'range') {
      const s = paidPortfolioStartMonth ? formatOrganicMonthLabel(paidPortfolioStartMonth) : '—';
      const e = paidPortfolioEndMonth   ? formatOrganicMonthLabel(paidPortfolioEndMonth)   : '—';
      return `${s} – ${e}`;
    }
    return 'All months';
  }

  const activeRows = filterByActiveDate(partnerRows);
  const portfolioAgg = paidAggregate(activeRows);

  // ── KPI comparison (YoY or MoM) ─────────────────────────────
  // Compare the active date window against the same window shifted back
  // 12 months (YoY) or 1 month (MoM), but only for partner rows.
  let kpiCompAgg = null, kpiCompLabel = '';
  function rowsInShiftedWindow(deltaMonths) {
    if (paidPortfolioDateMode === 'all') return [];
    if (paidPortfolioDateMode === 'month') {
      const target = shiftMonth(paidPortfolioMonth, deltaMonths);
      return partnerRows.filter(r => {
        if (!(r.DailyDate instanceof Date)) return false;
        return r.DailyDate.toISOString().slice(0,7) === target;
      });
    }
    // range
    const ts = shiftMonth(paidPortfolioStartMonth, deltaMonths);
    const te = shiftMonth(paidPortfolioEndMonth,   deltaMonths);
    return partnerRows.filter(r => {
      if (!(r.DailyDate instanceof Date)) return false;
      const m = r.DailyDate.toISOString().slice(0,7);
      if (ts && m < ts) return false;
      if (te && m > te) return false;
      return true;
    });
  }

  const compDelta = paidPortfolioKpiMode === 'yoy' ? -12 : -1;
  const compRows  = rowsInShiftedWindow(compDelta);
  if (compRows.length) {
    kpiCompAgg = paidAggregate(compRows);
    if (paidPortfolioDateMode === 'month') {
      kpiCompLabel = `vs ${formatOrganicMonthLabel(shiftMonth(paidPortfolioMonth, compDelta))}`;
    } else if (paidPortfolioDateMode === 'range') {
      kpiCompLabel = paidPortfolioKpiMode === 'yoy' ? 'vs prior year same range' : 'vs prior comparable range';
    } else {
      kpiCompLabel = 'vs prior';
    }
  }

  function kpiBadge(curr, prev) {
    const chg = (prev != null && prev > 0) ? (curr - prev) / prev : null;
    if (chg === null || !isFinite(chg)) return `<span class="kpi-change neutral">${kpiCompLabel || '—'}</span>`;
    const cls = chg > 0.0005 ? 'up' : chg < -0.0005 ? 'down' : 'neutral';
    const arrow = chg > 0.0005 ? '▲' : chg < -0.0005 ? '▼' : '•';
    return `<span class="kpi-change ${cls}">${arrow} ${Math.abs(chg * 100).toFixed(1)}% ${kpiCompLabel}</span>`;
  }

  // ── Assignment health ────────────────────────────────────────
  const assignSummary = getPaidAssignmentSummary();
  const needsReview = assignSummary.medium + assignSummary.unassigned;
  const unassignedRows = allRows.filter(r => !r.Brand || r.Brand === UNASSIGNED_PAID_KEY);
  const unassignedSpend = sum(unassignedRows, 'AmountSpentUSD');

  // ── Partner aggregates (table) ───────────────────────────────
  const byPartner = {};
  activeRows.forEach(r => {
    const b = r.Brand;
    if (!b || b === UNASSIGNED_PAID_KEY) return;
    if (!byPartner[b]) byPartner[b] = [];
    byPartner[b].push(r);
  });
  let partnerAggs = Object.entries(byPartner).map(([brand, rows]) => ({ brand, ...paidAggregate(rows) }));
  partnerAggs.sort((a, b) => {
    const dir = paidPortfolioSortDir === 'asc' ? 1 : -1;
    const key = paidPortfolioSortKey || 'impressions';
    const av = key === 'brand' ? String(a.brand || '') : Number(a[key === 'campaigns' ? 'campaignCount' : key] || 0);
    const bv = key === 'brand' ? String(b.brand || '') : Number(b[key === 'campaigns' ? 'campaignCount' : key] || 0);
    return key === 'brand' ? av.localeCompare(bv) * dir : (av - bv) * dir;
  });
  const displayPartnerAggs = limitRowsForTable(partnerAggs, 'paidPortfolio');

  // ── Campaign aggregates (campaign tab) ───────────────────────
  const campaignAggs = aggregatePaidByCampaign(activeRows).sort((a, b) => b.impressions - a.impressions);
  const displayCampaignAggs = limitRowsForTable(campaignAggs, 'paidPortfolio');

  // ── Partner aggregates for the efficiency scatter ───────────
  // The scatter respects both the active date window and the Result Indicator
  // filter — partners who never delivered the chosen result type are excluded.
  const scatterSourceRows = paidPortfolioResultFilter === 'all'
    ? activeRows
    : activeRows.filter(r => (r.ResultIndicator || r['Result indicator']) === paidPortfolioResultFilter);
  const scatterByPartner = {};
  scatterSourceRows.forEach(r => {
    const b = r.Brand;
    if (!b || b === UNASSIGNED_PAID_KEY) return;
    if (!scatterByPartner[b]) scatterByPartner[b] = [];
    scatterByPartner[b].push(r);
  });
  const scatterPartnerAggs = Object.entries(scatterByPartner).map(([brand, rows]) => ({ brand, ...paidAggregate(rows) }));

  // Available result indicators across all partner rows (for the filter dropdown).
  const resultIndicators = [...new Set(partnerRows
    .map(r => r.ResultIndicator || r['Result indicator'])
    .filter(Boolean))].sort();

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Paid Social'}])}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">💰 Paid Social Portfolio</h2>
        <span class="section-meta">Facebook Ads Manager · ${dateLabel()} · ${formatNum(activeRows.length)} daily rows in window</span>
      </div>

      ${needsReview > 0 ? `
      <div style="background:rgba(209,150,150,0.08);border:1px solid var(--negative);border-radius:6px;padding:14px 18px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="font-size:13px;color:var(--text);">
          <strong style="color:var(--negative);">${needsReview} paid campaign${needsReview === 1 ? '' : 's'}</strong>
          need partner assignment review. Unresolved campaigns are excluded from partner spend totals, which may undercount some partners.
        </div>
        <button class="btn" type="button" onclick="openPaidAssignmentReview()">Review assignments →</button>
      </div>` : ''}

      ${unassignedSpend > 0 ? `
      <div class="comparison-basis block" style="margin-bottom:18px;">
        ${formatCurrency(unassignedSpend)} in spend across ${unassignedRows.length} rows is unassigned to any partner and excluded from the table below.
      </div>` : ''}

      <!-- Date range filter (mirrors the Organic Social Portfolio page) -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
        <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Date filter</span>
        <div class="survey-phase-toggle" style="margin:0;">
          ${['all','month','range'].map(mode => `<button type="button" class="${paidPortfolioDateMode === mode ? 'active' : ''}" data-paid-date-mode="${mode}">${mode === 'all' ? 'All months' : mode === 'month' ? 'Month' : 'Range'}</button>`).join('')}
        </div>
        <select id="paidMonthSelect" class="select-control" style="min-width:150px;${paidPortfolioDateMode === 'month' ? '' : 'display:none;'}">
          ${allDateMonths.map(m => `<option value="${m}" ${paidPortfolioMonth === m ? 'selected' : ''}>${formatOrganicMonthLabel(m)}</option>`).join('')}
        </select>
        <div id="paidRangeControls" style="display:${paidPortfolioDateMode === 'range' ? 'flex' : 'none'};align-items:center;gap:6px;">
          <input id="paidStartMonth" type="month" class="select-control" value="${paidPortfolioStartMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
          <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;">to</span>
          <input id="paidEndMonth" type="month" class="select-control" value="${paidPortfolioEndMonth || latestMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
        </div>
        <span class="comparison-basis" style="margin-left:auto;">${partnerAggs.length} partner${partnerAggs.length === 1 ? '' : 's'} in window</span>
      </div>

      <!-- KPI comparison toggle -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
        <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Compare to</span>
        <div class="comparison-toggle">
          <button class="${paidPortfolioKpiMode === 'yoy' ? 'active' : ''}" data-paid-kpi-mode="yoy">YoY</button>
          <button class="${paidPortfolioKpiMode === 'mom' ? 'active' : ''}" data-paid-kpi-mode="mom">MoM</button>
        </div>
        <span class="comparison-basis">${kpiCompLabel || `No prior ${paidPortfolioKpiMode === 'yoy' ? 'fiscal year' : 'month'} to compare`}</span>
      </div>

      <!-- Portfolio KPIs -->
      <div class="kpi-grid" style="margin-bottom:22px;">
        <div class="kpi">
          <span class="kpi-label">Total Spend ${makeInfoIcon('Amount Spent')}</span>
          <span class="kpi-value">${formatCurrency(portfolioAgg.spend)}</span>
          ${kpiBadge(portfolioAgg.spend, kpiCompAgg && kpiCompAgg.spend)}
        </div>
        <div class="kpi">
          <span class="kpi-label">Total Impressions</span>
          <span class="kpi-value">${formatNum(portfolioAgg.impressions)}</span>
          ${kpiBadge(portfolioAgg.impressions, kpiCompAgg && kpiCompAgg.impressions)}
        </div>
        <div class="kpi">
          <span class="kpi-label">Total Reach ${makeInfoIcon('Reported Reach')}</span>
          <span class="kpi-value">${formatNum(portfolioAgg.reach)}</span>
          ${kpiBadge(portfolioAgg.reach, kpiCompAgg && kpiCompAgg.reach)}
        </div>
        <div class="kpi">
          <span class="kpi-label">Avg CTR ${makeInfoIcon('CTR')}</span>
          <span class="kpi-value">${formatPct(portfolioAgg.ctr, 2)}</span>
          ${kpiBadge(portfolioAgg.ctr, kpiCompAgg && kpiCompAgg.ctr)}
        </div>
        <div class="kpi">
          <span class="kpi-label">Avg CPM ${makeInfoIcon('CPM')}</span>
          <span class="kpi-value">${portfolioAgg.cpm > 0 ? '$' + portfolioAgg.cpm.toFixed(2) : '—'}</span>
          ${kpiBadge(portfolioAgg.cpm, kpiCompAgg && kpiCompAgg.cpm)}
        </div>
        <div class="kpi">
          <span class="kpi-label">Total Campaigns</span>
          <span class="kpi-value">${formatNum(portfolioAgg.campaignCount)}</span>
          ${kpiBadge(portfolioAgg.campaignCount, kpiCompAgg && kpiCompAgg.campaignCount)}
        </div>
      </div>

      <!-- Partner / Campaign breakdown with tabs -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="card-title">Partner paid performance breakdown</span>
            <div class="comparison-toggle">
              <button class="${paidPortfolioTableTab === 'partners' ? 'active' : ''}" data-paid-table-tab="partners">Partners</button>
              <button class="${paidPortfolioTableTab === 'campaigns' ? 'active' : ''}" data-paid-table-tab="campaigns">Campaigns</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
            <span class="card-sub">Click headers to sort · Click a row to open the partner page</span>
            ${renderLimitControls('paidPortfolio', paidPortfolioTableTab === 'campaigns' ? campaignAggs.length : partnerAggs.length)}
          </div>
        </div>

        ${paidPortfolioTableTab === 'campaigns' ? `
        <div style="overflow-x:auto;">
          <table class="data-table" id="paidCampaignTable">
            <thead><tr>
              <th class="num">#</th>
              <th style="text-align:left;">Campaign</th>
              <th style="text-align:left;">Partner</th>
              <th class="num">Impressions</th>
              <th class="num">Reach</th>
              <th class="num">CTR</th>
              <th class="num">CPM</th>
              <th class="num">Spend</th>
              <th style="text-align:left;">Objective</th>
            </tr></thead>
            <tbody>
              ${displayCampaignAggs.map((c, i) => `<tr style="cursor:pointer;" onclick="selectBrandFromSurvey('${(c.brand||'').replace(/'/g, "\\'")}')">
                  <td class="num" style="color:var(--text-muted);">${i + 1}</td>
                  <td style="text-align:left;font-weight:500;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</td>
                  <td style="text-align:left;color:var(--text-dim);">${escapeHTML(c.brand || '—')}</td>
                  <td class="num" style="font-weight:500;">${formatNum(c.impressions)}</td>
                  <td class="num">${formatNum(c.reach)}</td>
                  <td class="num">${formatPct(c.ctr, 2)}</td>
                  <td class="num">${c.cpm > 0 ? '$' + c.cpm.toFixed(2) : '—'}</td>
                  <td class="num">${formatCurrency(c.spend)}</td>
                  <td style="text-align:left;color:var(--text-dim);font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(c.objective)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ` : `
        <div style="overflow-x:auto;">
          <table class="data-table" id="paidPortfolioTable">
            <thead><tr>
              <th class="num">#</th>
              ${[
                ['brand', 'Partner', 'text-left'],
                ['impressions', 'Impressions', 'num'],
                ['reach', `Reach ${makeInfoIcon('Reported Reach')}`, 'num'],
                ['ctr', `CTR ${makeInfoIcon('CTR')}`, 'num'],
                ['campaigns', 'Campaigns', 'num'],
                ['cpm', `CPM ${makeInfoIcon('CPM')}`, 'num'],
                ['spend', 'Spend', 'num'],
              ].map(([key, label, cls]) => {
                const active = paidPortfolioSortKey === key;
                const arrow = active ? (paidPortfolioSortDir === 'asc' ? ' ▲' : ' ▼') : '';
                return `<th class="${cls} paid-sort-th" data-sort-key="${key}"
                  style="cursor:pointer;${cls === 'text-left' ? 'text-align:left;' : ''}">${label}${arrow}</th>`;
              }).join('')}
            </tr></thead>
            <tbody>
              ${displayPartnerAggs.map((p, i) => `<tr style="cursor:pointer;" onclick="selectBrandFromSurvey('${p.brand.replace(/'/g, "\\'")}')">
                  <td class="num" style="color:var(--text-muted);">${i + 1}</td>
                  <td style="text-align:left;font-weight:500;">${p.brand}</td>
                  <td class="num" style="font-weight:500;">${formatNum(p.impressions)}</td>
                  <td class="num">${formatNum(p.reach)}</td>
                  <td class="num">${formatPct(p.ctr, 2)}</td>
                  <td class="num">${formatNum(p.campaignCount)}</td>
                  <td class="num">${p.cpm > 0 ? '$' + p.cpm.toFixed(2) : '—'}</td>
                  <td class="num">${formatCurrency(p.spend)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>

      <!-- Partner efficiency — full width, filterable by Result indicator -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="flex-wrap:wrap;gap:10px;">
          <div>
            <span class="card-title">Partner efficiency ${makeInfoIcon('CPM')}</span>
            <span class="card-sub">${paidPortfolioResultFilter === 'all' ? 'CTR' : paidPortfolioResultFilter} vs CPM · Bubble = spend · Lower-right = most efficient · ${dateLabel()}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Result</span>
            <select id="paidResultFilter" class="select-control" style="min-width:200px;">
              <option value="all" ${paidPortfolioResultFilter === 'all' ? 'selected' : ''}>All — CTR on X-axis</option>
              ${resultIndicators.map(ri => `<option value="${escapeHTML(ri)}" ${paidPortfolioResultFilter === ri ? 'selected' : ''}>${escapeHTML(ri)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:6px;">
          ${renderPaidEfficiencyScatter(scatterPartnerAggs, paidPortfolioResultFilter)}
        </div>
      </div>

    </section>
  `;

  // Wire date range filter
  document.querySelectorAll('[data-paid-date-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      paidPortfolioDateMode = btn.dataset.paidDateMode;
      if (paidPortfolioDateMode === 'month' && !paidPortfolioMonth) paidPortfolioMonth = latestMonth;
      if (paidPortfolioDateMode === 'range') {
        if (!paidPortfolioStartMonth) paidPortfolioStartMonth = earliestMonth;
        if (!paidPortfolioEndMonth)   paidPortfolioEndMonth   = latestMonth;
      }
      renderPaidPortfolioPage(main);
      wireInfoIcons();
    });
  });
  const paidMonthSel = document.getElementById('paidMonthSelect');
  if (paidMonthSel) paidMonthSel.addEventListener('change', e => {
    paidPortfolioMonth = e.target.value;
    paidPortfolioDateMode = 'month';
    renderPaidPortfolioPage(main);
    wireInfoIcons();
  });
  const paidStart = document.getElementById('paidStartMonth');
  if (paidStart) paidStart.addEventListener('change', e => {
    paidPortfolioStartMonth = e.target.value;
    paidPortfolioDateMode = 'range';
    renderPaidPortfolioPage(main);
    wireInfoIcons();
  });
  const paidEnd = document.getElementById('paidEndMonth');
  if (paidEnd) paidEnd.addEventListener('change', e => {
    paidPortfolioEndMonth = e.target.value;
    paidPortfolioDateMode = 'range';
    renderPaidPortfolioPage(main);
    wireInfoIcons();
  });

  // Wire KPI mode toggle
  document.querySelectorAll('[data-paid-kpi-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      paidPortfolioKpiMode = btn.dataset.paidKpiMode;
      renderPaidPortfolioPage(main);
      wireInfoIcons();
    });
  });

  // Wire table tab toggle
  document.querySelectorAll('[data-paid-table-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      paidPortfolioTableTab = btn.dataset.paidTableTab;
      renderPaidPortfolioPage(main);
      wireInfoIcons();
    });
  });

  // Wire result filter on partner efficiency chart
  const paidResultFilter = document.getElementById('paidResultFilter');
  if (paidResultFilter) paidResultFilter.addEventListener('change', e => {
    paidPortfolioResultFilter = e.target.value;
    renderPaidPortfolioPage(main);
    wireInfoIcons();
  });

  // Wire interactive bubbles on partner efficiency chart
  wirePaidEfficiencyScatter();

  // Wire sortable column headers
  document.querySelectorAll('.paid-sort-th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (paidPortfolioSortKey === key) {
        paidPortfolioSortDir = paidPortfolioSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        paidPortfolioSortKey = key;
        paidPortfolioSortDir = key === 'brand' ? 'asc' : 'desc';
      }
      renderPaidPortfolioPage(main);
      wireInfoIcons();
    });
  });

  wireInfoIcons();
  wireLimitControls();
}


// ============================================================
// PAID SOCIAL — DAILY DATA VISUALIZATIONS
// Uses the Day column (daily rows) for time-series charts.
// ============================================================

// ---- 1. Campaign Flight Gantt chart ----
// Rows = distinct campaigns, X-axis = date range, bars from Starts→Ends.
// Each bar is colored by objective. Hover shows full campaign details.

// ============================================================
// PAID MULTI-CAMPAIGN CHART
// All campaigns for a brand on one chart, each as its own line.
// Filterable via checkboxes. No YoY overlay.
// ============================================================
const _campaignChartHidden = {}; // brand -> Set of hidden campaign names
const _pacingMetricKey = {};
function getPacingMetricKey(brand) { return _pacingMetricKey[brand] || 'Impressions'; }
function setPacingMetricKey(brand, key) { _pacingMetricKey[brand] = key; }

function renderPaidMultiCampaignChart(brand, period, metricKeyOverride) {
  const metricKey = metricKeyOverride || getPacingMetricKey(brand);
  const metric = PAID_PACING_METRICS.find(m => m.key === metricKey) || PAID_PACING_METRICS[0];
  const brandId = brand.replace(/[^a-z0-9]/gi, '_');
  if (!_campaignChartHidden[brandId]) _campaignChartHidden[brandId] = new Set();
  const hidden = _campaignChartHidden[brandId];

  const allRows = getBrandPaidDailyRows(brand, period);
  if (!allRows.length) return `<div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px;">
    No daily data. Ensure the Day column is present in your export.</div>`;

  // Group rows by campaign
  const byCampaign = {};
  allRows.forEach(r => {
    const key = r.CampaignName || 'Unknown';
    if (!byCampaign[key]) byCampaign[key] = [];
    byCampaign[key].push(r);
  });
  const allCampaigns = Object.keys(byCampaign).sort();
  const visibleCampaigns = allCampaigns.filter(c => !hidden.has(c));

  // Build daily totals per day across all visible campaigns (stacked)
  // Determine fiscal year date range to fix X axis to full FY
  const activeSeason = period === 'all' ? getPaidSeasons(brand).slice(-1)[0] : period;
  let fyStart, fyEnd;
  if (activeSeason && /^\d{4}-\d{2}$/.test(activeSeason)) {
    const [y1] = activeSeason.split('-').map(Number);
    fyStart = new Date(y1, 6, 1);   // July 1 of first year
    fyEnd   = new Date(y1 + 1, 5, 30); // June 30 of next year
  } else {
    // Fallback: use actual data range
    const allD = allRows.map(r => r.DailyDate.getTime()).filter(Boolean);
    fyStart = new Date(Math.min(...allD));
    fyEnd   = new Date(Math.max(...allD));
  }

  // Build complete day range for the fiscal year
  const fyDays = [];
  const dayCursor = new Date(fyStart);
  while (dayCursor <= fyEnd) { fyDays.push(dayCursor.toISOString().slice(0,10)); dayCursor.setDate(dayCursor.getDate()+1); }

  const allDays = fyDays; // Use full fiscal year, not just days with data

  if (!allDays.length) return `<div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px;">All campaigns filtered out.</div>`;

  // Per-day per-campaign values
  const dayMap = {};
  allDays.forEach(d => { dayMap[d] = {}; visibleCampaigns.forEach(c => { dayMap[d][c] = 0; }); });
  allRows.forEach(r => {
    const key = r.CampaignName || 'Unknown';
    if (hidden.has(key)) return;
    const d = r.DailyDate.toISOString().slice(0, 10);
    if (dayMap[d]) dayMap[d][key] = (dayMap[d][key] || 0) + (Number(r[metric.rowKey]) || 0);
  });

  // Daily totals + cumulative
  let running = 0;
  const dayTotals = allDays.map(d => {
    const total = visibleCampaigns.reduce((s, c) => s + (dayMap[d][c] || 0), 0);
    running += total;
    return { date: d, total, cumulative: running, breakdown: { ...dayMap[d] } };
  });

  const maxVal = Math.max(...dayTotals.map(d => d.total)) * 1.12 || 1;

  const W = 900, H = 260;
  const pL = 68, pR = 16, pT = 20, pB = 44;
  const cW = W - pL - pR, cH = H - pT - pB;
  const n = dayTotals.length;
  const barW = Math.max(2, Math.min(18, (cW / n) * 0.75));
  const xScale = i => pL + (i / Math.max(1, n - 1)) * cW;
  const yScale = v => pT + (1 - v / maxVal) * cH;

  // Distinct colors for each campaign — much easier to tell apart than opacity shades
  const CAMPAIGN_COLORS = ['#6eb5ff','#79d4a0','#f0a96e','#e07b7b','#c49dea','#f7c948','#7ecfd4','#e88cbf','#a3c97a','#e9a06e'];
  const getColor = i => CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length];

  // Month ticks
  let lastMo = '';
  const moTicks = [];
  dayTotals.forEach((d, i) => {
    const mo = d.date.slice(0, 7);
    if (mo !== lastMo) { lastMo = mo; moTicks.push({ i, label: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) }); }
  });

  const yTicks = [0, maxVal * 0.5, maxVal];
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;" id="bar-chart-svg-${brandId}">`;

  yTicks.forEach(v => {
    const y = yScale(v);
    svg += `<line stroke="var(--border-soft)" stroke-width="1" stroke-dasharray="2 3" x1="${pL}" x2="${W-pR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    svg += `<text x="${pL-6}" y="${(y+4).toFixed(1)}" text-anchor="end" style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">${metric.fmt(v)}</text>`;
  });
  moTicks.forEach(t => {
    const x = xScale(t.i);
    svg += `<line stroke="var(--border-soft)" stroke-width="1" x1="${x.toFixed(1)}" y1="${pT}" x2="${x.toFixed(1)}" y2="${H-pB}"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${H-pB+16}" text-anchor="middle" style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">${t.label}</text>`;
  });
  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${H-pB}" x2="${W-pR}" y2="${H-pB}"/>`;
  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${pT}" x2="${pL}" y2="${H-pB}"/>`;

  // Stacked bars + invisible hover rects
  dayTotals.forEach((d, i) => {
    const x = xScale(i) - barW / 2;
    let yBase = H - pB;
    visibleCampaigns.forEach((camp, ci) => {
      const v = d.breakdown[camp] || 0;
      if (v <= 0) return;
      const barH = Math.max(1, (H - pB) - yScale(v) + pT - pT);
      const segH = cH * (v / maxVal);
      svg += `<rect x="${x.toFixed(1)}" y="${(yBase - segH).toFixed(1)}" width="${barW.toFixed(1)}" height="${segH.toFixed(1)}"
        fill="${getColor(ci)}" fill-opacity="0.85" rx="1"/>`;
      yBase -= segH;
    });

    // Wide invisible hover zone covering the full bar height
    const totalBarH = cH * (d.total / maxVal);
    const breakdownStr = visibleCampaigns.map(c => `${c.length > 20 ? c.slice(0,18)+'\u2026' : c}: ${metric.fmt(d.breakdown[c]||0)}`).join('|');
    svg += `<rect class="bar-hover" x="${(x-2).toFixed(1)}" y="${(yScale(d.total)).toFixed(1)}"
      width="${(barW+4).toFixed(1)}" height="${(totalBarH+4).toFixed(1)}"
      fill="transparent" style="cursor:pointer;"
      data-date="${new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}"
      data-total="${metric.fmt(d.total)}"
      data-cumulative="${metric.fmt(d.cumulative)}"
      data-breakdown="${breakdownStr.replace(/"/g,'&quot;')}"/>`;
  });

  svg += `</svg>`;

  // Campaign filter checkboxes
  const filterHtml = `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;">
    ${allCampaigns.map((name, ci) => {
      const checked = !hidden.has(name);
      const shortN = name.length > 40 ? name.slice(0,38)+'\u2026' : name;
      const color = getColor(ci);
      return `<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:var(--font-mono);font-size:10px;
        color:${checked ? 'var(--text)' : 'var(--text-muted)'};padding:4px 10px;border-radius:4px;
        border:1px solid ${checked ? color : 'var(--border-soft)'};
        background:${checked ? 'rgba(0,0,0,0.15)' : 'transparent'};">
        <span style="width:10px;height:10px;border-radius:2px;background:${color};opacity:${checked ? 1 : 0.3};flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
          ${checked ? '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1.5 4 3 5.5 6.5 2.5" stroke="black" stroke-width="1.3" stroke-linecap="round"/></svg>' : ''}
        </span>
        <input type="checkbox" style="display:none;" ${checked ? 'checked' : ''}
          data-mc-campaign="${name.replace(/"/g,'&quot;')}"
          data-mc-brand="${brand.replace(/"/g,'&quot;')}"
          data-mc-period="${period}">
        ${shortN}
      </label>`;
    }).join('')}
  </div>`;

  return `
    <div style="position:relative;" id="multi-pacing-wrap-${brandId}">
      ${svg}
      <div class="quadrant-hover" id="multi-pacing-hover-${brandId}" style="position:absolute;display:none;pointer-events:none;"></div>
    </div>
    ${filterHtml}
    <div class="leaderboard-note" style="margin-top:10px;">
      Each bar = one day's total ${metric.label.toLowerCase()} across visible campaigns. Hover for daily breakdown and running cumulative.
    </div>`;
}


// Wire hover and filter for multi-campaign chart
function wireMultiPacingChart(brand, period) {
  const brandId = brand.replace(/[^a-z0-9]/gi, '_');
  const wrap = document.getElementById('multi-pacing-wrap-' + brandId);
  const hover = document.getElementById('multi-pacing-hover-' + brandId);

  if (wrap && hover) {
    wrap.querySelectorAll('.bar-hover').forEach(bar => {
      bar.addEventListener('mouseenter', () => {
        hover.style.display = 'block';
        const breakdown = (bar.dataset.breakdown || '').split('|')
          .filter(Boolean)
          .map(s => { const [label, val] = s.split(': '); return `<div class="hover-row"><span>${label}</span><span class="val">${val}</span></div>`; })
          .join('');
        hover.innerHTML = `
          <div class="hover-title">${bar.dataset.date}</div>
          <div class="hover-row" style="border-bottom:1px solid var(--border-soft);margin-bottom:5px;padding-bottom:5px;">
            <span>Daily total</span><span class="val">${bar.dataset.total}</span></div>
          ${breakdown}
          <div class="hover-row" style="border-top:1px solid var(--border-soft);margin-top:5px;padding-top:5px;">
            <span>Cumulative</span><span class="val">${bar.dataset.cumulative}</span></div>`;
        hover.classList.add('visible');
      });
      bar.addEventListener('mousemove', e => {
        const r = wrap.getBoundingClientRect();
        let x = e.clientX - r.left + 12, y = e.clientY - r.top - 20;
        const hr = hover.getBoundingClientRect();
        if (x + hr.width > r.width) x = e.clientX - r.left - hr.width - 12;
        if (y < 0) y = 4;
        hover.style.left = x + 'px'; hover.style.top = y + 'px';
      });
      bar.addEventListener('mouseleave', () => { hover.classList.remove('visible'); hover.style.display = 'none'; });
    });
  }

  // Campaign filter checkboxes
  document.querySelectorAll('[data-mc-brand="' + brand + '"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (!_campaignChartHidden[brandId]) _campaignChartHidden[brandId] = new Set();
      if (cb.checked) _campaignChartHidden[brandId].delete(cb.dataset.mcCampaign);
      else _campaignChartHidden[brandId].add(cb.dataset.mcCampaign);
      const inner = document.getElementById('paid-pacing-inner-' + brandId);
      if (inner) {
        const key = getPacingMetricKey(brand);
        inner.innerHTML = renderPaidMultiCampaignChart(brand, period, key);
        wireMultiPacingChart(brand, period);
      }
    });
  });

  // Metric toggle buttons (already wired by wirePacingChart, but need to call renderPaidMultiCampaignChart)
  document.querySelectorAll('[data-pacing-brand="' + brand + '"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.pacingMetric;
      setPacingMetricKey(brand, key);
      const inner = document.getElementById('paid-pacing-inner-' + brandId);
      if (inner) {
        inner.innerHTML = renderPaidMultiCampaignChart(brand, period, key);
        wireMultiPacingChart(brand, period);
        wireInfoIcons();
        document.querySelectorAll('[data-pacing-brand="' + brand + '"]').forEach(b => {
          b.classList.toggle('active', b.dataset.pacingMetric === key);
        });
      }
    });
  });
}


// Hidden campaign names per brand (Set of campaign name strings)
const _ganttHiddenCampaigns = {};


// Wire Gantt hover and filter checkboxes. Called after section renders.



// ---- 2. Daily spend pacing chart (current FY vs prior FY cumulative) ----
// Same concept as the TV Pace Chart — shows whether spend is tracking
// ahead or behind vs the same point last year.
// Metric configs for the toggleable pacing chart
const PAID_PACING_METRICS = [
  { key: 'Impressions',   rowKey: 'Impressions',   label: 'Impressions', fmt: formatNum },
  { key: 'Spend',         rowKey: 'AmountSpentUSD', label: 'Spend',       fmt: formatCurrency },
  { key: 'Reach',         rowKey: 'Reach',          label: 'Reach',       fmt: formatNum },
  { key: 'LinkClicks',    rowKey: 'LinkClicks',     label: 'Link Clicks', fmt: formatNum },
  { key: 'Results',       rowKey: 'Results',        label: 'Results',     fmt: formatNum },
];

// Current metric key per brand — stored so toggle persists while section is open
const _paidPacingMetric = {};





// Wires hover tooltips and metric toggle for pacing chart. Called after section renders.



function renderPaidSection(brand) {
  const rows = getBrandPaidData(brand, currentPeriod);
  if (!rows.length) return renderPaidPlaceholder();

  const agg = paidAggregate(rows);
  const spendYoY = getPaidYoY(brand, currentPeriod, 'AmountSpentUSD');
  const impYoY = getPaidYoY(brand, currentPeriod, 'Impressions');
  const ctrYoY = getPaidYoY(brand, currentPeriod, 'CTR');

  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Campaigns</span>
      <span class="value">${formatNum(agg.campaignCount)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Impressions</span>
      <span class="value">${formatNum(agg.impressions)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">CTR</span>
      <span class="value">${formatPct(agg.ctr, 2)}</span>
    </div>
  `;

  const sectionId = 'section-paid';
  const isOpen = !!openSections[sectionId];
  const fiscalNote = currentPeriod === 'all'
    ? 'All fiscal years loaded'
    : `Fiscal year ${currentPeriod} · July 1 to June 30`;

  document.getElementById('paid-slot').innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Paid Social</div>
          <div class="section-meta" style="margin-top: 2px;">${agg.campaignCount} Campaign${agg.campaignCount === 1 ? '' : 's'} · ${fiscalNote}</div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>

      <div class="section-body">
        <div style="margin-bottom:18px;display:flex;justify-content:flex-end;">
          ${(() => { const ps = getPaidAssignmentSummary(); return ps.medium || ps.unassigned ? `<button class="btn" type="button" onclick="openPaidAssignmentReview()">Review ${formatNum(ps.medium + ps.unassigned)} paid assignment${ps.medium + ps.unassigned === 1 ? '' : 's'}</button>` : ''; })()}
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">Impressions ${makeInfoIcon('Impressions')}</span>
            <span class="kpi-value">${formatNum(agg.impressions)}</span>
            ${impYoY ? `<span class="kpi-change ${impYoY.change >= 0 ? 'up' : 'down'}">${impYoY.change >= 0 ? '▲' : '▼'} ${Math.abs(impYoY.change * 100).toFixed(1)}% YoY</span>` : '<span class="kpi-change neutral">Paid delivery</span>'}
          </div>
          <div class="kpi">
            <span class="kpi-label">Reported Reach ${makeInfoIcon('Reported Reach')}</span>
            <span class="kpi-value">${formatNum(agg.reach)}</span>
            <span class="kpi-change neutral">Summed from export rows</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Link Clicks</span>
            <span class="kpi-value">${formatNum(agg.clicks)}</span>
            <span class="kpi-change neutral">${formatNum(agg.uniqueClicks)} unique clicks</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">CTR ${makeInfoIcon('CTR')}</span>
            <span class="kpi-value">${formatPct(agg.ctr, 2)}</span>
            ${ctrYoY ? `<span class="kpi-change ${ctrYoY.change >= 0 ? 'up' : 'down'}">${ctrYoY.change >= 0 ? '▲' : '▼'} ${Math.abs((ctrYoY.curr - ctrYoY.prev) * 100).toFixed(2)}% YoY</span>` : '<span class="kpi-change neutral">Link CTR</span>'}
          </div>
          <div class="kpi">
            <span class="kpi-label">Results ${makeInfoIcon('Results')}</span>
            <span class="kpi-value">${formatNum(agg.results)}</span>
            <span class="kpi-change neutral">${agg.resultIndicatorLabel}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Campaigns</span>
            <span class="kpi-value">${formatNum(agg.campaignCount)}</span>
            <span class="kpi-change neutral">This period</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">CPM ${makeInfoIcon('CPM')}</span>
            <span class="kpi-value">${formatCurrency(agg.cpm)}</span>
            <span class="kpi-change neutral">Cost / 1K impressions</span>
          </div>
        </div>

        <!-- Multi-campaign pacing chart -->
        <div class="card" style="margin-top: 18px;">
          <div class="card-header">
            <span class="card-title">Campaign pacing by day</span>
            <div style="display:flex;align-items:center;gap:8px;margin-left:auto;">
              <div class="comparison-toggle">
                ${PAID_PACING_METRICS.map(m => `<button
                  class="${m.key === (getPacingMetricKey(brand)) ? 'active' : ''}"
                  data-pacing-metric="${m.key}"
                  data-pacing-brand="${brand.replace(/"/g,'&quot;')}"
                  type="button">${m.label}</button>`).join('')}
              </div>
            </div>
          </div>
          <div id="paid-pacing-inner-${brand.replace(/[^a-z0-9]/gi,'_')}">
            ${renderPaidMultiCampaignChart(brand, currentPeriod, getPacingMetricKey(brand))}
          </div>
        </div>

        <!-- Campaign table -->
        <div class="card" style="margin-top: 18px;">
          <div class="card-header">
            <span class="card-title">Campaign performance ${makeInfoIcon('Cost per Result')}</span>
            <span class="card-sub">Facebook Ads Manager export</span>
          </div>
          ${renderPaidCampaignTable(rows)}
        </div>
      </div>
    </section>
  `;

  if (isOpen) {
    // Wire interactive elements after DOM is ready
    requestAnimationFrame(() => {
      wireMultiPacingChart(brand, currentPeriod);
      wireSectionToggles();
      wireInfoIcons();
    });
  }
}

function renderPaidCampaignTable(rows) {
  const campaignRows = aggregatePaidByCampaign(rows);
  const columns = [
    { label: 'Campaign', cls: 'text-left', sortKey: 'campaign', sortValue: r => r.name, render: r => `<span title="${String(r.name).replace(/"/g, '&quot;')}">${r.name}</span>` },
    { label: 'Objective', cls: 'text-left', sortKey: 'objective', sortValue: r => r.objective, render: r => r.objective },
    { label: 'Platform', cls: 'text-left', sortKey: 'platform', sortValue: r => r.platform, render: r => r.platform },
    { label: 'Confidence', cls: '', sortKey: 'confidence', sortValue: r => r.confidenceLabel, render: r => confidenceBadge(String(r.confidenceLabel || '').toLowerCase() === 'review' ? 'review' : String(r.confidenceLabel || '').toLowerCase() === 'medium' ? 'medium' : 'high') },
    { label: 'Delivery', cls: 'text-left', sortKey: 'delivery', sortValue: r => r.delivery, render: r => r.delivery },
    { label: 'Impressions', cls: 'num sep', sortKey: 'impressions', sortValue: r => r.impressions, render: r => formatNum(r.impressions) },
    { label: `Reach ${makeInfoIcon('Reported Reach')}`, cls: 'num', sortKey: 'reach', sortValue: r => r.reach, render: r => formatNum(r.reach) },
    { label: 'Link Clicks', cls: 'num', sortKey: 'clicks', sortValue: r => r.clicks, render: r => formatNum(r.clicks) },
    { label: `CTR ${makeInfoIcon('CTR')}`, cls: 'num', sortKey: 'ctr', sortValue: r => r.ctr, render: r => formatPct(r.ctr, 2) },
    { label: `Results ${makeInfoIcon('Results')}`, cls: 'num', sortKey: 'results', sortValue: r => r.results, render: r => formatNum(r.results) },
    { label: 'Result Type', cls: 'text-left', sortKey: 'indicator', sortValue: r => r.indicator, render: r => r.indicator },
    { label: `Spend ${makeInfoIcon('Amount Spent')}`, cls: 'num', sortKey: 'spend', sortValue: r => r.spend, render: r => formatCurrency(r.spend) },
    { label: `CPM ${makeInfoIcon('CPM')}`, cls: 'num', sortKey: 'cpm', sortValue: r => r.cpm, render: r => formatCurrency(r.cpm) },
    { label: `CPC ${makeInfoIcon('CPC')}`, cls: 'num', sortKey: 'cpc', sortValue: r => r.cpc, render: r => r.cpc ? formatCurrency(r.cpc) : '—' },
  ];
  return renderSimpleLeaderboardTable(campaignRows, columns, 'paidCampaignTable');
}

function renderPaidPlaceholder() {
  const sectionId = 'section-paid';
  const isOpen = !!openSections[sectionId];
  document.getElementById('paid-slot').innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Paid Social</div>
          <div class="section-meta" style="margin-top: 2px;">Channel registered · No paid rows loaded for this period</div>
        </div>
        <div class="section-toggle-meta">
          <span class="section-summary-empty">no data loaded</span>
        </div>
      </button>
      <div class="section-body">
        <div class="section-unavailable">Paid social support is ready. Upload a Facebook Ads Manager CSV with Starts, Ends, Campaign name, Results, Reach, Impressions, Link clicks, CTR, and Amount spent (USD). Reporting starts / Reporting ends can be included, but they are treated as the export window.</div>
      </div>
    </section>
  `;
}

function renderSurveyPlaceholder() {
  const sectionId = 'section-survey';
  const isOpen = !!openSections[sectionId];
  document.getElementById('survey-slot').innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Survey Research</div>
          <div class="section-meta" style="margin-top: 2px;">Channel registered · Awaiting data schema</div>
        </div>
        <div class="section-toggle-meta">
          <span class="section-summary-empty">no data loaded</span>
        </div>
      </button>
      <div class="section-body">
        <div class="section-unavailable">Survey data support is scaffolded. Share your survey file schema and this section will populate.</div>
      </div>
    </section>
  `;
}

// ============================================================
// BRAND SEARCH
// ============================================================
function updateBrandDropdown(query = '') {
  const dropdown = document.getElementById('brandDropdown');
  const allBrands = DataStore.getBrandList();
  // If a partner roster is loaded, only show current partners in the dropdown
  const rosterActive = DataStore.partnerRoster && DataStore.partnerRoster.length > 0;
  const brandsToShow = rosterActive ? allBrands.filter(b => isCurrentPartner(b)) : allBrands;
  const filtered = query
    ? brandsToShow.filter(b => b.toLowerCase().includes(query.toLowerCase()))
    : brandsToShow;

  if (!filtered.length) {
    dropdown.innerHTML = `<div class="brand-option" style="color: var(--text-muted); cursor: default;">No brands match</div>`;
    dropdown.classList.add('active');
    return;
  }

  dropdown.innerHTML = filtered.map(b => {
    const chs = DataStore.channelsByBrand[b] || {};
    const tags = [chs.tv && 'TV', chs.organic && 'SOC', chs.paid && 'PAID', chs.survey && 'SRV'].filter(Boolean).join(' · ');
    const rosterDot = (DataStore.partnerRoster.length && isCurrentPartner(b))
      ? `<span class="brand-option-roster-dot" title="Current partner"></span>` : '';
    return `<div class="brand-option ${b === currentBrand ? 'selected' : ''}" data-brand="${b.replace(/"/g, '&quot;')}">
      <span style="display:flex;align-items:center;gap:6px;">${renderPartnerLogo(b, 20)}<span>${b}${rosterDot}</span></span><span class="brand-option-channels">${tags}</span>
    </div>`;
  }).join('');

  dropdown.querySelectorAll('.brand-option').forEach(el => {
    el.addEventListener('click', () => {
      currentBrand = el.dataset.brand;
      currentPage = 'brand';
      currentPeriod = null; // reset so it defaults to latest
      openSections = {};    // collapsed by default on brand switch (cheapest behavior)
      document.getElementById('brandSearch').value = currentBrand;
      dropdown.classList.remove('active');
      renderApp();
    });
  });

  dropdown.classList.add('active');
}

// ============================================================
// FILE INGESTION
// ============================================================

// ============================================================
// SURVEY & PARTNER ROSTER HELPERS
