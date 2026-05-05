function renderTVSection(brand) {
  const rows = getBrandTVData(brand, currentPeriod);
  if (!rows.length) return;

  const qiImp = sum(rows, 'Sponsorship QI Impressions');
  const totalMV = sum(rows, '100% Media Value ($)');
  const qiMV = sum(rows, 'QI Media Value ($)');
  const totalDur = sum(rows, 'Duration (Minutes)');
  const avgQI = avg(rows, 'QI Score');
  const avgSOV = avg(rows, 'Share of Voice (%)');
  const qimvPerMin = totalDur > 0 ? qiMV / totalDur : 0;

  // YoY via auto-match logic
  const mvYoY = computeYoYForMetric(brand, currentPeriod, 'QI Media Value ($)');
  const basisSets = getYoYRowSets(brand, currentPeriod);
  const basisLine = basisSets ? basisSets.basis : null;

  // Summary strip for collapsed header
  const matchCount = getUniqueMatchdates(rows).length;
  const comparisonLabel = comparisonMode === 'auto-match' ? 'YoY / GOG QIMV' : 'YoY QIMV';
  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Total QI Impressions</span>
      <span class="value">${formatNum(qiImp)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Total QIMV</span>
      <span class="value">${formatCurrency(qiMV)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">${comparisonLabel}</span>
      <span class="value ${mvYoY === null ? '' : mvYoY.change >= 0 ? 'up' : 'down'}">${mvYoY === null ? '—' : `${mvYoY.change >= 0 ? '▲' : '▼'} ${Math.abs(mvYoY.change * 100).toFixed(1)}%`}</span>
    </div>
  `;

  const sectionId = 'section-tv';
  const isOpen = !!openSections[sectionId];

  document.getElementById('tv-slot').innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">TV Visible Signage</div>
          <div class="section-meta" style="margin-top: 2px;">${matchCount} Game${matchCount === 1 ? '' : 's'} · ${currentPeriod === 'all' ? 'All Seasons' : currentPeriod}</div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>

      <div class="section-body">
        ${basisLine ? `<div class="comparison-basis block" style="margin-bottom: 16px;">YoY basis: ${basisLine}</div>` : ''}

        ${(function() {
          const vsRowsForBrand = getVirtualBrandingTVRows(brand);
          return vsRowsForBrand.length ? `
            <div class="comparison-basis block" style="margin-bottom: 16px; line-height: 1.6;">
              <strong>Note:</strong> On-Court Virtual Signage rows (Center + 3-Point Line) have been
              excluded from these TV figures and are reported separately in the
              <strong>On-Court Virtual Signage</strong> tab above.
            </div>
          ` : '';
        })()}

        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">QI Media Value ${makeInfoIcon('QI Media Value')}</span>
            <span class="kpi-value">${formatCurrency(qiMV)}</span>
            ${mvYoY ? `<span class="kpi-change ${mvYoY.change >= 0 ? 'up' : 'down'}">${mvYoY.change >= 0 ? '▲' : '▼'} ${Math.abs(mvYoY.change * 100).toFixed(1)}% YoY</span>` : '<span class="kpi-change neutral">—</span>'}
          </div>
          <div class="kpi">
            <span class="kpi-label">Sponsorship QI Impressions ${makeInfoIcon('Sponsorship QI Impressions')}</span>
            <span class="kpi-value">${formatNum(qiImp)}</span>
            <span class="kpi-change neutral">Quality-adjusted</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Exposure Duration ${makeInfoIcon('Duration')}</span>
            <span class="kpi-value">${formatDurationFromMinutes(totalDur)}</span>
            <span class="kpi-change neutral">HH:MM:SS on-screen total</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Avg Share of Voice ${makeInfoIcon('Share of Voice')}</span>
            <span class="kpi-value">${avgSOV.toFixed(1)}<span class="unit">%</span></span>
            <span class="kpi-change neutral">Per exposure</span>
          </div>
        </div>

        <!-- Asset performance breakdown -->
        <div class="card" style="margin-top: 18px; margin-bottom: 18px;">
          <div class="card-header">
            <span class="card-title">Asset performance breakdown ${makeInfoIcon('QIMV per Minute')}</span>
            <span class="card-sub">YoY QIMV/min · Hover a row for ranking</span>
          </div>
          ${renderAssetBreakdown(brand, currentPeriod)}
        </div>

        <!-- Asset Performance Quadrant -->
        <div class="card" style="margin-bottom: 18px;">
          <div class="card-header">
            <span class="card-title">Asset performance quadrant ${makeInfoIcon('Asset Performance Quadrant')}</span>
            <span class="card-sub">Vs location average · Bubble size = duration</span>
          </div>
          <div class="quadrant-wrap" id="asset-quadrant"></div>
          <div class="quadrant-legend">
            <span><span class="quadrant-legend-dot" style="background: var(--positive);"></span>Scale — high volume, high efficiency</span>
            <span><span class="quadrant-legend-dot" style="background: var(--text);"></span>Protect — high efficiency, room to grow volume</span>
            <span><span class="quadrant-legend-dot" style="background: var(--negative);"></span>Review — high volume but inefficient</span>
            <span><span class="quadrant-legend-dot" style="background: var(--text-muted);"></span>Improve — low on both axes</span>
          </div>
        </div>

        <!-- Pace Chart -->
        <div class="card" style="margin-bottom: 18px;">
          <div class="card-header">
            <span class="card-title">Season pace — cumulative QIMV game-by-game</span>
            <span class="card-sub">Current vs prior at same point</span>
          </div>
          <div class="pace-chart-wrap" id="pace-chart"></div>
        </div>

        <!-- Top games -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Top games by QI Media Value</span>
            <span class="card-sub">QIMV ($)</span>
          </div>
          <div style="overflow-x: auto;">
            ${renderTopMatchesTable(rows)}
          </div>
        </div>
      </div>
    </section>
  `;

  if (isOpen) {
    renderAssetQuadrant(brand, currentPeriod);
    renderPaceChart(brand, currentPeriod);
    wireAssetBreakdownHovers(brand, currentPeriod);
  }
}


function getPreviousSeasonForPeriod(brand, period) {
  const seasons = getAvailableSeasons(brand);
  if (seasons.length < 2) return null;
  if (period === 'all') return seasons[seasons.length - 2];
  const idx = seasons.indexOf(period);
  return idx > 0 ? seasons[idx - 1] : null;
}

function aggregateAssetRows(rows) {
  const byAsset = {};
  rows.forEach(r => {
    const k = r.Location || 'Unknown';
    if (!byAsset[k]) byAsset[k] = { exposures: 0, duration: 0, impressions: 0, qimv: 0, mv: 0, qiScoreSum: 0, qiCount: 0, sovSum: 0, sovCount: 0, rowCount: 0 };
    byAsset[k].exposures += Number(r['Total Exposures']) || 0;
    byAsset[k].duration += Number(r['Duration (Minutes)']) || 0;
    byAsset[k].impressions += Number(r['Sponsorship QI Impressions']) || 0;
    byAsset[k].qimv += Number(r['QI Media Value ($)']) || 0;
    byAsset[k].mv += Number(r['100% Media Value ($)']) || 0;
    byAsset[k].qiScoreSum += Number(r['QI Score']) || 0;
    byAsset[k].qiCount += 1;
    byAsset[k].sovSum += Number(r['Share of Voice (%)']) || 0;
    byAsset[k].sovCount += 1;
    byAsset[k].rowCount += 1;
  });
  return byAsset;
}

function assetStatsFromAggregate(byAsset) {
  return Object.entries(byAsset).map(([name, v]) => ({
    name,
    exposures: v.exposures,
    duration: v.duration,
    impressions: v.impressions,
    qimv: v.qimv,
    mv: v.mv,
    qimvPerMin: v.duration > 0 ? v.qimv / v.duration : 0,
    avgQI: v.qiCount > 0 ? v.qiScoreSum / v.qiCount : 0,
    avgSOV: v.sovCount > 0 ? v.sovSum / v.sovCount : 0,
    rowCount: v.rowCount,
  }));
}

function getAssetYoYChange(brand, assetName, period) {
  const sets = getYoYRowSets(brand, period);
  if (!sets) return null;

  const currRows = sets.currRows.filter(r => (r.Location || 'Unknown') === assetName);
  const prevRows = sets.priorRows.filter(r => (r.Location || 'Unknown') === assetName);
  if (!currRows.length || !prevRows.length) return null;

  const currQimv = sum(currRows, 'QI Media Value ($)');
  const currMinutes = sum(currRows, 'Duration (Minutes)');
  const prevQimv = sum(prevRows, 'QI Media Value ($)');
  const prevMinutes = sum(prevRows, 'Duration (Minutes)');
  if (currMinutes <= 0 || prevMinutes <= 0) return null;

  const curr = currQimv / currMinutes;
  const prev = prevQimv / prevMinutes;
  const change = pctChange(curr, prev);
  if (change === null) return null;
  return {
    change,
    curr,
    prev,
    compareSeason: sets.currSeason,
    previousSeason: sets.priorSeason,
    basis: sets.basis,
    matched: sets.matched,
  };
}

function renderYoYChange(yoy) {
  if (!yoy) return '<span class="yoy-change neutral">—</span>';
  const cls = yoy.change >= 0 ? 'up' : 'down';
  const arrow = yoy.change >= 0 ? '▲' : '▼';
  const title = yoy.basis || `${yoy.previousSeason} to ${yoy.compareSeason}`;
  return `<span class="yoy-change ${cls}" title="${title}">${arrow} ${Math.abs(yoy.change * 100).toFixed(1)}%</span>`;
}


function getAssetSortIndicator(key) {
  if (assetSortKey !== key) return '<span class="sortable-indicator">↕</span>';
  return `<span class="sortable-indicator">${assetSortDir === 'asc' ? '▲' : '▼'}</span>`;
}

function makeAssetSortHeader(label, key, extra = '') {
  return `<th class="num sortable-th" data-sort-key="${key}">${label} ${extra} ${getAssetSortIndicator(key)}</th>`;
}

function sortAssetRows(assets) {
  const dir = assetSortDir === 'asc' ? 1 : -1;
  const sorted = [...assets].sort((a, b) => {
    const av = a[assetSortKey];
    const bv = b[assetSortKey];
    if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * dir;
    return ((av || 0) - (bv || 0)) * dir;
  });
  return sorted;
}

function getAssetSeasonTrend(brand, assetName) {
  const seasons = getAvailableSeasons(brand);
  return seasons.map(season => {
    const rows = getBrandTVData(brand, season).filter(r => (r.Location || 'Unknown') === assetName);
    const q = sum(rows, 'QI Media Value ($)');
    const m = sum(rows, 'Duration (Minutes)');
    return { season, value: rows.length && m > 0 ? q / m : null };
  }).filter(d => d.value !== null);
}


function renderAssetBreakdown(brand, period) {
  const rows = getBrandTVData(brand, period);
  let assets = assetStatsFromAggregate(aggregateAssetRows(rows));

  assets = assets.map(a => {
    const yoy = getAssetYoYChange(brand, a.name, period);
    const trend = getAssetSeasonTrend(brand, a.name);
    return {
      ...a,
      yoy,
      yoyPct: yoy ? yoy.change : -999,
      trend,
    };
  });

  if (!assets.length) return `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No asset data for this period.</div>`;

  assets = sortAssetRows(assets);

  // Basis line — describes what we're comparing. Small, non-dominant.
  const sampleSets = getYoYRowSets(brand, period);
  const basisLine = sampleSets ? sampleSets.basis : null;

  const yoyNote = period === 'all'
    ? 'Latest season vs previous season when the partner had the same asset.'
    : `${period} vs previous season when the partner had the same asset.`;

  return `
    ${basisLine ? `<div style="margin-bottom:10px;"><span class="comparison-basis">YoY: ${basisLine}</span></div>` : ''}
    <div style="overflow-x: auto;">
    <table class="data-table">
      <thead>
        <tr>
          <th class="sortable-th" data-sort-key="name">Asset ${getAssetSortIndicator('name')}</th>
          ${makeAssetSortHeader('Exposures', 'exposures', makeInfoIcon('Total Exposures'))}
          ${makeAssetSortHeader('On-Screen', 'duration', makeInfoIcon('Duration'))}
          ${makeAssetSortHeader('QI Impressions', 'impressions', makeInfoIcon('Sponsorship QI Impressions'))}
          ${makeAssetSortHeader('QIMV', 'qimv', makeInfoIcon('QI Media Value'))}
          ${makeAssetSortHeader('QIMV/Min', 'qimvPerMin', makeInfoIcon('QIMV per Minute'))}
          ${makeAssetSortHeader('YoY QIMV/Min', 'yoyPct', makeInfoIcon('QIMV per Minute'))}
          ${makeAssetSortHeader('Avg QI', 'avgQI', makeInfoIcon('QI Score'))}
          ${makeAssetSortHeader('SoV', 'avgSOV', makeInfoIcon('Share of Voice'))}
          <th class="num">Rank</th>
          <th class="num">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${assets.map(a => {
          const rankInfo = getBrandRankOnAsset(brand, a.name, period);
          const rankCls = rankInfo ? (rankInfo.rank === 1 ? 'top' : rankInfo.rank > Math.ceil(rankInfo.total * 2 / 3) ? 'bottom' : '') : '';
          const rankText = rankInfo ? `${rankInfo.rank} / ${rankInfo.total}` : '—';
          const trendTitle = `${a.name} QIMV/min`;
          const trendHtml = renderMetricSparkline(a.trend, formatCurrency, trendTitle, 'currency');
          return `
            <tr class="asset-row" data-asset="${a.name.replace(/"/g, '&quot;')}">
              <td class="asset-name">${a.name}</td>
              <td class="num">${formatNum(a.exposures)}</td>
              <td class="num">${formatDurationFromMinutes(a.duration)}</td>
              <td class="num">${formatNum(a.impressions)}</td>
              <td class="num" style="color: var(--text); font-weight: 500;">${formatCurrency(a.qimv)}</td>
              <td class="num">${formatCurrency(a.qimvPerMin)}</td>
              <td class="num">${renderYoYChange(a.yoy)}</td>
              <td class="num">${a.avgQI.toFixed(1)}</td>
              <td class="num">${a.avgSOV.toFixed(1)}%</td>
              <td class="num"><span class="rank-badge ${rankCls}">${rankText}</span></td>
              <td class="num trend-cell">${trendHtml}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    </div>
  `;
}
function wireAssetBreakdownHovers(brand, period) {
  document.querySelectorAll('.asset-row[data-asset]').forEach(row => {
    const asset = row.dataset.asset;
    attachAssetRankTooltip(row, brand, asset, period);
  });
  document.querySelectorAll('[data-sort-key]').forEach(el => {
    if (el.dataset.sortWired) return;
    el.dataset.sortWired = '1';
    el.addEventListener('click', () => {
      const key = el.dataset.sortKey;
      if (!key) return;
      if (assetSortKey === key) assetSortDir = assetSortDir === 'asc' ? 'desc' : 'asc';
      else {
        assetSortKey = key;
        assetSortDir = key === 'name' ? 'asc' : 'desc';
      }
      renderApp();
    });
  });
}

function renderTopMatchesTable(rows) {
  const top = [...rows].sort((a, b) => (b['QI Media Value ($)'] || 0) - (a['QI Media Value ($)'] || 0)).slice(0, 8);
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Game</th><th>Date</th><th>Location</th>
          <th class="num">QI Impressions ${makeInfoIcon('Sponsorship QI Impressions')}</th>
          <th class="num">QIMV ${makeInfoIcon('QI Media Value')}</th>
          <th class="num">QI Score ${makeInfoIcon('QI Score')}</th>
        </tr>
      </thead>
      <tbody>
        ${top.map(r => `
          <tr>
            <td>${r.Match || '—'}</td>
            <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);">${r.Matchdate || '—'}</td>
            <td style="color: var(--text-dim);">${r.Location || '—'}</td>
            <td class="num">${formatNum(r['Sponsorship QI Impressions'])}</td>
            <td class="num" style="font-weight: 500;">${formatCurrency(r['QI Media Value ($)'])}</td>
            <td class="num">${(r['QI Score'] || 0).toFixed(1)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#a0a2a5', font: { family: 'system-ui', size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: '#000', borderColor: '#2a2d32', borderWidth: 1,
        titleColor: '#eaebec', bodyColor: '#eaebec', titleFont: { family: 'Geist Mono', size: 11 },
        bodyFont: { family: 'Geist', size: 12 }, padding: 10, boxPadding: 4,
      }
    },
    scales: {
      x: { grid: { color: '#1f2125', drawBorder: false }, ticks: { color: '#a0a2a5', font: { family: 'ui-monospace', size: 10 } } },
      y: { grid: { color: '#1f2125', drawBorder: false }, ticks: { color: '#a0a2a5', font: { family: 'ui-monospace', size: 10 }, callback: v => formatNum(v) } }
    }
  };
}

// ============================================================
// ASSET PERFORMANCE QUADRANT — interactive SVG scatter
// ============================================================
// X axis: QIMV per minute (efficiency)
// Y axis: Total QIMV (volume)
// Bubble size: on-screen duration
// Quadrants split on median values. The four quadrants give AMs an instant read
// on each asset's strategic position: Scale / Protect / Review / Improve.
function getLocationQpmAverage(locationName, period) {
  const rows = getTVRowsForPeriod(period).filter(r => (r.Location || 'Unknown') === locationName);
  const q = sum(rows, 'QI Media Value ($)');
  const m = sum(rows, 'Duration (Minutes)');
  return m > 0 ? q / m : null;
}

function renderAssetQuadrant(brand, period) {
  const container = document.getElementById('asset-quadrant');
  if (!container) return;

  const rows = getBrandTVData(brand, period);
  let assets = assetStatsFromAggregate(aggregateAssetRows(rows))
    .map(a => {
      const locationAvgQpm = getLocationQpmAverage(a.name, period);
      const vsLocationAvg = locationAvgQpm && locationAvgQpm > 0 ? (a.qimvPerMin - locationAvgQpm) / locationAvgQpm : null;
      return { ...a, locationAvgQpm, vsLocationAvg };
    })
    .filter(a => a.vsLocationAvg !== null && isFinite(a.vsLocationAvg) && a.qimv > 0);

  if (assets.length < 2) {
    container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Need at least two assets with location benchmarks to plot the quadrant.</div>`;
    return;
  }

  const qmvSorted = [...assets.map(a => a.qimv)].sort((a, b) => a - b);
  const medianQmv = qmvSorted[Math.floor(qmvSorted.length / 2)];
  const minDiff = Math.min(...assets.map(a => a.vsLocationAvg), -0.05);
  const maxDiff = Math.max(...assets.map(a => a.vsLocationAvg), 0.05);
  const diffPad = Math.max(0.08, (maxDiff - minDiff) * 0.15);
  const axisMin = minDiff - diffPad;
  const axisMax = maxDiff + diffPad;
  const maxQmv = Math.max(...assets.map(a => a.qimv)) * 1.1;
  const minQmv = 0;
  const maxDuration = Math.max(...assets.map(a => a.duration));

  const W = 900, H = 500;
  const padL = 76, padR = 36, padT = 30, padB = 64;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const xScale = x => padL + ((x - axisMin) / (axisMax - axisMin)) * chartW;
  const yScale = y => padT + (1 - ((y - minQmv) / (maxQmv - minQmv || 1))) * chartH;
  const rScale = d => {
    const minR = 8, maxR = 28;
    if (maxDuration <= 0) return minR;
    return minR + Math.sqrt(d / maxDuration) * (maxR - minR);
  };

  assets = assets.map(a => {
    const highX = a.vsLocationAvg >= 0;
    const highY = a.qimv >= medianQmv;
    let quadrant = 'improve';
    if (highX && highY) quadrant = 'scale';
    else if (highX && !highY) quadrant = 'protect';
    else if (!highX && highY) quadrant = 'review';
    return { ...a, quadrant };
  });

  const xTicks = [axisMin, 0, axisMax];
  const yTicks = [minQmv, maxQmv / 2, maxQmv];
  let svg = `<svg class="quadrant-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

  yTicks.forEach(v => {
    const y = yScale(v);
    svg += `<line class="quadrant-grid" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
  });
  xTicks.forEach(v => {
    const x = xScale(v);
    svg += `<line class="quadrant-grid" x1="${x}" x2="${x}" y1="${padT}" y2="${H - padB}"/>`;
  });

  const mx = xScale(0);
  const my = yScale(medianQmv);
  svg += `<line class="quadrant-median" x1="${mx}" x2="${mx}" y1="${padT}" y2="${H - padB}"/>`;
  svg += `<line class="quadrant-median" x1="${padL}" x2="${W - padR}" y1="${my}" y2="${my}"/>`;

  svg += `<text class="quadrant-quadrant-label" x="${W - padR - 8}" y="${padT + 22}" text-anchor="end">Scale</text>`;
  svg += `<text class="quadrant-quadrant-label" x="${W - padR - 8}" y="${H - padB - 10}" text-anchor="end">Protect</text>`;
  svg += `<text class="quadrant-quadrant-label" x="${padL + 8}" y="${padT + 22}">Review</text>`;
  svg += `<text class="quadrant-quadrant-label" x="${padL + 8}" y="${H - padB - 10}">Improve</text>`;

  svg += `<line class="quadrant-axis" x1="${padL}" x2="${padL}" y1="${padT}" y2="${H - padB}"/>`;
  svg += `<line class="quadrant-axis" x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}"/>`;

  xTicks.forEach(v => {
    svg += `<text class="quadrant-tick" x="${xScale(v)}" y="${H - padB + 18}" text-anchor="middle">${v === 0 ? 'Location avg' : (v > 0 ? '+' : '') + (v * 100).toFixed(0) + '%'}</text>`;
  });
  yTicks.forEach(v => {
    svg += `<text class="quadrant-tick" x="${padL - 8}" y="${yScale(v) + 4}" text-anchor="end">${formatCurrency(v)}</text>`;
  });

  svg += `<text class="quadrant-label" x="${padL + chartW / 2}" y="${H - 18}" text-anchor="middle">Performance vs portfolio avg for same location →</text>`;
  svg += `<text class="quadrant-label" transform="rotate(-90 20 ${padT + chartH / 2})" x="20" y="${padT + chartH / 2}" text-anchor="middle">Total QIMV — Volume →</text>`;

  assets.forEach((a) => {
    const cx = xScale(a.vsLocationAvg);
    const cy = yScale(a.qimv);
    const r = rScale(a.duration);
    const dataAttrs = `data-name="${a.name.replace(/"/g, '&quot;')}" data-qpm="${a.qimvPerMin}" data-qmv="${a.qimv}" data-duration="${a.duration}" data-quadrant="${a.quadrant}" data-exposures="${a.exposures}" data-location-avg="${a.locationAvgQpm}" data-vs-avg="${a.vsLocationAvg}"`;
    svg += `<circle class="quadrant-bubble ${a.quadrant}" cx="${cx}" cy="${cy}" r="${r}" ${dataAttrs}/>`;
    if (r >= 14) {
      svg += `<text class="quadrant-bubble-label" x="${cx}" y="${cy + 3}">${a.name.length > 14 ? a.name.slice(0, 13) + '…' : a.name}</text>`;
    }
  });

  svg += `</svg>`;
  container.innerHTML = `${svg}<div class="quadrant-hover" id="quadrant-hover"></div>`;

  const hover = document.getElementById('quadrant-hover');
  container.querySelectorAll('.quadrant-bubble').forEach(bubble => {
    bubble.addEventListener('mouseenter', () => {
      const name = bubble.dataset.name;
      const qpm = Number(bubble.dataset.qpm);
      const qmv = Number(bubble.dataset.qmv);
      const duration = Number(bubble.dataset.duration);
      const exposures = Number(bubble.dataset.exposures);
      const locationAvg = Number(bubble.dataset.locationAvg);
      const vsAvg = Number(bubble.dataset.vsAvg);
      const q = bubble.dataset.quadrant;
      const qName = q === 'scale' ? 'Scale' : q === 'protect' ? 'Protect' : q === 'review' ? 'Review' : 'Improve';
      hover.innerHTML = `
        <div class="hover-title">${name}</div>
        <div class="hover-row"><span>Quadrant</span><span class="val">${qName}</span></div>
        <div class="hover-row"><span>Vs location avg</span><span class="val">${formatSignedPercent(vsAvg, { blank: '—' })}</span></div>
        <div class="hover-row"><span>Asset QIMV / Min</span><span class="val">${formatCurrency(qpm)}</span></div>
        <div class="hover-row"><span>Location avg</span><span class="val">${formatCurrency(locationAvg)}</span></div>
        <div class="hover-row"><span>Total QIMV</span><span class="val">${formatCurrency(qmv)}</span></div>
        <div class="hover-row"><span>Duration</span><span class="val">${formatDurationFromMinutes(duration)}</span></div>
        <div class="hover-row"><span>Exposures</span><span class="val">${formatNum(exposures)}</span></div>
      `;
      hover.classList.add('visible');
    });
    bubble.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left + 12;
      let y = e.clientY - rect.top + 12;
      const hoverRect = hover.getBoundingClientRect();
      if (x + hoverRect.width > rect.width) x = e.clientX - rect.left - hoverRect.width - 12;
      if (y + hoverRect.height > rect.height) y = e.clientY - rect.top - hoverRect.height - 12;
      hover.style.left = x + 'px';
      hover.style.top = y + 'px';
    });
    bubble.addEventListener('mouseleave', () => hover.classList.remove('visible'));
  });
}


// ============================================================
// PACE CHART — cumulative QIMV game-by-game, current season vs prior
// ============================================================
// Addresses the "10 games of current season vs full prior season" problem
// by visualizing the comparison directly.
function renderPaceChart(brand, period) {
  const container = document.getElementById('pace-chart');
  if (!container) return;

  const seasons = getAvailableSeasons(brand);
  if (seasons.length < 2) {
    container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Need at least two seasons of data to show the pace chart.</div>`;
    return;
  }

  const currSeason = period === 'all' ? seasons[seasons.length - 1] : period;
  const currIdx = seasons.indexOf(currSeason);
  if (currIdx <= 0) {
    container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">No prior season available for comparison.</div>`;
    return;
  }
  const priorSeason = seasons[currIdx - 1];

  // useDateAxis = true when YoY/Full season mode is active. Map both seasons
  // onto a shared "days since season start (Oct 1)" axis so calendar months
  // line up across years. Matched-games mode keeps the simple match-index axis.
  const useDateAxis = comparisonMode === 'full';

  const seasonStartYearOf = (seasonStr) => {
    const m = String(seasonStr || '').match(/(\d{4})/);
    return m ? Number(m[1]) : null;
  };

  const aggregateCumulative = (rows, seasonStr) => {
    const byDate = {};
    rows.forEach(r => {
      if (!r.Matchdate) return;
      const k = String(r.Matchdate);
      byDate[k] = (byDate[k] || 0) + (Number(r['QI Media Value ($)']) || 0);
    });
    const dates = Object.keys(byDate).sort((a, b) => {
      const da = new Date(a), db = new Date(b);
      if (!isNaN(da) && !isNaN(db)) return da - db;
      return a.localeCompare(b);
    });
    const startYear = seasonStartYearOf(seasonStr);
    const seasonStart = startYear ? new Date(startYear, 9, 1) : null; // Oct 1
    let running = 0;
    return dates.map((d, i) => {
      running += byDate[d];
      const dt = new Date(d);
      const dayIdx = (seasonStart && !isNaN(dt))
        ? Math.max(0, Math.round((dt - seasonStart) / 86400000))
        : i;
      return { gameIdx: i + 1, date: d, cumValue: running, dayIdx };
    });
  };

  const currData = aggregateCumulative(getBrandTVData(brand, currSeason), currSeason);
  const priorData = aggregateCumulative(getBrandTVData(brand, priorSeason), priorSeason);

  if (!currData.length || !priorData.length) {
    container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Not enough matchdate data to plot the pace chart.</div>`;
    return;
  }

  const maxGames = Math.max(currData.length, priorData.length);
  const maxValue = Math.max(currData[currData.length - 1].cumValue, priorData[priorData.length - 1].cumValue);
  const W = 900, H = 300;
  const padL = 80, padR = 24, padT = 24, padB = 48;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Date-axis configuration: Oct 1 (day 0) through Apr 30 (~day 211)
  const SEASON_DAYS = 212;
  const xScaleGame = g => padL + ((g - 1) / Math.max(1, maxGames - 1)) * chartW;
  const xScaleDay = day => padL + (Math.max(0, Math.min(SEASON_DAYS, day)) / SEASON_DAYS) * chartW;
  const xScale = useDateAxis ? (d => xScaleDay(d.dayIdx)) : (d => xScaleGame(d.gameIdx));
  const yScale = v => padT + (1 - (v / (maxValue || 1))) * chartH;
  const linePath = (data) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d).toFixed(1)} ${yScale(d.cumValue).toFixed(1)}`).join(' ');

  const yTicks = [0, maxValue / 2, maxValue];

  let svg = `<svg class="pace-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  yTicks.forEach(v => {
    const y = yScale(v);
    svg += `<line class="pace-grid" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="pace-tick" x="${padL - 8}" y="${y + 4}" text-anchor="end">${formatCurrency(v)}</text>`;
  });
  if (useDateAxis) {
    // Calendar month ticks: Oct, Nov, Dec, Jan, Feb, Mar, Apr
    const monthLabels = [
      { label: 'Oct', day: 0 },
      { label: 'Nov', day: 31 },
      { label: 'Dec', day: 61 },
      { label: 'Jan', day: 92 },
      { label: 'Feb', day: 123 },
      { label: 'Mar', day: 151 },
      { label: 'Apr', day: 182 },
      { label: 'End Apr', day: 211 },
    ];
    monthLabels.forEach(t => {
      const x = xScaleDay(t.day);
      svg += `<line class="pace-grid" x1="${x}" x2="${x}" y1="${padT}" y2="${H - padB}"/>`;
      svg += `<text class="pace-tick" x="${x}" y="${H - padB + 18}" text-anchor="middle">${t.label}</text>`;
    });
  } else {
    const xTickStep = Math.max(1, Math.ceil(maxGames / 8));
    const xTicks = [];
    for (let i = 1; i <= maxGames; i += xTickStep) xTicks.push(i);
    if (xTicks[xTicks.length - 1] !== maxGames) xTicks.push(maxGames);
    xTicks.forEach(g => {
      const x = xScaleGame(g);
      svg += `<text class="pace-tick" x="${x}" y="${H - padB + 18}" text-anchor="middle">${g}</text>`;
    });
  }
  svg += `<line class="pace-axis" x1="${padL}" x2="${padL}" y1="${padT}" y2="${H - padB}"/>`;
  svg += `<line class="pace-axis" x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}"/>`;
  svg += `<text class="pace-axis-label" x="${padL + chartW / 2}" y="${H - 10}" text-anchor="middle">${useDateAxis ? 'Calendar month (Oct → Apr)' : 'Game number'}</text>`;
  svg += `<text class="pace-axis-label" transform="rotate(-90 22 ${padT + chartH / 2})" x="22" y="${padT + chartH / 2}" text-anchor="middle">Cumulative QIMV</text>`;
  svg += `<path class="pace-line-prior" d="${linePath(priorData)}"/>`;
  svg += `<path class="pace-line-current" d="${linePath(currData)}"/>`;

  const makePoint = (d, season, cls) => {
    return `<circle class="${cls} pace-hover-point" cx="${xScale(d).toFixed(1)}" cy="${yScale(d.cumValue).toFixed(1)}" r="5" data-season="${season}" data-game="${d.gameIdx}" data-date="${d.date}" data-value="${d.cumValue}"/>`;
  };
  priorData.forEach(d => { svg += makePoint(d, priorSeason, 'pace-prior-dot'); });
  currData.forEach(d => { svg += makePoint(d, currSeason, 'pace-current-dot'); });

  const currLast = currData[currData.length - 1];
  const currX = xScale(currLast);
  const currY = yScale(currLast.cumValue);
  svg += `<line class="pace-current-marker" x1="${currX}" x2="${currX}" y1="${padT}" y2="${H - padB}"/>`;
  svg += `<text class="pace-marker-label" x="${currX + 8}" y="${currY - 8}">${currSeason}</text>`;
  svg += `</svg>`;

  const sameGameIdx = Math.min(currData.length, priorData.length);
  const currAtPoint = currData[sameGameIdx - 1] ? currData[sameGameIdx - 1].cumValue : 0;
  const priorAtPoint = priorData[sameGameIdx - 1] ? priorData[sameGameIdx - 1].cumValue : 0;
  const paceDelta = priorAtPoint > 0 ? (currAtPoint - priorAtPoint) / priorAtPoint : null;
  const paceDeltaCls = paceDelta === null ? 'neutral' : paceDelta >= 0 ? 'up' : 'down';
  const paceDeltaStr = paceDelta === null ? '—' : `${paceDelta >= 0 ? '▲' : '▼'} ${Math.abs(paceDelta * 100).toFixed(1)}%`;
  let projStr = '—';
  if (currData.length < priorData.length && sameGameIdx > 0) {
    const projection = priorAtPoint > 0 ? currAtPoint * (priorData[priorData.length - 1].cumValue / priorAtPoint) : null;
    projStr = projection !== null ? formatCurrency(projection) : '—';
  } else if (currData.length >= priorData.length) {
    projStr = formatCurrency(currLast.cumValue);
  }

  container.innerHTML = `
    ${svg}
    <div class="pace-hover" id="pace-hover"></div>
    <div class="pace-legend">
      <span class="pace-legend-item"><span class="pace-legend-swatch"></span>${currSeason} (current)</span>
      <span class="pace-legend-item"><span class="pace-legend-swatch dashed"></span>${priorSeason} (prior)</span>
    </div>
    <div class="pace-summary">
      <div class="pace-summary-stat"><span class="label">Through ${currData.length} game${currData.length === 1 ? '' : 's'}</span><span class="value">${formatCurrency(currAtPoint)}</span></div>
      <div class="pace-summary-stat"><span class="label">${priorSeason} at same point</span><span class="value">${formatCurrency(priorAtPoint)}</span></div>
      <div class="pace-summary-stat"><span class="label">Pace delta</span><span class="value ${paceDeltaCls}">${paceDeltaStr}</span></div>
      <div class="pace-summary-stat"><span class="label">Projected ${currSeason} total</span><span class="value">${projStr}</span></div>
    </div>
  `;

  const hover = document.getElementById('pace-hover');
  container.querySelectorAll('.pace-hover-point').forEach(point => {
    point.addEventListener('mouseenter', () => {
      hover.innerHTML = `
        <div class="hover-title">${point.dataset.season} · Game ${point.dataset.game}</div>
        <div class="hover-row"><span>Date</span><span class="val">${point.dataset.date}</span></div>
        <div class="hover-row"><span>Cumulative QIMV</span><span class="val">${formatCurrency(Number(point.dataset.value))}</span></div>
      `;
      hover.classList.add('visible');
    });
    point.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left + 12;
      let y = e.clientY - rect.top + 12;
      const hoverRect = hover.getBoundingClientRect();
      if (x + hoverRect.width > rect.width) x = e.clientX - rect.left - hoverRect.width - 12;
      if (y + hoverRect.height > rect.height) y = e.clientY - rect.top - hoverRect.height - 12;
      hover.style.left = x + 'px';
      hover.style.top = y + 'px';
    });
    point.addEventListener('mouseleave', () => hover.classList.remove('visible'));
  });
}









// Plot one bubble per partner — Y = CPM (lower is better), bubble size = spend.
// X-axis is dynamic: when resultFilter === 'all' we use CTR (the original
// efficiency view); otherwise X is the partner's count of the selected Result
// indicator and only partners that delivered that result type appear.
function renderPaidEfficiencyScatter(partnerAggs, resultFilter = 'all') {
  const useResultAxis = resultFilter && resultFilter !== 'all';
  const xKey   = useResultAxis ? 'results' : 'ctr';
  const xLabel = useResultAxis ? `${resultFilter} → Higher is better` : 'CTR → Higher is better';
  const xFmt   = useResultAxis ? (v => formatNum(v)) : (v => (v*100).toFixed(2) + '%');

  const pts = partnerAggs.filter(p => p[xKey] > 0 && p.cpm > 0 && p.spend > 0);
  if (pts.length < 2) return `<div style="padding:40px 20px;text-align:center;color:var(--text-muted);font-size:13px;">${useResultAxis ? `Fewer than two partners delivered "${resultFilter}" results in this window.` : 'Need at least two partners with CTR and CPM data to show this chart.'}</div>`;

  const W = 720, H = 360;
  const pL = 70, pR = 24, pT = 22, pB = 50;
  const cW = W - pL - pR, cH = H - pT - pB;

  const maxX = Math.max(...pts.map(p => p[xKey])) * 1.15;
  const maxCPM = Math.max(...pts.map(p => p.cpm)) * 1.15;
  const maxSpend = Math.max(...pts.map(p => p.spend));

  const xScale = v => pL + (v / maxX) * cW;
  const yScale = v => pT + (1 - v / maxCPM) * cH;
  const rScale = v => 6 + Math.sqrt(v / maxSpend) * 20;

  const medX = [...pts.map(p => p[xKey])].sort((a,b)=>a-b)[Math.floor(pts.length/2)];
  const medCPM = [...pts.map(p => p.cpm)].sort((a,b)=>a-b)[Math.floor(pts.length/2)];

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;" preserveAspectRatio="xMidYMid meet">`;

  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${pT}" x2="${pL}" y2="${H-pB}"/>`;
  svg += `<line stroke="var(--border)" stroke-width="1" x1="${pL}" y1="${H-pB}" x2="${W-pR}" y2="${H-pB}"/>`;

  svg += `<line stroke="var(--accent-line)" stroke-width="1" stroke-dasharray="3 3"
    x1="${xScale(medX)}" y1="${pT}" x2="${xScale(medX)}" y2="${H-pB}"/>`;
  svg += `<line stroke="var(--accent-line)" stroke-width="1" stroke-dasharray="3 3"
    x1="${pL}" y1="${yScale(medCPM)}" x2="${W-pR}" y2="${yScale(medCPM)}"/>`;

  svg += `<text x="${pL + cW/2}" y="${H-pB+34}" text-anchor="middle"
    style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;">${xLabel}</text>`;
  svg += `<text transform="rotate(-90 16 ${pT + cH/2})" x="16" y="${pT + cH/2}" text-anchor="middle"
    style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;">CPM — Lower is better</text>`;

  [0, maxCPM/2, maxCPM].forEach(v => {
    const y = yScale(v);
    svg += `<text x="${pL-6}" y="${y+4}" text-anchor="end"
      style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">$${v.toFixed(0)}</text>`;
  });

  [0, maxX/2, maxX].forEach(v => {
    const x = xScale(v);
    svg += `<text x="${x}" y="${H-pB+14}" text-anchor="middle"
      style="fill:var(--text-muted);font-family:var(--font-mono);font-size:10px;">${xFmt(v)}</text>`;
  });

  svg += `<text x="${W-pR-6}" y="${pT+14}" text-anchor="end"
    style="fill:var(--text-muted);font-family:var(--font-mono);font-size:9.5px;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em;">Most efficient</text>`;
  svg += `<text x="${pL+6}" y="${H-pB-8}"
    style="fill:var(--text-muted);font-family:var(--font-mono);font-size:9.5px;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em;">Least efficient</text>`;

  pts.forEach(p => {
    const cx = xScale(p[xKey]), cy = yScale(p.cpm), r = rScale(p.spend);
    const xValStr = useResultAxis ? formatNum(p[xKey]) : (p.ctr*100).toFixed(2) + '%';
    svg += `<circle class="paid-eff-bubble" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"
      fill="var(--text)" fill-opacity="0.6" stroke="var(--bg)" stroke-width="1.5"
      style="cursor:pointer;"
      data-brand="${(p.brand||'').replace(/"/g,'&quot;')}"
      data-xlabel="${useResultAxis ? resultFilter.replace(/"/g,'&quot;') : 'CTR'}"
      data-xval="${xValStr}"
      data-cpm="${p.cpm.toFixed(2)}"
      data-spend="${formatCurrency(p.spend)}"
      data-impr="${formatNum(p.impressions || 0)}"
      data-results="${formatNum(p.results || 0)}"/>`;
  });

  const labeled = [...pts].sort((a,b) => b.spend - a.spend).slice(0, Math.min(5, pts.length));
  labeled.forEach(p => {
    const cx = xScale(p[xKey]), cy = yScale(p.cpm);
    const shortName = p.brand.length > 14 ? p.brand.slice(0,13)+'…' : p.brand;
    svg += `<text x="${cx.toFixed(1)}" y="${(cy-rScale(p.spend)-4).toFixed(1)}" text-anchor="middle"
      style="fill:var(--text-dim);font-family:var(--font-body);font-size:11px;pointer-events:none;">${shortName}</text>`;
  });

  svg += '</svg>';

  return `<div style="position:relative;padding:4px 0;" id="paid-eff-wrap">
      ${svg}
      <div class="quadrant-hover" id="paid-eff-hover" style="position:absolute;display:none;pointer-events:none;"></div>
    </div>
    <div class="leaderboard-note" style="margin-top:8px;">
      ${pts.length} partner${pts.length === 1 ? '' : 's'} plotted. Size = spend. Bottom-right = most efficient.
      Dashed lines show portfolio median ${useResultAxis ? resultFilter : 'CTR'} and CPM. Click a bubble to open that partner's page.
    </div>`;
}

function wirePaidEfficiencyScatter() {
  const wrap  = document.getElementById('paid-eff-wrap');
  const hover = document.getElementById('paid-eff-hover');
  if (!wrap || !hover) return;
  wrap.querySelectorAll('.paid-eff-bubble').forEach(bubble => {
    bubble.addEventListener('mouseenter', () => {
      hover.style.display = 'block';
      hover.innerHTML = `
        <div class="hover-title">${bubble.dataset.brand}</div>
        <div class="hover-row"><span>${bubble.dataset.xlabel}</span><span class="val">${bubble.dataset.xval}</span></div>
        <div class="hover-row"><span>CPM</span><span class="val">$${bubble.dataset.cpm}</span></div>
        <div class="hover-row"><span>Impressions</span><span class="val">${bubble.dataset.impr}</span></div>
        <div class="hover-row"><span>Results</span><span class="val">${bubble.dataset.results}</span></div>
        <div class="hover-row"><span>Spend</span><span class="val">${bubble.dataset.spend}</span></div>`;
      hover.classList.add('visible');
    });
    bubble.addEventListener('mousemove', e => {
      const r = wrap.getBoundingClientRect();
      let x = e.clientX - r.left + 12, y = e.clientY - r.top - 10;
      const hr = hover.getBoundingClientRect();
      if (x + hr.width > r.width) x = e.clientX - r.left - hr.width - 12;
      if (y < 0) y = 4;
      hover.style.left = x + 'px';
      hover.style.top  = y + 'px';
    });
    bubble.addEventListener('mouseleave', () => { hover.classList.remove('visible'); hover.style.display = 'none'; });
    bubble.addEventListener('click', () => {
      const brand = bubble.dataset.brand;
      if (brand) selectBrandFromSurvey(brand);
    });
  });
}


// ============================================================
