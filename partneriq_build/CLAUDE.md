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

---

## What this project is

PartnerIQ is a **fully offline, single-file HTML dashboard** for sports partnership analytics. It runs entirely in the browser with no server, no build step, and no external calls. All data is loaded locally via CSV drag-and-drop or embedded in the file at export time.

The codebase is a set of numbered `.js` and `.css` files that are concatenated into `shell.html` at distribution time. Each file has a clear responsibility:

| File | Responsibility |
|------|---------------|
| `00_vendor_shims.js` | Vendored libraries (PapaParse, etc.) |
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
| `wireSortableTables()` | `15_wiring.js` | All table sort interactivity |
| `wireSectionToggles()` | `15_wiring.js` | All collapsible section open/close |
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
Any time you add or rename a key in `DataStore`, tick all three before finishing:
- [ ] `DataStore` initial declaration / `reset()`
- [ ] `getSerializableDataStore()` — included in exports
- [ ] `hydrateFromPreloaded()` — restored on load

### Export / Sharing
- **Use the three injection blocks** (`PRELOADED_DATA_START/END`, `DASHBOARD_META_START/END`, `VIEWER_MODE_START/END`). Never write data outside them.
- **Always call `safeJSONStringify()`** instead of `JSON.stringify()` in export HTML.

### UI Conventions
- **Collapsible sections** use `.collapsible` class + `wireSectionToggles()`.
- **Sortable tables** use `data-sort-key` / `data-sort-dir` on `<th>` + `wireSortableTables()`.
- **KPI cards** reuse `.kpi-card` — don't build a new structure.
- **Metric toggles** persist in `userPresets` via `getCurrentUserPresets()` / `applyUserPresets()`.
- **Before building a new chart**, check `10_tv_section.js` and `13_survey_section.js` for an existing SVG pattern to adapt.

---

## ❌ DON'Ts

- Don't mutate `PRELOADED_DATA` directly — hydrate it into `DataStore` only.
- Don't hardcode partner names in rendering logic.
- Don't add nav buttons to the header — navigation lives on Home page quick links.
- Don't show upload controls in viewer mode — `applyViewerMode()` handles this.
- Don't skip alias resolution — call `canonicalizeAllBrandData()` after loading data or changing alias rules.
- Don't duplicate KPI card structures — reuse `.kpi-card`.

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
<div class="kpi-card">
  <div class="kpi-label">Label</div>
  <div class="kpi-value">${formatCurrency(value)}</div>
  <div class="kpi-badge ${delta >= 0 ? 'positive' : 'negative'}">${formatSignedPercent(delta)} YoY</div>
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
12. - [ ] Update `CHANGELOG`
