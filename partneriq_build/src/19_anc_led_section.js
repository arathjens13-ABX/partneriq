// ============================================================
// ANC LED REPORT
// ============================================================
// Per-asset in-arena LED signage exposure time (Pre-Game / In-Game /
// Post-Game / Event Avg / Time Total) per sponsor variant.
// Source: SPONSOR_AVERAGE_<Arena>_<Asset>_<startDate>_<endDate>.csv
// One file per asset (Stanchion, Player Tunnel, 360Ring, etc.).
// ============================================================

function parseDuration(str) {
  if (str === null || str === undefined) return null;
  const trimmed = String(str).trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
  return null;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const sec = Math.round(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// SPONSOR_AVERAGE_Moda_Center_Stanchion_2025-10-21_2026-04-30
// → { arena: 'Moda Center', asset: 'Stanchion', startDate, endDate }
function parseANCFilename(filename) {
  const base = filename.replace(/\.(csv|xlsx|xls)$/i, '');
  const m = base.match(/^SPONSOR_AVERAGE_(.+?)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/i);
  if (!m) return null;
  const [, locationStr, startDate, endDate] = m;
  const parts = locationStr.split('_');
  let arena, asset;
  // Hardcoded arena prefix for the only known venue. If a future arena appears,
  // either add it here or generalize via a registry.
  if (parts.length >= 3 && parts[0] === 'Moda' && parts[1] === 'Center') {
    arena = 'Moda Center';
    asset = parts.slice(2).join(' ');
  } else {
    arena = parts[0] || 'Unknown';
    asset = parts.slice(1).join(' ') || 'Unknown';
  }
  return { arena, asset, startDate, endDate };
}

function normalizeANCLEDRow(row, arena, asset, startDate, endDate) {
  if (!row) return null;
  const sponsor = String(row['Sponsor Name'] || '').trim();
  if (!sponsor) return null;
  const preGame   = parseDuration(row['Pre-Game Avg']);
  const inGame    = parseDuration(row['In-Game Avg']);
  const postGame  = parseDuration(row['Post-Game Avg']);
  const eventAvg  = parseDuration(row['Event Avg']);
  const timeTotal = parseDuration(row['Time Total']);
  // Drop rows with no time at all
  if (preGame === null && inGame === null && postGame === null && eventAvg === null && timeTotal === null) return null;
  return {
    Brand: resolveCanonicalBrandName(sponsor),
    Variant: sponsor,
    Arena: arena,
    Asset: asset,
    PreGameAvg: preGame,
    InGameAvg: inGame,
    PostGameAvg: postGame,
    EventAvg: eventAvg,
    TimeTotal: timeTotal,
    StartDate: startDate,
    EndDate: endDate,
    _rawSponsor: sponsor,
  };
}

function ingestANCLEDFile(rows, filename) {
  const meta = parseANCFilename(filename);
  if (!meta) return [];
  const out = [];
  rows.forEach(r => {
    const norm = normalizeANCLEDRow(r, meta.arena, meta.asset, meta.startDate, meta.endDate);
    if (norm) {
      DataStore.ancLED.push(norm);
      DataStore.registerBrand(norm.Brand, 'ancLED');
      out.push(norm);
    }
  });
  return out;
}

function getANCLEDRowsForBrand(brand) {
  const canonical = resolveCanonicalBrandName(brand);
  return (DataStore.ancLED || []).filter(r => r.Brand === canonical);
}

function hasANCLEDDataForBrand(brand) {
  return getANCLEDRowsForBrand(brand).length > 0;
}

function getANCLEDSummary(brand) {
  const rows = getANCLEDRowsForBrand(brand);
  if (!rows.length) return null;

  const totalTime = rows.reduce((a, r) => a + (r.TimeTotal || 0), 0);
  const totalEventAvg = rows.reduce((a, r) => a + (r.EventAvg || 0), 0);
  const assets   = new Set(rows.map(r => r.Asset));
  const variants = new Set(rows.map(r => r.Variant));

  // Per-asset rollup (sums across the brand's variants on each asset)
  const byAsset = {};
  rows.forEach(r => {
    if (!byAsset[r.Asset]) {
      byAsset[r.Asset] = {
        asset: r.Asset, variants: new Set(),
        preGame: 0, inGame: 0, postGame: 0, eventAvg: 0, timeTotal: 0,
      };
    }
    const b = byAsset[r.Asset];
    b.variants.add(r.Variant);
    b.preGame   += r.PreGameAvg || 0;
    b.inGame    += r.InGameAvg || 0;
    b.postGame  += r.PostGameAvg || 0;
    b.eventAvg  += r.EventAvg || 0;
    b.timeTotal += r.TimeTotal || 0;
  });
  const perAsset = Object.values(byAsset)
    .map(b => ({ ...b, variantCount: b.variants.size }))
    .sort((a, b) => b.timeTotal - a.timeTotal);

  // Variant detail rows (each raw row, sorted by Asset then by Time Total desc)
  const variantDetail = [...rows].sort((a, b) =>
    a.Asset.localeCompare(b.Asset) || (b.TimeTotal || 0) - (a.TimeTotal || 0)
  );

  // Most common date range — used as section subtitle
  const dateCounts = {};
  rows.forEach(r => {
    if (r.StartDate && r.EndDate) {
      const k = `${r.StartDate}_${r.EndDate}`;
      dateCounts[k] = (dateCounts[k] || 0) + 1;
    }
  });
  const topRange = Object.entries(dateCounts).sort((a, b) => b[1] - a[1])[0];
  const dateRange = topRange ? topRange[0].split('_') : null;

  return {
    totalTime, totalEventAvg,
    assetCount: assets.size,
    variantCount: variants.size,
    perAsset, variantDetail, dateRange,
  };
}

function renderANCLEDSection(brand) {
  const slot = document.getElementById('anc-led-slot');
  if (!slot) return;
  const summary = getANCLEDSummary(brand);
  if (!summary) { slot.innerHTML = ''; return; }

  const sectionId = 'section-anc-led';
  const isOpen = !!openSections[sectionId];

  const dateLine = summary.dateRange
    ? `${summary.dateRange[0]} → ${summary.dateRange[1]}`
    : 'Coverage window not set';

  // Collapsed strip
  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">Total exposure</span>
      <span class="value">${formatDuration(summary.totalTime)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Assets</span>
      <span class="value">${formatNum(summary.assetCount)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Variants</span>
      <span class="value">${formatNum(summary.variantCount)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Event Avg total</span>
      <span class="value">${formatDuration(summary.totalEventAvg)}</span>
    </div>
  `;

  // Per-asset summary table
  const assetTableRows = summary.perAsset.map(b => `
    <tr>
      <td class="text-left">${escapeHTML(b.asset)}</td>
      <td class="num">${formatNum(b.variantCount)}</td>
      <td class="num">${formatDuration(b.preGame)}</td>
      <td class="num">${formatDuration(b.inGame)}</td>
      <td class="num">${formatDuration(b.postGame)}</td>
      <td class="num">${formatDuration(b.eventAvg)}</td>
      <td class="num sep" style="font-weight:500;">${formatDuration(b.timeTotal)}</td>
    </tr>
  `).join('');

  const assetTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-left">Asset</th>
          <th class="num">Variants</th>
          <th class="num">Pre-Game Avg</th>
          <th class="num">In-Game Avg</th>
          <th class="num">Post-Game Avg</th>
          <th class="num">Event Avg</th>
          <th class="num sep">Time Total</th>
        </tr>
      </thead>
      <tbody>
        ${assetTableRows}
        <tr style="border-top:1px solid var(--border);font-weight:500;">
          <td class="text-left">Total</td>
          <td class="num">${formatNum(summary.variantCount)}</td>
          <td class="num">${formatDuration(summary.perAsset.reduce((a, b) => a + b.preGame, 0))}</td>
          <td class="num">${formatDuration(summary.perAsset.reduce((a, b) => a + b.inGame, 0))}</td>
          <td class="num">${formatDuration(summary.perAsset.reduce((a, b) => a + b.postGame, 0))}</td>
          <td class="num">${formatDuration(summary.totalEventAvg)}</td>
          <td class="num sep">${formatDuration(summary.totalTime)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Variant detail table
  const variantRows = summary.variantDetail.map(r => `
    <tr>
      <td class="text-left">${escapeHTML(r.Asset)}</td>
      <td class="text-left sep">${escapeHTML(r.Variant)}</td>
      <td class="num">${formatDuration(r.PreGameAvg)}</td>
      <td class="num">${formatDuration(r.InGameAvg)}</td>
      <td class="num">${formatDuration(r.PostGameAvg)}</td>
      <td class="num">${formatDuration(r.EventAvg)}</td>
      <td class="num sep" style="font-weight:500;">${formatDuration(r.TimeTotal)}</td>
    </tr>
  `).join('');

  const variantTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-left">Asset</th>
          <th class="text-left sep">Campaign Variant</th>
          <th class="num">Pre-Game Avg</th>
          <th class="num">In-Game Avg</th>
          <th class="num">Post-Game Avg</th>
          <th class="num">Event Avg</th>
          <th class="num sep">Time Total</th>
        </tr>
      </thead>
      <tbody>${variantRows}</tbody>
    </table>
  `;

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">ANC LED Report</div>
          <div class="section-meta" style="margin-top:2px;">${formatDuration(summary.totalTime)} total exposure · ${summary.assetCount} asset${summary.assetCount === 1 ? '' : 's'} · ${dateLine}</div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>
      <div class="section-body">
        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">Total exposure time</span>
            <span class="kpi-value">${formatDuration(summary.totalTime)}</span>
            <span class="kpi-change neutral">Across all assets &amp; variants</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Assets carrying brand</span>
            <span class="kpi-value">${formatNum(summary.assetCount)}</span>
            <span class="kpi-change neutral">In-arena LED placements</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Total Event Avg / game</span>
            <span class="kpi-value">${formatDuration(summary.totalEventAvg)}</span>
            <span class="kpi-change neutral">Sum of per-game averages</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Campaign variants</span>
            <span class="kpi-value">${formatNum(summary.variantCount)}</span>
            <span class="kpi-change neutral">Distinct creative line items</span>
          </div>
        </div>
        <div class="card" style="margin-top:18px;">
          <div class="card-header"><span class="card-title">Per-asset summary</span><span class="card-sub">Sums of this brand's variants on each asset</span></div>
          <div style="overflow-x:auto;">${assetTable}</div>
        </div>
        <div class="card" style="margin-top:18px;">
          <div class="card-header"><span class="card-title">Campaign variant detail</span><span class="card-sub">Each line item from the source files (raw sponsor name)</span></div>
          <div style="overflow-x:auto;">${variantTable}</div>
        </div>
      </div>
    </section>
  `;
}
