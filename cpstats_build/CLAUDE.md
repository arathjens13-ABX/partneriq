# CP Stats Sheet — Claude Guidelines

A quick reference for working on this codebase. Read this before making any changes.

---

## Required: Planning before every change

**Before writing any code, state a plan.** Format scales with scope:

**Small change (single value, label, copy):**
> Files touched: `02_constants.js`
> What changes: Update a follower count in STATS_DATA.
> Risk: None.

**Medium change (new KPI card, new sub-section):**
> Files touched: `04_stats_page.js`
> What changes: Add a new card to the Portland Market section.
> Risk: Must verify the new field exists in STATS_DATA first.

**Large change (new collapsible section, structural redesign):**
> Files touched: `02_constants.js`, `04_stats_page.js`, `01_styles.css`
> Functions affected: `renderStatsPage()`
> Risk: State which section IDs are new and confirm `openSections` defaults are correct.

Do not start writing code until the plan is confirmed.

**Function map maintenance rule:** Any time a function is added, removed, or renamed — the corresponding entry in the **Function / Code Map** section must be updated in the same session. A stale map is worse than no map.

---

## What this project is

CP Stats Sheet is a **fully offline, single-file HTML dashboard** displaying Portland Trail Blazers market intelligence stats. It has no data upload, no partner routing, and no external dependencies.

The codebase is numbered `.js` and `.css` files that are concatenated into `dist/cpstatssheet.html` by the Jupyter notebook build script (`build.ipynb`).

| File | Responsibility |
|------|---------------|
| `01_styles.css` | All CSS — design tokens, layout, collapsible sections, KPI cards |
| `02_constants.js` | `DASHBOARD_META` and `STATS_DATA` — the only place data lives |
| `03_helpers.js` | `formatNum()`, `formatCurrency()`, `showErrorToast()` |
| `04_stats_page.js` | `renderApp()`, `wireSectionToggles()`, `openSections`, `renderStatsPage()` |
| `05_wiring.js` | `DOMContentLoaded` — theme toggle, back-to-top, initial `renderApp()` call |
| `shell.html` | Static HTML skeleton — header, `<main id="main">`, footer, tooltip portal |

---

## 🚨 Forbidden patterns — never introduce these

| Pattern | Why |
|---------|-----|
| `fetch()` to any remote URL | Breaks offline guarantee |
| `<script src="...">` CDN tags | No external calls — ever |
| `localStorage` / `sessionStorage` | No persistence needed |
| ES module `import` / `export` | Everything is global scope by design |
| `npm`, `node_modules`, any build tool | No build step — ever |
| Hardcoded hex colors or font stacks in JS | Use CSS variables only |

---

## How to update the data (most common task)

**Updating stats for a new fiscal year:**

1. Open `02_constants.js`
2. Update `STATS_DATA.fiscalYear` to the new FY string (e.g. `'2026-27'`)
3. Update each category's fields with the new values
4. Update `DASHBOARD_META.fiscalYear`, `latestUpdateLabel`, and `latestUpdateDate`
5. Run Cell 1 of `build.ipynb` to rebuild `dist/cpstatssheet.html`
6. Run Cell 2 to verify in browser

Zero values (`0`) render as `"—"` on the page. This is intentional — only populate fields you have data for.

---

## How to add a new KPI card to an existing section

In `04_stats_page.js`, locate the relevant section content variable (e.g. `broadcastContent`). Add a new `kpiCard()` call:

```javascript
kpiCard('New Metric Label', numVal(s.broadcast.newField))
```

Then add the corresponding field to `STATS_DATA` in `02_constants.js`.

---

## How to add a new collapsible section

1. Add a new data block to `STATS_DATA` in `02_constants.js`
2. In `renderStatsPage()` in `04_stats_page.js`:
   - Build a `newContent` string using `kpiCard()`, `kvTable()`, etc.
   - Add a `collapsible('stats-newid', '🆕 Section Title', newContent)` call at the end of `main.innerHTML`
3. The section will be open by default (all sections start open; `openSections[id]` defaults to `!== false`)

**Section IDs must be unique.** Current IDs: `stats-social`, `stats-arena`, `stats-stm`, `stats-hhi`, `stats-portland`, `stats-broadcast`, `stats-digital`, `stats-sentiment`.

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
| `var(--brand-red)` | Accent — highlights, active states |
| `var(--positive)` | Positive indicator (green) |
| `var(--negative)` | Negative indicator (red) |
| `var(--font-mono)` | Monospace — labels, kickers, numbers |
| `var(--font-body)` | UI / body font |

---

## Architecture rules

- **All JS shares global scope.** Functions in one file are available in all others. This is intentional — no modules.
- **`renderApp()` is the single render entry point.** All state changes end with `renderApp()`.
- **`openSections` tracks collapsible state.** Key = section ID, value = boolean. Undefined = open (default).
- **`wireSectionToggles()` must be called after every render.** It uses `data-section-toggle` attribute, not `data-toggle`.
- **No comments explaining WHAT the code does** — only WHY when non-obvious.

---

## Build process

Run `build.ipynb` in Jupyter:
- **Cell 1** — Builds `dist/cpstatssheet.html` (the deliverable)
- **Cell 2** — Opens the built file in your browser
- **Cell 3** — Line count report across all source files

The build concatenates files in numeric order (`01_`, `02_`, etc.) and inlines them into a single HTML. No minification, no transpiling.

---

## Function / Code Map

### `02_constants.js` — Data

| Constant | What it contains |
|----------|-----------------|
| `DASHBOARD_META` | Fiscal year, update label/date, preparedBy — update before sharing |
| `STATS_DATA` | All market intelligence values — 8 categories, static per FY |

---

### `03_helpers.js` — Utilities

| Function | What it does |
|----------|-------------|
| `formatNum(n)` | Formats integers with commas; compact K/M for ≥10K |
| `formatCurrency(n)` | `$` prefix + K/M compact formatting |
| `showErrorToast(msg)` | Displays a brief in-app notification |

---

### `04_stats_page.js` — Core rendering

| Function / Variable | What it does |
|--------------------|-------------|
| `openSections` | Global object tracking which collapsible sections are open (`true`) or closed (`false`) |
| `renderApp()` | Single entry point — calls `renderStatsPage()` then `wireSectionToggles()` |
| `wireSectionToggles()` | Wires click handlers on all `[data-section-toggle]` elements; toggles `openSections` and re-renders |
| `renderStatsPage(main)` | Builds the full page HTML and sets `main.innerHTML`; contains all section content builders |

**Inner helpers inside `renderStatsPage()`** (not accessible outside):

| Helper | What it does |
|--------|-------------|
| `numVal(n)` | Formats a number, returns `'—'` for zero/null |
| `pctVal(n)` | Appends `%`, returns `'—'` for zero/null |
| `dollarVal(n)` | Calls `formatCurrency`, returns `'—'` for zero/null |
| `rawVal(n)` | Returns value as-is, returns `'—'` for zero/null |
| `kpiCard(label, value)` | Returns `.home-card` HTML for a single KPI |
| `subLabel(text)` | Returns a monospace uppercase sub-heading divider |
| `kvTable(entries)` | Returns a two-column label/value table from `[[label, value]]` pairs |
| `platformTable(data, formatter)` | Returns a platform × metric table (platforms as rows, keys as columns) |
| `collapsible(id, title, content)` | Returns a collapsible section shell with `data-section-toggle` wiring |

---

### `05_wiring.js` — App initialization

| What it does |
|-------------|
| Wires the theme toggle button (`#themeToggleBtn`) |
| Wires the back-to-top button (`#backToTop`) |
| Calls `renderApp()` on `DOMContentLoaded` |

---

## Scoped context — what to read per task

| Task | Files to read |
|------|--------------|
| Update a stat value | `02_constants.js` only |
| Change a label or format | `04_stats_page.js` only |
| Add a KPI card | `04_stats_page.js` only |
| Add a new collapsible section | `02_constants.js` + `04_stats_page.js` |
| Change colors or spacing | `01_styles.css` only |
| Add a new section type (e.g. chart) | All files — plan carefully |

---

## React embedding notes

This dashboard is designed to be embedded in a React web application as an `<iframe>` or served as a static route. When embedding:

- The file is fully self-contained — no extra assets needed
- The `dist/cpstatssheet.html` output is the only file to serve
- The dark/light theme defaults to dark; the toggle in the header switches it
- No authentication, no API calls, no cookies

If the React app needs to control the theme, it can postMessage to the iframe or set `data-theme` on the iframe's `document.documentElement` after load.
