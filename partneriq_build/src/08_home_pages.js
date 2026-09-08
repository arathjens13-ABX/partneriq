// ============================================================
// PARTNER BROWSE PAGE
// ============================================================
let partnerBrowseSearch = '';

function renderPartnerBrowsePage(main) {
  const allBrands = DataStore.getBrandList();
  const rosterActive = DataStore.partnerRoster && DataStore.partnerRoster.length > 0;
  const displayBrands = (searchPartnersOnly && rosterActive)
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
            <input type="checkbox" id="partnerBrowseRosterToggle" ${searchPartnersOnly ? 'checked' : ''}>
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
          return `<button type="button" data-brand-nav="${escapeAttr(brand)}"
            style="text-align:left;background:var(--bg-elev);border:1px solid var(--border);border-radius:6px;
            padding:14px 16px;cursor:pointer;transition:border-color 0.15s,background 0.15s;width:100%;"
            onmouseenter="this.style.borderColor='var(--text-dim)';this.style.background='var(--bg-elev-2)'"
            onmouseleave="this.style.borderColor='var(--border)';this.style.background='var(--bg-elev)'">
            <div style="font-weight:500;font-size:13px;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
              ${renderPartnerLogo(brand, 28)}${brand}${renderPartnerStatusPill(brand)}
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
    searchPartnersOnly = tog.checked;
    renderApp(); // re-renders the browse page and syncs the header toggle
  });
}

// Re-renders only the partner grid (not the search bar) to avoid input focus loss
function _renderPartnerGrid(main, rosterActive, allBrands) {
  const displayBrands = (searchPartnersOnly && rosterActive)
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
      <button type="button" data-brand-nav="${escapeAttr(brand)}"
        style="text-align:left;background:transparent;border:none;
        padding:14px 16px 10px;cursor:pointer;width:100%;display:block;">
        <div style="font-weight:500;font-size:13px;color:var(--text);margin-bottom:5px;display:flex;align-items:center;gap:8px;">
          ${renderPartnerLogo(brand, 28)}${brand}${renderPartnerStatusPill(brand)}
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">${tags || 'No channel data'}</div>
      </button>
      <div style="padding:0 12px 10px;display:flex;justify-content:flex-end;">
        <button type="button"
          data-report-brand="${escapeAttr(brand)}"
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
        <div class="home-action" onclick="openPaidPortfolioPage();">
          <div class="home-action-kicker">Paid Social</div>
          <div class="home-action-title">💰 Paid Social Portfolio</div>
          <div class="home-action-copy">Total portfolio spend, partner breakdowns, objective mix, and campaign assignment health.</div>
        </div>
        <div class="home-action" onclick="openOrganicSocialPortfolioPage();">
          <div class="home-action-kicker">Organic Social</div>
          <div class="home-action-title">📱 Organic Social Portfolio</div>
          <div class="home-action-copy">Brand leaderboard, engagement rankings, brand value, and logo impression data from Zoomph.</div>
        </div>
        <div class="home-action" onclick="openSurveyPortfolioPage();">
          <div class="home-action-kicker">Survey Research</div>
          <div class="home-action-title">📊 Survey Research</div>
          <div class="home-action-copy">Brand awareness recall, fan insights, and program awareness — all survey data in one place across three tabs.</div>
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
        <div class="home-action" data-report-brand="">
          <div class="home-action-kicker">PDF export</div>
          <div class="home-action-title">📄 Partner Report Export</div>
          <div class="home-action-copy">Generate a clean one-page partner recap for any partner in a few clicks.</div>
        </div>
      </div>

      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-top:28px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">Reference</div>
      <div class="home-actions">
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
        <div class="home-action" onclick="openTVRatingsPage();">
          <div class="home-action-kicker">Nielsen data</div>
          <div class="home-action-title">📡 TV Ratings Dashboard</div>
          <div class="home-action-copy">Nielsen game ratings and impressions — season trend, opponent breakdown, pre/game/post comparison, and key advertiser demos.</div>
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

function openPaidPortfolioPage() {
  currentBrand = null;
  currentPeriod = null;
  currentPage = 'paid';
  document.getElementById('brandSearch').value = '';
  document.getElementById('brandDropdown').classList.remove('active');
  renderApp();
}

function openOrganicSocialPortfolioPage() {
  currentBrand = null;
  currentPeriod = null;
  currentPage = 'organic';
  document.getElementById('brandSearch').value = '';
  document.getElementById('brandDropdown').classList.remove('active');
  renderApp();
}

function openSurveyPortfolioPage() {
  currentBrand = null;
  currentPeriod = null;
  currentPage = 'survey';
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
      label: 'Digital & Broadcast',
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
          title: 'Blazers App — Partner Metrics',
          source: 'SharePoint',
          desc: 'Partner metrics app data and performance report (Excel).',
          url: 'https://ripcity4-my.sharepoint.com/:x:/r/personal/istark_ripcity_com/_layouts/15/Doc.aspx?sourcedoc=%7B2FB91895-F546-4CF6-B554-0DBD52D46A94%7D&file=Trail%20Blazers%20App%20-%20Partner%20Metrics.xlsx&action=default&mobileredirect=true'
        },
      ]
    },
  ];

  const totalLinks = groups.reduce((n, g) => n + g.links.length, 0);

  // A real anchor, not a div with an onclick. The old version wasn't tabbable,
  // couldn't be middle-clicked or opened in a new tab, had no "copy link
  // address", and showed no destination on hover — and its hand-rolled escaping
  // covered only "&", so an apostrophe in a URL would have broken the handler.
  function linkCard(l) {
    return `
      <a class="home-action" href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">
        <div class="home-action-kicker">${escapeHTML(l.source)}</div>
        <div class="home-action-title">${escapeHTML(l.title)} <span style="font-size:11px;opacity:0.5;">↗</span></div>
        <div class="home-action-copy">${escapeHTML(l.desc)}</div>
      </a>
    `;
  }

  const groupsHTML = groups.map((g, i) => `
    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);${i > 0 ? 'margin-top:28px;' : ''}margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft);">${escapeHTML(g.label)}</div>
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
