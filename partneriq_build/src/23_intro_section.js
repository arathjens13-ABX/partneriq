// ============================================================
// HOW-TO-USE INTRO — viewer onboarding overlay
// ============================================================
// A first-open walkthrough for people who *read* an exported dashboard
// (viewer mode) rather than load data into it. Replaces the old behavior
// where the Import/Export modal flashed on open. Gated on VIEWER_MODE so
// the builder working file never shows it. Built entirely in JS and mounted
// into #introRoot; the live dashboard sits behind a dimming backdrop.
//
// No localStorage (forbidden), so there is no way to remember that a viewer has
// already seen this across loads. A "Don't show again" checkbox used to sit in
// the rail, but it could never work — maybeShowIntro() reads its flag once at
// DOMContentLoaded, strictly before the overlay is on screen and therefore
// before the box can be ticked. It was removed rather than left as a control
// that silently did nothing. The intro is skippable (Skip, Esc, or the
// backdrop) and reopenable from the "?" button, which is the honest contract.

let _introStep = 0;
let _introTimers = [];

const INTRO_STEPS = [
  {
    kicker: 'Welcome',
    title: 'Meet PartnerIQ',
    body: `Every partner's performance in one place — TV signage, paid & organic social, surveys and more, valued and ranked across every season. This quick tour shows you how to get around in under a minute.`,
    scene: 'welcome',
  },
  {
    kicker: 'Step 1 · Find',
    title: 'Look up any partner',
    body: `Type a name in the header search to jump straight to a partner. It isn't limited to contracted partners — flip off "Partners only" to search a prospect or a competitor too, so you can size up anyone.`,
    scene: 'search',
  },
  {
    kicker: 'Step 2 · Explore',
    title: 'Find the sections on a page',
    body: `Each partner page stacks its channels as sections — TV Visible Signage, Paid Social, Organic Social, Survey and more. Click a section header to expand it and reveal its charts and tables.`,
    scene: 'sections',
  },
  {
    kicker: 'Step 3 · Dig in',
    title: 'Sort columns & pick a date range',
    body: `Click any column header to sort a table high-to-low or back again. Use the date-range picker to narrow a section to a season or window — the numbers update to match.`,
    scene: 'sortfilter',
  },
  {
    kicker: 'Step 4 · Get around',
    title: 'Go back & move between views',
    body: `The breadcrumb and Back button return you to where you came from, and the Home button jumps to the portfolio overview at any time. Nothing's ever more than a click from where you are.`,
    scene: 'nav',
  },
];

// ---- Small SVG helpers (prefixed to avoid global clashes) ----
function _pqiIcon(paths, w) { return `<svg width="${w||17}" height="${w||17}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`; }
function _pqiSearch() { return _pqiIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'); }
function _pqiTV() { return _pqiIcon('<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>'); }
function _pqiPaid() { return _pqiIcon('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'); }
function _pqiOrganic() { return _pqiIcon('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'); }
function _pqiSurvey() { return _pqiIcon('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'); }
function _pqiHome() { return _pqiIcon('<path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/><path d="M21 22H3"/>', 13); }
function _pqiChevron() { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:6px;vertical-align:-1px"><polyline points="6 9 12 15 18 9"/></svg>`; }

// Trail Blazers org logo (from the embedded PARTNER_LOGOS), sized for the intro.
// Falls back to a "PIQ" wordmark plate if the logo isn't present.
function _pqiOrgLogo(size) {
  const px = size || 26;
  try {
    if (typeof PARTNER_LOGOS !== 'undefined' && PARTNER_LOGOS['TrailBlazers'] && PARTNER_LOGOS['TrailBlazers'].data) {
      return `<img class="pqi-orglogo" src="${PARTNER_LOGOS['TrailBlazers'].data}" alt="Portland Trail Blazers" style="width:${px}px;height:${px}px;object-fit:contain;flex:none;">`;
    }
  } catch (e) {}
  return `<span class="pqi-brandmark" style="width:${px}px;height:${px}px;font-size:${Math.round(px*0.42)}px;">PIQ</span>`;
}

// ============================================================
// Overlay construction
// ============================================================
function buildIntroOverlay() {
  const root = document.getElementById('introRoot');
  if (!root) return null;
  root.innerHTML = `
    <div class="pqi-backdrop" id="pqiBackdrop"></div>
    <div class="pqi-overlay" id="pqiOverlay" role="dialog" aria-modal="true" aria-label="How to use PartnerIQ">
      <div class="pqi-card">
        <button class="pqi-skip" id="pqiSkip" type="button">Skip</button>
        <div class="pqi-rail">
          <div class="pqi-brandline">${_pqiOrgLogo(28)}<span class="pqi-brandname">PartnerIQ</span></div>
          <div class="pqi-eyebrow">How to use · ${INTRO_STEPS.length} steps</div>
          <ul class="pqi-steps" id="pqiSteps"><span class="pqi-spine"><i id="pqiSpine"></i></span></ul>
          <div class="pqi-railfoot">
            <span class="pqi-railhint">Esc to close · reopen any time with <b>?</b></span>
          </div>
        </div>
        <div class="pqi-right">
          <div class="pqi-stage" id="pqiStage"></div>
          <div class="pqi-copy">
            <div class="pqi-copy-inner" id="pqiCopyInner">
              <div class="pqi-kicker" id="pqiKicker"></div>
              <h2 class="pqi-title" id="pqiTitle"></h2>
              <p class="pqi-body" id="pqiBody"></p>
            </div>
          </div>
          <div class="pqi-controls">
            <div class="pqi-dots" id="pqiDots"></div>
            <button class="pqi-btn pqi-ghost" id="pqiBack" type="button">Back</button>
            <button class="pqi-btn pqi-primary" id="pqiNext" type="button">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const stepList = document.getElementById('pqiSteps');
  const dots = document.getElementById('pqiDots');
  const labels = ['Welcome', 'Find a partner', 'Find the sections', 'Sort & date range', 'Go back & around'];
  INTRO_STEPS.forEach((s, idx) => {
    const li = document.createElement('li');
    li.className = 'pqi-step'; li.dataset.idx = idx;
    li.innerHTML = `<span class="pqi-num">${idx + 1}</span><span class="pqi-lab">${labels[idx]}</span>`;
    li.addEventListener('click', () => introGo(idx));
    stepList.appendChild(li);
    const d = document.createElement('span');
    d.className = 'pqi-dot'; d.dataset.idx = idx;
    d.addEventListener('click', () => introGo(idx));
    dots.appendChild(d);
  });

  document.getElementById('pqiNext').addEventListener('click', () => {
    if (_introStep === INTRO_STEPS.length - 1) hideIntro(); else introGo(_introStep + 1);
  });
  document.getElementById('pqiBack').addEventListener('click', () => introGo(_introStep - 1));
  document.getElementById('pqiSkip').addEventListener('click', hideIntro);
  document.getElementById('pqiBackdrop').addEventListener('click', hideIntro);
  document.addEventListener('keydown', _introKeyHandler);
  return root;
}

function _introKeyHandler(e) {
  const ov = document.getElementById('pqiOverlay');
  if (!ov || ov.classList.contains('pqi-hidden')) return;
  if (e.key === 'ArrowRight' && _introStep < INTRO_STEPS.length - 1) introGo(_introStep + 1);
  else if (e.key === 'ArrowLeft' && _introStep > 0) introGo(_introStep - 1);
  else if (e.key === 'Escape') hideIntro();
}

// ============================================================
// Scenes
// ============================================================
function _introBuildScene(kind) {
  const el = document.createElement('div');
  el.className = 'pqi-scene'; el.dataset.kind = kind;
  if (kind === 'welcome') {
    el.innerHTML = `<span class="pqi-ring"></span><span class="pqi-ring two"></span>
      <div class="pqi-hero-mark">${_pqiOrgLogo(72)}</div>
      <div class="pqi-chips">
        <span class="pqi-chip">TV Signage</span><span class="pqi-chip">Paid Social</span>
        <span class="pqi-chip">Organic</span><span class="pqi-chip">Survey</span><span class="pqi-chip">Web &amp; Digital</span>
      </div>`;
  } else if (kind === 'search') {
    el.innerHTML = `<div class="pqi-mini">
        <div class="pqi-searchbox">${_pqiSearch()}<span class="pqi-typed" id="pqiTyped"></span><span class="pqi-caret"></span></div>
        <div class="pqi-results" id="pqiResults"></div>
      </div>`;
  } else if (kind === 'sections') {
    el.innerHTML = `<div class="pqi-mini pqi-acc" id="pqiAcc">
        <div class="pqi-mini-head">A partner page — stacked by section</div>
        ${_introSecRow('TV Visible Signage', _pqiTV())}
        ${_introSecRow('Paid Social', _pqiPaid())}
        ${_introSecRow('Organic Social', _pqiOrganic())}
        ${_introSecRow('Survey Research', _pqiSurvey())}
      </div>`;
  } else if (kind === 'sortfilter') {
    el.innerHTML = `<div class="pqi-mini">
        <div class="pqi-datebar"><span class="pqi-date-lbl">Date range</span>
          <span class="pqi-date-pick" id="pqiDatePick">2025–26 Season${_pqiChevron()}</span></div>
        <table class="pqi-lb"><thead><tr>
          <th>Partner</th><th class="pqi-lb-sort" id="pqiSortHead">QIMV <span class="pqi-arw" id="pqiArw">▾</span></th>
        </tr></thead><tbody id="pqiLbBody"></tbody></table>
      </div>`;
  } else if (kind === 'nav') {
    el.innerHTML = `<div class="pqi-mini pqi-navscene">
        <div class="pqi-crumb">
          <span class="pqi-cr" data-c="home">${_pqiHome()} Home</span><span class="pqi-cr-sep">/</span>
          <span class="pqi-cr" data-c="tv">TV Portfolio</span><span class="pqi-cr-sep">/</span>
          <span class="pqi-cr pqi-cur" data-c="brand">Alaska Airlines</span>
        </div>
        <div class="pqi-navbtns">
          <span class="pqi-nbtn" id="pqiBackDemo">← Back</span>
          <span class="pqi-nbtn" id="pqiHomeDemo">${_pqiHome()} Home</span>
        </div>
        <div class="pqi-navhint" id="pqiNavHint">Back returns you one step</div>
      </div>`;
  }
  return el;
}
function _introSecRow(t, ic) {
  return `<div class="pqi-acc-row"><div class="pqi-acc-h"><span class="pqi-acc-ic">${ic}</span>
    <span class="pqi-acc-t">${t}</span><span class="pqi-acc-cv">▸</span></div>
    <div class="pqi-acc-b"><span class="pqi-bar"></span><span class="pqi-bar w2"></span><span class="pqi-bar w3"></span></div></div>`;
}

function _introT(fn, ms) { const id = setTimeout(fn, ms); _introTimers.push(id); return id; }
function _introClearTimers() { _introTimers.forEach(clearTimeout); _introTimers = []; }

function _introRunScene(kind, el) {
  if (kind === 'search') {
    const word = 'Columbia', typed = el.querySelector('#pqiTyped'), results = el.querySelector('#pqiResults');
    const partners = [
      { n: 'Columbia Bank', hi: true, tag: 'Partner' },
      { n: 'Columbia Sportswear', hi: false, tag: 'Not partner' },
    ];
    let k = 0;
    (function type() {
      if (k <= word.length) { typed.textContent = word.slice(0, k); k++; _introT(type, 92); }
      else {
        partners.forEach((p, idx) => {
          const r = document.createElement('div');
          r.className = 'pqi-res' + (p.hi ? ' hi' : '');
          r.style.animationDelay = (idx * 120) + 'ms';
          const pill = `<span class="partner-pill ${p.hi ? 'is-partner' : 'is-prospect'}">${p.tag}</span>`;
          r.innerHTML = `<span class="pqi-ava">${p.n[0]}</span><span class="pqi-nm">${p.n}</span>${pill}`;
          results.appendChild(r);
        });
      }
    })();
  } else if (kind === 'sections') {
    const rows = el.querySelectorAll('.pqi-acc-row'); let j = 0;
    (function open() {
      rows.forEach(c => c.classList.remove('open'));
      rows[j].classList.add('open');
      j = (j + 1) % rows.length;
      _introT(open, 1300);
    })();
  } else if (kind === 'sortfilter') {
    const body = el.querySelector('#pqiLbBody'), arw = el.querySelector('#pqiArw'), datePick = el.querySelector('#pqiDatePick');
    const data = [
      { n: 'Alaska Airlines', v: 1.24 }, { n: 'Fred Meyer', v: 0.98 },
      { n: 'Toyota', v: 0.86 }, { n: 'Michelob Ultra', v: 0.62 }, { n: 'Les Schwab', v: 0.41 },
    ];
    let desc = true;
    const paint = () => {
      const sorted = data.slice().sort((a, b) => desc ? b.v - a.v : a.v - b.v);
      body.innerHTML = sorted.map(d => `<tr><td>${d.n}</td><td class="pqi-lb-val">$${d.v.toFixed(2)}M</td></tr>`).join('');
    };
    paint();
    const dates = ['2025–26 Season', '2024–25 Season', 'Last 90 days']; let di = 0;
    (function cycle() {
      desc = !desc; arw.textContent = desc ? '▾' : '▴';
      el.querySelector('#pqiSortHead').classList.add('flash');
      _introT(() => el.querySelector('#pqiSortHead').classList.remove('flash'), 500);
      paint();
      di = (di + 1) % dates.length;
      datePick.innerHTML = dates[di] + _pqiChevron();
      datePick.classList.add('flash'); _introT(() => datePick.classList.remove('flash'), 500);
      _introT(cycle, 1900);
    })();
  } else if (kind === 'nav') {
    const crumbs = el.querySelectorAll('.pqi-cr'), hint = el.querySelector('#pqiNavHint');
    const back = el.querySelector('#pqiBackDemo'), home = el.querySelector('#pqiHomeDemo');
    const seq = [
      { active: 'brand', btn: back, hint: 'Back returns you one step' },
      { active: 'tv', btn: back, hint: '…back again to the portfolio' },
      { active: 'home', btn: home, hint: 'Home jumps to the overview anytime' },
    ];
    let s = 0;
    (function step() {
      const cur = seq[s];
      crumbs.forEach(c => c.classList.toggle('pqi-cur', c.dataset.c === cur.active));
      back.classList.remove('press'); home.classList.remove('press');
      cur.btn.classList.add('press');
      hint.textContent = cur.hint;
      s = (s + 1) % seq.length;
      _introT(step, 1500);
    })();
  }
}

// ============================================================
// Navigation between steps
// ============================================================
function introGo(n) {
  n = Math.max(0, Math.min(INTRO_STEPS.length - 1, n));
  const stage = document.getElementById('pqiStage');
  if (!stage) return;
  const prev = stage.querySelector('.pqi-scene.show');
  if (prev) prev.classList.remove('show');
  _introClearTimers();
  _introStep = n;
  const s = INTRO_STEPS[n];

  document.getElementById('pqiKicker').textContent = s.kicker;
  document.getElementById('pqiTitle').textContent = s.title;
  document.getElementById('pqiBody').textContent = s.body;
  const ci = document.getElementById('pqiCopyInner');
  ci.style.animation = 'none'; void ci.offsetWidth; ci.style.animation = '';

  const old = stage.querySelector('.pqi-scene'); if (old) old.remove();
  const el = _introBuildScene(s.scene); stage.appendChild(el);
  requestAnimationFrame(() => { el.classList.add('show'); _introT(() => _introRunScene(s.scene, el), 220); });

  document.querySelectorAll('.pqi-step').forEach(st => {
    const idx = +st.dataset.idx;
    st.classList.toggle('active', idx === n);
    st.classList.toggle('done', idx < n);
    st.querySelector('.pqi-num').textContent = idx < n ? '✓' : (idx + 1);
  });
  document.querySelectorAll('.pqi-dot').forEach(d => {
    const idx = +d.dataset.idx;
    d.classList.toggle('active', idx === n);
    d.classList.toggle('done', idx < n);
  });
  const spine = document.getElementById('pqiSpine');
  if (spine) spine.style.height = (INTRO_STEPS.length < 2 ? 0 : (n / (INTRO_STEPS.length - 1)) * 100) + '%';

  document.getElementById('pqiBack').hidden = (n === 0);
  document.getElementById('pqiNext').textContent = (n === INTRO_STEPS.length - 1) ? 'Get started →' : 'Next →';
}

// ============================================================
// Show / hide / relaunch
// ============================================================
function showIntro() {
  if (!buildIntroOverlay()) return;
  document.body.classList.add('pqi-open');
  introGo(0);
  // The real intro has taken over — drop the instant pre-boot cover.
  document.documentElement.classList.remove('pqi-preboot');
}

function hideIntro() {
  const ov = document.getElementById('pqiOverlay');
  const bd = document.getElementById('pqiBackdrop');
  if (ov) ov.classList.add('pqi-closing');
  if (bd) bd.classList.add('pqi-closing');
  _introClearTimers();
  document.removeEventListener('keydown', _introKeyHandler);
  setTimeout(() => {
    const root = document.getElementById('introRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('pqi-open');
  }, 400);
}

// Auto-shows on load in viewer mode, unless suppressed this session. The
// "How to use" header button (viewer-only) reopens it any time.
function maybeShowIntro() {
  // The floating "?" relaunch button lives bottom-right in viewer mode; the
  // body class lifts the back-to-top button above it so they never overlap.
  const fab = document.getElementById('introHelpFab');
  if (fab) fab.style.display = VIEWER_MODE ? '' : 'none';
  document.body.classList.toggle('pqi-viewer', !!VIEWER_MODE);
  if (!VIEWER_MODE) {
    document.documentElement.classList.remove('pqi-preboot'); // reveal the dashboard
    return;
  }
  showIntro();
}
