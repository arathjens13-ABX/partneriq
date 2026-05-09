// ORGANIC SOCIAL (ZOOMPH) — 3-file ingestion & rendering
// ============================================================

// -- Normalization --
function parseZoomphNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[,%$]/g, '').trim());
  return isNaN(n) ? null : n;
}
function parseZoomphPct(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace('%', '').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n > 1 ? n / 100 : n;
}

function normalizeZoomphRow(row, fileType) {
  const name = String(row.Name || row.name || '').trim();
  const reportDate = parseDateValue(row.ReportDate || row.reportDate || row.report_date || '');
  const brand = fileType === 'zoomphBrand'
    ? resolveCanonicalBrandName(name)
    : extractZoomphBrand(name);

  return {
    Name: name,
    Brand: brand || name,
    FileType: fileType,
    ReportDate: reportDate,
    _reportMonth: reportDate ? `${reportDate.getFullYear()}-${String(reportDate.getMonth()+1).padStart(2,'0')}` : '',
    _reportYear: reportDate ? reportDate.getFullYear() : null,
    OrganicPosts:          parseZoomphNum(row['Organic Posts']),
    Engagements:           parseZoomphNum(row.Engagements),
    ViewsImpressions:      parseZoomphNum(row['Views/Impressions']),
    SocialValue:           parseZoomphNum(row['Social Value']),
    LogoImpressions:       parseZoomphNum(row['Logo Impressions']),
    BrandValue:            parseZoomphNum(row['Brand Value']),
    EngagementRate:        parseZoomphPct(row['Engagement Rate']),
    VideoViews:            parseZoomphNum(row['Video Views']),
    FollowerInteractionRate: parseZoomphPct(row['Follower Interaction Rate']),
    BrandContentScore:     parseZoomphNum(row['Brand Content Score']),
  };
}

// Extracts brand from a compound name like "Alaska The Trail" or "Alaska Airlines On Court Signage"
// Uses prefix matching against known canonical brand names + all alias keys, longest first.
// This handles BrandedContentSeries and BrandOnAsset where the brand name
// is embedded as a prefix in the row's Name column.
function extractZoomphBrand(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  // Try exact match first (after alias resolution)
  const direct = resolveCanonicalBrandName(name);
  if (DataStore.brands && DataStore.brands.has(direct)) return direct;

  // Build comprehensive candidate set from all alias sources + known canonical brands:
  // BRAND_ALIAS_DEFAULTS, PAID_SOCIAL_PARTNER_ALIASES, DataStore custom rules, DataStore.brands
  const candidates = new Set();
  const addFromMap = map => {
    if (!map) return;
    Object.keys(map).forEach(k => candidates.add(k));
    Object.values(map).forEach(v => v && candidates.add(v));
  };
  addFromMap(BRAND_ALIAS_DEFAULTS);
  if (typeof PAID_SOCIAL_PARTNER_ALIASES !== 'undefined') addFromMap(PAID_SOCIAL_PARTNER_ALIASES);
  if (DataStore.brandMergeRules) addFromMap(DataStore.brandMergeRules);
  if (DataStore.brands) [...DataStore.brands].forEach(b => candidates.add(b));

  // Sort longest-first so more specific names win over shorter ones
  // (e.g. "Alaska Airlines" before "Alaska", "Michelob Ultra" before "Michelob")
  const sorted = [...candidates]
    .filter(c => c && c.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const candidate of sorted) {
    if (lower.startsWith(candidate.toLowerCase())) {
      // Resolve the matched candidate to its canonical name
      return resolveCanonicalBrandName(candidate);
    }
  }
  return null; // unresolved — will display as raw Name
}

// -- Partner-page organic date filter state --
// Mirrors the date filter UX from the Organic Social Portfolio page so AMs
// can roll up KPI totals across all months, a single month, or a custom range.
let partnerOrganicDateMode   = 'all';   // 'all' | 'month' | 'range'
let partnerOrganicMonth      = '';      // YYYY-MM
let partnerOrganicStartMonth = '';      // YYYY-MM
let partnerOrganicEndMonth   = '';      // YYYY-MM

function filterZoomphRowsByPartnerDate(rows) {
  if (!rows || !rows.length) return [];
  if (partnerOrganicDateMode === 'all') return rows.slice();
  if (partnerOrganicDateMode === 'month') {
    if (!partnerOrganicMonth) return rows.slice();
    return rows.filter(r => r._reportMonth === partnerOrganicMonth);
  }
  if (partnerOrganicDateMode === 'range') {
    const s = partnerOrganicStartMonth || '';
    const e = partnerOrganicEndMonth   || '';
    return rows.filter(r => {
      const m = r._reportMonth || '';
      if (s && m < s) return false;
      if (e && m > e) return false;
      return true;
    });
  }
  return rows.slice();
}

function getPartnerOrganicDateLabel() {
  if (partnerOrganicDateMode === 'all') return 'All months';
  if (partnerOrganicDateMode === 'month') {
    return partnerOrganicMonth ? formatOrganicMonthLabel(partnerOrganicMonth) : 'All months';
  }
  if (partnerOrganicDateMode === 'range') {
    const s = partnerOrganicStartMonth ? formatOrganicMonthLabel(partnerOrganicStartMonth) : '—';
    const e = partnerOrganicEndMonth   ? formatOrganicMonthLabel(partnerOrganicEndMonth)   : '—';
    return `${s} – ${e}`;
  }
  return 'All months';
}

// Aggregate organic KPI totals across the supplied rows. Sums where additive,
// computes weighted engagement rate from the totals.
function aggregateZoomphTotals(rows) {
  const totals = {
    OrganicPosts:     0,
    Engagements:      0,
    ViewsImpressions: 0,
    SocialValue:      0,
    LogoImpressions:  0,
    BrandValue:       0,
    VideoViews:       0,
    snapshots:        rows.length,
  };
  rows.forEach(r => {
    totals.OrganicPosts     += r.OrganicPosts     || 0;
    totals.Engagements      += r.Engagements      || 0;
    totals.ViewsImpressions += r.ViewsImpressions || 0;
    totals.SocialValue      += r.SocialValue      || 0;
    totals.LogoImpressions  += r.LogoImpressions  || 0;
    totals.BrandValue       += r.BrandValue       || 0;
    totals.VideoViews       += r.VideoViews       || 0;
  });
  totals.EngagementRate = totals.ViewsImpressions > 0 ? totals.Engagements / totals.ViewsImpressions : null;
  return totals;
}

// Compute YoY for an aggregate metric by shifting the active window back 12 months
// and aggregating again. Returns null when the prior window has no data.
function getZoomphTotalsYoY(brand, metric) {
  if (partnerOrganicDateMode === 'all') return null; // YoY not meaningful across all-time
  const allRows = (DataStore.zoomphBrandPerf || []).filter(r => r.Brand === brand);
  const shiftMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `${Number(y) - 1}-${mo}`;
  };
  let priorRows = [];
  if (partnerOrganicDateMode === 'month') {
    const pm = shiftMonth(partnerOrganicMonth);
    priorRows = allRows.filter(r => r._reportMonth === pm);
  } else if (partnerOrganicDateMode === 'range') {
    const ps = shiftMonth(partnerOrganicStartMonth);
    const pe = shiftMonth(partnerOrganicEndMonth);
    priorRows = allRows.filter(r => {
      const m = r._reportMonth || '';
      if (ps && m < ps) return false;
      if (pe && m > pe) return false;
      return true;
    });
  }
  if (!priorRows.length) return null;
  const priorTotals = aggregateZoomphTotals(priorRows);
  const prev = priorTotals[metric];
  if (prev === null || prev === undefined || prev === 0) return null;
  return { prev };
}

// -- Accessors --
function getBrandZoomphPerf(brand, month = 'all') {
  let rows = (DataStore.zoomphBrandPerf || []).filter(r => r.Brand === brand);
  if (month !== 'all') rows = rows.filter(r => r._reportMonth === month);
  return rows.sort((a, b) => (a._reportMonth || '').localeCompare(b._reportMonth || ''));
}

function getBrandZoomphSeries(brand) {
  return (DataStore.zoomphContentSeries || []).filter(r => r.Brand === brand);
}

function getBrandZoomphAssets(brand) {
  return (DataStore.zoomphAssets || []).filter(r => r.Brand === brand);
}

function getZoomphReportMonths(brand) {
  const months = new Set();
  getBrandZoomphPerf(brand).forEach(r => r._reportMonth && months.add(r._reportMonth));
  return [...months].sort();
}

function hasZoomphData(brand) {
  return getBrandZoomphPerf(brand).length > 0;
}

// -- Trend chart (SVG, same visual language as survey trend) --
function renderZoomphTrendChart(brand) {
  const rows = getBrandZoomphPerf(brand);
  if (rows.length < 2) return `<div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px;">
    Need at least two ReportDate snapshots to show a trend.</div>`;

  const metrics = [
    { key: 'ViewsImpressions', label: 'Views / Impressions', color: 'var(--text)',     weight: '2.5' },
    { key: 'Engagements',      label: 'Engagements',          color: 'var(--text-dim)', weight: '2' },
    { key: 'BrandValue',       label: 'Brand Value',          color: 'var(--positive)', weight: '1.8', dashed: true },
  ];

  const W = 900, H = 260;
  const pL = 68, pR = 20, pT = 22, pB = 46;
  const cW = W - pL - pR, cH = H - pT - pB;
  const n = rows.length;
  const xScale = i => pL + (i / Math.max(1, n - 1)) * cW;

  const maxImpr = Math.max(...rows.map(r => Math.max(r.ViewsImpressions || 0, r.Engagements || 0))) * 1.1 || 1;
  const maxVal  = Math.max(...rows.map(r => r.BrandValue || 0)) * 1.1 || 1;
  const yLeft  = v => pT + (1 - v / maxImpr) * cH;
  const yRight = v => pT + (1 - v / maxVal)  * cH;

  const yTicks = [0, 0.5, 1.0];
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;" id="zoomph-trend-svg-${brand.replace(/[^a-z0-9]/gi,'_')}">`;

  yTicks.forEach(t => {
    const y = yLeft(t * maxImpr);
    svg += `<line stroke="var(--border-soft)" stroke-width="1" stroke-dasharray="2 3" x1="${pL}" x2="${W-pR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    svg += `<text x="${pL-6}" y="${(y+4).toFixed(1)}" text-anchor="end" style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">${formatNum(t*maxImpr)}</text>`;
  });
  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${pT}" x2="${pL}" y2="${H-pB}"/>`;
  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${H-pB}" x2="${W-pR}" y2="${H-pB}"/>`;
  rows.forEach((r, i) => {
    const x = xScale(i);
    svg += `<text x="${x.toFixed(1)}" y="${H-pB+16}" text-anchor="middle" style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">${r._reportMonth}</text>`;
  });

  // Lines + visible dots
  metrics.forEach(m => {
    const yFn = m.key === 'BrandValue' ? yRight : yLeft;
    const pts = rows.map((r, i) => ({ x: xScale(i), y: yFn(r[m.key] || 0), r })).filter(p => p.r[m.key] !== null);
    if (pts.length < 2) return;
    const d = pts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    svg += `<path d="${d}" fill="none" stroke="${m.color}" stroke-width="${m.weight}" stroke-linecap="round" stroke-linejoin="round" ${m.dashed ? 'stroke-dasharray="5 4"' : ''}/>`;
    pts.forEach(p => {
      const formatted = m.key === 'BrandValue' ? formatCurrency(p.r[m.key]) : formatNum(p.r[m.key]);
      svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5"
        fill="${m.color}" stroke="var(--bg)" stroke-width="1.5"
        class="zoomph-dot" style="cursor:pointer;"
        data-month="${p.r._reportMonth}"
        data-metric="${m.label}"
        data-value="${formatted}"
        data-posts="${p.r.OrganicPosts !== null ? formatNum(p.r.OrganicPosts) : '—'}"
        data-eng="${p.r.Engagements !== null ? formatNum(p.r.Engagements) : '—'}"
        data-views="${p.r.ViewsImpressions !== null ? formatNum(p.r.ViewsImpressions) : '—'}"
        data-brandval="${p.r.BrandValue !== null ? formatCurrency(p.r.BrandValue) : '—'}"/>`;
    });
  });

  svg += `</svg>`;

  const brandId = brand.replace(/[^a-z0-9]/gi, '_');
  return `
    <div style="position:relative;" id="zoomph-trend-wrap-${brandId}">
      ${svg}
      <div class="quadrant-hover" id="zoomph-trend-hover-${brandId}" style="position:absolute;display:none;pointer-events:none;"></div>
    </div>
    <div style="display:flex;gap:18px;margin-top:10px;flex-wrap:wrap;font-family:var(--font-mono);font-size:10.5px;color:var(--text-dim);">
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:20px;height:2.5px;background:var(--text);display:inline-block;"></span>Views/Impressions</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:20px;height:2px;background:var(--text-dim);display:inline-block;"></span>Engagements</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:20px;height:2px;display:inline-block;background:repeating-linear-gradient(to right,var(--positive) 0 4px,transparent 4px 7px);"></span>Brand Value</span>
    </div>`;
}

function wireZoomphTabs(brand) {
  const brandId = brand.replace(/[^a-z0-9]/gi, '_');
  const perfRows   = filterZoomphRowsByPartnerDate(getBrandZoomphPerf(brand));
  const seriesRows = getBrandZoomphSeries(brand);
  const assetRows  = getBrandZoomphAssets(brand);

  document.querySelectorAll('[data-ztab-brand="' + brand + '"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ztab-brand="' + brand + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const contentDiv = document.getElementById('zoomph-tab-content-' + brandId);
      if (!contentDiv) return;
      const tab = btn.dataset.ztab;
      if (tab === 'perf')   contentDiv.innerHTML = renderZoomphTable(perfRows, 'Partner');
      if (tab === 'series') contentDiv.innerHTML = renderZoomphTable(seriesRows, 'Content Series');
      if (tab === 'assets') contentDiv.innerHTML = renderZoomphTable(assetRows, 'Asset');
    });
  });
}

// Wire the partner-page organic date filter buttons / inputs. Re-renders the
// entire organic section so KPIs, tables, and the trend chart all stay in sync.
function wirePartnerOrganicDateFilter(brand) {
  document.querySelectorAll('[data-partner-organic-date-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      partnerOrganicDateMode = btn.dataset.partnerOrganicDateMode;
      renderOrganicSocialSection(brand);
    });
  });
  const brandId = brand.replace(/[^a-z0-9]/gi,'_');
  const monthSel = document.getElementById('partnerOrganicMonthSel_' + brandId);
  const startInp = document.getElementById('partnerOrganicStart_' + brandId);
  const endInp   = document.getElementById('partnerOrganicEnd_' + brandId);
  if (monthSel) monthSel.addEventListener('change', e => {
    partnerOrganicMonth = e.target.value;
    partnerOrganicDateMode = 'month';
    renderOrganicSocialSection(brand);
  });
  if (startInp) startInp.addEventListener('change', e => {
    partnerOrganicStartMonth = e.target.value;
    partnerOrganicDateMode = 'range';
    renderOrganicSocialSection(brand);
  });
  if (endInp) endInp.addEventListener('change', e => {
    partnerOrganicEndMonth = e.target.value;
    partnerOrganicDateMode = 'range';
    renderOrganicSocialSection(brand);
  });
}

function wireZoomphTrendChart(brand) {
  const brandId = brand.replace(/[^a-z0-9]/gi, '_');
  const wrap  = document.getElementById('zoomph-trend-wrap-' + brandId);
  const hover = document.getElementById('zoomph-trend-hover-' + brandId);
  if (!wrap || !hover) return;
  wrap.querySelectorAll('.zoomph-dot').forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      hover.style.display = 'block';
      hover.innerHTML = `
        <div class="hover-title">${dot.dataset.month}</div>
        <div class="hover-row"><span>${dot.dataset.metric}</span><span class="val">${dot.dataset.value}</span></div>
        <div class="hover-row"><span>Views/Impr</span><span class="val">${dot.dataset.views}</span></div>
        <div class="hover-row"><span>Engagements</span><span class="val">${dot.dataset.eng}</span></div>
        <div class="hover-row"><span>Brand Value</span><span class="val">${dot.dataset.brandval}</span></div>
        <div class="hover-row"><span>Posts</span><span class="val">${dot.dataset.posts}</span></div>`;
      hover.classList.add('visible');
    });
    dot.addEventListener('mousemove', e => {
      const r = wrap.getBoundingClientRect();
      let x = e.clientX - r.left + 12, y = e.clientY - r.top - 10;
      const hr = hover.getBoundingClientRect();
      if (x + hr.width > r.width) x = e.clientX - r.left - hr.width - 12;
      if (y < 0) y = 4;
      hover.style.left = x + 'px'; hover.style.top = y + 'px';
    });
    dot.addEventListener('mouseleave', () => { hover.classList.remove('visible'); hover.style.display = 'none'; });
  });
}


// -- Organic Social Section (partner page) --
function renderOrganicSocialSection(brand) {
  const slot = document.getElementById('social-slot');
  if (!slot) return;

  const hasZoomph = hasZoomphData(brand);
  const hasLegacyOrganic = (getBrandSocialData(brand) || []).length > 0;

  if (!hasZoomph && !hasLegacyOrganic) {
    renderOrganicSocialPlaceholder(brand);
    return;
  }

  const sectionId = 'section-organic';
  const isOpen = !!openSections[sectionId];

  // Summary uses the same date-filtered totals as the KPI grid below.
  const allZoomphRows = getBrandZoomphPerf(brand);
  const filteredZoomphForSummary = filterZoomphRowsByPartnerDate(allZoomphRows);
  const summaryTotals = aggregateZoomphTotals(filteredZoomphForSummary);

  const summaryHTML = filteredZoomphForSummary.length ? `
    <div class="section-summary-stat"><span class="label">Impressions</span><span class="value">${formatNum(summaryTotals.ViewsImpressions)}</span></div>
    <div class="section-summary-stat"><span class="label">Brand Value</span><span class="value">${formatCurrency(summaryTotals.BrandValue)}</span></div>
    <div class="section-summary-stat"><span class="label">Eng Rate</span><span class="value">${summaryTotals.EngagementRate !== null ? formatPct(summaryTotals.EngagementRate, 2) : '—'}</span></div>
  ` : '<span class="section-summary-empty">post-level data only</span>';

  const kpiSource = allZoomphRows.length ? `${getPartnerOrganicDateLabel()} · ${getZoomphReportMonths(brand).length} snapshots loaded` : 'Legacy post-level data';

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Organic Social</div>
          <div class="section-meta" style="margin-top:2px;">${kpiSource}</div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>

      <div class="section-body">
        ${hasZoomph ? renderZoomphBody(brand) : ''}
        ${hasLegacyOrganic ? renderLegacySocialBody(brand) : ''}
      </div>
    </section>
  `;
  wireSectionToggles();
  wireInfoIcons();
  wireZoomphTabs(brand);
  wireZoomphTrendChart(brand);
  wirePartnerOrganicDateFilter(brand);
}

function renderZoomphBody(brand) {
  const allPerf = getBrandZoomphPerf(brand);
  if (!allPerf.length) return '';

  // Initialize default filter values from the brand's available months on first render.
  const allMonths = [...new Set(allPerf.map(r => r._reportMonth).filter(Boolean))].sort();
  const earliestMonth = allMonths[0] || '';
  const latestMonth = allMonths[allMonths.length - 1] || '';
  if (partnerOrganicDateMode === 'month' && !partnerOrganicMonth) partnerOrganicMonth = latestMonth;
  if (partnerOrganicDateMode === 'range') {
    if (!partnerOrganicStartMonth) partnerOrganicStartMonth = earliestMonth;
    if (!partnerOrganicEndMonth) partnerOrganicEndMonth = latestMonth;
  }

  const filteredPerf = filterZoomphRowsByPartnerDate(allPerf);
  const totals = aggregateZoomphTotals(filteredPerf);

  // YoY badge: compares the current window's totals against the same window
  // shifted back 12 months. Only meaningful when a specific window is selected.
  const fmtYoY = (curr, metric) => {
    const prior = getZoomphTotalsYoY(brand, metric);
    if (!prior || prior.prev === 0 || prior.prev === null) {
      return partnerOrganicDateMode === 'all'
        ? '<span class="kpi-change neutral">All-time total</span>'
        : '<span class="kpi-change neutral">No prior-year data</span>';
    }
    const change = (curr - prior.prev) / prior.prev;
    const cls = change >= 0 ? 'up' : 'down';
    return `<span class="kpi-change ${cls}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change*100).toFixed(1)}% YoY</span>`;
  };

  const seriesRows = getBrandZoomphSeries(brand);
  const assetRows  = getBrandZoomphAssets(brand);

  // Date-filter UI — same pattern as the Organic Social Portfolio page.
  const monthSelectId = `partnerOrganicMonthSel_${brand.replace(/[^a-z0-9]/gi,'_')}`;
  const startInputId  = `partnerOrganicStart_${brand.replace(/[^a-z0-9]/gi,'_')}`;
  const endInputId    = `partnerOrganicEnd_${brand.replace(/[^a-z0-9]/gi,'_')}`;
  const dateFilterHtml = `
    <div class="organic-date-filter" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px 0;">
      <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">Date filter</span>
      <div class="survey-phase-toggle" style="margin:0;">
        ${['all','month','range'].map(mode => `<button type="button" class="${partnerOrganicDateMode === mode ? 'active' : ''}" data-partner-organic-date-mode="${mode}">${mode === 'all' ? 'All months' : mode === 'month' ? 'Month' : 'Range'}</button>`).join('')}
      </div>
      <select id="${monthSelectId}" class="select-control" style="min-width:150px;${partnerOrganicDateMode === 'month' ? '' : 'display:none;'}">
        ${allMonths.map(m => `<option value="${m}" ${partnerOrganicMonth === m ? 'selected' : ''}>${formatOrganicMonthLabel(m)}</option>`).join('')}
      </select>
      <div style="display:${partnerOrganicDateMode === 'range' ? 'flex' : 'none'};align-items:center;gap:6px;">
        <input id="${startInputId}" type="month" class="select-control" value="${partnerOrganicStartMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
        <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;">to</span>
        <input id="${endInputId}" type="month" class="select-control" value="${partnerOrganicEndMonth || latestMonth || earliestMonth}" min="${earliestMonth}" max="${latestMonth || earliestMonth}" style="width:140px;">
      </div>
      <span class="comparison-basis" style="margin-left:auto;">${getPartnerOrganicDateLabel()} · ${totals.snapshots} snapshot${totals.snapshots === 1 ? '' : 's'}</span>
    </div>`;

  const noData = totals.snapshots === 0;
  const valueOrDash = (n, fmt) => totals.snapshots ? fmt(n) : '—';

  return `
    ${dateFilterHtml}

    <div class="kpi-grid">
      <div class="kpi">
        <span class="kpi-label">Views / Impressions ${makeInfoIcon('Impressions')}</span>
        <span class="kpi-value">${valueOrDash(totals.ViewsImpressions, formatNum)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.ViewsImpressions, 'ViewsImpressions')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Engagements ${makeInfoIcon('Engagement')}</span>
        <span class="kpi-value">${valueOrDash(totals.Engagements, formatNum)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.Engagements, 'Engagements')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Engagement Rate ${makeInfoIcon('Engagement Rate')}</span>
        <span class="kpi-value">${totals.EngagementRate !== null && totals.snapshots ? formatPct(totals.EngagementRate, 2) : '—'}</span>
        <span class="kpi-change neutral">Total eng ÷ total impr</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Organic Posts</span>
        <span class="kpi-value">${valueOrDash(totals.OrganicPosts, formatNum)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.OrganicPosts, 'OrganicPosts')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Logo Impressions</span>
        <span class="kpi-value">${valueOrDash(totals.LogoImpressions, formatNum)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.LogoImpressions, 'LogoImpressions')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Video Views</span>
        <span class="kpi-value">${valueOrDash(totals.VideoViews, formatNum)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.VideoViews, 'VideoViews')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Brand Value ${makeInfoIcon('Brand Exposure Value')}</span>
        <span class="kpi-value">${valueOrDash(totals.BrandValue, formatCurrency)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.BrandValue, 'BrandValue')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Social Value</span>
        <span class="kpi-value">${valueOrDash(totals.SocialValue, formatCurrency)}</span>
        ${noData ? '<span class="kpi-change neutral">No rows in window</span>' : fmtYoY(totals.SocialValue, 'SocialValue')}
      </div>
    </div>

    <!-- Trend chart (uses all snapshots so the line stays meaningful regardless of filter) -->
    ${allPerf.length >= 2 ? `
    <div class="card" style="margin-top:18px;">
      <div class="card-header">
        <span class="card-title">Monthly trend</span>
        <span class="card-sub">Views, engagements, brand value over time · all snapshots</span>
      </div>
      ${renderZoomphTrendChart(brand)}
    </div>` : ''}

    <!-- Tabbed breakdown tables -->
    <div class="card" style="margin-top:18px;" id="zoomph-tabs-${brand.replace(/[^a-z0-9]/gi,'_')}">
      <div class="card-header" style="border-bottom:1px solid var(--border-soft);padding-bottom:14px;margin-bottom:0;">
        <div class="survey-phase-toggle" style="margin:0;">
          <button class="active" data-ztab="perf" data-ztab-brand="${brand.replace(/"/g,'&quot;')}">Partner Performance</button>
          ${seriesRows.length ? `<button data-ztab="series" data-ztab-brand="${brand.replace(/"/g,'&quot;')}">Content Series</button>` : ''}
          ${assetRows.length ? `<button data-ztab="assets" data-ztab-brand="${brand.replace(/"/g,'&quot;')}">Brand on Asset</button>` : ''}
        </div>
      </div>
      <div id="zoomph-tab-content-${brand.replace(/[^a-z0-9]/gi,'_')}">
        ${renderZoomphTable(filteredPerf, 'Partner')}
      </div>
    </div>
  `;
}

function renderZoomphTable(rows, nameLabel) {
  // Sum metrics across rows for the same Name (multiple snapshots)
  const byName = {};
  rows.forEach(r => {
    const k = r.Name;
    if (!byName[k]) byName[k] = { name: k, posts: 0, engagements: 0, views: 0, socialValue: 0, brandValue: 0, logoImpressions: 0, videoViews: 0, engRateSum: 0, engRateCount: 0 };
    byName[k].posts           += r.OrganicPosts || 0;
    byName[k].engagements     += r.Engagements  || 0;
    byName[k].views           += r.ViewsImpressions || 0;
    byName[k].socialValue     += r.SocialValue  || 0;
    byName[k].brandValue      += r.BrandValue   || 0;
    byName[k].logoImpressions += r.LogoImpressions || 0;
    byName[k].videoViews      += r.VideoViews   || 0;
    if (r.EngagementRate !== null) { byName[k].engRateSum += r.EngagementRate; byName[k].engRateCount++; }
  });
  const agg = Object.values(byName).sort((a, b) => b.brandValue - a.brandValue);
  return `
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr>
        <th style="text-align:left;">${nameLabel}</th>
        <th class="num">Posts</th>
        <th class="num">Views / Impr</th>
        <th class="num">Engagements</th>
        <th class="num">Eng Rate</th>
        <th class="num">Brand Value</th>
        <th class="num">Social Value</th>
        <th class="num">Logo Impr</th>
      </tr></thead>
      <tbody>
        ${agg.map(r => `<tr>
          <td style="text-align:left;font-weight:500;max-width:260px;" title="${r.name.replace(/"/g,'&quot;')}">
            ${r.name.length > 45 ? r.name.slice(0,43)+'…' : r.name}
          </td>
          <td class="num">${formatNum(r.posts)}</td>
          <td class="num">${formatNum(r.views)}</td>
          <td class="num">${formatNum(r.engagements)}</td>
          <td class="num">${r.engRateCount > 0 ? formatPct(r.engRateSum/r.engRateCount, 2) : '—'}</td>
          <td class="num" style="font-weight:500;">${formatCurrency(r.brandValue)}</td>
          <td class="num">${formatCurrency(r.socialValue)}</td>
          <td class="num">${formatNum(r.logoImpressions)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
}

function getZoomphYoY(brand, metric, currentMonth = null) {
  const rows = getBrandZoomphPerf(brand);
  if (rows.length < 2) return null;
  const current = currentMonth ? rows.find(r => r._reportMonth === currentMonth) : rows[rows.length - 1];
  if (!current || !current._reportMonth || !current._reportYear) return null;
  const priorMonth = `${current._reportYear - 1}-${current._reportMonth.split('-')[1]}`;
  const priorRow = rows.find(r => r._reportMonth === priorMonth);
  if (!priorRow) return null;
  const curr = current[metric], prev = priorRow[metric];
  if (curr === null || prev === null || prev === 0) return null;
  return { change: pctChange(curr, prev), curr, prev, currMonth: current._reportMonth, priorMonth };
}

function renderTopPostsTable(rows) {
  if (!rows || !rows.length) return '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No post data.</div>';
  const top = [...rows].sort((a, b) => (b.BrandExposureValue || 0) - (a.BrandExposureValue || 0)).slice(0, 12);
  return `
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr>
        <th style="text-align:left;">Date</th>
        <th style="text-align:left;">Platform</th>
        <th style="text-align:left;">Content</th>
        <th class="num">Impressions</th>
        <th class="num">Engagement</th>
        <th class="num">Eng Rate</th>
        <th class="num">Value</th>
      </tr></thead>
      <tbody>
        ${top.map(r => {
          const d = r._date instanceof Date ? r._date : new Date(r.PartnerExposureDate || '');
          return `<tr>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);">${isNaN(d) ? '—' : d.toLocaleDateString()}</td>
            <td>${r.ServiceType || '—'}</td>
            <td style="color:var(--text-dim);">${r.ContentType || '—'}</td>
            <td class="num">${formatNum(r.Impressions)}</td>
            <td class="num">${formatNum(r.Engagement)}</td>
            <td class="num">${formatPct(r.EngagementRate, 2)}</td>
            <td class="num" style="font-weight:500;">${formatCurrency(r.BrandExposureValue)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>`;
}


function renderLegacySocialBody(brand) {
  const rows = getBrandSocialData(brand, currentPeriod);
  if (!rows.length) return '';
  return `
    <div style="margin-top:${hasZoomphData(brand) ? '28px' : '0'};padding-top:${hasZoomphData(brand) ? '24px' : '0'};border-top:${hasZoomphData(brand) ? '1px solid var(--border-soft)' : 'none'};">

      ${renderTopPostsTable(rows)}
    </div>`;
}

function renderOrganicSocialPlaceholder(brand) {
  const sectionId = 'section-organic';
  const isOpen = !!openSections[sectionId];
  const slot = document.getElementById('social-slot');
  if (!slot) return;
  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">Organic Social</div>
          <div class="section-meta" style="margin-top:2px;">No data loaded for this partner</div>
        </div>
        <div class="section-toggle-meta"><span class="section-summary-empty">no data loaded</span></div>
      </button>
      <div class="section-body">
        <div class="section-unavailable">Upload BrandedPartnerPerformance, BrandedContentSeries, and BrandOnAsset CSV files from Zoomph. Add a ReportDate column to each file (format: YYYY-MM-DD, use end of the reporting period).</div>
      </div>
    </section>`;
}


function detectFileType(filename, rows = []) {
  const lower = filename.toLowerCase();
  const base  = lower.replace(/\.(csv|xlsx|xls)$/i, '');
  const sample = rows && rows[0] ? rows[0] : {};
  const cols = Object.keys(sample).map(k => k.toLowerCase().trim());

  // Partner roster: Partners_ prefix
  if (base.startsWith('partners_') || lower.startsWith('partners_')) return 'roster';

  // Affidavits: TVAffidavit_ / RadioAffidavit_ prefix
  if (base.startsWith('tvaffidavit') || lower.startsWith('tvaffidavit')) return 'tvAffidavit';
  if (base.startsWith('radioaffidavit') || lower.startsWith('radioaffidavit')) return 'radioAffidavit';

  // ANC LED Report: SPONSOR_AVERAGE_<Arena>_<Asset>_<dates>.csv
  if (base.startsWith('sponsor_average_') || lower.startsWith('sponsor_average_')) return 'ancLED';
  if (cols.includes('sponsor name') && cols.includes('pre-game avg') && cols.includes('time total')) return 'ancLED';

  // Virtual Signage Schedule: filename starts with 'virtualsignage', or detected by column shape
  if (base.startsWith('virtualsignage') || lower.startsWith('virtualsignage')) return 'virtualSignage';
  if (cols.includes('home/away') && cols.includes('opponent') && cols.some(c => c.includes('position'))) return 'virtualSignage';

  // New survey subtypes — checked before the generic Survey_ catch-all
  // GeneralSurvey_: fan segment questions (beverages, game nights, bar spaces, TV segments)
  if (base.startsWith('generalsurvey_') || lower.startsWith('generalsurvey_')) return 'generalSurvey';
  // ModaDeltaDental_: partner-specific question battery for Moda Health and Delta Dental
  if (base.startsWith('modadeltadental_') || lower.startsWith('modadeltadental_')) return 'partnerSurvey';
  // Program_: in-game and community program awareness tracking
  if (base.startsWith('program_') || lower.startsWith('program_')) return 'programSurvey';

  // Survey: Survey_ prefix or column-based detection
  if (base.startsWith('survey_') || lower.startsWith('survey_')) return 'survey';
  if (cols.includes('unaided recall') && cols.includes('aided recall') && cols.includes('survey')) return 'survey';

  // Web & Digital delivery reports — must be checked before generic tv/paid/organic fallbacks
  // Match both space-separated ("Delivery Report Blazers") and underscore ("Delivery_Report_Blazers")
  if (lower.includes('delivery report blazers') || lower.includes('delivery_report_blazers'))           return 'blazersWebDisplay';
  if (lower.includes('delivery report rosequarter') || lower.includes('delivery_report_rosequarter'))   return 'rqWebDisplay';
  if (lower.includes('pre-roll') || lower.includes('pre_roll')) return 'webPreRoll';

  // Zoomph organic social — three file types detected by filename prefix
  if (lower.includes('brandedpartnerperformance') || base.startsWith('brandedpartnerperformance')) return 'zoomphBrand';
  if (lower.includes('brandedcontentseries') || base.startsWith('brandedcontentseries')) return 'zoomphSeries';
  if (lower.includes('brandonasset') || base.startsWith('brandonasset')) return 'zoomphAsset';
  // Also detect by columns if filename doesn't match
  if (cols.includes('organic posts') && cols.includes('brand value') && cols.includes('social value')) {
    // Can't distinguish series vs asset vs brand from columns alone — default to brand
    return 'zoomphBrand';
  }

  // Nielsen TV Ratings (viewership): schema-based, checked BEFORE the generic 'tv' filename match
  // because this file often contains 'tv' in the name. Identify by column shape.
  // NOTE: This file format will change. If detection breaks, look for 'hh rtg' + 'demo' + 'opponent'
  // in the column headers. Source: DW > vw_viewership > vw_nielsen_tv_metrics
  if (cols.includes('hh rtg') && cols.includes('demo') && cols.includes('opponent')) return 'tvRatings';

  if (lower.includes('tv') || lower.includes('signage') || lower.includes('visible')) return 'tv';
  if (lower.includes('paid') || lower.includes('facebook') || lower.includes('meta') || lower.includes('admanager') || lower.includes('ads manager')) return 'paid';
  if (cols.includes('amount spent (usd)') && cols.includes('campaign name')) return 'paid';
  if (cols.includes('reporting starts') && cols.includes('reporting ends') && cols.includes('link clicks')) return 'paid';
  return 'organic';
}

function extractBrandFromSocialFilename(filename) {
  const base = filename.replace(/\.(csv|xlsx|xls)$/i, '');
  return base.split('_')[0].split('-')[0].trim();
}

function extractBrandFromPaidFilename(filename) {
  return extractBrandFromSocialFilename(filename) || 'Unknown Partner';
}

function parseCSV(text) {
  return Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true }).data;
}

function parseXLSX(arrayBuffer) {
  if (!window.XLSX || window.XLSX_OFFLINE_DISABLED) {
    throw new Error('XLSX parsing is disabled in this offline-only build. Save/export the spreadsheet as CSV, then upload the CSV.');
  }
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// ============================================================
// TV RATINGS (NIELSEN VIEWERSHIP) — ingest
// ============================================================
// Source: DW > vw_viewership > vw_nielsen_tv_metrics
// Each row = one demographic × one game segment (Game / Pre Game / Post Game).
// This is broadcast viewership data — it has NO partner/brand associations.
// Detected by column schema (hh rtg + demo + opponent), NOT by filename,
// so it survives any future filename/export-path changes.
// When the file format changes, update normalizeTVRatingsRow() to remap columns.

function normalizeTVRatingsRow(row) {
  const parseNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  // Derive segment from Program column — more reliable than the duplicate Segment columns
  const program = String(row['Program'] || '').toUpperCase().trim();
  const segment = program.includes('POST') ? 'Post Game'
                : (program.includes('PRE') || program.includes('PREGAME')) ? 'Pre Game'
                : 'Game';

  // Derive basketball season from Custom Year field ("1/1/2025" → "2024-25")
  const customYearRaw = row['Custom Year'] || row['custom year'] || '';
  let fiscalYear = 0;
  if (customYearRaw instanceof Date) {
    fiscalYear = customYearRaw.getFullYear();
  } else {
    const parts = String(customYearRaw).split('/');
    fiscalYear = parseInt(parts[parts.length - 1]) || parseInt(parts[0]) || 0;
  }
  const season = fiscalYear >= 2000
    ? `${fiscalYear - 1}-${String(fiscalYear).slice(-2)}`
    : '';

  // Normalize date — keep as string in M/D/YYYY format
  const dateRaw = row['Dates'] || '';
  const date = dateRaw instanceof Date
    ? `${dateRaw.getMonth() + 1}/${dateRaw.getDate()}/${dateRaw.getFullYear()}`
    : String(dateRaw).trim();

  return {
    date,
    season,
    demo:     String(row['Demo']           || '').trim(),
    segment,
    opponent: String(row['Opponent']       || '').trim().toUpperCase(),
    station:  String(row['Viewing Source'] || '').trim(),
    imp:      parseNum(row['IMP']),
    rtg:      parseNum(row['Rtg % (X.X)']),
    shr:      parseNum(row['Shr %']),
    hhImp:    parseNum(row['HH Imp']) || parseNum(row['HH Imps']),
    hhRtg:    parseNum(row['HH Rtg']),
    hhShr:    parseNum(row['HH SHR']) || parseNum(row['HHR Shr %']),
    // Detect preseason: check all Segment-named columns (PapaParse may alias duplicate headers)
    gameType: (() => {
      const vals = Object.entries(row)
        .filter(([k]) => /^segment/i.test(String(k).trim()))
        .map(([, v]) => String(v || '').trim().toLowerCase());
      return vals.some(v => v === 'pre season' || v === 'preseason' || v === 'pre-season' || v === 'exhibition')
        ? 'Pre Season'
        : 'Regular Game';
    })(),
  };
}

function ingestTVRatingsFile(rows) {
  const normalized = rows
    .map(r => normalizeTVRatingsRow(r))
    .filter(r => r.date && r.demo && r.segment && r.season);

  // Deduplicate on natural key — safe to re-ingest the same export
  const existing = new Set(
    (DataStore.tvRatings || []).map(r => `${r.date}|${r.demo}|${r.segment}|${r.opponent}|${r.station}`)
  );
  const newRows = normalized.filter(r => {
    const key = `${r.date}|${r.demo}|${r.segment}|${r.opponent}|${r.station}`;
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });

  DataStore.tvRatings = (DataStore.tvRatings || []).concat(newRows);
  return newRows;
}

async function ingestFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let rows = [];
  try {
    if (ext === 'csv') {
      rows = parseCSV(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = parseXLSX(await file.arrayBuffer());
    } else throw new Error('Unsupported file type');
  } catch (e) {
    return { success: false, error: e.message, filename: file.name };
  }

  const type = detectFileType(file.name, rows);
  if (type === 'tv') {
    rows.forEach(r => {
      if (r.Season) r.Season = normalizeSeasonLabel(r.Season);
      if (r.Brand) {
        resolveAndTrackRaw(r, 'Brand', '_rawBrand');
        DataStore.tvSignage.push(r);
        DataStore.registerBrand(r.Brand, 'tv');
      }
    });
    return { success: true, type: 'tv', rows: rows.length, filename: file.name };
  } else if (type === 'paid') {
    rows.forEach(r => normalizePaidRow(r, r.Brand || r.Partner || ''));
    const grouped = {};
    rows.forEach(r => {
      const b = String(r.Brand || UNASSIGNED_PAID_KEY).trim() || UNASSIGNED_PAID_KEY;
      if (!grouped[b]) grouped[b] = [];
      grouped[b].push(r);
    });
    Object.entries(grouped).forEach(([brand, brandRows]) => {
      DataStore.paidSocial[brand] = (DataStore.paidSocial[brand] || []).concat(brandRows);
      if (brand !== UNASSIGNED_PAID_KEY) DataStore.registerBrand(brand, 'paid');
    });
    regroupPaidRowsByBrand();
    const summary = getPaidAssignmentSummary();
    const brands = Object.keys(grouped).filter(b => b !== UNASSIGNED_PAID_KEY).join(', ') || 'paid campaigns loaded';
    return { success: true, type: 'paid', brand: brands, rows: rows.length, reviewCount: summary.medium + summary.unassigned, filename: file.name };
  } else if (type === 'survey') {
    const normalized = rows.map(r => normalizeSurveyRow(r)).filter(r => r.Brand && r.Survey);
    normalized.forEach(r => {
      DataStore.surveys.push(r);
      DataStore.registerBrand(r.Brand, 'survey');
    });
    const phases = [...new Set(normalized.map(r => r.Phase).filter(Boolean))];
    const seasons = [...new Set(normalized.map(r => r.Season).filter(Boolean))];
    return { success: true, type: 'survey', rows: normalized.length, phases: phases.join('+'), seasons: seasons.join(', '), filename: file.name };

  } else if (type === 'zoomphBrand' || type === 'zoomphSeries' || type === 'zoomphAsset') {
    const normalized = rows.map(r => normalizeZoomphRow(r, type)).filter(r => r.Name);
    const storeKey = type === 'zoomphBrand' ? 'zoomphBrandPerf' : type === 'zoomphSeries' ? 'zoomphContentSeries' : 'zoomphAssets';
    DataStore[storeKey] = DataStore[storeKey].concat(normalized);
    // Register brands
    normalized.forEach(r => { if (r.Brand) DataStore.registerBrand(r.Brand, 'organic'); });
    const unresolved = normalized.filter(r => !DataStore.brands.has(r.Brand)).length;
    return { success: true, type, rows: normalized.length, unresolved, filename: file.name };

  } else if (type === 'generalSurvey') {
    const normalized = rows.map(r => normalizeGeneralSurveyRow(r)).filter(r => r.Question && r.AnswerOption);
    applyGeneralSurveyAssignmentRules(normalized);
    DataStore.surveyGeneral = DataStore.surveyGeneral.concat(normalized);
    normalized.forEach(r => { if (r._partner) DataStore.registerBrand(r._partner, 'survey'); });
    const questions = [...new Set(normalized.map(r => r.Question).filter(Boolean))];
    const waves = [...new Set(normalized.map(r => r.Survey).filter(Boolean))];
    const unmatched = normalized.filter(r => !r._partner && r.AnswerOption && !r.AnswerOption.startsWith('OTHER:') && r.AnswerOption !== 'None of these' && r.AnswerOption !== 'Other (please specify)').length;
    return { success: true, type: 'generalSurvey', rows: normalized.length, questions: questions.length, waves: waves.length, unmatched, filename: file.name };

  } else if (type === 'partnerSurvey') {
    const normalized = rows.map(r => normalizePartnerSurveyRow(r)).filter(r => r.Question && r.Response && r.Partner);
    DataStore.surveyPartner = DataStore.surveyPartner.concat(normalized);
    const partners = [...new Set(normalized.map(r => r.Partner).filter(Boolean))];
    const waves = [...new Set(normalized.map(r => r.Survey).filter(Boolean))];
    return { success: true, type: 'partnerSurvey', rows: normalized.length, partners: partners.join(' + '), waves: waves.length, filename: file.name };

  } else if (type === 'programSurvey') {
    const normalized = rows.map(r => normalizeProgramSurveyRow(r)).filter(r => r.ProgramName && r.ProgramName !== 'None of these');
    DataStore.surveyPrograms = DataStore.surveyPrograms.concat(normalized);
    normalized.forEach(r => { if (r.Sponsor) DataStore.registerBrand(r.Sponsor, 'survey'); });
    const programs = [...new Set(normalized.map(r => r.CoreName).filter(Boolean))];
    const waves = [...new Set(normalized.map(r => r.Survey).filter(Boolean))];
    const sponsored = normalized.filter(r => r.Sponsor).length;
    return { success: true, type: 'programSurvey', rows: normalized.length, programs: programs.length, waves: waves.length, sponsored, filename: file.name };

  } else if (type === 'tvRatings') {
    const ingested = ingestTVRatingsFile(rows);
    const seasons = [...new Set(ingested.map(r => r.season).filter(Boolean))];
    const games   = [...new Set(ingested.filter(r => r.segment === 'Game').map(r => r.date))].length;
    return { success: true, type: 'tvRatings', rows: ingested.length, games, seasons: seasons.join(', '), filename: file.name };

  } else if (type === 'blazersWebDisplay') {
    return ingestBlazersBannersFile(file, ext);

  } else if (type === 'rqWebDisplay') {
    return ingestRQBannersFile(file, ext);

  } else if (type === 'webPreRoll') {
    return ingestPreRollFile(file, ext);

  } else if (type === 'tvAffidavit' || type === 'radioAffidavit') {
    const channel = type === 'tvAffidavit' ? 'TV' : 'Radio';
    const ingested = ingestAffidavitFile(rows, channel);
    return { success: true, type, channel, rows: ingested.length, filename: file.name };

  } else if (type === 'ancLED') {
    const meta = parseANCFilename(file.name);
    if (!meta) return { success: false, error: 'Could not parse arena/asset/dates from filename', filename: file.name };
    const ingested = ingestANCLEDFile(rows, file.name);
    return { success: true, type: 'ancLED', arena: meta.arena, asset: meta.asset, rows: ingested.length, filename: file.name };

  } else if (type === 'virtualSignage') {
    const ingested = ingestVirtualSignageSchedule(rows);
    const homeGames = ingested.filter(g => g.IsHome).length;
    const awayGames = ingested.filter(g => !g.IsHome).length;
    const brands = new Set();
    ingested.forEach(g => { if (g.BrandA) brands.add(g.BrandA); if (g.BrandB) brands.add(g.BrandB); });
    return { success: true, type: 'virtualSignage', rows: ingested.length, homeGames, awayGames, brands: brands.size, filename: file.name };

  } else if (type === 'roster') {
    const rosterRows = rows
      .filter(r => r.Account || r.account)
      .map(r => ({
        Account: resolveCanonicalBrandName(String(r.Account || r.account || '').trim()),
        Category: String(r.Category || r.category || '').trim(),
      }))
      .filter(r => r.Account);
    DataStore.partnerRoster = rosterRows;
    // Warn about any roster names not found in other channels
    const unknown = rosterRows.filter(r => !DataStore.brands.has(r.Account));
    return { success: true, type: 'roster', rows: rosterRows.length, unknown: unknown.length, filename: file.name };

  } else {
    const brand = extractBrandFromSocialFilename(file.name);
    if (!brand) return { success: false, error: 'Could not extract brand from filename', filename: file.name };
    rows.forEach(r => {
      if (r.PartnerExposureDate) {
        r._date = new Date(r.PartnerExposureDate);
        r._year = r._date.getFullYear();
        if (!r.Season) r.Season = String(r._year);
        if (r.Season) r.Season = normalizeSeasonLabel(r.Season);
      }
    });
    const registeredBrand = resolveCanonicalBrandName((rows[0] && rows[0].Partner) ? String(rows[0].Partner).trim() : brand);
    rows.forEach(r => { if (r.Partner) resolveAndTrackRaw(r, 'Partner', '_rawPartner'); });
    DataStore.organicSocial[registeredBrand] = (DataStore.organicSocial[registeredBrand] || []).concat(rows);
    DataStore.registerBrand(registeredBrand, 'organic');
    return { success: true, type: 'organic', brand: registeredBrand, rows: rows.length, filename: file.name };
  }
}

async function handleFiles(fileList) {
  const results = [];
  for (const f of fileList) results.push(await ingestFile(f));
  // Append to persistent session log so prior uploads remain visible
  results.forEach(r => sessionLoadedFiles.push(r));
  // After all files in this batch are ingested, run auto-detection so word-prefix
  // variants like "Axiom Eco-Pest Control" → "Axiom" are grouped immediately.
  applyAutoDetectedAliases();
  renderFileLog();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

function renderFileLog() {
  const el = document.getElementById('fileList');
  if (!el) return;
  if (!sessionLoadedFiles.length) { el.innerHTML = ''; return; }
  const items = sessionLoadedFiles.map(r => {
    if (r.success) {
      const info = r.type === 'tv'
        ? `TV · ${r.rows} rows`
        : r.type === 'paid'
          ? `Paid Social · ${r.brand || 'multiple brands'} · ${r.rows} rows${r.reviewCount ? ` · ${r.reviewCount} to review` : ''}`
        : r.type === 'survey'
          ? `Survey · ${r.rows} rows · ${r.phases} · ${r.seasons}`
        : r.type === 'generalSurvey'
          ? `General Survey (Fan Insights) · ${r.questions} questions · ${r.waves} waves · ${r.rows} answer rows${r.unmatched ? ` · ${r.unmatched} unmatched options` : ''}`
        : r.type === 'partnerSurvey'
          ? `Partner Survey (${r.partners}) · ${r.waves} waves · ${r.rows} answer rows`
        : r.type === 'programSurvey'
          ? `Programs Survey · ${r.programs} programs · ${r.waves} waves · ${r.sponsored} sponsored rows`
        : (r.type === 'zoomphBrand' || r.type === 'zoomphSeries' || r.type === 'zoomphAsset')
          ? `Organic Social (${r.type.replace('zoomph','').replace('Brand','Partner Perf').replace('Series','Content Series').replace('Asset','Brand on Asset')}) · ${r.rows} rows${r.unresolved ? ' · ' + r.unresolved + ' unresolved' : ''}`
        : r.type === 'roster'
          ? `Partner Roster · ${r.rows} partners${r.unknown ? ' · ' + r.unknown + ' mismatches' : ''}`
        : (r.type === 'tvAffidavit' || r.type === 'radioAffidavit')
          ? `${r.channel} Affidavit · ${r.rows} rows`
        : r.type === 'ancLED'
          ? `ANC LED Report · ${r.arena} / ${r.asset} · ${r.rows} rows`
        : r.type === 'virtualSignage'
          ? `Virtual Signage Schedule · ${r.rows} games (${r.homeGames} home · ${r.awayGames} away) · ${r.brands} brands`
        : r.type === 'blazersWebDisplay'
          ? `Web & Digital · Blazers.com Banners · ${r.brands || 'unknown brands'} · ${r.rows} rows`
        : r.type === 'rqWebDisplay'
          ? `Web & Digital · RoseQuarter.com Banners · ${r.brands || 'unknown brands'} · ${r.rows} rows`
        : r.type === 'webPreRoll'
          ? `Web & Digital · Pre-Roll Video · ${r.brands || 'unknown brands'} · ${r.rows} rows`
        : r.type === 'tvRatings'
          ? `TV Ratings · ${r.games} games · ${r.seasons} · ${r.rows} demo rows`
        : `Organic Social · ${r.brand} · ${r.rows} posts`;
      return `<div class="file-item success">
        <span class="file-item-name">${r.filename}</span>
        <span class="file-item-info">${info}</span>
      </div>`;
    }
    return `<div class="file-item error">
      <span class="file-item-name">${r.filename}</span>
      <span class="file-item-info">ERROR: ${r.error}</span>
    </div>`;
  }).join('');
  el.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;
      color:var(--text-muted);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border-soft);">
      Loaded this session (${sessionLoadedFiles.length} file${sessionLoadedFiles.length === 1 ? '' : 's'})
    </div>
    ${items}`;
}


// ============================================================
// WIRING
