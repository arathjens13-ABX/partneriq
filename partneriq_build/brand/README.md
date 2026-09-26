# brand/

Fonts and logos from the **Trail Blazers Dashboards** design system, used by the
partner report (`src/16_report_template.js`).

| File | Source in the design system |
|------|-----------------------------|
| `fonts/LeagueGothic-Regular.woff2` | `fonts/LeagueGothic-Regular.otf` — figures and titles |
| `fonts/TradeGothic-Cn18.woff2` | `fonts/TradeGothicLTStd-Cn18.otf` — body, 400 |
| `fonts/TradeGothic-BdCn20.woff2` | `fonts/TradeGothicLTStd-BdCn20.otf` — labels, 700 |
| `logos/blazers-global-stacked.png` | stacked lockup, scaled to 360px wide — report cover |
| `logos/portland-wordmark-horiz.png` | horizontal wordmark, scaled to 360px wide — report footer |

Fonts were converted OTF → WOFF2 unchanged (same glyphs, ~45% smaller).

After changing anything here, run `python3 brand/make_assets.py` to regenerate
`src/24_report_brand_assets.js`, then rebuild.

**Licensing:** Trade Gothic LT Std is a commercial Linotype typeface. Embedding it
in HTML files that are sent outside the organisation may need a web/app licence
rather than a desktop one — check before sharing reports externally.
Logo art © NBA Properties, Inc.
