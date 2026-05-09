// ============================================================
// PARTNER BROWSE PAGE
// ============================================================
let partnerBrowseSearch = '';
let partnerBrowsePartnersOnly = true;

function renderPartnerBrowsePage(main) {
  const allBrands = DataStore.getBrandList();
  const rosterActive = DataStore.partnerRoster && DataStore.partnerRoster.length > 0;
  const displayBrands = (partnerBrowsePartnersOnly && rosterActive)
    ? allBrands.filter(b => isCurrentPartner(b))
    : allBrands;
  const filtered = partnerBrowseSearch
    ? displayBrands.filter(b => b.toLowerCase().includes(partnerBrowseSearch.toLowerCase()))
    : displayBrands;

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Partner Browse'}])}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">🔍 Partner Browse</h2>
        <span class="section-meta" id="partner-browse-count">${filtered.length} partner${filtered.length === 1 ? '' : 's'} shown</span>
      </div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
        <div class="brand-selector-wrapper" style="min-width:300px;max-width:480px;">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" class="brand-selector" id="partnerBrowseInput" placeholder="Filter partners..."
            value="${partnerBrowseSearch}" autocomplete="off" style="position:relative;z-index:1;"/>
        </div>
        ${rosterActive ? `
          <label class="survey-partner-toggle">
            <input type="checkbox" id="partnerBrowseRosterToggle" ${partnerBrowsePartnersOnly ? 'checked' : ''}>
            Current partners only
          </label>
        ` : ''}
        <span class="comparison-basis">${allBrands.length} total brands loaded${rosterActive ? ` · ${allBrands.filter(b => isCurrentPartner(b)).length} current partners` : ''}</span>
      </div>

      <div id="partner-browse-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
        ${filtered.map(brand => {
          const chs = DataStore.channelsByBrand[brand] || {};
          const tags = [chs.tv && '📺', chs.organic && '📱', chs.paid && '💰', chs.survey && '📊'].filter(Boolean).join('  ');
          const isPartner = rosterActive && isCurrentPartner(brand);
          return `<button type="button" onclick="selectBrandFromSurvey('${brand.replace(/'/g, "\\'")}')"
            style="text-align:left;background:var(--bg-elev);border:1px solid var(--border);border-radius:6px;
            padding:14px 16px;cursor:pointer;transition:border-color 0.15s,background 0.15s;width:100%;"
            onmouseenter="this.style.borderColor='var(--text-dim)';this.style.background='var(--bg-elev-2)'"
            onmouseleave="this.style.borderColor='var(--border)';this.style.background='var(--bg-elev)'">
            <div style="font-weight:500;font-size:13px;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
              ${renderPartnerLogo(brand, 28)}${brand}${isPartner ? '<span class="brand-option-roster-dot" title="Current partner"></span>' : ''}
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">${tags || 'No channel data'}</div>
          </button>`;
        }).join('')}
        ${filtered.length === 0 ? `<div style="color:var(--text-muted);font-size:13px;padding:24px 0;grid-column:1/-1;">No partners match your search.</div>` : ''}
      </div>
    </section>
  `;

  // Wire input — only re-render the grid, not the whole page
  const input = document.getElementById('partnerBrowseInput');
  if (input) {
    input.focus();
    // Preserve cursor position by not re-rendering while typing
    input.addEventListener('input', () => {
      partnerBrowseSearch = input.value;
      _renderPartnerGrid(main, rosterActive, allBrands);
    });
  }
  const tog = document.getElementById('partnerBrowseRosterToggle');
  if (tog) tog.addEventListener('change', () => {
    partnerBrowsePartnersOnly = tog.checked;
    renderPartnerBrowsePage(main); // full re-render only when toggle changes
  });
}

// Re-renders only the partner grid (not the search bar) to avoid input focus loss
function _renderPartnerGrid(main, rosterActive, allBrands) {
  const displayBrands = (partnerBrowsePartnersOnly && rosterActive)
    ? allBrands.filter(b => isCurrentPartner(b))
    : allBrands;
  const filtered = partnerBrowseSearch
    ? displayBrands.filter(b => b.toLowerCase().includes(partnerBrowseSearch.toLowerCase()))
    : displayBrands;

  const grid = document.getElementById('partner-browse-grid');
  const countEl = document.getElementById('partner-browse-count');
  if (countEl) countEl.textContent = `${filtered.length} partner${filtered.length === 1 ? '' : 's'} shown`;
  if (!grid) return;
  grid.innerHTML = filtered.map(brand => {
    const chs = DataStore.channelsByBrand[brand] || {};
    const tags = [chs.tv && '📺', chs.organic && '📱', chs.paid && '💰', chs.survey && '📊'].filter(Boolean).join('  ');
    const isPartner = rosterActive && isCurrentPartner(brand);
    return `<div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:6px;overflow:hidden;
        transition:border-color 0.15s;"
        onmouseenter="this.style.borderColor='var(--border)'"
        onmouseleave="this.style.borderColor='var(--border-soft)'">
      <button type="button" onclick="selectBrandFromSurvey('${brand.replace(/'/g, "\'")}')"
        style="text-align:left;background:transparent;border:none;
        padding:14px 16px 10px;cursor:pointer;width:100%;display:block;">
        <div style="font-weight:500;font-size:13px;color:var(--text);margin-bottom:5px;display:flex;align-items:center;gap:8px;">
          ${renderPartnerLogo(brand, 28)}${brand}${isPartner ? '<span class="brand-option-roster-dot" title="Current partner"></span>' : ''}
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">${tags || 'No channel data'}</div>
      </button>
      <div style="padding:0 12px 10px;display:flex;justify-content:flex-end;">
        <button type="button"
          onclick="event.stopPropagation(); openReportModal('${brand.replace(/'/g, "\'")}')"
          style="background:transparent;border:1px solid var(--border-soft);border-radius:4px;
          color:var(--text-muted);font-family:var(--font-mono);font-size:10px;
          letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;cursor:pointer;
          transition:all 0.12s;"
          onmouseenter="this.style.borderColor='var(--brand-red)';this.style.color='var(--brand-red)'"
          onmouseleave="this.style.borderColor='var(--border-soft)';this.style.color='var(--text-muted)'">
          📄 Export Report
        </button>
      </div>
    </div>`;
  }).join('') || `<div style="color:var(--text-muted);font-size:13px;padding:24px 0;grid-column:1/-1;">No partners match.</div>`;
}

function renderPortfolioHome(main) {
  const brands = DataStore.getBrandList();
  const tvBrands = brands.filter(b => (DataStore.channelsByBrand[b] || {}).tv).length;
  const socialBrands = brands.filter(b => (DataStore.channelsByBrand[b] || {}).organic).length;
  const period = getSelectedHomePeriod();
  const takeaways = getTopTakeaways(period);

  main.innerHTML = `
    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">Home · Command Center</div>
        <h1 class="brand-title">PartnerIQ</h1>
        <div class="brand-subtitle">
          <span class="channel-tag active">${brands.length} Partners</span>
          <span class="channel-tag ${tvBrands ? 'active' : ''}">${tvBrands} TV</span>
          <span class="channel-tag ${socialBrands ? 'active' : ''}">${socialBrands} Organic Social</span>
        </div>
      </div>
    </div>

    <div class="data-status">
      <div><span class="data-status-dot"></span> Latest update · <strong>${DASHBOARD_META.latestUpdateLabel}</strong>${DASHBOARD_META.latestUpdateDate ? ` · ${DASHBOARD_META.latestUpdateDate}` : ''}</div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em;">${DASHBOARD_META.preparedBy || 'PartnerIQ'}</div>
    </div>

    <div class="takeaways">
      <div class="takeaways-header">
        <h2>Top-line takeaways</h2>
        <span class="count">Auto-generated · ${period === 'all' ? 'All Seasons' : period}</span>
      </div>
      <div class="takeaway-list">
        ${takeaways.map((t, i) => `
          <div class="takeaway">
            <span class="takeaway-marker">${String(i + 1).padStart(2, '0')}</span>
            <div class="takeaway-text">${t}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Quick links</h2>
        <span class="section-meta">Choose a dashboard</span>
      </div>
      <!-- Quick links section label -->
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">Portfolio pages</div>
      <div class="home-actions portfolio-home-actions">
        <div class="home-action" onclick="openTVPortfolioPage();">
          <div class="home-action-kicker">TV Signage</div>
          <div class="home-action-title">📺 TV Visible Signage</div>
          <div class="home-action-copy">Portfolio snapshot, top partners and locations, season trends, and per-asset leaderboards.</div>
        </div>
        <div class="home-action" onclick="openVirtualSignagePage();">
          <div class="home-action-kicker">Virtual Signage</div>
          <div class="home-action-title">🏀 On-Court Virtual Signage</div>
          <div class="home-action-copy">Center and 3-point line virtual branding — full schedule, partner breakdown, and home/away metrics with away-game estimates.</div>
        </div>
        <div class="home-action" onclick="currentBrand=null; currentPage='paid'; renderApp();">
          <div class="home-action-kicker">Paid Social</div>
          <div class="home-action-title">💰 Paid Social Portfolio</div>
          <div class="home-action-copy">Total portfolio spend, partner breakdowns, objective mix, and campaign assignment health.</div>
        </div>
        <div class="home-action" onclick="currentBrand=null; currentPage='organic'; renderApp();">
          <div class="home-action-kicker">Organic Social</div>
          <div class="home-action-title">📱 Organic Social Portfolio</div>
          <div class="home-action-copy">Brand leaderboard, engagement rankings, brand value, and logo impression data from Zoomph.</div>
        </div>
        <div class="home-action" onclick="currentBrand=null; currentPage='survey'; renderApp();">
          <div class="home-action-kicker">Survey Research</div>
          <div class="home-action-title">📊 Survey Research</div>
          <div class="home-action-copy">Brand awareness recall, fan insights, and program awareness — all survey data in one place across three tabs.</div>
        </div>
        <div class="home-action" onclick="openStatsPage();">
          <div class="home-action-kicker">Market Intelligence</div>
          <div class="home-action-title">📈 Stats &amp; Market Data</div>
          <div class="home-action-copy">Social following, arena attendance, STM stats, HHI, Portland market demographics, broadcast, app &amp; digital, and fan sentiment.</div>
        </div>
        <div class="home-action" onclick="openLinksPage();">
          <div class="home-action-kicker">External resources</div>
          <div class="home-action-title">🔗 Links</div>
          <div class="home-action-copy">Quick access to web reports, attendance dashboards, digital signage, TV ratings, and more — all in one place.</div>
        </div>
      </div>

      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-top:28px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">Partner tools</div>
      <div class="home-actions">
        <div class="home-action" onclick="currentBrand=null; currentPage='partners'; renderApp();">
          <div class="home-action-kicker">Partner search</div>
          <div class="home-action-title">🔍 Partner Deep-Dive</div>
          <div class="home-action-copy">Browse all partners, filter to current ones, and open any partner's full performance dashboard.</div>
        </div>
        <div class="home-action disabled">
          <div class="home-action-kicker">Coming soon</div>
          <div class="home-action-title">⚖️ Partner Comparison</div>
          <div class="home-action-copy">Compare two to four partners side by side using consistent channel-specific metrics.</div>
        </div>
        <div class="home-action" onclick="openReportModal();">
          <div class="home-action-kicker">PDF export</div>
          <div class="home-action-title">📄 Partner Report Export</div>
          <div class="home-action-copy">Generate a clean one-page partner recap for any partner in a few clicks.</div>
        </div>
      </div>

      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-top:28px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">Reference</div>
      <div class="home-actions">
        <div class="home-action" onclick="currentBrand=null; currentPage='changelog'; renderApp();">
          <div class="home-action-kicker">Version history</div>
          <div class="home-action-title">📝 Changelog</div>
          <div class="home-action-copy">Every version of PartnerIQ — what changed, when, and which session built it.</div>
        </div>
        <div class="home-action" onclick="openDataHealthPage();">
          <div class="home-action-kicker">Quality control</div>
          <div class="home-action-title">🧪 Data Health</div>
          <div class="home-action-copy">Review loaded row counts, coverage dates, source freshness, and paid mapping needs.</div>
        </div>
        <div class="home-action" onclick="openGlossaryPage();">
          <div class="home-action-kicker">Methodology</div>
          <div class="home-action-title">📘 Glossary</div>
          <div class="home-action-copy">Shared definitions for QIMV, QI Score, SoV, paid media metrics, and survey recall.</div>
        </div>
        <div class="home-action disabled">
          <div class="home-action-kicker">Future channel</div>
          <div class="home-action-title">🏟️ Attendance</div>
          <div class="home-action-copy">Attendance trends, capacity utilization, gate volume, and game-by-game context.</div>
        </div>
        <div class="home-action disabled">
          <div class="home-action-kicker">Future channel</div>
          <div class="home-action-title">📡 TV Viewership &amp; Ratings</div>
          <div class="home-action-copy">Broadcast reach, rating trends, game/event rankings, and audience composition.</div>
        </div>
      </div>
    </section>
  `;
}

function openTVPortfolioPage() {
  currentBrand = null;
  currentPeriod = null;
  currentPage = 'tv';
  document.getElementById('brandSearch').value = '';
  document.getElementById('brandDropdown').classList.remove('active');
  renderApp();
}


function openPortfolioHome() {
  currentBrand = null;
  currentPage = 'home';
  currentPeriod = null;
  const search = document.getElementById('brandSearch');
  const dropdown = document.getElementById('brandDropdown');
  if (search) search.value = '';
  if (dropdown) dropdown.classList.remove('active');
  renderApp();
}

function openDataHealthPage() {
  currentBrand = null;
  currentPage = 'data-health';
  currentPeriod = null;
  renderApp();
}

function openGlossaryPage() {
  currentBrand = null;
  currentPage = 'glossary';
  currentPeriod = null;
  renderApp();
}

function renderStatsPage(main) {
  const fy = STATS_DATA.fiscalYear || '—';
  const s = STATS_DATA;

  function numVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : formatNum(n);
  }
  function pctVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : `${n}%`;
  }
  function dollarVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : formatCurrency(n);
  }
  function rawVal(n) {
    return (!n && n !== 0) || n === 0 ? '—' : n;
  }

  function kpiCard(label, value) {
    return `<div class="home-card"><div class="home-card-label">${label}</div><div class="home-card-value">${value}</div></div>`;
  }

  function subLabel(text) {
    return `<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-top:20px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border-soft);">${text}</div>`;
  }

  function kvTable(entries) {
    return `<table style="width:100%;border-collapse:collapse;">${entries.map(([label, value]) => `
      <tr style="border-bottom:1px solid var(--border-soft);">
        <td style="padding:8px 0;font-size:12px;color:var(--text-dim);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.06em;width:55%;">${label}</td>
        <td style="padding:8px 0;font-size:13px;color:var(--text);text-align:right;font-weight:500;">${value}</td>
      </tr>`).join('')}</table>`;
  }

  function platformTable(platformData, valueFormatter) {
    const platforms = Object.keys(platformData);
    if (!platforms.length) return '';
    const keys = Object.keys(platformData[platforms[0]] || {});
    return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 0;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);font-weight:normal;">Platform</th>
        ${keys.map(k => `<th style="text-align:right;padding:6px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);font-weight:normal;">${k}</th>`).join('')}
      </tr></thead>
      <tbody>${platforms.map(p => `
        <tr style="border-bottom:1px solid var(--border-soft);">
          <td style="padding:8px 0;font-size:12px;color:var(--text-dim);font-family:var(--font-mono);letter-spacing:0.04em;">${p}</td>
          ${keys.map(k => `<td style="padding:8px 8px;text-align:right;font-size:13px;color:var(--text);">${valueFormatter(platformData[p][k])}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function collapsible(id, title, content) {
    const open = openSections[id] !== false;
    return `<section class="section collapsible ${open ? 'open' : ''}" id="${id}" style="margin-bottom:12px;">
      <div class="section-header" data-toggle="${id}">
        <h2 class="section-title">${title}</h2>
        <span class="section-toggle">${open ? '▼' : '▶'}</span>
      </div>
      <div class="section-body">${content}</div>
    </section>`;
  }

  const socialContent = `
    <div class="home-grid" style="margin-bottom:20px;">
      ${Object.entries(s.social.totalFollowers).map(([p, n]) => kpiCard(p, numVal(n))).join('')}
    </div>
    ${subLabel('Age Demographics by Platform (%)')}
    ${platformTable(s.social.demographics, pctVal)}
    ${subLabel('Top Geographic Markets by Platform (% of Following)')}
    ${platformTable(s.social.geography, pctVal)}
  `;

  const arenaContent = `
    <div class="home-grid" style="margin-bottom:20px;">
      ${kpiCard('Annual Visitors', numVal(s.arena.annualVisitors))}
      ${kpiCard('Total Events', numVal(s.arena.totalEvents))}
    </div>
    ${subLabel('Seating Capacity by Section')}
    ${kvTable(Object.entries(s.arena.seatingCapacity).map(([k, v]) => [k, numVal(v)]))}
  `;

  const stmContent = `
    <div class="home-grid">
      ${kpiCard('Total STMs', numVal(s.stm.totalSTMs))}
      ${kpiCard('Renewal Rate', pctVal(s.stm.renewalRate))}
      ${kpiCard('Avg Tenure', s.stm.avgTenureYears ? `${s.stm.avgTenureYears} yrs` : '—')}
      ${kpiCard('New Members', numVal(s.stm.newMembersThisYear))}
    </div>
  `;

  const hhiContent = `
    <div class="home-grid" style="margin-bottom:20px;">
      ${kpiCard('Median HHI', dollarVal(s.householdIncome['Median HHI']))}
    </div>
    ${kvTable(Object.entries(s.householdIncome).filter(([k]) => k !== 'Median HHI').map(([k, v]) => [k, pctVal(v)]))}
  `;

  const portlandContent = `
    <div class="home-grid">
      ${kpiCard('DMA Population', numVal(s.portlandMarket.population))}
      ${kpiCard('Total Households', numVal(s.portlandMarket.totalHouseholds))}
      ${kpiCard('Median Age', rawVal(s.portlandMarket.medianAge))}
      ${kpiCard('Median HHI', dollarVal(s.portlandMarket.medianHHI))}
      ${kpiCard('College Educated', pctVal(s.portlandMarket.collegeEducated))}
      ${kpiCard('Homeownership', pctVal(s.portlandMarket.homeownership))}
    </div>
  `;

  const broadcastContent = `
    <div class="home-grid">
      ${kpiCard('Avg Viewers / Game', numVal(s.broadcast.avgViewersPerGame))}
      ${kpiCard('Season Reach', numVal(s.broadcast.totalSeasonReach))}
      ${kpiCard('Local TV Games', rawVal(s.broadcast.gamesOnLocalTV))}
      ${kpiCard('National TV Games', rawVal(s.broadcast.gamesOnNationalTV))}
      ${kpiCard('Avg Local Rating', rawVal(s.broadcast.avgLocalRating))}
      ${kpiCard('Broadcast Hours', rawVal(s.broadcast.totalBroadcastHours))}
    </div>
  `;

  const digitalContent = `
    <div class="home-grid">
      ${kpiCard('Monthly Active Users', numVal(s.appAndDigital.monthlyActiveUsers))}
      ${kpiCard('Total App Downloads', numVal(s.appAndDigital.totalAppDownloads))}
      ${kpiCard('Avg Sessions / User', rawVal(s.appAndDigital.avgSessionsPerUser))}
      ${kpiCard('Push Opt-In Rate', pctVal(s.appAndDigital.pushOptInRate))}
      ${kpiCard('Email Subscribers', numVal(s.appAndDigital.emailSubscribers))}
      ${kpiCard('Monthly Web Visitors', numVal(s.appAndDigital.websiteMonthlyVisitors))}
    </div>
  `;

  const sentimentContent = `
    <div class="home-grid">
      ${kpiCard('NPS Score', rawVal(s.fanSentiment.npsScore))}
      ${kpiCard('Overall Satisfaction', pctVal(s.fanSentiment.overallSatisfaction))}
      ${kpiCard('Game Experience', s.fanSentiment.gameExperienceRating ? `${s.fanSentiment.gameExperienceRating} / 10` : '—')}
      ${kpiCard('Likelihood to Renew', pctVal(s.fanSentiment.likelihoodToRenew))}
      ${kpiCard('Brand Affinity Score', rawVal(s.fanSentiment.brandAffinityScore))}
    </div>
  `;

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'Stats & Market Data'}])}
    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">Market Intelligence · Reference</div>
        <h1 class="brand-title">Stats &amp; Market Data</h1>
        <div class="brand-subtitle">
          <span class="channel-tag active">FY ${fy}</span>
          <span class="channel-tag active">8 categories</span>
        </div>
      </div>
    </div>
    <div class="data-status">
      <div><span class="data-status-dot"></span> Fiscal year · <strong>${fy}</strong></div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:0.04em;">Update STATS_DATA in 02_constants.js each year</div>
    </div>
    ${collapsible('stats-social',    '📱 Social Following',        socialContent)}
    ${collapsible('stats-arena',     '🏟️ Arena &amp; Attendance',  arenaContent)}
    ${collapsible('stats-stm',       '🎟️ Season Ticket Members',   stmContent)}
    ${collapsible('stats-hhi',       '💵 Household Income',         hhiContent)}
    ${collapsible('stats-portland',  '🌲 Portland Market',          portlandContent)}
    ${collapsible('stats-broadcast', '📡 Broadcast',                broadcastContent)}
    ${collapsible('stats-digital',   '📲 App &amp; Digital',        digitalContent)}
    ${collapsible('stats-sentiment', '💬 Fan Sentiment',            sentimentContent)}
  `;

  wireSectionToggles();
}

function openStatsPage() {
  currentBrand = null;
  currentPage = 'stats';
  currentPeriod = null;
  renderApp();
}

function renderLinksPage(main) {
  const groups = [
    {
      label: 'Web Analytics',
      links: [
        {
          title: 'Rose Quarter Web Page Report',
          source: 'Looker Studio',
          desc: 'Website traffic and page performance metrics for the Rose Quarter.',
          url: 'https://lookerstudio.google.com/u/0/reporting/c2f3a652-779a-4513-9256-d5f998493ad6/page/p_vttsy1digd'
        },
        {
          title: 'Blazers Web Page Report',
          source: 'Looker Studio',
          desc: 'Website traffic and page performance metrics for Blazers.com.',
          url: 'https://lookerstudio.google.com/u/0/reporting/04b4a1b3-5a5a-40ae-acdc-c3a889697349/page/p_vttsy1digd'
        },
      ]
    },
    {
      label: 'Attendance',
      links: [
        {
          title: 'Rose Quarter Events Attendance',
          source: 'Tableau',
          desc: 'Ticket count and attendance data by event for the Rose Quarter.',
          url: 'https://10ay.online.tableau.com/#/site/blazers/views/RQTicketCount_16291417462360/RQTicketCount'
        },
        {
          title: 'Blazers Attendance Report',
          source: 'Tableau',
          desc: 'Season attendance summary and trend analysis.',
          url: 'https://10ay.online.tableau.com/#/site/blazers/views/22-23Attendance/AttendanceSummary?:iid=1'
        },
      ]
    },
    {
      label: 'Digital &amp; Broadcast',
      links: [
        {
          title: 'Triple Play Dashboard',
          source: 'Tableau',
          desc: 'Tracks digital impact signage across platforms.',
          url: 'https://10ay.online.tableau.com/#/site/blazers/views/TriplePlayDashboard/FullScreen?:iid=1'
        },
        {
          title: 'TV Ratings Dashboard',
          source: 'Tableau',
          desc: 'Broadcast TV ratings and viewership metrics.',
          url: 'https://10ay.online.tableau.com/#/site/blazers/views/BroadcastTVRatings/BroadcastTVRatings?:iid=1'
        },
        {
          title: 'Email Report',
          source: 'Tableau',
          desc: 'Email campaign performance and engagement data.',
          url: 'https://10ay.online.tableau.com/#/site/blazers/workbooks/3517813'
        },
      ]
    },
    {
      label: 'App Data',
      links: [
        {
          title: 'App Data — Partner Metrics',
          source: 'SharePoint',
          desc: 'Partner metrics app data and performance report (Excel).',
          url: 'https://ripcity4-my.sharepoint.com/:x:/r/personal/istark_ripcity_com/_layouts/15/Doc.aspx?%5B%E2%80%A6%5DrtnerMetrics.xlsx&action=default&mobileredirect=true'
        },
      ]
    },
  ];

  const totalLinks = groups.reduce((n, g) => n + g.links.length, 0);

  function linkCard(l) {
    const safeUrl = l.url.replace(/&/g, '&amp;');
    return `
      <div class="home-action" onclick="window.open('${safeUrl}', '_blank', 'noopener,noreferrer');">
        <div class="home-action-kicker">${l.source}</div>
        <div class="home-action-title">${l.title} <span style="font-size:11px;opacity:0.5;">↗</span></div>
        <div class="home-action-copy">${l.desc}</div>
      </div>
    `;
  }

  const groupsHTML = groups.map((g, i) => `
    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);${i > 0 ? 'margin-top:28px;' : ''}margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">${g.label}</div>
    <div class="home-actions">
      ${g.links.map(linkCard).join('')}
    </div>
  `).join('');

  main.innerHTML = `
    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">Reference · Quick Links</div>
        <h1 class="brand-title">Links</h1>
        <div class="brand-subtitle">
          <span class="channel-tag active">${totalLinks} links</span>
          <span class="channel-tag active">${groups.length} categories</span>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">External resources</h2>
        <span class="section-meta">Each link opens in a new tab</span>
      </div>
      ${groupsHTML}
    </section>
  `;
}

function openLinksPage() {
  currentBrand = null;
  currentPage = 'links';
  currentPeriod = null;
  renderApp();
}
