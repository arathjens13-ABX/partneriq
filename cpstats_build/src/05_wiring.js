// ============================================================
// APP INITIALIZATION & EVENT WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', function() {

  // Theme toggle
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
      if (document.documentElement.dataset.theme === 'light') {
        delete document.documentElement.dataset.theme;
      } else {
        document.documentElement.dataset.theme = 'light';
      }
    });
  }

  // Back-to-top button
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function() {
      backToTop.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Initial render
  renderApp();
});
