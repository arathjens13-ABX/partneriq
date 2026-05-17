# PartnerIQ — Claude Guidelines

A quick reference for working on this codebase. Read this before making any changes.

---

## Required: Planning before every change

**Before writing any code, Claude must state a plan.** The format scales with scope:

**Small change (single file, cosmetic):**
> Files touched: `10_tv_section.js`
> What changes: Update chart axis label copy.
> Risk: None — no shared functions modified.

**Medium change (logic or new UI element):**
> Files touched: `13_survey_section.js`, `15_wiring.js`
> What changes: Add a new collapsible sub-section. Needs a slot in the section HTML and an event listener in wiring.
> Functions affected: `renderSurveySection()`
> Risk: Must call `wireSectionToggles()` after render or the section won't open.

**Large change (new channel, new page, DataStore modification):**
> Use the relevant checklist from the bottom of this file. Tick each step explicitly before writing code.
> Name every high-blast-radius function (see table below) that is touched and state what downstream behavior is expected to remain unchanged.

Do not start writing code until the plan is confirmed or the user says to proceed.

**Function map maintenance rule:** Any time a function is added, removed, or renamed — in any file — the corresponding sub-table in the **Function / Code Map** section must be updated in the same session before the work is considered done. This is non-negotiable: a stale map is worse than no map.

---

## What this project is

PartnerIQ is a **fully offline, single-file HTML dashboard** for sports partnership analytics. It runs entirely in the browser with no server, no build step, and no external calls. All data is loaded locally via CSV drag-and-drop or embedded in the file at export time.

The codebase is a set of numbered `.js` and `.css` files that are concatenated into `shell.html` at distribution time. Each file has a clear responsibility:

| File | Responsibility |
|------|---------------|
| `00_vendor_shims.js` | Vendored libraries (PapaParse CSV shim, LZ-string compression) |
| `01_styles.css` | All CSS, design tokens, theme variables |
| `02_constants.js` | Global constants, `DASHBOARD_META`, `PRELOADED_DATA`, `VIEWER_MODE` |
| `03_changelog.js` | Full version history array |
| `04_datastore.js` | `DataStore` object, file ingest, import/export, preloaded data hydration |
| `05_paid_constants.js` | Paid social campaign parsing constants and alias maps |
| `06_helpers.js` | Shared formatting and utility functions |
| `07_paid_assignment.js` | Paid campaign-to-partner assignment logic |
| `08_home_pages.js` | Home page, partner browse, data health, glossary, changelog renderers |
| `09_app_core.js` | `renderApp()`, routing, partner page shell, channel tag nav |
| `10_tv_section.js` | TV Visible Signage section and portfolio page |
| `11_portfolio_pages.js` | Portfolio-level pages (TV, Paid, Organic, Survey portfolios) |
| `12_paid_section.js` | Paid Social partner section |
| `13_survey_section.js` | Survey Research partner section |
| `14_organic_section.js` | Organic Social section, file ingest helpers |
| `15_wiring.js` | All event listener wiring, modal logic, app init |
| `16_report_template.js` | PDF partner report template |
| `17_general_survey_assignment.js` | General survey question-to-partner assignment |
| `18_affidavits_section.js` | TV/Radio Affidavits section |
| `19_anc_led_section.js` | ANC LED section |
| `20_virtual_signage_section.js` | On-Court Virtual Signage — schedule ingest, home/away estimation engine (`vsConservativeEstimate`, `computeVSLocationMeans`), portfolio and partner-page renderers |
| `21_web_digital_section.js` | Web & Digital — Blazers.com banner ingest, RoseQuarter.com banner ingest, pre-roll video ingest, partner-page renderer; three `DataStore` keys: `webBlazersBanners`, `webRQBanners`, `webPreRoll` |
| `22_tv_ratings_section.js` | TV Ratings Dashboard — Nielsen broadcast viewership data; `DataStore.tvRatings[]`; **file format WILL change** — detection is column-schema-based (`HH Rtg` + `Demo` + `Opponent`), ingest and normalize logic is in `14_organic_section.js`; data source: DW > vw_viewership > vw_nielsen_tv_metrics |
| `shell.html` | Static HTML shell — `<header>`, `<main id="main">`, all modal backdrops (import/export, paid assignment review, general survey review, brand alias manager, report modal), footer; concatenated with the JS/CSS files at export time |

---

## 🚨 Forbidden patterns — never introduce these

| Pattern | Why |
|---------|-----|
| `fetch()` to any remote URL | Breaks the offline-first guarantee |
| `<script src="...">` CDN tags | No external calls — ever |
| `localStorage` / `sessionStorage` | Data lives in DataStore only |
| ES module `import` / `export` | Everything is global scope by design |
| `<form>` elements | Cause page reloads; use `onclick`/`onchange` |
| `npm`, `node_modules`, any build tool | No build step — ever |
| Hardcoded hex colors or font stacks in JS | Use CSS variables only (see table below) |
| Navigation state in `PRELOADED_DATA` | Dashboard always opens at Home |

---

## ⚠️ High-blast-radius functions

Changes to these affect the entire app. Flag them in your plan and state what downstream behavior will remain unchanged.

| Function | File | What it affects |
|----------|------|----------------|
| `renderApp()` | `09_app_core.js` | Every page render — all routing flows through here |
| `detectFileType()` | `14_organic_section.js` | All file ingestion — wrong detection silently drops data |
| `canonicalizeAllBrandData()` | `04_datastore.js` | Brand name resolution across every channel |
| `getSerializableDataStore()` | `04_datastore.js` | Export — missing keys means data loss on reload |
| `hydrateFromPreloaded()` | `04_datastore.js` | Import — missing keys means data loss on load |
| `wireSortableTables()` | `07_paid_assignment.js` | All table sort interactivity |
| `wireSectionToggles()` | `06_helpers.js` | All collapsible section open/close |
| `normalizeSeasonLabel()` | `04_datastore.js` | Season matching across TV, paid, and survey |

---

## ✅ DOs

### Architecture
- **Keep everything in a single concatenated file.** All JS shares a global scope — functions defined in one file are available in all others. This is intentional.
- **Follow the numbered file convention.** New feature files get the next number in sequence. New sections on partner pages get their own `_section.js` file.
- **Use CSS variables for all colors and typography.** See the quick-reference table below.
- **Render to DOM slots.** Each partner page section targets a dedicated `<div id="xxx-slot">`. Sections are independent of each other.
- **Use `renderApp()` to re-render.** All state changes should end with `renderApp()`.
- **Persist rules and presets in `DataStore`.** Serialized via `getSerializableDataStore()`.
- **Gate sections on data availability.** Always check `DataStore.hasAnyData()` or a channel-specific guard before rendering.

### Data & Files
- **Use `detectFileType(filename, rows)`** to identify uploaded files. Extend this function for new file types.
- **Use `normalizeSeasonLabel()`** whenever reading or storing season strings.
- **Use `resolveAndTrackRaw(row, col, rawCol)`** when canonicalizing brand names.
- **Register every new brand** with `DataStore.registerBrand(brand, channel)`.

### DataStore safety checklist
Any time you add or rename a key in `DataStore`, tick all four before finishing:
- [ ] `DataStore` initial declaration / `reset()`
- [ ] `getSerializableDataStore()` — included in exports
- [ ] `hydrateFromPreloaded()` — restored on load
- [ ] **Function / Code Map** — update the `04_datastore.js` sub-table if any functions were added or changed

### Export / Sharing
- **Use the three injection blocks** (`PRELOADED_DATA_START/END`, `DASHBOARD_META_START/END`, `VIEWER_MODE_START/END`). Never write data outside them.
- **Always call `safeJSONStringify()`** instead of `JSON.stringify()` in export HTML.

### UI Conventions
- **Collapsible sections** use `.collapsible` class + `wireSectionToggles()`.
- **Sortable tables** use `data-sort-key` / `data-sort-dir` on `<th>` + `wireSortableTables()`.
- **KPI cards** reuse `.kpi` — don't build a new structure.
- **Metric toggles** persist in `userPresets` via `getCurrentUserPresets()` / `applyUserPresets()`.
- **Before building a new chart**, check `10_tv_section.js` and `13_survey_section.js` for an existing SVG pattern to adapt.

---

## ❌ DON'Ts

- Don't mutate `PRELOADED_DATA` directly — hydrate it into `DataStore` only.
- Don't hardcode partner names in rendering logic.
- Don't add nav buttons to the header — navigation lives on Home page quick links.
- Don't show upload controls in viewer mode — `applyViewerMode()` handles this.
- Don't skip alias resolution — call `canonicalizeAllBrandData()` after loading data or changing alias rules.
- Don't duplicate KPI card structures — reuse `.kpi`.

---

## Scoped context — what to read per task

For small changes, don't scan the whole codebase. Use this table:

| Task | Files to read |
|------|--------------|
| Fix a label, number format, or copy string | Section file only + `06_helpers.js` if formatting |
| Change chart appearance | Section file + `01_styles.css` |
| Add a KPI card | Section file only |
| Add a collapsible section | Section file + `15_wiring.js` |
| Add a new portfolio page | `08_home_pages.js` + `09_app_core.js` + `15_wiring.js` |
| Change file ingest logic | `14_organic_section.js` + `04_datastore.js` |
| Add a DataStore key | `04_datastore.js` only — then run the 3-point checklist |
| Add a new data channel | Full checklist at the bottom of this file |

---

## CSS variable quick-reference

| Variable | Use |
|----------|-----|
| `var(--bg)` | Page background |
| `var(--bg-elev)` | Card / elevated surface |
| `var(--bg-elev-2)` | Hover state on elevated surfaces |
| `var(--border)` | Standard border |
| `var(--border-soft)` | Subtle divider |
| `var(--text)` | Primary text |
| `var(--text-dim)` | Secondary text |
| `var(--text-muted)` | Tertiary / label text |
| `var(--brand-red)` | Accent — highlights, active states, chart lines |
| `var(--positive)` | Positive delta (green) |
| `var(--negative)` | Negative delta (red) |
| `var(--font-mono)` | Monospace — labels, kickers, numbers |
| `var(--font-sans)` | Body / UI font |

---

## Common operation recipes

### Add a KPI card to a section
```html
<div class="kpi">
  <div class="kpi-label">Label</div>
  <div class="kpi-value">${formatCurrency(value)}</div>
  <div class="kpi-change ${delta >= 0 ? 'up' : 'down'}">${formatSignedPercent(delta)} YoY</div>
</div>
```
No wiring needed — KPI cards are static.

### Add a new collapsible section
```html
<section class="section collapsible ${isOpen ? 'open' : ''}" id="${sectionId}">
  <div class="section-header" data-toggle="${sectionId}">
    <h2 class="section-title">Title</h2>
    <span class="section-toggle">${isOpen ? '▼' : '▶'}</span>
  </div>
  <div class="section-body">
    <!-- content -->
  </div>
</section>
```
Then call `wireSectionToggles()` at the end of the render function. Track state via `openSections[sectionId]`.

### Add a new portfolio-level page
1. Add `renderXxxPortfolioPage(container)` in `08_home_pages.js` or a new file.
2. Add a routing branch in `renderApp()` (`09_app_core.js`):
   ```js
   else if (currentPage === 'xxx') renderXxxPortfolioPage(main);
   ```
3. Add a home quick link card in `renderPortfolioHome()` (`08_home_pages.js`).
4. Update `CHANGELOG`.

---

## Changelog entry template

Add at the **top** of the `CHANGELOG` array in `03_changelog.js`:

```js
{
  version: 'v0.XX',
  date: 'Month YYYY',
  source: 'Claude',          // 'Claude' | 'GPT' | 'Manual'
  title: 'Short session title',
  changes: [
    {
      category: 'Category Name',
      items: [
        `Description of change one`,
        `Description of change two`,
      ]
    }
  ]
},
```

---

## File naming conventions for CSV uploads

| File type | Filename pattern |
|-----------|-----------------|
| TV Visible Signage | Contains `TV`, `signage`, or `visible` |
| Organic — Partner Performance | Starts with `BrandedPartnerPerformance` |
| Organic — Content Series | Starts with `BrandedContentSeries` |
| Organic — Brand on Asset | Starts with `BrandOnAsset` |
| Survey (brand recall) | Starts with `Survey_` |
| Fan Insights (general survey) | Starts with `GeneralSurvey_` |
| Partner survey questions | Starts with `ModaDeltaDental_` |
| Programs & community | Starts with `Program_` |
| Partner roster | Starts with `Partners_` |
| Paid Social | Contains `paid`, `meta`, `facebook`, or `admanager` |
| TV/Radio Affidavit | Detected by column schema |
| ANC LED | Detected by column schema |

---

## Key global state variables

| Variable | Lives in | Purpose |
|----------|----------|---------|
| `currentBrand` | `09_app_core.js` | Currently viewed partner (null = portfolio/home) |
| `currentPage` | `09_app_core.js` | Active portfolio page (`'tv'`, `'paid'`, `'organic'`, `'survey'`, etc.) |
| `currentPeriod` | `09_app_core.js` | Active season filter |
| `comparisonMode` | `09_app_core.js` | `'auto-match'` or `'full'` for YoY comparisons |
| `VIEWER_MODE` | `02_constants.js` | `true` hides upload controls in distributed files |
| `DASHBOARD_META` | `02_constants.js` | Update label, date, notes, preparedBy — edit before exporting |
| `PRELOADED_DATA` | `02_constants.js` | Replaced by export tool; `null` in the working file |

---

## Function / Code Map

A per-file index of every significant function. Use this to jump directly to the right place without reading the whole codebase. Internal one-liner helpers are omitted; everything that drives a UI feature, data flow, or cross-file API is listed.

### `04_datastore.js` — DataStore, brand resolution, import/export

| Function | What it does |
|----------|-------------|
| `resolveCanonicalBrandName(value)` | Returns the canonical brand string for any raw name; applies alias rules and auto-detected prefix groups |
| `resolveAndTrackRaw(row, field, rawField)` | Canonicalizes one field in a row object and stores the original in `rawField` |
| `compactBrandToken(value)` | Lowercased, punctuation-stripped token used for fuzzy brand matching |
| `detectWordPrefixGroups(brandNames, blockedSet)` | Auto-detects brand families by shared word prefix (e.g. "Toyota Dealers" → "Toyota") |
| `getBrandMergeRules()` | Returns the active alias rules map from `DataStore.brandAliasRules` |
| `DataStore.reset()` | Clears all data arrays, rules, and presets back to defaults |
| `DataStore.registerBrand(name, channel)` | Adds a brand to the global brand registry for a given channel |
| `DataStore.getBrandList()` | Returns sorted array of all registered brands |
| `DataStore.hasAnyData()` | Guards rendering — returns `false` when nothing is loaded |
| `canonicalizeAllBrandData(skipAutoDetect)` | Runs `resolveAndTrackRaw` over every channel's rows — call after any data load or alias change |
| `rebuildBrandRegistryFromData()` | Clears and re-registers brands from all loaded rows; called by `canonicalizeAllBrandData` |
| `applyAutoDetectedAliases()` | Applies word-prefix group aliases across all channels |
| `normalizeSeasonLabel(str)` | Normalizes season strings to a canonical format for cross-channel matching |
| `normalizeLoadedRows()` | Post-load hook: type-coerces numeric/date columns across all channels |
| `getSerializableDataStore()` | Returns a plain object snapshot of DataStore for embedding in an export |
| `hydrateFromPreloaded(data)` | Restores DataStore from an embedded `PRELOADED_DATA` object on load |
| `loadPreloadedData()` | Top-level boot function: calls `hydrateFromPreloaded`, normalizes, canonicalizes |
| `getCurrentUserPresets()` | Serializes current UI toggles/filters for persistence |
| `applyUserPresets(presets)` | Restores UI state from a saved preset object |
| `exportPreloadedDashboard()` | Injects DataStore + meta into the HTML template and triggers download |
| `safeJSONStringify(value, space)` | `JSON.stringify` wrapper that handles circular refs and BigInt |
| `applyViewerMode()` | Hides all upload/edit controls when `VIEWER_MODE === true` |
| `generateMockData()` | Populates DataStore with seeded random demo data for testing |
| `canonicalizeObjectRowsByBrand(sourceObj, primaryField)` | Canonicalizes brand names inside a keyed object (used for paid social groups) |

---

### `05_paid_constants.js` — Formatting, paid parsing constants, brand data accessors

| Function | What it does |
|----------|-------------|
| `formatNum(n)` | Formats integers with commas; compact K/M for values ≥ 10 000 |
| `formatCurrency(n)` | `$` prefix + K/M compact formatting |
| `formatPct(n, digits)` | Multiplies by 100 and appends `%` |
| `pctChange(curr, prev)` | Returns a signed ratio `(curr - prev) / prev` or `null` |
| `escapeHTML(value)` | HTML-escapes a string for safe DOM injection |
| `normalizePartnerName(value)` | Lowercases and strips punctuation for partner name matching |
| `parseFlexibleSeasonToken(token)` | Recognizes a season token in canonical (2023-24), FY shorthand (FY24 / FY2024), long (2023-2024), or slash form (2024/25) and returns the canonical YYYY-YY form, or '' if not a season |
| `parsePaidCampaignName(campaignName, explicitPartner)` | Extracts partner, season, objective, and confidence from a structured campaign name string. Tolerant of `_`, `-`, and space separators; embedded brand prefixes match case- and punctuation-insensitively |
| `findRuleMatchInCampaign(campaignName)` | Checks saved assignment rules before heuristic parsing |
| `normalizePaidRow(row, fallbackBrand)` | Coerces a raw paid CSV row into a standardized paid row object |
| `getBrandTVData(brand, season)` | Returns TV signage rows for a brand/season (excludes virtual branding rows) |
| `getBrandSocialData(brand, season)` | Returns organic social rows for a brand/season |
| `getBrandPaidData(brand, season)` | Returns aggregated paid social rows for a brand/season |
| `getBrandPaidDailyRows(brand, season)` | Returns daily-granularity paid rows for pacing charts |
| `getPaidSeasons(brand)` | Returns distinct seasons present in paid data for a brand |
| `getPaidYoY(brand, period, key)` | Computes YoY delta for a paid metric key |

---

### `06_helpers.js` — YoY helpers, tooltips, ranking, shared wiring

| Function | What it does |
|----------|-------------|
| `showErrorToast(msg)` | Displays a brief in-app error notification (bottom-center toast, auto-dismisses after 4 s) |
| `getUniqueMatchdates(rows)` | Returns sorted unique Matchdate strings from a TV row set |
| `getMatchdateCountForBrandSeason(brand, season)` | Game count for a brand in a given season (used for YoY normalization) |
| `getMatchedPriorSeasonTVData(brand, priorSeason, matchdateLimit)` | Returns prior-season TV rows capped to the same game count as the current season |
| `getYoYRowSets(brand, period)` | Returns `{ current, prior }` TV row sets for a brand/period, prior normalized by matchdate count |
| `computeYoYForMetric(brand, period, metricKey)` | Returns `{ curr, prev, change }` for one TV metric |
| `getAssetRanking(location, season)` | Returns all brands sorted by QIMV for a given asset location |
| `getBrandRankOnAsset(brand, location, season)` | Returns ordinal rank of a brand on a specific asset |
| `getBrandOverallRank(brand, season)` | Returns a brand's overall TV rank across all locations |
| `showTooltip(event, html)` / `hideTooltip()` | Portal tooltip display — position next to cursor |
| `attachDefinitionTooltip(el, term)` | Attaches a glossary-definition tooltip to an element |
| `attachAssetRankTooltip(el, brand, location, season)` | Attaches a rank-context tooltip to a TV asset cell |
| `makeInfoIcon(term)` | Returns an `ⓘ` span wired to a definition tooltip |
| `wireInfoIcons(root)` | Wires all `.info-icon` elements inside `root` after render |
| `wireSectionToggles()` | Wires all `[data-section-toggle]` headers; toggles `openSections[id]` and re-renders |
| `getAllPaidRows()` | Flattens `DataStore.paidSocial` keyed object into a single flat array |
| `getPaidCampaignAssignmentGroups(onlyReview)` | Groups paid rows by campaign name; returns assignment status for review modal |
| `getPaidAssignmentSummary()` | Returns `{ total, high, medium, review, unassigned }` counts for the modal header |
| `renderPaidAssignmentReview()` | Renders the paid campaign assignment review table inside the modal |
| `openPaidAssignmentReview()` / `closePaidAssignmentReview()` | Show/hide the paid assignment modal |

---

### `07_paid_assignment.js` — Portfolio helpers, sorting, pacing, partner asset rendering

| Function | What it does |
|----------|-------------|
| `getTVRowsForPeriod(period)` | Returns TV rows for a period; strips virtual branding rows via `_isVBRow` |
| `getPortfolioSeasons()` | Returns sorted distinct seasons across TV + survey data |
| `getPortfolioLatestSeason()` | Returns the most recent season string |
| `getSocialRowsForPeriod(period)` | Returns organic social rows filtered to a period |
| `getPreviousPortfolioSeason(season)` | Returns the season immediately before the given one |
| `getPortfolioYoYRowSets(period)` | Returns `{ current, prior }` row sets for portfolio-level TV YoY |
| `getSelectedHomePeriod()` | Returns the active period selector value from the home page filter |
| `aggregateBy(rows, keyName)` | Groups an array of rows by a key and sums numeric columns |
| `pctChangeFromValues(curr, prev)` | Simple signed pct change; safe for zero/null inputs |
| `formatSignedPercent(change, opts)` | Formats a ratio as `+12.3 %` with sign; respects `invert` flag |
| `formatDurationFromMinutes(minutes)` | Converts a decimal minute count to `HH:MM:SS` |
| `renderSimpleLeaderboardTable(rows, columns, tableId)` | Builds a sortable leaderboard `<table>` from a rows + columns spec |
| `wireSortableTables()` | Binds click handlers on all `[data-sort-key]` `<th>` elements |
| `setTableSort(tableId, sortKey)` | Programmatically sets the sort state on a table |
| `getPartnerAssetsForSeason(brand, period)` | Returns asset-level TV stats for a brand in a period |
| `renderPartnerNameWithAssets(partnerName, period)` | Returns HTML for a partner name with asset badge chips |
| `addPartnerYoY(rows, period)` | Annotates leaderboard rows with YoY delta fields |

---

### `08_home_pages.js` — Home page, partner browse, portfolio home, utility pages

| Function | What it does |
|----------|-------------|
| `renderPortfolioHome(main)` | Renders the main home page with channel quick-link cards and season filter |
| `renderPartnerBrowsePage(main)` | Renders the full partner grid / roster browse page |
| `_renderPartnerGrid(main, rosterActive, allBrands)` | Inner renderer for the partner grid, shared between browse modes |
| `openPortfolioHome()` | Sets `currentPage='home'` and calls `renderApp()` |
| `openTVPortfolioPage()` | Sets `currentPage='tv'` and calls `renderApp()` |
| `openPaidPortfolioPage()` | Sets `currentPage='paid'` and calls `renderApp()` |
| `openOrganicSocialPortfolioPage()` | Sets `currentPage='organic'` and calls `renderApp()` |
| `openSurveyPortfolioPage()` | Sets `currentPage='survey'` and calls `renderApp()` |
| `openDataHealthPage()` | Navigates to the data health summary page |
| `openGlossaryPage()` | Navigates to the metric glossary page |
| `renderLinksPage(main)` | Renders the Links page — 8 external links grouped into Web Analytics, Attendance, Digital & Broadcast, and App Data; each opens in a new tab |
| `openLinksPage()` | Sets `currentPage='links'` and calls `renderApp()` |

---

### `09_app_core.js` — Top-level routing, partner page shell, channel tag nav

| Function | What it does |
|----------|-------------|
| `renderApp()` | **Main router** — reads `currentBrand` / `currentPage` and delegates to the right renderer |
| `renderTVPortfolioPage(main)` | Renders the TV Visible Signage portfolio page (lives here because it references many channels) |
| `renderTakeaways(brand, latestSeason, prevSeason)` | Renders the "Key takeaways" YoY summary block on partner pages |

> **Global state declared here:** `currentBrand`, `currentPage`, `currentPeriod`, `comparisonMode`, `openSections`

---

### `10_tv_section.js` — TV section render, charts, asset breakdown

| Function | What it does |
|----------|-------------|
| `renderTVSection(brand)` | Main entry — renders the full TV Visible Signage collapsible section into `#tv-slot` |
| `renderAssetBreakdown(brand, period)` | Asset-by-asset table with YoY, sort, and hover interactions |
| `renderAssetQuadrant(brand, period)` | 4-quadrant scatter chart (QIMV vs Exposures) for a brand's assets |
| `renderPaceChart(brand, period)` | Season-pace SVG line chart overlaying current vs prior season |
| `renderPaidEfficiencyScatter(partnerAggs, resultFilter)` | Portfolio-level paid efficiency scatter plot |
| `renderTopMatchesTable(rows)` | Renders the top-games table inside the TV section |
| `renderYoYChange(yoy)` | Returns a formatted YoY badge `<span>` |
| `aggregateAssetRows(rows)` | Sums TV rows by asset location |
| `assetStatsFromAggregate(byAsset)` | Converts aggregated map to a sorted stats array |
| `getAssetYoYChange(brand, assetName, period)` | YoY delta for one named asset |
| `getAssetSortIndicator(key)` | Returns `▲`/`▼`/`·` for a sortable column |
| `sortAssetRows(assets)` | Applies current sort state to the asset array |
| `getAssetSeasonTrend(brand, assetName)` | Returns multi-season trend data for an asset |
| `getLocationQpmAverage(locationName, period)` | Portfolio average QIMV-per-minute for a location |
| `wireAssetBreakdownHovers(brand, period)` | Binds row-hover tooltip handlers on the asset table |
| `wirePaidEfficiencyScatter()` | Wires filter toggle buttons on the paid efficiency scatter |

---

### `11_portfolio_pages.js` — Organic Social and Paid portfolio pages

| Function | What it does |
|----------|-------------|
| `renderOrganicSocialPortfolioPage(main)` | Full Organic Social portfolio page with tabs (Partner Performance, Content Series, Brand on Asset) |
| `getOrganicPortfolioAllRows()` | Returns all organic social rows from all sub-types |
| `getOrganicPortfolioSourceRows(tab)` | Returns rows for a specific organic tab |
| `filterOrganicPortfolioRowsByDate(rows)` | Applies active date filter to organic portfolio rows |
| `sortOrganicPortfolioRows(rows)` | Applies current sort to the organic leaderboard |
| `getOrganicPortfolioDateLabel()` | Returns a human-readable date range label for the organic filter |
| `getAllPaidFiscalSeasons()` | Returns distinct seasons from all paid rows |
| `getPaidRowsForPeriod(period)` | Returns paid rows filtered to a given period |

---

### `12_paid_section.js` — Paid Social partner section and portfolio page

| Function | What it does |
|----------|-------------|
| `renderPaidPortfolioPage(main)` | Portfolio-level Paid Social page with leaderboard and efficiency scatter |
| `renderPaidSection(brand)` | Partner-page Paid Social collapsible section into `#paid-slot` |
| `renderPaidMultiCampaignChart(brand, period, metricKeyOverride)` | Multi-campaign pacing SVG chart for a partner |
| `wireMultiPacingChart(brand, period)` | Wires the metric-toggle buttons on the pacing chart |
| `renderPaidCampaignTable(rows)` | Campaign-by-campaign summary table |
| `renderPaidPlaceholder()` | "No paid data" empty state |
| `getPacingMetricKey(brand)` / `setPacingMetricKey(brand, key)` | Get/set the active pacing metric for a brand's chart |
| `updateBrandDropdown(query)` | Filters and renders the header partner search dropdown |

---

### `13_survey_section.js` — Survey Research section and portfolio page

| Function | What it does |
|----------|-------------|
| `renderSurveyPortfolioPage(main)` | Full Survey portfolio page with brand awareness tab |
| `renderBrandAwarenessTab(container, main)` | Brand awareness leaderboard and survey wave overview |
| `renderSurveyTrendChart(brand, phase)` | SVG line chart of survey metric trends across waves |
| `renderSurveyWaveTable(brand)` | Wave-by-wave metric table for a brand |
| `wireSurveyTrendHovers()` | Tooltip hovers on the survey trend chart |
| `getBrandSurveyData(brand, season, phase)` | Returns filtered survey rows for a brand |
| `getSurveySeasons()` | Returns distinct survey seasons |
| `getSurveyLatestWave(brand, phase)` | Most recent wave row for a brand |
| `getSurveyPriorWave(brand, phase)` | Second-most-recent wave for YoY comparison |
| `getSurveyTrend(brand, phase)` | Full ordered trend array across all waves |
| `getSurveyMetricYoY(brand, phase, metric)` | YoY delta for a single survey metric |
| `normalizeSurveyRow(row)` | Coerces raw CSV columns to typed survey row |
| `parseSurveyPct(val)` / `parseSurveyInt(val)` | Survey-specific numeric parsers |
| `getPartnerRoster()` / `isCurrentPartner(brand)` / `getPartnerCategory(brand)` | Roster lookups |
| `selectBrandFromSurvey(brand)` | Navigates to a partner page from the survey portfolio |

---

### `14_organic_section.js` — Organic Social section, file detection, ingest

| Function | What it does |
|----------|-------------|
| `renderOrganicSocialSection(brand)` | Partner-page Organic Social collapsible section into `#organic-slot` |
| `renderZoomphBody(brand)` | Inner content: tabs, trend chart, and data table |
| `renderZoomphTrendChart(brand)` | SVG multi-line trend chart for organic metrics |
| `renderZoomphTable(rows, nameLabel)` | Asset/series/content table for the active organic tab |
| `detectFileType(filename, rows)` | **High-blast-radius.** Determines channel type for any uploaded file; includes schema-based `tvRatings` detection (checks for `hh rtg` + `demo` + `opponent` columns) |
| `ingestFile(file, rows, fileType)` | Routes a parsed file to the correct channel ingest function |
| `normalizeTVRatingsRow(row)` | Coerces a raw Nielsen TV metrics row into a typed ratings row; derives segment from Program column and season from Custom Year column |
| `ingestTVRatingsFile(rows)` | Normalizes and deduplicates Nielsen rows into `DataStore.tvRatings`; safe to re-ingest the same export |
| `normalizeZoomphRow(row, fileType)` | Coerces a raw organic row into a typed object |
| `extractZoomphBrand(name)` | Strips date/suffix noise from a Zoomph filename to extract brand name |
| `filterZoomphRowsByPartnerDate(rows)` | Applies active date filter to organic rows |
| `aggregateZoomphTotals(rows)` | Sums impressions/engagements/reach across organic rows |
| `getZoomphTotalsYoY(brand, metric)` | YoY delta for an organic metric |
| `getBrandZoomphPerf(brand, month)` | Partner Performance rows for a brand |
| `getBrandZoomphSeries(brand)` | Content Series rows for a brand |
| `getBrandZoomphAssets(brand)` | Brand on Asset rows for a brand |
| `getZoomphReportMonths(brand)` | Distinct report months present for a brand |
| `hasZoomphData(brand)` | Guard: `true` if any organic rows exist for a brand |
| `wireZoomphTabs(brand)` | Wires the organic sub-tab click handlers |
| `wirePartnerOrganicDateFilter(brand)` | Wires the date-filter dropdown for organic section |
| `wireZoomphTrendChart(brand)` | Tooltip hovers on the organic trend chart |
| `parseZoomphNum(v)` / `parseZoomphPct(v)` | Organic-specific numeric parsers |

---

### `16_report_template.js` — PDF partner report

| Function | What it does |
|----------|-------------|
| `generatePartnerReport(brand, options)` | Builds the full HTML report; `options = { sections:{key:bool}, takeaways:{key:[idx,...]} }` controls which sections and takeaway bullets render; multi-page by default (no single-page height cap) |
| `gatherReportData(brand)` | Aggregates all channel data for a brand into a single report object |
| `openPartnerReport(brand, options)` | Entry point: calls `generatePartnerReport(brand, options)` and opens result in a new tab |
| `_computeSectionTakeaways(brand, season)` | Returns an object keyed by section key, each value an array of HTML takeaway bullet strings; used by both the modal customizer and the report renderer |
| `openReportModal(prefilledBrand)` | Opens the 4-step report export modal |
| `closeReportModal()` | Closes and resets the report modal |
| `_renderReportModalStep()` | Dispatches to the active step renderer (steps 1–4) |
| `_renderReportStep1(body)` | Step 1: partner picker |
| `_renderReportStep2(body)` | Step 2: season picker (advances to Step 3) |
| `_renderReportStep3(body)` | Step 3: section & takeaway customizer — checkboxes for each data channel and its individual takeaways |
| `_renderReportStep4(body)` | Step 4: confirm & generate (shows enabled/disabled sections, triggers `openPartnerReport`) |
| `_wireReportPartnerItems()` | Wires partner list click handlers in step 1 |
| `reportDelta(pct, invert)` | Returns a colour-coded delta badge for the report |
| `surveyBar(pct, rank, label, total)` | Renders an SVG bar for survey metrics in the report |
| `renderOrgLogo(size)` | Renders the org logo SVG at a given size |
| `renderPartnerLogo(brand, size)` | Renders a partner initial-avatar at a given size |
| `REPORT_SECTION_DEFS` | Constant array defining all reportable sections (key, icon, label) |

---

### `17_general_survey_assignment.js` — General survey question-to-partner linking

| Function | What it does |
|----------|-------------|
| `openGeneralSurveyReview()` / `closeGeneralSurveyReview()` | Show/hide the general survey assignment modal |
| `renderGeneralSurveyAssignmentUI()` | Renders the full assignment review table inside the modal |

---

### `18_affidavits_section.js` — TV/Radio Affidavits

| Function | What it does |
|----------|-------------|
| `ingestAffidavitFile(rows, channel)` | Parses and stores TV or radio affidavit rows into `DataStore.affidavits` |
| `normalizeAffidavitRow(row, channel)` | Coerces a raw affidavit CSV row into a typed object |
| `getAffidavitsForBrand(brand)` | Returns affidavit rows for a brand |
| `hasAffidavitDataForBrand(brand)` | Guard for the partner-page section |
| `getAffidavitSummary(brand)` | Returns `{ totalSpots, totalValue, byChannel }` for a brand |
| `renderAffidavitsSection(brand)` | Partner-page TV/Radio Affidavits collapsible section into `#affidavits-slot` |

---

### `19_anc_led_section.js` — ANC LED section

| Function | What it does |
|----------|-------------|
| `ingestANCLEDFile(rows, filename)` | Parses and stores ANC LED rows into `DataStore.ancLED` |
| `normalizeANCLEDRow(row, arena, asset, startDate, endDate)` | Coerces a raw ANC LED row into a typed object |
| `parseANCFilename(filename)` | Extracts arena, asset, and date range from the ANC filename convention |
| `parseDuration(str)` / `formatDuration(seconds)` | Converts HH:MM:SS strings to seconds and back |
| `getANCLEDRowsForBrand(brand)` | Returns ANC LED rows for a brand |
| `hasANCLEDDataForBrand(brand)` | Guard for the partner-page section |
| `getANCLEDSummary(brand)` | Returns `{ totalDuration, totalImpressions, byArena }` for a brand |
| `renderANCLEDSection(brand)` | Partner-page ANC LED collapsible section into `#anc-led-slot` |

---

### `20_virtual_signage_section.js` — On-Court Virtual Signage

| Function | What it does |
|----------|-------------|
| `ingestVirtualSignageSchedule(rows)` | Parses and stores the schedule CSV into `DataStore.virtualSignageSchedule` |
| `isVirtualBrandingRow(r)` | Returns `true` for TV rows where `Tool="Virtual Branding"` — used to strip these from the regular TV section |
| `normalizeVSDate(str)` | Normalizes `M/D/YY` or `M/D/YYYY` to `YYYY-MM-DD` for cross-source matching |
| `buildVSTVDateLookup()` | Builds a `"YYYY-MM-DD\|location"` → TV metrics map for home-game actuals lookup |
| `getLatestSeasonVSRows()` | Returns virtual branding TV rows for the most recent season only |
| `getVirtualBrandingTVRows(brand, location)` | Filters TV rows to virtual branding rows, optionally by brand/location |
| `computeVSQimvYoY(brand)` | YoY for virtual signage QIMV using TV VB rows by season; returns `{ curr, prev, change, basis }` or null when < 2 seasons exist |
| `computeVSLocationMeans()` | Computes per-position simple means from home-game TV actuals (used for away-game estimates and the averages table) |
| `vsConservativeEstimate(vals)` | Returns `floor(min(mean, median))` — the estimation strategy for away games |
| `getVirtualSignagePartnerStats()` | Builds per-brand stats combining home actuals (by date lookup) and away estimates |
| `getVirtualSignagePortfolioTotals(partnerStats)` | Sums partner stats into portfolio-level totals |
| `computeVSLocationAverages()` | Delegates to `computeVSLocationMeans()` for the averages display table |
| `groupVSPartnerStats(partnerStats)` | Groups sub-brands by shared prefix into brand-family aggregates |
| `hasVirtualSignageDataForBrand(brand)` | Guard for the partner-page section |
| `renderVirtualSignagePage(main)` | Portfolio-level On-Court Virtual Signage page |
| `renderVirtualSignageSection(brand)` | Partner-page On-Court Virtual Signage collapsible section into `#virtual-signage-slot` |
| `openVirtualSignagePage()` | Navigation helper: sets `currentPage='virtual-signage'` and calls `renderApp()` |
| `formatVSDate(dateRaw)` | Formats a raw schedule date string as `"Mon D"` |

---

### `21_web_digital_section.js` — Web & Digital (Blazers.com, RoseQuarter.com, Pre-Roll)

| Function | What it does |
|----------|-------------|
| `ingestBlazersBannersFile(file, ext)` | Parses Blazers.com delivery report CSV into `DataStore.webBlazersBanners` |
| `ingestRQBannersFile(file, ext)` | Parses RoseQuarter.com delivery report CSV into `DataStore.webRQBanners` |
| `ingestWebPreRollFile(file, ext)` | Parses pre-roll video report CSV into `DataStore.webPreRoll` |
| `extractBlazersOrderPartner(orderStr)` | Extracts brand name and season from an Order column string like `"Fred Meyer 2025-2026 > Trailblazers"` |
| `getWebAdType(lineItemStr)` | Classifies a line item as `'banner'` or `'pushdown'` |
| `isWebDNU(lineItemStr)` | Returns `true` for DNU (do not use / deprecated) line items |
| `aggregateWebBannerRows(rows)` | Sums impressions, clicks, and computes weighted CTR across banner rows |
| `getBlazersBannersForBrand(brand)` | Returns Blazers.com banner rows for a brand |
| `getRQBannersForBrand(brand)` | Returns RoseQuarter.com banner rows for a brand |
| `getPreRollForBrand(brand)` | Returns pre-roll rows for a brand |
| `renderWebDigitalSection(brand)` | Partner-page Web & Digital collapsible section into `#web-digital-slot`; delegates to the three subsection renderers |
| `renderBlazersBannersSubsection(brand, rows)` | Blazers.com display-ad breakdown: KPIs, by-type table |
| `renderRQBannersSubsection(brand, rows)` | RoseQuarter.com display-ad breakdown |
| `renderPreRollSubsection(brand, rows)` | Pre-roll video breakdown: KPIs, monthly bar chart, game-by-game table |
| `renderPreRollMonthlyChart(rows)` | SVG monthly bar chart of pre-roll play volume |
| `parseWebNum(v)` / `parseWebPct(v)` | Web & Digital numeric parsers (support K/M/B suffixes and `%`-formatted CTR) |
| `parseWebCSVMatrix(text)` | Parses a CSV as a raw matrix (bypasses PapaParse's header issues with date-row exports) |

---

### `22_tv_ratings_section.js` — TV Ratings Dashboard (Nielsen Viewership)

**⚠️ This file format will change.** Detection is column-schema-based; ingest/normalize lives in `14_organic_section.js`. Update `normalizeTVRatingsRow()` when columns change.

| Function | What it does |
|----------|-------------|
| `openTVRatingsPage()` | Navigation helper: sets `currentPage='tv-ratings'` and calls `renderApp()` |
| `renderTVRatingsPage(main)` | Main page renderer — season selector, KPI cards, all sub-sections |
| `getTVRatingsSeasons()` | Returns sorted distinct season strings from `DataStore.tvRatings` |
| `getTVRatingsActiveSeason()` | Returns the currently selected season, resolving `'latest'` to the most recent |
| `getTVRatingsRows(season)` | Returns all rows for a season string, or all rows when `season='all'` |
| `getTVRatingsGameDates(season)` | Returns sorted unique game dates for the Game segment in a season |
| `avgTVMetric(rows, key)` | Average of a numeric field across rows (skips zeros) |
| `maxTVMetric(rows, key)` | Max of a numeric field across rows |
| `renderTVRatingsLineChart(season, priorSeason)` | SVG season trend chart; game-only; togglable metric; optional YoY overlay aligned by game number |
| `renderTVRatingsSegmentComparison(rows)` | Pre/Game/Post avg HH and P2+ rating horizontal bar chart + summary table |
| `renderTVRatingsOpponentTable(season)` | Sortable opponent breakdown — avg HH Rtg/Imp, P2+ Rtg/Imp, peak HH Rtg, avg HH Share |
| `renderTVRatingsAdDemoChart(gameRows)` | Avg game rating/impressions bar chart for P18-49, M18-49, P25-54, M25-54 (HH and P2+ excluded intentionally) |
| `renderTVRatingsGamesTable(season)` | Sortable full game log — date, opponent, HH and P2+ metrics |
| `wireTVRatingsPage()` | Wires season selector, metric toggle, YoY toggle, opponent sort, games sort |

**State variables declared here:** `tvRatingsSeasonFilter`, `tvRatingsChartMetric`, `tvRatingsYoY`, `tvRatingsOpponentSort`, `tvRatingsGamesSort`

---

## Adding a new data channel (full checklist)

1. - [ ] Add detection branch in `detectFileType()` (`14_organic_section.js`)
2. - [ ] Add ingest branch in `ingestFile()` (`14_organic_section.js`)
3. - [ ] Add channel array/object to `DataStore` (`04_datastore.js`)
4. - [ ] Add to `getSerializableDataStore()` (`04_datastore.js`)
5. - [ ] Add to `hydrateFromPreloaded()` (`04_datastore.js`)
6. - [ ] Call `DataStore.registerBrand(brand, 'channelKey')` during ingest
7. - [ ] Create `XX_xxx_section.js` for the partner-page renderer
8. - [ ] Add `<div id="xxx-slot">` in the partner page HTML template (`09_app_core.js`)
9. - [ ] Add a channel tag entry in the `channelTags` array (`09_app_core.js`)
10. - [ ] Add to file log renderer in `renderFileLog()` (`14_organic_section.js`)
11. - [ ] Add home quick link card if it deserves portfolio-level visibility (`08_home_pages.js`)
12. - [ ] Add the new file row to the **file responsibility table** (the `| File | Responsibility |` table in "What this project is")
13. - [ ] Add a new sub-table for `XX_xxx_section.js` to the **Function / Code Map** section, and update any existing sub-tables whose functions were modified (typically `04_datastore.js` and `14_organic_section.js`)
14. - [ ] Update `CHANGELOG`
