const BRAND_ALIAS_DEFAULTS = {
  'Daimler Trucks': 'Daimler',
  'Daimler Trucks North America': 'Daimler',
  'Daimler Truck North America': 'Daimler',
  'DTNA': 'Daimler',
  'Comcast': 'Xfinity',
  'Moda': 'Moda Health',
  'ModaHealth': 'Moda Health',
  'Brightside': 'Brightside Windows',
  'BrightsideWindows': 'Brightside Windows',
  'FredMeyer': 'Fred Meyer',
  'Coors': 'Coors Light',
  'CoorsLight': 'Coors Light',
  'MichalobUltra': 'Michelob Ultra',
  'MichelobUltra': 'Michelob Ultra',
  'ULTRA': 'Michelob Ultra',
  'ABInBev': 'Michelob Ultra',
  'UmpquaBank': 'Umpqua Bank',
  'CocaCola': 'Coca-Cola',
  'AlaskaAir': 'Alaska Airlines',
  'AlaskaAirlines': 'Alaska Airlines',
  'DirectorsMortgage': 'Directors Mortgage',
  'DirectrosMortgage': 'Directors Mortgage',
  'PacificOfficeAutomation': 'Pacific Office Automation',
  'POA': 'Pacific Office Automation',
  'adidas': 'Adidas',
  'Boyd\'s Coffee': 'Boyds Coffee',
  'BoydsCoffee': 'Boyds Coffee',
  // Survey-specific name variants (full legal names used in survey data)
  'First Tech Credit Union': 'First Tech',
  'Coca-Cola / Sprite': 'Coca-Cola',
  'Rebound Orthopedics': 'Rebound Orthopedics',
  'Nuna Baby': 'Nuna',
  'Athletic Brewing Company': 'Athletic Brewing',
  'Les Schwab Tire Centers': 'Les Schwab',
  'Alaska': 'Alaska Airlines',
  'ZoomInfo Technologies': 'ZoomInfo',
  'Providence Health & Services': 'Providence Health',
  // Content series brand names (extracted from BrandedContentSeries file)
  // These are the words that appear at the START of content series names.
  'McDonalds': "McDonald's",        // "McDonalds 100 Point Play"
  "McDonald's": "McDonald's",
  'Ford': 'Ford',                   // "Ford Keys to the Game"
  'Gatorade': 'Gatorade',           // "Gatorade Milestones"
  'ReboundMD': 'Rebound Orthopedics', // "ReboundMD Injury Report"
  'Sprite': 'Sprite',               // "Sprite Home Court Drip" — change to 'Coca-Cola' if Sprite rolls up to Coca-Cola
  'Ticketmaster': 'Ticketmaster',   // "Ticketmaster Gameday Tickets", "Ticketmaster Tiny Mic"
  'Axiom': 'Axiom',                 // "Axiom Protect This House", "Axiom Defensive Play"
  'Toyota': 'Toyota',               // "Toyota Hitting the Road"
  'Xfinity': 'Xfinity',            // "Xfinity Made For This"
  'Daimler': 'Daimler',             // "Daimler 3's For Trees"
  // Affidavit-source dealership / regional group names that should roll up to the corporate brand
  'NORTHWEST FORD STORES': 'Ford',
  'PNW TOYOTA DEALERS ASSOC': 'Toyota',
  // ANC LED Report — Toyota dealership rollups (Damian Lillard Toyota intentionally NOT included)
  'BEAVERTON TOYOTA': 'Toyota',
  'CAPITOL TOYOTA': 'Toyota',
  'DICK HANNAH TOYOTA': 'Toyota',
  'GRESHAM TOYOTA': 'Toyota',
  'LUMS TOYOTA': 'Toyota',
  'RON TONKIN TOYOTA': 'Toyota',
  'ROYAL MOORE TOYOTA': 'Toyota',
  'TOYOTA OF PORTLAND': 'Toyota',
  'VANCOUVER TOYOTA': 'Toyota',
  'WILSONVILLE TOYOTA': 'Toyota',
  // ANC LED Report — Moda Health sub-campaign rollups (auto-detection can't catch these
  // because canonical "Moda Health" has 2 words and variants don't word-prefix match)
  'MODA': 'Moda Health',
  'MODA ASSIST': 'Moda Health',
  'Moda Busy Families': 'Moda Health',
  'MODA EMPLOYER': 'Moda Health',
  'MODA EXPERIENCE BETTER': 'Moda Health',
  'Moda Harpers': 'Moda Health',
  'MODA LUCKY SECTION': 'Moda Health',
  'MODA PLUM TASTY': 'Moda Health',
  'MODA TEAM SPORT': 'Moda Health',
  'Moda Partnership': 'Moda Health',
  // ANC LED Report — Alaska Airlines sub-campaign
  'Alaska Dunk Of The Game': 'Alaska Airlines',
  // ANC LED Report — Comcast Xfinity (existing 'Comcast' alias only matches the bare word)
  'Comcast Xfinity': 'Xfinity',
};

function compactBrandToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getBrandMergeRules() {
  const custom = (typeof DataStore !== 'undefined' && DataStore.brandMergeRules) ? DataStore.brandMergeRules : {};
  return { ...BRAND_ALIAS_DEFAULTS, ...custom };
}

// Detects pairs where one brand name is a word-prefix of another and returns a
// variant→canonical map.  "10 Barrel Brewing" starts with "10 Barrel" → grouped.
// Shorter name wins as canonical.  Names in blockedSet are excluded.
function detectWordPrefixGroups(brandNames, blockedSet) {
  const blocks = blockedSet instanceof Set ? blockedSet : new Set(Array.isArray(blockedSet) ? blockedSet : []);
  // Strip apostrophes and hyphens before splitting so "Hempler's" → "hemplers"
  // (not ["hempler","s"]) and "Coca-Cola" → "cocacola" (not ["coca","cola"]).
  const toWords = n => n.toLowerCase().replace(/['\-]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const names = [...new Set(brandNames)].filter(n => n && !blocks.has(n));
  names.sort((a, b) => toWords(a).length - toWords(b).length || a.localeCompare(b));
  const result = {};
  const claimed = new Set();
  names.forEach((shorter, i) => {
    if (claimed.has(shorter)) return;
    const sw = toWords(shorter);
    if (!sw.length) return;
    for (let j = i + 1; j < names.length; j++) {
      const longer = names[j];
      if (claimed.has(longer)) continue;
      const lw = toWords(longer);
      if (lw.length <= sw.length) continue;
      if (sw.every((w, k) => lw[k] === w)) { result[longer] = shorter; claimed.add(longer); }
    }
  });
  return result;
}

// skipAutoDetect=true skips step 4. Used by detection itself to compute the
// pre-auto-detect canonical set without feedback loops.
function resolveCanonicalBrandName(value, skipAutoDetect = false) {
  const raw = String(value || '').trim().replace(/^[-_\s]+|[-_\s]+$/g, '');
  if (!raw || raw === '__UNASSIGNED_PAID__' || raw === 'Unassigned Paid Social') return raw;
  const rules = getBrandMergeRules();
  // 1. Exact alias key match
  if (rules[raw]) return rules[raw];
  const compact = compactBrandToken(raw);
  // 2. Compact alias key match (handles case/punctuation variants of known alias keys)
  const keyMatch = Object.entries(rules).find(([alias]) => compactBrandToken(alias) === compact);
  if (keyMatch) return keyMatch[1];
  // 3. Compact canonical value match — catches variants like "NIKE" vs "Nike"
  const canonicals = [...new Set(Object.values(rules))];
  const canonicalMatch = canonicals.find(c => compactBrandToken(c) === compact);
  if (canonicalMatch) return canonicalMatch;
  // 4. Auto-detected word-prefix match (e.g. "Axiom Eco-Pest Control" → "Axiom")
  //    Populated by detectWordPrefixGroups after data loads; lower priority than explicit rules.
  if (!skipAutoDetect && typeof DataStore !== 'undefined' && DataStore.autoDetectedAliases) {
    const autoMatch = DataStore.autoDetectedAliases[raw];
    if (autoMatch) return autoMatch;
  }
  return raw;
}

// Preserve the original brand name on first canonicalization, then re-resolve from
// that original on every subsequent pass. Without this, auto-detection becomes
// one-way: once "Axiom Eco-Pest Control" is merged into "Axiom", the row data
// no longer contains "Axiom Eco-Pest Control" so re-detection can never find it
// again — adding a single manual alias would collapse the auto-detect list.
function resolveAndTrackRaw(row, field, rawField) {
  if (!row || row[field] === undefined || row[field] === null || row[field] === '') return;
  if (!row[rawField]) row[rawField] = row[field];
  row[field] = resolveCanonicalBrandName(row[rawField]);
}

// ============================================================
// DATA STORE
// ============================================================
const DataStore = {
  tvSignage: [],
  organicSocial: {},
  zoomphBrandPerf: [],      // BrandedPartnerPerformance rows
  zoomphContentSeries: [],  // BrandedContentSeries rows
  zoomphAssets: [],         // BrandOnAsset rows
  paidSocial: {},
  paidAssignmentRules: {},
  brandMergeRules: { ...BRAND_ALIAS_DEFAULTS },
  autoDetectedAliases: {},   // computed post-load; variant → canonical (word-prefix + case-normalization groupings)
  autoAliasBlocks: new Set(), // user-flagged names that should NOT be auto-merged; persisted in exports
  brandNameChanges: new Set(), // alias keys that represent "formerly known as" renames (vs pure shorthand aliases)
  surveys: [],
  surveyGeneral: [],             // File 1 — GeneralSurvey_ — fan segment questions (beverages, game nights, bar spaces, TV segments)
  surveyPartner: [],             // File 2 — ModaDeltaDental_ — partner-specific question battery (Moda Health + Delta Dental)
  surveyPrograms: [],            // File 3 — Program_ — in-game and community program awareness
  surveyGeneralAssignmentRules: {}, // answer option text → canonical partner name (user-maintained, survives export)
  partnerRoster: [],
  affidavits: [],                   // TV & Radio Affidavit spot delivery counts
  ancLED: [],                       // ANC LED Report — per-asset in-arena exposure time
  virtualSignageSchedule: [],       // On-court virtual signage schedule (center + 3-point line)
  webBlazersBanners: [],            // Blazers.com display banner delivery rows
  webRQBanners: [],                 // RoseQuarter.com display banner delivery rows
  webPreRoll: [],                   // Pre-Roll video delivery rows
  tvRatings: [],                    // Nielsen TV broadcast viewership data (game-level ratings, not partner data)
  loadedFiles: [],                  // Per-file ingest registry { fileId, filename, type, rows, loadedAt, ... } — backs Remove/Replace in the file log
  brands: new Set(),
  channelsByBrand: {},

  reset() {
    this.tvSignage = [];
    this.organicSocial = {};
    this.zoomphBrandPerf = [];
    this.zoomphContentSeries = [];
    this.zoomphAssets = [];
    this.paidSocial = {};
    this.paidAssignmentRules = {};
    this.brandMergeRules = { ...BRAND_ALIAS_DEFAULTS };
    this.autoDetectedAliases = {};
    this.autoAliasBlocks = new Set();
    this.brandNameChanges = new Set();
    this.surveys = [];
    this.surveyGeneral = [];
    this.surveyPartner = [];
    this.surveyPrograms = [];
    this.surveyGeneralAssignmentRules = {};
    this.partnerRoster = [];
    this.affidavits = [];
    this.ancLED = [];
    this.virtualSignageSchedule = [];
    this.webBlazersBanners = [];
    this.webRQBanners = [];
    this.webPreRoll = [];
    this.tvRatings = [];
    this.loadedFiles = [];
    this.brands = new Set();
    this.channelsByBrand = {};
  },

  registerBrand(name, channel) {
    if (!name) return;
    const clean = resolveCanonicalBrandName(name);
    if (!clean) return;
    this.brands.add(clean);
    if (!this.channelsByBrand[clean]) {
      this.channelsByBrand[clean] = { tv: false, organic: false, paid: false, survey: false, affidavit: false, ancLED: false, virtualSignage: false, webDisplay: false };
    }
    this.channelsByBrand[clean][channel] = true;
  },

  getBrandList() { return [...this.brands].sort(); },
  hasAnyData() {
    const tv = (this.tvSignage || []).length;
    const organic = Object.values(this.organicSocial || {}).reduce((a, rows) => a + (Array.isArray(rows) ? rows.length : 0), 0);
    const paid = Object.values(this.paidSocial || {}).reduce((a, rows) => a + (Array.isArray(rows) ? rows.length : 0), 0);
    const zoomph = (this.zoomphBrandPerf||[]).length + (this.zoomphContentSeries||[]).length + (this.zoomphAssets||[]).length;
    const surveys = Array.isArray(this.surveys) ? this.surveys.length : 0;
    const surveyGeneral  = Array.isArray(this.surveyGeneral)  ? this.surveyGeneral.length  : 0;
    const surveyPartner  = Array.isArray(this.surveyPartner)  ? this.surveyPartner.length  : 0;
    const surveyPrograms = Array.isArray(this.surveyPrograms) ? this.surveyPrograms.length : 0;
    const vsSchedule     = Array.isArray(this.virtualSignageSchedule) ? this.virtualSignageSchedule.length : 0;
    const webDisplay     = (this.webBlazersBanners||[]).length + (this.webRQBanners||[]).length + (this.webPreRoll||[]).length;
    const tvRatings      = Array.isArray(this.tvRatings) ? this.tvRatings.length : 0;
    return tv + organic + paid + surveys + surveyGeneral + surveyPartner + surveyPrograms + zoomph + vsSchedule + webDisplay + tvRatings > 0;
  }
};

// ============================================================
// LOADED-FILE REGISTRY — per-file provenance, remove & replace
// ============================================================
let _fileIdCounter = 0;
function generateFileId() {
  return 'f' + Date.now().toString(36) + '-' + (++_fileIdCounter).toString(36) + '-' + Math.floor(Math.random() * 46656).toString(36);
}

function tagRowsWithFile(rows, fileId) {
  (rows || []).forEach(r => { if (r && typeof r === 'object') r._fileId = fileId; });
  return rows;
}

function getLoadedFileEntry(fileId) {
  return (DataStore.loadedFiles || []).find(f => f.fileId === fileId) || null;
}

// Strips every row tagged with fileId out of all DataStore collections and
// drops the registry entry. Does NOT rebuild registries or re-render — callers
// decide how much downstream work to run (single remove vs. replace flow).
function removeFileDataById(fileId) {
  const byFile = r => !r || r._fileId !== fileId;
  DataStore.tvSignage          = (DataStore.tvSignage || []).filter(byFile);
  DataStore.zoomphBrandPerf    = (DataStore.zoomphBrandPerf || []).filter(byFile);
  DataStore.zoomphContentSeries= (DataStore.zoomphContentSeries || []).filter(byFile);
  DataStore.zoomphAssets       = (DataStore.zoomphAssets || []).filter(byFile);
  DataStore.surveys            = (DataStore.surveys || []).filter(byFile);
  DataStore.surveyGeneral      = (DataStore.surveyGeneral || []).filter(byFile);
  DataStore.surveyPartner      = (DataStore.surveyPartner || []).filter(byFile);
  DataStore.surveyPrograms     = (DataStore.surveyPrograms || []).filter(byFile);
  DataStore.partnerRoster      = (DataStore.partnerRoster || []).filter(byFile);
  DataStore.affidavits         = (DataStore.affidavits || []).filter(byFile);
  DataStore.ancLED             = (DataStore.ancLED || []).filter(byFile);
  DataStore.virtualSignageSchedule = (DataStore.virtualSignageSchedule || []).filter(byFile);
  DataStore.webBlazersBanners  = (DataStore.webBlazersBanners || []).filter(byFile);
  DataStore.webRQBanners       = (DataStore.webRQBanners || []).filter(byFile);
  DataStore.webPreRoll         = (DataStore.webPreRoll || []).filter(byFile);
  DataStore.tvRatings          = (DataStore.tvRatings || []).filter(byFile);
  // Brand-keyed collections: filter each bucket, drop buckets that empty out
  [DataStore.organicSocial, DataStore.paidSocial].forEach(obj => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(brand => {
      obj[brand] = (obj[brand] || []).filter(byFile);
      if (!obj[brand].length) delete obj[brand];
    });
  });
  DataStore.loadedFiles = (DataStore.loadedFiles || []).filter(f => f.fileId !== fileId);
}

// User-facing remove: confirm, strip rows, rebuild brand state, re-render.
function removeLoadedFile(fileId) {
  const entry = getLoadedFileEntry(fileId);
  if (!entry) return;
  // Error entries hold no data — dismiss the log line without confirmation
  if (entry.success === false) {
    DataStore.loadedFiles = DataStore.loadedFiles.filter(f => f.fileId !== fileId);
    renderFileLog();
    return;
  }
  if (!confirm(`Remove "${entry.filename}" and its ${entry.rows || 0} rows from the dashboard?`)) return;
  removeFileDataById(fileId);
  canonicalizeAllBrandData();
  // If the partner being viewed disappeared with the file, fall back to Home
  if (typeof currentBrand !== 'undefined' && currentBrand && !DataStore.brands.has(currentBrand)) {
    currentBrand = null;
    currentPage = 'home';
  }
  renderFileLog();
  renderApp();
  updateBrandDropdown(document.getElementById('brandSearch').value);
}

// ============================================================
// PRELOADED DATA HELPERS
// ============================================================
function hasPreloadedData() {
  if (!PRELOADED_DATA || typeof PRELOADED_DATA !== 'object') return false;
  const tv = Array.isArray(PRELOADED_DATA.tvSignage) ? PRELOADED_DATA.tvSignage.length : 0;
  const organic = PRELOADED_DATA.organicSocial && typeof PRELOADED_DATA.organicSocial === 'object'
    ? Object.values(PRELOADED_DATA.organicSocial).reduce((a, rows) => a + (Array.isArray(rows) ? rows.length : 0), 0)
    : 0;
  const paid = PRELOADED_DATA.paidSocial && typeof PRELOADED_DATA.paidSocial === 'object' ? Object.keys(PRELOADED_DATA.paidSocial).length : 0;
  const surveys = Array.isArray(PRELOADED_DATA.surveys) ? PRELOADED_DATA.surveys.length : 0;
  const webDisplay =
    (Array.isArray(PRELOADED_DATA.webBlazersBanners) ? PRELOADED_DATA.webBlazersBanners.length : 0) +
    (Array.isArray(PRELOADED_DATA.webRQBanners) ? PRELOADED_DATA.webRQBanners.length : 0) +
    (Array.isArray(PRELOADED_DATA.webPreRoll) ? PRELOADED_DATA.webPreRoll.length : 0);
  const tvRatings = Array.isArray(PRELOADED_DATA.tvRatings) ? PRELOADED_DATA.tvRatings.length : 0;
  return tv + organic + paid + surveys + webDisplay + tvRatings > 0;
}

function normalizeLoadedRows() {
  (DataStore.tvSignage || []).forEach(r => {
    try {
      if (r && r.Season) r.Season = normalizeSeasonLabel(r.Season);
      resolveAndTrackRaw(r, 'Brand', '_rawBrand');
    } catch(e) { console.warn('normalizeLoadedRows: skipped malformed TV row', e); }
  });

  Object.values(DataStore.organicSocial || {}).forEach(rows => {
    if (!Array.isArray(rows)) return;
    rows.forEach(r => {
      try {
        if (r.Season) r.Season = normalizeSeasonLabel(r.Season);
        resolveAndTrackRaw(r, 'Partner', '_rawPartner');
        resolveAndTrackRaw(r, 'Brand', '_rawBrand');
        if (r.PartnerExposureDate && !r._date) r._date = new Date(r.PartnerExposureDate);
        if (r._date && typeof r._date === 'string') r._date = new Date(r._date);
        if (!r._year && r._date instanceof Date && !isNaN(r._date)) r._year = r._date.getFullYear();
      } catch(e) { console.warn('normalizeLoadedRows: skipped malformed organic row', e); }
    });
  });

  Object.entries(DataStore.paidSocial || {}).forEach(([brand, rows]) => {
    if (!Array.isArray(rows)) return;
    rows.forEach(r => {
      try { normalizePaidRow(r, brand === UNASSIGNED_PAID_KEY ? '' : brand); }
      catch(e) { console.warn('normalizeLoadedRows: skipped malformed paid row', e); }
    });
  });

  if (Array.isArray(DataStore.surveys)) {
    DataStore.surveys.forEach(r => {
      try { resolveAndTrackRaw(r, 'Brand', '_rawBrand'); }
      catch(e) { console.warn('normalizeLoadedRows: skipped malformed survey row', e); }
    });
  }

  (DataStore.webBlazersBanners || []).forEach(r => {
    try { if (r) r.Brand = resolveCanonicalBrandName(r._rawPartner || r.Brand); }
    catch(e) { console.warn('normalizeLoadedRows: skipped malformed Blazers banner row', e); }
  });
  (DataStore.webRQBanners || []).forEach(r => {
    try { if (r) r.Brand = resolveCanonicalBrandName(r._rawAdvertiser || r.Brand); }
    catch(e) { console.warn('normalizeLoadedRows: skipped malformed RQ banner row', e); }
  });
  (DataStore.webPreRoll || []).forEach(r => {
    try {
      if (r) {
        r.Brand = resolveCanonicalBrandName(r._rawPartner || r.Brand);
        if (r.EventDate && typeof r.EventDate === 'string') r.EventDate = new Date(r.EventDate);
      }
    } catch(e) { console.warn('normalizeLoadedRows: skipped malformed pre-roll row', e); }
  });
}


function canonicalizeObjectRowsByBrand(sourceObj, primaryField = 'Partner') {
  const out = {};
  Object.entries(sourceObj || {}).forEach(([key, rows]) => {
    if (!Array.isArray(rows)) return;
    rows.forEach(r => {
      // Capture raw on first pass so subsequent passes can re-resolve from the original
      if (primaryField && r[primaryField] !== undefined && r[primaryField] !== null && r[primaryField] !== '' && !r._rawPartner) r._rawPartner = r[primaryField];
      if (r.Brand !== undefined && r.Brand !== null && r.Brand !== '' && !r._rawBrand) r._rawBrand = r.Brand;
      const source = r._rawPartner || r._rawBrand || r[primaryField] || r.Brand || key;
      const canonical = resolveCanonicalBrandName(source);
      if (primaryField && r[primaryField] !== undefined) r[primaryField] = canonical;
      if (r.Brand !== undefined) r.Brand = canonical;
      const groupKey = canonical || resolveCanonicalBrandName(key);
      if (!out[groupKey]) out[groupKey] = [];
      out[groupKey].push(r);
    });
  });
  return out;
}

function canonicalizeAllBrandData(skipAutoDetect = false) {
  (DataStore.tvSignage || []).forEach(r => resolveAndTrackRaw(r, 'Brand', '_rawBrand'));
  DataStore.organicSocial = canonicalizeObjectRowsByBrand(DataStore.organicSocial, 'Partner');
  const paidGrouped = {};
  Object.values(DataStore.paidSocial || {}).forEach(rows => {
    if (!Array.isArray(rows)) return;
    rows.forEach(r => {
      if (!r || r.Brand === UNASSIGNED_PAID_KEY || r.Partner === UNASSIGNED_PAID_LABEL) {
        const key = UNASSIGNED_PAID_KEY;
        if (!paidGrouped[key]) paidGrouped[key] = [];
        paidGrouped[key].push(r);
        return;
      }
      // Capture raw so re-canonicalization always starts from the original
      if (!r._rawBrand   && r.Brand)         r._rawBrand   = r.Brand;
      if (!r._rawPartner && r.Partner)       r._rawPartner = r.Partner;
      const source = r._rawBrand || r._rawPartner || r.ParsedPartner;
      const canonical = resolveCanonicalBrandName(source);
      r.Brand = canonical;
      r.Partner = canonical;
      if (r.ParsedPartner) r.ParsedPartner = resolveCanonicalBrandName(r.ParsedPartner);
      const key = canonical || UNASSIGNED_PAID_KEY;
      if (!paidGrouped[key]) paidGrouped[key] = [];
      paidGrouped[key].push(r);
    });
  });
  DataStore.paidSocial = paidGrouped;
  if (Array.isArray(DataStore.surveys)) {
    DataStore.surveys.forEach(r => resolveAndTrackRaw(r, 'Brand', '_rawBrand'));
  }
  // Zoomph arrays
  [DataStore.zoomphBrandPerf, DataStore.zoomphContentSeries, DataStore.zoomphAssets].forEach(arr => {
    (arr || []).forEach(r => resolveAndTrackRaw(r, 'Brand', '_rawBrand'));
  });
  // Affidavits — re-resolve from the raw partner name so blocked / changed aliases take effect
  (DataStore.affidavits || []).forEach(r => {
    if (r) r.Brand = resolveCanonicalBrandName(r._rawPartner || r.Brand);
  });
  // ANC LED Report — same pattern, re-resolve from the raw sponsor name
  (DataStore.ancLED || []).forEach(r => {
    if (r) r.Brand = resolveCanonicalBrandName(r._rawSponsor || r.Brand);
  });
  // Web & Digital — re-resolve from source partner / advertiser names.
  (DataStore.webBlazersBanners || []).forEach(r => {
    if (r) r.Brand = resolveCanonicalBrandName(r._rawPartner || r.Brand);
  });
  (DataStore.webRQBanners || []).forEach(r => {
    if (r) r.Brand = resolveCanonicalBrandName(r._rawAdvertiser || r.Brand);
  });
  (DataStore.webPreRoll || []).forEach(r => {
    if (r) r.Brand = resolveCanonicalBrandName(r._rawPartner || r.Brand);
  });
  if (currentBrand) currentBrand = resolveCanonicalBrandName(currentBrand);
  rebuildBrandRegistryFromData();
  if (!skipAutoDetect) applyAutoDetectedAliases();
}

// Detect word-prefix groupings from RAW brand names across all data sources,
// store them in DataStore.autoDetectedAliases, and re-canonicalize all data so
// brand registry reflects merged names. Detecting from raw (not from the post-
// merge brand registry) is critical: otherwise auto-detection becomes one-way
// and re-running it after a manual alias change would collapse the result.
// Idempotent. Call after every fresh upload or alias change.
function applyAutoDetectedAliases() {
  const blocks = DataStore.autoAliasBlocks instanceof Set
    ? DataStore.autoAliasBlocks
    : new Set(Array.isArray(DataStore.autoAliasBlocks) ? DataStore.autoAliasBlocks : []);

  // Collect every raw brand name we've ever ingested. Prefer _rawBrand / _rawPartner /
  // _rawSponsor when present; fall back to the current Brand/Partner field for legacy
  // rows that predate the raw-tracking change.
  const rawNames = new Set();
  const addFirstAvailable = (r, ...fields) => {
    if (!r) return;
    for (const f of fields) {
      const v = r[f];
      if (v && typeof v === 'string' && v.trim()) { rawNames.add(v); return; }
    }
  };
  (DataStore.tvSignage || []).forEach(r => addFirstAvailable(r, '_rawBrand', 'Brand'));
  Object.values(DataStore.organicSocial || {}).forEach(rows => {
    (rows || []).forEach(r => addFirstAvailable(r, '_rawPartner', '_rawBrand', 'Partner', 'Brand'));
  });
  Object.values(DataStore.paidSocial || {}).forEach(rows => {
    (rows || []).forEach(r => {
      if (!r || r.Brand === UNASSIGNED_PAID_KEY || r.Partner === UNASSIGNED_PAID_LABEL) return;
      addFirstAvailable(r, '_rawBrand', '_rawPartner', 'Brand', 'Partner');
    });
  });
  (DataStore.surveys || []).forEach(r => addFirstAvailable(r, '_rawBrand', 'Brand'));
  [DataStore.zoomphBrandPerf, DataStore.zoomphContentSeries, DataStore.zoomphAssets].forEach(arr => {
    (arr || []).forEach(r => addFirstAvailable(r, '_rawBrand', 'Brand'));
  });
  (DataStore.affidavits || []).forEach(r => addFirstAvailable(r, '_rawPartner', 'Brand'));
  (DataStore.ancLED || []).forEach(r => addFirstAvailable(r, '_rawSponsor', 'Brand'));
  (DataStore.webBlazersBanners || []).forEach(r => addFirstAvailable(r, '_rawPartner', 'Brand'));
  (DataStore.webRQBanners || []).forEach(r => addFirstAvailable(r, '_rawAdvertiser', 'Brand'));
  (DataStore.webPreRoll || []).forEach(r => addFirstAvailable(r, '_rawPartner', 'Brand'));

  // Resolve through manual aliases only (skip step 4 to avoid feedback loops)
  // so detection sees the post-manual but pre-auto-detect canonical set.
  const manualResolved = new Set();
  rawNames.forEach(n => {
    const c = resolveCanonicalBrandName(n, true);
    if (c) manualResolved.add(c);
  });

  const detected = detectWordPrefixGroups([...manualResolved], blocks);

  // ── Case / punctuation normalization ────────────────────────────────────────
  // Group names that share the same compact token (e.g. "COLUMBIA BANK" and
  // "Columbia Bank" both compact to "columbiabank"). Among each group pick a
  // canonical: prefer mixed-case (has both upper and lower) → shorter → alpha.
  const byCompact = {};
  manualResolved.forEach(n => {
    const key = compactBrandToken(n);
    if (!byCompact[key]) byCompact[key] = [];
    byCompact[key].push(n);
  });
  const caseScore = n => (/[a-z]/.test(n) && /[A-Z]/.test(n)) ? 0 : (/[a-z]/.test(n) ? 1 : 2);
  Object.values(byCompact).forEach(group => {
    if (group.length < 2) return;
    const canonical = group.slice().sort((a, b) => {
      const sd = caseScore(a) - caseScore(b);
      if (sd !== 0) return sd;
      const ld = a.length - b.length;
      if (ld !== 0) return ld;
      return a.localeCompare(b);
    })[0];
    group.forEach(n => { if (n !== canonical && !detected[n]) detected[n] = canonical; });
  });

  DataStore.autoDetectedAliases = detected;
  // Always re-canonicalize so row data picks up the (possibly different) auto-detection
  // result — even when detected is empty, this clears stale merges from row data.
  canonicalizeAllBrandData(true);
}

function rebuildBrandRegistryFromData() {
  DataStore.brands = new Set();
  DataStore.channelsByBrand = {};

  (DataStore.tvSignage || []).forEach(r => {
    if (r.Brand) DataStore.registerBrand(r.Brand, 'tv');
  });

  Object.entries(DataStore.organicSocial || {}).forEach(([brand, rows]) => {
    const inferred = (Array.isArray(rows) && rows[0] && rows[0].Partner) ? String(rows[0].Partner).trim() : brand;
    if (Array.isArray(rows) && rows.length) DataStore.registerBrand(inferred, 'organic');
  });

  Object.entries(DataStore.paidSocial || {}).forEach(([brand, rows]) => {
    if (brand !== UNASSIGNED_PAID_KEY && ((Array.isArray(rows) && rows.length) || rows)) DataStore.registerBrand(brand, 'paid');
  });

  if (Array.isArray(DataStore.surveys)) {
    const surveyBrands = new Set(DataStore.surveys.map(r => r.Brand).filter(Boolean));
    surveyBrands.forEach(b => DataStore.registerBrand(b, 'survey'));
  }

  // Zoomph organic social — all three arrays register the organic channel
  [...(DataStore.zoomphBrandPerf || []),
   ...(DataStore.zoomphContentSeries || []),
   ...(DataStore.zoomphAssets || [])].forEach(r => {
    if (r.Brand) DataStore.registerBrand(r.Brand, 'organic');
  });

  // Program survey — register sponsors so they appear in brand search even if no other channel data
  (DataStore.surveyPrograms || []).forEach(r => {
    if (r.Sponsor) DataStore.registerBrand(r.Sponsor, 'survey');
  });

  // Moda / Delta Dental specific survey — register partner question files as Survey Research
  (DataStore.surveyPartner || []).forEach(r => {
    if (r.Partner) DataStore.registerBrand(r.Partner, 'survey');
  });

  // General survey — register any manually-assigned partners
  (DataStore.surveyGeneral || []).forEach(r => {
    if (r._partner) DataStore.registerBrand(r._partner, 'survey');
  });

  // TV & Radio Affidavits — register the partner so the section + channel chip light up
  (DataStore.affidavits || []).forEach(r => {
    if (r.Brand) DataStore.registerBrand(r.Brand, 'affidavit');
  });

  // ANC LED Report — register the partner so the section + channel chip light up
  (DataStore.ancLED || []).forEach(r => {
    if (r.Brand) DataStore.registerBrand(r.Brand, 'ancLED');
  });

  // Virtual Signage Schedule — register brands from each game slot
  (DataStore.virtualSignageSchedule || []).forEach(g => {
    if (g.BrandA) DataStore.registerBrand(g.BrandA, 'virtualSignage');
    if (g.BrandB) DataStore.registerBrand(g.BrandB, 'virtualSignage');
  });

  // Web & Digital — register all display / pre-roll brands so channel chips,
  // partner browse, exports, and preloaded dashboards stay in sync.
  [...(DataStore.webBlazersBanners || []),
   ...(DataStore.webRQBanners || []),
   ...(DataStore.webPreRoll || [])].forEach(r => {
    if (r.Brand) DataStore.registerBrand(r.Brand, 'webDisplay');
  });
}

function loadPreloadedData() {
  if (!hasPreloadedData()) return false;
  DataStore.reset();
  DataStore.tvSignage = Array.isArray(PRELOADED_DATA.tvSignage) ? PRELOADED_DATA.tvSignage : [];
  DataStore.organicSocial = PRELOADED_DATA.organicSocial && typeof PRELOADED_DATA.organicSocial === 'object' ? PRELOADED_DATA.organicSocial : {};
  DataStore.paidSocial = PRELOADED_DATA.paidSocial && typeof PRELOADED_DATA.paidSocial === 'object' ? PRELOADED_DATA.paidSocial : {};
  DataStore.paidAssignmentRules = PRELOADED_DATA.paidAssignmentRules && typeof PRELOADED_DATA.paidAssignmentRules === 'object' ? PRELOADED_DATA.paidAssignmentRules : {};
  DataStore.brandMergeRules = { ...BRAND_ALIAS_DEFAULTS, ...(PRELOADED_DATA.brandMergeRules && typeof PRELOADED_DATA.brandMergeRules === 'object' ? PRELOADED_DATA.brandMergeRules : {}) };
  DataStore.surveys = Array.isArray(PRELOADED_DATA.surveys) ? PRELOADED_DATA.surveys : [];
  DataStore.surveyGeneral = Array.isArray(PRELOADED_DATA.surveyGeneral) ? PRELOADED_DATA.surveyGeneral : [];
  DataStore.surveyPartner = Array.isArray(PRELOADED_DATA.surveyPartner) ? PRELOADED_DATA.surveyPartner : [];
  DataStore.surveyPrograms = Array.isArray(PRELOADED_DATA.surveyPrograms) ? PRELOADED_DATA.surveyPrograms : [];
  DataStore.surveyGeneralAssignmentRules = PRELOADED_DATA.surveyGeneralAssignmentRules && typeof PRELOADED_DATA.surveyGeneralAssignmentRules === 'object' ? PRELOADED_DATA.surveyGeneralAssignmentRules : {};
  DataStore.zoomphBrandPerf = Array.isArray(PRELOADED_DATA.zoomphBrandPerf) ? PRELOADED_DATA.zoomphBrandPerf : [];
  DataStore.zoomphContentSeries = Array.isArray(PRELOADED_DATA.zoomphContentSeries) ? PRELOADED_DATA.zoomphContentSeries : [];
  DataStore.zoomphAssets = Array.isArray(PRELOADED_DATA.zoomphAssets) ? PRELOADED_DATA.zoomphAssets : [];
  DataStore.partnerRoster = Array.isArray(PRELOADED_DATA.partnerRoster) ? PRELOADED_DATA.partnerRoster : [];
  DataStore.affidavits = Array.isArray(PRELOADED_DATA.affidavits) ? PRELOADED_DATA.affidavits : [];
  DataStore.ancLED = Array.isArray(PRELOADED_DATA.ancLED) ? PRELOADED_DATA.ancLED : [];
  DataStore.virtualSignageSchedule = Array.isArray(PRELOADED_DATA.virtualSignageSchedule) ? PRELOADED_DATA.virtualSignageSchedule : [];
  DataStore.webBlazersBanners = Array.isArray(PRELOADED_DATA.webBlazersBanners) ? PRELOADED_DATA.webBlazersBanners : [];
  DataStore.webRQBanners = Array.isArray(PRELOADED_DATA.webRQBanners) ? PRELOADED_DATA.webRQBanners : [];
  DataStore.webPreRoll = Array.isArray(PRELOADED_DATA.webPreRoll) ? PRELOADED_DATA.webPreRoll : [];
  DataStore.tvRatings = Array.isArray(PRELOADED_DATA.tvRatings) ? PRELOADED_DATA.tvRatings : [];
  DataStore.loadedFiles = Array.isArray(PRELOADED_DATA.loadedFiles) ? PRELOADED_DATA.loadedFiles : [];
  DataStore.autoAliasBlocks = new Set(Array.isArray(PRELOADED_DATA.autoAliasBlocks) ? PRELOADED_DATA.autoAliasBlocks : []);
  DataStore.brandNameChanges = new Set(Array.isArray(PRELOADED_DATA.brandNameChanges) ? PRELOADED_DATA.brandNameChanges : []);
  normalizeLoadedRows();
  canonicalizeAllBrandData();
  // Restore user filter / toggle / sort presets last, so they apply to the freshly
  // canonicalized data. Navigation state (currentBrand, currentPage, currentPeriod)
  // is intentionally NOT restored — the dashboard always opens at Home.
  applyUserPresets(PRELOADED_DATA.userPresets);
  return true;
}

// Snapshot of every user-tunable filter / toggle / sort across the dashboard.
// Each entry is a top-level `let` declared in its respective module file —
// they all share the concatenated-script global scope.
function getCurrentUserPresets() {
  return {
    // TV signage / TV portfolio / home
    comparisonMode,
    homeLeaderboardMetric,
    locationPerformanceMetric,
    homePeriod,
    assetSortKey, assetSortDir,
    tableSortStates: { ...(tableSortStates || {}) },
    // Survey
    currentSurveyPhase, currentPartnerSurveyPhase,
    surveyPortfolioTab, surveyPortfolioPhase, surveyPortfolioPartnersOnly,
    surveyPortfolioSortKey, surveyPortfolioSortDir,
    surveyInsightsWave, surveyInsightsQuestion,
    surveyProgramsSubTab, surveyProgramsWave,
    // Paid portfolio
    paidPortfolioPeriod, paidPortfolioSortKey, paidPortfolioSortDir,
    paidPortfolioTableTab, paidPortfolioKpiMode, paidPortfolioChartPeriod,
    paidPortfolioDateMode, paidPortfolioMonth, paidPortfolioStartMonth, paidPortfolioEndMonth,
    paidPortfolioResultFilter,
    // Organic portfolio
    organicPortfolioTab, organicPortfolioDateMode, organicPortfolioMonth,
    organicPortfolioStartMonth, organicPortfolioEndMonth,
    organicPortfolioSortKey, organicPortfolioSortDir,
    // Partner page (organic)
    partnerOrganicDateMode, partnerOrganicMonth, partnerOrganicStartMonth, partnerOrganicEndMonth,
    // Partner browse
    partnerBrowseSearch, partnerBrowsePartnersOnly,
  };
}

function applyUserPresets(presets) {
  if (!presets || typeof presets !== 'object') return;
  const p = presets;
  if (p.comparisonMode !== undefined)              comparisonMode              = p.comparisonMode;
  if (p.homeLeaderboardMetric !== undefined)       homeLeaderboardMetric       = p.homeLeaderboardMetric;
  if (p.locationPerformanceMetric !== undefined)   locationPerformanceMetric   = p.locationPerformanceMetric;
  if (p.homePeriod !== undefined)                  homePeriod                  = p.homePeriod;
  if (p.assetSortKey !== undefined)                assetSortKey                = p.assetSortKey;
  if (p.assetSortDir !== undefined)                assetSortDir                = p.assetSortDir;
  if (p.tableSortStates && typeof p.tableSortStates === 'object') Object.assign(tableSortStates, p.tableSortStates);
  if (p.currentSurveyPhase !== undefined)          currentSurveyPhase          = p.currentSurveyPhase;
  if (p.currentPartnerSurveyPhase !== undefined)   currentPartnerSurveyPhase   = p.currentPartnerSurveyPhase;
  if (p.surveyPortfolioTab !== undefined)          surveyPortfolioTab          = p.surveyPortfolioTab;
  if (p.surveyPortfolioPhase !== undefined)        surveyPortfolioPhase        = p.surveyPortfolioPhase;
  if (p.surveyPortfolioPartnersOnly !== undefined) surveyPortfolioPartnersOnly = p.surveyPortfolioPartnersOnly;
  if (p.surveyPortfolioSortKey !== undefined)      surveyPortfolioSortKey      = p.surveyPortfolioSortKey;
  if (p.surveyPortfolioSortDir !== undefined)      surveyPortfolioSortDir      = p.surveyPortfolioSortDir;
  if (p.surveyInsightsWave !== undefined)          surveyInsightsWave          = p.surveyInsightsWave;
  if (p.surveyInsightsQuestion !== undefined)      surveyInsightsQuestion      = p.surveyInsightsQuestion;
  if (p.surveyProgramsSubTab !== undefined)        surveyProgramsSubTab        = p.surveyProgramsSubTab;
  if (p.surveyProgramsWave !== undefined)          surveyProgramsWave          = p.surveyProgramsWave;
  if (p.paidPortfolioPeriod !== undefined)         paidPortfolioPeriod         = p.paidPortfolioPeriod;
  if (p.paidPortfolioSortKey !== undefined)        paidPortfolioSortKey        = p.paidPortfolioSortKey;
  if (p.paidPortfolioSortDir !== undefined)        paidPortfolioSortDir        = p.paidPortfolioSortDir;
  if (p.paidPortfolioTableTab !== undefined)       paidPortfolioTableTab       = p.paidPortfolioTableTab;
  if (p.paidPortfolioKpiMode !== undefined)        paidPortfolioKpiMode        = p.paidPortfolioKpiMode;
  if (p.paidPortfolioChartPeriod !== undefined)    paidPortfolioChartPeriod    = p.paidPortfolioChartPeriod;
  if (p.paidPortfolioDateMode !== undefined)       paidPortfolioDateMode       = p.paidPortfolioDateMode;
  if (p.paidPortfolioMonth !== undefined)          paidPortfolioMonth          = p.paidPortfolioMonth;
  if (p.paidPortfolioStartMonth !== undefined)     paidPortfolioStartMonth     = p.paidPortfolioStartMonth;
  if (p.paidPortfolioEndMonth !== undefined)       paidPortfolioEndMonth       = p.paidPortfolioEndMonth;
  if (p.paidPortfolioResultFilter !== undefined)   paidPortfolioResultFilter   = p.paidPortfolioResultFilter;
  if (p.organicPortfolioTab !== undefined)         organicPortfolioTab         = p.organicPortfolioTab;
  if (p.organicPortfolioDateMode !== undefined)    organicPortfolioDateMode    = p.organicPortfolioDateMode;
  if (p.organicPortfolioMonth !== undefined)       organicPortfolioMonth       = p.organicPortfolioMonth;
  if (p.organicPortfolioStartMonth !== undefined)  organicPortfolioStartMonth  = p.organicPortfolioStartMonth;
  if (p.organicPortfolioEndMonth !== undefined)    organicPortfolioEndMonth    = p.organicPortfolioEndMonth;
  if (p.organicPortfolioSortKey !== undefined)     organicPortfolioSortKey     = p.organicPortfolioSortKey;
  if (p.organicPortfolioSortDir !== undefined)     organicPortfolioSortDir     = p.organicPortfolioSortDir;
  if (p.partnerOrganicDateMode !== undefined)      partnerOrganicDateMode      = p.partnerOrganicDateMode;
  if (p.partnerOrganicMonth !== undefined)         partnerOrganicMonth         = p.partnerOrganicMonth;
  if (p.partnerOrganicStartMonth !== undefined)    partnerOrganicStartMonth    = p.partnerOrganicStartMonth;
  if (p.partnerOrganicEndMonth !== undefined)      partnerOrganicEndMonth      = p.partnerOrganicEndMonth;
  if (p.partnerBrowseSearch !== undefined)         partnerBrowseSearch         = p.partnerBrowseSearch;
  if (p.partnerBrowsePartnersOnly !== undefined)   partnerBrowsePartnersOnly   = p.partnerBrowsePartnersOnly;
}

function getSerializableDataStore() {
  return {
    tvSignage: DataStore.tvSignage || [],
    organicSocial: DataStore.organicSocial || {},
    paidSocial: DataStore.paidSocial || {},
    paidAssignmentRules: DataStore.paidAssignmentRules || {},
    brandMergeRules: DataStore.brandMergeRules || {},
    surveys: DataStore.surveys || [],
    surveyGeneral: DataStore.surveyGeneral || [],
    surveyPartner: DataStore.surveyPartner || [],
    surveyPrograms: DataStore.surveyPrograms || [],
    surveyGeneralAssignmentRules: DataStore.surveyGeneralAssignmentRules || {},
    zoomphBrandPerf: DataStore.zoomphBrandPerf || [],
    zoomphContentSeries: DataStore.zoomphContentSeries || [],
    zoomphAssets: DataStore.zoomphAssets || [],
    partnerRoster: DataStore.partnerRoster || [],
    affidavits: DataStore.affidavits || [],
    ancLED: DataStore.ancLED || [],
    virtualSignageSchedule: DataStore.virtualSignageSchedule || [],
    webBlazersBanners: DataStore.webBlazersBanners || [],
    webRQBanners: DataStore.webRQBanners || [],
    webPreRoll: DataStore.webPreRoll || [],
    tvRatings: DataStore.tvRatings || [],
    // Only successful ingests carry data worth round-tripping; error log lines stay session-only
    loadedFiles: (DataStore.loadedFiles || []).filter(f => f && f.success !== false),
    autoAliasBlocks: [...(DataStore.autoAliasBlocks instanceof Set ? DataStore.autoAliasBlocks : [])],
    brandNameChanges: [...(DataStore.brandNameChanges instanceof Set ? DataStore.brandNameChanges : [])],
    userPresets: getCurrentUserPresets()
  };
}

function sanitizeFilenamePart(value) {
  return String(value || 'dashboard')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'dashboard';
}

function replaceExportBlock(html, startName, endName, replacement) {
  const re = new RegExp('/\\* ' + startName + ' \\*/[\\s\\S]*?/\\* ' + endName + ' \\*/');
  return html.replace(re, replacement);
}

function safeJSONStringify(value, space) {
  return JSON.stringify(value, null, space)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function exportPreloadedDashboard() {
  if (!DataStore.hasAnyData()) {
    showErrorToast('Load TV, social, or other dashboard data before exporting a preloaded copy.');
    return;
  }

  const nextMeta = { ...DASHBOARD_META };
  const label = prompt('Latest update label shown in the shared dashboard:', nextMeta.latestUpdateLabel || '');
  if (label !== null) nextMeta.latestUpdateLabel = label.trim() || nextMeta.latestUpdateLabel;
  const date = prompt('Latest update date, optional:', nextMeta.latestUpdateDate || '');
  if (date !== null) nextMeta.latestUpdateDate = date.trim();
  const notes = prompt('Update notes shown on the Home page, optional:', nextMeta.updateNotes || '');
  if (notes !== null) nextMeta.updateNotes = notes.trim();

  const viewerMode = document.getElementById('exportViewerMode') ? document.getElementById('exportViewerMode').checked : true;
  const payload = getSerializableDataStore();
  let html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

  const compressed = LZString.compressToBase64(JSON.stringify(payload));
  html = replaceExportBlock(html, 'PRELOADED_DATA_START', 'PRELOADED_DATA_END',
    '/* PRELOADED_DATA_START */\nconst PRELOADED_DATA = JSON.parse(LZString.decompressFromBase64(\'' + compressed + '\'));\n/* PRELOADED_DATA_END */');
  html = replaceExportBlock(html, 'DASHBOARD_META_START', 'DASHBOARD_META_END',
    '/* DASHBOARD_META_START */\nconst DASHBOARD_META = ' + safeJSONStringify(nextMeta, 2) + ';\n/* DASHBOARD_META_END */');
  html = replaceExportBlock(html, 'VIEWER_MODE_START', 'VIEWER_MODE_END',
    '/* VIEWER_MODE_START */\nconst VIEWER_MODE = ' + (viewerMode ? 'true' : 'false') + ';\n/* VIEWER_MODE_END */');

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  const stamp = sanitizeFilenamePart(nextMeta.latestUpdateLabel || nextMeta.latestUpdateDate || new Date().toISOString().slice(0, 10));
  a.href = URL.createObjectURL(blob);
  a.download = `partneriq-preloaded-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function applyViewerMode() {
  const isViewer = typeof VIEWER_MODE !== 'undefined' && VIEWER_MODE === true;
  const dataBtn = document.getElementById('dataBtn');
  if (dataBtn) dataBtn.style.display = isViewer ? 'none' : '';
  // Hide import section in modal for viewer mode
  const dropzone = document.getElementById('dropzone');
  if (dropzone) dropzone.style.display = isViewer ? 'none' : '';
  const loadMockBtn = document.getElementById('loadMockBtn');
  if (loadMockBtn) loadMockBtn.style.display = isViewer ? 'none' : '';
}

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_BRANDS = [
  { name: 'Aurora Athletics', channels: ['tv', 'organic', 'paid'] },
  { name: 'Northwind Financial', channels: ['tv', 'organic'] },
  { name: 'Kestrel Automotive', channels: ['tv', 'organic', 'paid', 'survey'] },
  { name: 'Meridian Energy', channels: ['tv', 'organic'] },
  { name: 'Halcyon Beverages', channels: ['tv', 'organic', 'paid'] },
  { name: 'Ironclad Insurance', channels: ['tv'] },
  { name: 'Verdant Foods', channels: ['organic', 'paid'] },
  { name: 'Polaris Tech', channels: ['tv', 'organic', 'paid', 'survey'] },
];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateMockData() {
  DataStore.reset();
  const seasons = ['2022-23', '2023-24', '2024-25'];
  const locations = ['Field Perimeter', 'Dasher Board', 'LED Ribbon', 'Jumbotron', 'Camera Visible', 'Jersey Patch'];
  const tools = ['Broadcast', 'Stream', 'Highlight'];

  MOCK_BRANDS.forEach((brand, bIdx) => {
    const rand = seededRandom(bIdx * 1000 + 7);

    if (brand.channels.includes('tv')) {
      seasons.forEach((season, sIdx) => {
        const matchCount = Math.floor(rand() * 20 + 15);
        const yearFactor = 0.75 + sIdx * 0.15 + rand() * 0.1;
        // vary asset quality per brand so rankings differ
        const assetBias = {};
        locations.forEach(l => assetBias[l] = 0.5 + rand() * 1.2);

        for (let i = 0; i < matchCount; i++) {
          const loc = locations[Math.floor(rand() * locations.length)];
          const bias = assetBias[loc];
          const exposures = Math.floor(rand() * 80 + 20);
          const duration = Math.floor(rand() * 600 + 120);
          const impressions = Math.floor((rand() * 500000 + 200000) * yearFactor * bias);
          const mediaValue = Math.floor((rand() * 45000 + 8000) * yearFactor * bias);
          const qiScore = 45 + rand() * 45;
          DataStore.tvSignage.push({
            Brand: brand.name,
            Tool: tools[Math.floor(rand() * tools.length)],
            Location: loc,
            Event: `Event ${Math.floor(rand() * 20 + 1)}`,
            Matchday: i + 1,
            Matchdate: `${2022 + sIdx}-${String(Math.floor(rand() * 12) + 1).padStart(2, '0')}-${String(Math.floor(rand() * 28) + 1).padStart(2, '0')}`,
            Match: `Team A vs Team B`,
            'Source Exposures': exposures,
            'Total Exposures': exposures,
            'Source Duration': duration,
            'Total Duration': duration,
            'Sponsorship Impressions': impressions,
            '100% Media Value ($)': mediaValue,
            'QI Media Value ($)': Math.floor(mediaValue * (qiScore / 100)),
            'QI Score': qiScore,
            'Sponsorship QI Impressions': Math.floor(impressions * (qiScore / 100)),
            'Share of Voice (%)': 2 + rand() * 18,
            Season: season,
            'Duration (Minutes)': duration / 60,
            'QIMV per Minute': Math.floor(mediaValue * (qiScore / 100) / (duration / 60 + 0.1)),
          });
          DataStore.registerBrand(brand.name, 'tv');
        }
      });
    }

    if (brand.channels.includes('organic')) {
      const posts = [];
      const contentTypes = ['Post', 'Story', 'Reel', 'Video'];
      const services = ['Instagram', 'TikTok', 'X', 'YouTube', 'Facebook'];
      const sentiments = ['Positive', 'Positive', 'Positive', 'Neutral', 'Neutral', 'Negative'];
      seasons.forEach((season, sIdx) => {
        const postCount = Math.floor(rand() * 60 + 40);
        const yearFactor = 0.7 + sIdx * 0.2 + rand() * 0.1;
        for (let i = 0; i < postCount; i++) {
          const monthOffset = Math.floor(rand() * 12);
          const date = new Date(2022 + sIdx, monthOffset, Math.floor(rand() * 28) + 1);
          const impressions = Math.floor((rand() * 800000 + 50000) * yearFactor);
          const engagement = Math.floor(impressions * (rand() * 0.08 + 0.01));
          posts.push({
            Id: `${brand.name.slice(0,3)}-${sIdx}-${i}`,
            Partner: brand.name,
            PartnerMentionType: rand() > 0.5 ? 'Tag' : 'Logo',
            ServiceType: services[Math.floor(rand() * services.length)],
            ContentType: contentTypes[Math.floor(rand() * contentTypes.length)],
            PartnerExposureDate: date.toISOString(),
            Impressions: impressions,
            OrganicImpressions: Math.floor(impressions * 0.8),
            PaidImpressions: Math.floor(impressions * 0.2),
            Reach: Math.floor(impressions * 0.6),
            Engagement: engagement,
            EngagementRate: engagement / impressions,
            LikeCount: Math.floor(engagement * 0.6),
            CommentCount: Math.floor(engagement * 0.15),
            ShareCount: Math.floor(engagement * 0.1),
            ViewCount: Math.floor(impressions * 0.4),
            Sentiment: sentiments[Math.floor(rand() * sentiments.length)],
            BrandExposureValue: Math.floor((rand() * 12000 + 500) * yearFactor),
            PostValue: Math.floor((rand() * 15000 + 800) * yearFactor),
            FollowerCount: Math.floor(rand() * 5000000 + 100000),
            FollowerInteractionRate: rand() * 0.05,
            LogoImpressions: Math.floor(impressions * 0.7),
            LogoTotalSeconds: Math.floor(rand() * 30 + 2),
            Season: season,
            _date: date,
            _year: date.getFullYear(),
          });
        }
      });
      DataStore.organicSocial[brand.name] = posts;
      DataStore.registerBrand(brand.name, 'organic');
    }

    if (brand.channels.includes('paid')) {
      const paidRows = [];
      seasons.forEach((season, sIdx) => {
        const [startYear] = season.split('-').map(Number);
        const campaignCount = Math.floor(rand() * 4 + 3);
        for (let c = 0; c < campaignCount; c++) {
          const month = 6 + Math.floor(rand() * 12);
          const year = month > 11 ? startYear + 1 : startYear;
          const realMonth = month % 12;
          const start = new Date(year, realMonth, Math.floor(rand() * 20) + 1);
          const end = new Date(start); end.setDate(start.getDate() + Math.floor(rand() * 20) + 7);
          const impressions = Math.floor((rand() * 900000 + 80000) * (0.8 + sIdx * 0.16));
          const reach = Math.floor(impressions * (0.45 + rand() * 0.35));
          const clicks = Math.floor(impressions * (0.004 + rand() * 0.018));
          const spend = Math.floor((rand() * 22000 + 2500) * (0.85 + sIdx * 0.12));
          const results = Math.floor(clicks * (0.08 + rand() * 0.28));
          const row = {
            Brand: brand.name,
            'Reporting starts': start.toISOString().slice(0, 10),
            'Reporting ends': end.toISOString().slice(0, 10),
            'Campaign name': `${brand.name} | Paid Social | ${season} | Campaign ${c + 1}`,
            'Campaign delivery': rand() > 0.12 ? 'completed' : 'active',
            'Ad set budget': spend,
            'Ad set budget type': 'Lifetime',
            'Attribution setting': '7-day click or 1-day view',
            Results: results,
            'Result indicator': rand() > 0.5 ? 'Landing page views' : 'Link clicks',
            Reach: reach,
            Impressions: impressions,
            'Link clicks': clicks,
            'Unique link clicks': Math.floor(clicks * (0.72 + rand() * 0.2)),
            'CTR (link click-through rate)': impressions > 0 ? clicks / impressions : 0,
            'Cost per results': results > 0 ? spend / results : 0,
            Starts: start.toISOString().slice(0, 10),
            Ends: end.toISOString().slice(0, 10),
            'Amount spent (USD)': spend,
          };
          paidRows.push(normalizePaidRow(row, brand.name));
        }
      });
      DataStore.paidSocial[brand.name] = paidRows;
      DataStore.registerBrand(brand.name, 'paid');
    }
    if (brand.channels.includes('survey')) DataStore.registerBrand(brand.name, 'survey');
  });
}

// ============================================================
// HELPERS
// ============================================================
function sum(arr, key) { return arr.reduce((a, r) => a + (Number(r[key]) || 0), 0); }
function avg(arr, key) { return arr.length ? sum(arr, key) / arr.length : 0; }

function parseMetricValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[,$]/g, '').trim();
  if (!cleaned || cleaned === '—') return 0;
  const n = Number(cleaned.replace(/%$/, ''));
  return Number.isFinite(n) ? n : 0;
}

function parsePercentValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value > 1 ? value / 100 : value;
  const str = String(value).trim();
  if (!str) return 0;
  const n = Number(str.replace('%', '').replace(',', ''));
  if (!Number.isFinite(n)) return 0;
  return str.includes('%') || n > 1 ? n / 100 : n;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function fiscalSeasonFromDate(value) {
  const d = parseDateValue(value);
  if (!d) return null;
  const y = d.getFullYear();
  const startYear = d.getMonth() >= 6 ? y : y - 1;
  const endYear = String(startYear + 1).slice(-2);
  return `${startYear}-${endYear}`;
}

function normalizeSeasonLabel(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[\u2013\u2014]/g, '-');

  // Normalize labels like "NBA 2024-2025", "2024-2025", "FY 2024/25", etc.
  const rangeMatch = cleaned.match(/((?:19|20)\d{2})\s*[-\/]\s*((?:19|20)?\d{2})/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    let end = String(rangeMatch[2]);
    if (end.length === 4) end = end.slice(-2);
    end = end.padStart(2, '0');
    return `${start}-${end}`;
  }

  return cleaned;
}


const UNASSIGNED_PAID_KEY = '__UNASSIGNED_PAID__';
const UNASSIGNED_PAID_LABEL = 'Unassigned Paid Social';
let paidRowIdCounter = 1;
let paidAssignmentReviewGroups = [];
