// ============================================================
// ERROR TOAST
// ============================================================
function showErrorToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

// ============================================================
// AUTO-MATCH YoY — "apples to apples" game-count comparison
// ============================================================
// Returns the unique matchdates for a brand+season (or all brands if brand is null)
// Used to determine how many games were played.
function getUniqueMatchdates(rows) {
  const set = new Set();
  rows.forEach(r => {
    const d = r.Matchdate;
    if (d) set.add(String(d));
  });
  // Sort chronologically where possible
  return [...set].sort((a, b) => {
    const da = new Date(a), db = new Date(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return a.localeCompare(b);
  });
}

function getMatchdateCountForBrandSeason(brand, season) {
  if (!brand || !season) return 0;
  return getUniqueMatchdates(getBrandTVData(brand, season)).length;
}

// Returns rows from the prior season limited to the first N matchdates.
// This is the core "auto-match" mechanism.
function getMatchedPriorSeasonTVData(brand, priorSeason, matchdateLimit) {
  const priorRows = getBrandTVData(brand, priorSeason);
  if (!matchdateLimit || matchdateLimit <= 0) return priorRows;
  const priorDates = getUniqueMatchdates(priorRows);
  const limitedDates = new Set(priorDates.slice(0, matchdateLimit));
  return priorRows.filter(r => r.Matchdate && limitedDates.has(String(r.Matchdate)));
}

// Central helper for YoY math. Returns the current and prior row sets
// along with a human-readable "basis" string describing the comparison.
function getYoYRowSets(brand, period) {
  const seasons = getAvailableSeasons(brand);
  if (seasons.length < 2) return null;
  const currSeason = period === 'all' ? seasons[seasons.length - 1] : period;
  const currIdx = seasons.indexOf(currSeason);
  if (currIdx <= 0) return null;
  const priorSeason = seasons[currIdx - 1];

  const currRows = getBrandTVData(brand, currSeason);
  if (!currRows.length) return null;

  const currMatchdates = getUniqueMatchdates(currRows);
  const priorRowsFull = getBrandTVData(brand, priorSeason);
  const priorMatchdates = getUniqueMatchdates(priorRowsFull);

  if (!priorRowsFull.length) return null;

  let priorRows, basis;
  if (comparisonMode === 'auto-match' && currMatchdates.length < priorMatchdates.length) {
    priorRows = getMatchedPriorSeasonTVData(brand, priorSeason, currMatchdates.length);
    basis = `Through ${currMatchdates.length} game${currMatchdates.length === 1 ? '' : 's'} · vs first ${currMatchdates.length} of ${priorSeason}`;
  } else {
    priorRows = priorRowsFull;
    basis = comparisonMode === 'full'
      ? `Full ${currSeason} vs full ${priorSeason}`
      : `${currMatchdates.length} games vs full ${priorSeason} (${priorMatchdates.length} games)`;
  }

  return {
    currRows,
    priorRows,
    currSeason,
    priorSeason,
    currMatchdates: currMatchdates.length,
    priorMatchdatesUsed: getUniqueMatchdates(priorRows).length,
    priorMatchdatesTotal: priorMatchdates.length,
    basis,
    matched: comparisonMode === 'auto-match' && currMatchdates.length < priorMatchdates.length,
  };
}

// Convenience: get section-level YoY for a particular metric key
function computeYoYForMetric(brand, period, metricKey) {
  const sets = getYoYRowSets(brand, period);
  if (!sets) return null;
  const curr = sum(sets.currRows, metricKey);
  const prev = sum(sets.priorRows, metricKey);
  const change = pctChange(curr, prev);
  return change === null ? null : { change, curr, prev, basis: sets.basis };
}

// ============================================================
// RANKINGS — used for hover tooltips
// ============================================================
// For a given asset (Location) and season, rank all brands by QIMV/min
function getAssetRanking(location, season = 'all') {
  const rows = season === 'all'
    ? DataStore.tvSignage.filter(r => r.Location === location)
    : DataStore.tvSignage.filter(r => r.Location === location && normalizeSeasonLabel(r.Season) === season);

  const byBrand = {};
  rows.forEach(r => {
    if (!byBrand[r.Brand]) byBrand[r.Brand] = { qimv: 0, minutes: 0 };
    byBrand[r.Brand].qimv += Number(r['QI Media Value ($)']) || 0;
    byBrand[r.Brand].minutes += Number(r['Duration (Minutes)']) || 0;
  });

  const ranked = Object.entries(byBrand)
    .map(([brand, v]) => ({ brand, qimvPerMin: v.minutes > 0 ? v.qimv / v.minutes : 0, qimv: v.qimv, minutes: v.minutes }))
    .sort((a, b) => b.qimvPerMin - a.qimvPerMin);

  return ranked;
}

function getBrandRankOnAsset(brand, location, season = 'all') {
  const ranked = getAssetRanking(location, season);
  const idx = ranked.findIndex(r => r.brand === brand);
  if (idx === -1) return null;
  return { rank: idx + 1, total: ranked.length, data: ranked[idx], all: ranked };
}

// Rank a brand overall (across all locations) by total QIMV/min in a season
function getBrandOverallRank(brand, season = 'all') {
  const rows = season === 'all' ? DataStore.tvSignage : DataStore.tvSignage.filter(r => normalizeSeasonLabel(r.Season) === season);
  const byBrand = {};
  rows.forEach(r => {
    if (!byBrand[r.Brand]) byBrand[r.Brand] = { qimv: 0, minutes: 0 };
    byBrand[r.Brand].qimv += Number(r['QI Media Value ($)']) || 0;
    byBrand[r.Brand].minutes += Number(r['Duration (Minutes)']) || 0;
  });
  const ranked = Object.entries(byBrand)
    .map(([b, v]) => ({ brand: b, qimvPerMin: v.minutes > 0 ? v.qimv / v.minutes : 0 }))
    .sort((a, b) => b.qimvPerMin - a.qimvPerMin);
  const idx = ranked.findIndex(r => r.brand === brand);
  return idx === -1 ? null : { rank: idx + 1, total: ranked.length };
}

// ============================================================
// TOOLTIP SYSTEM
// ============================================================
const tooltipEl = document.getElementById('tooltip');
let tooltipTimer = null;

function showTooltip(event, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');
  positionTooltip(event);
}

function positionTooltip(event) {
  const pad = 14;
  const rect = tooltipEl.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - 12) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 12) y = event.clientY - rect.height - pad;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}

function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

function attachDefinitionTooltip(el, term) {
  const def = GLOSSARY[term];
  if (!def) return;
  el.addEventListener('mouseenter', (e) => {
    showTooltip(e, `<div class="tooltip-title">${term}</div><div class="tooltip-body">${def}</div>`);
  });
  el.addEventListener('mousemove', positionTooltip);
  el.addEventListener('mouseleave', hideTooltip);
}

function attachAssetRankTooltip(el, brand, location, season) {
  el.addEventListener('mouseenter', (e) => {
    const rankInfo = getBrandRankOnAsset(brand, location, season);
    if (!rankInfo) { showTooltip(e, `<div class="tooltip-title">${location}</div><div class="tooltip-body">No ranking data available.</div>`); return; }

    const { rank, total, data } = rankInfo;
    const rankClass = rank === 1 ? 'up' : rank <= Math.ceil(total / 3) ? 'up' : rank > Math.ceil(total * 2 / 3) ? 'down' : 'neutral';
    const arrow = rank === 1 ? '▲' : '';

    const html = `
      <div class="tooltip-title">${location}</div>
      <div class="tooltip-body">Ranking among all brands active on this asset, based on <strong style="color: var(--text)">QIMV per Minute</strong> — the standard efficiency metric for sponsorship value.</div>
      <div class="tooltip-rank">
        <span class="tooltip-rank-label">Rank</span>
        <span class="tooltip-rank-value"><span class="${rankClass}">${arrow} ${ordinal(rank)}</span> <span class="total">of ${total}</span></span>
      </div>
      <div class="tooltip-metric"><span class="label">QIMV / min</span><span class="val">${formatCurrency(data.qimvPerMin)}</span></div>
      <div class="tooltip-metric"><span class="label">Total QIMV</span><span class="val">${formatCurrency(data.qimv)}</span></div>
      <div class="tooltip-metric"><span class="label">On-screen duration</span><span class="val">${formatDurationFromMinutes(data.minutes)}</span></div>
    `;
    showTooltip(e, html);
  });
  el.addEventListener('mousemove', positionTooltip);
  el.addEventListener('mouseleave', hideTooltip);
}

function makeInfoIcon(term) {
  return `<span class="info-icon" data-term="${term.replace(/"/g, '&quot;')}">i</span>`;
}

// After rendering, wire up all info icons
function wireInfoIcons(root = document) {
  root.querySelectorAll('.info-icon[data-term]').forEach(el => {
    if (el.dataset.wired) return;
    el.dataset.wired = '1';
    attachDefinitionTooltip(el, el.dataset.term);
  });
}

// Wires up collapsible section headers. When clicked, toggles openSections state
// and re-renders only that section (or the whole app — simpler and plenty fast).
function wireSectionToggles() {
  document.querySelectorAll('[data-section-toggle]').forEach(btn => {
    if (btn.dataset.toggleWired) return;
    btn.dataset.toggleWired = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.sectionToggle;
      openSections[id] = !openSections[id];
      renderApp();
    });
  });
}

// ============================================================
// PAID SOCIAL ASSIGNMENT REVIEW
// ============================================================
function getAllPaidRows() { return Object.values(DataStore.paidSocial || {}).flatMap(rows => Array.isArray(rows) ? rows : []); }
function regroupPaidRowsByBrand() { const all = getAllPaidRows(); const grouped = {}; all.forEach(r => { const brand = String(r.Brand || UNASSIGNED_PAID_KEY).trim() || UNASSIGNED_PAID_KEY; if (!grouped[brand]) grouped[brand] = []; grouped[brand].push(r); }); DataStore.paidSocial = grouped; rebuildBrandRegistryFromData(); }
function getPaidCampaignAssignmentGroups(onlyReview = true) { const grouped = {}; getAllPaidRows().forEach(r => { const name = r.CampaignName || r['Campaign name'] || 'Unknown campaign'; if (!grouped[name]) grouped[name] = { campaign: name, rows: [], spend: 0, impressions: 0, partner: '', brand: '', suggestedPartner: '', confidence: 'high', status: '', notes: '', objective: '', resultMetric: '', platform: '', category: '' }; grouped[name].rows.push(r); grouped[name].spend += Number(r.AmountSpentUSD) || 0; grouped[name].impressions += Number(r.Impressions) || 0; if (!grouped[name].brand && r.Brand) grouped[name].brand = r.Brand; if (!grouped[name].partner && r.Partner && r.Partner !== UNASSIGNED_PAID_LABEL) grouped[name].partner = r.Partner; if (!grouped[name].suggestedPartner && r.ParsedPartner) grouped[name].suggestedPartner = r.ParsedPartner; if (r.PartnerConfidence === 'review') grouped[name].confidence = 'review'; else if (r.PartnerConfidence === 'medium' && grouped[name].confidence !== 'review') grouped[name].confidence = 'medium'; else if (r.PartnerConfidence === 'high' && grouped[name].confidence !== 'review' && grouped[name].confidence !== 'medium') grouped[name].confidence = 'high'; if (!grouped[name].status && r.PartnerParseStatus) grouped[name].status = r.PartnerParseStatus; if (!grouped[name].notes && r.PartnerParseNotes) grouped[name].notes = r.PartnerParseNotes; if (!grouped[name].objective && r.Objective) grouped[name].objective = r.Objective; if (!grouped[name].resultMetric && r.ResultMetric) grouped[name].resultMetric = r.ResultMetric; if (!grouped[name].platform && r.Platform) grouped[name].platform = r.Platform; if (!grouped[name].category && r.CampaignCategoryCode) grouped[name].category = r.CampaignCategoryCode; }); let groups = Object.values(grouped).map(g => ({ ...g, displayPartner: g.partner || g.suggestedPartner || '', needsReview: g.confidence !== 'high' || !g.partner || g.brand === UNASSIGNED_PAID_KEY })); if (onlyReview) groups = groups.filter(g => g.needsReview); const order = { review: 0, medium: 1, high: 2 }; return groups.sort((a,b) => (order[a.confidence] - order[b.confidence]) || (b.spend - a.spend)); }
function getPaidAssignmentSummary() { const campaigns = getPaidCampaignAssignmentGroups(false); const high = campaigns.filter(g => g.confidence === 'high').length; const medium = campaigns.filter(g => g.confidence === 'medium').length; const review = campaigns.filter(g => g.confidence === 'review').length; const unassigned = campaigns.filter(g => !g.partner || g.brand === UNASSIGNED_PAID_KEY).length; return { total: campaigns.length, high, medium, review, unassigned }; }
function getPaidPartnerOptions() { const set = new Set(DataStore.getBrandList().filter(b => b && b !== UNASSIGNED_PAID_KEY)); getAllPaidRows().forEach(r => { if (r.ParsedPartner) set.add(r.ParsedPartner); if (r.Partner && r.Partner !== UNASSIGNED_PAID_LABEL) set.add(r.Partner); }); Object.values(PAID_SOCIAL_PARTNER_ALIASES).forEach(v => v && set.add(v)); Object.values(DataStore.paidAssignmentRules || {}).forEach(v => v && set.add(v)); return [...set].sort(); }
function confidenceBadge(confidence) { const cls = confidence === 'high' ? 'high' : confidence === 'medium' ? 'medium' : 'review'; const label = confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Review'; return `<span class="confidence-badge ${cls}">${label}</span>`; }
function openPaidAssignmentReview() { renderPaidAssignmentReview(); document.getElementById('paidAssignmentBackdrop').classList.add('active'); }
function closePaidAssignmentReview() { document.getElementById('paidAssignmentBackdrop').classList.remove('active'); }
function renderPaidAssignmentReview() { const content = document.getElementById('paidAssignmentContent'); if (!content) return; const summary = getPaidAssignmentSummary(); paidAssignmentReviewGroups = getPaidCampaignAssignmentGroups(true); const partnerOptions = getPaidPartnerOptions(); const rowsHtml = paidAssignmentReviewGroups.length ? `<datalist id="paidPartnerOptions">${partnerOptions.map(p => `<option value="${escapeHTML(p)}"></option>`).join('')}</datalist><div style="overflow-x:auto; max-height: 56vh; border: 1px solid var(--border-soft); border-radius: 6px;"><table class="data-table"><thead><tr><th class="text-left">Campaign</th><th class="text-left">Suggested / Current Partner</th><th>Confidence</th><th class="text-left">Objective</th><th class="num sep">Spend</th><th class="num">Impressions</th><th class="text-left">Assign To</th><th></th></tr></thead><tbody>${paidAssignmentReviewGroups.map((g, i) => `<tr><td class="text-left" style="max-width: 320px;"><span title="${escapeHTML(g.campaign)}">${escapeHTML(g.campaign)}</span><div class="comparison-basis block">${escapeHTML(g.status || g.notes || 'Needs review')}</div></td><td class="text-left">${escapeHTML(g.displayPartner || '—')}</td><td>${confidenceBadge(g.confidence)}</td><td class="text-left">${escapeHTML(g.objective || '—')}${g.resultMetric ? `<div class="comparison-basis block">${escapeHTML(g.resultMetric)}</div>` : ''}</td><td class="num sep">${formatCurrency(g.spend)}</td><td class="num">${formatNum(g.impressions)}</td><td class="text-left"><input class="assignment-input" list="paidPartnerOptions" id="paidAssignInput-${i}" value="${escapeHTML(g.displayPartner || '')}" placeholder="Choose or type partner" /></td><td class="num"><button class="btn" data-paid-assign-index="${i}" type="button">Assign</button></td></tr>`).join('')}</tbody></table></div><div class="assignment-actions" style="margin-top: 14px;"><button class="btn" id="paidAssignMediumBtn" type="button">Accept all medium suggestions</button><button class="btn btn-primary" id="paidAssignmentDoneBtn" type="button">Done</button></div>` : `<div class="section-unavailable">No paid campaign assignments need review. High-confidence structured campaigns are already assigned.</div><div class="assignment-actions" style="margin-top: 14px;"><button class="btn btn-primary" id="paidAssignmentDoneBtn" type="button">Done</button></div>`; content.innerHTML = `<div class="assignment-summary"><div class="assignment-stat"><div class="label">Campaigns</div><div class="value">${formatNum(summary.total)}</div></div><div class="assignment-stat"><div class="label">High Confidence</div><div class="value">${formatNum(summary.high)}</div></div><div class="assignment-stat"><div class="label">Medium</div><div class="value">${formatNum(summary.medium)}</div></div><div class="assignment-stat"><div class="label">Unassigned / Review</div><div class="value">${formatNum(summary.unassigned || summary.review)}</div></div></div>${rowsHtml}`; content.querySelectorAll('[data-paid-assign-index]').forEach(btn => btn.addEventListener('click', () => { const idx = Number(btn.dataset.paidAssignIndex); const input = document.getElementById(`paidAssignInput-${idx}`); assignPaidCampaignGroup(idx, input ? input.value : ''); })); const mediumBtn = document.getElementById('paidAssignMediumBtn'); if (mediumBtn) mediumBtn.addEventListener('click', acceptMediumPaidSuggestions); const doneBtn = document.getElementById('paidAssignmentDoneBtn'); if (doneBtn) doneBtn.addEventListener('click', closePaidAssignmentReview); }
function addPaidAssignmentRuleFromCampaign(campaignName, partner) { if (!campaignName || !partner) return; const parsed = parsePaidCampaignName(campaignName, ''); if (parsed.partnerRaw) DataStore.paidAssignmentRules[parsed.partnerRaw] = partner; const freeformTokens = String(campaignName).split(/[_\s-]+/).filter(Boolean); partner.split(/\s+/).forEach(part => { const match = freeformTokens.find(t => compactToken(t) === compactToken(part)); if (match && match.length > 2) DataStore.paidAssignmentRules[match] = partner; }); }
function assignPaidCampaignGroup(idx, partnerValue) { const group = paidAssignmentReviewGroups[idx]; const partner = normalizePartnerName(partnerValue); if (!group || !partner) { showErrorToast('Choose or type a partner name before assigning.'); return; } group.rows.forEach(r => { r.Brand = partner; r.Partner = partner; r.ParsedPartner = partner; r.PartnerConfidence = 'high'; r.PartnerParseStatus = 'Manually assigned'; r.PartnerParseNotes = `Manually assigned to ${partner}.`; }); addPaidAssignmentRuleFromCampaign(group.campaign, partner); regroupPaidRowsByBrand(); renderPaidAssignmentReview(); renderApp(); updateBrandDropdown(document.getElementById('brandSearch').value); }
function acceptMediumPaidSuggestions() { let count = 0; paidAssignmentReviewGroups.forEach(group => { if (group.confidence === 'medium' && group.displayPartner) { const partner = normalizePartnerName(group.displayPartner); group.rows.forEach(r => { r.Brand = partner; r.Partner = partner; r.ParsedPartner = partner; r.PartnerConfidence = 'high'; r.PartnerParseStatus = 'Accepted medium suggestion'; r.PartnerParseNotes = `Accepted suggested partner ${partner}.`; }); addPaidAssignmentRuleFromCampaign(group.campaign, partner); count += 1; } }); if (!count) showErrorToast('No medium-confidence suggestions are available to accept.'); regroupPaidRowsByBrand(); renderPaidAssignmentReview(); renderApp(); updateBrandDropdown(document.getElementById('brandSearch').value); }


// ============================================================
// BRAND ALIAS / MERGE MANAGER
// ============================================================
function getBrandAliasOptions() {
  const set = new Set(DataStore.getBrandList().filter(Boolean));
  Object.values(DataStore.brandMergeRules || {}).forEach(v => v && set.add(v));
  Object.values(PAID_SOCIAL_PARTNER_ALIASES || {}).forEach(v => v && set.add(resolveCanonicalBrandName(v)));
  return [...set].sort();
}

function getBrandAliasRows() {
  const rows = Object.entries(DataStore.brandMergeRules || {}).map(([alias, canonical]) => ({ alias, canonical: resolveCanonicalBrandName(canonical), isDefault: BRAND_ALIAS_DEFAULTS[alias] !== undefined }));
  return rows.sort((a,b) => a.canonical.localeCompare(b.canonical) || a.alias.localeCompare(b.alias));
}

function openBrandAliasManager() {
  renderBrandAliasManager();
  document.getElementById('brandAliasBackdrop').classList.add('active');
}
function closeBrandAliasManager() { document.getElementById('brandAliasBackdrop').classList.remove('active'); }

function renderBrandAliasManager() {
  const content = document.getElementById('brandAliasContent');
  if (!content) return;

  const options  = getBrandAliasOptions();
  const rows     = getBrandAliasRows();
  const renames  = DataStore.brandNameChanges instanceof Set ? DataStore.brandNameChanges : new Set();
  const detected = Object.entries(DataStore.autoDetectedAliases || {}).sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  const blocks   = [...(DataStore.autoAliasBlocks instanceof Set ? DataStore.autoAliasBlocks : [])].sort();

  // Classify auto-detected entries: same compact token = case variant, otherwise word-prefix
  const isCase = (variant, canonical) => compactBrandToken(variant) === compactBrandToken(canonical);

  // ── Manual alias table ─────────────────────────────────────────────────────
  const manualTable = rows.length
    ? `<div style="overflow-x:auto;max-height:32vh;border:1px solid var(--border-soft);border-radius:6px;">
        <table class="data-table"><thead><tr>
          <th class="text-left">Source name / alias</th>
          <th class="text-left sep">Rolls up to</th>
          <th>Type</th><th></th>
        </tr></thead><tbody>
        ${rows.map(r => {
          const isRename  = renames.has(r.alias);
          const badge = r.isDefault
            ? '<span class="confidence-badge medium">Default</span>'
            : isRename
              ? '<span class="confidence-badge high" style="background:var(--brand-red);color:#fff;">Rename</span>'
              : '<span class="confidence-badge high">Alias</span>';
          return `<tr>
            <td class="text-left">${escapeHTML(r.alias)}</td>
            <td class="text-left sep">${escapeHTML(r.canonical)}</td>
            <td>${badge}</td>
            <td class="num">${r.isDefault ? '' : `<button class="btn" type="button" data-remove-brand-alias="${escapeHTML(r.alias)}">Remove</button>`}</td>
          </tr>`;
        }).join('')}
        </tbody></table></div>`
    : `<div class="section-unavailable">No manual alias rules yet.</div>`;

  // ── Auto-detected table ────────────────────────────────────────────────────
  const autoTable = detected.length
    ? `<div style="overflow-x:auto;max-height:28vh;border:1px solid var(--border-soft);border-radius:6px;">
        <table class="data-table"><thead><tr>
          <th class="text-left">Detected variant</th>
          <th class="text-left sep">Groups with</th>
          <th>Type</th>
          <th></th>
        </tr></thead><tbody>
        ${detected.map(([variant, canonical]) => `<tr>
          <td class="text-left">${escapeHTML(variant)}</td>
          <td class="text-left sep">${escapeHTML(canonical)}</td>
          <td><span class="confidence-badge medium">${isCase(variant, canonical) ? 'Case variant' : 'Word prefix'}</span></td>
          <td class="num"><button class="btn" type="button" data-keep-separate="${escapeHTML(variant)}">Keep separate</button></td>
        </tr>`).join('')}
        </tbody></table></div>`
    : `<div class="section-unavailable" style="margin:0;">No additional groupings detected.</div>`;

  // ── Blocked groupings table ────────────────────────────────────────────────
  const blockedSection = blocks.length ? `
    <div style="margin-top:18px;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Blocked auto-groupings</div>
      <div class="leaderboard-note" style="margin-bottom:10px;">These names were excluded from auto-detection. Click Re-enable to let the system group them again on next Apply.</div>
      <div style="overflow-x:auto;border:1px solid var(--border-soft);border-radius:6px;">
        <table class="data-table"><thead><tr>
          <th class="text-left">Kept separate</th><th></th>
        </tr></thead><tbody>
        ${blocks.map(v => `<tr>
          <td class="text-left">${escapeHTML(v)}</td>
          <td class="num"><button class="btn" type="button" data-reenable-alias="${escapeHTML(v)}">Re-enable</button></td>
        </tr>`).join('')}
        </tbody></table></div>
    </div>` : '';

  content.innerHTML = `
    <datalist id="brandCanonicalOptions">${options.map(p => `<option value="${escapeHTML(p)}"></option>`).join('')}</datalist>

    <div class="assignment-summary">
      <div class="assignment-stat"><div class="label">Canonical Partners</div><div class="value">${formatNum(DataStore.getBrandList().length)}</div></div>
      <div class="assignment-stat"><div class="label">Manual Rules</div><div class="value">${formatNum(rows.length)}</div></div>
      <div class="assignment-stat"><div class="label">Auto-detected</div><div class="value">${formatNum(detected.length)}</div></div>
    </div>

    <div class="leaderboard-note">Auto-grouping handles two cases automatically: <strong>Case variants</strong> (COLUMBIA BANK ↔ Columbia Bank) and <strong>Word-prefix matches</strong> (Hempler's Food Group → Hempler's). Use <strong>manual aliases</strong> for abbreviations or different names (Comcast → Xfinity). Use <strong>name changes</strong> for partners that rebranded (Umpqua Bank → Columbia Bank).</div>

    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-top:16px;margin-bottom:8px;">Add alias</div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:6px;">
      <label style="display:flex;flex-direction:column;gap:6px;color:var(--text-dim);font-size:12px;">Source name / alias
        <input class="assignment-input" id="brandAliasInput" placeholder="Daimler Trucks North America" /></label>
      <label style="display:flex;flex-direction:column;gap:6px;color:var(--text-dim);font-size:12px;">Canonical partner
        <input class="assignment-input" id="brandCanonicalInput" list="brandCanonicalOptions" placeholder="Daimler" /></label>
      <button class="btn btn-primary" id="addBrandAliasBtn" type="button">Add alias</button>
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-top:18px;margin-bottom:8px;">Add name change <span style="font-style:normal;text-transform:none;letter-spacing:0;font-size:10px;color:var(--text-muted);">— formerly known as</span></div>
    <div class="leaderboard-note" style="margin-bottom:10px;">Use this when a partner rebranded. Historical data under the old name will roll up to the current partner page.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:16px;">
      <label style="display:flex;flex-direction:column;gap:6px;color:var(--text-dim);font-size:12px;">Former name
        <input class="assignment-input" id="brandFormerInput" placeholder="Umpqua Bank" /></label>
      <label style="display:flex;flex-direction:column;gap:6px;color:var(--text-dim);font-size:12px;">Current name
        <input class="assignment-input" id="brandCurrentInput" list="brandCanonicalOptions" placeholder="Columbia Bank" /></label>
      <button class="btn btn-primary" id="addBrandRenameBtn" type="button">Add rename</button>
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Manual aliases &amp; renames</div>
    ${manualTable}

    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-top:18px;margin-bottom:8px;">Auto-detected groupings</div>
    <div class="leaderboard-note" style="margin-bottom:10px;">Detected automatically from case variants and shared name prefixes. Applied on top of manual rules and saved with the export.</div>
    ${autoTable}
    ${blockedSection}

    <div class="assignment-actions" style="margin-top:14px;">
      <button class="btn" id="applyBrandAliasesBtn" type="button">Apply aliases now</button>
      <button class="btn btn-primary" id="brandAliasDoneBtn" type="button">Done</button>
    </div>`;

  document.getElementById('addBrandAliasBtn')?.addEventListener('click', addBrandAliasFromInputs);
  document.getElementById('addBrandRenameBtn')?.addEventListener('click', addBrandRenameFromInputs);
  document.getElementById('applyBrandAliasesBtn')?.addEventListener('click', () => {
    canonicalizeAllBrandData();
    renderBrandAliasManager();
    renderApp();
    updateBrandDropdown(document.getElementById('brandSearch').value);
  });
  document.getElementById('brandAliasDoneBtn')?.addEventListener('click', closeBrandAliasManager);
  content.querySelectorAll('[data-remove-brand-alias]').forEach(btn =>
    btn.addEventListener('click', () => removeBrandAlias(btn.dataset.removeBrandAlias)));
  content.querySelectorAll('[data-keep-separate]').forEach(btn =>
    btn.addEventListener('click', () => keepAutoAliasSeparate(btn.dataset.keepSeparate)));
  content.querySelectorAll('[data-reenable-alias]').forEach(btn =>
    btn.addEventListener('click', () => reEnableAutoAlias(btn.dataset.reenableAlias)));
}

function addBrandAliasFromInputs() {
  const aliasInput = document.getElementById('brandAliasInput');
  const canonicalInput = document.getElementById('brandCanonicalInput');
  const alias = String(aliasInput ? aliasInput.value : '').trim();
  const canonicalRaw = String(canonicalInput ? canonicalInput.value : '').trim();
  if (!alias || !canonicalRaw) { showErrorToast('Enter both the source name and the canonical partner name.'); return; }
  const canonical = resolveCanonicalBrandName(canonicalRaw);
  if (alias === canonical) { showErrorToast('The alias and canonical partner are exactly the same.'); return; }
  DataStore.brandMergeRules[alias] = canonical;
  canonicalizeAllBrandData();
  renderBrandAliasManager();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

function addBrandRenameFromInputs() {
  const formerInput  = document.getElementById('brandFormerInput');
  const currentInput = document.getElementById('brandCurrentInput');
  const former  = String(formerInput  ? formerInput.value  : '').trim();
  const currentRaw = String(currentInput ? currentInput.value : '').trim();
  if (!former || !currentRaw) { showErrorToast('Enter both the former name and the current partner name.'); return; }
  const current = resolveCanonicalBrandName(currentRaw);
  if (former === current) { showErrorToast('The former name and current name are exactly the same.'); return; }
  DataStore.brandMergeRules[former] = current;
  if (!(DataStore.brandNameChanges instanceof Set)) DataStore.brandNameChanges = new Set();
  DataStore.brandNameChanges.add(former);
  if (formerInput)  formerInput.value  = '';
  if (currentInput) currentInput.value = '';
  canonicalizeAllBrandData();
  renderBrandAliasManager();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

function removeBrandAlias(alias) {
  if (!alias || BRAND_ALIAS_DEFAULTS[alias] !== undefined) return;
  delete DataStore.brandMergeRules[alias];
  if (DataStore.brandNameChanges instanceof Set) DataStore.brandNameChanges.delete(alias);
  canonicalizeAllBrandData();
  renderBrandAliasManager();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

function keepAutoAliasSeparate(variantName) {
  if (!variantName) return;
  if (!(DataStore.autoAliasBlocks instanceof Set)) DataStore.autoAliasBlocks = new Set(DataStore.autoAliasBlocks || []);
  DataStore.autoAliasBlocks.add(variantName);
  delete (DataStore.autoDetectedAliases || {})[variantName];
  canonicalizeAllBrandData();
  renderBrandAliasManager();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

function reEnableAutoAlias(variantName) {
  if (!variantName) return;
  if (DataStore.autoAliasBlocks instanceof Set) DataStore.autoAliasBlocks.delete(variantName);
  canonicalizeAllBrandData();
  renderBrandAliasManager();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}
