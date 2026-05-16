// ============================================================
// DASHBOARD METADATA — update before sharing a refresh
// ============================================================
/* DASHBOARD_META_START */
const DASHBOARD_META = {
  fiscalYear:       '2025-26',
  latestUpdateLabel: 'Manual refresh date not set',
  latestUpdateDate:  '',
  updateNotes:       'Update this note before sharing the next refresh.',
  preparedBy:        'Partnership Strategy',
};
/* DASHBOARD_META_END */

// ============================================================
// STATS & MARKET DATA
// Update these values each fiscal year.
// All percentages are stored as whole numbers (e.g. 42 = 42%).
// Dollar amounts are stored as raw numbers (e.g. 85000 = $85,000).
// Zero values render as "—" on the page.
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
    annualVisitors: 1253484,
    totalEvents:    151,
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
    totalSTMs:          2722,
    renewalRate:        91,   // percentage, whole number
    avgTenureYears:     5,
    newMembersThisYear: 168,
  },

  // Percentages (whole numbers) of fan base in each income bracket
  householdIncome: {
    'Under $50K':  15,
    '$50K–$75K':   13,
    '$75K–$100K':  13,
    '$100K–$125K': 12,
    'Over $125K':  48,
    'Median HHI':  110000,  // raw dollar value
  },

  portlandMarket: {
    population:      2537070,
    totalHouseholds: 1026663,
    medianAge:       39,
    medianHHI:       98994,
    collegeEducated: 44,  // % with 4-year degree
    homeownership:   61,  // % who own their home
  },

  broadcast: {
    avgViewersPerGame:   28238,
    totalSeasonReach:    3200000,
    gamesOnLocalTV:      76,
    gamesOnNationalTV:   8,
    avgLocalRating:      2.2,
    totalBroadcastHours: 11595,
  },

  appAndDigital: {
    monthlyActiveUsers:     40623,
    totalAppDownloads:      412737,
    avgSessionsPerUser:     1.4,
    pushOptInRate:          0,
    emailSubscribers:       0,
    websiteMonthlyVisitors: 740000,
  },

  fanSentiment: {
    npsScore:             57,
    overallSatisfaction:  95,  // % satisfied or very satisfied
    gameExperienceRating: 0,   // out of 10
    likelihoodToRenew:    0,   // % likely to renew
    brandAffinityScore:   0,
  },
};

// ============================================================
// PRIOR YEAR DATA — fill in previous FY values to unlock YOY deltas.
// Zero = "no prior data" and suppresses the delta badge for that metric.
// Structure mirrors STATS_DATA. Only fields used in kpiCard calls are needed.
// ============================================================
const PRIOR_YEAR_DATA = {
  fiscalYear: '2024-25',
  social: {
    totalFollowers: {
      Instagram: 0,
      Twitter:   0,
      Facebook:  0,
      TikTok:    0,
      YouTube:   0,
      Threads:   0,
      Snapchat:  0,
      Weibo:     0,
    },
  },
  arena: {
    annualVisitors: 0,
    totalEvents:    0,
  },
  stm: {
    totalSTMs:          0,
    renewalRate:        0,
    avgTenureYears:     0,
    newMembersThisYear: 0,
  },
  householdIncome: {
    'Median HHI': 0,
  },
  portlandMarket: {
    population:      0,
    totalHouseholds: 0,
    medianAge:       0,
    medianHHI:       0,
    collegeEducated: 0,
    homeownership:   0,
  },
  broadcast: {
    avgViewersPerGame:   0,
    totalSeasonReach:    0,
    gamesOnLocalTV:      0,
    gamesOnNationalTV:   0,
    avgLocalRating:      0,
    totalBroadcastHours: 0,
  },
  appAndDigital: {
    monthlyActiveUsers:     0,
    totalAppDownloads:      0,
    avgSessionsPerUser:     0,
    pushOptInRate:          0,
    emailSubscribers:       0,
    websiteMonthlyVisitors: 0,
  },
  fanSentiment: {
    npsScore:             0,
    overallSatisfaction:  0,
    gameExperienceRating: 0,
    likelihoodToRenew:    0,
    brandAffinityScore:   0,
  },
};

// ============================================================
// METRIC NOTES — tooltip text that appears on hover for KPI cards.
// Key names match the field names in STATS_DATA.
// ============================================================
const METRIC_NOTES = {
  totalSTMs:              'Full-season and partial-plan holders combined. Excludes group sales.',
  renewalRate:            'Percentage of eligible prior-year STMs who renewed for the current season.',
  avgTenureYears:         'Average number of consecutive seasons a current STM has held a plan.',
  newMembersThisYear:     'Net-new STMs acquired this fiscal year, not counting renewals.',
  npsScore:               'Net Promoter Score: % Promoters minus % Detractors. Scale: −100 to +100.',
  overallSatisfaction:    'Percentage of respondents rating satisfaction as Satisfied or Very Satisfied.',
  avgViewersPerGame:      'Average unique viewers per local broadcast game (Nielsen data).',
  totalSeasonReach:       'Unduplicated reach across all local broadcasts for the full season.',
  annualVisitors:         'Total arena visitors across Blazers games, concerts, and all other events.',
  websiteMonthlyVisitors: 'Average monthly unique visitors across the season (GA4 data).',
  monthlyActiveUsers:     'Average monthly active users of the official Blazers mobile app.',
  totalAppDownloads:      'Cumulative all-time app downloads across iOS and Android.',
};
