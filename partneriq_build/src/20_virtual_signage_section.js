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
// Exposures use the "Source Exposures" or "Total Exposures" column
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

// Build per-position per-game estimates from TV actuals (pooled across all brands).
// Keyed by Location → { qimv, qiImp, duration, exposures, sampleSize }
// Using a cross-brand pool keeps away-game estimates equal for all partners at a
// position — prevents well-measured brands from getting a better estimate simply
// because they happened to have more home games.
function computeVSEstimates() {
  const grouped = {};

  getLatestSeasonVSRows().forEach(r => {
    const loc = String(r.Location || '').trim();
    if (!loc) return;
    if (!grouped[loc]) grouped[loc] = { location: loc, qimvVals: [], qiImpVals: [], durVals: [], expVals: [] };
    grouped[loc].qimvVals.push(Number(r['QI Media Value ($)'])          || 0);
    grouped[loc].qiImpVals.push(Number(r['Sponsorship QI Impressions']) || 0);
    grouped[loc].durVals.push(Number(r['Duration (Minutes)'])           || 0);
    // Accept either column name — some exports use "Source Exposures", others "Total Exposures"
    grouped[loc].expVals.push(Number(r['Source Exposures']) || Number(r['Total Exposures']) || 0);
  });

  const out = {};
  Object.entries(grouped).forEach(([loc, g]) => {
    out[loc] = {
      location:   g.location,
      qimv:       vsConservativeEstimate(g.qimvVals),
      qiImp:      vsConservativeEstimate(g.qiImpVals),
      duration:   vsConservativeEstimate(g.durVals),
      exposures:  vsConservativeEstimate(g.expVals),
      sampleSize: g.qimvVals.length,
    };
  });
  return out;
}

// ── Partner-level stats: home actuals + away estimates ──────
function getVirtualSignagePartnerStats() {
  const schedule  = DataStore.virtualSignageSchedule || [];
  const estimates = computeVSEstimates(); // keyed by Location now

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

  // Pass 1 — walk schedule: tally games; apply position-level estimates for away games
  schedule.forEach(game => {
    [
      { brand: game.BrandA, location: 'Center' },
      { brand: game.BrandB, location: '3 Point Line' },
    ].forEach(({ brand, location }) => {
      if (!brand) return;
      ensure(brand);
      const b = stats[brand];
      b.totalGames++;
      if (game.IsHome) {
        b.homeGames++;
        // Exposures for home games come from actual TV rows in Pass 2 below
      } else {
        b.awayGames++;
        b.hasEstimates = true;
        // Use cross-brand position average (same for every partner at this position)
        const est = estimates[location];
        if (est) {
          b.qimv      += est.qimv;
          b.qiImp     += est.qiImp;
          b.duration  += est.duration;
          b.exposures += est.exposures;
        }
      }
    });
  });

  // Pass 2 — add actual TV data rows for home appearances
  // (only for brands already in the schedule — orphan TV rows excluded)
  getVirtualBrandingTVRows().forEach(r => {
    const brand = r.Brand;
    if (!brand || !stats[brand]) return;
    stats[brand].qimv      += Number(r['QI Media Value ($)'])          || 0;
    stats[brand].qiImp     += Number(r['Sponsorship QI Impressions'])  || 0;
    stats[brand].duration  += Number(r['Duration (Minutes)'])          || 0;
    stats[brand].exposures += Number(r['Source Exposures']) || Number(r['Total Exposures']) || 0;
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

// ── Season averages by position (simple means, for display) ─
// Used in the "Season averages by position" table at the bottom of the page.
// Uses most-recent-season home-game TV rows only — away estimates are excluded.
function computeVSLocationAverages() {
  const grouped = {};

  getLatestSeasonVSRows().forEach(r => {
    const loc = String(r.Location || '').trim();
    if (!loc) return;
    if (!grouped[loc]) grouped[loc] = { location: loc, qimvVals: [], qiImpVals: [], durVals: [], expVals: [] };
    grouped[loc].qimvVals.push(Number(r['QI Media Value ($)'])          || 0);
    grouped[loc].qiImpVals.push(Number(r['Sponsorship QI Impressions']) || 0);
    grouped[loc].durVals.push(Number(r['Duration (Minutes)'])           || 0);
    grouped[loc].expVals.push(Number(r['Source Exposures']) || Number(r['Total Exposures']) || 0);
  });

  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return Object.values(grouped).map(g => ({
    location:    g.location,
    avgExposures: mean(g.expVals),
    avgQiImp:    mean(g.qiImpVals),
    avgDuration: mean(g.durVals),
    avgQimv:     mean(g.qimvVals),
    sampleSize:  g.qimvVals.length,
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
          <strong>* Estimation methodology:</strong> Away-game metrics are not directly measured.
          Each away appearance is estimated using a <strong>position-level</strong> conservative average
          pooled from <strong>most recent season</strong> home-game TV actuals at that position — <strong>floor(min(mean, median))</strong>.
          The same rate applies equally to every partner at a position, regardless of individual home-game
          sample size. Home-game totals reflect actual TV data.
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
            Averages are based on all measured home-game appearances and serve as the basis for away-game estimation.
            Conservative estimates for away games use <strong>floor(min(mean, median))</strong> rather than the simple mean shown here.
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
  const brandGames = schedule.filter(g => g.BrandA === brand || g.BrandB === brand);
  if (!brandGames.length) { slot.innerHTML = ''; return; }

  const allStats  = getVirtualSignagePartnerStats();
  const pStats    = allStats.find(p => p.brand === brand);
  if (!pStats)    { slot.innerHTML = ''; return; }

  const hasTVData = getVirtualBrandingTVRows().length > 0;
  const sectionId = 'section-virtual-signage';
  const isOpen    = !!openSections[sectionId];

  const posA = brandGames.filter(g => g.BrandA === brand).length;
  const posB = brandGames.filter(g => g.BrandB === brand).length;
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

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">On-Court Virtual Signage</div>
          <div class="section-meta" style="margin-top: 2px;">
            ${brandGames.length} Game${brandGames.length !== 1 ? 's' : ''} · ${positions.join(' + ') || '—'}
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
            <strong>* Away-game estimation:</strong> Away appearances use a position-level conservative average
            — <strong>floor(min(mean, median))</strong> — pooled from <strong>most recent season</strong> home-game TV actuals at that position.
            The same per-position rate applies equally to every partner, regardless of home-game sample size.
          </div>
        ` : ''}

        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <span class="card-title">Schedule appearances</span>
            <span class="card-sub">${brandGames.length} game${brandGames.length !== 1 ? 's' : ''} · ${pStats.homeGames} home · ${pStats.awayGames} away</span>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-left">Date</th>
                  <th class="col-left">H/A</th>
                  <th class="col-left">Opponent</th>
                  <th class="col-left">Position</th>
                </tr>
              </thead>
              <tbody>
                ${brandGames.map(g => {
                  const pos = g.BrandA === brand ? 'Center (A)' : '3-Point Line (B)';
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
                      <td class="col-left">${pos}${awayTag}</td>
                    </tr>
                  `;
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
