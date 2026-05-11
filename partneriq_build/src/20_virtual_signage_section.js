// ============================================================
// ON-COURT VIRTUAL SIGNAGE
// ============================================================
// Schedule-based portfolio page for center-court and 3-point-line
// virtual branding. Home-game metrics come from TV visible signage
// actuals (Tool = "Virtual Branding", Location = "Center" or
// "3 Point Line"). Away-game metrics are estimated using a
// per-position conservative average — floor(min(mean, median)) —
// pooled across ALL brands at that position. This keeps estimates
// equal and fair for every partner regardless of home-game sample
// size, and prevents well-represented brands from receiving a
// more favourable away-game estimate than others.
//
// Exposures use the "Source Exposures" not "Total Exposures" column for On-Court virtual signage
// from TV visible signage rows rather than a simple game count.
// ============================================================

// ── Row-type helpers ────────────────────────────────────────
// Used by this file AND by getBrandTVData / getTVRowsForPeriod
// in 05_paid_constants.js and 07_paid_assignment.js to strip
// these rows out of the regular TV section.

const VS_TOOL_LABEL = 'virtual branding';
const VS_LOCATION_LABELS = new Set(['center', '3 point line']);

function isVirtualBrandingRow(r) {
  if (!r) return false;
  return (
    String(r.Tool     || '').trim().toLowerCase() === VS_TOOL_LABEL &&
    VS_LOCATION_LABELS.has(String(r.Location || '').trim().toLowerCase())
  );
}

// ── Date normalisation ───────────────────────────────────────
// Accepts M/D/YY (schedule) or M/D/YYYY (TV Matchdate) and returns
// a canonical "YYYY-MM-DD" string for reliable cross-source comparison.
function normalizeVSDate(str) {
  if (!str) return null;
  const parts = String(str).trim().split('/');
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  let   y = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Build a lookup: "YYYY-MM-DD|location_lc" → accumulated TV metrics for that game+position.
// Multiple rows for the same date+location are summed (can happen if a brand appears more
// than once per game). Uses only the latest-season VS rows so estimates stay current.
function buildVSTVDateLookup() {
  const map = new Map();
  getLatestSeasonVSRows().forEach(r => {
    const dateKey = normalizeVSDate(String(r.Matchdate || '').trim());
    if (!dateKey) return;
    const locKey = String(r.Location || '').trim().toLowerCase();
    if (!locKey) return;
    const key = `${dateKey}|${locKey}`;
    if (!map.has(key)) {
      map.set(key, { qimv: 0, qiImp: 0, duration: 0, exposures: 0 });
    }
    const acc = map.get(key);
    acc.qimv      += Number(r['QI Media Value ($)'])          || 0;
    acc.qiImp     += Number(r['Sponsorship QI Impressions'])  || 0;
    acc.duration  += Number(r['Duration (Minutes)'])           || 0;
    acc.exposures += Number(r['Source Exposures'])             || 0;
  });
  return map;
}

// ── Schedule ingest ─────────────────────────────────────────
function ingestVirtualSignageSchedule(rows) {
  const ingested = [];

  rows.forEach(r => {
    const dateRaw  = String(r['Date']      || r['date']      || '').trim();
    const homeAway = String(r['Home/Away'] || r['home/away'] || '').trim().toLowerCase();
    const opponent = String(r['Opponent']  || r['opponent']  || '').trim();
    if (!dateRaw || !opponent) return;

    // The column header uses lower-case "point" in the test file; accept both casings.
    const brandA_raw = String(r['Position A - Center']          || '').trim();
    const brandB_raw = String(r['Position B - 3 point Line']    ||
                               r['Position B - 3 Point Line']   || '').trim();

    ingested.push({
      DateRaw:   dateRaw,
      HomeAway:  homeAway,
      IsHome:    homeAway === 'vs',
      Opponent:  opponent,
      BrandA:    brandA_raw ? resolveCanonicalBrandName(brandA_raw) : null,
      BrandB:    brandB_raw ? resolveCanonicalBrandName(brandB_raw) : null,
      _rawBrandA: brandA_raw || null,
      _rawBrandB: brandB_raw || null,
    });
  });

  DataStore.virtualSignageSchedule = ingested;

  // Register brands so they appear in brand search
  ingested.forEach(g => {
    if (g.BrandA) DataStore.registerBrand(g.BrandA, 'virtualSignage');
    if (g.BrandB) DataStore.registerBrand(g.BrandB, 'virtualSignage');
  });

  return ingested;
}

// ── TV-row accessor (home actuals only, for estimation) ─────
function getVirtualBrandingTVRows(brand, location) {
  let rows = DataStore.tvSignage.filter(isVirtualBrandingRow);
  if (brand)    rows = rows.filter(r => r.Brand === brand);
  if (location) rows = rows.filter(r =>
    String(r.Location || '').trim().toLowerCase() === location.toLowerCase()
  );
  return rows;
}

// YoY for virtual signage QIMV, based on TV virtual branding rows (home-game actuals).
// Returns { curr, prev, change, basis } or null when < 2 seasons of VB TV data exist.
function computeVSQimvYoY(brand) {
  const allVBRows = getVirtualBrandingTVRows(brand);
  if (!allVBRows.length) return null;

  const seasons = [...new Set(
    allVBRows.map(r => normalizeSeasonLabel(r.Season || '')).filter(Boolean)
  )].sort();
  if (seasons.length < 2) return null;

  const currSeason  = seasons[seasons.length - 1];
  const priorSeason = seasons[seasons.length - 2];
  const currRows  = allVBRows.filter(r => normalizeSeasonLabel(r.Season || '') === currSeason);
  const priorRows = allVBRows.filter(r => normalizeSeasonLabel(r.Season || '') === priorSeason);
  if (!currRows.length || !priorRows.length) return null;

  const curr   = sum(currRows,  'QI Media Value ($)');
  const prev   = sum(priorRows, 'QI Media Value ($)');
  const change = pctChange(curr, prev);
  return change === null ? null : {
    change, curr, prev,
    basis: `${currSeason} vs ${priorSeason} · home-game TV actuals`,
  };
}

// Returns virtual branding TV rows restricted to the most recent season only.
// Estimation and averages use this so that older seasons don't dilute the
// current-season benchmark — if only one season of data exists it returns all rows.
function getLatestSeasonVSRows() {
  const allRows = getVirtualBrandingTVRows();
  if (!allRows.length) return [];

  const seasons = new Set();
  allRows.forEach(r => {
    const s = normalizeSeasonLabel(r.Season || '');
    if (s) seasons.add(s);
  });
  if (!seasons.size) return allRows; // no season labels — fall back to all rows

  const latestSeason = [...seasons].sort().pop();
  return allRows.filter(r => normalizeSeasonLabel(r.Season || '') === latestSeason);
}

// ── Conservative estimate: floor(min(mean, median)) ────────
function vsConservativeEstimate(vals) {
  const nonZero = (vals || []).filter(v => v > 0);
  if (!nonZero.length) return 0;
  const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
  const sorted = [...nonZero].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.floor(Math.min(mean, median));
}

// Build per-position simple means from TV actuals (pooled across all brands),
// keyed by lowercase location string (e.g. "center", "3 point line").
// These means are used for:
//   • Away-game estimates for every partner
//   • Home-game fallback when no TV row matches a specific date
//   • The "Season averages by position" display table
// Using the same value for estimates and the display table ensures consistency —
// a partner with 1 away game will show exactly the displayed average.
function computeVSLocationMeans() {
  const grouped = {};

  getLatestSeasonVSRows().forEach(r => {
    const loc    = String(r.Location || '').trim();
    if (!loc) return;
    const locKey = loc.toLowerCase();
    if (!grouped[locKey]) grouped[locKey] = { location: loc, qimvVals: [], qiImpVals: [], durVals: [], expVals: [] };
    grouped[locKey].qimvVals.push(Number(r['QI Media Value ($)'])          || 0);
    grouped[locKey].qiImpVals.push(Number(r['Sponsorship QI Impressions']) || 0);
    grouped[locKey].durVals.push(Number(r['Duration (Minutes)'])           || 0);
    grouped[locKey].expVals.push(Number(r['Source Exposures'])             || 0);
  });

  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const out = {};
  Object.entries(grouped).forEach(([locKey, g]) => {
    out[locKey] = {
      location:   g.location,
      qimv:       mean(g.qimvVals),
      qiImp:      mean(g.qiImpVals),
      duration:   mean(g.durVals),
      exposures:  mean(g.expVals),
      sampleSize: g.qimvVals.length,
    };
  });
  return out;
}

// Legacy alias — kept in case any external caller references it.
function computeVSEstimates() { return computeVSLocationMeans(); }

// ── Partner-level stats: home actuals (by date) + away estimates ──
// Key change from prior implementation: home-game TV metrics are now looked up
// by matching game date (normalised) + position against the TV data's Matchdate
// column — NOT by brand name. This is correct because the TV export uses a single
// canonical brand name ("Toyota") for all virtual branding rows regardless of
// which sub-brand (Toyota Dealers, Toyota Generic, Vancouver Toyota) the schedule
// shows. Matching by date+position gives each schedule entry its correct actuals
// without any brand-name translation.
//
// Away games and home games with no matching TV row both use the position-level
// simple mean — the same value shown in the "Season averages" table at the bottom
// of the page, so estimates are always consistent with the displayed averages.
function getVirtualSignagePartnerStats() {
  const schedule = DataStore.virtualSignageSchedule || [];
  const means    = computeVSLocationMeans(); // keyed by lowercase location
  const tvLookup = buildVSTVDateLookup();    // keyed by "YYYY-MM-DD|location_lc"

  const stats = {};

  const ensure = brand => {
    if (!stats[brand]) stats[brand] = {
      brand,
      totalGames: 0, homeGames: 0, awayGames: 0,
      exposures: 0,
      qimv: 0, qiImp: 0, duration: 0,
      hasEstimates: false,
    };
  };

  schedule.forEach(game => {
    [
      { brand: game.BrandA, locKey: 'center'        },
      { brand: game.BrandB, locKey: '3 point line'  },
    ].forEach(({ brand, locKey }) => {
      if (!brand) return;
      ensure(brand);
      const b = stats[brand];
      b.totalGames++;

      if (game.IsHome) {
        b.homeGames++;
        // Look up the actual TV row for this specific game date + position
        const dateKey = normalizeVSDate(game.DateRaw);
        const tvEntry = dateKey ? tvLookup.get(`${dateKey}|${locKey}`) : null;
        if (tvEntry) {
          b.qimv      += tvEntry.qimv;
          b.qiImp     += tvEntry.qiImp;
          b.duration  += tvEntry.duration;
          b.exposures += tvEntry.exposures;
        } else {
          // No TV data for this home game — fall back to position mean
          b.hasEstimates = true;
          const est = means[locKey];
          if (est) {
            b.qimv      += est.qimv;
            b.qiImp     += est.qiImp;
            b.duration  += est.duration;
            b.exposures += est.exposures;
          }
        }
      } else {
        b.awayGames++;
        b.hasEstimates = true;
        const est = means[locKey];
        if (est) {
          b.qimv      += est.qimv;
          b.qiImp     += est.qiImp;
          b.duration  += est.duration;
          b.exposures += est.exposures;
        }
      }
    });
  });

  return Object.values(stats).sort((a, b) => b.qimv - a.qimv);
}

// ── Portfolio totals ────────────────────────────────────────
function getVirtualSignagePortfolioTotals(partnerStats) {
  const schedule     = DataStore.virtualSignageSchedule || [];
  const totalGames   = new Set(schedule.map(g => g.DateRaw)).size;
  const homeGames    = new Set(schedule.filter(g =>  g.IsHome).map(g => g.DateRaw)).size;
  const awayGames    = new Set(schedule.filter(g => !g.IsHome).map(g => g.DateRaw)).size;
  const hasEstimates = (partnerStats || []).some(p => p.hasEstimates);

  return {
    totalGames, homeGames, awayGames,
    hasEstimates,
    totalQimv:      (partnerStats || []).reduce((a, b) => a + b.qimv,     0),
    totalQiImp:     (partnerStats || []).reduce((a, b) => a + b.qiImp,    0),
    totalDuration:  (partnerStats || []).reduce((a, b) => a + b.duration, 0),
    totalExposures: (partnerStats || []).reduce((a, b) => a + b.exposures,0),
  };
}

// ── Season averages by position (for display table) ─────────
// Delegates to computeVSLocationMeans() so the displayed averages
// are always identical to the values used for estimation.
function computeVSLocationAverages() {
  return Object.values(computeVSLocationMeans()).map(m => ({
    location:     m.location,
    avgExposures: m.exposures,
    avgQiImp:     m.qiImp,
    avgDuration:  m.duration,
    avgQimv:      m.qimv,
    sampleSize:   m.sampleSize,
  })).sort((a, b) => a.location.localeCompare(b.location));
}

// ── Brand-group rollup ───────────────────────────────────────
// Detects brands that share a common prefix (e.g. "Toyota", "Toyota Generic",
// "Toyota Dealers" → "Toyota" group) and produces aggregate totals so the table
// can show how many games the full brand family ran, not just each sub-brand alone.
function groupVSPartnerStats(partnerStats) {
  const brandNames = partnerStats.map(p => p.brand);

  // For each brand, find the shortest prefix-match parent
  const parentOf = {};
  brandNames.forEach(a => {
    brandNames.forEach(b => {
      if (a === b) return;
      if (b.toLowerCase().startsWith(a.toLowerCase() + ' ')) {
        // a is a prefix of b — only take shortest (most specific) parent
        if (!parentOf[b] || parentOf[b].length < a.length) parentOf[b] = a;
      }
    });
  });

  // Build groups: key = parent brand name
  const groups = {};
  partnerStats.forEach(p => {
    const key = parentOf[p.brand] || p.brand;
    if (!groups[key]) groups[key] = { label: key, members: [] };
    groups[key].members.push(p);
  });

  // Convert to array; aggregate totals for each group
  return Object.values(groups).map(g => {
    const agg = {
      brand:       g.label,
      isGroup:     g.members.length > 1,
      members:     g.members,
      totalGames:  g.members.reduce((s, m) => s + m.totalGames,  0),
      homeGames:   g.members.reduce((s, m) => s + m.homeGames,   0),
      awayGames:   g.members.reduce((s, m) => s + m.awayGames,   0),
      exposures:   g.members.reduce((s, m) => s + m.exposures,   0),
      qimv:        g.members.reduce((s, m) => s + m.qimv,        0),
      qiImp:       g.members.reduce((s, m) => s + m.qiImp,       0),
      duration:    g.members.reduce((s, m) => s + m.duration,    0),
      hasEstimates: g.members.some(m => m.hasEstimates),
    };
    return agg;
  }).sort((a, b) => b.qimv - a.qimv);
}

// ── Partner-page guard ───────────────────────────────────────
function hasVirtualSignageDataForBrand(brand) {
  const schedule = DataStore.virtualSignageSchedule || [];
  return schedule.some(g => g.BrandA === brand || g.BrandB === brand);
}


function formatVSDate(dateRaw) {
  if (!dateRaw) return '—';
  // CSV dates are M/D/YY — parse carefully
  const parts = String(dateRaw).split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    let y   = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    const date = new Date(y, m, d);
    if (!isNaN(date)) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  return dateRaw;
}

// ── Page renderer ───────────────────────────────────────────
function renderVirtualSignagePage(main) {
  const schedule     = DataStore.virtualSignageSchedule || [];
  const hasSchedule  = schedule.length > 0;
  const hasTVData    = getVirtualBrandingTVRows().length > 0;
  const partnerStats = hasSchedule ? getVirtualSignagePartnerStats() : [];
  const groupedPartners = hasSchedule ? groupVSPartnerStats(partnerStats) : [];
  const totals       = hasSchedule ? getVirtualSignagePortfolioTotals(partnerStats) : null;
  const locationAvgs = hasTVData   ? computeVSLocationAverages() : [];

  main.innerHTML = `
    ${renderBreadcrumb([
      { label: 'Home', action: 'openPortfolioHome();' },
      { label: 'On-Court Virtual Signage' },
    ])}

    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">Virtual Signage · Portfolio Intelligence</div>
        <h1 class="brand-title">On-Court Virtual Signage</h1>
        <div class="brand-subtitle">
          <span class="channel-tag ${hasSchedule ? 'active' : ''}">🏀 Center + 3-Point Line</span>
          <span class="channel-tag ${hasSchedule ? 'active' : ''}">${totals ? totals.totalGames : '—'} Games</span>
          <span class="channel-tag ${partnerStats.length ? 'active' : ''}">${partnerStats.length} Partner${partnerStats.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>

    <div class="data-status">
      <div>
        <span class="data-status-dot"></span> Latest update ·
        <strong>${DASHBOARD_META.latestUpdateLabel}</strong>
        ${DASHBOARD_META.latestUpdateDate ? ` · ${DASHBOARD_META.latestUpdateDate}` : ''}
      </div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em;">
        ${DASHBOARD_META.preparedBy || 'PartnerIQ'}
      </div>
    </div>

    ${!hasSchedule ? `
      <div class="empty-state" style="padding: 60px 0;">
        <h2 style="font-size: 20px; margin-bottom: 12px;">No schedule loaded</h2>
        <p style="color: var(--text-dim); max-width: 480px; margin: 0 auto 24px;">
          Upload a virtual signage schedule CSV to view this dashboard.<br>
          Expected columns: <strong>Date · Home/Away · Opponent · Position A - Center · Position B - 3 point Line</strong>
        </p>
        ${VIEWER_MODE ? '' : `<button class="btn btn-primary" onclick="document.getElementById('dataBtn').click()">Import schedule</button>`}
      </div>
    ` : `

      ${!hasTVData ? `
        <div class="comparison-basis block" style="margin-bottom: 18px;">
          ⚠ No TV visible signage data loaded — away-game estimates will be $0 until TV data is imported.
        </div>
      ` : ''}

      <!-- KPI Cards -->
      <div class="home-grid">
        <div class="home-card">
          <div class="home-card-label">
            Total QIMV
            ${totals.hasEstimates ? `<span style="color:var(--text-muted);font-size:11px;" title="Includes estimated away-game values"> *</span>` : ''}
          </div>
          <div class="home-card-value">${formatCurrency(totals.totalQimv)}</div>
          <div class="home-card-note">${totals.homeGames} home · ${totals.awayGames} away games</div>
        </div>
        <div class="home-card">
          <div class="home-card-label">
            QI Impressions
            ${totals.hasEstimates ? `<span style="color:var(--text-muted);font-size:11px;" title="Includes estimated away-game values"> *</span>` : ''}
          </div>
          <div class="home-card-value">${formatNum(totals.totalQiImp)}</div>
          <div class="home-card-note">Quality-adjusted impressions</div>
        </div>
        <div class="home-card">
          <div class="home-card-label">Total Exposures</div>
          <div class="home-card-value">${formatNum(totals.totalExposures)}</div>
          <div class="home-card-note">Brand–position appearances</div>
        </div>
        <div class="home-card">
          <div class="home-card-label">
            Total Duration
            ${totals.hasEstimates ? `<span style="color:var(--text-muted);font-size:11px;" title="Includes estimated away-game values"> *</span>` : ''}
          </div>
          <div class="home-card-value">${formatDurationFromMinutes(totals.totalDuration)}</div>
          <div class="home-card-note">HH:MM:SS on-screen total</div>
        </div>
      </div>

      ${totals.hasEstimates ? `
        <div class="comparison-basis block" style="margin-bottom: 22px; line-height: 1.6;">
          <strong>* Estimation methodology:</strong> Away-game metrics (and any home game without a matching
          TV row) are estimated using the <strong>position-level simple mean</strong> pooled from
          <strong>most recent season</strong> home-game TV actuals — the same values shown in the
          "Season averages by position" table below. Home-game totals with a matching TV row reflect
          actual measured data.
        </div>
      ` : ''}

      <!-- Partner Breakdown Table -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Partner breakdown</h2>
          <span class="section-meta">${groupedPartners.length} entr${groupedPartners.length === 1 ? 'y' : 'ies'} · ${partnerStats.length} brand${partnerStats.length === 1 ? '' : 's'} · ${totals.totalGames} games</span>
        </div>
        ${totals.hasEstimates ? `
          <div class="leaderboard-note" style="margin-top: -10px; margin-bottom: 14px;">
            Partners marked * have away-game estimates included. Bold rows show combined totals when a brand family
            (e.g. Toyota, Toyota Generic, Toyota Dealers) occupies multiple entries — sub-brands are shown indented below.
          </div>
        ` : `
          <div class="leaderboard-note" style="margin-top: -10px; margin-bottom: 14px;">
            Bold rows show combined totals when a brand family spans multiple entries — sub-brands are shown indented below.
          </div>
        `}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-left">Partner</th>
                <th title="Games at home venue">Home</th>
                <th title="Away games (metrics estimated)">Away</th>
                <th title="Total game appearances in schedule">Games</th>
                <th title="Source Exposures from TV actuals (home) + position-level estimate (away)">Exposures</th>
                <th>QIMV</th>
                <th>QI Impressions</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${groupedPartners.map(group => {
                const estMark = group.hasEstimates
                  ? ` <span style="color:var(--text-muted);font-size:10px;" title="Includes away-game estimates">*</span>`
                  : '';
                if (group.isGroup) {
                  // Group header row
                  const headerRow = `
                    <tr style="background:var(--bg-elev-2);">
                      <td class="col-left" style="font-weight:700;">
                        ${group.brand}
                        <span style="color:var(--text-muted);font-size:10px;font-weight:400;margin-left:6px;">(${group.members.length} brands)</span>
                        ${estMark}
                      </td>
                      <td style="font-weight:600;">${group.homeGames}</td>
                      <td style="font-weight:600;">${group.awayGames}</td>
                      <td style="font-weight:700;">${group.totalGames}</td>
                      <td style="font-weight:600;">${formatNum(Math.round(group.exposures))}</td>
                      <td style="font-weight:700;">${formatCurrency(group.qimv)}</td>
                      <td style="font-weight:600;">${formatNum(group.qiImp)}</td>
                      <td style="font-weight:600;">${formatDurationFromMinutes(group.duration)}</td>
                    </tr>
                  `;
                  const subRows = group.members.map(m => {
                    const subMark = m.hasEstimates
                      ? ` <span style="color:var(--text-muted);font-size:10px;">*</span>`
                      : '';
                    return `
                      <tr>
                        <td class="col-left" style="padding-left:28px;font-size:12px;color:var(--text-dim);">
                          ↳ ${m.brand}${subMark}
                        </td>
                        <td style="font-size:12px;color:var(--text-dim);">${m.homeGames}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${m.awayGames}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${m.totalGames}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${formatNum(Math.round(m.exposures))}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${formatCurrency(m.qimv)}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${formatNum(m.qiImp)}</td>
                        <td style="font-size:12px;color:var(--text-dim);">${formatDurationFromMinutes(m.duration)}</td>
                      </tr>
                    `;
                  }).join('');
                  return headerRow + subRows;
                } else {
                  const p = group.members[0];
                  return `
                    <tr>
                      <td class="col-left" style="font-weight:500;">${p.brand}${estMark}</td>
                      <td>${p.homeGames}</td>
                      <td>${p.awayGames}</td>
                      <td>${p.totalGames}</td>
                      <td>${formatNum(Math.round(p.exposures))}</td>
                      <td>${formatCurrency(p.qimv)}</td>
                      <td>${formatNum(p.qiImp)}</td>
                      <td>${formatDurationFromMinutes(p.duration)}</td>
                    </tr>
                  `;
                }
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Full Schedule -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Full schedule</h2>
          <span class="section-meta">${schedule.length} game${schedule.length === 1 ? '' : 's'} · ${totals.homeGames} home · ${totals.awayGames} away</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-left">Date</th>
                <th class="col-left">H/A</th>
                <th class="col-left">Opponent</th>
                <th class="col-left">Position A · Center</th>
                <th class="col-left">Position B · 3-Point Line</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.map(g => {
                const awayTag = `<span style="color:var(--text-muted);font-size:10px;font-style:italic;" title="Away game — metrics estimated"> est.</span>`;
                const emptyCell = `<span style="color:var(--text-muted);">—</span>`;
                return `
                  <tr>
                    <td class="col-left" style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">
                      ${formatVSDate(g.DateRaw)}
                    </td>
                    <td class="col-left">
                      <span style="font-family:var(--font-mono);font-size:10px;text-transform:uppercase;
                        letter-spacing:0.06em;font-weight:600;
                        color:${g.IsHome ? 'var(--text)' : 'var(--text-dim)'};">
                        ${g.IsHome ? 'HOME' : 'AWAY'}
                      </span>
                    </td>
                    <td class="col-left">${g.Opponent}</td>
                    <td class="col-left">${g.BrandA
                      ? g.BrandA + (!g.IsHome ? awayTag : '')
                      : emptyCell}</td>
                    <td class="col-left">${g.BrandB
                      ? g.BrandB + (!g.IsHome ? awayTag : '')
                      : emptyCell}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Season Averages by Position -->
      ${locationAvgs.length ? `
        <section class="section" style="margin-top: 10px;">
          <div class="section-header">
            <h2 class="section-title">Season averages by position</h2>
            <span class="section-meta">Per-game averages from home TV actuals · ${locationAvgs.reduce((s, l) => s + l.sampleSize, 0)} measured appearances</span>
          </div>
          <div class="leaderboard-note" style="margin-top: -10px; margin-bottom: 14px;">
            Per-game averages from home TV actuals · used directly as the estimate for away games and any home game without a matching TV row.
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-left">Position</th>
                  <th title="Average Source/Total Exposures per home game">Avg Exposures</th>
                  <th title="Average QI Sponsorship Impressions per home game">Avg QI Impressions</th>
                  <th title="Average on-screen duration per home game">Avg Duration</th>
                  <th title="Average QI Media Value per home game">Avg QIMV</th>
                  <th style="color:var(--text-muted);" title="Number of home-game TV rows used">N Games</th>
                </tr>
              </thead>
              <tbody>
                ${locationAvgs.map(la => `
                  <tr>
                    <td class="col-left" style="font-weight:500;">${la.location}</td>
                    <td>${formatNum(Math.round(la.avgExposures))}</td>
                    <td>${formatNum(Math.round(la.avgQiImp))}</td>
                    <td>${formatDurationFromMinutes(la.avgDuration)}</td>
                    <td>${formatCurrency(la.avgQimv)}</td>
                    <td style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;">${la.sampleSize}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      ` : ''}

    `}
  `;

  wireSortableTables();
}

// ── Partner-page section renderer ───────────────────────────
function renderVirtualSignageSection(brand) {
  const slot = document.getElementById('virtual-signage-slot');
  if (!slot) return;

  const schedule = DataStore.virtualSignageSchedule || [];

  // Find the group this brand belongs to (may be a group parent or a member)
  const allStats   = getVirtualSignagePartnerStats();
  const grouped    = groupVSPartnerStats(allStats);
  const brandGroup = grouped.find(g =>
    g.brand === brand || g.members.some(m => m.brand === brand)
  );

  if (!brandGroup) { slot.innerHTML = ''; return; }

  // Collect all canonical brand names in this group
  const groupBrands = new Set(brandGroup.members.map(m => m.brand));

  // All schedule rows for any brand in this group
  const brandGames = schedule.filter(g =>
    groupBrands.has(g.BrandA) || groupBrands.has(g.BrandB)
  );

  if (!brandGames.length) { slot.innerHTML = ''; return; }

  // Use the group aggregate as the display stats
  const pStats = brandGroup;

  const hasTVData = getVirtualBrandingTVRows().length > 0;
  const sectionId = 'section-virtual-signage';
  const isOpen    = !!openSections[sectionId];
  const isGroup   = brandGroup.isGroup;

  // Position tags: which positions this brand/group occupies
  const posA = brandGames.filter(g => groupBrands.has(g.BrandA)).length;
  const posB = brandGames.filter(g => groupBrands.has(g.BrandB)).length;
  const positions = [];
  if (posA > 0) positions.push('Center (A)');
  if (posB > 0) positions.push('3-Point Line (B)');

  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">QIMV</span>
      <span class="value">${formatCurrency(pStats.qimv)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">QI Impressions</span>
      <span class="value">${formatNum(pStats.qiImp)}</span>
    </div>
  `;

  const groupNote = isGroup ? `
    <div class="comparison-basis block" style="margin-bottom: 14px; line-height: 1.6;">
      <strong>Combined brand family:</strong> Totals include all
      ${brandGroup.members.map(m => `<strong>${m.brand}</strong>`).join(', ')} entries
      (${pStats.totalGames} games · ${pStats.homeGames} home · ${pStats.awayGames} away).
    </div>
  ` : '';

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">On-Court Virtual Signage${isGroup ? ' <span style="font-size:11px;font-weight:400;color:var(--text-muted);">(brand family)</span>' : ''}</div>
          <div class="section-meta" style="margin-top: 2px;">
            ${pStats.totalGames} Game${pStats.totalGames !== 1 ? 's' : ''} · ${positions.join(' + ') || '—'}
          </div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>

      <div class="section-body">
        ${!hasTVData ? `
          <div class="comparison-basis block" style="margin-bottom: 14px;">
            ⚠ No TV visible signage data loaded — away-game estimates will show $0 until TV data is imported.
          </div>
        ` : ''}

        ${groupNote}

        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">Exposures</span>
            <span class="kpi-value">${formatNum(Math.round(pStats.exposures))}</span>
            <span class="kpi-change neutral">${pStats.homeGames} home · ${pStats.awayGames} away${pStats.hasEstimates ? ' *' : ''}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">QI Media Value</span>
            <span class="kpi-value">${formatCurrency(pStats.qimv)}</span>
            <span class="kpi-change neutral">${pStats.hasEstimates ? 'Actuals + away est. *' : 'Home actuals'}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">QI Impressions</span>
            <span class="kpi-value">${formatNum(pStats.qiImp)}</span>
            <span class="kpi-change neutral">Quality-adjusted</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Duration</span>
            <span class="kpi-value">${formatDurationFromMinutes(pStats.duration)}</span>
            <span class="kpi-change neutral">HH:MM:SS on-screen</span>
          </div>
        </div>

        ${pStats.hasEstimates ? `
          <div class="comparison-basis block" style="margin-top: 14px; margin-bottom: 14px; line-height: 1.6;">
            <strong>* Away-game estimation:</strong> Away appearances (and home games without a matching TV row)
            use the <strong>position-level simple mean</strong> from most recent season home-game TV actuals —
            equal to the averages shown in the Season Averages table on the portfolio page.
          </div>
        ` : ''}

        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <span class="card-title">Schedule appearances</span>
            <span class="card-sub">${pStats.totalGames} game${pStats.totalGames !== 1 ? 's' : ''} · ${pStats.homeGames} home · ${pStats.awayGames} away${isGroup ? ` · ${brandGroup.members.length} sub-brands` : ''}</span>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-left">Date</th>
                  <th class="col-left">H/A</th>
                  <th class="col-left">Opponent</th>
                  ${isGroup ? '<th class="col-left">Brand</th>' : ''}
                  <th class="col-left">Position</th>
                </tr>
              </thead>
              <tbody>
                ${brandGames.map(g => {
                  // Determine which group brand(s) appear in this game
                  const rows = [];
                  if (groupBrands.has(g.BrandA)) rows.push({ brand: g.BrandA, pos: 'Center (A)' });
                  if (groupBrands.has(g.BrandB)) rows.push({ brand: g.BrandB, pos: '3-Point Line (B)' });
                  return rows.map(entry => {
                    const awayTag = !g.IsHome
                      ? ` <span style="color:var(--text-muted);font-size:10px;font-style:italic;">est.</span>`
                      : '';
                    return `
                      <tr>
                        <td class="col-left" style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">
                          ${formatVSDate(g.DateRaw)}
                        </td>
                        <td class="col-left">
                          <span style="font-family:var(--font-mono);font-size:10px;text-transform:uppercase;
                            letter-spacing:0.06em;font-weight:600;
                            color:${g.IsHome ? 'var(--text)' : 'var(--text-dim)'};">
                            ${g.IsHome ? 'HOME' : 'AWAY'}
                          </span>
                        </td>
                        <td class="col-left">${g.Opponent}</td>
                        ${isGroup ? `<td class="col-left" style="font-size:12px;color:var(--text-dim);">${entry.brand}</td>` : ''}
                        <td class="col-left">${entry.pos}${awayTag}</td>
                      </tr>
                    `;
                  }).join('');
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;

  wireSectionToggles();
}


// Navigation helper — called from quick-link card and breadcrumbs
function openVirtualSignagePage() {
  currentBrand = null;
  currentPage  = 'virtual-signage';
  renderApp();
}
