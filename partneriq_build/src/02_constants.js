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
// STATS & MARKET DATA — update these values each fiscal year.
// All percentages are stored as whole numbers (e.g. 42 = 42%).
// Dollar amounts are stored as raw numbers (e.g. 85000 = $85,000).
// Zero values render as "—" on the Stats page.
// ============================================================
const STATS_DATA = {
  fiscalYear: '2025-26',
  social: {
    totalFollowers: {
      Instagram: 2960901,
      Twitter:   1475015,
      Facebook:  2515875,
      TikTok:    1155796,
      YouTube:   134956,
      Threads:   395627,
      Snapchat:  224961,
      Weibo:     6405205,
    },
    // Age demographics by platform — values are percentages (whole numbers, should sum to ~100)
    demographics: {
      Instagram: { '13–17': 9, '18–24': 39, '25–34': 31, '35–44': 14, '45–54': 5, '55+': 2 },
      Twitter:   { '13–17': 0, '18–24': 0, '25–34': 0, '35–44': 0, '45–54': 0, '55+': 0 },
      Facebook:  { '13–17': 0, '18–24': 23, '25–34': 48, '35–44': 17, '45–54': 8, '55+': 4 },
      TikTok:    { '13–17': 0, '18–24': 0, '25–34': 0, '35–44': 0, '45–54': 0, '55+': 0 },
    },
    // Top geographic markets by platform — values are percentages of total following
    geography: {
      Instagram: { Portland: 0, Seattle: 0, 'Los Angeles': 0, 'San Francisco': 0, 'New York': 0 },
      Twitter:   { Portland: 0, Seattle: 0, 'Los Angeles': 0, 'San Francisco': 0, 'New York': 0 },
      Facebook:  { Portland: 0, Seattle: 0, 'Los Angeles': 0, 'San Francisco': 0, 'New York': 0 },
      TikTok:    { Portland: 0, Seattle: 0, 'Los Angeles': 0, 'San Francisco': 0, 'New York': 0 },
    },
  },

  arena: {
    annualVisitors: 1253484,  // Total visitors to the arena in the fiscal year not including 
    totalEvents:    151,  // Total events (all types) held in the fiscal year
    seatingCapacity: {
      'Legends':        24,
      'Courtside':      628,
      '100 Level':      6159,
      'Club Level':     1784,
      '200 Level':      2733,
      'Suite Level':    1024,
      'Blazer Boxes':   96,
      '300 Level':      7645,
      'Total Capacity': 19451,
    },
  },

  stm: {
    totalSTMs:          2722,  // Total active season ticket member accounts
    renewalRate:        91,  // Renewal rate (percentage, whole number)
    avgTenureYears:     5,  // Average tenure of current STMs in years
    newMembersThisYear: 168,  // Net new STMs added this fiscal year
  },

  // Percentages (whole numbers) of fan base in each income bracket
  householdIncome: {
    'Under $50K':  15,
    '$50K–$75K':   13,
    '$75K–$100K':  13,
    '$100K–$125K': 12,
    'Over $125K':  48,
    'Median HHI':  110000,  // In dollars (e.g. 95000)
  },

  portlandMarket: {
    population:      2537070,  // Portland DMA total population
    totalHouseholds: 1026663,
    medianAge:       39,
    medianHHI:       98994,  // In dollars
    collegeEducated: 44,  // % with 4-year degree (whole number)
    homeownership:   61,  // % who own their home (whole number)
  },

  broadcast: {
    avgViewersPerGame:   28238,  // Average local TV viewers per game
    totalSeasonReach:    3200000,  // Unduplicated unique reach for the full season
    gamesOnLocalTV:      76,
    gamesOnNationalTV:   8,
    avgLocalRating:      2.2,  // Average local TV rating (e.g. 3.2 for a 3.2 rating)
    totalBroadcastHours: 11595,  // Total hours of live broadcast content
  },

  appAndDigital: {
    monthlyActiveUsers:     40623,
    totalAppDownloads:      412737,
    avgSessionsPerUser:     1.4,  // Per month
    pushOptInRate:          0,  // % of users opted in to push notifications (whole number)
    emailSubscribers:       0,
    websiteMonthlyVisitors: 740000,
  },

  fanSentiment: {
    npsScore:             57,  // Net Promoter Score (range: -100 to 100)
    overallSatisfaction:  95,  // % satisfied or very satisfied (whole number)
    gameExperienceRating: 0,  // Out of 10
    likelihoodToRenew:    0,  // % likely to renew or purchase (whole number)
    brandAffinityScore:   0,  // Internal proprietary metric
  },
};

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
