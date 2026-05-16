// ============================================================
// GLOBAL STATE
// ============================================================
var openSections = {};

// ============================================================
// APP ROUTER — single-page, just renders the stats page
// ============================================================
function renderApp() {
  const main = document.getElementById('main');
  if (!main) return;
  renderStatsPage(main);
  wireSectionToggles();
}

// ============================================================
// SECTION TOGGLE WIRING
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
}

// ============================================================
// STATS PAGE RENDERER
// ============================================================
function renderStatsPage(main) {
  var fy = STATS_DATA.fiscalYear || '—';
  var s  = STATS_DATA;

  function numVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : formatNum(n);
  }
  function pctVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : n + '%';
  }
  function dollarVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : formatCurrency(n);
  }
  function rawVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : n;
  }

  function kpiCard(label, value) {
    return '<div class="home-card"><div class="home-card-label">' + label + '</div><div class="home-card-value">' + value + '</div></div>';
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
      platforms.map(function(p) {
        return '<tr style="border-bottom:1px solid var(--border-soft);">' +
          '<td style="padding:8px 0;font-size:12px;color:var(--text-dim);font-family:var(--font-mono);letter-spacing:0.04em;">' + p + '</td>' +
          keys.map(function(k) {
            return '<td style="padding:8px 8px;text-align:right;font-size:13px;color:var(--text);">' + valueFormatter(platformData[p][k]) + '</td>';
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
    Object.entries(s.social.totalFollowers).map(function(e) { return kpiCard(e[0], numVal(e[1])); }).join('') +
    '</div>' +
    subLabel('Age Demographics by Platform (%)') +
    platformTable(s.social.demographics, pctVal) +
    subLabel('Top Geographic Markets by Platform (% of Following)') +
    platformTable(s.social.geography, pctVal);

  var arenaContent =
    '<div class="home-grid" style="margin-bottom:20px;">' +
    kpiCard('Annual Visitors', numVal(s.arena.annualVisitors)) +
    kpiCard('Total Events', numVal(s.arena.totalEvents)) +
    '</div>' +
    subLabel('Seating Capacity by Section') +
    kvTable(Object.entries(s.arena.seatingCapacity).map(function(e) { return [e[0], numVal(e[1])]; }));

  var stmContent =
    '<div class="home-grid">' +
    kpiCard('Total STMs', numVal(s.stm.totalSTMs)) +
    kpiCard('Renewal Rate', pctVal(s.stm.renewalRate)) +
    kpiCard('Avg Tenure', s.stm.avgTenureYears ? s.stm.avgTenureYears + ' yrs' : '—') +
    kpiCard('New Members', numVal(s.stm.newMembersThisYear)) +
    '</div>';

  var hhiContent =
    '<div class="home-grid" style="margin-bottom:20px;">' +
    kpiCard('Median HHI', dollarVal(s.householdIncome['Median HHI'])) +
    '</div>' +
    kvTable(
      Object.entries(s.householdIncome)
        .filter(function(e) { return e[0] !== 'Median HHI'; })
        .map(function(e) { return [e[0], pctVal(e[1])]; })
    );

  var portlandContent =
    '<div class="home-grid">' +
    kpiCard('DMA Population', numVal(s.portlandMarket.population)) +
    kpiCard('Total Households', numVal(s.portlandMarket.totalHouseholds)) +
    kpiCard('Median Age', rawVal(s.portlandMarket.medianAge)) +
    kpiCard('Median HHI', dollarVal(s.portlandMarket.medianHHI)) +
    kpiCard('College Educated', pctVal(s.portlandMarket.collegeEducated)) +
    kpiCard('Homeownership', pctVal(s.portlandMarket.homeownership)) +
    '</div>';

  var broadcastContent =
    '<div class="home-grid">' +
    kpiCard('Avg Viewers / Game', numVal(s.broadcast.avgViewersPerGame)) +
    kpiCard('Season Reach', numVal(s.broadcast.totalSeasonReach)) +
    kpiCard('Local TV Games', rawVal(s.broadcast.gamesOnLocalTV)) +
    kpiCard('National TV Games', rawVal(s.broadcast.gamesOnNationalTV)) +
    kpiCard('Avg Local Rating', rawVal(s.broadcast.avgLocalRating)) +
    kpiCard('Broadcast Hours', rawVal(s.broadcast.totalBroadcastHours)) +
    '</div>';

  var digitalContent =
    '<div class="home-grid">' +
    kpiCard('Monthly Active Users', numVal(s.appAndDigital.monthlyActiveUsers)) +
    kpiCard('Total App Downloads', numVal(s.appAndDigital.totalAppDownloads)) +
    kpiCard('Avg Sessions / User', rawVal(s.appAndDigital.avgSessionsPerUser)) +
    kpiCard('Push Opt-In Rate', pctVal(s.appAndDigital.pushOptInRate)) +
    kpiCard('Email Subscribers', numVal(s.appAndDigital.emailSubscribers)) +
    kpiCard('Monthly Web Visitors', numVal(s.appAndDigital.websiteMonthlyVisitors)) +
    '</div>';

  var sentimentContent =
    '<div class="home-grid">' +
    kpiCard('NPS Score', rawVal(s.fanSentiment.npsScore)) +
    kpiCard('Overall Satisfaction', pctVal(s.fanSentiment.overallSatisfaction)) +
    kpiCard('Game Experience', s.fanSentiment.gameExperienceRating ? s.fanSentiment.gameExperienceRating + ' / 10' : '—') +
    kpiCard('Likelihood to Renew', pctVal(s.fanSentiment.likelihoodToRenew)) +
    kpiCard('Brand Affinity Score', rawVal(s.fanSentiment.brandAffinityScore)) +
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

    collapsible('stats-social',    '📱 Social Following',        socialContent) +
    collapsible('stats-arena',     '🏟️ Arena &amp; Attendance',  arenaContent) +
    collapsible('stats-stm',       '🎟️ Season Ticket Members',   stmContent) +
    collapsible('stats-hhi',       '💵 Household Income',         hhiContent) +
    collapsible('stats-portland',  '🌲 Portland Market',          portlandContent) +
    collapsible('stats-broadcast', '📡 Broadcast',                broadcastContent) +
    collapsible('stats-digital',   '📲 App &amp; Digital',        digitalContent) +
    collapsible('stats-sentiment', '💬 Fan Sentiment',            sentimentContent);
}
