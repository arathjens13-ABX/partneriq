function renderTVPortfolioPage(main) {
  const brands = DataStore.getBrandList();
  const tvBrands = brands.filter(b => (DataStore.channelsByBrand[b] || {}).tv).length;
  const socialBrands = brands.filter(b => (DataStore.channelsByBrand[b] || {}).organic).length;
  const period = getSelectedHomePeriod();
  const seasons = getPortfolioSeasons();
  const tvRows = getTVRowsForPeriod(period);
  const socialRows = getSocialRowsForPeriod(period);
  const totalQimv = sum(tvRows, 'QI Media Value ($)');
  const totalImpressions = sum(tvRows, 'Sponsorship QI Impressions');
  const totalDuration = sum(tvRows, 'Duration (Minutes)');
  const totalQimvPerMin = totalDuration > 0 ? totalQimv / totalDuration : null;
  const takeaways = getTopTakeaways(period);
  const yoySets = period !== 'all' ? getPortfolioYoYRowSets(period) : null;
  const prevQimv = yoySets ? sum(yoySets.priorRows, 'QI Media Value ($)') : null;
  const prevImp = yoySets ? sum(yoySets.priorRows, 'Sponsorship QI Impressions') : null;
  const prevDuration = yoySets ? sum(yoySets.priorRows, 'Duration (Minutes)') : null;
  const prevQimvPerMin = (prevDuration && prevDuration > 0) ? prevQimv / prevDuration : null;

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label:'TV Visible Signage'}])}
    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">TV Visible Signage · Portfolio Intelligence</div>
        <h1 class="brand-title">TV Visible Signage</h1>
        <div class="brand-subtitle">
          <span class="channel-tag active">${brands.length} Partners</span>
          <span class="channel-tag ${tvBrands ? 'active' : ''}">${tvBrands} TV</span>
          <span class="channel-tag ${socialBrands ? 'active' : ''}">${socialBrands} Organic Social</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
        <div class="period-selector">
          ${seasons.map(s => `<button class="period-btn ${period === s ? 'active' : ''}" data-home-period="${s}">${s}</button>`).join('')}
          <button class="period-btn ${period === 'all' ? 'active' : ''}" data-home-period="all">All Seasons</button>
        </div>
        <div class="comparison-toggle" title="YoY comparison mode">
          <button class="${comparisonMode === 'auto-match' ? 'active' : ''}" data-compare="auto-match" title="Match current season game count to prior season — safest for in-progress seasons">Matched Games</button>
          <button class="${comparisonMode === 'full' ? 'active' : ''}" data-compare="full" title="Compare full-season totals — only use when current season is complete">Full season</button>
        </div>
      </div>
    </div>

    <div class="data-status">
      <div><span class="data-status-dot"></span> Latest update · <strong>${DASHBOARD_META.latestUpdateLabel}</strong>${DASHBOARD_META.latestUpdateDate ? ` · ${DASHBOARD_META.latestUpdateDate}` : ''}</div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em;">${DASHBOARD_META.preparedBy || 'PartnerIQ'}</div>
    </div>
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-header">
        <span class="card-title">Latest updated section</span>
        <span class="card-sub">Manual dashboard note</span>
      </div>
      <div class="leaderboard-note" style="margin-bottom: 0;">${DASHBOARD_META.updateNotes}</div>
    </div>

    <div class="home-grid">
      <div class="home-card">
        <div class="home-card-label">Total TV QIMV</div>
        <div class="home-card-value" title="${formatExact(totalQimv, '$')}">${formatCurrency(totalQimv)}</div>
        ${prevQimv !== null ? `<div class="home-card-note">${formatSignedPercent(pctChange(totalQimv, prevQimv))} vs ${yoySets.priorSeason} · ${yoySets.basis}</div>` : ''}
        <div class="home-card-note">${period === 'all' ? 'All seasons' : period} · TV visible signage</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Total QI Impressions</div>
        <div class="home-card-value" title="${formatExact(totalImpressions)}">${formatNum(totalImpressions)}</div>
        ${prevImp !== null ? `<div class="home-card-note">${formatSignedPercent(pctChange(totalImpressions, prevImp))} vs ${yoySets.priorSeason} · ${yoySets.basis}</div>` : ''}
        <div class="home-card-note">QI-adjusted impressions</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">QIMV per Minute</div>
        <div class="home-card-value">${totalQimvPerMin !== null ? formatCurrency(totalQimvPerMin) : '—'}</div>
        ${(prevQimvPerMin !== null && totalQimvPerMin !== null) ? `<div class="home-card-note">${formatSignedPercent(pctChange(totalQimvPerMin, prevQimvPerMin))} vs ${yoySets.priorSeason} · ${yoySets.basis}</div>` : ''}
        <div class="home-card-note">Total QIMV ÷ total duration</div>
      </div>
      <div class="home-card">
        <div class="home-card-label">Total TV Duration</div>
        <div class="home-card-value">${formatDurationFromMinutes(totalDuration)}</div>
        ${prevDuration !== null ? `<div class="home-card-note">${formatSignedPercent(pctChange(totalDuration, prevDuration))} vs ${yoySets.priorSeason} · ${yoySets.basis}</div>` : ''}
        <div class="home-card-note">HH:MM:SS on-screen time</div>
      </div>
    </div>

    <div class="takeaways">
      <div class="takeaways-header">
        <h2>Top takeaways</h2>
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
        <h2 class="section-title">Top partners</h2>
        <span class="section-meta">TV Visible Signage · ${period === 'all' ? 'All Seasons' : period}</span>
      </div>
      <div class="leaderboard-note" style="margin-top: -10px;">
        Benchmarking note: partner rankings use total delivered value, impressions, and duration. Location efficiency is handled in the Location Performance table below where assets are more directly comparable.
      </div>
      ${renderHomeLeaderboard(period)}
      ${renderLocationPerformancePanel(period)}
    </section>

  `;

  document.querySelectorAll('[data-home-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      homePeriod = btn.dataset.homePeriod;
      renderApp();
    });
  });

  const leaderboardSelect = document.getElementById('homeLeaderboardSelect');
  if (leaderboardSelect) {
    leaderboardSelect.addEventListener('change', (e) => {
      homeLeaderboardMetric = e.target.value;
      renderApp();
    });
  }
  document.querySelectorAll('[data-compare]').forEach(btn => {
    btn.addEventListener('click', () => {
      comparisonMode = btn.dataset.compare;
      renderApp();
    });
  });
  wireSortableTables();
  wireLimitControls();
  wireInfoIcons();
}

// Visible failure card for a section whose renderer threw. Says which section,
// what went wrong, and leaves the rest of the page usable.
function renderSectionFailure(slotId, label, err) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const message = (err && err.message) ? err.message : 'Unknown error';
  slot.innerHTML = `
    <section class="section section-failed">
      <div class="section-header">
        <h2 class="section-title">${escapeHTML(label)}</h2>
        <span class="section-meta">Could not be displayed</span>
      </div>
      <div class="section-unavailable">
        This section failed to render, so it has been skipped — the rest of the page is unaffected.
        This usually means a row in the source file has an unexpected shape.
        <div class="comparison-basis block" style="margin-top:8px;">${escapeHTML(message)}</div>
      </div>
    </section>`;
}

function renderApp() {
  const main = document.getElementById('main');
  hideTooltip();
  syncHeaderPartnersToggle();

  if (!DataStore.hasAnyData() && currentPage !== 'glossary' && currentPage !== 'data-health' && currentPage !== 'links') {
    main.innerHTML = `
      <div class="empty-state">
        <h1>A single pane of glass for brand performance.</h1>
        <p>Load your TV signage, social, and survey exports to see unified metrics, trends, and year-over-year comparisons across every partner in your portfolio.</p>
        <div class="empty-actions">
          ${VIEWER_MODE ? '' : `<button class="btn btn-primary" onclick="document.getElementById('loadMockBtn').click()">Load demo data</button>`}
          ${VIEWER_MODE ? '' : `<button class="btn" onclick="document.getElementById('dataBtn').click()">Import files</button>`}
        </div>
      </div>
    `;
    return;
  }

  if (!currentBrand) {
    if (currentPage === 'tv') renderTVPortfolioPage(main);
    else if (currentPage === 'tv-ratings') renderTVRatingsPage(main);
    else if (currentPage === 'virtual-signage') renderVirtualSignagePage(main);
    else if (currentPage === 'survey') renderSurveyPortfolioPage(main);
    else if (currentPage === 'paid') renderPaidPortfolioPage(main);
    else if (currentPage === 'organic') renderOrganicSocialPortfolioPage(main);
    else if (currentPage === 'partners') renderPartnerBrowsePage(main);
    else if (currentPage === 'data-health') renderDataHealthPage(main);
    else if (currentPage === 'glossary') renderGlossaryPage(main);
    else if (currentPage === 'links') renderLinksPage(main);
    else renderPortfolioHome(main);
    wireSortableTables();
    wireLimitControls();
    return;
  }

  const channels = DataStore.channelsByBrand[currentBrand] || {};
  const seasons = getAvailableSeasons(currentBrand);
  const latestSeason = seasons[seasons.length - 1] || null;
  const prevSeason = seasons[seasons.length - 2] || null;

  // Default to latest season if currentPeriod not in the list
  if (!currentPeriod || (currentPeriod !== 'all' && !seasons.includes(currentPeriod))) {
    currentPeriod = latestSeason || 'all';
  }

  const channelTags = [
    { key: 'tv',             label: 'TV Signage',                 slot: 'tv-slot' },
    { key: 'virtualSignage', label: 'On-Court Virtual Signage',   slot: 'virtual-signage-slot' },
    { key: 'organic',        label: 'Organic Social',             slot: 'social-slot' },
    { key: 'survey',         label: 'Survey Research',            slot: 'survey-slot' },
    { key: 'paid',           label: 'Paid Social',                slot: 'paid-slot' },
    { key: 'ancLED',         label: 'ANC LED',                    slot: 'anc-led-slot' },
    { key: 'affidavit',      label: 'TV/Radio Affidavits',        slot: 'affidavits-slot' },
    { key: 'webDisplay',     label: 'Web & Digital',              slot: 'web-digital-slot' },
  ].map(c => {
    // Survey Research now consolidates Brand Awareness, Fan Insights, Programs & Community,
    // and Moda/Delta-specific survey questions into one partner-page dropdown.
    let active = false;
    if (c.key === 'tv')             active = !!channels.tv;
    else if (c.key === 'virtualSignage') active = typeof hasVirtualSignageDataForBrand === 'function' ? hasVirtualSignageDataForBrand(currentBrand) : false;
    else if (c.key === 'organic')   active = !!channels.organic;
    else if (c.key === 'paid')      active = !!channels.paid;
    else if (c.key === 'survey')    active = typeof hasSurveyResearchDataForBrand === 'function' ? hasSurveyResearchDataForBrand(currentBrand) : !!channels.survey;
    else if (c.key === 'ancLED')    active = typeof hasANCLEDDataForBrand === 'function' ? hasANCLEDDataForBrand(currentBrand) : !!channels.ancLED;
    else if (c.key === 'affidavit') active = typeof hasAffidavitDataForBrand === 'function' ? hasAffidavitDataForBrand(currentBrand) : !!channels.affidavit;
    else if (c.key === 'webDisplay') active = typeof hasWebDisplayDataForBrand === 'function' ? hasWebDisplayDataForBrand(currentBrand) : !!channels.webDisplay;
    return `<button type="button" class="channel-tag channel-tag-button ${active ? 'active' : ''}" data-channel-jump="${c.slot}" ${active ? '' : 'disabled'}>${c.label}</button>`;
  }).join('');

  main.innerHTML = `
    ${renderBreadcrumb([{label:'Home', action:'openPortfolioHome();'}, {label: currentBrand}])}
    <div class="data-status">
      <div><span class="data-status-dot"></span> Data loaded locally · <strong>${DataStore.brands.size} BRANDS</strong> · <strong>${DataStore.tvSignage.length} TV ROWS</strong> · <strong>${Object.keys(DataStore.organicSocial).length} SOCIAL FILES</strong>${DataStore.surveys.length ? ` · <strong>${DataStore.surveys.length} SURVEY ROWS</strong>` : ''}${(DataStore.zoomphBrandPerf||[]).length ? ` · <strong>${DataStore.zoomphBrandPerf.length} ORGANIC SNAPSHOTS</strong>` : ''}${DataStore.partnerRoster.length ? ` · <strong>${DataStore.partnerRoster.length} PARTNERS</strong>` : ''}</div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em;">LAST UPDATE · ${escapeHTML(getDataAsOfLabel())}</div>
    </div>
    ${renderDataFreshnessStrip(currentBrand)}

    <div class="brand-header">
      <div class="brand-title-block">
        <div class="eyebrow">Partner Report · ${currentPeriod === 'all' ? 'All Seasons' : currentPeriod}</div>
        <div class="partner-identity" style="display:flex;align-items:center;gap:22px;margin-top:6px;">
          ${renderPartnerLogo(currentBrand, 96)}
          <h1 class="brand-title" style="font-size:64px;">${currentBrand}</h1>
        </div>
        <div class="brand-subtitle">${channelTags}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn" data-report-brand="${escapeAttr(currentBrand)}"
            style="background:var(--brand-red);border-color:var(--brand-red);color:#fff;font-weight:600;"
            title="Customize and export a PDF-ready partnership report for this partner">
            ⬇ Export Report
          </button>
        </div>
        <div class="period-selector">
          ${seasons.map(s => `<button class="period-btn ${currentPeriod === s ? 'active' : ''}" data-period="${s}">${s}</button>`).join('')}
          <button class="period-btn ${currentPeriod === 'all' ? 'active' : ''}" data-period="all">All Seasons</button>
        </div>
        <div class="comparison-toggle" title="YoY comparison mode">
          <button class="${comparisonMode === 'auto-match' ? 'active' : ''}" data-compare="auto-match" title="Match current season game count to prior season — safest for in-progress seasons">Matched Games</button>
          <button class="${comparisonMode === 'full' ? 'active' : ''}" data-compare="full" title="Compare full-season totals — only use when current season is complete">Full season</button>
        </div>
      </div>
    </div>

    <div id="takeaways-slot"></div>
    <div id="tv-slot"></div>
    <div id="virtual-signage-slot"></div>
    <div id="social-slot"></div>
    <div id="survey-slot"></div>
    <div id="paid-slot"></div>
    <div id="anc-led-slot"></div>
    <div id="affidavits-slot"></div>
    <div id="web-digital-slot"></div>
  `;

  document.querySelectorAll('[data-channel-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.dataset.channelJump);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      renderApp();
    });
  });

  document.querySelectorAll('[data-compare]').forEach(btn => {
    btn.addEventListener('click', () => {
      comparisonMode = btn.dataset.compare;
      renderApp();
    });
  });

  // Each section renders inside its own boundary. This app ingests arbitrary
  // vendor CSVs, so a single malformed row used to abort renderApp() partway:
  // every section below the failure silently never rendered, and the user got a
  // half-blank page with no indication anything had gone wrong. Now a failing
  // section shows what happened and the rest of the page still draws.
  const sections = [
    ['takeaways-slot',        'Top-line takeaways',        () => renderTakeaways(currentBrand, latestSeason, prevSeason)],
    ['tv-slot',               'TV Visible Signage',        () => channels.tv && renderTVSection(currentBrand)],
    ['virtual-signage-slot',  'On-Court Virtual Signage',  () => hasVirtualSignageDataForBrand(currentBrand) && renderVirtualSignageSection(currentBrand)],
    // Sections only render when the brand has data in that channel — otherwise
    // empty placeholders clutter the page for partners not in it.
    ['social-slot',           'Organic Social',            () => channels.organic && renderOrganicSocialSection(currentBrand)],
    ['paid-slot',             'Paid Social',               () => channels.paid && renderPaidSection(currentBrand)],
    ['survey-slot',           'Survey Research',           () => hasSurveyResearchDataForBrand(currentBrand) && renderSurveySection(currentBrand)],
    ['anc-led-slot',          'ANC LED',                   () => hasANCLEDDataForBrand(currentBrand) && renderANCLEDSection(currentBrand)],
    ['affidavits-slot',       'TV / Radio Affidavits',     () => hasAffidavitDataForBrand(currentBrand) && renderAffidavitsSection(currentBrand)],
    ['web-digital-slot',      'Web & Digital',             () => hasWebDisplayDataForBrand(currentBrand) && renderWebDigitalSection(currentBrand)],
  ];
  sections.forEach(([slotId, label, render]) => {
    try {
      render();
    } catch (err) {
      console.error(`Section "${label}" failed to render`, err);
      renderSectionFailure(slotId, label, err);
    }
  });

  wireInfoIcons();
  wireSortableTables();
  wireLimitControls();
  wireSectionToggles();
}

function renderTakeaways(brand, latestSeason, prevSeason) {
  const takeaways = [];
  const tvAll     = getBrandTVData(brand, currentPeriod);
  const socialAll = getBrandSocialData(brand, currentPeriod);
  const paidAll   = getBrandPaidData(brand, currentPeriod);

  // Resolve On-Court virtual signage group for this brand once (used in multiple bullets)
  const vsGroup = (function() {
    if (!hasVirtualSignageDataForBrand(brand)) return null;
    const grouped = groupVSPartnerStats(getVirtualSignagePartnerStats());
    return grouped.find(g => g.brand === brand || g.members.some(m => m.brand === brand)) || null;
  })();

  if (tvAll.length) {
    const totalImp = sum(tvAll, 'Sponsorship QI Impressions');
    const totalMV  = sum(tvAll, 'QI Media Value ($)');

    let qimvYoYText = '', impYoYText = '';
    if (latestSeason && prevSeason) {
      const qimvYoY = computeYoYForMetric(brand, currentPeriod, 'QI Media Value ($)');
      if (qimvYoY !== null) {
        const cls = qimvYoY.change >= 0 ? 'up' : 'down';
        qimvYoYText = ` (<span class="${cls}">${qimvYoY.change >= 0 ? '↑' : '↓'} ${Math.abs(qimvYoY.change * 100).toFixed(1)}%</span> YoY, ${qimvYoY.basis})`;
      }
      const impYoY = computeYoYForMetric(brand, currentPeriod, 'Sponsorship QI Impressions');
      if (impYoY !== null) {
        const cls = impYoY.change >= 0 ? 'up' : 'down';
        impYoYText = ` (<span class="${cls}">${impYoY.change >= 0 ? '↑' : '↓'} ${Math.abs(impYoY.change * 100).toFixed(1)}%</span> YoY, ${impYoY.basis})`;
      }
    }

    if (vsGroup) {
      // Combined QIMV: TV visible + On-Court virtual signage
      const combinedMV = totalMV + vsGroup.qimv;
      const vsYoY = computeVSQimvYoY(brand);
      let vsYoYText = '';
      if (vsYoY !== null) {
        const cls = vsYoY.change >= 0 ? 'up' : 'down';
        vsYoYText = ` (<span class="${cls}">${vsYoY.change >= 0 ? '↑' : '↓'} ${Math.abs(vsYoY.change * 100).toFixed(1)}%</span> YoY)`;
      }
      takeaways.push(
        `<strong>Total QIMV —</strong> Generated <strong>${formatCurrency(combinedMV)}</strong> in combined QI media value ` +
        `(TV visible: <strong>${formatCurrency(totalMV)}</strong>${qimvYoYText} · ` +
        `On-Court virtual: <strong>${formatCurrency(vsGroup.qimv)}</strong>${vsYoYText}). ` +
        `<span style="color:var(--text-muted);font-size:12px;">On-Court virtual signage is reported separately in the section below.</span>`
      );
    } else {
      takeaways.push(`<strong>QIMV —</strong> Generated <strong>${formatCurrency(totalMV)}</strong> in QI media value${qimvYoYText}.`);
    }

    takeaways.push(`<strong>QI Impressions —</strong> Delivered <strong>${formatNum(totalImp)}</strong> QI sponsorship impressions across <strong>${tvAll.length}</strong> broadcast exposures${impYoYText}.`);
  }

  // Survey — pick whichever of aided/unaided recall has the higher %; omit if neither available
  const latestWave = getSurveyLatestWave(brand, 'all');
  if (latestWave) {
    const ap = latestWave.AidedPct, up = latestWave.UnaidedPct;
    let chosenPct = null, chosenLabel = null, chosenPriorKey = null;
    if (ap !== null && up !== null) {
      if (ap >= up) { chosenPct = ap; chosenLabel = 'Aided Recall'; chosenPriorKey = 'AidedPct'; }
      else           { chosenPct = up; chosenLabel = 'Unaided Recall'; chosenPriorKey = 'UnaidedPct'; }
    } else if (ap !== null) {
      chosenPct = ap; chosenLabel = 'Aided Recall'; chosenPriorKey = 'AidedPct';
    } else if (up !== null) {
      chosenPct = up; chosenLabel = 'Unaided Recall'; chosenPriorKey = 'UnaidedPct';
    }
    if (chosenPct !== null) {
      // Phase-matched YoY: Late→Late, Early→Early. Calling with 'all' would return the
      // 2nd-most-recent wave regardless of phase, which in practice is the opposite-phase
      // wave of the same season — an intra-season comparison, not YoY.
      const priorWave = getSurveyPriorWave(brand, latestWave.Phase);
      let yoyText = '';
      if (priorWave) {
        const priorPct = priorWave[chosenPriorKey];
        if (priorPct !== null) {
          const ppChange = chosenPct - priorPct;
          const cls = ppChange >= 0 ? 'up' : 'down';
          yoyText = ` (<span class="${cls}">${ppChange >= 0 ? '+' : ''}${(ppChange * 100).toFixed(1)}% YoY</span>)`;
        }
      }
      takeaways.push(`<strong>${chosenLabel} —</strong> <strong>${(chosenPct * 100).toFixed(1)}%</strong> fan awareness${yoyText} (${latestWave.Season}).`);
    }
  }

  if (socialAll.length) {
    const totalImp = sum(socialAll, 'Impressions');
    const totalVal = sum(socialAll, 'BrandExposureValue');
    const engRate = avg(socialAll, 'EngagementRate');
    const engText = engRate ? ` at <strong>${formatPct(engRate, 2)}</strong> avg engagement` : '';
    const bevText = totalVal > 0 ? `, valued at <strong>${formatCurrency(totalVal)}</strong> in brand exposure value` : '';
    takeaways.push(`<strong>Organic Social —</strong> <strong>${formatNum(totalImp)}</strong> impressions across <strong>${socialAll.length}</strong> posts${engText}${bevText}.`);
  }

  if (paidAll.length) {
    const paid = paidAggregate(paidAll);
    takeaways.push(`Paid social spent <strong>${formatCurrency(paid.spend)}</strong> across <strong>${paid.campaignCount}</strong> campaign${paid.campaignCount === 1 ? '' : 's'}, delivering <strong>${formatNum(paid.impressions)}</strong> impressions and <strong>${formatPct(paid.ctr, 2)}</strong> link CTR.`);
    if (paid.resultIndicatorCount > 1) {
      takeaways.push(`Paid social includes <strong>${paid.resultIndicatorCount}</strong> result types, so cost-per-result should be reviewed by campaign objective rather than as one blended benchmark.`);
    }
  }

  if (tvAll.length && socialAll.length) {
    const tvMV      = sum(tvAll, 'QI Media Value ($)');
    const socialBEV = sum(socialAll, 'BrandExposureValue');
    const vsMV      = vsGroup ? vsGroup.qimv : 0;
    const totalValue = tvMV + socialBEV + vsMV;
    const vsLabel = vsMV > 0 ? ' + On-Court virtual' : '';
    takeaways.push(`Combined TV${vsLabel} + organic social value totals <strong>${formatCurrency(totalValue)}</strong> for this period.`);
  }

  if (!takeaways.length) takeaways.push(`No data available for ${brand} in the selected period.`);

  document.getElementById('takeaways-slot').innerHTML = `
    <div class="takeaways">
      <div class="takeaways-header">
        <h2>Top-line takeaways</h2>
        <span class="count">${takeaways.length} Insight${takeaways.length === 1 ? '' : 's'}</span>
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
  `;
}
