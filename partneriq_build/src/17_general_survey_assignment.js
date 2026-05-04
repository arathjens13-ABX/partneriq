// ============================================================
// GENERAL SURVEY ASSIGNMENT REVIEW
// Allows users to manually assign (or override the auto-detected)
// partner for any answer option across all GeneralSurvey_ files.
// Mirrors the pattern established by 07_paid_assignment.js for
// paid social campaign-to-partner assignments.
//
// Rules are stored in DataStore.surveyGeneralAssignmentRules as:
//   { [answerOptionText]: canonicalPartnerName | '' }
// An empty string means "explicitly unassigned / not a partner mention".
// Rules persist in the exported preloaded dashboard.
// ============================================================

function openGeneralSurveyReview() {
  const backdrop = document.getElementById('generalSurveyReviewBackdrop');
  if (!backdrop) return;
  backdrop.classList.add('active');
  renderGeneralSurveyAssignmentUI();
}

function closeGeneralSurveyReview() {
  const backdrop = document.getElementById('generalSurveyReviewBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function renderGeneralSurveyAssignmentUI() {
  const container = document.getElementById('generalSurveyReviewContent');
  if (!container) return;

  const rows = DataStore.surveyGeneral || [];
  if (!rows.length) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:16px 0;">
      No General Survey data loaded. Upload a <code>GeneralSurvey_</code> file first.</p>`;
    return;
  }

  const rules = DataStore.surveyGeneralAssignmentRules || {};

  // Build unique answer options across all questions, with their auto-detected
  // partner and the current rule (if any). Exclude structural non-answers.
  const SKIP_OPTIONS = new Set(['None of these', 'Other (please specify)']);
  const optionMap = new Map(); // answerOption → { question, autoPartner, currentRule, isOther }

  rows.forEach(r => {
    const opt = r.AnswerOption;
    if (!opt || SKIP_OPTIONS.has(opt)) return;
    if (!optionMap.has(opt)) {
      optionMap.set(opt, {
        question:    r.Question,
        autoPartner: autoExtractPartnerFromText(opt),
        currentRule: rules[opt] !== undefined ? rules[opt] : undefined,
        isOther:     opt.startsWith('OTHER:'),
      });
    }
  });

  // Sort: unresolved non-OTHER options first, then OTHER, then matched
  const sorted = [...optionMap.entries()].sort(([, a], [, b]) => {
    const aResolved = a.currentRule !== undefined ? a.currentRule : a.autoPartner;
    const bResolved = b.currentRule !== undefined ? b.currentRule : b.autoPartner;
    const aScore = aResolved ? 2 : a.isOther ? 1 : 0;
    const bScore = bResolved ? 2 : b.isOther ? 1 : 0;
    return aScore - bScore;
  });

  const brandList = DataStore.getBrandList();
  const unmatched = sorted.filter(([, v]) => {
    const resolved = v.currentRule !== undefined ? v.currentRule : v.autoPartner;
    return !resolved && !v.isOther;
  }).length;

  // Group by question for display
  const byQuestion = new Map();
  sorted.forEach(([opt, meta]) => {
    if (!byQuestion.has(meta.question)) byQuestion.set(meta.question, []);
    byQuestion.get(meta.question).push([opt, meta]);
  });

  const questionsHtml = [...byQuestion.entries()].map(([q, opts]) => {
    const rowsHtml = opts.map(([opt, meta]) => {
      const currentAssignment = meta.currentRule !== undefined ? meta.currentRule : (meta.autoPartner || '');
      const isAuto = meta.currentRule === undefined && meta.autoPartner;
      const isExplicit = meta.currentRule !== undefined;
      const statusLabel = isExplicit
        ? (meta.currentRule
            ? `<span style="color:var(--positive);font-size:10px;">✓ assigned</span>`
            : `<span style="color:var(--text-muted);font-size:10px;">✕ excluded</span>`)
        : (isAuto
            ? `<span style="color:var(--text-dim);font-size:10px;">⚡ auto</span>`
            : (meta.isOther
                ? `<span style="color:var(--text-muted);font-size:10px;">— other</span>`
                : `<span style="color:var(--negative);font-size:10px;">? unmatched</span>`));

      return `
        <tr>
          <td style="text-align:left;max-width:240px;word-break:break-word;">${escapeHTML(opt)}</td>
          <td class="num">${statusLabel}</td>
          <td>
            <select class="gsa-rule-select" data-opt="${escapeHTML(opt)}"
              style="width:100%;font-size:12px;background:var(--bg-elev-2);border:1px solid var(--border);
              border-radius:4px;padding:3px 6px;color:var(--text);">
              <option value="">— Not a partner mention —</option>
              ${brandList.map(b => `<option value="${escapeHTML(b)}" ${currentAssignment === b ? 'selected' : ''}>${escapeHTML(b)}</option>`).join('')}
            </select>
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:20px;">
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;
          color:var(--text-muted);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border-soft);">
          ${escapeHTML(q)}
        </div>
        <table class="data-table" style="font-size:12px;">
          <thead><tr>
            <th style="text-align:left;">Answer Option</th>
            <th class="num">Status</th>
            <th style="text-align:left;">Assign to Partner</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <span style="font-size:13px;color:var(--text-dim);">
        ${optionMap.size} answer options · ${unmatched} unmatched
      </span>
      <span class="comparison-basis">Auto-detected assignments are shown with ⚡. Override any by selecting from the dropdown. Set to "Not a partner mention" to explicitly exclude an option.</span>
    </div>
    ${questionsHtml}
    <div style="margin-top:16px;display:flex;gap:10px;">
      <button class="btn btn-primary" id="gsaSaveBtn">Save assignments</button>
      <button class="btn" id="gsaClearBtn">Clear all rules</button>
    </div>`;

  document.getElementById('gsaSaveBtn')?.addEventListener('click', () => {
    const newRules = {};
    container.querySelectorAll('.gsa-rule-select').forEach(sel => {
      const opt = sel.dataset.opt;
      newRules[opt] = sel.value; // '' = explicitly unassigned
    });
    DataStore.surveyGeneralAssignmentRules = newRules;
    applyGeneralSurveyAssignmentRules();
    rebuildBrandRegistryFromData();
    closeGeneralSurveyReview();
    renderApp();
  });

  document.getElementById('gsaClearBtn')?.addEventListener('click', () => {
    if (!confirm('Clear all manual assignment rules? Auto-detection will still apply.')) return;
    DataStore.surveyGeneralAssignmentRules = {};
    applyGeneralSurveyAssignmentRules();
    renderGeneralSurveyAssignmentUI();
    renderApp();
  });
}
