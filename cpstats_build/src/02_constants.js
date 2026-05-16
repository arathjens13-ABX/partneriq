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
    // Per-platform performance breakdowns — season-to-date (Jul '25–Mar '26), source: NBA Monthly Social Dashboard
    breakdown: {
      Instagram: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '395'],
          ['Impressions / 1K Followers', '10,004'],
          ['ASR Rank',                   '14 / 30'],
        ],
      },
      Twitter: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '62'],
          ['Impressions / 1K Followers', '3,858'],
          ['ASR Rank',                   '15 / 30'],
        ],
      },
      Facebook: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '121'],
          ['Impressions / 1K Followers', '5,126'],
          ['ASR Rank',                   '16 / 30'],
        ],
      },
      TikTok: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '105'],
          ['Impressions / 1K Followers', '1,949'],
          ['ASR Rank',                   '28 / 30'],
        ],
      },
      YouTube: {
        title: 'Season-to-Date',
        rows: [
          ['ASR Rank', '17 / 30'],
        ],
      },
      Weibo: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '2'],
          ['Impressions / 1K Followers', '3,215'],
          ['ASR Rank',                   '1 / 30'],
        ],
      },
      Threads: {
        title: 'Season-to-Date',
        rows: [
          ['Engagements / 1K Followers', '19'],
          ['Impressions / 1K Followers', '529'],
          ['ASR Rank',                   '21 / 30'],
        ],
      },
      Snapchat: {
        title: 'Season-to-Date',
        rows: [
          ['ASR Rank', '22 / 30'],
        ],
      },
    },

    // Aggregated Social Ranking — NBA composite rank across all platforms, season-to-date
    asrRank:               16,  // out of 30
    totalCombinedFollowers: 15268156,

    // NBA league rank by platform (out of 30), season-to-date
    platformRankings: {
      Facebook:  16,
      Instagram: 14,
      Twitter:   15,
      TikTok:    28,
      YouTube:   17,
      Snapchat:  22,
      Weibo:     1,
      Threads:   21,
    },

    // Known-follower domestic vs. international split (%) — source: NBA International Dashboard
    domesticIntl: {
      Facebook:  { 'Domestic': 34, 'International': 66 },
      Instagram: { 'Domestic': 35, 'International': 65 },
      Threads:   { 'Domestic': 40, 'International': 60 },
    },

    // Posts published by NBA accounts featuring POR — NOT Blazers-owned channels
    // Source: NBA Platform Insights, season-to-date Jul '25–Mar '26
    nbaContent: {
      totalEngagements:      24718799,
      totalImpressions:      1144753643,
      totalPosts:            1395,
      overallEngagementRate: 2.16,
      byPlatform: {
        Facebook:  { engagements: 18353262, impressions: 266453490, posts: 306, engagementRate: 1.26 },
        Instagram: { engagements:  3357005, impressions: 708616353, posts: 246, engagementRate: 2.59 },
        Twitter:   { engagements:  1907613, impressions:  36888874, posts: 486, engagementRate: 0.61 },
        TikTok:    { engagements:   578544, impressions:  95207610, posts: 120, engagementRate: 5.17 },
        YouTube:   { engagements:   522375, impressions:  37587316, posts: 237, engagementRate: 1.39 },
      },
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
    breakdown: {
      annualVisitors: {
        title: 'Visitors by Event Type',
        rows: [
          ['NBA Games',    '—'],
          ['Concerts',     '—'],
          ['Family Shows', '—'],
          ['Other Events', '—'],
        ],
      },
      totalEvents: {
        title: 'Events by Type',
        rows: [
          ['NBA Games',    '82'],
          ['Concerts',     '—'],
          ['Family Shows', '—'],
          ['Other Events', '—'],
        ],
      },
    },
  },

  stm: {
    totalSTMs:          2722,
    renewalRate:        91,   // percentage, whole number
    avgTenureYears:     5,
    newMembersThisYear: 168,
    breakdown: {
      totalSTMs: {
        title: 'By Plan Type',
        rows: [
          ['Full Season',  '—'],
          ['Half Season',  '—'],
          ['Partial Plan', '—'],
        ],
      },
      renewalRate: {
        title: 'Renewal Detail',
        rows: [
          ['Eligible Members', '—'],
          ['Renewed',          '—'],
          ['Non-Renewals',     '—'],
        ],
      },
      avgTenureYears: {
        title: 'Tenure Distribution',
        rows: [
          ['1 Year',    '—'],
          ['2–4 Years', '—'],
          ['5–9 Years', '—'],
          ['10+ Years', '—'],
        ],
      },
    },
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
  totalCombinedFollowers: 'Combined followers across all active Blazers social platforms (Mar \'26).',
  asrRank:                'Aggregated Social Ranking (ASR) — NBA composite rank across all platforms season-to-date. Lower number = better rank.',
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

// ============================================================
// TREND DATA — historical values for sparklines.
// Each field is an array of { fy, value } ordered oldest → newest.
// The final entry should match the current-year value in STATS_DATA.
// Zero = missing data for that year; those entries are skipped by
// the sparkline renderer (so you can safely leave gaps).
// Add more years by prepending additional { fy, value } objects.
// ============================================================
const TREND_DATA = {
  social: {
    totalFollowers: {
      Instagram: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 2960901 },
      ],
      Twitter: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 1475015 },
      ],
      Facebook: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 2515875 },
      ],
      TikTok: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 1155796 },
      ],
      YouTube: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 134956 },
      ],
      Threads: [
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 395627 },
      ],
      Snapchat: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 224961 },
      ],
      Weibo: [
        { fy: '2021-22', value: 0 },
        { fy: '2022-23', value: 0 },
        { fy: '2023-24', value: 0 },
        { fy: '2024-25', value: 0 },
        { fy: '2025-26', value: 6405205 },
      ],
    },
  },
  arena: {
    annualVisitors: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 1253484 },
    ],
    totalEvents: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 151 },
    ],
  },
  stm: {
    totalSTMs: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 2722 },
    ],
    renewalRate: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 91 },
    ],
    avgTenureYears: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 5 },
    ],
    newMembersThisYear: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 168 },
    ],
  },
  broadcast: {
    avgViewersPerGame: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 28238 },
    ],
    totalSeasonReach: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 3200000 },
    ],
    avgLocalRating: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 2.2 },
    ],
    gamesOnLocalTV: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 76 },
    ],
  },
  appAndDigital: {
    monthlyActiveUsers: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 40623 },
    ],
    websiteMonthlyVisitors: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 740000 },
    ],
    totalAppDownloads: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 412737 },
    ],
  },
  fanSentiment: {
    npsScore: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 57 },
    ],
    overallSatisfaction: [
      { fy: '2021-22', value: 0 },
      { fy: '2022-23', value: 0 },
      { fy: '2023-24', value: 0 },
      { fy: '2024-25', value: 0 },
      { fy: '2025-26', value: 95 },
    ],
  },
};
