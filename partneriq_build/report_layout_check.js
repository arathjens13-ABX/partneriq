// Partner report layout check — optional, needs Playwright + Chromium.
//
// Renders the partner report for every current partner across many section
// combinations and checks the layout rules: nothing overflows a page, no empty
// pages, no text under 12px, how full each non-final page is, and whether any
// report ends on a near-empty page.
//
// It needs real data, so point it at an exported (preloaded) dashboard:
//   node report_layout_check.js path/to/partneriq-preloaded.html
// Exits non-zero if any report breaks a rule.
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright is not installed — this check is optional. Install it globally (npm i -g playwright) to run it.'); process.exit(2); }
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const app = await b.newPage();
  const errs = []; app.on('pageerror', e => errs.push('app: ' + e.message));
  if (!process.argv[2]) { console.error('Usage: node report_layout_check.js <preloaded-dashboard.html>'); process.exit(2); }
  await app.goto('file://' + path.resolve(process.argv[2])); await app.waitForTimeout(2000);
  const jobs = await app.evaluate(() => {
    const cur = rptCurrentSeason();
    const brands = DataStore.getBrandList().filter(isCurrentPartner);
    const out = [];
    brands.forEach((brand, bi) => {
      const seasons = getReportSeasonsForBrand(brand);
      const season = seasons[0]; if (!season) return;
      const model = buildReportModel(brand, season);
      const avail = REPORT_SECTION_DEFS.map(d => d.key).filter(k => model.sections[k].available);
      if (!avail.length) return;
      const combos = [avail, [avail[0]], avail.slice(0, 2), avail.slice(0, 3), avail.filter((_, i) => i % 2 === 0)];
      avail.forEach(k => combos.push([k]));
      const seen = new Set();
      combos.forEach(c => {
        const key = c.join(','); if (seen.has(key)) return; seen.add(key);
        [true, false].forEach(meth => {
          if (!meth && c.length !== avail.length) return;
          const sections = {}; c.forEach(k => sections[k] = true);
          out.push({ brand, season, combo: key, meth, html: renderReportDocument(model, { sections, methodology: meth, compare: true }) });
        });
      });
      // An older season too, for partners that have one
      if (seasons[2] && bi % 3 === 0) {
        const m2 = buildReportModel(brand, seasons[2]);
        out.push({ brand, season: seasons[2], combo: 'all-old', meth: true, html: renderReportDocument(m2, { compare: true, methodology: true }) });
      }
    });
    return out;
  });
  const doc = await b.newPage({ viewport: { width: 900, height: 1200 } });
  doc.on('pageerror', e => errs.push('doc: ' + e.message));
  const problems = []; const fills = []; const tails = []; let n = 0, pagesTotal = 0;
  for (const j of jobs) {
    await doc.setContent(j.html); await doc.evaluate(() => window.reportReady);
    const r = await doc.evaluate(() => {
      document.getElementById('pages').style.zoom = 1;
      const pages = [...document.querySelectorAll('.page')];
      const res = { pages: pages.length, overflow: [], empty: [], small: [], fill: [] };
      pages.forEach((p, i) => {
        const body = p.querySelector('.page-body');
        if (!body.children.length) res.empty.push(i + 1);
        if (body.scrollHeight > body.clientHeight + 1) res.overflow.push(i + 1);
        const used = [...body.children].reduce((s, c) => s + c.offsetHeight, 0);
        const nextBreak = pages[i + 1] && /Methodology/.test((pages[i + 1].querySelector('.page-body').firstElementChild || {}).textContent || '');
        if (i < pages.length - 1 && !nextBreak) res.fill.push(Math.round(used / body.clientHeight * 100));
        // A final page that is only the methodology appendix is expected;
        // a section's last lines stranded on a page of their own are not.
        else if (i > 0 && !/Methodology/.test(body.firstElementChild ? body.firstElementChild.textContent : '')) res.tail = Math.round(used / body.clientHeight * 100);
      });
      const walker = document.createTreeWalker(document.getElementById('pages'), NodeFilter.SHOW_TEXT);
      let t; while ((t = walker.nextNode())) {
        if (!t.textContent.trim()) continue;
        const fs = parseFloat(getComputedStyle(t.parentElement).fontSize);
        if (fs < 12) res.small.push(`${fs}px "${t.textContent.trim().slice(0, 30)}"`);
      }
      return res;
    });
    if (r.tail !== undefined) tails.push({ f: r.tail, brand: j.brand, combo: j.combo });
    n++; pagesTotal += r.pages; fills.push(...r.fill.map(f => ({ f, brand: j.brand, combo: j.combo })));
    if (r.overflow.length || r.empty.length || r.small.length) problems.push({ brand: j.brand, season: j.season, combo: j.combo, ...r, small: r.small.slice(0, 3) });
  }
  fills.sort((a, b) => a.f - b.f);
  console.log(`checked ${n} reports, ${pagesTotal} pages, ${new Set(jobs.map(j => j.brand)).size} partners`);
  console.log('problems:', problems.length, JSON.stringify(problems.slice(0, 5), null, 1));
  console.log('lowest page fills (non-final pages):', fills.slice(0, 8).map(x => `${x.f}% ${x.brand} [${x.combo}]`));
  const hist = [0, 0, 0, 0, 0]; fills.forEach(x => hist[Math.min(4, Math.floor(x.f / 20))]++);
  console.log('fill histogram 0-20/20-40/40-60/60-80/80-100:', hist.join(' / '));
  tails.sort((a, b) => a.f - b.f);
  console.log('last content pages under 20% full:', tails.filter(t => t.f < 20).length, 'of', tails.length, tails.slice(0, 6).map(x => `${x.f}% ${x.brand} [${x.combo}]`));
  console.log('errors:', errs.slice(0, 5));
  await b.close();
  process.exit(problems.length || errs.length ? 1 : 0);
})();
