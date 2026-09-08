const CHANGELOG = [
  {
    version: 'v0.47',
    date: 'September 2026',
    source: 'Claude',
    title: 'How-to-use intro overlay for viewers',
    changes: [
      {
        category: 'Onboarding',
        items: [
          `New animated "How to use" intro that greets viewers on open, replacing the old behavior where the Import/Export modal briefly flashed on load. Five steps walk through finding any partner (including non-contracted ones), finding the sections on a partner page, sorting columns and picking date ranges, and getting around with Back/Home`,
          `Shown in viewer mode only (gated on VIEWER_MODE) so the builder working file is unaffected. Appears on every open, with a "Don't show again" checkbox that suppresses it for the session (no localStorage, per the offline-first rules) and a "?" relaunch button to reopen it anytime`,
          `Self-contained new file 23_intro_section.js with namespaced .pqi-* styles in 01_styles.css; built into a #introRoot mount added to shell.html. Reuses the Partner / Not partner pill styles from the search filter`,
        ]
      }
    ]
  },
  {
    version: 'v0.46',
    date: 'September 2026',
    source: 'Claude',
    title: 'Unified "current partners only" search filter with Partner / Not partner pills',
    changes: [
      {
        category: 'Partner search',
        items: [
          `Added a "Partners only" toggle next to the header search. It replaces the old hard-coded behavior where a loaded roster silently limited the generic search to current partners — turning it off now surfaces prospects and non-contracted brands in the top search, so you can look up anyone`,
          `Every brand in the header search and Partner Browse now carries a green "Partner" or muted "Not partner" pill (replacing the small green dot), making contract status legible at a glance`,
          `Unified the filter into one shared searchPartnersOnly state (default on) driving the header search, Partner Browse page, and paid brand switcher, so the toggles can no longer disagree. Persisted in userPresets and included in preloaded exports; older exports fall back to the legacy partnerBrowsePartnersOnly key. New helpers renderPartnerStatusPill() and syncHeaderPartnersToggle() in 12_paid_section.js`,
        ]
      }
    ]
  },
  {
    version: 'v0.45',
    date: 'June 2026',
    source: 'Claude',
    title: 'File manager — remove or replace individual data files without starting over',
    changes: [
      {
        category: 'File manager',
        items: [
          `Every uploaded file's rows are now tagged with a file ID at ingest, and the file log (Import / Export modal) became a persistent file manager: each loaded file shows Replace and Remove buttons. Remove strips that file's rows from every channel, rebuilds the brand registry, and re-renders; Replace opens the file picker and swaps the old file's data for the new CSV in one step`,
          `Re-uploading a file whose name is already loaded now prompts to replace the existing data instead of silently double-counting rows — previously every re-upload duplicated the file's rows, which is why updating one file meant clearing everything and starting over`,
          `The loaded-file registry is included in preloaded exports (new loadedFiles key in the DataStore serialization), so reopening an exported dashboard restores the file log with working Remove/Replace buttons. Old exports without the registry still load fine — their file log is simply empty`,
          `New functions: generateFileId / tagRowsWithFile / getLoadedFileEntry / removeFileDataById / removeLoadedFile in 04_datastore.js; startReplaceFile / describeLoadedFile in 14_organic_section.js. The transient sessionLoadedFiles array is gone — DataStore.loadedFiles is the single source of truth`,
          `Roster and Virtual Signage schedule uploads overwrite their whole collection by design, so loading a new one now retires the superseded file's log entry instead of listing both`,
        ]
      },
      {
        category: 'Safety',
        items: [
          `Clear all data now asks for confirmation — it previously wiped every loaded row in one click with no undo`,
          `Removing the file that contains the partner page you're viewing falls back to Home instead of rendering an empty partner`,
          `Failed-upload log entries can be dismissed individually with their new ✕ button`,
        ]
      }
    ]
  },
  {
    version: 'v0.44',
    date: 'May 2026',
    source: 'Claude',
    title: 'Paid YoY removed, small-sample guards on TV asset and survey question deltas, more respondent counts (but not in the PDF)',
    changes: [
      {
        category: 'Paid Social',
        items: [
          `Removed YoY indicators from the Paid Social partner section — Impressions and CTR KPI cards no longer carry a YoY badge. Paid performance shifts too much with creative and objective changes for year-over-year comparisons to be meaningful at this level`,
          `Removed the YoY option from the Paid Social Portfolio page's comparison toggle. KPI badges on that page now always compare to the prior month; the toggle UI is dropped since there's only one mode left. paidPortfolioKpiMode now defaults to 'mom' and is preserved as a serialized field for export/import compatibility`,
          `Deleted getPaidYoY() in 05_paid_constants.js — no remaining callers after the badge removal`,
        ]
      },
      {
        category: 'Small-sample guards',
        items: [
          `TV Visible Signage asset breakdown YoY badge now shows in a muted "small sample" style when either the current or prior period had under 1 minute of total on-screen time on that asset. The number is still shown so the AM can see direction, but the styling and tooltip make clear it shouldn't be read as a real signal — a single mis-attributed clip can swing per-minute QIMV wildly at low totals. Constant TV_ASSET_SMALL_SAMPLE_MIN_MINUTES = 1 in 10_tv_section.js`,
          `Partner-specific survey question table now applies the same small-sample treatment when either the current or prior wave drew fewer than 5 responses for that question/response combo. New formatSurveyDeltaCell() helper in 13_survey_section.js routes through isSurveyDeltaSmallSample() to decide which formatter to use; getPartnerSpecificRowComparison() now returns currFrequency and priorFrequency so the renderer can inspect both sides. Constant SURVEY_SMALL_SAMPLE_MIN_N = 5`,
          `Added a shared .yoy-change.small-sample CSS rule in 01_styles.css so the muted style is consistent across TV and survey`,
        ]
      },
      {
        category: 'Respondent counts',
        items: [
          `Survey Research portfolio brand-awareness leaderboard now has a "Respondents" column showing the total survey responses behind each brand's row — useful context for the AM when reading the ranks and recall percentages`,
          `Partner-page Programs & Community block KPI bar now includes a "Respondents" tile alongside Programs / Latest top program / Average awareness`,
          `Partner-page Fan Insights block KPI bar now includes a "Respondents" tile alongside Latest mention / Answer options / Waves`,
          `Stripped the respondents line from the PDF partner report's Brand Awareness Survey card (16_report_template.js) — respondent counts stay in the dashboard for AMs but not in the externally-shared PDF`,
        ]
      }
    ]
  },
  {
    version: 'v0.43',
    date: 'May 2026',
    source: 'Claude',
    title: 'Phase-matched survey YoY, point-delta math under % labels, and a more forgiving paid-campaign auto-namer',
    changes: [
      {
        category: 'Survey YoY correctness',
        items: [
          `Phase-mismatch bug fixed in the partner-page "Key Takeaways" block (09_app_core.js) and the PDF report's survey section (16_report_template.js). Both were calling getSurveyPriorWave(brand, 'all'), which returns the 2nd-most-recent wave regardless of phase — in practice the opposite-phase wave of the same season, so a Late wave was being compared to the Early wave of the same season and labeled "YoY". Now both pass the latest wave's Phase, so the comparison is true Late→Late / Early→Early`,
          `Survey recall deltas (Unaided / Aided / Local HQ) now compute as a percentage-point change (curr - prev) instead of a relative ratio — a brand moving from 40% to 50% reads "+10.0%", matching what the eye expects when looking at the two numbers. The previous behavior computed (curr-prev)/prev and would have shown "+25.0%" for the same move. The % symbol is preserved on the label since that's what readers recognize; the math underneath is the point delta. Updated getSurveyMetricYoY() and surveyPctChangeFromValues() in 13_survey_section.js; all downstream callers (KPI cards, leaderboard YoY columns, program-awareness table, trend chart tooltips, partner-question breakdowns) flow through these helpers`,
          `Paid Social CTR YoY in the partner section (12_paid_section.js) now shows the point delta — a CTR move from 2.50% to 3.00% reads "+0.50% YoY" instead of "+20.0% YoY"`,
          `Survey response frequencies are counts, not rates, so the one survey card that compares respondent counts (sponsor-aware question card in 13_survey_section.js) now uses the count-relative helper formatSignedPercent(pctChange(...)) — a count moving 1,000 → 1,200 correctly reads "+20.0%"`,
        ]
      },
      {
        category: 'Paid auto-namer',
        items: [
          `parsePaidCampaignName() in 05_paid_constants.js now accepts season tokens in five shapes — 2023-24 (canonical), FY24, FY2024, 2023-2024, and 2024/25 — and normalizes them all to YYYY-YY. Added parseFlexibleSeasonToken() helper; FY shorthand is interpreted as the season ending in that fiscal year, matching fiscalSeasonFromDate() convention`,
          `Tokenization now splits on underscore, space, or hyphen — campaigns named "Toyota-FY24-Awareness" or "Toyota FY24 Awareness" parse identically to the underscored form. Season ranges are protected via a placeholder so the hyphen split doesn't shatter "2023-24" into two tokens`,
          `Embedded brand-prefix detection (the path that resolves single tokens like "AlaskaDOTM" → Alaska Airlines + DOTM activation) is now case- and punctuation-insensitive via compactToken() — "alaskaDOTM", "ALASKADOTM", and "alaska-dotm" all resolve to Alaska Airlines with a clean activation suffix`,
        ]
      },
      {
        category: 'Repo',
        items: [
          `Removed the cpstats_build/ directory. The CP Stats Sheet split into its own dashboard back in v0.41 and has no shared code, CSS, build scripts, or doc cross-references with PartnerIQ — it now lives in its own repository`,
        ]
      }
    ]
  },
  {
    version: 'v0.42',
    date: 'May 2026',
    source: 'Claude',
    title: 'Dead-code cleanup — Chart.js shim, unused helpers, stale CSS, XLSX support',
    changes: [
      {
        category: 'Cleanup',
        items: [
          `Removed the unused OfflineChart shim (~90 lines) and the window.Chart / window.XLSX_OFFLINE_DISABLED globals from 00_vendor_shims.js — every chart in the dashboard is inline SVG, nothing ever instantiated Chart.js`,
          `Removed chartDefaults() in 10_tv_section.js, activeCharts + destroyCharts() in 07_paid_assignment.js, and the no-op destroyCharts() call in renderApp() — none had any callers or state`,
          `Removed getSurveyRankYoY() in 13_survey_section.js — defined but never called`,
          `Removed parseXLSX() and the .xlsx / .xls ingest branches in 14_organic_section.js and 21_web_digital_section.js, plus orphan helpers _webHasAnyHeaderKey, _webFindKeyFromHeaderValues, _webFindKeyFromKeys — XLSX has never been supported in this offline build`,
          `Dropped .xlsx and .xls from the file-picker accept attribute in shell.html and updated the helper copy — CSV is the only supported upload format`,
          `Removed 12 unused CSS selectors from 01_styles.css: .chart-container, .kpi-card, .mean-diff(+variants), .rank-change(+variants), .reco-badge(+variants), .sentiment-bar / .sentiment-seg / .sentiment-legend(+variants), .methodology-callout, .placeholder-pill, .survey-chart-expand, .survey-svg-title, .survey-svg-subtitle, .survey-legend-label, .survey-trend-label`,
          `Renamed homeNavBtn2 → homeNavBtn in 15_wiring.js — the "2" suffix was a leftover from a partial cleanup; the variable was always a single button reference`,
        ]
      },
      {
        category: 'Consistency',
        items: [
          `Added openPaidPortfolioPage(), openOrganicSocialPortfolioPage(), openSurveyPortfolioPage() helpers in 08_home_pages.js — home-page quick links now use the same navigation pattern as TV / Virtual Signage / Links / etc. instead of inline onclick="currentBrand=null; currentPage='paid'; renderApp();"`,
        ]
      },
      {
        category: 'Docs',
        items: [
          `CLAUDE.md: corrected wireSectionToggles() location (lives in 06_helpers.js, not 07_paid_assignment.js) and wireSortableTables() location (07_paid_assignment.js)`,
          `CLAUDE.md: KPI card guidance and recipe template updated to use .kpi (the actual class) instead of the unused .kpi-card`,
          `CLAUDE.md: function map updated to drop removed functions and add the new portfolio openers; web-digital ingest descriptions updated to "CSV" instead of "XLSX or CSV"`,
        ]
      }
    ]
  },
  {
    version: 'v0.41',
    date: 'May 2026',
    source: 'Claude',
    title: 'Removed Stats & Market Data page — CP stats now lives in its own dedicated dashboard',
    changes: [
      {
        category: 'Cleanup',
        items: [
          `Removed the Stats & Market Data quick-link card from the home page — CP stats has been separated into its own dedicated dashboard`,
          `Deleted renderStatsPage() and openStatsPage() from 08_home_pages.js`,
          `Removed STATS_DATA constant from 02_constants.js`,
          `Removed currentPage==='stats' routing branch from renderApp() and the no-data guard in 09_app_core.js`,
        ]
      }
    ]
  },
  {
    version: 'v0.40',
    date: 'May 2026',
    source: 'Claude',
    title: 'QIMV takeaways include On-Court virtual signage; YoY tracking for VS partners',
    changes: [
      {
        category: 'Takeaways',
        items: [
          `Portfolio top takeaways now report combined Total QIMV (TV visible + On-Court virtual signage) when VS data is loaded, with a TV/On-Court breakdown in the bullet`,
          `Partner-page takeaways now show a combined Total QIMV bullet (TV + On-Court) with separate YoY deltas for each channel when the partner has virtual signage data`,
          `Combined TV + organic social value bullet now includes On-Court virtual signage QIMV when applicable`,
        ]
      },
      {
        category: 'Virtual Signage',
        items: [
          `New computeVSQimvYoY(brand) helper computes season-over-season QIMV change from TV virtual branding rows (home-game actuals), enabling YoY tracking in takeaways for VS partners`,
          `TV Visible Signage section header now annotates Total QIMV as "(TV only)" and section meta shows "On-Court tracked separately" when the partner has virtual signage data`,
          `Fixed TV section body note: corrected "tab above" to "section below" for the On-Court exclusion callout`,
        ]
      }
    ]
  },
  {
    version: 'v0.39',
    date: 'May 2026',
    source: 'Claude',
    title: 'TrailBlazers logo — dashboard header and exported report',
    changes: [
      {
        category: 'Branding',
        items: [
          `TrailBlazers.png added to the logos folder and now appears in the dashboard header next to the PartnerIQ wordmark`,
          `Exported partner reports now show the TrailBlazers logo in the report header instead of the "TB" placeholder circle`,
          `renderOrgLogo() auto-resolves from PARTNER_LOGOS["TrailBlazers"] at build time — no manual base64 paste required`,
          `logos/README.txt updated to document both partner logos and the org logo (TrailBlazers.png)`,
        ]
      }
    ]
  },
  {
    version: 'v0.38',
    date: 'May 2026',
    source: 'Claude',
    title: 'Compressed export — smaller file size, lower RAM for shared dashboards',
    changes: [
      {
        category: 'Export',
        items: [
          `Exported preloaded dashboards now compress the embedded data payload using LZ-string (base64 mode) — typical file size drops from ~25 MB to ~3–5 MB`,
          `LZ-string 1.4.4 (MIT) inlined in vendor shims; no external dependencies added`,
          `Viewers open the file faster and browsers need less RAM to hold the HTML source — decompressed data is parsed once at load time and temporary strings are eligible for garbage collection`,
          `Old exports are unaffected — each export bundles its own code and data`,
        ]
      }
    ]
  },
  {
    version: 'v0.37',
    date: 'May 2026',
    source: 'Claude',
    title: 'TV Ratings — preseason fix, rounding, wider recent-games cards',
    changes: [
      {
        category: 'TV Ratings Dashboard',
        items: [
          `Preseason filtering: added TV_RATINGS_KNOWN_PRESEASON constant listing Oct 8 and Oct 14 2025-26 as preseason dates — isRegularSeason() now uses this as a fallback when column-based detection misses them`,
          `Ratings now display to one decimal place (e.g. 1.2 instead of 1.23) across all KPI cards, tables, chart gridlines, and tooltips`,
          `Share now displays to one decimal place (e.g. 4.5% instead of 4.53%) across all tables`,
          `"5 Most Recent Games" cards now fill the full dashboard width using a CSS grid layout instead of wrapping flex`,
        ]
      }
    ]
  },
  {
    version: 'v0.36',
    date: 'May 2026',
    source: 'Claude',
    title: 'TV Ratings Dashboard — Nielsen viewership data',
    changes: [
      {
        category: 'New Page',
        items: [
          `Added "TV Ratings Dashboard" to the Portfolio pages group on the home page`,
          `New page renders Nielsen broadcast viewership data: game ratings, impressions, and demographic breakdowns`,
          `Data source: DW > vw_viewership > vw_nielsen_tv_metrics — file is detected by column schema (HH Rtg + Demo + Opponent), not by filename, so it survives format/path changes`,
          `Season selector with All Seasons support; KPI cards show game-segment-only averages for HH Rating, HH Impressions, P2+ Rating, and Peak HH Rating`,
          `Season trend line chart with four metric toggles (HH Rating, P2+ Rating, HH Impressions, P2+ Impressions) and optional season-over-season overlay aligned by game number`,
          `Pre/Game/Post segment comparison section shows avg HH and P2+ ratings as horizontal bars plus a summary table — Pre and Post data intentionally separated from game-only top-line metrics`,
          `Opponent Ratings Breakdown — sortable table of avg HH Rating, HH Impressions, P2+ Rating, P2+ Impressions, Peak HH Rating, and Avg HH Share per opponent`,
          `Advertiser Demo Spotlight shows avg game rating/impressions for P18-49, M18-49, P25-54, and M25-54 only — HH and P2+ are excluded because they are not comparable targeted sub-demos`,
          `Game Log — sortable full game-by-game table with date, opponent, HH Rating/Impressions/Share, and P2+ Rating/Impressions/Share`,
        ]
      },
      {
        category: 'Data Infrastructure',
        items: [
          `Added tvRatings[] array to DataStore with full serialize/hydrate/reset coverage`,
          `ingestTVRatingsFile() in 14_organic_section.js normalizes each row to: date, season, demo, segment, opponent, station, imp, rtg, shr, hhImp, hhRtg, hhShr`,
          `Segment derived from Program column (most reliable); season derived from Custom Year column (1/1/2025 → 2024-25)`,
          `Deduplication on date+demo+segment+opponent+station — safe to re-upload the same export`,
        ]
      }
    ]
  },
  {
    version: 'v0.35',
    date: 'May 2026',
    source: 'Claude',
    title: 'Stats & Market Data page + home page Links relocation',
    changes: [
      {
        category: 'New Page',
        items: [
          `Added "Stats & Market Data" quick link to the Portfolio pages group on the home page`,
          `New Stats page houses 8 collapsible sections: Social Following, Arena & Attendance, Season Ticket Members, Household Income, Portland Market Demographics, Broadcast, App & Digital, and Fan Sentiment`,
          `Stats page is accessible before data is loaded (like Glossary, Data Health, and Links)`,
          `All stats values are stored in a new STATS_DATA config object in 02_constants.js — update the values each fiscal year and rebuild to refresh the page`,
          `Social Following section displays total followers by platform plus age demographics and geographic distribution tables broken out by platform`,
          `Arena & Attendance section shows annual visitors, total events, and a seating capacity breakdown by section`,
        ]
      },
      {
        category: 'Home Page',
        items: [
          `Moved the "Links" card from the Reference group into the Portfolio pages group so it appears alongside the other primary dashboard sections`,
        ]
      }
    ]
  },
  {
    version: 'v0.34',
    date: 'May 2026',
    source: 'Claude',
    title: 'Links page — external resource quick links',
    changes: [
      {
        category: 'New Page',
        items: [
          `Added a new "Links" page accessible from the Reference section of the home page`,
          `Links are organized into four categories: Web Analytics, Attendance, Digital & Broadcast, and App Data`,
          `Includes 8 external links: Rose Quarter and Blazers web reports (Looker Studio), RQ Events and Blazers attendance (Tableau), Triple Play Dashboard, TV Ratings Dashboard, Email Report (Tableau), and App Data Partner Metrics (SharePoint)`,
          `Each link opens in a new browser tab with noopener/noreferrer`,
          `Links page is accessible even before data is loaded (like Glossary and Data Health)`,
        ]
      }
    ]
  },
  {
    version: 'v0.33',
    date: 'May 2026',
    source: 'Claude',
    title: 'Customizable multi-page Export Report',
    changes: [
      {
        category: 'Export Report',
        items: [
          `Expanded report modal from 3 to 4 steps, adding a new "Customize Report" step between season selection and confirmation`,
          `New Step 3 lets Activation Managers select which sections appear in the report (TV Visible Signage, Organic Social, Brand Awareness Survey, Paid Social, ANC LED, TV/Radio Affidavits, On-Court Virtual Signage, Web & Digital)`,
          `Each section panel expands to show its computed takeaway bullets as individually toggleable checkboxes`,
          `"Select all" / "Deselect all" quick-action buttons for rapid section configuration`,
          `Selected takeaway indices are passed into the report as a \`takeaways\` options object; each section renders only its chosen bullets as a "Key Takeaways" strip`,
          `Report now flows across multiple PDF pages — removed the single-page height cap (\`min-height:820px\` / \`min-height:100vh\`)`,
          `Each section card uses \`break-inside:avoid\` so cards are never split across a page break`,
          `Export Report button on partner pages now routes through the full customization modal instead of generating immediately`,
        ]
      }
    ]
  },
  {
    version: 'v0.32',
    date: 'May 2026',
    source: 'Claude',
    title: 'Revamp Top-line Takeaways — home page and partner pages',
    changes: [
      {
        category: 'Home Page Takeaways',
        items: [
          `Removed the "Impressions" bullet (TV sponsorship impressions) — now only QIMV represents the TV channel`,
          `Removed the "strongest location by QIMV/min" bullet — was purely TV-centric and not a top-line portfolio signal`,
          `Added a survey leader bullet: finds the brand with the highest aided or unaided recall % across all survey data and calls it out by name`,
        ]
      },
      {
        category: 'Partner Page Takeaways',
        items: [
          `Removed the "QIMV per minute exposure efficiency" ranking bullet (getBrandOverallRank) — not a meaningful top-line takeaway`,
          `Removed the separate QI Impressions YoY and QIMV YoY bullets; YoY deltas are now shown inline within the main QIMV and QI Impressions bullets`,
          `Added a survey takeaway: picks whichever of aided or unaided recall has the higher %, shows percentage point change YoY; omitted if no survey data exists for the brand`,
          `Condensed the two organic social bullets (impressions and brand exposure value) into a single bullet with engagement rate and BEV inline`,
        ]
      }
    ]
  },
  {
    version: 'v0.31',
    date: 'May 2026',
    source: 'Claude',
    title: 'Codebase cleanup — toast errors, dead code removal, normalization safety',
    changes: [
      {
        category: 'Code Quality',
        items: [
          `Replaced all browser alert() calls (06_helpers.js, 04_datastore.js, 16_report_template.js) with a new showErrorToast() helper that displays a styled in-app toast notification`,
          `Deleted unused formatMeanDiff() function from 07_paid_assignment.js — was defined but never called`,
          `Added per-row try/catch error handling in normalizeLoadedRows() (04_datastore.js) so a malformed row logs a console warning and is skipped rather than crashing the entire normalization pipeline`,
        ]
      }
    ]
  },
  {
    version: 'v0.30',
    date: 'May 2026',
    source: 'Claude',
    title: 'Consolidate all TV impressions reporting to QI Impressions',
    changes: [
      {
        category: 'TV Visible Signage',
        items: [
          `Removed the "Sponsorship Impressions" KPI card from the partner-page TV top box — QI Sponsorship Impressions is the only impressions figure now shown`,
          `TV quick link page: renamed "Total TV Impressions" home-card to "Total QI Impressions" and switched its computation to Sponsorship QI Impressions (YoY delta also now compares QI figures)`,
          `Partner-page topline takeaway updated from "Delivered X sponsorship impressions" to "Delivered X QI sponsorship impressions"; heading relabelled from "Impressions —" to "QI Impressions —"`,
          `Partner-page YoY impressions takeaway relabelled from "Impressions YoY" to "QI Impressions YoY" and now tracks the QI column for the trend`,
          `Asset breakdown table "Impressions" column header relabelled to "QI Impressions" and accumulates Sponsorship QI Impressions instead of raw Sponsorship Impressions`,
          `Top Matches table "Impressions" column relabelled to "QI Impressions" and displays Sponsorship QI Impressions per row`,
          `PDF report template: tvImpr and per-asset impressions accumulator switched to Sponsorship QI Impressions; top-KPI card label changed from "Sponsored Impressions" to "QI Impressions"`,
        ]
      }
    ]
  },
  {
    version: 'v0.29',
    date: 'May 2026',
    source: 'Claude',
    title: 'Brand grouping overhaul — case variants, fuzzy prefix, name changes',
    changes: [
      {
        category: 'Brand Alias Engine',
        items: [
          `Auto-detection now catches case/punctuation variants: names that compact to the same token (e.g. "COLUMBIA BANK" and "Columbia Bank", "19 ACRES" and "19 Acres") are automatically grouped — mixed-case form wins as canonical, falling back to shorter then alphabetical`,
          `Fixed word-prefix matching for names containing apostrophes or hyphens: "Hempler's" now normalizes to "hemplers" before splitting, so it correctly prefix-matches "HEMPLERS FOOD GROUP" (previously the apostrophe became a word boundary making ["hempler","s"] which didn't match)`,
          `Auto-detected groupings table in the alias manager now shows a Type column — "Case variant" or "Word prefix" — so you can see why two names were grouped`,
        ]
      },
      {
        category: 'Brand Alias Manager UI',
        items: [
          `Added dedicated "Name Changes / Formerly Known As" form: enter a former brand name and its current name to merge all historical data onto one partner page. Entries appear with a red "Rename" badge in the aliases table, visually distinct from shorthand aliases`,
          `"Custom" alias badge renamed to "Alias" for clarity; renamed entries show "Rename" badge in brand-red`,
          `"Add / update" button split into "Add alias" and "Add rename" with separate forms and appropriate placeholder text`,
          `DataStore now persists brandNameChanges (the set of alias keys that represent renames) through export/import so rename labels survive dashboard sharing`,
        ]
      }
    ]
  },
  {
    version: 'v0.28',
    date: 'May 2026',
    source: 'Claude',
    title: 'On-Court Virtual Signage — exposure & rollup fixes',
    changes: [
      {
        category: 'On-Court Virtual Signage',
        items: [
          `Fixed home-game metric attribution: instead of matching TV rows by brand name (which was incorrect because the TV export uses a single canonical brand "Toyota" for all virtual branding rows), home actuals are now looked up by matching the game date (normalised from schedule M/D/YY vs TV Matchdate M/D/YYYY) against the TV data's Matchdate column plus position (Center / 3 Point Line). Each schedule entry now receives the correct actuals for that specific game.`,
          `Away-game estimates (and home-game fallbacks where no TV row matches) now use the simple per-position mean — exactly the same value shown in the "Season averages by position" table. The previous floor(min(mean, median)) conservative estimate is retired, eliminating the discrepancy between the displayed averages and the per-partner exposure numbers.`,
          `Partner pages now show the full brand-family rollup in the On-Court Virtual Signage section: navigating to Toyota displays combined KPIs and a single schedule table covering all sub-brands (Toyota Dealers, Toyota Generic, Vancouver Toyota, etc.) with a Brand column added to identify each entry. Previously only the exact canonical-name games were shown.`,
        ]
      }
    ]
  },
  {
    version: 'v0.27',
    date: 'May 2026',
    source: 'Claude',
    title: 'On-Court Virtual Signage — 6 enhancements',
    changes: [
      {
        category: 'On-Court Virtual Signage',
        items: [
          `Partner pages now include a collapsible "On-Court Virtual Signage" dropdown section showing KPIs (Exposures, QIMV, QI Impressions, Duration) and a per-game schedule filtered to that brand's appearances`,
          `TV Visible Signage section on partner pages now shows a callout note when virtual branding rows exist, clarifying that Center + 3-Point Line metrics have been moved to the On-Court Virtual Signage tab`,
          `Exposures now use the "Source Exposures" (or "Total Exposures") column from TV visible signage data rather than a simple game count — home-game actuals are summed from TV rows; away-game exposures use the same conservative estimate as QIMV / QI Impressions`,
          `Added "Season averages by position" table at the bottom of the virtual signage portfolio page — shows simple per-game mean for Exposures, QI Impressions, Duration, and QIMV at each position (Center, 3-Point Line) based on all measured home-game appearances`,
          `Estimation methodology changed from per-brand × per-position to per-position only — away-game estimates are now pooled across all brands at a position so every partner at Center uses the same base rate, regardless of individual home-game sample size`,
          `Partner breakdown table now groups brands sharing a common name prefix (e.g. "Toyota", "Toyota Generic", "Toyota Dealers") into a bold parent row showing the combined game total and metrics, with indented sub-brand rows below — single-brand entries are unchanged`,
        ]
      }
    ]
  },
  {
    version: 'v0.26',
    date: 'May 2026',
    source: 'Claude',
    title: 'Match → Game Terminology',
    changes: [
      {
        category: 'Terminology',
        items: [
          `Renamed all user-facing instances of "match" / "matches" (sports event) to "game" / "games" throughout the dashboard — section meta strip, pace chart summary, pace chart axis label, pace chart hover tooltip, top-games card title, top-games table header, YoY basis line, and report template badge`,
          `Internal code identifiers (Matchdate column references, variable names, function names, and the auto-match comparison mode string) are unchanged`,
        ]
      },
      {
        category: 'ANC LED Report',
        items: [
          `Added support for SPONSOR_AVERAGE_<arena>_<asset>_<startDate>_<endDate>.csv files (one per in-arena LED asset — Stanchion, Player Tunnel, Endzone Wedge, 360Ring, Voms, etc.) — file detection by filename prefix or by columns (Sponsor Name + Pre-Game Avg + Time Total)`,
          `New collapsible "ANC LED Report" section appears on partner pages above the TV & Radio Affidavits section — KPI strip (Total exposure time, Assets carrying brand, Total Event-Avg per game, Campaign variants), Per-asset summary table (rolls up the brand's variants on each asset), and Campaign variant detail table (raw sponsor name on each asset)`,
          `HH:MM:SS time strings parsed to seconds for math; reformatted for display so totals across assets sum correctly`,
          `Date range parsed from filename and shown as the section subtitle`,
          `Added a new ANC LED channel chip to the partner header that scrolls to the section`,
          `Sub-campaign rollups (Option B per request): variants are grouped under a parent canonical brand for headline numbers AND each variant is shown as its own row in the variant detail table`,
          `Added explicit aliases that auto-detection couldn't catch: 10 Toyota dealerships → Toyota (BEAVERTON, CAPITOL, DICK HANNAH, GRESHAM, LUMS, RON TONKIN, ROYAL MOORE, TOYOTA OF PORTLAND, VANCOUVER, WILSONVILLE — Damian Lillard Toyota intentionally kept separate); 10 Moda Health sub-campaigns (MODA, MODA ASSIST, Moda Busy Families, MODA EMPLOYER, MODA EXPERIENCE BETTER, Moda Harpers, MODA LUCKY SECTION, MODA PLUM TASTY, MODA TEAM SPORT, Moda Partnership) → Moda Health; Alaska Dunk Of The Game → Alaska Airlines; Comcast Xfinity → Xfinity. Other variants (Daimler 50k Trees, Fred Meyer Family Funday, McDonalds App, AXIOM STOP TRACKER, etc.) auto-detect via the existing word-prefix system`,
          `Non-partner content (Game Prompt, TBI, PORTLAND FIRE, Test Content, etc.) is currently ingested as-is per request — these will appear as separate "partners" until you add explicit handling later`,
          `New source file src/19_anc_led_section.js holds time parsing, filename parsing, ingestion, and section render`,
        ]
      },
      {
        category: 'TV & Radio Affidavits',
        items: [
          `Added support for two new file types: TVAffidavit_partner_summary.csv and RadioAffidavit_partner_summary.csv — both rolled into a single DataStore.affidavits store with a Channel: 'TV' | 'Radio' field per row`,
          `New collapsible TV & Radio Affidavits section appears at the bottom of every partner page that has affidavit data — KPI strip (Total spots, TV Contracted, Radio Contracted, Bonus rate), daypart breakdown table with columns for TV Contracted / TV Bonused / TV Total / Radio Contracted / Radio Bonused / Radio Total / Total, and Preseason vs Regular Season breakdown when both seasons have data`,
          `Collapsed section header strip shows distinct TV vs Radio numbers (TV spots, Radio spots, TV Contracted, Radio Contracted) so the channel split is clear at a glance`,
          `Radio CSV partner names truncated at ~30 chars (e.g. "COLUMBIA BANK-Radio Game Broadc") are auto-stripped during ingestion via /-Radio…/ regex so they flow through normal alias resolution`,
          `Added explicit aliases NORTHWEST FORD STORES → Ford and PNW TOYOTA DEALERS ASSOC → Toyota; Damian Lillard Toyota intentionally kept as its own partner since it represents a specific dealership rather than the corporate brand`,
          `Added a new TV/Radio Affidavits channel chip to the partner header alongside TV Signage / Organic Social / Survey Research / Paid Social — clicks scroll to the section`,
          `New source file src/18_affidavits_section.js holds ingestion + section render; the build picks it up automatically via the existing [0-9][0-9]_*.js glob`,
        ]
      },
      {
        category: 'Brand Alias Bug Fix',
        items: [
          `Fixed: adding a single manual alias was collapsing the auto-detected list from dozens of pairings down to ~2. Root cause: row data was mutated in place when auto-detection ran, losing the original brand name. On the next canonicalization pass, the brand registry no longer contained the variant names, so re-detection couldn't find the same pairings — the previously-detected merges still showed correctly on partner pages, but the alias-manager's "Auto-detected" count was being overwritten with a tiny new result.`,
          `Fix: now preserve the original brand name on each row in _rawBrand / _rawPartner / _rawSponsor fields. Every canonicalization pass resolves from the raw, so manual + auto-detected + blocked aliases all take effect together without losing source names. Auto-detection itself now runs on the raw-name set (via a new skipAutoDetect flag on resolveCanonicalBrandName) so it sees every variant ever ingested, regardless of how many merges have already happened.`,
          `Bonus side-effect: clicking "Keep separate" on an auto-detected grouping now actually un-merges the row data immediately — previously the block was recorded but the rows already said the canonical name and only a fresh CSV reload would restore the split.`,
          `New helper resolveAndTrackRaw(row, field, rawField) centralizes the "capture original on first pass, re-resolve from original on subsequent passes" logic; applied across normalizeLoadedRows, canonicalizeAllBrandData, canonicalizeObjectRowsByBrand, and the TV / organic ingestion paths in 14_organic_section.js`,
        ]
      },
      {
        category: 'Persisted User Presets',
        items: [
          `Exported preloaded dashboards now carry over the user's filter, toggle, and sort settings — comparison mode (Matched Games / Full Season), survey phase (Early / Late on partner pages and the portfolio), portfolio tabs, KPI mode (YoY / MoM), date filters (month / range), sort key/dir on every sortable table, and partner-browse search/Partners-only state`,
          `Navigation state (currently-viewed partner / page) is intentionally NOT persisted — exported dashboards always open at Home so the recipient sees the command center first`,
          `Added getCurrentUserPresets() and applyUserPresets() in 04_datastore.js to centralize the snapshot/restore logic; presets ride along inside getSerializableDataStore() and are applied at the end of loadPreloadedData()`,
        ]
      },
      {
        category: 'Brand Awareness YoY',
        items: [
          `Added YoY change badges to Unaided Recall, Aided Recall, and Local HQ Recall KPI cards on the partner page Brand Awareness section — same arrow + percent + green/red styling as TV Visible Signage`,
          `YoY uses same-phase comparison (Early→Early or Late→Late) consistent with the established survey YoY convention; falls back to "— YoY" when no prior wave with matching phase exists`,
          `Total Respondents card intentionally has no YoY (sample-size context, not a performance metric)`,
        ]
      },
      {
        category: 'Brand Alias Matching',
        items: [
          `Fixed a systematic gap in resolveCanonicalBrandName: after checking alias keys, now also checks whether the incoming name compacts to match any canonical brand name — catches case and punctuation variants like "NIKE" → "Nike", "adidas" → "Adidas", "MODA HEALTH" → "Moda Health" without requiring an explicit alias entry for every variant`,
          `Added word-prefix auto-detection: after data loads, brand names whose words are a prefix of another brand's words are automatically grouped — "Axiom Eco-Pest Control" → "Axiom", "10 Barrel Brewing" → "10 Barrel", etc. Shorter name wins as canonical.`,
          `Added DataStore.autoDetectedAliases (computed post-load) and DataStore.autoAliasBlocks (user-maintained, persisted in exports) to support the auto-grouping system`,
          `Manage Brand Aliases modal now shows three sections: Manual Aliases, Auto-detected Groupings (with Keep separate buttons), and Blocked Groupings (with Re-enable buttons) — full override control without losing the auto-detection benefit`,
          `Extracted applyAutoDetectedAliases() and called it from handleFiles so auto-detection runs after fresh CSV uploads, not just from preloaded dashboards or alias-manager flows (this is what was making auto-detection appear to do nothing after uploads)`,
          `canonicalizeAllBrandData now also resolves Zoomph row Brand fields, closing a gap where Zoomph data escaped alias resolution`,
        ]
      }
    ]
  },
  {
    version: 'v0.25.4',
    date: 'April 2026',
    source: 'ChatGPT',
    title: 'Survey Comparison Formatting + Offline Audit',
    changes: [
      {
        category: 'Survey Comparison Formatting',
        items: [
          `Converted Moda / Delta Dental and survey question comparison displays from percentage-point deltas to relative percent change, matching Brand Awareness and TV visible signage KPI treatment`,
          `Updated survey KPI cards, history tables, and chart hover labels to show arrow-based percent movement with green/red/neutral styling`,
          `Kept flat movements as neutral percent changes instead of using pp language`,
        ]
      },
      {
        category: 'Offline Packaging',
        items: [
          `Re-audited the standalone HTML/source bundle for external network calls and retained the fully self-contained offline build approach`,
        ]
      }
    ]
  },
  {
    version: 'v0.25.3',
    date: 'April 2026',
    source: 'ChatGPT',
    title: 'Partner-Specific Survey Dropdowns + Comparison Metrics + Smarter Assignment Matching',
    changes: [
      {
        category: 'Moda + Delta Dental Partner Pages',
        items: [
          `Moved Moda Health / Delta Dental specific question content into its own partner-page collapsible dropdown instead of rolling it into the general Survey Research dropdown`,
          `Kept the general Survey Research dropdown focused on Brand Awareness, Fan Insights, and Programs & Community while partner-specific question batteries render separately only where data exists`,
          `Preserved the top KPI cards, large click-to-expand trend chart, and full wave-history text table structure for the partner-specific survey question dropdown`,
        ]
      },
      {
        category: 'YOY + Survey-to-Survey Comparisons',
        items: [
          `Added survey-to-survey comparison metrics to Moda / Delta Dental KPI cards, chart hover tooltips, and response history tables`,
          `Added same-timing YOY comparison metrics for partner-specific survey questions, using prior Early-to-Early or Late-to-Late comparisons where available`,
          `Expanded partner-specific history tables with dedicated prior survey and YOY columns so the table remains the main detail view while the trend chart provides movement context`,
        ]
      },
      {
        category: 'Survey Assignment + Alias Matching',
        items: [
          `Strengthened GeneralSurvey_ auto-assignment matching by checking loaded partner names, default alias rules, custom alias rules, and partner roster names with longest-match priority`,
          `Expanded survey answer-option matching beyond prefix-only detection so obvious partner mentions embedded later in the text can auto-assign instead of remaining manual`,
          `Added support for sponsor language such as presented by, sponsored by, powered by, and brought to you by before falling back to alias matching`,
        ]
      },
      {
        category: 'New Survey File Build-Out',
        items: [
          `Noted this as the final v0.25 refinement for the three new survey file families: GeneralSurvey_, Program_, and ModaDeltaDental_`,
        ]
      }
    ]
  },
  {
    version: 'v0.25.2',
    date: 'April 2026',
    source: 'ChatGPT',
    title: 'Survey Research Visual Consistency + Moda / Delta Dental Scope Refinement',
    changes: [
      {
        category: 'Survey Research KPI Cards',
        items: [
          `Updated Survey Research KPI takeaway cards to reuse the existing dashboard .kpi card structure used by sections like TV Visible Signage so survey takeaways now share the same visual treatment, typography, and badge styling`,
          `Kept the Survey Research KPI cards compact while preserving the top-box takeaway pattern across Brand Awareness, Fan Insights, Programs & Community, and partner-specific survey question sections`,
        ]
      },
      {
        category: 'Survey Research Trend Charts',
        items: [
          `Restyled survey trend charts to better match the Organic Social chart language: cleaner axes, mono tick labels, dashed gridlines, direct hover targets, and an external wrapping legend to reduce label overlap`,
          `Made embedded survey trend charts clickable for expansion while retaining the on-page hover tooltip and series swap controls`,
        ]
      },
      {
        category: 'Moda + Delta Dental Survey Questions',
        items: [
          `Removed the Moda + Delta Dental specific question tab from the main Survey Research home page so those questions live only on the respective Moda Health and Delta Dental partner pages`,
          `Changed the partner-page Moda / Delta Dental question trend from a top-two style view into grouped response lines: extremely likely + likely, somewhat / neutral, and unlikely + extremely unlikely where those answer buckets exist`,
          `Kept the full text history tables for partner-specific survey questions as the primary detail view beneath the trend chart`,
        ]
      },
      {
        category: 'New Survey File Build-Out',
        items: [
          `Noted this refinement as part of the ongoing build-out for the three new survey file families: GeneralSurvey_, Program_, and ModaDeltaDental_`,
        ]
      }
    ]
  },
  {
    version: 'v0.25.1',
    date: 'April 2026',
    source: 'ChatGPT',
    title: 'Immediate Survey Research UX Fixes + Three Survey File Build-Out Refinement',
    changes: [
      {
        category: 'Survey Research Dropdowns',
        items: [
          `Restored the individual partner Survey Research dropdown to the same shared collapsible section layout used by the rest of the dashboard so the full header bar renders instead of only the arrow`,
          `Kept the collapsed Survey Research summary focused on Brand Awareness / recall KPIs while leaving Fan Insights, Programs & Community, and partner-specific question details inside the dropdown`,
          `Confirmed Programs & Community, Fan Insights, and Moda + Delta Dental question blocks remain part of the Survey Research dropdown build-out for GeneralSurvey_, Program_, and ModaDeltaDental_ files`,
        ]
      },
      {
        category: 'Survey Research Home Page',
        items: [
          `Moved survey trend charts to the bottom of their tab sections so clean text tables lead the analysis and the larger interactive graphs support the table below/afterward`,
          `Updated Brand Awareness, Fan Insights, Programs & Community, and Moda + Delta Dental charts to support direct on-page series swapping instead of requiring the pop-out first`,
          `Added instant hover tooltips and line highlighting to embedded survey charts for snappier chart interaction`,
          `Reduced chart label overlap by limiting visible series to an intentional selected set and wrapping the legend into multiple rows`,
        ]
      },
    ]
  },
  {
    version: 'v0.25',
    date: 'April 2026',
    source: 'ChatGPT',
    title: 'Survey Research Consolidation + Three New Survey File Build-Out',
    changes: [
      {
        category: 'Survey Research (Partner Page)',
        items: [
          `Consolidated Brand Awareness, Programs & Community, Fan Insights, and Moda / Delta Dental specific questions into one Survey Research dropdown on individual partner pages instead of separate survey-adjacent blocks`,
          `Programs & Community and Fan Insights now use the same partner-page pattern as Brand Awareness: compact KPI cards first, a large click-to-expand trend chart second, and a clean full-history text table third`,
          `Survey Research charts on partner pages respect the in-section Early / Late timing filter so trend lines and history tables stay aligned with the selected wave timing`,
          `Moda + Delta Dental specific questions now use top-three response trend lines plus response-history text tables, replacing the less useful top-two box / bar-chart style presentation`,
        ]
      },
      {
        category: 'Survey Research (Home Page)',
        items: [
          `Added click-to-expand trend chart scaffolding to the Survey Research home page so Brand Awareness, Fan Insights, Programs & Community, and Moda + Delta Dental question trends can be reviewed over time`,
          `Reworked Fan Insights and Programs & Community home-page views away from bar-style displays and toward text-first tables with response counts, percentages, prior-wave movement, and respondent bases`,
          `Added a dedicated Moda + Delta Dental tab to the Survey Research home page for the new partner-specific survey file`,
        ]
      },
      {
        category: 'New Survey File Build-Out',
        items: [
          `Confirmed this work is part of the build-out for the three new survey file families: GeneralSurvey_ files, Program_ files, and ModaDeltaDental_ files`,
          `ModaDeltaDental_ partner rows now register Moda Health and Delta Dental as Survey Research partners even when they do not have separate Brand Awareness rows`,
          `Fan Insights is structured for future YoY waves even when only the current GeneralSurvey_ wave is available today`,
        ]
      }
    ]
  },
  {
    version: 'v0.24',
    date: 'April 2026',
    source: 'Claude',
    title: 'Organic + Paid Date Range Controls, Partner Efficiency Filter, Pace Calendar Axis, UI Polish',
    changes: [
      {
        category: 'Organic Social (Partner Page)',
        items: [
          `Added the All months / Month / Range date filter from the Organic Social Portfolio page to the Organic Social section on partner pages — same UX, same controls`,
          `Replaced the latest-snapshot KPI values with totals across the selected date window — Views/Impressions, Engagements, Posts, Logo Impressions, Video Views, Brand Value, and Social Value all now sum across the chosen window`,
          `Engagement Rate KPI now shows the weighted average (total engagements ÷ total views) across the selected window instead of the latest snapshot`,
          `YoY badges on KPI cards now compare the active window vs the same window shifted back 12 months — works for both Month and Range modes`,
          `Partner Performance breakdown table now respects the active date filter so the rows match the KPI totals`,
          `Collapsed section summary strip now shows totals for the active window instead of the single latest snapshot`,
        ]
      },
      {
        category: 'Paid Social Portfolio',
        items: [
          `Replaced the fiscal-year period selector with the same All months / Month / Range date filter the Organic page uses — KPIs, partner table, and campaign table all filter by the chosen date window`,
          `YoY / MoM KPI comparison now compares the active date window against the same window shifted back 12 months (YoY) or 1 month (MoM)`,
          `Removed the Daily Spend bar chart card — redundant with the date filter and the per-partner pacing chart`,
          `Removed the Spend by Objective chart card`,
          `Partner Efficiency scatter is now filterable by Result indicator — pick a result type and the X-axis becomes that result's count, with only partners who delivered that result shown. Defaults to CTR vs CPM (the prior view) when no result is selected`,
          `Partner Efficiency bubbles are now hoverable (tooltip shows X-axis value, CPM, impressions, results, spend) and clickable (opens that partner's page)`,
          `Removed dead code: renderPortfolioDailySpendChart and the inline Spend-by-Objective renderer`,
        ]
      },
      {
        category: 'TV Visible Signage (Partner Page)',
        items: [
          `Removed the QIMV / QIMV per Min / YoY metric-tabs sort selector from the asset breakdown — column headers are already sortable, so the duplicate control was clutter`,
          `Asset Performance Quadrant card now has an info icon (ⓘ) that explains how to read the chart (axis meanings, bubble size, the four quadrant labels)`,
          `Season Pace chart x-axis now switches with the comparison toggle: Matched Games keeps the match-number axis (current behavior); Full Season switches to a calendar-month axis spanning Oct → end of Apr so prior and current season line up by date`,
        ]
      },
      {
        category: 'Survey (Partner Page)',
        items: [
          `Recall trend chart now shows the percentage value above every data point (with a background-colored stroke for legibility against the grid lines) — no more hovering required to read each wave's number`,
        ]
      },
      {
        category: 'Partner Page Header',
        items: [
          `Partner logo enlarged from 52px to 96px and partner name from 40px to 64px — the partner identity is now the visual anchor of the page`,
        ]
      }
    ]
  },
  {
    version: 'v0.23',
    date: 'April 2026',
    source: 'Claude',
    title: 'Partner Logos, Takeaway Labels, TV Portfolio Upgrades, Paid Social Portfolio Overhaul',
    changes: [
      {
        category: 'Partner Logos',
        items: [
          `Logo images (PNG/SVG) placed in the logos/ folder now display in partner browse cards, the header search dropdown, the partner page header, and the report-export partner picker — all four use renderPartnerLogo() which falls back gracefully when no logo is available`,
          `Fixed logo build system: build.ipynb Cell 1 referenced partner_logos_js but never defined it (would crash); added logo-loading code to Cell 1 and Cell 3 that base64-encodes all files in logos/ and emits const PARTNER_LOGOS`,
          `Renamed logo files to match canonical partner names required by the build: Toyota_logo.png → Toyota.png, Alaska_Airlines_logo.svg.png → Alaska Airlines.png, Axiom_logo.png → Axiom.png, FredMeyer_logo.png → Fred Meyer.png`,
        ]
      },
      {
        category: 'Takeaways',
        items: [
          `Partner page: split the combined "impressions + QIMV" opening takeaway into two clearly labeled lines — "Impressions —" and "QIMV —" — so each metric stands on its own`,
          `Partner page: added a dedicated QIMV YoY takeaway ("QIMV YoY —") alongside the existing impressions YoY line so both metrics show year-over-year change independently`,
          `Partner page: impressions YoY takeaway now prefixed "Impressions YoY —" for symmetry`,
          `Portfolio (TV page): split the combined QIMV + impressions takeaway into two separate items, each with its own YoY growth label — QIMV and impressions changes no longer share a single sentence`,
        ]
      },
      {
        category: 'UI / Labels',
        items: [
          `Renamed "Auto-match" to "Matched Games" on the YoY comparison toggle (TV portfolio page and partner page)`,
          `Removed the "Related links" footer section from the TV Visible Signage portfolio page — the three link cards (Partner deep-dive, Import/Export, Partner comparison) were redundant with the home page`,
        ]
      },
      {
        category: 'TV Visible Signage Portfolio',
        items: [
          `Removed the "Browse Partners" and "Open TV Visible Signage" shortcut buttons from the home page header — the Quick Links section below already serves this purpose`,
          `Replaced the "Total Organic Social Impressions" KPI card with "QIMV per Minute" (Total QIMV ÷ total duration) — a more relevant efficiency signal for the TV signage portfolio`,
          `All four KPI cards on the TV portfolio page now show a YoY or Matched Games change badge beneath the value, respecting the active comparison mode toggle`,
          `Partners in the Top Partners table are now clickable — clicking a partner name navigates directly to that partner's page`,
          `Column headers in the Top Partners and Location Performance tables now have info-icon tooltips (ⓘ) that show the glossary definition on hover`,
          `Fixed: QIMV and Impressions % change in the top takeaways section now correctly re-computes when toggling between Matched Games and Full Season — previously always used the full prior season regardless of mode`,
        ]
      },
      {
        category: 'Paid Social Portfolio',
        items: [
          `Removed the flavor-text paragraph below the partner performance table title — the table is self-explanatory`,
          `CPM now shows two decimal places throughout the portfolio page (KPI card, partner table, campaign table) — previously rounded to the nearest dollar`,
          `Added a Partners / Campaigns tab toggle to the breakdown table — the Campaigns tab shows per-campaign rows with columns: Campaign, Partner, Impressions, Reach, CTR, CPM, Spend, Objective`,
          `Redesigned chart layout: Daily Spend, Spend by Objective, and Partner Efficiency are now individual full-width cards stacked vertically, each with its own independent fiscal year filter toggle`,
          `Spend by Objective chart enlarged — bars are taller (48 px), left/right padding increased, labels bumped to 14 px / 12 px so values are readable at a glance`,
          `Added YoY (default) / MoM toggle to KPI cards — each card shows a colored ▲/▼ badge with the percentage change vs the prior fiscal season (YoY) or the prior calendar month (MoM)`,
        ]
      }
    ]
  },
  {
    version: 'v0.22',
    date: 'April 2026',
    source: 'Claude',
    title: 'Glossary Click Fix + Table Metric Priority Reorder',
    changes: [
      {
        category: 'Bug Fix',
        items: [
          `Fixed Glossary button never responding to clicks — the Blazers theme ::before pseudo-element on .home-action cards was intercepting pointer events. Added pointer-events:none to fix.`,
          `Fixed Glossary page crash: renderGlossaryPage referenced INFO_DEFINITIONS which was never defined (the actual constant is GLOSSARY). Fixed all key lookups to match GLOSSARY keys, and added inline definitions for YoY, GOG, and survey metrics that were missing from GLOSSARY.`,
          `Same fix makes all home action cards (Data Health, Changelog, Partner Browse, etc.) more reliably clickable.`,
        ]
      },
      {
        category: 'Metric Priority',
        items: [
          `Paid Social portfolio table: Impressions, Reach, CTR, Campaigns first — Spend moved to last column`,
          `Organic Social portfolio: default sort changed to Views/Impressions`,
          `Organic Social partner KPIs confirmed in media-first order: Views → Engagements → Eng Rate → Posts → Logo Impressions → Video Views → Brand Value → Social Value`,
        ]
      }
    ]
  },
  {
    version: 'v0.21-foundation',
    date: 'February 2026',
    source: 'GPT',
    title: 'Foundation, Data Health, Glossary, Theming, and Organic Portfolio Controls',
    changes: [
      { category: 'Foundation / Navigation', items: [
        'Added a dedicated Data Health page for source row counts, date coverage, channel freshness, paid assignment health, brand aliases, and missing-column checks',
        'Added a Glossary & Methodology page using the finalized QIMV, QIMV/min, QI Score, QI Impressions, 100% Media Value, paid social, organic social, and survey definitions',
        'Added breadcrumb navigation to portfolio pages, partner pages, Data Health, Glossary, and Changelog views',
        'Made partner channel tags clickable so AMs can jump directly to TV, Organic Social, Paid Social, or Survey sections on a partner page',
        'Added Partner Report Export as a coming-soon home-page tool without building PDF generation yet'
      ]},
      { category: 'Theme / UI System', items: [
        'Kept the Blazers-inspired dark theme as the working v0.21 visual direction',
        'Formalized more of the dashboard styling around shared theme tokens so future theme changes can be made in one place',
        'Improved hierarchy on command-center cards and key navigation destinations while keeping the dashboard offline/local-first'
      ]},
      { category: 'Organic Social Portfolio', items: [
        'Moved Organic Social into the main portfolio row on the home page alongside TV Visible Signage, Paid Social, and Survey Research',
        'Added three portfolio-level Organic Social tabs: Overall Brand Performance, Brand Content Series, and Brand on Asset',
        'Added month filtering, all-month view, and month-range filtering to the Organic Social Portfolio page',
        'Changed the Content Series tab to rank individual content series instead of collapsing the leaderboard back to brand names',
        'Changed the Brand on Asset tab to rank individual partnered assets instead of collapsing the leaderboard back to brand names',
        'Kept row click-through behavior so each content series or asset still opens the mapped partner page'
      ]},
      { category: 'Tables / Sorting', items: [
        'Added Top 10 / Top 25 / All controls to key portfolio leaderboards',
        'Fixed table-length controls so Top 25 and All update the displayed rows reliably',
        'Standardized the active sort arrow treatment on sortable portfolio tables',
        'Changed Paid Social portfolio default sorting from spend to impressions to better match leadership-facing performance review needs'
      ]},
      { category: 'Bug Fixes', items: [
        'Fixed the Glossary home-page card so it opens the Glossary & Methodology page reliably',
        'Fixed Data Health / Glossary navigation to work even when a prior partner or portfolio state was active',
        'Improved changelog detail so v0.21 can serve as a more useful audit trail before v0.22 work begins'
      ]}
    ]
  },
  {
    version: 'v0.20',
    date: 'April 2026',
    source: 'Claude',
    title: 'Bug Fixes + Paid Overhaul + Organic Portfolio Tabs + Partner Browse Fix',
    changes: [
      {
        category: 'Bug Fixes',
        items: [
          `CRASH FIX: renderTopPostsTable was deleted in v0.18 but still called in renderLegacySocialBody — restored the function`,
          `CRASH FIX: back-to-top button existed in DOM but scroll event listener was never wired in DOMContentLoaded`,
          `FIX: Partner Browse search input re-rendered the full page on every keystroke causing cursor jumps — now only re-renders the card grid while preserving input focus`,
          `FIX: Organic Social and Survey sections always rendered even for brands with no data in those channels — now gated on channel presence`,
        ]
      },
      {
        category: 'Paid Social',
        items: [
          `Bar chart: replaced grey opacity shades with 10 distinct colors per campaign — far easier to tell apart`,
          `Bar chart: X axis now spans the full fiscal year (July 1–June 30) even when campaign data doesn't cover the whole period`,
          `Bar chart campaign checkboxes: active campaigns show a color swatch + checkmark; inactive are greyed with no checkmark`,
          `Removed Campaign Flights (Gantt chart) section — will revisit later when flight date coverage is more reliable`,
          `Partner KPI cards: removed Amount Spent — leading metrics are now Impressions, Reach, Link Clicks, CTR, Results, Campaigns, CPM`,
          `Campaign table: Impressions, Reach, Link Clicks moved to front; Spend, CPM, CPC moved to end`,
          `Paid section summary strip (collapsed header): removed Spend, shows Impressions first`,
        ]
      },
      {
        category: 'Organic Social Portfolio',
        items: [
          `Main Organic Social Portfolio page now has three tabs: Partner Performance, Content Series, Brand on Asset`,
          `Tabs are dynamically shown — Content Series and Asset tabs only appear when those files are loaded`,
          `All three tables use the same sort controls`,
        ]
      },
      {
        category: 'Navigation',
        items: [
          `HOME button (house icon) added back to header, left of search bar — always visible`,
          `PartnerIQ logo still navigates home too (two ways to go home)`,
        ]
      }
    ]
  },
  {
    version: 'v0.19',
    date: 'April 2026',
    source: 'Claude',
    title: 'Bar Charts + Organic Tabs + Partner Browse + Header + Back-to-Top + Emojis',
    changes: [
      {
        category: 'Paid Social',
        items: [
          `Pacing chart replaced with daily bar chart — each bar shows one day total (not cumulative), cumulative shown on hover`,
          `Hover tooltip shows per-campaign breakdown + running cumulative for that day`,
          `Campaign filter checkboxes each have a colored opacity swatch matching their bar shade`,
        ]
      },
      {
        category: 'Organic Social',
        items: [
          `Trend chart dots are now hoverable — shows month, metric value, views, engagements, brand value, posts on a single tooltip`,
          `Organic Social partner section now has tabbed table: Partner Performance / Content Series / Brand on Asset`,
          `Organic Social portfolio table: default sort changed to Posts (descending); Brand Value and Social Value moved to the right of the table`,
          `Fixed critical bug: Zoomph organic brands not registering channel in rebuildBrandRegistryFromData — SOC tag now lights up correctly after alias changes or paid reassignment`,
        ]
      },
      {
        category: 'Navigation & Header',
        items: [
          `Header simplified to: PartnerIQ logo/title + partner search bar + Import/Export (hidden in viewer mode)`,
          `Removed Survey, Organic, and Home nav buttons from header — navigation lives on the home quick links page`,
          `Import/Export button now hidden by default, shown only in edit mode (applyViewerMode updated)`,
          `Partner Deep-Dive now opens a dedicated Partner Browse page instead of focusing the header search bar`,
          `Partner Browse page: grid of all partner cards, search filter, current-partners-only toggle, channel emoji tags`,
        ]
      },
      {
        category: 'UI Improvements',
        items: [
          `Back-to-top button: fixed position bottom-right, fades in after scrolling 400px, smooth scroll on click`,
          `Emojis added to all home quick link card titles and section headers (📺 TV, 📱 Organic, 💰 Paid, 📊 Survey, 🔍 Partners, 📝 Changelog)`,
          `Location performance table now scrollable with max-height ~10 rows — no longer stretches the full page`,
        ]
      },
      {
        category: 'Dead Code Removed',
        items: [
          `Removed dead homeNavBtn, surveyNavBtn, organicNavBtn event listener wiring (buttons no longer in DOM)`,
        ]
      }
    ]
  },
  {
    version: 'v0.18',
    date: 'April 2026',
    source: 'Claude',
    title: 'Organic Social Portfolio + Paid Chart Overhaul + File Log + Bug Fixes',
    changes: [
      {
        category: 'Organic Social',
        items: [
          `Fixed critical bug: organic-slot ID mismatch — Zoomph data was loaded but the section never rendered on partner pages`,
          `Organic Social Portfolio page built: KPI strip (brand value, social value, views, engagements, logo impressions), brand leaderboard with sortable columns, YoY brand value comparison`,
          `Organic Social Portfolio now live in home quick links (previously disabled)`,
          `Organic nav button added to header: Home → Survey → Organic → Import/Export`,
          `Organic Social Portfolio page wired to routing, nav button, and home quick links`,
        ]
      },
      {
        category: 'Paid Social',
        items: [
          `Replaced single pacing chart (with YoY overlay) with multi-campaign chart: all campaigns for the partner shown as individual cumulative lines`,
          `Campaign filter: checkbox list lets you show/hide individual campaigns from the chart`,
          `Metric toggle applies to multi-campaign chart (Impressions default, Spend, Reach, Link Clicks, Results)`,
          `Each data point on multi-campaign chart is hoverable: shows campaign, date, daily value, cumulative value`,
          `Removed redundant renderPaidPacingChart, wirePacingChart, buildPacingPoints (replaced by multi-campaign equivalents)`,
        ]
      },
      {
        category: 'File Log',
        items: [
          `Import/Export modal now shows a persistent log of all files loaded this session`,
          `Log persists across modal open/close — you can always see what has been uploaded`,
          `Log shows file type, row count, and relevant metadata per file`,
          `Clear Data button also resets the session file log`,
        ]
      },
      {
        category: 'Home Page',
        items: [
          `Home page takeaways now default to the latest season only — removed All Seasons option from home period selector`,
          `getSelectedHomePeriod() now always returns the most recent season, never all-seasons`,
        ]
      },
      {
        category: 'Versioning',
        items: [
          `Version numbering updated to v0.X format throughout the changelog (v16 → v0.16, v17 → v0.17, etc.)`,
          `This version is v0.18`,
        ]
      },
      {
        category: 'Dead Code Removed',
        items: [
          `renderSocialSection (legacy post-level social renderer — replaced by renderOrganicSocialSection)`,
          `renderSocTimeChart, renderSocPlatformChart, renderSocContentChart (canvas-based social charts)`,
          `renderTopPostsTable (only called from renderSocialSection)`,
          `renderSparkline stub (replaced by renderMetricSparkline)`,
          `renderFileList (replaced by renderFileLog with persistent state)`,
        ]
      }
    ]
  },
  {
    version: 'v0.17',
    date: 'April 2026',
    source: 'Claude',
    title: 'Paid Social Daily Data + Interactive Charts + Organic Social + Cleanup',
    changes: [
      {
        category: 'Paid Social — Daily Data & Normalization',
        items: [
          `Day column from Ads Manager export parsed into DailyDate on each row — enables all time-series charts`,
          `getBrandPaidDailyRows() and getPaidDailyRowsForPeriod() helpers for chronologically sorted daily rows`,
          `CPC (cost per link click) verbose column name now correctly mapped`,
          `Campaign Budget and Campaign Budget Type columns now normalized`,
        ]
      },
      {
        category: 'Paid Social — Visualizations',
        items: [
          `Pacing chart now toggleable: Impressions (default), Spend, Reach, Link Clicks, Results — metric toggle sits inline in card header`,
          `Pacing chart now has hover tooltips on every data point: date, daily value, cumulative value`,
          `Campaign Flight Gantt: SVG timeline, each campaign bar spans Starts → Ends, colored by objective, proper hover tooltip showing spend, impressions, reach, clicks, dates`,
          `Gantt campaign filter: checklist dropdown lets you show/hide individual campaigns from the chart`,
          `Today marker shown on Gantt when current date is within the flight range`,
          `Portfolio daily spend chart on Paid Social portfolio page`,
        ]
      },
      {
        category: 'Organic Social (Zoomph)',
        items: [
          `Full ingestion for all three Zoomph file types: BrandedPartnerPerformance, BrandedContentSeries, BrandOnAsset`,
          `All three files share the same column schema: Name, Organic Posts, Engagements, Views/Impressions, Social Value, Logo Impressions, Brand Value, Engagement Rate, Video Views, Follower Interaction Rate, Brand Content Score, ReportDate`,
          `ReportDate column drives time-series and YoY logic — add end-of-period date to each Zoomph export`,
          `Brand linking: BrandedPartnerPerformance uses alias resolution directly; ContentSeries and BrandOnAsset extract brand by prefix matching the Name against known canonical brands`,
          `Organic Social section on partner pages: KPI cards, monthly trend chart (impressions, engagements, brand value), content series table, asset table`,
          `YoY compares latest ReportDate snapshot to the same calendar month one year prior`,
          `Legacy post-level social data still displayed as a sub-section when loaded`,
          `File detection by filename prefix: BrandedPartnerPerformance, BrandedContentSeries, BrandOnAsset`,
          `DataStore additions: zoomphBrandPerf, zoomphContentSeries, zoomphAssets — all persist in preloaded export`,
          `Upload modal instructions updated for Zoomph files`,
        ]
      },
      {
        category: 'Alias Additions',
        items: [
          `Added content series brand names to BRAND_ALIAS_DEFAULTS: McDonalds → McDonald's, Ford, Gatorade, Sprite, Ticketmaster, Axiom, Toyota, Xfinity, Daimler`,
          `Added ReboundMD → Rebound Orthopedics for ReboundMD Injury Report content series`,
          `extractZoomphBrand() now checks PAID_SOCIAL_PARTNER_ALIASES and DataStore custom rules in addition to BRAND_ALIAS_DEFAULTS — ensures paid and organic alias maps are always in sync`,
          `Note: Sprite is mapped to its own brand 'Sprite' — change alias to 'Coca-Cola' if it should roll up`,
        ]
      },
      {
        category: 'UI / Cleanup',
        items: [
          `Footer simplified to: PartnerIQ · vX · Month Year — dynamically populated from CHANGELOG[0]`,
          `Dead code removed: renderPaidSpendChart, renderPaidImpressionsChart (canvas stubs, never called)`,
        ]
      }
    ]
  },
  {
    version: 'v0.16',
    date: 'April 2026',
    source: 'Claude',
    title: 'Survey Research + Partner Roster + Paid Portfolio + Home Rebuild + Bug Fixes',
    changes: [
      {
        category: 'Survey',
        items: [
          `Built full survey ingestion — drop any Survey_*.csv containing stacked multi-wave data`,
          `Auto-detects survey files by Survey_ prefix or column headers (Unaided Recall, Aided Recall, Survey)`,
          `Parses phase (Early / Late) and season from the Survey column (e.g. "2023-24 Early")`,
          `Survey section on partner pages: KPI cards, YoY with phase matching (Early→Early, Late→Late only), SVG trend chart, wave history table`,
          `Phase toggle within section — Early / Late — independent of the global season selector`,
          `Survey Portfolio page: full ranked table of all surveyed brands, Partners-only toggle, phase selector, sortable columns, click-to-navigate to partner page`,
          `Survey nav button added to header`,
          `Hover tooltips on trend chart data points`,
          `Local HQ Recall KPI and trend line shown only when applicable (PNW-HQ partners)`,
        ]
      },
      {
        category: 'Partner Roster',
        items: [
          `New Partners_*.csv ingestion — Account + Category columns define current partner list`,
          `isCurrentPartner() drives Partners-only filter on survey portfolio page and brand search dropdown`,
          `Brand search dropdown filters to current partners only when a roster is loaded`,
          `Green dot indicator next to current partners in the brand search dropdown`,
          `Roster name-mismatch warning on upload (flags accounts that don't resolve to a known brand)`,
          `Roster persists in preloaded export`,
        ]
      },
      {
        category: 'Paid Social Portfolio',
        items: [
          `New Paid Social Portfolio page accessible from home quick links`,
          `Independent fiscal year selector (paidPortfolioPeriod) — decoupled from TV season selector`,
          `Assignment health banner: red warning with direct link to review modal when unresolved campaigns exist`,
          `Unassigned spend callout shows dollar amount excluded from partner totals`,
          `Portfolio KPI strip: total spend, impressions, reach, avg CTR, avg CPM, total campaigns`,
          `Partner spend leaderboard: sortable columns — rank, spend, impressions, reach, CTR, CPM, campaigns`,
          `Spend by objective SVG bar chart: shows how portfolio spend is distributed across campaign objectives`,
          `Clicking any partner row navigates directly to their partner page`,
          `Removed % of total spend column (not useful at a glance)`,
          `Removed YoY spend column from portfolio table (misleading without context)`,
        ]
      },
      {
        category: 'Navigation & Home Page',
        items: [
          `Home quick links fully rebuilt into three labeled sections: Portfolio Pages, Partner Tools, Reference`,
          `Portfolio Pages: TV Signage, Paid Social, Survey Research — all live and navigable`,
          `Partner Tools: Partner deep-dive search, Partner Comparison (coming soon), Organic Social Portfolio (coming soon)`,
          `Reference: Changelog, Attendance (future), TV Viewership (future)`,
          `Changelog moved from nav bar to Reference section of home quick links`,
          `Nav bar simplified to: Home → Survey → Import/Export`,
          `Exported preloaded dashboards now open on home page instead of the import/export modal`,
        ]
      },
      {
        category: 'Changelog',
        items: [
          `CHANGELOG constant added to the file — full version history from v0.1 to current`,
          `Changelog page: vertical timeline with version, date, source tag (Claude/GPT/Manual), title, and categorized bullets`,
          `Category color coding: Feature, Fix, Design, Data`,
          `Latest version highlighted in green`,
          `Visible in viewer mode — AMs can see data currency and version history`,
        ]
      },
      {
        category: 'Bug Fix',
        items: [
          `Alaska Airlines paid campaigns now correctly assigned: added Alaska alias to resolve compound names like AlaskaDOTM`,
          `CP campaign parser: single-token CP campaigns now extract partner as prefix from compound activation names`,
          `Syntax error fixed in CHANGELOG constant — apostrophes in item strings converted to backtick template literals`,
          `Removed duplicate Survey nav button introduced by earlier partial edit`,
          `Survey section guard added to prevent render errors when slot element is missing`,
          `Dead changelogNavBtn event listener removed`,
          `DataStore.surveys converted from object to flat array for consistent ingestion and normalization`,
        ]
      },
      {
        category: 'Aliases',
        items: [
          `Added survey brand name variants: First Tech Credit Union, Coca-Cola / Sprite, Nuna Baby, Athletic Brewing Company, Les Schwab Tire Centers, ZoomInfo Technologies`,
          `Added Alaska as a short alias for Alaska Airlines`,
        ]
      }
    ]
  },
  {
    version: 'v0.15',
    date: 'March–April 2026',
    source: 'GPT',
    title: 'Paid Social Alias Cleanup + Campaign Assignment System',
    changes: [
      {
        category: 'Paid Social',
        items: [
          `Comprehensive campaign name parser: extracts season, category code, activation, partner, objective, result metric, platform, and date`,
          `Campaign category codes mapped to friendly labels (CP, TB, FD, YB, GS, PS, PM, etc.)`,
          `Partner alias map with 40+ known camelCase variants and their canonical names`,
          `Confidence scoring: high / medium / review per campaign based on parse quality`,
          `Review paid assignments modal: shows all medium/unresolved campaigns with suggested partner and manual override`,
          `Accept all medium suggestions in one click`,
          `Assignment rules saved to DataStore and persist in preloaded export`,
          `DND_ and Copy campaign flagging`,
        ]
      },
      {
        category: 'Brand Aliases',
        items: [
          `Brand alias manager modal: add, edit, and delete merge rules across all channels`,
          `Alias rules persist in preloaded export and apply on load`,
          `canonicalizeAllBrandData() re-runs alias resolution across TV, social, and paid when rules change`,
        ]
      },
      {
        category: 'Infrastructure',
        items: [
          `normalizeSeasonLabel() standardizes season strings across formats (NBA 2024-2025, FY 2024/25, etc.)`,
          `resolveCanonicalBrandName() with compact-token fallback for fuzzy matching`,
        ]
      }
    ]
  },
  {
    version: 'v0.10–v14',
    date: 'February–March 2026',
    source: 'GPT',
    title: 'Paid Social v1 + Various Iteration',
    changes: [
      {
        category: 'Paid Social',
        items: [
          `Full Facebook Ads Manager CSV ingestion`,
          `Fiscal year grouping (July 1–June 30) using Starts / Ends campaign flight dates — not campaign name dates`,
          `KPI cards: Amount Spent, Impressions, Reported Reach, Link Clicks, CTR, CPM, CPC, Results`,
          `YoY indicators for Spend, Impressions, and CTR`,
          `Campaign Performance table: sortable, shows all campaign-level metrics including Result Indicator`,
          `Paid Social detected by filename keywords (paid, meta, facebook, admanager) or column headers`,
          `Reported Reach labeled clearly as summed-from-rows (not de-duplicated)`,
          `Glossary tooltips for paid metrics: CPM, CPC, CTR, Results, Cost per Result, Reported Reach`,
        ]
      },
      {
        category: 'TV Visible Signage',
        items: [
          `QIMV naming standardized from "QI MV" across all tables and labels`,
          `Import / Export button renamed (previously "Update data")`,
          `Removed QIMV per Minute, QI Score, and 100% Media Value from top KPI cards (too detailed for top strip)`,
          `Added Sponsorship QI Impressions as a KPI card instead`,
          `Added Avg QI and SoV columns to Asset Performance Breakdown table`,
          `Fixed janky table row lines caused by display:flex on asset-name cell`,
        ]
      }
    ]
  },
  {
    version: 'v0.8–v9',
    date: 'January–February 2026',
    source: 'GPT',
    title: 'Fully Offline + Preloaded Export',
    changes: [
      {
        category: 'Infrastructure',
        items: [
          `Removed all external CDN dependencies — no Google Fonts, no Chart.js CDN, no PapaParse CDN, no XLSX CDN`,
          `Custom inline CSV parser (PapaParse-compatible) — fully offline`,
          `Custom inline chart renderer (Canvas-based) for bar, line, and doughnut charts`,
          `Font stack changed to system fonts (ui-sans-serif, system-ui, -apple-system)`,
          `Footer updated: Offline-ready · No external calls`,
        ]
      },
      {
        category: 'Distribution',
        items: [
          `Export preloaded dashboard button — embeds all loaded data into a self-contained HTML file`,
          `Viewer mode: exported files hide upload controls for account managers`,
          `Export prompts for update label, date, and notes`,
          `PRELOADED_DATA, DASHBOARD_META, and VIEWER_MODE blocks support find-and-replace injection`,
          `safeJSONStringify() escapes HTML-sensitive characters to prevent script injection in exports`,
        ]
      }
    ]
  },
  {
    version: 'v0.6–v7',
    date: 'December 2025–January 2026',
    source: 'GPT',
    title: 'Table Cleanup + Quadrant Chart Improvements',
    changes: [
      {
        category: 'TV Visible Signage',
        items: [
          `Asset Performance Quadrant: X-axis changed to performance vs portfolio average QIMV/min for the same location (more meaningful benchmark)`,
          `Season Pace chart: hover points added showing season, match number, date, and cumulative QIMV`,
          `TV Visible Signage collapsed summary strip shows QI Impressions, QIMV, and YoY/GOG`,
          `Comparison toggle (Auto-match / Full Season) applied consistently to TV Portfolio page`,
          `Removed Top Location options from TV dropdown — location performance lives in its own dedicated table`,
        ]
      },
      {
        category: 'Tables',
        items: [
          `Text/context columns left-aligned, numeric columns right-aligned throughout`,
          `Subtle column separators before metric groups`,
          `Collapsed TV section header shows "matches" instead of "exposures"`,
        ]
      },
      {
        category: 'Visualizations',
        items: [
          `Chart descriptions added — every visualization now explains why it matters`,
        ]
      }
    ]
  },
  {
    version: 'v0.2–v0.5',
    date: 'November–December 2025',
    source: 'Claude',
    title: 'Collapsible Sections + New Visualizations + YoY Auto-Match',
    changes: [
      {
        category: 'YoY Comparisons',
        items: [
          `Auto-match game count: compares current season's N matches against the first N matches of the prior season — prevents misleading partial-vs-full season YoY`,
          `Full Season toggle: compare complete season totals when the season is finished`,
          `Comparison basis indicator: small label under YoY numbers shows exactly what's being compared ("Through 12 matches · vs first 12 of 2023-24")`,
          `getYoYRowSets() central helper drives all YoY math consistently across KPI cards, takeaways, and the asset breakdown`,
        ]
      },
      {
        category: 'Visualizations',
        items: [
          `Asset Performance Quadrant: SVG scatter plot placing each asset on Volume (Y) × Efficiency (X) axes, bubble sized by duration, quadrants labeled Scale / Protect / Review / Improve`,
          `Season Pace Chart: cumulative QIMV game-by-game, current season vs prior season overlaid, "you are here" marker, pace delta and end-of-season projection`,
          `Replaced canvas-based charts with SVG for TV section — fully interactive, no CDN dependency`,
          `Removed: Impressions-by-location doughnut, Tool breakdown chart, Impressions-by-season chart`,
        ]
      },
      {
        category: 'Layout',
        items: [
          `All partner page sections (TV, Organic Social, Survey, Paid Social) made collapsible`,
          `Collapsed state shows summary strip with top-line metrics`,
          `All sections collapsed by default when switching brands`,
          `Section order: TV → Organic Social → Survey → Paid Social`,
          `Takeaways section stays always expanded`,
          `Asset Performance Breakdown table: Trend column moved to rightmost position, sparkline enlarged from 56×22 to 120×40px, Recommendation column removed`,
        ]
      },
      {
        category: 'Design',
        items: [
          `Switched from Geist serif to all sans-serif (Geist) font stack`,
          `Color scheme changed to neutral monochrome — data colors carry meaning, accent stays near-white`,
          `Table text columns centered, numeric columns right-aligned`,
          `Subtle column dividers added to all tables`,
        ]
      }
    ]
  },
  {
    version: 'v0.1',
    date: 'October–November 2025',
    source: 'Claude',
    title: 'Initial Build',
    changes: [
      {
        category: 'Foundation',
        items: [
          `Single HTML file architecture — opens in any browser, no server, no install`,
          `All data loaded and processed locally — nothing transmitted or uploaded anywhere`,
          `Drag-and-drop CSV / XLSX file upload with auto file-type detection`,
          `DataStore with TV signage, organic social, paid (stub), survey (stub)`,
          `Brand / partner searchable dropdown with channel tags (TV, SOC, PAID, SRV)`,
        ]
      },
      {
        category: 'TV Visible Signage',
        items: [
          `Full TV schema: Brand, Tool, Location, Event, Matchdate, Season, Impressions, Media Value, QI MV, QI Score, Share of Voice, Duration, QIMV per Minute`,
          `KPI cards with YoY change indicators`,
          `Asset performance breakdown table with sortable columns and cross-brand ranking on hover`,
          `Hover tooltips: metric definitions (glossary) and asset rank vs portfolio`,
          `TV Portfolio page: leaderboards sortable by QIMV, QI Impressions, Duration, YoY up/down`,
          `Location performance panel`,
          `Season period selector on partner pages, defaults to latest season`,
        ]
      },
      {
        category: 'Organic Social',
        items: [
          `Full organic social schema (90+ columns from vendor export)`,
          `File naming: BrandName_DateRange.csv — one file per brand`,
          `KPI cards: Impressions, Reach, Engagement, Brand Exposure Value, Post Value`,
          `Platform mix chart, content type performance, sentiment bar, top posts table`,
          `Monthly impressions trend chart`,
        ]
      },
      {
        category: 'Takeaways',
        items: [
          `Auto-generated top-line takeaways on every partner page`,
          `Cross-channel combined value (TV QI MV + social Brand Exposure Value)`,
          `Overall portfolio ranking by QIMV/min in takeaways`,
        ]
      }
    ]
  }
];




// ============================================================
// BRAND ALIASES / MERGE RULES
// ============================================================
// These rules merge source-system naming variants into one canonical partner.
// Add more through the Manage brand aliases modal; exported dashboards keep them.
