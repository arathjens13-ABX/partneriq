const PAID_OBJECTIVE_LABELS = { AWR: 'Awareness', TRF: 'Traffic', LEADS: 'Leads', ENG: 'Engagement', SALE: 'Sales' };
const PAID_RESULT_LABELS = { RCH: 'Reach', CLKS: 'Clicks', CLK: 'Clicks', CLCKS: 'Clicks', IMP: 'Impressions', IMPS: 'Impressions', LFS: 'Lead Forms', PURC: 'Purchases', THRU: 'ThruPlays', LPV: 'Landing Page Views', IC: 'Initiated Checkout', ENG: 'Engagements' };
const PAID_PLATFORM_LABELS = { META: 'Meta', IG: 'Instagram', FB: 'Facebook', TW: 'X / Twitter' };
const PAID_CATEGORY_LABELS = { CP: 'Corporate Partnership', TB: 'Trail Blazers', FD: 'Fan Development', YB: 'Youth Basketball', GS: 'Group Sales', PS: 'Premium Sales', PM: 'Premium', PR: 'Premium / PR', PO: 'Playoffs', CI: 'Rip City Insiders', DI: 'Digital', B5: 'B5', RCM: 'Rip City Management', DNCE: 'Dance', Extra: 'Extra' };
const PAID_SOCIAL_PARTNER_ALIASES = {
  // Michelob Ultra variants
  MichalobUltra: 'Michelob Ultra', MichelobUltra: 'Michelob Ultra', ULTRA: 'Michelob Ultra', ABInBev: 'Michelob Ultra',
  // Xfinity / Comcast
  Comcast: 'Xfinity', Xfinity: 'Xfinity',
  // Brightside
  BrightsideWindows: 'Brightside Windows', Brightside: 'Brightside Windows',
  // Moda Health
  Moda: 'Moda Health', ModaHealth: 'Moda Health',
  // Fred Meyer
  FredMeyer: 'Fred Meyer',
  // Coors
  Coors: 'Coors Light', CoorsLight: 'Coors Light',
  // William Grant & Sons / Tullamore
  WilliamGrantandSons: 'William Grant & Sons', WilliamGrantSons: 'William Grant & Sons', TullamoreDEW: 'Tullamore D.E.W.', TullamoreDew: 'Tullamore D.E.W.',
  // Directors Mortgage (includes typo variant)
  DirectorsMortgage: 'Directors Mortgage', DirectrosMortgage: 'Directors Mortgage',
  // Pacific Office Automation
  PacificOfficeAutomation: 'Pacific Office Automation', POA: 'Pacific Office Automation',
  // Umpqua Bank
  UmpquaBank: 'Umpqua Bank',
  // Coca-Cola
  CocaCola: 'Coca-Cola',
  // Alaska Airlines — 'Alaska' added so compound names like AlaskaDOTM resolve correctly
  Alaska: 'Alaska Airlines', AlaskaAir: 'Alaska Airlines', AlaskaAirlines: 'Alaska Airlines',
  // Toyota
  Toyota: 'Toyota',
  // Daimler / DTNA
  Daimler: 'Daimler', DTNA: 'Daimler',
  // Nike
  Nike: 'Nike',
  // Riverside Payments
  RiversidePayments: 'Riverside Payments',
  // First Tech
  FirstTech: 'First Tech', FirstTechBeyond: 'First Tech',
  // Rogue Ales
  Rogue: 'Rogue',
  // Axiom
  Axiom: 'Axiom',
  // Hornitos
  Hornitos: 'Hornitos',
  // Columbia Bank
  ColumbiaBank: 'Columbia Bank',
  // JustPark
  JustPark: 'JustPark',
  // Shine Vodka
  ShineVodka: 'Shine Vodka',
  // Vortex
  Vortex: 'Vortex',
  // UBCO
  UBCO: 'UBCO',
  // Hyatt
  Hyatt: 'Hyatt', HyattRegency: 'Hyatt Regency',
  // Les Schwab
  LesSchwab: 'Les Schwab',
  // National Guard / Oregon National Guard
  NationalGuard: 'National Guard', ONG: 'Oregon National Guard',
  // Ticketmaster
  Ticketmaster: 'Ticketmaster',
  // Rebound
  Rebound: 'Rebound',
  // Socios
  Socios: 'Socios',
  // Adidas
  Adidas: 'Adidas',
  // Athletic Brewing
  AthleticBrewing: 'Athletic Brewing',
  // Boyd's Coffee
  BoydsCoffee: "Boyd's Coffee",
  // Avid Cider
  AvidCider: 'Avid Cider',
  // Nuna
  Nuna: 'Nuna',
  // Bar Network
  BarNetwork: 'Bar Network',
  // MWS
  MWS: 'MWS',
  // Travel + Leisure
  TravelandLeisure: 'Travel + Leisure',
  // Columbia (generic — lower priority than ColumbiaBank so alias map order matters for length sorting)
  Columbia: 'Columbia',
};
function escapeHTML(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function compactToken(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function titleFromToken(value) { const spaced = String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); return spaced.replace(/\w/g, c => c.toUpperCase()); }
function normalizePartnerName(value) {
  const raw = String(value || '').trim().replace(/^[-_\s]+|[-_\s]+$/g, '');
  if (!raw) return '';
  const globalCanonical = resolveCanonicalBrandName(raw);
  if (globalCanonical !== raw) return globalCanonical;
  const direct = PAID_SOCIAL_PARTNER_ALIASES[raw] || DataStore.paidAssignmentRules[raw];
  if (direct) return resolveCanonicalBrandName(direct);
  const normalized = compactToken(raw);
  const aliasEntry = Object.entries({ ...PAID_SOCIAL_PARTNER_ALIASES, ...(DataStore.paidAssignmentRules || {}) }).find(([k]) => compactToken(k) === normalized);
  if (aliasEntry) return resolveCanonicalBrandName(aliasEntry[1]);
  return resolveCanonicalBrandName(titleFromToken(raw));
}
function findRuleMatchInCampaign(campaignName) {
  const lower = compactToken(campaignName);
  const rules = { ...BRAND_ALIAS_DEFAULTS, ...(DataStore.brandMergeRules || {}), ...PAID_SOCIAL_PARTNER_ALIASES, ...(DataStore.paidAssignmentRules || {}) };
  const matches = Object.entries(rules).filter(([needle]) => needle && lower.includes(compactToken(needle))).sort((a, b) => compactToken(b[0]).length - compactToken(a[0]).length);
  return matches.length ? { token: matches[0][0], partner: resolveCanonicalBrandName(matches[0][1]) } : null;
}
// Recognizes the season token in any of these shapes and returns the canonical YYYY-YY form,
// or '' if the input isn't a season. Fiscal-year shorthand (FY24 / FY2024) is interpreted as
// the season ENDING in that year — matches fiscalSeasonFromDate() in 04_datastore.js.
function parseFlexibleSeasonToken(token) {
  if (!token) return '';
  const t = String(token).trim();
  if (/^20\d{2}-\d{2}$/.test(t)) return t;
  const fy = t.match(/^FY[\s_-]?(\d{2}|\d{4})$/i);
  if (fy) {
    const endYr = fy[1].length === 2 ? 2000 + Number(fy[1]) : Number(fy[1]);
    const start = endYr - 1;
    return `${start}-${String(endYr).slice(-2)}`;
  }
  const long = t.match(/^(20\d{2})[\s\/_-]+(20)?(\d{2})$/);
  if (long) return `${long[1]}-${long[3]}`;
  return '';
}

function parsePaidCampaignName(campaignName, explicitPartner = '') {
  const name = String(campaignName || '').trim();
  const result = {
    raw: name, parsedSeason: '', categoryCode: '', category: '',
    activation: '', partnerRaw: '', partner: '',
    objectiveCode: '', objective: '', resultCode: '', resultMetric: '',
    platformCode: '', platform: '', campaignDate: '', note: '',
    confidence: 'review', parseStatus: 'Needs review', parseNotes: []
  };
  if (explicitPartner && explicitPartner !== UNASSIGNED_PAID_KEY) {
    result.partnerRaw = explicitPartner;
    result.partner = normalizePartnerName(explicitPartner);
    result.confidence = 'high';
    result.parseStatus = 'Explicit partner column';
    result.parseNotes.push('Used Brand/Partner column from upload.');
  }
  if (!name) { result.parseNotes.push('Campaign name is blank.'); return result; }
  const dnd = /^DND[_\s-]/i.test(name);
  const copy = /copy/i.test(name);
  let working = name.replace(/^DND[_\s-]*/i, '').trim();
  // Tokenize on underscore, space, or hyphen — but protect "YYYY-YY" season ranges (and FY shorthand)
  // so they aren't shattered by the hyphen split. Placeholder uses no split chars so it survives.
  const seasonPlaceholders = [];
  const protectedWorking = working.replace(/(FY[\s_-]?\d{2,4}|20\d{2}[\s\/_-]+(?:20)?\d{2})/gi, m => {
    seasonPlaceholders.push(m);
    return `SEASONTOKEN${seasonPlaceholders.length - 1}END`;
  });
  const parts = protectedWorking
    .split(/[_\s-]+/)
    .map(p => p.trim())
    .filter(p => p !== '')
    .map(p => p.replace(/SEASONTOKEN(\d+)END/g, (_, i) => seasonPlaceholders[Number(i)]));
  const seasonIdx = parts.findIndex(p => parseFlexibleSeasonToken(p) !== '');
  const objIdx = parts.findIndex(p => PAID_OBJECTIVE_LABELS[p.toUpperCase()]);
  if (seasonIdx !== -1) result.parsedSeason = parseFlexibleSeasonToken(parts[seasonIdx]) || parts[seasonIdx];
  if (seasonIdx !== -1 && parts[seasonIdx + 1]) {
    result.categoryCode = parts[seasonIdx + 1];
    result.category = PAID_CATEGORY_LABELS[result.categoryCode] || result.categoryCode;
  }
  if (objIdx !== -1) {
    const obj = parts[objIdx].toUpperCase();
    result.objectiveCode = obj;
    result.objective = PAID_OBJECTIVE_LABELS[obj] || obj;
    const res = (parts[objIdx + 1] || '').toUpperCase();
    if (PAID_RESULT_LABELS[res]) { result.resultCode = res; result.resultMetric = PAID_RESULT_LABELS[res]; }
    const platform = (parts[objIdx + 2] || '').toUpperCase();
    if (PAID_PLATFORM_LABELS[platform]) { result.platformCode = platform; result.platform = PAID_PLATFORM_LABELS[platform]; }
    result.campaignDate = parts[objIdx + 3] || '';
    result.note = parts.slice(objIdx + 4).join(' · ');
    const between = parts.slice(seasonIdx !== -1 ? seasonIdx + 2 : 0, objIdx).filter(Boolean);
    if (between.length) {
      const isCp = (result.categoryCode || '').toUpperCase() === 'CP';
      if (isCp && between.length >= 2) {
        // Standard CP: last token before objective = partner, rest = activation
        result.partnerRaw = between[between.length - 1];
        result.activation = titleFromToken(between.slice(0, -1).join(' '));
      } else if (isCp && between.length === 1) {
        // Single-token CP: partner may be embedded as a prefix in the activation token.
        // e.g. "AlaskaDOTM" / "alaskaDOTM" / "ALASKA-DOTM" -> prefix "Alaska" -> Alaska Airlines
        // Match via compactToken() so case and punctuation differences don't block resolution.
        const token = between[0];
        const tokenCompact = compactToken(token);
        const allAliases = { ...PAID_SOCIAL_PARTNER_ALIASES, ...(DataStore.paidAssignmentRules || {}) };
        const sortedKeys = Object.keys(allAliases).sort((a, b) => compactToken(b).length - compactToken(a).length);
        const prefixKey = sortedKeys.find(k => {
          const kc = compactToken(k);
          return kc.length >= 4 && tokenCompact.startsWith(kc);
        });
        if (prefixKey) {
          result.partnerRaw = prefixKey;
          // Walk the original token character-by-character until we've consumed the same number
          // of alphanumeric characters as the matched prefix, so the suffix preserves the
          // original casing/punctuation of whatever followed the brand name.
          const targetLen = compactToken(prefixKey).length;
          let consumed = 0, splitAt = 0;
          for (let i = 0; i < token.length; i++) {
            if (/[a-z0-9]/i.test(token[i])) consumed++;
            if (consumed >= targetLen) { splitAt = i + 1; break; }
          }
          const suffix = token.slice(splitAt).replace(/^[-_\s]+/, '');
          result.activation = titleFromToken(suffix || token);
          result.parseNotes.push('Partner "' + prefixKey + '" extracted as prefix from compound token "' + token + '".');
        } else {
          result.activation = titleFromToken(token);
        }
      } else {
        // Non-CP: look for a known alias token in the between tokens
        const aliasIdx = between.findIndex(t => PAID_SOCIAL_PARTNER_ALIASES[t] || DataStore.paidAssignmentRules[t]);
        if (aliasIdx !== -1) {
          result.partnerRaw = between[aliasIdx];
          result.activation = titleFromToken(between.filter((_, i) => i !== aliasIdx).join(' '));
        } else {
          result.activation = titleFromToken(between.join(' '));
        }
      }
      if (result.partnerRaw && !result.partner) result.partner = normalizePartnerName(result.partnerRaw);
      if (result.partner && result.confidence !== 'high') {
        result.confidence = 'high';
        result.parseStatus = 'Structured campaign name';
        result.parseNotes.push('Partner parsed from structured campaign naming convention.');
      }
    }
  }
  if (!result.partner) {
    const rule = findRuleMatchInCampaign(working);
    if (rule) {
      result.partnerRaw = rule.token;
      result.partner = rule.partner;
      result.confidence = 'medium';
      result.parseStatus = 'Suggested from text match';
      result.parseNotes.push('Matched known partner token "' + rule.token + '" in campaign name.');
    }
  }
  if (!result.activation) result.activation = titleFromToken(working.replace(/^(?:FY[\s_-]?\d{2,4}|20\d{2}[\s\/_-]+(?:20)?\d{2})[_\s-]?/i, '').replace(/[_]+/g, ' '));
  if (dnd) result.parseNotes.push('Campaign name begins with DND.');
  if (copy) result.parseNotes.push('Campaign name contains Copy.');
  if (!result.partner) result.parseNotes.push('No partner could be confidently parsed.');
  return result;
}
function ensurePaidRowId(row) { if (!row._paidRowId) row._paidRowId = 'paid_' + (paidRowIdCounter++); return row._paidRowId; }

function normalizePaidRow(row, fallbackBrand = '') {
  if (!row || typeof row !== 'object') return row;
  ensurePaidRowId(row);

  // Facebook Ads Manager exports can include both a report window and each campaign's actual flight dates.
  // Fiscal-year grouping should use the campaign flight dates (Starts / Ends), not the export/reporting window.
  const reportStart = parseDateValue(row['Reporting starts'] || row.ReportingStarts || row.ReportingStart);
  const reportEnd = parseDateValue(row['Reporting ends'] || row.ReportingEnds || row.ReportingEnd);
  const flightStart = parseDateValue(row.Starts || row.starts || row.Start || row.startDate);
  const flightEnd = parseDateValue(row.Ends || row.ends || row.End || row.endDate);
  const paidFiscalSourceDate = flightStart || flightEnd || reportStart || reportEnd;
  const fiscal = fiscalSeasonFromDate(paidFiscalSourceDate) || normalizeSeasonLabel(row.FiscalYear || row.Season);
  const preservedConfidence = row.PartnerConfidence || '';
  const preservedStatus = row.PartnerParseStatus || '';
  const preservedNotes = row.PartnerParseNotes || '';
  const preservedParsedPartner = row.ParsedPartner || '';
  const preservedBrand = String(row.Brand || row.Partner || row.partner || row.Account || '').trim();
  const explicitPartner = preservedConfidence ? '' : preservedBrand;
  row.ReportingStart = reportStart; row.ReportingEnd = reportEnd; row.PaidFlightStart = flightStart; row.PaidFlightEnd = flightEnd; row.Season = normalizeSeasonLabel(fiscal || row.Season || 'Unknown'); row.FiscalYear = row.Season; row.CampaignName = row.CampaignName || row['Campaign name'] || row.Campaign || 'Unknown campaign';
  const parsed = parsePaidCampaignName(row.CampaignName, explicitPartner);
  row.PaidCampaignSeason = normalizeSeasonLabel(parsed.parsedSeason || row.Season); row.CampaignCategoryCode = parsed.categoryCode; row.CampaignCategory = parsed.category; row.ActivationName = parsed.activation; row.ParsedPartnerRaw = parsed.partnerRaw; row.ParsedPartner = preservedParsedPartner || parsed.partner; row.PartnerConfidence = preservedConfidence || parsed.confidence; row.PartnerParseStatus = preservedStatus || parsed.parseStatus; row.PartnerParseNotes = preservedNotes || parsed.parseNotes.join(' '); row.ObjectiveCode = parsed.objectiveCode; row.Objective = parsed.objective; row.ResultMetricCode = parsed.resultCode; row.ResultMetric = parsed.resultMetric; row.PlatformCode = parsed.platformCode; row.Platform = parsed.platform; row.CampaignDate = parsed.campaignDate; row.CampaignNote = parsed.note;
  const preservedAssignedPartner = preservedConfidence && preservedBrand && preservedBrand !== UNASSIGNED_PAID_KEY && preservedBrand !== UNASSIGNED_PAID_LABEL ? normalizePartnerName(preservedBrand) : '';
  const assignedPartner = preservedAssignedPartner || row.ParsedPartner || (fallbackBrand && !/^(paid|meta|facebook|admanager|ads?|campaigns?|export|data)$/i.test(fallbackBrand) ? normalizePartnerName(fallbackBrand) : '');
  row.Brand = assignedPartner || UNASSIGNED_PAID_KEY; row.Partner = assignedPartner || UNASSIGNED_PAID_LABEL;
  row.CampaignDelivery = row.CampaignDelivery || row['Campaign delivery'] || row.Delivery || '—';
  row.AdSetBudget = parseMetricValue(row.AdSetBudget ?? row['Ad set budget']); row.AdSetBudgetType = row.AdSetBudgetType || row['Ad set budget type'] || '—'; row.AttributionSetting = row.AttributionSetting || row['Attribution setting'] || '—'; row.Results = parseMetricValue(row.Results ?? row.results); row.ResultIndicator = row.ResultIndicator || row['Result indicator'] || row['Result Indicator'] || row.ResultMetric || 'Results'; row.Reach = parseMetricValue(row.Reach); row.Impressions = parseMetricValue(row.Impressions); row.LinkClicks = parseMetricValue(row.LinkClicks ?? row['Link clicks']); row.UniqueLinkClicks = parseMetricValue(row.UniqueLinkClicks ?? row['Unique link clicks']); row.LinkCTR = parsePercentValue(row.LinkCTR ?? row['CTR (link click-through rate)'] ?? row.CTR); row.CostPerResult = parseMetricValue(row.CostPerResult ?? row['Cost per results'] ?? row['Cost per result']); row.Starts = row.Starts || row.starts || row.Start || '';
  row.Ends = row.Ends || row.ends || row.End || '';
  row.AmountSpentUSD = parseMetricValue(row.AmountSpentUSD ?? row['Amount spent (USD)'] ?? row.Spend ?? row['Amount spent']);
  row.Spend = row.AmountSpentUSD;
  row.CPM = row.Impressions > 0 ? (row.AmountSpentUSD / row.Impressions) * 1000 : 0;
  // CPC: use computed value first, then raw column (handles "CPC (cost per link click)" variant)
  row.CPC = row.LinkClicks > 0
    ? row.AmountSpentUSD / row.LinkClicks
    : parseMetricValue(row.CPC ?? row['CPC (cost per link click)'] ?? 0);
  row.Frequency = row.Reach > 0 ? row.Impressions / row.Reach : 0;
  row.PaidFiscalDateSource = (flightStart || flightEnd) ? 'Starts / Ends' : 'Reporting window fallback';
  // Daily date — the Day column gives per-row daily granularity for time-series charts
  row.DailyDate = parseDateValue(row.Day || row.day);
  row._dailySortKey = row.DailyDate instanceof Date ? row.DailyDate.getTime() : 0;
  // Campaign budget (not always present in all export formats)
  row.CampaignBudget = parseMetricValue(row.CampaignBudget ?? row['Campaign Budget'] ?? row['Campaign budget']);
  row.CampaignBudgetType = row.CampaignBudgetType || row['Campaign Budget Type'] || row['Campaign budget type'] || '';
  return row;
}

function formatNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

function formatPct(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n * 100).toFixed(digits) + '%';
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null;
  return (curr - prev) / prev;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getBrandTVData(brand, season = 'all') {
  const rows = DataStore.tvSignage.filter(r =>
    r.Brand === brand &&
    // Exclude on-court virtual branding — those rows belong to the Virtual Signage page
    !(String(r.Tool     || '').trim().toLowerCase() === 'virtual branding' &&
      ['center', '3 point line'].includes(String(r.Location || '').trim().toLowerCase()))
  );
  if (season === 'all') return rows;
  return rows.filter(r => normalizeSeasonLabel(r.Season) === season);
}

function getBrandSocialData(brand, season = 'all') {
  const rows = DataStore.organicSocial[brand] || [];
  if (season === 'all') return rows;
  return rows.filter(r => normalizeSeasonLabel(r.Season) === season);
}

function getBrandPaidData(brand, season = 'all') {
  const rows = DataStore.paidSocial[brand] || [];
  if (season === 'all') return rows;
  return rows.filter(r => r.Season === season);
}

// Returns rows that have a valid DailyDate, sorted chronologically. Used for time-series charts.
function getBrandPaidDailyRows(brand, season = 'all') {
  return getBrandPaidData(brand, season)
    .filter(r => r.DailyDate instanceof Date && !isNaN(r.DailyDate))
    .sort((a, b) => a._dailySortKey - b._dailySortKey);
}

// All paid rows with a valid DailyDate for a given portfolio period (all brands)
function getPaidDailyRowsForPeriod(period) {
  return getPaidRowsForPeriod(period)
    .filter(r => r.DailyDate instanceof Date && !isNaN(r.DailyDate))
    .sort((a, b) => a._dailySortKey - b._dailySortKey);
}

function getPaidSeasons(brand) {
  return [...new Set(getBrandPaidData(brand).map(r => normalizeSeasonLabel(r.Season)).filter(Boolean))].sort();
}

function getPaidYoY(brand, period, key) {
  const seasons = getPaidSeasons(brand);
  if (seasons.length < 2) return null;
  const currSeason = period === 'all' ? seasons[seasons.length - 1] : period;
  const idx = seasons.indexOf(currSeason);
  if (idx <= 0) return null;
  const prevSeason = seasons[idx - 1];
  const currRows = getBrandPaidData(brand, currSeason);
  const prevRows = getBrandPaidData(brand, prevSeason);
  if (!currRows.length || !prevRows.length) return null;
  const curr = key === 'CTR' ? paidAggregate(currRows).ctr : sum(currRows, key);
  const prev = key === 'CTR' ? paidAggregate(prevRows).ctr : sum(prevRows, key);
  const change = pctChange(curr, prev);
  return change === null ? null : { change, curr, prev, currSeason, prevSeason, basis: `${currSeason} vs ${prevSeason}` };
}

function paidAggregate(rows) {
  const spend = sum(rows, 'AmountSpentUSD');
  const impressions = sum(rows, 'Impressions');
  const reach = sum(rows, 'Reach');
  const clicks = sum(rows, 'LinkClicks');
  const uniqueClicks = sum(rows, 'UniqueLinkClicks');
  const results = sum(rows, 'Results');
  const campaigns = new Set(rows.map(r => r.CampaignName || r['Campaign name']).filter(Boolean));
  const indicators = new Set(rows.map(r => r.ResultIndicator || r['Result indicator']).filter(Boolean));
  return {
    spend, impressions, reach, clicks, uniqueClicks, results,
    campaignCount: campaigns.size,
    resultIndicatorCount: indicators.size,
    resultIndicatorLabel: indicators.size === 1 ? [...indicators][0] : `${indicators.size || 0} result types`,
    ctr: impressions > 0 ? clicks / impressions : avg(rows, 'LinkCTR'),
    cpm: impressions > 0 ? spend / impressions * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    costPerResult: results > 0 ? spend / results : 0,
    frequency: reach > 0 ? impressions / reach : 0,
  };
}

function aggregatePaidByCampaign(rows) {
  const grouped = {};
  rows.forEach(r => {
    const key = r.CampaignName || r['Campaign name'] || 'Unknown campaign';
    if (!grouped[key]) grouped[key] = {
      name: key, spend: 0, impressions: 0, reach: 0, clicks: 0, uniqueClicks: 0, results: 0,
      deliveries: new Set(), indicators: new Set(), objectives: new Set(), platforms: new Set(), categories: new Set(), confidence: new Set(), rows: []
    };
    grouped[key].spend += Number(r.AmountSpentUSD) || 0;
    grouped[key].impressions += Number(r.Impressions) || 0;
    grouped[key].reach += Number(r.Reach) || 0;
    grouped[key].clicks += Number(r.LinkClicks) || 0;
    grouped[key].uniqueClicks += Number(r.UniqueLinkClicks) || 0;
    grouped[key].results += Number(r.Results) || 0;
    if (r.CampaignDelivery) grouped[key].deliveries.add(r.CampaignDelivery);
    if (r.ResultIndicator) grouped[key].indicators.add(r.ResultIndicator);
    if (r.Objective) grouped[key].objectives.add(r.Objective);
    if (r.Platform) grouped[key].platforms.add(r.Platform);
    if (r.CampaignCategoryCode) grouped[key].categories.add(r.CampaignCategoryCode);
    if (r.PartnerConfidence) grouped[key].confidence.add(r.PartnerConfidence);
    grouped[key].rows.push(r);
  });
  return Object.values(grouped).map(v => ({
    ...v,
    ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
    cpm: v.impressions > 0 ? v.spend / v.impressions * 1000 : 0,
    cpc: v.clicks > 0 ? v.spend / v.clicks : 0,
    costPerResult: v.results > 0 ? v.spend / v.results : 0,
    delivery: [...v.deliveries].slice(0, 2).join(' / ') || '—',
    indicator: [...v.indicators].slice(0, 2).join(' / ') || '—',
    objective: [...v.objectives].slice(0, 2).join(' / ') || '—',
    platform: [...v.platforms].slice(0, 2).join(' / ') || '—',
    category: [...v.categories].slice(0, 2).join(' / ') || '—',
    confidenceLabel: v.confidence.has('review') ? 'Review' : v.confidence.has('medium') ? 'Medium' : 'High',
  })).sort((a, b) => b.spend - a.spend);
}

function getAvailableSeasons(brand) {
  const seasons = new Set();
  getBrandTVData(brand).forEach(r => { const s = normalizeSeasonLabel(r.Season); if (s) seasons.add(s); });
  getBrandSocialData(brand).forEach(r => { const s = normalizeSeasonLabel(r.Season); if (s) seasons.add(s); });
  getBrandPaidData(brand).forEach(r => { const s = normalizeSeasonLabel(r.Season); if (s) seasons.add(s); });
  return [...seasons].sort();
}

// ============================================================
