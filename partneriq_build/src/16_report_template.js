
// ============================================================
// PARTNER REPORT — PDF-ready single-page export
// ============================================================
// generatePartnerReport(brand) → HTML string
// Called by openPartnerReport(brand) which opens a new window.
// Layout: dark background with Blazers logo mark watermark,
// top-line KPI strip, channel cards, survey recall bars.
// Print CSS handles PDF output via Cmd+P / Ctrl+P.
// ============================================================

const REPORT_BG_B64 = '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';

// ── Logo configuration ─────────────────────────────────────
// Set REPORT_ORG_LOGO to swap the placeholder "TB" circle with a real logo.
//
// Option A — PNG/JPG (base64 string from Cell 7 in build.ipynb):
//   const REPORT_ORG_LOGO = 'data:image/png;base64,YOUR_BASE64_HERE';
//   const REPORT_ORG_LOGO_TYPE = 'img';
//
// Option B — Inline SVG:
//   const REPORT_ORG_LOGO = '<svg xmlns="..." viewBox="0 0 100 100">...</svg>';
//   const REPORT_ORG_LOGO_TYPE = 'svg';
//
// Option C — Keep placeholder (default):
const REPORT_ORG_LOGO      = null;   // ← replace with base64 string or SVG string
const REPORT_ORG_LOGO_TYPE = 'img';  // 'img' or 'svg'

// Helper: renders either a real logo or the "TB" placeholder circle
function renderOrgLogo(size = 52) {
  if (!REPORT_ORG_LOGO) {
    // Placeholder — red circle with TB initials
    return `<div style="width:${size}px;height:${size}px;background:var(--brand-red, #C8102E);
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:${Math.round(size*0.31)}px;
      letter-spacing:-0.05em;color:#fff;flex-shrink:0;">TB</div>`;
  }
  if (REPORT_ORG_LOGO_TYPE === 'svg') {
    return `<div style="width:${size}px;height:${size}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
      ${REPORT_ORG_LOGO}
    </div>`;
  }
  // PNG / JPG image
  return `<img src="${REPORT_ORG_LOGO}" width="${size}" height="${size}"
    style="border-radius:50%;object-fit:contain;flex-shrink:0;"
    alt="Portland Trail Blazers" />`;
}
// Helper: renders a partner logo (from logos/ folder or DataStore override)
// Three-tier fallback:
//   1. DataStore.partnerLogos[brand]  (future logo manager UI override)
//   2. PARTNER_LOGOS[brand]           (logos/ folder, baked in at build time)
//   3. Text fallback                  (partner name, always works)
function renderPartnerLogo(brand, size = 36) {
  // Tier 1: DataStore runtime override (logo manager UI — future feature)
  const dsLogo = (DataStore.partnerLogos || {})[brand];
  if (dsLogo) {
    return dsLogo.type === 'svg'
      ? `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${dsLogo.data}</div>`
      : `<img src="${dsLogo.data}" width="${size}" height="${size}" style="object-fit:contain;flex-shrink:0;" alt="${brand}"/>`;
  }

  // Tier 2: PARTNER_LOGOS from logos/ folder (baked in at build time)
  if (typeof PARTNER_LOGOS !== 'undefined' && PARTNER_LOGOS[brand]) {
    const logo = PARTNER_LOGOS[brand];
    return logo.type === 'svg'
      ? `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${logo.data}</div>`
      : `<img src="${logo.data}" width="${size}" height="${size}" style="object-fit:contain;flex-shrink:0;" alt="${brand}"/>`;
  }

  // Tier 3: Text fallback — partner name styled as a compact badge
  const initials = brand.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `<div style="width:${size}px;height:${size}px;background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.12);border-radius:4px;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    font-family:'Barlow Condensed',sans-serif;font-weight:700;
    font-size:${Math.max(9, Math.round(size * 0.32))}px;
    letter-spacing:0.04em;color:rgba(255,255,255,0.6);">${initials}</div>`;
}




// ── Data gathering ─────────────────────────────────────────
function gatherReportData(brand) {
  const channels = DataStore.channelsByBrand[brand] || {};

  // TV
  const tvSeasons = [...new Set((getBrandTVData(brand)||[]).map(r => r.Season).filter(Boolean))].sort();
  const latestTVSeason = tvSeasons[tvSeasons.length - 1] || null;
  const tvRows = latestTVSeason ? getBrandTVData(brand, latestTVSeason) : [];
  const tvYoY  = latestTVSeason ? getYoYRowSets(brand, latestTVSeason) : null;

  const tvQimv    = sum(tvRows, 'QI Media Value ($)');
  const tvImpr    = sum(tvRows, 'Sponsorship QI Impressions');
  const tvQimvPrior = tvYoY ? sum(tvYoY.priorRows, 'QI Media Value ($)') : null;
  const tvYoyPct  = (tvQimvPrior && tvQimvPrior > 0) ? pctChange(tvQimv, tvQimvPrior) : null;
  const tvSoV     = tvRows.length ? (sum(tvRows,'Share of Voice (%)') / tvRows.length).toFixed(1) : null;
  const tvMatches = [...new Set(tvRows.map(r => r.Matchdate).filter(Boolean))].length;

  // Assets — top 4 by QIMV
  const assetMap = {};
  tvRows.forEach(r => {
    const loc = r.Location || r.Tool || 'Unknown';
    if (!assetMap[loc]) assetMap[loc] = { name: loc, impressions: 0, qimv: 0, duration: 0 };
    assetMap[loc].impressions += Number(r['Sponsorship QI Impressions']) || 0;
    assetMap[loc].qimv        += Number(r['QI Media Value ($)'])      || 0;
    assetMap[loc].duration    += Number(r['Duration (Minutes)'])      || 0;
  });
  const topAssets = Object.values(assetMap)
    .sort((a, b) => b.qimv - a.qimv)
    .slice(0, 4)
    .map(a => ({
      ...a,
      qimvPerMin: a.duration > 0 ? a.qimv / a.duration : 0,
    }));

  // Organic (Zoomph)
  const zRows   = getBrandZoomphPerf(brand);
  const zLatest = zRows.length ? zRows[zRows.length - 1] : null;
  const zPostsYoY = getZoomphYoY(brand, 'OrganicPosts');
  const zImprYoY  = getZoomphYoY(brand, 'ViewsImpressions');
  const zValYoY   = getZoomphYoY(brand, 'BrandValue');

  // Paid
  const paidSeasons = getPaidSeasons(brand);
  const latestPaidSeason = paidSeasons[paidSeasons.length - 1] || null;
  const paidRows = latestPaidSeason ? getBrandPaidData(brand, latestPaidSeason) : [];
  const paidAgg  = paidRows.length ? paidAggregate(paidRows) : null;

  // Survey — latest Early and Late waves
  const surveyEarly = getSurveyLatestWave(brand, 'Early');
  const surveyLate  = getSurveyLatestWave(brand, 'Late');
  const surveyWave  = surveyLate || surveyEarly;
  const totalInWave = surveyWave
    ? (DataStore.surveys || []).filter(r => r.Survey === surveyWave.Survey).length
    : 0;

  return {
    brand, channels,
    tv: { season: latestTVSeason, qimv: tvQimv, impressions: tvImpr,
          yoyPct: tvYoyPct, soV: tvSoV, matches: tvMatches, topAssets },
    organic: { latest: zLatest, postsYoY: zPostsYoY, imprYoY: zImprYoY, valYoY: zValYoY },
    paid: { season: latestPaidSeason, agg: paidAgg },
    survey: { wave: surveyWave, early: surveyEarly, late: surveyLate, totalInWave },
  };
}

// ── Helpers ────────────────────────────────────────────────
function reportDelta(pct, invert = false) {
  if (pct === null || pct === undefined) return '';
  const up = invert ? pct < 0 : pct >= 0;
  const cls = up ? 'delta-up' : 'delta-down';
  const arrow = up ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${Math.abs(pct * 100).toFixed(0)}% YoY</span>`;
}

function surveyBar(pct, rank, label, total) {
  if (pct === null) return '';
  const pctVal = Math.round(pct * 100);
  const rankStr = rank ? `#${rank}${total ? ' of ' + total : ''}` : '';
  return `
    <div class="r-survey-row">
      <span class="r-survey-label">${label}</span>
      <div class="r-survey-track"><div class="r-survey-fill" style="width:${pctVal}%"></div></div>
      <span class="r-survey-pct">${pctVal}%</span>
      <span class="r-survey-rank">${rankStr}</span>
    </div>`;
}

// ── Main render ────────────────────────────────────────────
function generatePartnerReport(brand) {
  const d   = gatherReportData(brand);
  const now = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Top-line KPIs — pick the 4 most meaningful for this partner
  const topKpis = [];
  if (d.tv.qimv > 0) topKpis.push({
    label: 'QI Media Value',
    value: formatCurrency(d.tv.qimv),
    delta: reportDelta(d.tv.yoyPct),
    sub:   d.tv.season || '',
  });
  if (d.tv.impressions > 0) topKpis.push({
    label: 'QI Impressions',
    value: formatNum(d.tv.impressions),
    delta: '',
    sub:   `${d.tv.matches} games`,
  });
  if (d.organic.latest?.ViewsImpressions) topKpis.push({
    label: 'Social Impressions',
    value: formatNum(d.organic.latest.ViewsImpressions),
    delta: reportDelta(d.organic.imprYoY?.change),
    sub:   d.organic.latest._reportMonth || '',
  });
  if (d.survey.wave?.UnaidedPct !== null && d.survey.wave?.UnaidedPct !== undefined) topKpis.push({
    label: 'Unaided Brand Recall',
    value: Math.round(d.survey.wave.UnaidedPct * 100) + '%',
    delta: '',
    sub: `#${d.survey.wave.UnaidedRecallRank || '—'} of ${d.survey.totalInWave}`,
  });
  // Pad to 4 with paid if needed
  if (topKpis.length < 4 && d.paid.agg) topKpis.push({
    label: 'Paid Impressions',
    value: formatNum(d.paid.agg.impressions),
    delta: '',
    sub: d.paid.season || '',
  });
  // Ensure exactly 4
  while (topKpis.length < 4) topKpis.push({ label: '—', value: '—', delta: '', sub: '' });
  const kpisHTML = topKpis.slice(0, 4).map(k => `
    <div class="r-kpi">
      <div class="r-kpi-label">${k.label}</div>
      <div class="r-kpi-value">${k.value}</div>
      ${k.delta ? `<div class="r-kpi-delta">${k.delta}</div>` : ''}
      ${k.sub   ? `<div class="r-kpi-sub">${k.sub}</div>` : ''}
    </div>`).join('');

  // TV assets table
  const tvTable = d.tv.topAssets.length ? `
    <table class="r-table">
      <thead><tr>
        <th>Asset</th>
        <th class="r-num">Impressions</th>
        <th class="r-num">QI MV</th>
        <th class="r-num">QIMV/min</th>
      </tr></thead>
      <tbody>
        ${d.tv.topAssets.map(a => `<tr>
          <td>${a.name}</td>
          <td class="r-num">${formatNum(a.impressions)}</td>
          <td class="r-num r-accent">${formatCurrency(a.qimv)}</td>
          <td class="r-num">${formatCurrency(a.qimvPerMin)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="r-totals-row">
      <span>Total QI Media Value</span>
      <span class="r-accent">${formatCurrency(d.tv.qimv)}</span>
    </div>
    ${d.tv.soV ? `<div class="r-totals-row"><span>Avg Share of Voice</span><span>${d.tv.soV}%</span></div>` : ''}
  ` : `<div class="r-empty">No TV signage data loaded for ${d.tv.season || 'this season'}.</div>`;

  // Organic card body
  const organicBody = d.organic.latest ? `
    <div class="r-metric-row"><span>Views / Impressions</span>
      <span>${formatNum(d.organic.latest.ViewsImpressions)} ${reportDelta(d.organic.imprYoY?.change)}</span></div>
    <div class="r-metric-row"><span>Engagements</span>
      <span>${formatNum(d.organic.latest.Engagements)}</span></div>
    <div class="r-metric-row"><span>Engagement Rate</span>
      <span>${d.organic.latest.EngagementRate !== null ? formatPct(d.organic.latest.EngagementRate,2) : '—'}</span></div>
    <div class="r-metric-row"><span>Organic Posts</span>
      <span>${formatNum(d.organic.latest.OrganicPosts)}</span></div>
    <div class="r-metric-row r-accent-row"><span>Brand Exposure Value</span>
      <span class="r-accent">${formatCurrency(d.organic.latest.BrandValue)} ${reportDelta(d.organic.valYoY?.change)}</span></div>
  ` : `<div class="r-empty">No organic social data loaded.</div>`;

  // Survey card body
  const surveyBody = d.survey.wave ? `
    ${surveyBar(d.survey.wave.UnaidedPct, d.survey.wave.UnaidedRecallRank, 'Unaided Recall', d.survey.totalInWave)}
    ${surveyBar(d.survey.wave.AidedPct,   d.survey.wave.AidedRecallRank,   'Aided Recall',   d.survey.totalInWave)}
    ${d.survey.wave.LocalHQPct !== null
      ? surveyBar(d.survey.wave.LocalHQPct, d.survey.wave.LocalHQRecallRank, 'Local HQ Recall', d.survey.totalInWave)
      : ''}
    <div class="r-survey-meta">${d.survey.wave.Survey} · ${d.survey.wave.TotalSurveyResponses || '—'} respondents</div>
  ` : `<div class="r-empty">No survey data loaded.</div>`;

  // Paid card (optional — only shown if data exists)
  const paidCard = (d.paid.agg && d.channels.paid) ? `
    <div class="r-card r-card-full">
      <div class="r-card-header">
        <span class="r-card-icon">💰</span>
        <span class="r-card-title">Paid Social</span>
        <span class="r-card-badge">${d.paid.season || ''}</span>
      </div>
      <div class="r-card-body r-paid-grid">
        <div class="r-paid-kpi"><div class="r-paid-label">Impressions</div><div class="r-paid-val">${formatNum(d.paid.agg.impressions)}</div></div>
        <div class="r-paid-kpi"><div class="r-paid-label">Reach</div><div class="r-paid-val">${formatNum(d.paid.agg.reach)}</div></div>
        <div class="r-paid-kpi"><div class="r-paid-label">Link Clicks</div><div class="r-paid-val">${formatNum(d.paid.agg.clicks)}</div></div>
        <div class="r-paid-kpi"><div class="r-paid-label">CTR</div><div class="r-paid-val">${formatPct(d.paid.agg.ctr, 2)}</div></div>
        <div class="r-paid-kpi"><div class="r-paid-label">Campaigns</div><div class="r-paid-val">${formatNum(d.paid.agg.campaignCount)}</div></div>
        <div class="r-paid-kpi"><div class="r-paid-label">Results</div><div class="r-paid-val">${formatNum(d.paid.agg.results)}</div></div>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>PartnerIQ · ${brand} · Partnership Report</title>
<style>
:root {
  --red:#C8102E; --black:#0a0a0a; --surface:rgba(255,255,255,0.05);
  --border:rgba(255,255,255,0.10); --border-red:rgba(200,16,46,0.4);
  --text:#FFF; --dim:rgba(255,255,255,0.55); --muted:rgba(255,255,255,0.30);
  --fd:'Arial Narrow','Helvetica Neue',Arial,sans-serif; --fb:'Helvetica Neue',Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{font-size:10px;}
body{font-family:var(--fb);background:var(--black);color:var(--text);-webkit-font-smoothing:antialiased;}

.r-page{width:1100px;min-height:820px;margin:40px auto;position:relative;overflow:hidden;
  background:var(--black);box-shadow:0 40px 120px rgba(0,0,0,0.8);}
.r-bg{position:absolute;inset:0;
  background-image:url('data:image/png;base64,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');
  background-size:70%;background-position:right center;background-repeat:no-repeat;
  opacity:0.15;pointer-events:none;z-index:0;}
.r-bg::after{content:'';position:absolute;right:0;top:50%;transform:translateY(-50%);
  width:60%;height:80%;
  background:radial-gradient(ellipse at 70% 50%,rgba(200,16,46,0.1) 0%,transparent 65%);
  pointer-events:none;}
.r-content{position:relative;z-index:1;padding:44px 52px;}

/* Header */
.r-header{display:flex;align-items:flex-start;justify-content:space-between;
  padding-bottom:28px;border-bottom:1px solid var(--border);margin-bottom:30px;}
.r-logos{display:flex;align-items:center;gap:18px;}
.r-logo-tb{width:48px;height:48px;background:var(--red);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--fd);font-weight:800;font-size:1.5rem;color:#fff;flex-shrink:0;}
.r-logo-div{width:1px;height:32px;background:var(--border);}
.r-logo-partner{height:32px;display:flex;align-items:center;
  background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:5px;
  padding:0 14px;font-family:var(--fd);font-weight:600;font-size:1.4rem;
  letter-spacing:0.05em;text-transform:uppercase;}
.r-meta{text-align:right;}
.r-season{font-family:var(--fd);font-size:1.3rem;font-weight:500;
  letter-spacing:0.15em;text-transform:uppercase;color:var(--red);margin-bottom:4px;}
.r-title{font-family:var(--fd);font-weight:700;font-size:3rem;
  letter-spacing:-0.01em;line-height:1;text-transform:uppercase;margin-bottom:4px;}
.r-date{font-size:1.1rem;color:var(--muted);}

/* KPI strip */
.r-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;
  margin-bottom:28px;border:1px solid var(--border-red);border-radius:5px;overflow:hidden;}
.r-kpi{background:rgba(200,16,46,0.07);padding:18px 20px 14px;position:relative;}
.r-kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--red);}
.r-kpi:not(:first-child){border-left:1px solid var(--border);}
.r-kpi-label{font-family:var(--fd);font-size:1.0rem;font-weight:500;
  letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;}
.r-kpi-value{font-family:var(--fd);font-weight:700;font-size:3rem;
  letter-spacing:-0.02em;line-height:1;}
.r-kpi-delta{font-family:var(--fd);font-size:1.1rem;font-weight:600;margin-top:5px;}
.r-kpi-sub{font-size:1.0rem;color:var(--muted);margin-top:4px;}
.delta-up{color:#7ecb7e;}.delta-down{color:#e07272;}

/* Channel cards grid */
.r-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.r-card{background:var(--surface);border:1px solid var(--border);border-radius:5px;overflow:hidden;}
.r-card-full{grid-column:1/-1;}
.r-card-header{display:flex;align-items:center;gap:9px;padding:12px 16px 11px;
  border-bottom:1px solid var(--border);background:rgba(255,255,255,0.03);}
.r-card-icon{font-size:1.3rem;}
.r-card-title{font-family:var(--fd);font-weight:700;font-size:1.2rem;
  letter-spacing:0.12em;text-transform:uppercase;flex:1;}
.r-card-badge{font-family:var(--fd);font-size:0.9rem;font-weight:500;
  letter-spacing:0.08em;text-transform:uppercase;color:var(--red);
  background:rgba(200,16,46,0.12);border:1px solid rgba(200,16,46,0.3);
  padding:2px 8px;border-radius:3px;}
.r-card-body{padding:14px 16px;}

/* TV table */
.r-table{width:100%;border-collapse:collapse;font-size:1.1rem;margin-bottom:2px;}
.r-table th{font-family:var(--fd);font-size:0.9rem;letter-spacing:0.1em;
  text-transform:uppercase;color:var(--muted);font-weight:500;padding:4px 5px;
  border-bottom:1px solid var(--border);text-align:left;}
.r-table th.r-num,.r-table td.r-num{text-align:right;}
.r-table td{padding:6px 5px;color:var(--dim);border-bottom:1px solid rgba(255,255,255,0.04);}
.r-table td.r-num{font-family:var(--fd);font-weight:500;font-size:1.2rem;color:var(--text);}
.r-table tr:last-child td{border-bottom:none;}
.r-accent{color:var(--red) !important;}
.r-totals-row{display:flex;justify-content:space-between;padding:9px 5px 3px;
  border-top:1px solid var(--border);font-family:var(--fd);font-size:1.2rem;font-weight:600;margin-top:2px;}

/* Metric rows (organic) */
.r-metric-row{display:flex;justify-content:space-between;align-items:baseline;
  padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:1.15rem;}
.r-metric-row:last-child{border-bottom:none;}
.r-metric-row span:first-child{color:var(--dim);}
.r-metric-row span:last-child{font-family:var(--fd);font-weight:600;font-size:1.4rem;}
.r-accent-row span:last-child{color:var(--red);}

/* Survey bars */
.r-survey-row{display:flex;align-items:center;gap:10px;padding:7px 0;
  border-bottom:1px solid rgba(255,255,255,0.05);}
.r-survey-row:last-of-type{border-bottom:none;}
.r-survey-label{font-size:1.1rem;color:var(--dim);width:110px;flex-shrink:0;}
.r-survey-track{flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;}
.r-survey-fill{height:100%;background:var(--red);border-radius:2px;}
.r-survey-pct{font-family:var(--fd);font-weight:700;font-size:1.4rem;min-width:40px;text-align:right;}
.r-survey-rank{font-family:var(--fd);font-size:0.95rem;color:var(--muted);min-width:52px;text-align:right;}
.r-survey-meta{font-size:1.0rem;color:var(--muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--border);}

/* Paid grid */
.r-paid-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:0;}
.r-paid-kpi{padding:12px 14px;border-right:1px solid var(--border);}
.r-paid-kpi:last-child{border-right:none;}
.r-paid-label{font-family:var(--fd);font-size:0.9rem;letter-spacing:0.1em;text-transform:uppercase;
  color:var(--muted);margin-bottom:6px;}
.r-paid-val{font-family:var(--fd);font-weight:700;font-size:1.8rem;letter-spacing:-0.01em;}

.r-empty{font-size:1.1rem;color:var(--muted);padding:14px 0;font-style:italic;}

/* Footer */
.r-footer{display:flex;justify-content:space-between;align-items:center;
  padding-top:20px;border-top:1px solid var(--border);margin-top:4px;}
.r-footer-left{font-family:var(--fd);font-size:1.0rem;letter-spacing:0.1em;
  text-transform:uppercase;color:var(--muted);}
.r-footer-left strong{color:var(--red);}
.r-footer-right{font-size:1.0rem;color:var(--muted);}

/* Print */
@media print{
  html,body{background:#0a0a0a;margin:0;padding:0;}
  .r-page{width:100%;margin:0;box-shadow:none;min-height:100vh;}
  .r-no-print{display:none!important;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
</style>
</head>
<body>
<div class="r-page">
  <div class="r-bg"></div>
  <div class="r-content">

    <header class="r-header">
      <div class="r-logos">
        ${renderOrgLogo(48)}
        <div class="r-logo-div"></div>
        <div style="display:flex;align-items:center;gap:10px;">
    ${renderPartnerLogo(brand, 36)}
    <span class="r-logo-partner" style="border:none;background:none;padding:0;font-size:1.6rem;">${brand}</span>
  </div>
      </div>
      <div class="r-meta">
        <div class="r-season">${d.tv.season || d.paid.season || d.survey.wave?.Season || 'Current Season'}</div>
        <div class="r-title">Partnership Report</div>
        <div class="r-date">Generated ${now} · Confidential</div>
      </div>
    </header>

    <div class="r-strip">${kpisHTML}</div>

    <div class="r-grid">
      <div class="r-card">
        <div class="r-card-header">
          <span class="r-card-icon">📺</span>
          <span class="r-card-title">TV Visible Signage</span>
          <span class="r-card-badge">${d.tv.matches} games</span>
        </div>
        <div class="r-card-body">${tvTable}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="r-card" style="flex:1;">
          <div class="r-card-header">
            <span class="r-card-icon">📱</span>
            <span class="r-card-title">Organic Social</span>
            ${d.organic.latest ? `<span class="r-card-badge">${d.organic.latest._reportMonth}</span>` : ''}
          </div>
          <div class="r-card-body">${organicBody}</div>
        </div>
        <div class="r-card" style="flex:1;">
          <div class="r-card-header">
            <span class="r-card-icon">📊</span>
            <span class="r-card-title">Brand Awareness</span>
            ${d.survey.wave ? `<span class="r-card-badge">${d.survey.wave.Survey}</span>` : ''}
          </div>
          <div class="r-card-body">${surveyBody}</div>
        </div>
      </div>
    </div>

    ${paidCard}

    <footer class="r-footer">
      <div class="r-footer-left"><strong>PartnerIQ</strong> · Portland Trail Blazers Partnership Intelligence</div>
      <div class="r-footer-right">Data current through ${now} · For internal use only</div>
    </footer>

  </div>
</div>
</body>
</html>`;
}

// ── Open report in new window ──────────────────────────────
function openPartnerReport(brand) {
  if (!brand) return;
  const html = generatePartnerReport(brand);
  const win  = window.open('', '_blank');
  if (!win) {
    showErrorToast('Pop-up blocked. Please allow pop-ups for this page and try again.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Auto-trigger print dialog after fonts load (short delay)
  win.addEventListener('load', () => {
    // Give Google Fonts ~1s to load before offering print
    setTimeout(() => {
      const btn = win.document.createElement('button');
      btn.textContent = '⬇ Export PDF';
      Object.assign(btn.style, {
        position:'fixed', top:'16px', right:'16px',
        background:'#C8102E', color:'#fff', border:'none',
        borderRadius:'5px', padding:'10px 20px',
        fontFamily:'\'Barlow Condensed\',sans-serif',
        fontWeight:'700', fontSize:'13px',
        letterSpacing:'0.1em', textTransform:'uppercase',
        cursor:'pointer', zIndex:'9999',
        boxShadow:'0 4px 16px rgba(200,16,46,0.4)',
      });
      btn.onclick = () => win.print();
      win.document.body.appendChild(btn);
    }, 800);
  });
}



// ============================================================
// REPORT EXPORT MODAL — step-through UI
// Steps: 1) Pick partner  2) Pick season  3) Confirm & generate
// ============================================================

const _reportModal = {
  step: 1,
  brand: null,
  season: null,
  searchQuery: '',
};

function openReportModal(prefilledBrand = null) {
  _reportModal.step     = prefilledBrand ? 2 : 1;
  _reportModal.brand    = prefilledBrand || null;
  _reportModal.season   = null;
  _reportModal.searchQuery = '';

  document.getElementById('reportModalBackdrop').classList.add('active');
  _renderReportModalStep();
}

function closeReportModal() {
  document.getElementById('reportModalBackdrop').classList.remove('active');
}

function _renderReportModalStep() {
  const body = document.getElementById('reportModalBody');
  if (!body) return;

  if (_reportModal.step === 1) _renderReportStep1(body);
  else if (_reportModal.step === 2) _renderReportStep2(body);
  else if (_reportModal.step === 3) _renderReportStep3(body);
}

// ── Step 1: Pick partner ────────────────────────────────────
function _renderReportStep1(body) {
  const rosterActive = DataStore.partnerRoster && DataStore.partnerRoster.length > 0;
  const allBrands    = DataStore.getBrandList();
  const q            = _reportModal.searchQuery.toLowerCase();

  let brands = rosterActive
    ? [...allBrands.filter(b => isCurrentPartner(b)), ...allBrands.filter(b => !isCurrentPartner(b))]
    : allBrands;

  if (q) brands = brands.filter(b => b.toLowerCase().includes(q));

  const items = brands.slice(0, 40).map(b => {
    const chs  = DataStore.channelsByBrand[b] || {};
    const tags = [chs.tv && '📺', chs.organic && '📱', chs.paid && '💰', chs.survey && '📊'].filter(Boolean).join(' ');
    const dot  = (rosterActive && isCurrentPartner(b))
      ? '<span class="brand-option-roster-dot" title="Current partner"></span>' : '';
    return `<div class="report-partner-item" data-brand="${b.replace(/"/g,'&quot;')}">
      ${renderPartnerLogo(b, 28)}
      <span class="report-partner-name">${b}${dot}</span>
      <span class="report-partner-channels">${tags}</span>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="report-step-label">Step 1 of 3 — Choose a partner</div>
    <div class="report-partner-search-wrap">
      <svg class="report-partner-search-icon" width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input class="report-partner-search" id="reportPartnerSearch"
        placeholder="Search partners..." value="${_reportModal.searchQuery}" autocomplete="off"/>
    </div>
    <div class="report-partner-list" id="reportPartnerList">${items || '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No partners match.</div>'}</div>
  `;

  // Wire search — only re-renders the list, not the whole step
  const input = document.getElementById('reportPartnerSearch');
  if (input) {
    input.focus();
    input.addEventListener('input', () => {
      _reportModal.searchQuery = input.value;
      const q2 = input.value.toLowerCase();
      let b2 = rosterActive
        ? [...allBrands.filter(b => isCurrentPartner(b)), ...allBrands.filter(b => !isCurrentPartner(b))]
        : allBrands;
      if (q2) b2 = b2.filter(b => b.toLowerCase().includes(q2));
      const list = document.getElementById('reportPartnerList');
      if (list) list.innerHTML = b2.slice(0, 40).map(b => {
        const chs  = DataStore.channelsByBrand[b] || {};
        const tags = [chs.tv && '📺', chs.organic && '📱', chs.paid && '💰', chs.survey && '📊'].filter(Boolean).join(' ');
        const dot  = (rosterActive && isCurrentPartner(b))
          ? '<span class="brand-option-roster-dot" title="Current partner"></span>' : '';
        return `<div class="report-partner-item" data-brand="${b.replace(/"/g,'&quot;')}">
          ${renderPartnerLogo(b, 28)}
          <span class="report-partner-name">${b}${dot}</span>
          <span class="report-partner-channels">${tags}</span>
        </div>`;
      }).join('') || '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No partners match.</div>';
      _wireReportPartnerItems();
    });
  }
  _wireReportPartnerItems();
}

function _wireReportPartnerItems() {
  document.querySelectorAll('#reportPartnerList .report-partner-item').forEach(el => {
    el.addEventListener('click', () => {
      _reportModal.brand  = el.dataset.brand;
      _reportModal.season = null;
      _reportModal.step   = 2;
      _renderReportModalStep();
    });
  });
}

// ── Step 2: Pick season ─────────────────────────────────────
function _renderReportStep2(body) {
  const brand = _reportModal.brand;

  // Collect all seasons across all channels for this brand
  const tvSeasons  = [...new Set((getBrandTVData(brand)||[]).map(r => r.Season).filter(Boolean))].sort();
  const paidSeasons = getPaidSeasons(brand);
  const surveySeasons = [...new Set((DataStore.surveys||[]).filter(r => r.Brand === brand).map(r => r.Season).filter(Boolean))].sort();
  const zSeasons   = [...new Set((getBrandZoomphPerf(brand)||[]).map(r => r._reportMonth).filter(Boolean))].sort();

  // Union of all seasons (TV + paid as primary; others as context)
  const allSeasons = [...new Set([...tvSeasons, ...paidSeasons])].sort();
  const latestSeason = allSeasons[allSeasons.length - 1] || 'Latest available';

  // Default to latest
  if (!_reportModal.season) _reportModal.season = latestSeason;

  const seasonBtns = (allSeasons.length ? allSeasons : ['Latest available']).map(s =>
    `<button class="report-season-btn ${_reportModal.season === s ? 'active' : ''}"
      data-report-season="${s}">${s}</button>`
  ).join('');

  body.innerHTML = `
    <button class="report-back-btn" id="reportBackBtn1">← Back</button>
    <div class="report-step-label">Step 2 of 3 — Choose a season</div>
    <div style="margin-bottom:6px;">
      <div style="font-weight:500;font-size:15px;margin-bottom:3px;">${brand}</div>
      <div style="font-size:12px;color:var(--text-dim);">
        ${[tvSeasons.length && `TV: ${tvSeasons.length} season${tvSeasons.length===1?'':'s'}`,
           paidSeasons.length && `Paid: ${paidSeasons.length} season${paidSeasons.length===1?'':'s'}`,
           surveySeasons.length && `Survey: ${surveySeasons.length} season${surveySeasons.length===1?'':'s'}`,
           zSeasons.length && `Organic: ${zSeasons.length} snapshot${zSeasons.length===1?'':'s'}`
          ].filter(Boolean).join(' · ')}
      </div>
    </div>
    <div class="report-season-grid" style="margin:16px 0;">${seasonBtns}</div>
    <button class="report-generate-btn" id="reportToStep3">
      Continue →
    </button>
  `;

  document.getElementById('reportBackBtn1').addEventListener('click', () => {
    _reportModal.step = 1; _renderReportModalStep();
  });
  document.querySelectorAll('[data-report-season]').forEach(btn => {
    btn.addEventListener('click', () => {
      _reportModal.season = btn.dataset.reportSeason;
      document.querySelectorAll('[data-report-season]').forEach(b =>
        b.classList.toggle('active', b.dataset.reportSeason === _reportModal.season));
    });
  });
  document.getElementById('reportToStep3').addEventListener('click', () => {
    _reportModal.step = 3; _renderReportModalStep();
  });
}

// ── Step 3: Confirm & generate ──────────────────────────────
function _renderReportStep3(body) {
  const brand  = _reportModal.brand;
  const season = _reportModal.season;
  const chs    = DataStore.channelsByBrand[brand] || {};

  const channelDefs = [
    { key: 'tv',      icon: '📺', label: 'TV Signage' },
    { key: 'paid',    icon: '💰', label: 'Paid Social' },
    { key: 'organic', icon: '📱', label: 'Organic Social' },
    { key: 'survey',  icon: '📊', label: 'Survey' },
  ];

  const channelTagsHTML = channelDefs.map(ch =>
    `<div class="report-channel-tag ${chs[ch.key] ? 'has' : 'missing'}">
      ${ch.icon} ${ch.label}
    </div>`
  ).join('');

  body.innerHTML = `
    <button class="report-back-btn" id="reportBackBtn2">← Back</button>
    <div class="report-step-label">Step 3 of 3 — Confirm</div>
    <div class="report-preview-card">
      <div class="report-preview-partner">Partnership Report</div>
      <div class="report-preview-name">${brand}</div>
      <div class="report-preview-season">${season}</div>
      <div class="report-channel-tags">${channelTagsHTML}</div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px;">
      Crossed-out channels have no data loaded for this partner.
      The report will include only sections with available data.
    </div>
    <button class="report-generate-btn" id="reportGenerateBtn">
      ⬇ Generate Report
    </button>
  `;

  document.getElementById('reportBackBtn2').addEventListener('click', () => {
    _reportModal.step = 2; _renderReportModalStep();
  });
  document.getElementById('reportGenerateBtn').addEventListener('click', () => {
    closeReportModal();
    // Small delay so modal closes before the new window opens
    setTimeout(() => openPartnerReport(brand), 100);
  });
}
