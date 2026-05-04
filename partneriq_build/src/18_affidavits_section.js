// ============================================================
// TV & RADIO AFFIDAVITS
// ============================================================
// Broadcast spot delivery counts per partner across TV and Radio
// game broadcasts. Each row is Partner × Daypart × Status × Season.
// Source: TVAffidavit_partner_summary.csv, RadioAffidavit_partner_summary.csv
// ============================================================

// Radio CSV truncates partner names to ~30 chars: "COLUMBIA BANK-Radio Game Broadc",
// "MODA HEALTH-Radio Game Broadcas", "PNW TOYOTA DEALERS ASSOC-Radio ", etc.
// Strip the "-Radio Game…" suffix (or any partial truncation of it) so the partner
// name flows through normal alias resolution.
const AFFIDAVIT_RADIO_SUFFIX = /\s*-\s*Radio\b.*$/i;

const AFFIDAVIT_DAYPARTS = ['Pregame', 'PlayByPlay', 'Postgame'];

function normalizeAffidavitRow(row, channel) {
  if (!row) return null;
  let partner = String(row.Partner || '').trim();
  if (!partner) return null;
  if (channel === 'Radio') partner = partner.replace(AFFIDAVIT_RADIO_SUFFIX, '').trim();
  if (!partner) return null;
  const count = Number(row.Count);
  if (!Number.isFinite(count) || count <= 0) return null;
  return {
    Brand: resolveCanonicalBrandName(partner),
    Channel: channel,
    Daypart: String(row.Daypart || '').trim() || 'Other',
    Status: String(row.Status || '').trim() || 'Other',
    Season: String(row.Season || '').trim() || 'Other',
    Count: count,
    _rawPartner: partner,
  };
}

function ingestAffidavitFile(rows, channel) {
  const out = [];
  rows.forEach(r => {
    const norm = normalizeAffidavitRow(r, channel);
    if (norm) {
      DataStore.affidavits.push(norm);
      DataStore.registerBrand(norm.Brand, 'affidavit');
      out.push(norm);
    }
  });
  return out;
}

function getAffidavitsForBrand(brand) {
  const canonical = resolveCanonicalBrandName(brand);
  return (DataStore.affidavits || []).filter(r => r.Brand === canonical);
}

function hasAffidavitDataForBrand(brand) {
  return getAffidavitsForBrand(brand).length > 0;
}

function getAffidavitSummary(brand) {
  const rows = getAffidavitsForBrand(brand);
  if (!rows.length) return null;

  const breakdown = {};
  AFFIDAVIT_DAYPARTS.forEach(d => {
    breakdown[d] = { tvContracted: 0, tvBonused: 0, radioContracted: 0, radioBonused: 0 };
  });

  let tvContracted = 0, tvBonused = 0, radioContracted = 0, radioBonused = 0;
  const seasonBreakdown = {};

  rows.forEach(r => {
    const isTV = r.Channel === 'TV';
    const isContracted = r.Status === 'Contracted';
    if (isTV && isContracted)       tvContracted    += r.Count;
    else if (isTV)                  tvBonused       += r.Count;
    else if (!isTV && isContracted) radioContracted += r.Count;
    else                            radioBonused    += r.Count;

    if (breakdown[r.Daypart]) {
      const key = isTV
        ? (isContracted ? 'tvContracted' : 'tvBonused')
        : (isContracted ? 'radioContracted' : 'radioBonused');
      breakdown[r.Daypart][key] += r.Count;
    }

    if (!seasonBreakdown[r.Season]) seasonBreakdown[r.Season] = { tv: 0, radio: 0, total: 0 };
    if (isTV) seasonBreakdown[r.Season].tv += r.Count;
    else      seasonBreakdown[r.Season].radio += r.Count;
    seasonBreakdown[r.Season].total += r.Count;
  });

  const tvTotal = tvContracted + tvBonused;
  const radioTotal = radioContracted + radioBonused;
  const totalSpots = tvTotal + radioTotal;
  const totalContracted = tvContracted + radioContracted;
  const totalBonused = tvBonused + radioBonused;
  const bonusRate = totalContracted > 0 ? totalBonused / totalContracted : null;

  return {
    totalSpots, totalContracted, totalBonused, bonusRate,
    tvTotal, radioTotal,
    tvContracted, tvBonused, radioContracted, radioBonused,
    breakdown, seasonBreakdown,
  };
}

function renderAffidavitsSection(brand) {
  const slot = document.getElementById('affidavits-slot');
  if (!slot) return;
  const summary = getAffidavitSummary(brand);
  if (!summary) { slot.innerHTML = ''; return; }

  const sectionId = 'section-affidavits';
  const isOpen = !!openSections[sectionId];
  const formatRate = v => v === null ? '—' : (v * 100).toFixed(1) + '%';

  // Collapsed-section header strip — distinct TV vs Radio numbers per user spec.
  const summaryHTML = `
    <div class="section-summary-stat">
      <span class="label">TV spots</span>
      <span class="value">${formatNum(summary.tvTotal)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Radio spots</span>
      <span class="value">${formatNum(summary.radioTotal)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">TV Contracted</span>
      <span class="value">${formatNum(summary.tvContracted)}</span>
    </div>
    <div class="section-summary-stat">
      <span class="label">Radio Contracted</span>
      <span class="value">${formatNum(summary.radioContracted)}</span>
    </div>
  `;

  // Daypart × channel × status breakdown table
  const dayparts = AFFIDAVIT_DAYPARTS.filter(d => {
    const b = summary.breakdown[d];
    return (b.tvContracted + b.tvBonused + b.radioContracted + b.radioBonused) > 0;
  });
  const breakdownRows = dayparts.map(d => {
    const b = summary.breakdown[d];
    const tvRowTotal = b.tvContracted + b.tvBonused;
    const radioRowTotal = b.radioContracted + b.radioBonused;
    const rowTotal = tvRowTotal + radioRowTotal;
    return `<tr>
      <td class="text-left">${d}</td>
      <td class="num">${formatNum(b.tvContracted)}</td>
      <td class="num">${formatNum(b.tvBonused)}</td>
      <td class="num" style="font-weight:500;">${formatNum(tvRowTotal)}</td>
      <td class="num sep">${formatNum(b.radioContracted)}</td>
      <td class="num">${formatNum(b.radioBonused)}</td>
      <td class="num" style="font-weight:500;">${formatNum(radioRowTotal)}</td>
      <td class="num sep" style="font-weight:500;">${formatNum(rowTotal)}</td>
    </tr>`;
  }).join('');

  const breakdownTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-left">Daypart</th>
          <th class="num">TV Contracted</th>
          <th class="num">TV Bonused</th>
          <th class="num">TV Total</th>
          <th class="num sep">Radio Contracted</th>
          <th class="num">Radio Bonused</th>
          <th class="num">Radio Total</th>
          <th class="num sep">Total</th>
        </tr>
      </thead>
      <tbody>
        ${breakdownRows}
        <tr style="border-top:1px solid var(--border);font-weight:500;">
          <td class="text-left">Total</td>
          <td class="num">${formatNum(summary.tvContracted)}</td>
          <td class="num">${formatNum(summary.tvBonused)}</td>
          <td class="num">${formatNum(summary.tvTotal)}</td>
          <td class="num sep">${formatNum(summary.radioContracted)}</td>
          <td class="num">${formatNum(summary.radioBonused)}</td>
          <td class="num">${formatNum(summary.radioTotal)}</td>
          <td class="num sep">${formatNum(summary.totalSpots)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Season breakdown — only show if more than one season has data
  const seasonsWithData = Object.entries(summary.seasonBreakdown).filter(([, v]) => v.total > 0);
  const seasonTable = seasonsWithData.length > 1 ? `
    <div class="card" style="margin-top:18px;">
      <div class="card-header"><span class="card-title">Spots by season</span><span class="card-sub">Preseason vs Regular Season delivery</span></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-left">Season</th>
              <th class="num">TV</th>
              <th class="num sep">Radio</th>
              <th class="num sep">Total</th>
            </tr>
          </thead>
          <tbody>
            ${seasonsWithData.map(([s, v]) => `
              <tr>
                <td class="text-left">${escapeHTML(s)}</td>
                <td class="num">${formatNum(v.tv)}</td>
                <td class="num sep">${formatNum(v.radio)}</td>
                <td class="num sep" style="font-weight:500;">${formatNum(v.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        <div>
          <div class="section-title">TV &amp; Radio Affidavits</div>
          <div class="section-meta" style="margin-top:2px;">${formatNum(summary.totalSpots)} total spots · ${formatRate(summary.bonusRate)} bonus rate</div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>
      <div class="section-body">
        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">Total spots</span>
            <span class="kpi-value">${formatNum(summary.totalSpots)}</span>
            <span class="kpi-change neutral">TV + Radio combined</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">TV Contracted</span>
            <span class="kpi-value">${formatNum(summary.tvContracted)}</span>
            <span class="kpi-change neutral">+${formatNum(summary.tvBonused)} bonus spots</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Radio Contracted</span>
            <span class="kpi-value">${formatNum(summary.radioContracted)}</span>
            <span class="kpi-change neutral">+${formatNum(summary.radioBonused)} bonus spots</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Bonus rate</span>
            <span class="kpi-value">${formatRate(summary.bonusRate)}</span>
            <span class="kpi-change ${summary.bonusRate && summary.bonusRate > 0 ? 'up' : 'neutral'}">Bonused ÷ contracted</span>
          </div>
        </div>
        <div class="card" style="margin-top:18px;">
          <div class="card-header"><span class="card-title">Spot delivery by daypart</span><span class="card-sub">Counts of broadcast spots delivered, split by TV / Radio and Contracted / Bonused</span></div>
          <div style="overflow-x:auto;">${breakdownTable}</div>
        </div>
        ${seasonTable}
      </div>
    </section>
  `;
}
