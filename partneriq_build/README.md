# PartnerIQ — Source Files

## How to build

Open `build.ipynb` in Jupyter Lab and run Cell 1.
Output goes to `dist/partneriq.html` — this is the file to share.

## File guide

| File | Contents |
|------|----------|
| `00_vendor_shims.js` | CSV/XLSX offline parsers (rarely edit) |
| `01_styles.css` | All CSS and Blazers theme variables |
| `02_constants.js` | GLOSSARY metrics, PRELOADED_DATA block |
| `03_changelog.js` | CHANGELOG version history |
| `04_datastore.js` | DataStore, brand aliases, normalization |
| `05_paid_constants.js` | Paid campaign codes and partner alias map |
| `06_helpers.js` | formatNum, YoY math, rankings, tooltips |
| `07_paid_assignment.js` | Paid campaign parser and assignment UI |
| `08_home_pages.js` | Home page, partner browse, glossary |
| `09_app_core.js` | renderApp routing, TV portfolio page |
| `10_tv_section.js` | TV partner section and all TV charts |
| `11_portfolio_pages.js` | Organic and paid portfolio pages |
| `12_paid_section.js` | Paid partner section and bar chart |
| `13_survey_section.js` | Survey section and portfolio page |
| `14_organic_section.js` | Organic (Zoomph) section and portfolio |
| `15_wiring.js` | DOMContentLoaded event setup |
| `shell.html` | HTML skeleton (header, main, modals, footer) |

## Workflow

1. Edit source files in `src/`
2. Run Cell 1 in `build.ipynb`
3. Test in browser (Cell 3 opens it automatically)
4. Share `dist/partneriq.html`

## Adding a new version

1. Make changes to relevant source file(s)
2. Add entry to `03_changelog.js`
3. Update `VERSION` in Cell 5 of `build.ipynb`
4. Run Cells 1, 2, 3, 5
