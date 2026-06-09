// WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Always start clean — close modals, so exported preloaded dashboards open on the home page
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  const search = document.getElementById('brandSearch');
  const dropdown = document.getElementById('brandDropdown');
  search.addEventListener('focus', () => updateBrandDropdown(search.value));
  // Debounce input so the dropdown filter/render work doesn't block keystroke painting.
  let brandSearchDebounce = null;
  search.addEventListener('input', () => {
    if (brandSearchDebounce) clearTimeout(brandSearchDebounce);
    brandSearchDebounce = setTimeout(() => updateBrandDropdown(search.value), 120);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.brand-selector-wrapper')) dropdown.classList.remove('active');
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

  // Inject org logo into header from PARTNER_LOGOS["TrailBlazers"] if available
  const orgLogoImg = document.getElementById('org-logo-img');
  if (orgLogoImg && typeof PARTNER_LOGOS !== 'undefined' && PARTNER_LOGOS['TrailBlazers']) {
    orgLogoImg.src = PARTNER_LOGOS['TrailBlazers'].data;
    orgLogoImg.style.display = '';
  }

  renderApp();
  if (loadedPreloaded) updateBrandDropdown('');
});
