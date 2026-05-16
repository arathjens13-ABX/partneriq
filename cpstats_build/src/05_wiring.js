// ============================================================
// SEARCH FILTER — reads searchQuery global, hides non-matching sections.
// Searches section titles, KPI card labels, and table row labels.
// Defined globally so renderApp() can call it after each re-render.
// ============================================================
function applySearchFilter() {
  var q = searchQuery.trim().toLowerCase();
  document.querySelectorAll('.section.collapsible').forEach(function(sec) {
    if (!q) { sec.style.display = ''; return; }
    var titleEl = sec.querySelector('.section-title');
    var title   = titleEl ? titleEl.textContent.toLowerCase() : '';
    var cardLabels = Array.from(sec.querySelectorAll('.home-card-label')).map(function(el) {
      return el.textContent.toLowerCase();
    });
    var tableLabels = Array.from(sec.querySelectorAll('td:first-child')).map(function(el) {
      return el.textContent.toLowerCase();
    });
    var allText = [title].concat(cardLabels).concat(tableLabels).join(' ');
    sec.style.display = allText.includes(q) ? '' : 'none';
  });
}

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

  // Search — delegated on document so it survives renderApp() re-renders
  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'section-search') {
      searchQuery = e.target.value;
      applySearchFilter();
    }
  });

  // Tooltip — delegated on body so it works after any re-render
  document.body.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-note]');
    if (el) showTooltip(e, el.dataset.note);
  });
  document.body.addEventListener('mousemove', function(e) {
    var t = document.getElementById('tooltip');
    if (t && t.classList.contains('visible')) {
      t.style.left = (e.clientX + 14) + 'px';
      t.style.top  = (e.clientY - 8) + 'px';
    }
  });
  document.body.addEventListener('mouseout', function(e) {
    if (e.target.closest('[data-note]')) hideTooltip();
  });

  // Initial render
  renderApp();
});
