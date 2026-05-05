// ============================================================
// WEB & DIGITAL — Blazers.com Display, RoseQuarter.com Display, Pre-Roll Video
// ============================================================
// Three source file types:
//   blazersWebDisplay  — Delivery_Report_Blazers_*.xlsx
//   rqWebDisplay       — Delivery_Report_RoseQuarter_*.xlsx
//   webPreRoll         — *Pre-Roll*.xlsx or *Pre_Roll*.xlsx
//
// DataStore keys: webBlazersBanners[], webRQBanners[], webPreRoll[]
// Channel key:    'webDisplay'
// Slot:           #web-digital-slot
// Date range:     Jul 1, 2025 – May 5, 2026 (fiscal year)
// ============================================================

// -- Numeric / percent parsers --
function parseWebNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const raw = String(v).trim();
  if (!raw || raw === '—' || raw === '-') return null;
  // Supports plain numbers (1,234), currency-style wrappers, and compact export
  // values such as 1.29M / 456.1K that sometimes appear in ad-server CSVs.
  const cleaned = raw.replace(/[,$\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/i);
  if (!match) {
    const fallback = parseFloat(cleaned.replace(/[^0-9.\-]/g, ''));
    return isNaN(fallback) ? null : fallback;
  }
  const base = parseFloat(match[1]);
  if (isNaN(base)) return null;
  const suffix = (match[2] || '').toLowerCase();
  const mult = suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : 1;
  return base * mult;
}

function parseWebPct(v) {
  if (v === null || v === undefined || v === '') return null;
  const raw = String(v).trim();
  const hasPct = raw.includes('%');
  const n = parseFloat(raw.replace('%', '').trim());
  if (isNaN(n)) return null;
  // Percent-formatted exports like 1.00% should become 0.01. Decimal
  // fractions like 0.01 stay as-is; whole-number percents like 1 become 0.01.
  return (hasPct || n > 1) ? n / 100 : n;
}

// Normalize report headers so the importer survives small export-label changes
// like "Total Impressions" vs "Total impressions" or extra punctuation.
function _webNormalizeHeader(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function _webFindKeyFromHeaderValues(headerRow, candidates) {
  const wanted = candidates.map(_webNormalizeHeader);
  for (const [key, value] of Object.entries(headerRow || {})) {
    if (wanted.includes(_webNormalizeHeader(value))) return key;
  }
  return null;
}

function _webFindKeyFromKeys(keys, candidates) {
  const wanted = candidates.map(_webNormalizeHeader);
  return (keys || []).find(k => wanted.includes(_webNormalizeHeader(k))) || null;
}

function _webHasAnyHeaderKey(keys, candidates) {
  return !!_webFindKeyFromKeys(keys || [], candidates);
}


// CSV delivery reports are exported for this offline dashboard. Google/Ad Manager
// exports often put a date-range row above the real column headers, which breaks
// PapaParse's `header:true` object mapping: columns C+ land in `__parsed_extra`.
// For Web & Digital we parse CSVs as a raw matrix, find the real header row, and
// read by column index so impressions/clicks/CTR are preserved.
function parseWebCSVMatrix(text) {
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: true });
  return (parsed.data || [])
    .map(row => Array.isArray(row) ? row : Object.values(row || {}))
    .filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
}

function _webRowCell(row, index) {
  return index === null || index === undefined || index < 0 ? null : row[index];
}

function _webColumnIndex(headerRow, candidates) {
  const wanted = candidates.map(_webNormalizeHeader);
  return (headerRow || []).findIndex(cell => wanted.includes(_webNormalizeHeader(cell)));
}

function _webHeaderRowIndex(matrix, requiredColumnGroups) {
  for (let i = 0; i < Math.min(matrix.length, 12); i += 1) {
    const row = matrix[i] || [];
    const hasAll = requiredColumnGroups.every(group => _webColumnIndex(row, group) >= 0);
    if (hasAll) return i;
  }
  return -1;
}

function _webRowObjectFromMatrix(headerRow, dataRow) {
  const obj = {};
  (headerRow || []).forEach((h, idx) => {
    const key = String(h || '').trim();
    if (key) obj[key] = _webRowCell(dataRow, idx);
  });
  return obj;
}

function _webObjectRowsFromCSV(text, requiredColumnGroups) {
  const matrix = parseWebCSVMatrix(text);
  const headerIndex = _webHeaderRowIndex(matrix, requiredColumnGroups);
  if (headerIndex < 0) return [];
  const headerRow = matrix[headerIndex];
  return matrix.slice(headerIndex + 1).map(row => _webRowObjectFromMatrix(headerRow, row));
}

// -- Partner / ad-type helpers --

// Extract partner info from Blazers Order column string.
// "Fred Meyer 2025-2026 > Trailblazers" → { base:"Fred Meyer", brand:"Fred Meyer", season:"2025-2026" }
function extractBlazersOrderPartner(orderStr) {
  const str = String(orderStr || '').trim();
  // Support both "Partner > Trailblazers" and "Partner>Trailblazers".
  const beforeArrow = (str.split(/\s*>\s*/)[0] || str).trim();
  // Strip trailing season pattern like "2025-26", "2025 - 26", "2025–2026".
  const seasonMatch = beforeArrow.match(/\s+(20\d{2})\s*[-–]\s*(\d{2,4})\s*$/);
  const season = seasonMatch ? `${seasonMatch[1]}-${seasonMatch[2]}` : null;
  const base = beforeArrow.replace(/\s+20\d{2}\s*[-–]\s*\d{2,4}\s*$/, '').trim() || beforeArrow;
  const brand = resolveCanonicalBrandName(base) || base;
  return { raw: beforeArrow, base, brand, season };
}

// Classify a line item as 'banner' or 'pushdown'.
// "Pencil" and "Pushdown" both count as pushdown (premium homepage placement).
function getWebAdType(lineItemStr) {
  const s = String(lineItemStr || '').toLowerCase();
  if (s.includes('pencil') || s.includes('pushdown') || s.includes('push down')) return 'pushdown';
  return 'banner';
}

// Returns true if the line item is marked DNU (do not use / deprecated).
function isWebDNU(lineItemStr) {
  return String(lineItemStr || '').toUpperCase().includes('DNU');
}

// -- Aggregation helper --
// Sums impressions and clicks from an array of banner rows; computes CTR.
function aggregateWebBannerRows(rows) {
  let impressions = null;
  let clicks = null;
  let weightedCtrNumerator = 0;
  let weightedCtrDenominator = 0;
  let simpleCtrTotal = 0;
  let simpleCtrCount = 0;

  rows.forEach(r => {
    if (r.Impressions !== null && r.Impressions !== undefined) impressions = (impressions || 0) + r.Impressions;
    if (r.Clicks !== null && r.Clicks !== undefined)           clicks      = (clicks      || 0) + r.Clicks;
    if (r.CTR !== null && r.CTR !== undefined) {
      simpleCtrTotal += r.CTR;
      simpleCtrCount += 1;
      if (r.Impressions !== null && r.Impressions !== undefined && r.Impressions > 0) {
        weightedCtrNumerator += r.CTR * r.Impressions;
        weightedCtrDenominator += r.Impressions;
      }
    }
  });

  // Prefer the true clicks/impressions calculation. If the report only exposes CTR
  // at the row level, fall back to weighted CTR by impressions, then simple average.
  let ctr = (clicks !== null && impressions !== null && impressions > 0)
    ? clicks / impressions
    : (weightedCtrDenominator > 0
      ? weightedCtrNumerator / weightedCtrDenominator
      : (simpleCtrCount ? simpleCtrTotal / simpleCtrCount : null));

  // If one count is present and CTR is present, estimate the missing companion count
  // so KPI cards do not go blank because an export omitted just one metric.
  if (clicks === null && impressions !== null && ctr !== null) clicks = Math.round(impressions * ctr);
  if (impressions === null && clicks !== null && ctr !== null && ctr > 0) impressions = Math.round(clicks / ctr);

  return { impressions, clicks, ctr, count: rows.length };
}

// ============================================================
// INGEST — called from ingestFile() in 14_organic_section.js
// ============================================================

// Blazers.com delivery report.
// The XLSX has an unusual layout: row 1 = "Date range | <date>" (skipped),
// row 2 = actual column headers ("Order | Line item | Total impressions | …"),
// rows 3+ = data.  sheet_to_json uses row 1 as header keys, so rows[0] contains
// the real header labels as VALUES.  We build a reverse colMap to find the right key.
async function ingestBlazersBannersFile(file, ext) {
  let rows = [];
  let csvMatrix = null;
  try {
    if (ext === 'csv') {
      csvMatrix = parseWebCSVMatrix(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = parseXLSX(await file.arrayBuffer());
    } else {
      return { success: false, error: 'Unsupported file type', filename: file.name };
    }
  } catch (e) {
    return { success: false, error: e.message, filename: file.name };
  }

  const results = [];

  if (ext === 'csv') {
    if (!csvMatrix || csvMatrix.length < 2) return { success: false, error: 'No data rows found', filename: file.name };

    const headerIndex = _webHeaderRowIndex(csvMatrix, [
      ['Order'],
      ['Line item', 'Lineitem'],
      ['Total impressions', 'Impressions'],
    ]);
    if (headerIndex < 0) {
      return { success: false, error: 'Could not find the Blazers.com delivery-report header row', filename: file.name };
    }

    const headerRow = csvMatrix[headerIndex];
    const orderIdx    = _webColumnIndex(headerRow, ['Order']);
    const lineItemIdx = _webColumnIndex(headerRow, ['Line item', 'Lineitem']);
    const impressIdx  = _webColumnIndex(headerRow, ['Total impressions', 'Impressions', 'Delivered impressions']);
    const clicksIdx   = _webColumnIndex(headerRow, ['Total clicks', 'Clicks', 'Delivered clicks']);
    const ctrIdx      = _webColumnIndex(headerRow, ['Total CTR', 'CTR', 'Click-through rate', 'Click through rate']);

    csvMatrix.slice(headerIndex + 1).forEach(row => {
      const orderVal = String(_webRowCell(row, orderIdx) || '').trim();
      if (!orderVal || orderVal.toLowerCase() === 'total') return;
      const lineItem = String(_webRowCell(row, lineItemIdx) || '').trim();
      if (isWebDNU(lineItem)) return;

      const { brand, raw: rawPartner, season } = extractBlazersOrderPartner(orderVal);
      results.push({
        Brand:      brand,
        _rawPartner: rawPartner,
        Season:     season,
        Order:      orderVal,
        LineItem:   lineItem,
        AdType:     getWebAdType(lineItem),
        Impressions: parseWebNum(_webRowCell(row, impressIdx)),
        Clicks:      parseWebNum(_webRowCell(row, clicksIdx)),
        CTR:         parseWebPct(_webRowCell(row, ctrIdx)),
        _source:    'blazers',
      });
      DataStore.registerBrand(brand, 'webDisplay');
    });
  } else {
    if (!rows || rows.length < 2) return { success: false, error: 'No data rows found', filename: file.name };

    // XLSX fallback for legacy/local testing. CSV is the supported offline path.
    const firstRowKeys = Object.keys(rows[0]).map(k => k.trim());
    const hasTwoHeaderRows = !_webHasAnyHeaderKey(firstRowKeys, ['Order', 'Line item', 'Total impressions']);

    let orderKey, lineItemKey, impressKey, clicksKey, ctrKey, dataRows;
    if (hasTwoHeaderRows) {
      orderKey    = _webFindKeyFromHeaderValues(rows[0], ['Order']);
      lineItemKey = _webFindKeyFromHeaderValues(rows[0], ['Line item', 'Lineitem']);
      impressKey  = _webFindKeyFromHeaderValues(rows[0], ['Total impressions', 'Impressions']);
      clicksKey   = _webFindKeyFromHeaderValues(rows[0], ['Total clicks', 'Clicks']);
      ctrKey      = _webFindKeyFromHeaderValues(rows[0], ['Total CTR', 'CTR']);
      dataRows    = rows.slice(1);
    } else {
      orderKey    = _webFindKeyFromKeys(firstRowKeys, ['Order']) || 'Order';
      lineItemKey = _webFindKeyFromKeys(firstRowKeys, ['Line item', 'Lineitem']) || 'Line item';
      impressKey  = _webFindKeyFromKeys(firstRowKeys, ['Total impressions', 'Impressions']) || 'Total impressions';
      clicksKey   = _webFindKeyFromKeys(firstRowKeys, ['Total clicks', 'Clicks']) || 'Total clicks';
      ctrKey      = _webFindKeyFromKeys(firstRowKeys, ['Total CTR', 'CTR']) || 'Total CTR';
      dataRows    = rows;
    }

    dataRows.forEach(r => {
      const orderVal = String(r[orderKey] || '').trim();
      if (!orderVal || orderVal.toLowerCase() === 'total') return;
      const lineItem = String(r[lineItemKey] || '').trim();
      if (isWebDNU(lineItem)) return;

      const { brand, raw: rawPartner, season } = extractBlazersOrderPartner(orderVal);
      results.push({
        Brand:      brand,
        _rawPartner: rawPartner,
        Season:     season,
        Order:      orderVal,
        LineItem:   lineItem,
        AdType:     getWebAdType(lineItem),
        Impressions: parseWebNum(r[impressKey]),
        Clicks:      parseWebNum(r[clicksKey]),
        CTR:         parseWebPct(r[ctrKey]),
        _source:    'blazers',
      });
      DataStore.registerBrand(brand, 'webDisplay');
    });
  }

  DataStore.webBlazersBanners = (DataStore.webBlazersBanners || []).concat(results);

  const brands = [...new Set(results.map(r => r.Brand).filter(Boolean))];
  return {
    success: true, type: 'blazersWebDisplay',
    rows: results.length, brands: brands.join(', '), filename: file.name,
  };
}

// RoseQuarter.com delivery report.
// Same layout quirk as Blazers: row 1 = "Date range | <date>", row 2 = real headers.
async function ingestRQBannersFile(file, ext) {
  let rows = [];
  let csvMatrix = null;
  try {
    if (ext === 'csv') {
      csvMatrix = parseWebCSVMatrix(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = parseXLSX(await file.arrayBuffer());
    } else {
      return { success: false, error: 'Unsupported file type', filename: file.name };
    }
  } catch (e) {
    return { success: false, error: e.message, filename: file.name };
  }

  const results = [];

  if (ext === 'csv') {
    if (!csvMatrix || csvMatrix.length < 2) return { success: false, error: 'No data rows found', filename: file.name };

    const headerIndex = _webHeaderRowIndex(csvMatrix, [
      ['Advertiser'],
      ['Ad server impressions', 'Impressions'],
    ]);
    if (headerIndex < 0) {
      return { success: false, error: 'Could not find the RoseQuarter.com delivery-report header row', filename: file.name };
    }

    const headerRow = csvMatrix[headerIndex];
    const advertiserIdx = _webColumnIndex(headerRow, ['Advertiser', 'Advertiser name']);
    const impressIdx    = _webColumnIndex(headerRow, ['Ad server impressions', 'Impressions', 'Total impressions', 'Delivered impressions']);
    const clicksIdx     = _webColumnIndex(headerRow, ['Ad server clicks', 'Clicks', 'Total clicks', 'Delivered clicks']);
    const ctrIdx        = _webColumnIndex(headerRow, ['Ad server CTR', 'CTR', 'Total CTR', 'Click-through rate', 'Click through rate']);

    csvMatrix.slice(headerIndex + 1).forEach(row => {
      const advertiser = String(_webRowCell(row, advertiserIdx) || '').trim();
      if (!advertiser || advertiser.toLowerCase() === 'total') return;
      const brand = resolveCanonicalBrandName(advertiser) || advertiser;
      results.push({
        Brand:       brand,
        _rawAdvertiser: advertiser,
        Impressions: parseWebNum(_webRowCell(row, impressIdx)),
        Clicks:      parseWebNum(_webRowCell(row, clicksIdx)),
        CTR:         parseWebPct(_webRowCell(row, ctrIdx)),
        _source:     'rosequarter',
      });
      DataStore.registerBrand(brand, 'webDisplay');
    });
  } else {
    if (!rows || rows.length < 2) return { success: false, error: 'No data rows found', filename: file.name };

    const firstRowKeysRQ = Object.keys(rows[0]).map(k => k.trim());
    const hasTwoHeaderRowsRQ = !_webHasAnyHeaderKey(firstRowKeysRQ, ['Advertiser', 'Ad server impressions']);

    let advertiserKey, impressKeyRQ, clicksKeyRQ, ctrKeyRQ, dataRowsRQ;
    if (hasTwoHeaderRowsRQ) {
      advertiserKey = _webFindKeyFromHeaderValues(rows[0], ['Advertiser']);
      impressKeyRQ  = _webFindKeyFromHeaderValues(rows[0], ['Ad server impressions', 'Impressions']);
      clicksKeyRQ   = _webFindKeyFromHeaderValues(rows[0], ['Ad server clicks', 'Clicks']);
      ctrKeyRQ      = _webFindKeyFromHeaderValues(rows[0], ['Ad server CTR', 'CTR']);
      dataRowsRQ    = rows.slice(1);
    } else {
      advertiserKey = _webFindKeyFromKeys(firstRowKeysRQ, ['Advertiser']) || 'Advertiser';
      impressKeyRQ  = _webFindKeyFromKeys(firstRowKeysRQ, ['Ad server impressions', 'Impressions']) || 'Ad server impressions';
      clicksKeyRQ   = _webFindKeyFromKeys(firstRowKeysRQ, ['Ad server clicks', 'Clicks']) || 'Ad server clicks';
      ctrKeyRQ      = _webFindKeyFromKeys(firstRowKeysRQ, ['Ad server CTR', 'CTR']) || 'Ad server CTR';
      dataRowsRQ    = rows;
    }

    dataRowsRQ.forEach(r => {
      const advertiser = String(r[advertiserKey] || '').trim();
      if (!advertiser || advertiser.toLowerCase() === 'total') return;
      const brand = resolveCanonicalBrandName(advertiser) || advertiser;
      results.push({
        Brand:       brand,
        _rawAdvertiser: advertiser,
        Impressions: parseWebNum(r[impressKeyRQ]),
        Clicks:      parseWebNum(r[clicksKeyRQ]),
        CTR:         parseWebPct(r[ctrKeyRQ]),
        _source:     'rosequarter',
      });
      DataStore.registerBrand(brand, 'webDisplay');
    });
  }

  DataStore.webRQBanners = (DataStore.webRQBanners || []).concat(results);

  const brands = [...new Set(results.map(r => r.Brand).filter(Boolean))];
  return {
    success: true, type: 'rqWebDisplay',
    rows: results.length, brands: brands.join(', '), filename: file.name,
  };
}

// Pre-Roll report.
// This file has a proper header row (row 1 = column names), so sheet_to_json works normally.
// Partner extracted from "Campaign Name": "Axiom > Portland Trail Blazers" → "Axiom".
async function ingestPreRollFile(file, ext) {
  let rows = [];
  try {
    if (ext === 'csv')                   rows = parseCSV(await file.text());
    else if (ext === 'xlsx' || ext === 'xls') rows = parseXLSX(await file.arrayBuffer());
    else return { success: false, error: 'Unsupported file type', filename: file.name };
  } catch (e) {
    return { success: false, error: e.message, filename: file.name };
  }

  if (!rows || !rows.length) return { success: false, error: 'No data rows found', filename: file.name };

  const results = [];
  rows.forEach(r => {
    const campaignName = String(r['Campaign Name'] || '').trim();
    if (!campaignName) return;

    const partnerRaw = campaignName.split(/ > /)[0].trim();
    const brand = resolveCanonicalBrandName(partnerRaw) || partnerRaw;

    // Parse event date — may come in as a JS Date object (from XLSX) or string
    let eventDate = null;
    const rawDate = r['Event Date'];
    if (rawDate) {
      const d = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
      if (!isNaN(d.getTime())) eventDate = d;
    }

    const plays    = parseWebNum(r['Gross Counted Ads']);
    const clicks   = parseWebNum(r['Delivered Clicks']);
    const duration = parseWebNum(r['Creative Duration']);

    results.push({
      Brand:          brand,
      _rawPartner:    partnerRaw,
      CampaignName:   campaignName,
      InsertionOrder: String(r['Insertion Order Name'] || '').trim(),
      EventDate:      eventDate,
      _eventMonth:    eventDate
        ? `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`
        : '',
      CreativeDuration: duration,
      Plays:          plays,
      Clicks:         clicks,
      _source:        'preroll',
    });
    DataStore.registerBrand(brand, 'webDisplay');
  });

  DataStore.webPreRoll = (DataStore.webPreRoll || []).concat(results);

  const brands = [...new Set(results.map(r => r.Brand).filter(Boolean))];
  return {
    success: true, type: 'webPreRoll',
    rows: results.length, brands: brands.join(', '), filename: file.name,
  };
}

// ============================================================
// DATA ACCESS
// ============================================================

const WEB_TBI_BRAND = 'TBI';

function hasWebDisplayDataForBrand(brand) {
  if (!brand) return false;
  return (
    (DataStore.webBlazersBanners || []).some(r => r.Brand === brand) ||
    (DataStore.webRQBanners       || []).some(r => r.Brand === brand) ||
    (DataStore.webPreRoll         || []).some(r => r.Brand === brand)
  );
}

function getBlazersBannersForBrand(brand) {
  return (DataStore.webBlazersBanners || []).filter(r => r.Brand === brand);
}

function getRQBannersForBrand(brand) {
  return (DataStore.webRQBanners || []).filter(r => r.Brand === brand);
}

function getPreRollForBrand(brand) {
  return (DataStore.webPreRoll || []).filter(r => r.Brand === brand);
}

function getTBIBlazersBanners() {
  return (DataStore.webBlazersBanners || []).filter(r => r.Brand === WEB_TBI_BRAND);
}

function getTBIRQBanner() {
  const rows = (DataStore.webRQBanners || []).filter(r => r.Brand === WEB_TBI_BRAND);
  return rows.length ? aggregateWebBannerRows(rows) : null;
}

// ============================================================
// RENDER HELPERS
// ============================================================

// Shared KPI cell used in comparison and summary tables.
function _webKpiCell(label, val) {
  return `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-value">${val}</span></div>`;
}

// Format impressions, showing "—" when null but "(data pending)" tooltip hint.
function _fmtWebImpr(n) {
  return n !== null ? formatNum(n) : '<span title="Metrics available once the live file is loaded">—</span>';
}

function _fmtWebCTR(n) {
  return n !== null ? formatPct(n, 2) : '<span title="Metrics available once the live file is loaded">—</span>';
}

// "X% of TBI" badge — only shown when both values are numeric.
function _vsRatioLabel(partnerVal, tbiVal) {
  if (partnerVal === null || tbiVal === null || tbiVal === 0) return '';
  const pct = ((partnerVal / tbiVal) * 100).toFixed(1);
  return `<span class="comparison-basis block" style="font-size:10px;margin-top:2px;">${pct}% of TBI volume</span>`;
}

// Month label from "2025-11" → "Nov '25"
function _monthLabel(key) {
  const [yr, mo] = key.split('-');
  const name = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo) - 1] || mo;
  return `${name} '${String(yr).slice(2)}`;
}

// ============================================================
// SUB-SECTION: Blazers.com
// ============================================================

function renderBlazersBannersSubsection(brand, rows) {
  const bannerRows   = rows.filter(r => r.AdType === 'banner');
  const pushdownRows = rows.filter(r => r.AdType === 'pushdown');

  const partnerBanner   = aggregateWebBannerRows(bannerRows);
  const partnerPushdown = aggregateWebBannerRows(pushdownRows);
  const partnerTotal    = aggregateWebBannerRows(rows);

  const tbiRows     = getTBIBlazersBanners();
  const tbiBanner   = aggregateWebBannerRows(tbiRows.filter(r => r.AdType === 'banner'));
  const tbiPushdown = aggregateWebBannerRows(tbiRows.filter(r => r.AdType === 'pushdown'));
  const tbiTotal    = aggregateWebBannerRows(tbiRows);

  const hasTBI        = tbiRows.length > 0;
  const hasPushdowns  = pushdownRows.length > 0 || (hasTBI && tbiRows.some(r => r.AdType === 'pushdown'));

  // ── KPI strip ──────────────────────────────────────────────
  const kpiHTML = `
    <div class="kpi-grid" style="margin-bottom:18px;">
      <div class="kpi">
        <span class="kpi-label">Total impressions</span>
        <span class="kpi-value">${_fmtWebImpr(partnerTotal.impressions)}</span>
        <span class="kpi-change neutral">${partnerTotal.count} line item${partnerTotal.count === 1 ? '' : 's'}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Total clicks</span>
        <span class="kpi-value">${_fmtWebImpr(partnerTotal.clicks)}</span>
        <span class="kpi-change neutral">Blazers.com</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Click-through rate</span>
        <span class="kpi-value">${_fmtWebCTR(partnerTotal.ctr)}</span>
        <span class="kpi-change neutral">Clicks ÷ impressions</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">ROS banners</span>
        <span class="kpi-value">${partnerBanner.count}</span>
        <span class="kpi-change neutral">${_fmtWebImpr(partnerBanner.impressions)} impr</span>
      </div>
      ${hasPushdowns ? `
      <div class="kpi">
        <span class="kpi-label">Pushdowns / pencils</span>
        <span class="kpi-value">${partnerPushdown.count}</span>
        <span class="kpi-change neutral">${_fmtWebImpr(partnerPushdown.impressions)} impr</span>
      </div>` : ''}
    </div>
  `;

  // ── TBI comparison table ────────────────────────────────────
  const comparisonHTML = hasTBI ? (() => {
    // Show Banners column always; Pushdowns column only if either side has any.
    const colPush = hasPushdowns;
    return `
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <span class="card-title">Performance vs TBI baseline</span>
        <span class="card-sub">TBI = Trail Blazers Inc own-site campaigns · same Jul 1 – May 5 window</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-left">Campaign owner</th>
              <th class="num">Banner impressions</th>
              <th class="num">Banner clicks</th>
              <th class="num">Banner CTR</th>
              ${colPush ? `
              <th class="num sep">Pushdown impressions</th>
              <th class="num">Pushdown clicks</th>
              <th class="num">Pushdown CTR</th>` : ''}
              <th class="num sep">Total impressions</th>
              <th class="num">Placements</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight:600;background:var(--bg-card);">
              <td class="col-left">${escapeHTML(brand)}</td>
              <td class="num">${_fmtWebImpr(partnerBanner.impressions)}</td>
              <td class="num">${_fmtWebImpr(partnerBanner.clicks)}</td>
              <td class="num">${_fmtWebCTR(partnerBanner.ctr)}</td>
              ${colPush ? `
              <td class="num sep">${_fmtWebImpr(partnerPushdown.impressions)}</td>
              <td class="num">${_fmtWebImpr(partnerPushdown.clicks)}</td>
              <td class="num">${_fmtWebCTR(partnerPushdown.ctr)}</td>` : ''}
              <td class="num sep">${_fmtWebImpr(partnerTotal.impressions)}${_vsRatioLabel(partnerTotal.impressions, tbiTotal.impressions)}</td>
              <td class="num">${partnerTotal.count}</td>
            </tr>
            <tr style="color:var(--text-muted);">
              <td class="col-left">TBI (benchmark)</td>
              <td class="num">${_fmtWebImpr(tbiBanner.impressions)}</td>
              <td class="num">${_fmtWebImpr(tbiBanner.clicks)}</td>
              <td class="num">${_fmtWebCTR(tbiBanner.ctr)}</td>
              ${colPush ? `
              <td class="num sep">${_fmtWebImpr(tbiPushdown.impressions)}</td>
              <td class="num">${_fmtWebImpr(tbiPushdown.clicks)}</td>
              <td class="num">${_fmtWebCTR(tbiPushdown.ctr)}</td>` : ''}
              <td class="num sep">${_fmtWebImpr(tbiTotal.impressions)}</td>
              <td class="num">${tbiTotal.count}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  })() : '';

  // ── Line-item detail table ─────────────────────────────────
  const sortedRows = [...rows].sort((a, b) => {
    // Pushdowns first, then by impressions desc (nulls last)
    if (a.AdType !== b.AdType) return a.AdType === 'pushdown' ? -1 : 1;
    const ai = a.Impressions || -1, bi = b.Impressions || -1;
    return bi - ai;
  });

  const detailRows = sortedRows.map(r => `
    <tr>
      <td class="col-left" style="max-width:340px;" title="${escapeHTML(r.LineItem)}">
        ${escapeHTML(r.LineItem)}
      </td>
      <td class="num">
        <span class="comparison-basis block" style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;
          background:${r.AdType === 'pushdown' ? 'var(--brand-red)' : 'var(--accent)'};
          color:#fff;font-weight:600;letter-spacing:.04em;">
          ${r.AdType === 'pushdown' ? 'PUSHDOWN' : 'BANNER'}
        </span>
      </td>
      <td class="num">${_fmtWebImpr(r.Impressions)}</td>
      <td class="num">${_fmtWebImpr(r.Clicks)}</td>
      <td class="num">${_fmtWebCTR(r.CTR)}</td>
    </tr>
  `).join('');

  const detailTable = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Campaign line items</span>
        <span class="card-sub">${rows.length} placements · DNU items excluded</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-left">Line item</th>
              <th class="num">Ad type</th>
              <th class="num">Impressions</th>
              <th class="num">Clicks</th>
              <th class="num">CTR</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
        color:var(--text-muted);padding:10px 0 8px;border-bottom:1px solid var(--border-soft);margin-bottom:16px;">
        Blazers.com · ROS Banners &amp; Pushdowns
      </div>
      ${kpiHTML}
      ${comparisonHTML}
      ${detailTable}
    </div>
  `;
}

// ============================================================
// SUB-SECTION: RoseQuarter.com
// ============================================================

function renderRQBannersSubsection(brand, rows) {
  // RoseQuarter data is usually advertiser-level, but aggregate defensively
  // in case a report splits one advertiser across multiple rows.
  const partnerAgg = aggregateWebBannerRows(rows);
  const tbiAgg     = getTBIRQBanner();
  const hasTBI     = !!tbiAgg;

  const kpiHTML = `
    <div class="kpi-grid" style="margin-bottom:18px;">
      <div class="kpi">
        <span class="kpi-label">Ad server impressions</span>
        <span class="kpi-value">${_fmtWebImpr(partnerAgg.impressions)}</span>
        <span class="kpi-change neutral">RoseQuarter.com</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Ad server clicks</span>
        <span class="kpi-value">${_fmtWebImpr(partnerAgg.clicks)}</span>
        <span class="kpi-change neutral">RoseQuarter.com</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Click-through rate</span>
        <span class="kpi-value">${_fmtWebCTR(partnerAgg.ctr)}</span>
        <span class="kpi-change neutral">Clicks ÷ impressions</span>
      </div>
    </div>
  `;

  const comparisonHTML = hasTBI ? `
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <span class="card-title">Performance vs TBI baseline</span>
        <span class="card-sub">TBI = Trail Blazers Inc own-site campaigns · same fiscal-year window</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-left">Campaign owner</th>
              <th class="num">Impressions</th>
              <th class="num">Clicks</th>
              <th class="num">CTR</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight:600;background:var(--bg-card);">
              <td class="col-left">${escapeHTML(brand)}</td>
              <td class="num">${_fmtWebImpr(partnerAgg.impressions)}${_vsRatioLabel(partnerAgg.impressions, tbiAgg.impressions)}</td>
              <td class="num">${_fmtWebImpr(partnerAgg.clicks)}</td>
              <td class="num">${_fmtWebCTR(partnerAgg.ctr)}</td>
            </tr>
            <tr style="color:var(--text-muted);">
              <td class="col-left">TBI (benchmark)</td>
              <td class="num">${_fmtWebImpr(tbiAgg.impressions)}</td>
              <td class="num">${_fmtWebImpr(tbiAgg.clicks)}</td>
              <td class="num">${_fmtWebCTR(tbiAgg.ctr)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
        color:var(--text-muted);padding:10px 0 8px;border-bottom:1px solid var(--border-soft);margin-bottom:16px;">
        RoseQuarter.com · Display Banners
      </div>
      ${kpiHTML}
      ${comparisonHTML}
    </div>
  `;
}

// ============================================================
// SUB-SECTION: Pre-Roll Video
// ============================================================

function renderPreRollMonthlyChart(rows) {
  // Group plays by calendar month
  const byMonth = {};
  rows.forEach(r => {
    if (!r._eventMonth) return;
    if (!byMonth[r._eventMonth]) byMonth[r._eventMonth] = { plays: 0, clicks: 0 };
    byMonth[r._eventMonth].plays  += (r.Plays  || 0);
    byMonth[r._eventMonth].clicks += (r.Clicks || 0);
  });

  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return ''; // single-month not worth charting

  const maxPlays = Math.max(...months.map(m => byMonth[m].plays), 1);
  const W = 560, H = 150;
  const padL = 44, padR = 16, padT = 18, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barSlot = chartW / months.length;
  const barW    = Math.max(6, Math.floor(barSlot * 0.55));

  const bars = months.map((m, i) => {
    const plays = byMonth[m].plays;
    const bh  = Math.max(2, (plays / maxPlays) * chartH);
    const bx  = padL + i * barSlot + (barSlot - barW) / 2;
    const by  = padT + chartH - bh;
    const lbl = _monthLabel(m);
    return `
      <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}"
            width="${barW}" height="${bh.toFixed(1)}"
            rx="2" fill="var(--brand-red)" opacity="0.85">
        <title>${lbl}: ${plays.toLocaleString()} plays</title>
      </rect>
      <text x="${(bx + barW / 2).toFixed(1)}" y="${(H - padB + 14).toFixed(1)}"
            text-anchor="middle" font-size="8.5" fill="var(--text-muted)"
            font-family="var(--font-mono)">${lbl}</text>
    `;
  }).join('');

  // Y-axis: 0, mid, max
  const yLines = [0, 0.5, 1].map(f => {
    const val = Math.round(f * maxPlays);
    const y   = (padT + chartH - f * chartH).toFixed(1);
    return `
      <text x="${padL - 5}" y="${(parseFloat(y) + 3.5).toFixed(1)}"
            text-anchor="end" font-size="8.5" fill="var(--text-muted)"
            font-family="var(--font-mono)">${formatNum(val)}</text>
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
            stroke="var(--border-soft)" stroke-width="1" stroke-dasharray="3,3"/>
    `;
  }).join('');

  return `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <span class="card-title">Monthly play volume</span>
        <span class="card-sub">Gross counted ads (pre-roll serves) by month</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block;"
           xmlns="http://www.w3.org/2000/svg">
        ${yLines}
        ${bars}
      </svg>
    </div>
  `;
}

function renderPreRollSubsection(brand, rows) {
  // Aggregate totals
  let totalPlays = null, totalClicks = null;
  rows.forEach(r => {
    if (r.Plays  !== null) totalPlays  = (totalPlays  || 0) + r.Plays;
    if (r.Clicks !== null) totalClicks = (totalClicks || 0) + r.Clicks;
  });
  const totalCTR = (totalPlays && totalClicks !== null)
    ? totalClicks / totalPlays : null;
  const creativeDuration = rows.find(r => r.CreativeDuration)?.CreativeDuration || null;

  const kpiHTML = `
    <div class="kpi-grid" style="margin-bottom:18px;">
      <div class="kpi">
        <span class="kpi-label">Total plays</span>
        <span class="kpi-value">${_fmtWebImpr(totalPlays)}</span>
        <span class="kpi-change neutral">Gross counted ads</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Total clicks</span>
        <span class="kpi-value">${_fmtWebImpr(totalClicks)}</span>
        <span class="kpi-change neutral">Delivered clicks</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Click-through rate</span>
        <span class="kpi-value">${_fmtWebCTR(totalCTR)}</span>
        <span class="kpi-change neutral">Clicks ÷ plays</span>
      </div>
      ${creativeDuration !== null ? `
      <div class="kpi">
        <span class="kpi-label">Creative duration</span>
        <span class="kpi-value">${creativeDuration}s</span>
        <span class="kpi-change neutral">Pre-roll spot length</span>
      </div>` : ''}
    </div>
  `;

  const chartHTML = renderPreRollMonthlyChart(rows);

  // Game-by-game table, sorted by date desc
  const sorted = [...rows]
    .filter(r => r.Plays !== null || r.EventDate)
    .sort((a, b) => {
      if (a.EventDate && b.EventDate) return b.EventDate - a.EventDate;
      return 0;
    });

  const gameRows = sorted.map(r => {
    const dateStr = r.EventDate
      ? r.EventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const gameCTR = (r.Plays && r.Clicks !== null) ? r.Clicks / r.Plays : null;
    return `
      <tr>
        <td class="col-left" style="font-family:var(--font-mono);font-size:11px;">${dateStr}</td>
        <td class="col-left" style="max-width:260px;" title="${escapeHTML(r.InsertionOrder)}">${escapeHTML(r.InsertionOrder)}</td>
        <td class="num">${r.Plays !== null ? r.Plays.toLocaleString() : '—'}</td>
        <td class="num">${r.Clicks !== null ? r.Clicks.toLocaleString() : '—'}</td>
        <td class="num">${_fmtWebCTR(gameCTR)}</td>
      </tr>
    `;
  }).join('');

  const detailTable = sorted.length ? `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Game-by-game delivery</span>
        <span class="card-sub">${sorted.length} events · newest first</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-left">Game date</th>
              <th class="col-left">Placement</th>
              <th class="num">Plays</th>
              <th class="num">Clicks</th>
              <th class="num">CTR</th>
            </tr>
          </thead>
          <tbody>${gameRows}</tbody>
        </table>
      </div>
    </div>
  ` : '';

  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
        color:var(--text-muted);padding:10px 0 8px;border-bottom:1px solid var(--border-soft);margin-bottom:16px;">
        Pre-Roll Video · 15-Second Spots
      </div>
      ${kpiHTML}
      ${chartHTML}
      ${detailTable}
    </div>
  `;
}

// ============================================================
// MAIN SECTION RENDER — called from 09_app_core.js
// ============================================================

function renderWebDigitalSection(brand) {
  const slot = document.getElementById('web-digital-slot');
  if (!slot) return;

  const blazersRows  = getBlazersBannersForBrand(brand);
  const rqRows       = getRQBannersForBrand(brand);
  const preRollRows  = getPreRollForBrand(brand);

  const hasBlazer   = blazersRows.length > 0;
  const hasRQ       = rqRows.length > 0;
  const hasPreRoll  = preRollRows.length > 0;

  if (!hasBlazer && !hasRQ && !hasPreRoll) { slot.innerHTML = ''; return; }

  const sectionId = 'section-web-digital';
  const isOpen    = !!openSections[sectionId];

  // — collapsed-state summary strip —
  const blazerAgg    = aggregateWebBannerRows(blazersRows);
  const rqAgg        = aggregateWebBannerRows(rqRows);
  const displayParts = [blazerAgg.impressions, rqAgg.impressions].filter(v => v !== null && v !== undefined);
  const totalDisplayImpr = displayParts.length ? displayParts.reduce((a, v) => a + v, 0) : null;

  let totalPlays = null;
  preRollRows.forEach(r => { if (r.Plays !== null) totalPlays = (totalPlays || 0) + r.Plays; });

  const channelParts = [];
  if (hasBlazer)  channelParts.push('Blazers.com');
  if (hasRQ)      channelParts.push('RoseQuarter.com');
  if (hasPreRoll) channelParts.push('Pre-Roll');

  const summaryHTML = `
    ${(totalDisplayImpr !== null) ? `
    <div class="section-summary-stat">
      <span class="label">Display impressions</span>
      <span class="value">${formatNum(totalDisplayImpr)}</span>
    </div>` : ''}
    ${(totalPlays !== null) ? `
    <div class="section-summary-stat">
      <span class="label">Pre-roll plays</span>
      <span class="value">${formatNum(totalPlays)}</span>
    </div>` : ''}
    <div class="section-summary-stat">
      <span class="label">Channels</span>
      <span class="value">${channelParts.length}</span>
    </div>
  `;

  slot.innerHTML = `
    <section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
      <button class="section-toggle" type="button" data-section-toggle="${sectionId}">
        <svg class="section-chevron" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <polyline points="9 6 15 12 9 18"/>
        </svg>
        <div>
          <div class="section-title">🌐 Web &amp; Digital</div>
          <div class="section-meta" style="margin-top:2px;">
            ${channelParts.join(' · ')} · Jul 1, 2025 – May 5, 2026
          </div>
        </div>
        <div class="section-toggle-meta">${summaryHTML}</div>
      </button>
      <div class="section-body">
        ${hasBlazer  ? renderBlazersBannersSubsection(brand, blazersRows) : ''}
        ${hasRQ      ? renderRQBannersSubsection(brand, rqRows)           : ''}
        ${hasPreRoll ? renderPreRollSubsection(brand, preRollRows)        : ''}
      </div>
    </section>
  `;
}
