// WIRING
// ============================================================
// Last-resort error reporting. Without this, anything that throws outside a
// section boundary failed silently — the user saw a control that did nothing
// and had no way to know why, or to tell us what happened.
window.addEventListener('error', (e) => {
  console.error('Uncaught error', e.error || e.message);
  if (typeof showErrorToast === 'function') {
    showErrorToast(`Something went wrong: ${(e.error && e.error.message) || e.message || 'unknown error'}`);
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection', e.reason);
  if (typeof showErrorToast === 'function') {
    showErrorToast(`Something went wrong: ${(e.reason && e.reason.message) || 'unknown error'}`);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Always start clean — close modals, so exported preloaded dashboards open on the home page
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  const search = document.getElementById('brandSearch');
  const dropdown = document.getElementById('brandDropdown');
  search.addEventListener('focus', () => updateBrandDropdown(search.value));
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-controls', 'brandDropdown');
  dropdown.setAttribute('role', 'listbox');

  // Keyboard navigation for the partner search. The dropdown options are divs
  // with click handlers, so without this there is no way to choose a partner
  // without a mouse.
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); moveBrandDropdownCursor(1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); moveBrandDropdownCursor(-1); }
    else if (e.key === 'Enter')     {
      const brand = getBrandDropdownCursorBrand();
      if (brand) { e.preventDefault(); selectBrandFromDropdown(brand); }
    }
    else if (e.key === 'Escape')    { dropdown.classList.remove('active'); search.blur(); }
  });
  // Debounce input so the dropdown filter/render work doesn't block keystroke painting.
  let brandSearchDebounce = null;
  search.addEventListener('input', () => {
    if (brandSearchDebounce) clearTimeout(brandSearchDebounce);
    brandSearchDebounce = setTimeout(() => updateBrandDropdown(search.value), 120);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.brand-selector-wrapper') && !e.target.closest('#headerPartnersToggle')) dropdown.classList.remove('active');
  });

  // Delegated navigation for data-driven controls.
  //
  // These used to be inline `onclick="selectBrandFromSurvey('${brand}')"` handlers
  // with hand-rolled apostrophe escaping. Three of the ten sites escaped with
  // "\'" — which in a double-quoted JS string is just an apostrophe, so it did
  // nothing, and every partner with an apostrophe in their name (McDonald's)
  // produced a syntax error and a control that silently did nothing when clicked.
  //
  // Reading the name back out of a data attribute removes the escaping problem
  // entirely: the value never has to survive a trip through a JS string literal.
  // Delegation also means newly rendered markup is live without re-wiring.
  document.addEventListener('click', (e) => {
    const reportEl = e.target.closest('[data-report-brand]');
    if (reportEl) {
      e.stopPropagation();
      const brand = reportEl.getAttribute('data-report-brand');
      openReportModal(brand || null);
      return;
    }
    const mergeEl = e.target.closest('[data-naming-merge-variant]');
    if (mergeEl) {
      mergeNamingSuggestion(
        mergeEl.getAttribute('data-naming-merge-variant'),
        mergeEl.getAttribute('data-naming-merge-canonical')
      );
      return;
    }
    const keepApartEl = e.target.closest('[data-naming-keep-apart]');
    if (keepApartEl) {
      keepNamingSuggestionApart(keepApartEl.getAttribute('data-naming-keep-apart'));
      return;
    }
    const navEl = e.target.closest('[data-brand-nav]');
    if (navEl) {
      const brand = navEl.getAttribute('data-brand-nav');
      if (brand) selectBrandFromSurvey(brand);
    }
  });

  // Header "Partners only" toggle — shared filter for search, browse, and paid switcher
  const headerPartnersOnly = document.getElementById('headerPartnersOnly');
  if (headerPartnersOnly) headerPartnersOnly.addEventListener('change', () => {
    searchPartnersOnly = headerPartnersOnly.checked;
    updateBrandDropdown(search.value);   // refresh the open dropdown immediately
    renderApp();                          // keep browse page / pills in sync
  });

  const modal = document.getElementById('modalBackdrop');
  const goHome = () => {
    currentBrand = null;
    currentPage = 'home';
    currentPeriod = null;
    search.value = '';
    dropdown.classList.remove('active');
    renderApp();
  };
  document.getElementById('homeBtn').addEventListener('click', goHome);
  const homeNavBtn = document.getElementById('homeNavBtn');
  if (homeNavBtn) homeNavBtn.addEventListener('click', goHome);

  document.getElementById('themeToggleBtn').addEventListener('click', function() {
    var isLight = document.documentElement.dataset.theme === 'light';
    if (isLight) {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = 'light';
    }
    renderApp();
  });


  document.getElementById('dataBtn').addEventListener('click', () => { if (!VIEWER_MODE) modal.classList.add('active'); });
  document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  // Disarm any pending replace and reset the input so picking the same filename re-fires change
  dz.addEventListener('click', () => { pendingReplaceFileId = null; fileInput.value = ''; fileInput.click(); });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); pendingReplaceFileId = null; handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  document.getElementById('loadMockBtn').addEventListener('click', () => {
    generateMockData();
    modal.classList.remove('active');
    renderFileLog();
    renderApp();
    updateBrandDropdown('');
  });

  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (!DataStore.hasAnyData() && !(DataStore.loadedFiles || []).length) return;
    if (!confirm('Clear ALL loaded data and the file log? This cannot be undone.')) return;
    DataStore.reset();
    currentBrand = null;
    currentPage = 'home';
    currentPeriod = null;
    document.getElementById('brandSearch').value = '';
    renderFileLog();
    renderApp();
  });

  const exportBtn = document.getElementById('exportPreloadedBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportPreloadedDashboard);
  const reviewPaidBtn = document.getElementById('reviewPaidAssignmentsBtn');
  if (reviewPaidBtn) reviewPaidBtn.addEventListener('click', openPaidAssignmentReview);
  const reviewGeneralSurveyBtn = document.getElementById('reviewGeneralSurveyBtn');
  if (reviewGeneralSurveyBtn) reviewGeneralSurveyBtn.addEventListener('click', openGeneralSurveyReview);
  const generalSurveyReviewClose = document.getElementById('generalSurveyReviewClose');
  if (generalSurveyReviewClose) generalSurveyReviewClose.addEventListener('click', closeGeneralSurveyReview);
  const generalSurveyReviewBackdrop = document.getElementById('generalSurveyReviewBackdrop');
  if (generalSurveyReviewBackdrop) generalSurveyReviewBackdrop.addEventListener('click', (e) => { if (e.target === generalSurveyReviewBackdrop) closeGeneralSurveyReview(); });
  const manageBrandAliasesBtn = document.getElementById('manageBrandAliasesBtn');
  if (manageBrandAliasesBtn) manageBrandAliasesBtn.addEventListener('click', openBrandAliasManager);
  const brandAliasClose = document.getElementById('brandAliasClose');
  if (brandAliasClose) brandAliasClose.addEventListener('click', closeBrandAliasManager);
  const brandAliasBackdrop = document.getElementById('brandAliasBackdrop');
  if (brandAliasBackdrop) brandAliasBackdrop.addEventListener('click', (e) => { if (e.target === brandAliasBackdrop) closeBrandAliasManager(); });
  const paidAssignmentClose = document.getElementById('paidAssignmentClose');
  if (paidAssignmentClose) paidAssignmentClose.addEventListener('click', closePaidAssignmentReview);
  const paidAssignmentBackdrop = document.getElementById('paidAssignmentBackdrop');
  if (paidAssignmentBackdrop) paidAssignmentBackdrop.addEventListener('click', (e) => { if (e.target === paidAssignmentBackdrop) closePaidAssignmentReview(); });

  // Escape closes whichever modal is open. Five modals shipped without this —
  // only the intro overlay handled Escape — so the only way out of the import,
  // paid assignment, survey review, alias manager or report dialogs was to find
  // and click the ✕. Handled centrally so a new modal gets it for free.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal-backdrop.active')];
    if (!open.length) return;
    // Close only the topmost, so nested cases don't dismiss everything at once.
    open[open.length - 1].classList.remove('active');
  });

  // Back-to-top button wiring
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Report export modal wiring
  const reportModalClose = document.getElementById('reportModalClose');
  if (reportModalClose) reportModalClose.addEventListener('click', closeReportModal);
  const reportModalBackdrop = document.getElementById('reportModalBackdrop');
  if (reportModalBackdrop) reportModalBackdrop.addEventListener('click', e => {
    if (e.target === reportModalBackdrop) closeReportModal();
  });

  const loadedPreloaded = loadPreloadedData();
  applyViewerMode();
  // Restore the file log from the embedded registry so Remove/Replace work after reopening an export
  if (loadedPreloaded) renderFileLog();

  // Footer version stamp — rendered from DASHBOARD_VERSION rather than baked
  // into shell.html, so it can't fall behind the real version again.
  const footer = document.getElementById('app-footer');
  if (footer) {
    const stamp = [
      'PartnerIQ',
      typeof DASHBOARD_VERSION !== 'undefined' ? DASHBOARD_VERSION : '',
      typeof DASHBOARD_VERSION_DATE !== 'undefined' ? DASHBOARD_VERSION_DATE : '',
      'Confidential · Contact Anders for issues or additions',
    ].filter(Boolean).join(' · ');
    footer.textContent = stamp;
  }

  // Inject org logo into header from PARTNER_LOGOS["TrailBlazers"] if available
  const orgLogoImg = document.getElementById('org-logo-img');
  if (orgLogoImg && typeof PARTNER_LOGOS !== 'undefined' && PARTNER_LOGOS['TrailBlazers']) {
    orgLogoImg.src = PARTNER_LOGOS['TrailBlazers'].data;
    orgLogoImg.style.display = '';
  }

  renderApp();
  if (loadedPreloaded) updateBrandDropdown('');

  // Viewer onboarding: show the how-to intro on open (viewer mode only).
  if (typeof maybeShowIntro === 'function') maybeShowIntro();
});
