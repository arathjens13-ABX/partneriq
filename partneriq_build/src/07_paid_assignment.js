// ============================================================
// RENDERING
// ============================================================
let currentBrand = null;
let currentPeriod = null; // will be set to latest season on brand select
let currentPage = 'home';
let activeCharts = [];
let homeLeaderboardMetric = 'brand_qimv';
let locationPerformanceMetric = 'qimv';
let homePeriod = null;
let assetSortKey = 'qimv';
let assetSortDir = 'desc';
let tableSortStates = {};

// 'auto-match' = compare current season's N matches against the first N of the prior season
// 'full' = compare full-season totals (only sensible when current season is complete)
let comparisonMode = 'auto-match';

// Tracks which collapsible sections are open, keyed by section id.
// Resets every time the brand changes (cheapest behavior, no persistence).
let openSections = {};
let currentSurveyPhase = 'Early';
let currentPartnerSurveyPhase = 'Early';
let paidPortfolioPeriod = 'latest';
const sessionLoadedFiles = []; // persists across modal open/close
let paidPortfolioSortKey = 'impressions';
let paidPortfolioSortDir = 'desc';
let paidPortfolioTableTab   = 'partners'; // 'partners' | 'campaigns'
let paidPortfolioKpiMode    = 'yoy';      // 'yoy' | 'mom'
let paidPortfolioChartPeriod = 'latest';  // independent period for chart cards
// Date-range filter for the Paid Social Portfolio page (mirrors the Organic page).
// Operates on r.DailyDate. When dateMode is 'all', no date filter is applied.
let paidPortfolioDateMode   = 'all';      // 'all' | 'month' | 'range'
let paidPortfolioMonth      = '';         // YYYY-MM
let paidPortfolioStartMonth = '';         // YYYY-MM
let paidPortfolioEndMonth   = '';         // YYYY-MM
// Result Indicator filter for the Partner Efficiency scatter. 'all' = no filter.
let paidPortfolioResultFilter = 'all';
const TABLE_LIMITS = { homeLeaderboard: 10, locationPerformance: 10, organicPortfolio: 10, paidPortfolio: 10 };

function destroyCharts() {
  activeCharts.forEach(c => { try { c.destroy(); } catch(e){} });
  activeCharts = [];
}



// Returns only non-virtual-branding TV rows for portfolio-level aggregations.
// Virtual Branding (Center / 3 Point Line) is handled by the Virtual Signage page.
function _isVBRow(r) {
  return String(r.Tool || '').trim().toLowerCase() === 'virtual branding' &&
    ['center', '3 point line'].includes(String(r.Location || '').trim().toLowerCase());
}

function getTVRowsForPeriod(period = 'all') {
  const rows = DataStore.tvSignage.filter(r => !_isVBRow(r));
  if (!period || period === 'all') return rows;
  return rows.filter(r => r.Season === period);
}

function getPortfolioSeasons() {
  return [...new Set(DataStore.tvSignage.filter(r => !_isVBRow(r)).map(r => r.Season).filter(Boolean))].sort();
}

function getPortfolioLatestSeason() {
  const seasons = getPortfolioSeasons();
  return seasons[seasons.length - 1] || 'all';
}


function formatDurationFromMinutes(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
  const totalSeconds = Math.round(Number(minutes) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSocialRowsForPeriod(period = 'all') {
  const rows = Object.values(DataStore.organicSocial).flat();
  if (!period || period === 'all') return rows;
  return rows.filter(r => r.Season === period);
}

function getPreviousPortfolioSeason(season) {
  const seasons = getPortfolioSeasons();
  const idx = seasons.indexOf(season);
  return idx > 0 ? seasons[idx - 1] : null;
}

function getPortfolioYoYRowSets(period) {
  if (!period || period === 'all') return null;
  const prev = getPreviousPortfolioSeason(period);
  if (!prev) return null;
  const currRows = getTVRowsForPeriod(period);
  const priorRowsFull = getTVRowsForPeriod(prev);
  if (!currRows.length || !priorRowsFull.length) return null;

  const currMatchdates = getUniqueMatchdates(currRows);
  const priorMatchdates = getUniqueMatchdates(priorRowsFull);
  let priorRows = priorRowsFull;
  let basis = `Full ${period} vs full ${prev}`;
  let matched = false;

  if (comparisonMode === 'auto-match' && currMatchdates.length && priorMatchdates.length && currMatchdates.length < priorMatchdates.length) {
    const limitedDates = new Set(priorMatchdates.slice(0, currMatchdates.length));
    priorRows = priorRowsFull.filter(r => r.Matchdate && limitedDates.has(String(r.Matchdate)));
    basis = `Through ${currMatchdates.length} game${currMatchdates.length === 1 ? '' : 's'} · vs first ${currMatchdates.length} of ${prev}`;
    matched = true;
  } else if (comparisonMode === 'auto-match') {
    basis = `${currMatchdates.length} games vs full ${prev} (${priorMatchdates.length} games)`;
  }

  return { currRows, priorRows, currSeason: period, priorSeason: prev, basis, matched, currMatchdates: currMatchdates.length, priorMatchdatesTotal: priorMatchdates.length };
}

function getSelectedHomePeriod() {
  const seasons = getPortfolioSeasons();
  if (!homePeriod || homePeriod === 'all' || !seasons.includes(homePeriod)) {
    homePeriod = seasons[seasons.length - 1] || seasons[0] || null;
  }
  return homePeriod;
}

function aggregateBy(rows, keyName) {
  const grouped = {};
  rows.forEach(r => {
    const key = r[keyName] || 'Unknown';
    if (!grouped[key]) grouped[key] = {
      name: key,
      qimv: 0,
      minutes: 0,
      impressions: 0,
      qiImpressions: 0,
      exposures: 0,
      qiScoreSum: 0,
      qiCount: 0,
      brands: new Set(),
      locations: new Set(),
      rows: []
    };
    grouped[key].qimv += Number(r['QI Media Value ($)']) || 0;
    grouped[key].minutes += Number(r['Duration (Minutes)']) || 0;
    grouped[key].impressions += Number(r['Sponsorship Impressions']) || 0;
    grouped[key].qiImpressions += Number(r['Sponsorship QI Impressions']) || 0;
    grouped[key].exposures += Number(r['Total Exposures']) || 0;
    grouped[key].qiScoreSum += Number(r['QI Score']) || 0;
    grouped[key].qiCount += 1;
    grouped[key].rows.push(r);
    if (r.Brand) grouped[key].brands.add(r.Brand);
    if (r.Location) grouped[key].locations.add(r.Location);
  });
  return Object.values(grouped).map(v => ({
    ...v,
    qimvPerMin: v.minutes > 0 ? v.qimv / v.minutes : 0,
    avgQI: v.qiCount > 0 ? v.qiScoreSum / v.qiCount : 0,
    brandCount: v.brands.size,
    locationCount: v.locations.size,
  }));
}

function pctChangeFromValues(curr, prev) {
  if (!prev || prev === 0) return null;
  return (curr - prev) / prev;
}

function formatSignedPercent(change, opts = {}) {
  if (change === null || change === undefined || !isFinite(change)) {
    return opts.blank || '<span class="yoy-change neutral">—</span>';
  }
  const cls = change > 0.0005 ? 'up' : change < -0.0005 ? 'down' : 'neutral';
  const arrow = change > 0.0005 ? '▲' : change < -0.0005 ? '▼' : '•';
  const sign = change > 0.0005 ? '+' : change < -0.0005 ? '-' : '';
  return `<span class="yoy-change ${cls}">${arrow} ${sign}${Math.abs(change * 100).toFixed(1)}%</span>`;
}

function formatMeanDiff(value, mean, label = '') {
  if (!mean || !isFinite(mean)) return '<span class="mean-diff neutral">—</span>';
  const diff = (value - mean) / mean;
  const cls = diff > 0.005 ? 'up' : diff < -0.005 ? 'down' : 'neutral';
  const arrow = diff > 0.005 ? '▲' : diff < -0.005 ? '▼' : '•';
  const sign = diff > 0.005 ? '+' : diff < -0.005 ? '-' : '';
  return `<span class="mean-diff ${cls}" title="${label}">${arrow} ${sign}${Math.abs(diff * 100).toFixed(1)}%</span>`;
}

function renderSimpleLeaderboardTable(rows, columns, tableId = null) {
  if (!rows.length) return `<div class="section-unavailable">No TV data available for this view.</div>`;
  const activeSort = tableId ? tableSortStates[tableId] : null;
  const sortableColumns = columns.filter(c => c.sortKey && typeof c.sortValue === 'function');
  let displayRows = [...rows];
  if (activeSort) {
    const col = sortableColumns.find(c => c.sortKey === activeSort.key);
    if (col) {
      displayRows.sort((a, b) => {
        const av = col.sortValue(a);
        const bv = col.sortValue(b);
        const aNum = typeof av === 'number' && isFinite(av);
        const bNum = typeof bv === 'number' && isFinite(bv);
        let result;
        if (aNum && bNum) result = av - bv;
        else result = String(av ?? '').localeCompare(String(bv ?? ''));
        return activeSort.dir === 'asc' ? result : -result;
      });
    }
  }
  return `
    <div style="overflow-x: auto;">
      <table class="data-table ${tableId ? 'sortable-table' : ''}">
        <thead><tr>${columns.map(c => {
          const isSortable = tableId && c.sortKey && typeof c.sortValue === 'function';
          const indicator = activeSort && activeSort.key === c.sortKey ? (activeSort.dir === 'asc' ? '▲' : '▼') : '↕';
          return `<th class="${c.cls || ''} ${isSortable ? 'sortable-th' : ''}" ${isSortable ? `data-table-id="${tableId}" data-sort-key="${c.sortKey}"` : ''}>${c.label}${isSortable ? `<span class="sortable-indicator">${indicator}</span>` : ''}</th>`;
        }).join('')}</tr></thead>
        <tbody>
          ${displayRows.map((row, idx) => `
            <tr>
              ${columns.map(c => `<td class="${c.cls || ''}">${c.render(row, idx)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setTableSort(tableId, sortKey) {
  const current = tableSortStates[tableId];
  tableSortStates[tableId] = {
    key: sortKey,
    dir: current && current.key === sortKey && current.dir === 'desc' ? 'asc' : 'desc'
  };
  renderApp();
}

function wireSortableTables() {
  document.querySelectorAll('.sortable-th[data-table-id][data-sort-key]').forEach(th => {
    th.addEventListener('click', () => setTableSort(th.dataset.tableId, th.dataset.sortKey));
  });}

function getPartnerAssetsForSeason(brand, period) {
  const rows = getTVRowsForPeriod(period).filter(r => r.Brand === brand);
  const assets = aggregateBy(rows, 'Location').sort((a, b) => b.qimv - a.qimv);
  return assets;
}

function renderPartnerNameWithAssets(partnerName, period) {
  const assets = getPartnerAssetsForSeason(partnerName, period);
  const safeName = partnerName.replace(/'/g, "\\'");
  if (!assets.length) return `<button type="button" onclick="selectBrandFromSurvey('${safeName}')" style="background:none;border:none;color:var(--text);cursor:pointer;text-align:left;padding:0;font:inherit;"><span style="text-decoration:underline;text-underline-offset:2px;">${partnerName}</span></button>`;
  const names = assets.map(a => a.name);
  const preview = names.slice(0, 4).join(', ') + (names.length > 4 ? ` + ${names.length - 4} more` : '');
  const title = names.map(a => `• ${a}`).join('\n');
  return `<button type="button" onclick="selectBrandFromSurvey('${safeName}')" style="background:none;border:none;color:var(--text);cursor:pointer;text-align:left;padding:0;font:inherit;display:block;width:100%;" title="Assets this season:\n${title.replace(/"/g, '&quot;')}"><span style="text-decoration:underline;text-underline-offset:2px;">${partnerName}</span><div style="font-size:11px;color:var(--text-muted);margin-top:3px;">${preview}</div></button>`;
}

function addPartnerYoY(rows, period) {
  // Use per-brand matchdate counting (same logic as individual brand pages) so that
  // portfolio leaderboard YoY always matches what the brand's own page shows.
  // A partner with fewer appearances than the portfolio average would otherwise get
  // a misleading prior-season comparison that includes more games than they played.
  if (!period || period === 'all') return rows.map(r => ({ ...r, yoyQimv: null, yoyBasis: null }));
  return rows.map(r => {
    const yoy = computeYoYForMetric(r.name, period, 'QI Media Value ($)');
    return { ...r, yoyQimv: yoy ? yoy.change : null, yoyBasis: yoy ? yoy.basis : null };
  });
}

function addLocationYoY(rows, period) {
  const sets = getPortfolioYoYRowSets(period);
  if (!sets) return rows.map(r => ({ ...r, yoyQpm: null, yoyQimv: null, yoyMinutes: null, yoyQiImpressions: null, yoyBasis: null }));
  const prevByLocation = aggregateBy(sets.priorRows, 'Location');
  const map = new Map(prevByLocation.map(r => [r.name, r]));
  return rows.map(r => {
    const prevRow = map.get(r.name);
    return {
      ...r,
      yoyQpm: prevRow ? pctChangeFromValues(r.qimvPerMin, prevRow.qimvPerMin) : null,
      yoyQimv: prevRow ? pctChangeFromValues(r.qimv, prevRow.qimv) : null,
      yoyMinutes: prevRow ? pctChangeFromValues(r.minutes, prevRow.minutes) : null,
      yoyQiImpressions: prevRow ? pctChangeFromValues(r.qiImpressions, prevRow.qiImpressions) : null,
      yoyBasis: sets.basis,
    };
  });
}

function getLocationSeasonTrend(locationName, metric = 'qimvPerMin') {
  return getPortfolioSeasons().map(season => {
    const rows = getTVRowsForPeriod(season).filter(r => (r.Location || 'Unknown') === locationName);
    const q = sum(rows, 'QI Media Value ($)');
    const m = sum(rows, 'Duration (Minutes)');
    const qi = sum(rows, 'Sponsorship QI Impressions');
    const value = metric === 'qimv' ? q : metric === 'minutes' ? m : metric === 'qiImpressions' ? qi : (m > 0 ? q / m : null);
    return { season, value };
  }).filter(d => d.value !== null && isFinite(d.value));
}

function encodeTrendPayload(title, points, formatterName = 'currency') {
  return encodeURIComponent(JSON.stringify({ title, points, formatterName }));
}

function getFormatterByName(formatterName) {
  if (formatterName === 'number') return formatNum;
  if (formatterName === 'duration') return formatDurationFromMinutes;
  return formatCurrency;
}

function renderMetricSparkline(points, formatter = formatCurrency, title = 'Trend', formatterName = 'currency') {
  if (!points || points.length < 2) return '<span class="sparkline" title="Need multiple seasons">—</span>';
  const maxVal = Math.max(...points.map(p => p.value));
  const minVal = Math.min(...points.map(p => p.value));
  const range = maxVal - minVal || 1;
  // viewBox scales to the CSS width/height (120x40). Larger viewBox = nicer resolution for the bigger cell.
  const w = 120, h = 40, pad = 4;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w / 2 : pad + (i * (w - pad * 2) / (points.length - 1));
    const y = h - pad - ((p.value - minVal) / range) * (h - pad * 2);
    return { x, y, p };
  });
  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const latest = points[points.length - 1];
  const payload = encodeTrendPayload(title, points, formatterName);
  return `<button class="trend-button" type="button" title="Click to expand trend" onclick="openTrendModal('${payload}')">
    <svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"></path>${coords.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${i === coords.length - 1 ? '3.2' : '2.2'}"></circle>`).join('')}</svg>
    <span class="trend-latest">${formatter(latest.value)}</span>
  </button>`;
}

function openTrendModal(encodedPayload) {
  const payload = JSON.parse(decodeURIComponent(encodedPayload));
  const points = payload.points || [];
  const formatter = getFormatterByName(payload.formatterName || 'currency');
  let modal = document.getElementById('trendModalBackdrop');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'trendModalBackdrop';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `<div class="modal"><div class="modal-header"><h2 class="modal-title" id="trendModalTitle"></h2><button class="modal-close" id="trendModalClose">✕</button></div><div id="trendModalBody"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    modal.querySelector('#trendModalClose').addEventListener('click', () => modal.classList.remove('active'));
  }
  const title = payload.title || 'Trend';
  modal.querySelector('#trendModalTitle').textContent = title;
  modal.querySelector('#trendModalBody').innerHTML = renderExpandedTrend(points, formatter);
  modal.classList.add('active');
}

function renderExpandedTrend(points, formatter) {
  if (!points.length) return '<div class="section-unavailable">No trend data available.</div>';
  const w = 620, h = 260, padL = 56, padR = 24, padT = 24, padB = 42;
  const values = points.map(p => Number(p.value) || 0);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const coords = points.map((p, i) => ({
    x: points.length === 1 ? (w - padL - padR) / 2 + padL : padL + (i * (w - padL - padR) / (points.length - 1)),
    y: padT + (1 - ((p.value - minVal) / range)) * (h - padT - padB),
    p
  }));
  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const guideVals = [maxVal, minVal];
  return `

    <svg class="trend-modal-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend chart">
      ${guideVals.map(v => {
        const y = padT + (1 - ((v - minVal) / range)) * (h - padT - padB);
        return `<line class="trend-modal-grid" x1="${padL}" x2="${w - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"></line><text class="trend-modal-label" x="6" y="${(y + 4).toFixed(1)}">${formatter(v)}</text>`;
      }).join('')}
      <path d="${d}"></path>
      ${coords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4"></circle><text class="trend-modal-value" x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" text-anchor="middle">${formatter(c.p.value)}</text><text class="trend-modal-label" x="${c.x.toFixed(1)}" y="${h - 12}" text-anchor="middle">${c.p.season}</text>`).join('')}
    </svg>
  `;
}

function getTopTakeaways(period) {
  const tvRows = getTVRowsForPeriod(period);
  const socialRows = getSocialRowsForPeriod(period);
  if (!tvRows.length && !socialRows.length) return ['Load data to generate portfolio takeaways.'];

  const takeaways = [];
  const yoySets = period !== 'all' ? getPortfolioYoYRowSets(period) : null;
  const totalQimv = sum(tvRows, 'QI Media Value ($)');
  const totalImp = sum(tvRows, 'Sponsorship Impressions');

  if (tvRows.length) {
    let qimvGrowthText = '';
    let impGrowthText = '';
    if (yoySets) {
      const prevQimv = sum(yoySets.priorRows, 'QI Media Value ($)');
      const prevImp  = sum(yoySets.priorRows, 'Sponsorship Impressions');
      const qimvChg  = pctChangeFromValues(totalQimv, prevQimv);
      const impChg   = pctChangeFromValues(totalImp,  prevImp);
      if (qimvChg !== null) qimvGrowthText = ` (${formatSignedPercent(qimvChg)} vs ${yoySets.priorSeason})`;
      if (impChg  !== null) impGrowthText  = ` (${formatSignedPercent(impChg)} vs ${yoySets.priorSeason})`;
    }
    takeaways.push(`<strong>QIMV —</strong> TV visible signage generated <strong>${formatCurrency(totalQimv)}</strong> in QI Media Value${qimvGrowthText}.`);
    takeaways.push(`<strong>Impressions —</strong> <strong>${formatNum(totalImp)}</strong> sponsorship impressions delivered${impGrowthText}.`);
  }

  const partners = addPartnerYoY(aggregateBy(tvRows, 'Brand'), period).sort((a, b) => b.qimv - a.qimv);
  if (partners[0]) {
    takeaways.push(`<strong>${partners[0].name}</strong> led the portfolio by total TV QI Media Value at <strong>${formatCurrency(partners[0].qimv)}</strong>${partners[0].yoyQimv !== null ? ` (${formatSignedPercent(partners[0].yoyQimv)} YoY)` : ''}.`);
  }

  const locations = addLocationYoY(aggregateBy(tvRows, 'Location'), period).sort((a, b) => b.qimvPerMin - a.qimvPerMin);
  if (locations[0]) {
    takeaways.push(`<strong>${locations[0].name}</strong> was the strongest location by QIMV/min at <strong>${formatCurrency(locations[0].qimvPerMin)}</strong>${locations[0].yoyQpm !== null ? ` (${formatSignedPercent(locations[0].yoyQpm)} YoY)` : ''}.`);
  }

  if (socialRows.length) {
    takeaways.push(`Organic social contributed <strong>${formatNum(sum(socialRows, 'Impressions'))}</strong> impressions across <strong>${socialRows.length}</strong> posts in the selected period.`);
  }

  if (Array.isArray(DASHBOARD_META.manualTakeaways)) {
    DASHBOARD_META.manualTakeaways.filter(Boolean).forEach(t => takeaways.push(t));
  }

  return takeaways.slice(0, 5);
}



function renderBreadcrumb(items = []) {
  const safeItems = items.filter(Boolean);
  if (!safeItems.length) return '';
  return `<nav class="breadcrumb" aria-label="Breadcrumb">
    ${safeItems.map((item, i) => {
      const label = String(item.label || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const sep = i ? '<span class="crumb-sep">/</span>' : '';
      if (item.action) return `${sep}<button type="button" onclick="${item.action}">${label}</button>`;
      return `${sep}<span class="crumb-current">${label}</span>`;
    }).join('')}
  </nav>`;
}

function getTableLimitValue(tableId) {
  const val = TABLE_LIMITS[tableId];
  return val === 'all' ? 'all' : Number(val || 10);
}

function limitRowsForTable(rows, tableId) {
  const limit = getTableLimitValue(tableId);
  if (limit === 'all') return rows;
  return rows.slice(0, limit);
}

function renderLimitControls(tableId, total = 0) {
  const active = getTableLimitValue(tableId);
  return `<div class="table-limit-toggle" data-limit-group="${tableId}" title="Change table length">
    <span>Show</span>
    ${[10, 25, 'all'].map(v => `<button type="button" class="${active === v ? 'active' : ''}" data-limit-table="${tableId}" data-limit-value="${v}" onclick="setTableLimitAndRender('${tableId}','${v}', event)">${v === 'all' ? 'All' : v}</button>`).join('')}
  </div>`;
}

function setTableLimitAndRender(tableId, rawValue, evt) {
  if (evt && evt.stopPropagation) evt.stopPropagation();
  TABLE_LIMITS[tableId] = rawValue === 'all' ? 'all' : Number(rawValue);
  renderApp();
}

function wireLimitControls() {
  document.querySelectorAll('[data-limit-table]').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const table = btn.dataset.limitTable;
      const raw = btn.dataset.limitValue;
      setTableLimitAndRender(table, raw, evt);
    });
  });
}

function parseDateLoose(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  const str = String(value).trim();
  if (!str) return null;
  const direct = new Date(str);
  if (!isNaN(direct)) return direct;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const year = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : new Date().getFullYear();
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
    return isNaN(d) ? null : d;
  }
  return null;
}

function formatShortDate(d) {
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDateRangeForRows(rows, keys) {
  const dates = [];
  (rows || []).forEach(r => {
    keys.forEach(k => {
      const d = parseDateLoose(r && r[k]);
      if (d) dates.push(d);
    });
  });
  if (!dates.length) return null;
  return { min: new Date(Math.min(...dates)), max: new Date(Math.max(...dates)) };
}

function getChannelFreshnessSummary(brand = null) {
  const tvRows = brand ? getBrandTVData(brand, 'all') : (DataStore.tvSignage || []);
  const paidRows = brand ? getBrandPaidData(brand, 'all') : getAllPaidRows().filter(r => r.Brand !== UNASSIGNED_PAID_KEY);
  const organicRows = brand
    ? [
        ...(DataStore.zoomphBrandPerf || []).filter(r => r.Brand === brand),
        ...(DataStore.zoomphContentSeries || []).filter(r => r.Brand === brand),
        ...(DataStore.zoomphAssets || []).filter(r => r.Brand === brand),
        ...getBrandSocialData(brand, 'all')
      ]
    : [
        ...(DataStore.zoomphBrandPerf || []),
        ...(DataStore.zoomphContentSeries || []),
        ...(DataStore.zoomphAssets || []),
        ...Object.values(DataStore.organicSocial || {}).flat()
      ];
  const surveyRows = brand ? (DataStore.surveys || []).filter(r => r.Brand === brand) : (DataStore.surveys || []);
  const tvRange = getDateRangeForRows(tvRows, ['Matchdate', 'Match Date', 'Date', 'Game Date']);
  const paidRange = getDateRangeForRows(paidRows, ['Ends', 'EndDate', 'Reporting ends', 'Reporting Ends', 'Starts', 'StartDate']);
  const organicRange = getDateRangeForRows(organicRows, ['ReportDate', '_reportDate', 'Date', 'PublishDate', 'Posted Date']);
  const surveyRange = getDateRangeForRows(surveyRows, ['SurveyDate', 'Date', 'ReportDate']);
  return [
    { key: 'TV', rows: tvRows.length, range: tvRange, note: tvRange ? `${formatShortDate(tvRange.min)} → ${formatShortDate(tvRange.max)}` : 'No date coverage found' },
    { key: 'Organic', rows: organicRows.length, range: organicRange, note: organicRange ? `${formatShortDate(organicRange.min)} → ${formatShortDate(organicRange.max)}` : 'No date coverage found' },
    { key: 'Paid', rows: paidRows.length, range: paidRange, note: paidRange ? `${formatShortDate(paidRange.min)} → ${formatShortDate(paidRange.max)}` : 'No date coverage found' },
    { key: 'Survey', rows: surveyRows.length, range: surveyRange, note: surveyRange ? `${formatShortDate(surveyRange.min)} → ${formatShortDate(surveyRange.max)}` : 'No date coverage found' },
  ];
}

function renderDataFreshnessStrip(brand = null) {
  const rows = getChannelFreshnessSummary(brand).filter(x => x.rows > 0);
  if (!rows.length) return '';
  return `<div class="freshness-strip">
    ${rows.map(x => `<div class="freshness-item">
      <div class="freshness-label">${x.key} freshness</div>
      <div class="freshness-value">${x.range ? formatShortDate(x.range.max) : 'Loaded'}</div>
      <div class="freshness-note">${formatNum(x.rows)} row${x.rows === 1 ? '' : 's'} · ${x.note}</div>
    </div>`).join('')}
  </div>`;
}

function renderDataHealthPage(main) {
  const allPaid = getAllPaidRows();
  const assignedPaid = allPaid.filter(r => r.Brand && r.Brand !== UNASSIGNED_PAID_KEY).length;
  const paidReview = (typeof getPaidAssignmentSummary === 'function') ? getPaidAssignmentSummary() : { medium: 0, unassigned: 0 };
  const unmatchedPaid = (paidReview.medium || 0) + (paidReview.unassigned || 0);
  const rosterActive = DataStore.partnerRoster && DataStore.partnerRoster.length > 0;
  const brandCount = DataStore.brands.size;
  const freshness = getChannelFreshnessSummary();
  const missingDates = freshness.filter(f => f.rows > 0 && !f.range).map(f => f.key);
  const allRows = {
    tv: (DataStore.tvSignage || []).length,
    organic: (DataStore.zoomphBrandPerf||[]).length + (DataStore.zoomphContentSeries||[]).length + (DataStore.zoomphAssets||[]).length + Object.values(DataStore.organicSocial || {}).flat().length,
    paid: allPaid.length,
    survey: (DataStore.surveys || []).length
  };
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Data Health'}])}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Data Health</h2>
        <span class="section-meta">Portfolio readiness · Local/offline data audit</span>
      </div>
 to answer the trust question before anyone uses the dashboard: what data is loaded, how current is it, and what still needs review? It does not change your source data; it only summarizes what is currently embedded or imported in this local file.
      </div>
      <div class="foundation-grid">
        <div class="health-card good"><div class="health-label">Brands loaded</div><div class="health-value">${formatNum(brandCount)}</div><div class="health-note">Unique canonical brands after alias/merge rules.</div></div>
        <div class="health-card ${unmatchedPaid ? 'warning' : 'good'}"><div class="health-label">Paid mapping review</div><div class="health-value">${formatNum(unmatchedPaid)}</div><div class="health-note">Medium confidence or unassigned paid campaign rows.</div></div>
        <div class="health-card ${rosterActive ? 'good' : 'warning'}"><div class="health-label">Partner roster</div><div class="health-value">${rosterActive ? formatNum(DataStore.partnerRoster.length) : 'Not loaded'}</div><div class="health-note">Roster improves search, partner-only filters, and alias validation.</div></div>
        <div class="health-card ${missingDates.length ? 'warning' : 'good'}"><div class="health-label">Date coverage</div><div class="health-value">${missingDates.length ? `${missingDates.length} issue${missingDates.length === 1 ? '' : 's'}` : 'Healthy'}</div><div class="health-note">${missingDates.length ? `Missing date coverage in: ${missingDates.join(', ')}.` : 'Loaded channels have usable date coverage.'}</div></div>
      </div>
      ${renderDataFreshnessStrip()}
      <div class="card">
        <div class="card-header">
          <span class="card-title">Loaded source summary</span>
          <span class="card-sub">Rows by channel</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Channel</th><th class="num">Rows</th><th>Latest coverage</th><th>Notes</th></tr></thead>
          <tbody>
            ${freshness.map(f => `<tr><td>${f.key}</td><td class="num">${formatNum(f.rows)}</td><td>${f.range ? formatShortDate(f.range.max) : '—'}</td><td>${f.rows ? f.note : 'No rows loaded'}</td></tr>`).join('')}
            <tr><td>Paid assigned rows</td><td class="num">${formatNum(assignedPaid)}</td><td>—</td><td>${formatNum(unmatchedPaid)} paid rows still need assignment review.</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderGlossaryPage(main) {
  // Map glossary term labels to the keys used in the GLOSSARY constant
  const definitions = [
    ['QIMV (QI Media Value)',       GLOSSARY['QIMV']],
    ['QIMV / Minute',               GLOSSARY['QIMV per Minute']],
    ['QI Score',                    GLOSSARY['QI Score']],
    ['QI Impressions',              GLOSSARY['Sponsorship QI Impressions']],
    ['Share of Voice (SoV)',        GLOSSARY['Share of Voice']],
    ['100% Media Value',            GLOSSARY['100% Media Value']],
    ['Duration',                    GLOSSARY['Duration']],
    ['YoY (Year over Year)',        'A comparison of a metric in the current season against the same metric in the prior season. The dashboard uses automatic game counting to ensure fair comparisons mid-season.'],
    ['Game-over-game (GOG)',        'A comparison of the current accumulated total against the equivalent game count in the prior season. Used when a season is in progress.'],
    ['Reported Reach',              GLOSSARY['Reach']],
    ['CTR (Click-through Rate)',    GLOSSARY['CTR']],
    ['CPM (Cost per 1,000 Impr.)', GLOSSARY['CPM']],
    ['CPC (Cost per Click)',        GLOSSARY['CPC']],
    ['Cost per Result',             GLOSSARY['Cost per Result']],
    ['Results',                     GLOSSARY['Results']],
    ['Brand Exposure Value',        GLOSSARY['Brand Exposure Value']],
    ['Engagement Rate',             GLOSSARY['Engagement Rate']],
    ['Impressions',                 GLOSSARY['Impressions']],
    ['Unaided Recall',              GLOSSARY['Unaided Recall']],
    ['Aided Recall',                GLOSSARY['Aided Recall']],
    ['Local HQ Recall',             GLOSSARY['Local HQ Recall']],
  ];
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Glossary & Methodology'}])}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Glossary & Methodology</h2>
        <span class="section-meta">Shared metric definitions</span>
      </div>

      <div class="glossary-grid">
        ${definitions.map(([term, copy]) => `<div class="glossary-card"><h3>${term}</h3><p>${copy || 'Definition pending.'}</p></div>`).join('')}
      </div>
    </section>`;
}

function renderHomeLeaderboard(period) {
  const rows = getTVRowsForPeriod(period);
  if (!rows.length) return `<div class="section-unavailable">Load TV signage data to populate portfolio leaderboards.</div>`;

  const partnerRows = addPartnerYoY(aggregateBy(rows, 'Brand'), period);

  const partnerColumns = [
    { label: '#', cls: 'num', render: (r, i) => i + 1 },
    { label: 'Partner', sortKey: 'partner', sortValue: r => r.name, render: r => renderPartnerNameWithAssets(r.name, period) },
    { label: `TV QIMV ${makeInfoIcon('QIMV')}`, cls: 'num sep', sortKey: 'qimv', sortValue: r => r.qimv, render: r => formatCurrency(r.qimv) },
    { label: `QI Impressions ${makeInfoIcon('Sponsorship QI Impressions')}`, cls: 'num', sortKey: 'qiImpressions', sortValue: r => r.qiImpressions, render: r => formatNum(r.qiImpressions) },
    { label: `Duration ${makeInfoIcon('Duration')}`, cls: 'num', sortKey: 'duration', sortValue: r => r.minutes, render: r => formatDurationFromMinutes(r.minutes) },
    { label: comparisonMode === 'auto-match' ? 'QIMV YoY / GOG' : 'Total QIMV YoY', cls: 'num', sortKey: 'yoyQimv', sortValue: r => r.yoyQimv ?? -Infinity, render: r => formatSignedPercent(r.yoyQimv) },
    { label: 'Assets', cls: 'num', sortKey: 'assets', sortValue: r => r.locationCount, render: r => r.locationCount },
  ];

  const configs = {
    brand_qimv: {
      title: 'Top partners by TV QI Media Value',
      note: 'Ranks partners by total delivered TV value. This avoids unfair efficiency comparisons between partners with different asset packages.',
      rows: [...partnerRows].sort((a, b) => b.qimv - a.qimv),
      columns: partnerColumns
    },
    brand_qi_impressions: {
      title: 'Top partners by TV QI Impressions',
      note: 'Ranks partners by quality-adjusted sponsorship impressions for the selected season.',
      rows: [...partnerRows].sort((a, b) => b.qiImpressions - a.qiImpressions),
      columns: partnerColumns
    },
    brand_duration: {
      title: 'Top partners by TV Duration',
      note: 'Ranks partners by total on-screen time. Duration is shown as HH:MM:SS.',
      rows: [...partnerRows].sort((a, b) => b.minutes - a.minutes),
      columns: partnerColumns
    },
    brand_yoy_up: {
      title: 'Biggest partner QIMV increases',
      note: 'Shows the largest positive Total QIMV movement versus the prior season using the selected comparison mode.',
      rows: [...partnerRows].filter(r => r.yoyQimv !== null).sort((a, b) => b.yoyQimv - a.yoyQimv),
      columns: partnerColumns
    },
    brand_yoy_down: {
      title: 'Biggest partner QIMV declines',
      note: 'Shows the largest negative Total QIMV movement versus the prior season using the selected comparison mode.',
      rows: [...partnerRows].filter(r => r.yoyQimv !== null).sort((a, b) => a.yoyQimv - b.yoyQimv),
      columns: partnerColumns
    }
  };

  if (!configs[homeLeaderboardMetric] || homeLeaderboardMetric.startsWith('location')) homeLeaderboardMetric = 'brand_qimv';
  const cfg = configs[homeLeaderboardMetric];
  const basis = getPortfolioYoYRowSets(period);
  const displayRows = limitRowsForTable(cfg.rows, 'homeLeaderboard');
  const limitLabel = getTableLimitValue('homeLeaderboard') === 'all' ? 'All' : `Top ${getTableLimitValue('homeLeaderboard')}`;

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${cfg.title}</span>
        <span class="card-sub">${limitLabel} of ${cfg.rows.length}</span>
      </div>
      <div class="control-row">
        <div class="leaderboard-note">${cfg.note}${basis ? `<br><span class="comparison-basis">Comparison basis: ${basis.basis}</span>` : ''}</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
        <select class="select-control" id="homeLeaderboardSelect">
          <option value="brand_qimv" ${homeLeaderboardMetric === 'brand_qimv' ? 'selected' : ''}>Top partners · TV QI Media Value</option>
          <option value="brand_qi_impressions" ${homeLeaderboardMetric === 'brand_qi_impressions' ? 'selected' : ''}>Top partners · QI Impressions</option>
          <option value="brand_duration" ${homeLeaderboardMetric === 'brand_duration' ? 'selected' : ''}>Top partners · Duration</option>
          <option value="brand_yoy_up" ${homeLeaderboardMetric === 'brand_yoy_up' ? 'selected' : ''}>Top partners · Biggest QIMV increase</option>
          <option value="brand_yoy_down" ${homeLeaderboardMetric === 'brand_yoy_down' ? 'selected' : ''}>Top partners · Biggest QIMV decline</option>
        </select>
        ${renderLimitControls('homeLeaderboard', cfg.rows.length)}
        </div>
      </div>
      ${renderSimpleLeaderboardTable(displayRows, cfg.columns, 'homeLeaderboard')}
    </div>
  `;
}


function renderLocationPerformancePanel(period) {
  const byLocation = addLocationYoY(aggregateBy(getTVRowsForPeriod(period), 'Location'), period)
    .sort((a, b) => b.qimv - a.qimv);
  const displayLocations = limitRowsForTable(byLocation, 'locationPerformance');

  return `
    <div class="card" style="margin-top: 18px;">
      <div class="card-header">
        <span class="card-title">Location performance</span>
        <span class="card-sub">Asset inventory view · ${displayLocations.length} of ${byLocation.length}</span>
        ${renderLimitControls('locationPerformance', byLocation.length)}
      </div>
      
      <div style="max-height:440px;overflow-y:auto;"><div id="location-table-inner">
      ${renderSimpleLeaderboardTable(displayLocations, [
        { label: 'Location', sortKey: 'location', sortValue: r => r.name, render: r => r.name },
        { label: `QIMV ${makeInfoIcon('QIMV')}`, cls: 'num sep', sortKey: 'qimv', sortValue: r => r.qimv, render: r => formatCurrency(r.qimv) },
        { label: `QIMV / Min ${makeInfoIcon('QIMV per Minute')}`, cls: 'num', sortKey: 'qpm', sortValue: r => r.qimvPerMin, render: r => formatCurrency(r.qimvPerMin) },
        { label: `Duration ${makeInfoIcon('Duration')}`, cls: 'num', sortKey: 'duration', sortValue: r => r.minutes, render: r => formatDurationFromMinutes(r.minutes) },
        { label: `QI Impressions ${makeInfoIcon('Sponsorship QI Impressions')}`, cls: 'num', sortKey: 'qiImpressions', sortValue: r => r.qiImpressions, render: r => formatNum(r.qiImpressions) },
        { label: 'Partners with Asset', cls: 'num', sortKey: 'partners', sortValue: r => r.brandCount, render: r => r.brandCount },
        { label: `QIMV/Min YoY ${makeInfoIcon('QIMV per Minute')}`, cls: 'num', sortKey: 'yoyQpm', sortValue: r => r.yoyQpm ?? -Infinity, render: r => formatSignedPercent(r.yoyQpm) },
        { label: 'Trend', cls: 'num', sortKey: 'trendLatest', sortValue: r => r.qimvPerMin, render: r => renderMetricSparkline(getLocationSeasonTrend(r.name, 'qimvPerMin'), formatCurrency, `${r.name} · QIMV/min trend`, 'currency') },
      ], 'locationPerformance')}
      </div></div>
      </div>
    </div>
  `;
}


// ============================================================
