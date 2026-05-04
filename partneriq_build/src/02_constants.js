// ============================================================
// GLOSSARY OF METRICS
// ============================================================
const GLOSSARY = {
  'Sponsorship Impressions': 'Total number of gross impressions delivered by sponsorship exposures during the broadcast. Each viewer counts each time they see the brand.',
  'QI Media Value': 'Quality Index Media Value — the discounted dollar value of sponsorship exposures, adjusted for clarity, size, centrality, and duration of the brand on screen. A more accurate reflection of real sponsorship value than 100% media value.',
  'QI Media Value ($)': 'Quality Index Media Value — discounted dollar value of sponsorship exposures, adjusted for clarity, size, centrality, and duration of the brand on screen.',
  'QIMV': 'Quality Index Media Value — discounted dollar value of sponsorship exposures, adjusted for clarity, size, centrality, and duration on screen.',
  'QIMV per Minute': 'Quality Index Media Value divided by exposure duration in minutes. The standard efficiency metric for comparing asset performance — higher is better.',
  '100% Media Value': 'Full gross dollar value of sponsorship exposures at published rate, before quality adjustments. Represents theoretical maximum value.',
  '100% Media Value ($)': 'Full gross dollar value of sponsorship exposures at published rate, before quality adjustments.',
  'QI Score': 'Quality Index Score (0–100) measuring exposure quality based on logo clarity, size, centrality, and duration. Higher scores indicate more valuable exposures.',
  'Share of Voice': 'The percentage of total sponsorship exposure time occupied by this brand, relative to all brands measured in the event or period.',
  'Share of Voice (%)': 'The percentage of total sponsorship exposure time occupied by this brand relative to all brands measured.',
  'Sponsorship QI Impressions': 'Quality-adjusted impressions. Raw impressions multiplied by the QI Score to reflect effective visibility.',
  'Total Exposures': 'Count of individual instances where the brand was visible on broadcast.',
  'Duration': 'Total on-screen time in minutes across all exposures in the period.',
  'Duration (Minutes)': 'Total on-screen time in minutes.',
  'Impressions': 'Gross total of times the content was displayed. Each view counts, including repeats.',
  'Reach': 'Estimated number of unique users who saw the content.',
  'Engagement': 'Total engagement actions: likes, comments, shares, reactions.',
  'Engagement Rate': 'Engagement divided by impressions. Measures how compelling the content was relative to its audience.',
  'Brand Exposure Value': 'Estimated monetary value of organic social exposure for the brand, based on reach, engagement, and content quality.',
  'Post Value': 'Estimated total value of the post including organic and amplified reach.',
  'Follower Interaction Rate': 'The average rate at which followers engage with content from the creator.',
  'Avg QI Score': 'Average Quality Index Score across all exposures. Higher is better.',
  'Avg Share of Voice': 'Average share of voice per exposure event.',
  'Exposure Duration': 'Total cumulative time the brand was on screen, in minutes.',
  'Amount Spent': 'Total paid media spend from the ad platform export. For Facebook Ads Manager exports, this maps to Amount spent (USD).',
  'CPM': 'Cost per thousand impressions. Calculated as amount spent divided by impressions, multiplied by 1,000.',
  'CPC': 'Cost per link click. Calculated as amount spent divided by link clicks.',
  'CTR': 'Link click-through rate. Calculated as link clicks divided by impressions, unless the export provides a specific link CTR value.',
  'Results': 'The number of campaign results reported by the ad platform. Result meaning depends on the Result indicator / campaign objective, so mixed objectives should be interpreted carefully.',
  'Cost per Result': 'Amount spent divided by results. Only compare directly when campaigns share the same result indicator or objective.',
  'Unaided Recall': 'The percentage of survey respondents who spontaneously named this brand as a sponsor when asked — without prompting. Highest-quality awareness metric.',
  'Aided Recall': 'The percentage of respondents who recognized this brand as a sponsor when shown the name. Measures prompted brand recognition.',
  'Local HQ Recall': 'The percentage of respondents who identified this brand as locally headquartered in the Pacific Northwest. Only applicable to PNW-headquartered companies.',
    'Reported Reach': 'Reach reported in the paid social export. When rows are summed across campaigns or ad sets, this can duplicate people reached by multiple campaigns.',
  'Asset Performance Quadrant': 'Plots each TV asset on two axes: X = the asset\'s QIMV per minute relative to the location\'s portfolio average (right = above average, left = below); Y = total QIMV (volume). Bubble size = on-screen duration. The four quadrants give an instant strategic read: Scale (high volume + high efficiency), Protect (high efficiency, room to scale), Review (high volume but inefficient), Improve (low on both). Median QIMV is the horizontal split.',
};


// ============================================================
// DASHBOARD METADATA — manually update this when sharing a refresh
// ============================================================
/* DASHBOARD_META_START */
const DASHBOARD_META = {
  latestUpdateLabel: 'Manual refresh date not set',
  latestUpdateDate: '',
  updateNotes: 'Update this note before sharing the next refreshed dashboard.',
  preparedBy: 'Partnership Strategy',
  manualTakeaways: []
};
/* DASHBOARD_META_END */

// ============================================================
// PRELOADED DATA / DISTRIBUTION MODE
// Use the dashboard's "Export preloaded dashboard" button to replace
// this null placeholder with the currently loaded DataStore.
// ============================================================
/* PRELOADED_DATA_START */
const PRELOADED_DATA = null;
/* PRELOADED_DATA_END */

/* VIEWER_MODE_START */
const VIEWER_MODE = false;
/* VIEWER_MODE_END */
// ============================================================
// CHANGELOG — history of all versions and changes.
// Add a new entry at the top of this array each time changes are made.
// Source: 'Claude' | 'GPT' | 'Manual'
// ============================================================
