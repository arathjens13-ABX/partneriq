// WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Always start clean — close modals, so exported preloaded dashboards open on the home page
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  const search = document.getElementById('brandSearch');
  const dropdown = document.getElementById('brandDropdown');
  search.addEventListener('focus', () => updateBrandDropdown(search.value));
  search.addEventListener('input', () => updateBrandDropdown(search.value));
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
  const homeNavBtn2 = document.getElementById('homeNavBtn');
  if (homeNavBtn2) homeNavBtn2.addEventListener('click', goHome);


  document.getElementById('dataBtn').addEventListener('click', () => { if (!VIEWER_MODE) modal.classList.add('active'); });
  document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  document.getElementById('loadMockBtn').addEventListener('click', () => {
    generateMockData();
    modal.classList.remove('active');
    document.getElementById('fileList').innerHTML = '';
    renderApp();
    updateBrandDropdown('');
  });

  document.getElementById('clearDataBtn').addEventListener('click', () => {
    DataStore.reset();
    currentBrand = null;
    currentPage = 'home';
    currentPeriod = null;
    document.getElementById('brandSearch').value = '';
    document.getElementById('fileList').innerHTML = '';
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

  // Inject org logo into header from PARTNER_LOGOS["TrailBlazers"] if available
  const orgLogoImg = document.getElementById('org-logo-img');
  if (orgLogoImg && typeof PARTNER_LOGOS !== 'undefined' && PARTNER_LOGOS['TrailBlazers']) {
    orgLogoImg.src = PARTNER_LOGOS['TrailBlazers'].data;
    orgLogoImg.style.display = '';
  }

  renderApp();
  if (loadedPreloaded) updateBrandDropdown('');
});
