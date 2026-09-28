# PartnerIQ — Source Files

## How to build

Open `build.ipynb` in Jupyter Lab and run **Cell 1**.
Output goes to `dist/partneriq.html` — this is the file to share.

If you don't have Jupyter to hand, `python3 rebuild.py` produces a byte-identical
build from a terminal. `build.ipynb` remains the source of truth: change the
build there and mirror it into `rebuild.py`.

## File guide

| File | Contents |
|------|----------|
| `00_vendor_shims.js` | CSV / LZ-string offline shims (rarely edit) |
| `01_styles.css` | All CSS and Blazers theme variables |
| `02_constants.js` | `GLOSSARY`, `DASHBOARD_VERSION`, `DASHBOARD_META`, `PRELOADED_DATA`, `VIEWER_MODE` |
| `04_datastore.js` | DataStore, canonical brand names, alias resolution, naming report, import/export |
| `05_paid_constants.js` | Number formatting, paid campaign codes, TV row index, brand data accessors |
| `06_helpers.js` | YoY math, rankings, tooltips, paid assignment review |
| `07_paid_assignment.js` | Portfolio helpers, sorting, `CHANNEL_REGISTRY`, Data Health |
| `08_home_pages.js` | Home page, partner browse, links page |
| `09_app_core.js` | `renderApp()` routing, partner page shell, section error boundaries |
| `10_tv_section.js` | TV partner section and all TV charts |
| `11_portfolio_pages.js` | Organic and paid portfolio pages |
| `12_paid_section.js` | Paid partner section, header search |
| `13_survey_section.js` | Survey section and portfolio page |
| `14_organic_section.js` | Organic (Zoomph) section, `detectFileType`, all file ingest |
| `15_wiring.js` | Event wiring, delegated handlers, app init |
| `16_report_template.js` | Partner report builder, document and paginator |
| `17_general_survey_assignment.js` | General survey question-to-partner assignment |
| `18_affidavits_section.js` | TV/Radio Affidavits section |
| `19_anc_led_section.js` | ANC LED section |
| `20_virtual_signage_section.js` | On-Court Virtual Signage |
| `21_web_digital_section.js` | Web & Digital (TrailBlazers.com, RoseQuarter.com, pre-roll) |
| `23_intro_section.js` | Viewer-mode how-to intro overlay |
| `24_report_brand_assets.js` | Generated from `brand/` by `brand/make_assets.py` — report fonts and logos |
| `shell.html` | HTML skeleton (header, main, modals, footer) |

There is no `22_` file — TV Ratings moved to their own dashboard in v0.53. There is also no `03_changelog.js` — version history lives in `CHANGELOG.md` so it
isn't shipped to viewers. The numbering gaps are deliberate; don't reuse `03_` or `22_`.

## Workflow

1. Edit source files in `src/`
2. Run Cell 1 in `build.ipynb` (or `python3 rebuild.py`)
3. Run the tests — both should be clean before you share a build:
   - `node unit_test.js` — formatters, season normalization, brand resolution, file detection
   - `node smoke_test.js` — file ingest, per-file remove/replace, export/import round-trip
4. Test in browser (Cell 3 opens it automatically)
5. Share `dist/partneriq.html`

## Adding a new version

1. Make changes to the relevant source file(s)
2. Add an entry at the top of `CHANGELOG.md`
3. Bump `DASHBOARD_VERSION` in `src/02_constants.js` — the footer renders from it
4. The AM export cells in `build.ipynb` read the version from `DASHBOARD_VERSION` — nothing to update there
5. Rebuild and re-run both test suites

## Partner report

The report uses the Trail Blazers design system's fonts and logos, kept in
`brand/`. After changing them, run `python3 brand/make_assets.py`, then rebuild.

To check report layout across every partner after a change (optional, needs
Playwright): `node report_layout_check.js path/to/preloaded-export.html`.

## Checking partner naming

**Data Health → Naming & aliases** lists everything that would otherwise need a
manual sweep after a refresh: names that look like the same partner spelled two
ways (with a one-click merge), logo files matching no partner, partners with no
logo, roster entries matching nothing loaded, and partners stranded in a single
channel. Start there rather than scanning the brand list by hand.
