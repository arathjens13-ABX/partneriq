// ============================================================
// NUMBER FORMATTING
// ============================================================
function formatNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 10000) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}

function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 10000) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return '$' + n.toLocaleString('en-US');
}

// ============================================================
// YOY DELTA
// opts.pp   = true  → show absolute percentage-point change (e.g. "+3pp")
//                     use for metrics already expressed as percentages
// default         → relative % change (e.g. "+8.5%")
// ============================================================
function yoyDelta(curr, prior, opts) {
  if (!prior) return null;
  if (curr === null || curr === undefined) return null;
  opts = opts || {};
  var diff = curr - prior;
  if (opts.pp) {
    var diffRounded = Math.round(diff * 10) / 10;
    return {
      label: (diffRounded >= 0 ? '+' : '') + diffRounded + 'pp',
      dir: diffRounded > 0.5 ? 'positive' : diffRounded < -0.5 ? 'negative' : 'neutral',
    };
  }
  var pct = (diff / prior) * 100;
  var pctRounded = Math.round(pct * 10) / 10;
  return {
    label: (pctRounded >= 0 ? '+' : '') + pctRounded + '%',
    dir: pctRounded > 0.5 ? 'positive' : pctRounded < -0.5 ? 'negative' : 'neutral',
  };
}

// ============================================================
// TOOLTIP
// ============================================================
function showTooltip(e, text) {
  var t = document.getElementById('tooltip');
  if (!t) return;
  t.innerHTML = text;
  t.style.left = (e.clientX + 14) + 'px';
  t.style.top  = (e.clientY - 8) + 'px';
  t.classList.add('visible');
}

function hideTooltip() {
  var t = document.getElementById('tooltip');
  if (t) t.classList.remove('visible');
}

// ============================================================
// ERROR TOAST
// ============================================================
function showErrorToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-elev-3);border:1px solid var(--border);color:var(--text);padding:10px 18px;border-radius:6px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 4000);
}
