// ============================================================
// GLOBAL STATE
// ============================================================
var openSections = {};
var searchQuery  = '';

// ============================================================
// SECTION NAV  (jump-to pill strip)
// ============================================================
function renderSectionNav() {
  var items = [
    { id: 'stats-social',    label: '📱 Social' },
    { id: 'stats-arena',     label: '🏟️ Arena' },
    { id: 'stats-stm',       label: '🎟️ STM' },
    { id: 'stats-hhi',       label: '💵 Income' },
    { id: 'stats-portland',  label: '🌲 Portland' },
    { id: 'stats-broadcast', label: '📡 Broadcast' },
    { id: 'stats-digital',   label: '📲 Digital' },
    { id: 'stats-sentiment', label: '💬 Sentiment' },
  ];
  return '<nav class="section-nav" id="section-nav">' +
    items.map(function(item) {
      return '<a class="section-nav-pill" href="#' + item.id + '" data-nav-section="' + item.id + '">' + item.label + '</a>';
    }).join('') +
    '</nav>';
}

// ============================================================
// SEARCH BAR
// ============================================================
function renderSearchBar() {
  var escaped = searchQuery.replace(/"/g, '&quot;');
  return '<div class="search-wrap">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
    '<input class="section-search" id="section-search" type="text" placeholder="Search sections and metrics…" autocomplete="off" value="' + escaped + '">' +
    '</div>';
}

// ============================================================
// APP ROUTER — single-page, renders stats + applies search filter
// ============================================================
function renderApp() {
  var main = document.getElementById('main');
  if (!main) return;
  renderStatsPage(main);
  wireSectionToggles();
  if (typeof applySearchFilter === 'function') applySearchFilter();
}

// ============================================================
// SECTION TOGGLE & NAV WIRING
// ============================================================
function wireSectionToggles() {
  document.querySelectorAll('[data-section-toggle]').forEach(function(el) {
    if (el.dataset.sectionToggleWired) return;
    el.dataset.sectionToggleWired = '1';
    el.addEventListener('click', function() {
      var id = el.dataset.sectionToggle;
      openSections[id] = !openSections[id];
      renderApp();
    });
  });

  document.querySelectorAll('[data-nav-section]').forEach(function(pill) {
    if (pill.dataset.navWired) return;
    pill.dataset.navWired = '1';
    pill.addEventListener('click', function(e) {
      e.preventDefault();
      var id = pill.dataset.navSection;
      // clear search so the target section is always visible
      searchQuery = '';
      var searchInput = document.getElementById('section-search');
      if (searchInput) searchInput.value = '';
      if (openSections[id] === false) {
        openSections[id] = true;
        renderApp();
      }
      requestAnimationFrame(function() {
        var sec = document.getElementById(id);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  });
}

// ============================================================
// STATS PAGE RENDERER
// ============================================================
function renderStatsPage(main) {
  var fy = STATS_DATA.fiscalYear || '—';
  var s  = STATS_DATA;
  var p  = PRIOR_YEAR_DATA;
  var mn = METRIC_NOTES;
  var td = TREND_DATA;

  function numVal(v) {
    return (!v && v !== 0) || v === 0 ? '—' : formatNum(v);
  }
  function pctVal(v) {
    return (!v && v !== 0) || v === 0 ? '—' : v + '%';
  }
  function dollarVal(v) {
    return (!v && v !== 0) || v === 0 ? '—' : formatCurrency(v);
  }
  function rawVal(v) {
    return (!v && v !== 0) || v === 0 ? '—' : v;
  }

  // opts: { delta, note, size, sparkline, breakdown }
  // size:      'full' spans all columns, 'half' spans 2 columns, default = auto
  // sparkline: array of { fy, value } — passed to renderSparkline()
  // breakdown: { title?, rows: [[label, valueStr], ...] }
  function kpiCard(label, value, opts) {
    opts = opts || {};
    var delta     = opts.delta;
    var note      = opts.note;
    var size      = opts.size;
    var sparkData = opts.sparkline;
    var breakdown = opts.breakdown;

    var sizeStyle = size === 'full' ? ' style="grid-column:1/-1;"'
                  : size === 'half' ? ' style="grid-column:span 2;"'
                  : '';
    var deltaHtml = delta
      ? '<div class="delta-badge ' + delta.dir + '">' + delta.label + ' YOY</div>'
      : '';
    var noteAttr = note ? ' data-note="' + note.replace(/"/g, '&quot;') + '"' : '';
    var noteTick = note ? ' <span class="note-indicator">&#9432;</span>' : '';
    var sparkHtml = sparkData ? renderSparkline(sparkData) : '';

    var breakdownHtml = '';
    if (breakdown && breakdown.rows && breakdown.rows.length) {
      var titleHtml = breakdown.title
        ? '<tr><td class="bd-title" colspan="2">' + breakdown.title + '</td></tr>'
        : '';
      var rowsHtml = breakdown.rows.map(function(row) {
        return '<tr><td class="bd-label">' + row[0] + '</td><td class="bd-val">' + row[1] + '</td></tr>';
      }).join('');
      breakdownHtml =
        '<div class="card-breakdown">' +
        '<table class="bd-table">' + titleHtml + rowsHtml + '</table>' +
        '</div>' +
        '<button class="card-expand-btn" type="button">+ details</button>';
    }

    var classes = 'home-card' + (note ? ' has-note' : '') + (breakdown ? ' has-breakdown' : '');
    return '<div class="' + classes + '"' + noteAttr + sizeStyle + '>' +
      '<div class="home-card-header">' +
      '<div class="home-card-label">' + label + noteTick + '</div>' +
      sparkHtml +
      '</div>' +
      '<div class="home-card-value">' + value + '</div>' +
      deltaHtml +
      breakdownHtml +
      '</div>';
  }

  function subLabel(text) {
    return '<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-top:20px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border-soft);">' + text + '</div>';
  }

  function kvTable(entries) {
    return '<table style="width:100%;border-collapse:collapse;">' +
      entries.map(function(pair) {
        return '<tr style="border-bottom:1px solid var(--border-soft);">' +
          '<td style="padding:8px 0;font-size:12px;color:var(--text-dim);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.06em;width:55%;">' + pair[0] + '</td>' +
          '<td style="padding:8px 0;font-size:13px;color:var(--text);text-align:right;font-weight:500;">' + pair[1] + '</td>' +
          '</tr>';
      }).join('') +
      '</table>';
  }

  function platformTable(platformData, valueFormatter) {
    var platforms = Object.keys(platformData);
    if (!platforms.length) return '';
    var keys = Object.keys(platformData[platforms[0]] || {});
    return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:480px;">' +
      '<thead><tr>' +
      '<th style="text-align:left;padding:6px 0;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);font-weight:normal;">Platform</th>' +
      keys.map(function(k) {
        return '<th style="text-align:right;padding:6px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);font-weight:normal;">' + k + '</th>';
      }).join('') +
      '</tr></thead>' +
      '<tbody>' +
      platforms.map(function(platform) {
        return '<tr style="border-bottom:1px solid var(--border-soft);">' +
          '<td style="padding:8px 0;font-size:12px;color:var(--text-dim);font-family:var(--font-mono);letter-spacing:0.04em;">' + platform + '</td>' +
          keys.map(function(k) {
            return '<td style="padding:8px 8px;text-align:right;font-size:13px;color:var(--text);">' + valueFormatter(platformData[platform][k]) + '</td>';
          }).join('') +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function collapsible(id, title, content) {
    var open = openSections[id] !== false;
    return '<section class="section collapsible ' + (open ? 'open' : '') + '" id="' + id + '">' +
      '<div class="section-header" data-section-toggle="' + id + '">' +
      '<h2 class="section-title">' + title + '</h2>' +
      '<span class="section-toggle-arrow">&#9654;</span>' +
      '</div>' +
      '<div class="section-body">' + content + '</div>' +
      '</section>';
  }

  // ---- Section content ----

  var socialContent =
    '<div class="home-grid" style="margin-bottom:20px;">' +
    Object.entries(s.social.totalFollowers).map(function(e) {
      var platform  = e[0];
      var followers = e[1];
      var prior     = p.social && p.social.totalFollowers ? p.social.totalFollowers[platform] : 0;
      var sparkData = td.social && td.social.totalFollowers ? td.social.totalFollowers[platform] : null;
      var breakdown = s.social.breakdown && s.social.breakdown[platform] ? s.social.breakdown[platform] : null;
      return kpiCard(platform, numVal(followers), {
        delta:     yoyDelta(followers, prior),
        sparkline: sparkData,
        breakdown: breakdown,
      });
    }).join('') +
    '</div>' +
    subLabel('Age Demographics by Platform (%)') +
    platformTable(s.social.demographics, pctVal) +
    subLabel('Top Geographic Markets by Platform (% of Following)') +
    platformTable(s.social.geography, pctVal);

  var arenaContent =
    '<div class="home-grid" style="margin-bottom:20px;">' +
    kpiCard('Annual Visitors', numVal(s.arena.annualVisitors), {
      delta:     yoyDelta(s.arena.annualVisitors, p.arena.annualVisitors),
      note:      mn.annualVisitors,
      sparkline: td.arena.annualVisitors,
      breakdown: s.arena.breakdown.annualVisitors,
    }) +
    kpiCard('Total Events', numVal(s.arena.totalEvents), {
      delta:     yoyDelta(s.arena.totalEvents, p.arena.totalEvents),
      sparkline: td.arena.totalEvents,
      breakdown: s.arena.breakdown.totalEvents,
    }) +
    '</div>' +
    subLabel('Seating Capacity by Section') +
    kvTable(Object.entries(s.arena.seatingCapacity).map(function(e) { return [e[0], numVal(e[1])]; }));

  var stmContent =
    '<div class="home-grid">' +
    kpiCard('Total STMs', numVal(s.stm.totalSTMs), {
      delta:     yoyDelta(s.stm.totalSTMs, p.stm.totalSTMs),
      note:      mn.totalSTMs,
      sparkline: td.stm.totalSTMs,
      breakdown: s.stm.breakdown.totalSTMs,
    }) +
    kpiCard('Renewal Rate', pctVal(s.stm.renewalRate), {
      delta:     yoyDelta(s.stm.renewalRate, p.stm.renewalRate, { pp: true }),
      note:      mn.renewalRate,
      sparkline: td.stm.renewalRate,
      breakdown: s.stm.breakdown.renewalRate,
    }) +
    kpiCard('Avg Tenure', s.stm.avgTenureYears ? s.stm.avgTenureYears + ' yrs' : '—', {
      delta:     yoyDelta(s.stm.avgTenureYears, p.stm.avgTenureYears),
      note:      mn.avgTenureYears,
      sparkline: td.stm.avgTenureYears,
      breakdown: s.stm.breakdown.avgTenureYears,
    }) +
    kpiCard('New Members', numVal(s.stm.newMembersThisYear), {
      delta:     yoyDelta(s.stm.newMembersThisYear, p.stm.newMembersThisYear),
      note:      mn.newMembersThisYear,
      sparkline: td.stm.newMembersThisYear,
    }) +
    '</div>';

  var hhiContent =
    '<div class="home-grid" style="margin-bottom:20px;">' +
    kpiCard('Median HHI', dollarVal(s.householdIncome['Median HHI']), {
      delta: yoyDelta(s.householdIncome['Median HHI'], p.householdIncome['Median HHI']),
    }) +
    '</div>' +
    kvTable(
      Object.entries(s.householdIncome)
        .filter(function(e) { return e[0] !== 'Median HHI'; })
        .map(function(e) { return [e[0], pctVal(e[1])]; })
    );

  var portlandContent =
    '<div class="home-grid">' +
    kpiCard('DMA Population',   numVal(s.portlandMarket.population),      { delta: yoyDelta(s.portlandMarket.population, p.portlandMarket.population) }) +
    kpiCard('Total Households', numVal(s.portlandMarket.totalHouseholds), { delta: yoyDelta(s.portlandMarket.totalHouseholds, p.portlandMarket.totalHouseholds) }) +
    kpiCard('Median Age',       rawVal(s.portlandMarket.medianAge),       { delta: yoyDelta(s.portlandMarket.medianAge, p.portlandMarket.medianAge) }) +
    kpiCard('Median HHI',       dollarVal(s.portlandMarket.medianHHI),    { delta: yoyDelta(s.portlandMarket.medianHHI, p.portlandMarket.medianHHI) }) +
    kpiCard('College Educated', pctVal(s.portlandMarket.collegeEducated), { delta: yoyDelta(s.portlandMarket.collegeEducated, p.portlandMarket.collegeEducated, { pp: true }) }) +
    kpiCard('Homeownership',    pctVal(s.portlandMarket.homeownership),   { delta: yoyDelta(s.portlandMarket.homeownership, p.portlandMarket.homeownership, { pp: true }) }) +
    '</div>';

  var broadcastContent =
    '<div class="home-grid">' +
    kpiCard('Avg Viewers / Game', numVal(s.broadcast.avgViewersPerGame),   { delta: yoyDelta(s.broadcast.avgViewersPerGame, p.broadcast.avgViewersPerGame),     note: mn.avgViewersPerGame, sparkline: td.broadcast.avgViewersPerGame }) +
    kpiCard('Season Reach',       numVal(s.broadcast.totalSeasonReach),    { delta: yoyDelta(s.broadcast.totalSeasonReach, p.broadcast.totalSeasonReach),       note: mn.totalSeasonReach,  sparkline: td.broadcast.totalSeasonReach }) +
    kpiCard('Local TV Games',     rawVal(s.broadcast.gamesOnLocalTV),      { delta: yoyDelta(s.broadcast.gamesOnLocalTV, p.broadcast.gamesOnLocalTV),                                       sparkline: td.broadcast.gamesOnLocalTV }) +
    kpiCard('National TV Games',  rawVal(s.broadcast.gamesOnNationalTV),   { delta: yoyDelta(s.broadcast.gamesOnNationalTV, p.broadcast.gamesOnNationalTV) }) +
    kpiCard('Avg Local Rating',   rawVal(s.broadcast.avgLocalRating),      { delta: yoyDelta(s.broadcast.avgLocalRating, p.broadcast.avgLocalRating),                                       sparkline: td.broadcast.avgLocalRating }) +
    kpiCard('Broadcast Hours',    rawVal(s.broadcast.totalBroadcastHours), { delta: yoyDelta(s.broadcast.totalBroadcastHours, p.broadcast.totalBroadcastHours) }) +
    '</div>';

  var digitalContent =
    '<div class="home-grid">' +
    kpiCard('Monthly Active Users', numVal(s.appAndDigital.monthlyActiveUsers),     { delta: yoyDelta(s.appAndDigital.monthlyActiveUsers, p.appAndDigital.monthlyActiveUsers),         note: mn.monthlyActiveUsers,     sparkline: td.appAndDigital.monthlyActiveUsers }) +
    kpiCard('Total App Downloads',  numVal(s.appAndDigital.totalAppDownloads),      { delta: yoyDelta(s.appAndDigital.totalAppDownloads, p.appAndDigital.totalAppDownloads),           note: mn.totalAppDownloads,      sparkline: td.appAndDigital.totalAppDownloads }) +
    kpiCard('Avg Sessions / User',  rawVal(s.appAndDigital.avgSessionsPerUser),     { delta: yoyDelta(s.appAndDigital.avgSessionsPerUser, p.appAndDigital.avgSessionsPerUser) }) +
    kpiCard('Push Opt-In Rate',     pctVal(s.appAndDigital.pushOptInRate),          { delta: yoyDelta(s.appAndDigital.pushOptInRate, p.appAndDigital.pushOptInRate, { pp: true }) }) +
    kpiCard('Email Subscribers',    numVal(s.appAndDigital.emailSubscribers),       { delta: yoyDelta(s.appAndDigital.emailSubscribers, p.appAndDigital.emailSubscribers) }) +
    kpiCard('Monthly Web Visitors', numVal(s.appAndDigital.websiteMonthlyVisitors), { delta: yoyDelta(s.appAndDigital.websiteMonthlyVisitors, p.appAndDigital.websiteMonthlyVisitors), note: mn.websiteMonthlyVisitors, sparkline: td.appAndDigital.websiteMonthlyVisitors }) +
    '</div>';

  var sentimentContent =
    '<div class="home-grid">' +
    kpiCard('NPS Score',            rawVal(s.fanSentiment.npsScore),            { delta: yoyDelta(s.fanSentiment.npsScore, p.fanSentiment.npsScore),                                   note: mn.npsScore,            sparkline: td.fanSentiment.npsScore }) +
    kpiCard('Overall Satisfaction', pctVal(s.fanSentiment.overallSatisfaction), { delta: yoyDelta(s.fanSentiment.overallSatisfaction, p.fanSentiment.overallSatisfaction, { pp: true }), note: mn.overallSatisfaction, sparkline: td.fanSentiment.overallSatisfaction }) +
    kpiCard('Game Experience',      s.fanSentiment.gameExperienceRating ? s.fanSentiment.gameExperienceRating + ' / 10' : '—',
                                                                                 { delta: yoyDelta(s.fanSentiment.gameExperienceRating, p.fanSentiment.gameExperienceRating) }) +
    kpiCard('Likelihood to Renew',  pctVal(s.fanSentiment.likelihoodToRenew),   { delta: yoyDelta(s.fanSentiment.likelihoodToRenew, p.fanSentiment.likelihoodToRenew, { pp: true }) }) +
    kpiCard('Brand Affinity Score', rawVal(s.fanSentiment.brandAffinityScore),  { delta: yoyDelta(s.fanSentiment.brandAffinityScore, p.fanSentiment.brandAffinityScore) }) +
    '</div>';

  // ---- Assemble the full page ----
  main.innerHTML =
    '<div class="brand-header">' +
      '<div class="brand-title-block">' +
        '<div class="eyebrow">Portland Trail Blazers · Market Intelligence</div>' +
        '<h1 class="brand-title">CP Stats Sheet</h1>' +
        '<div class="brand-subtitle">' +
          '<span class="channel-tag active">FY ' + fy + '</span>' +
          '<span class="channel-tag active">8 categories</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="data-status">' +
      '<div><span class="data-status-dot"></span> Fiscal Year · <strong>' + fy + '</strong>' +
        (DASHBOARD_META.latestUpdateDate ? ' · ' + DASHBOARD_META.latestUpdateDate : '') +
      '</div>' +
      '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:0.04em;">' +
        (DASHBOARD_META.preparedBy || 'Partnership Strategy') +
        ' · Update STATS_DATA in 02_constants.js each fiscal year' +
      '</div>' +
    '</div>' +

    renderSearchBar() +
    renderSectionNav() +

    collapsible('stats-social',    '📱 Social Following',        socialContent) +
    collapsible('stats-arena',     '🏟️ Arena &amp; Attendance',  arenaContent) +
    collapsible('stats-stm',       '🎟️ Season Ticket Members',   stmContent) +
    collapsible('stats-hhi',       '💵 Household Income',         hhiContent) +
    collapsible('stats-portland',  '🌲 Portland Market',          portlandContent) +
    collapsible('stats-broadcast', '📡 Broadcast',                broadcastContent) +
    collapsible('stats-digital',   '📲 App &amp; Digital',        digitalContent) +
    collapsible('stats-sentiment', '💬 Fan Sentiment',            sentimentContent);
}
