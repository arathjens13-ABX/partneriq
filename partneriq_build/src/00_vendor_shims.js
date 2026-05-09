// ============================================================
// OFFLINE VENDOR SHIMS — no external CDN calls
// ============================================================
// PapaParse-compatible CSV parser for local/offline CSV uploads.
// Supports header rows, quoted fields, escaped quotes, CRLF/LF, empty-line skipping,
// and basic dynamic typing. XLSX uploads require a full spreadsheet parser and are
// intentionally disabled in this offline-only build; export XLSX sources as CSV first.
(function(){
  function dynamicValue(value) {
    if (value === '') return null;
    const trimmed = String(value).trim();
    if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return value;
  }
  function parseRows(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    text = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch === '\r') { /* ignore; \n handles CRLF */ }
        else { field += ch; }
      }
    }
    row.push(field);
    rows.push(row);
    return rows;
  }
  window.Papa = window.Papa || {
    parse: function(text, options) {
      options = options || {};
      let rows = parseRows(text);
      if (options.skipEmptyLines) rows = rows.filter(r => r.some(c => String(c || '').trim() !== ''));
      if (options.header) {
        const headers = (rows.shift() || []).map(h => String(h || '').trim());
        const data = rows.map(r => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = options.dynamicTyping ? dynamicValue(r[i] ?? '') : (r[i] ?? ''); });
          return obj;
        });
        return { data, errors: [], meta: { fields: headers } };
      }
      if (options.dynamicTyping) rows = rows.map(r => r.map(dynamicValue));
      return { data: rows, errors: [], meta: {} };
    }
  };

  function OfflineChart(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    this.config = config || {};
    this.destroy = function(){ if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); };
    this.render();
  }
  OfflineChart.prototype._resize = function() {
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 600, height: 260 };
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, Math.floor(rect.width || 600));
    const h = Math.max(220, Math.floor(rect.height || 260));
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  };
  OfflineChart.prototype._fmt = function(v){
    const n = Number(v) || 0, a = Math.abs(n);
    if (a >= 1e9) return (n/1e9).toFixed(1)+'B';
    if (a >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (a >= 1e3) return (n/1e3).toFixed(1)+'K';
    return Math.round(n).toLocaleString();
  };
  OfflineChart.prototype.render = function() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const size = this._resize();
    const cfg = this.config || {}, data = cfg.data || {}, labels = data.labels || [];
    const datasets = data.datasets || [];
    const type = cfg.type || (datasets[0] && datasets[0].type) || 'bar';
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.font = '11px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = '#a0a2a5';
    if (!datasets.length || !labels.length) { ctx.fillText('No chart data', 20, 28); return; }
    if (type === 'doughnut' || type === 'pie') return this._drawDoughnut(ctx, size, labels, datasets[0]);
    this._drawXY(ctx, size, labels, datasets);
  };
  OfflineChart.prototype._drawXY = function(ctx, size, labels, datasets) {
    const pad = { l: 54, r: 26, t: 22, b: 42 }, w = size.w - pad.l - pad.r, h = size.h - pad.t - pad.b;
    const allVals = [];
    datasets.forEach(ds => (ds.data || []).forEach(v => allVals.push(Number(v) || 0)));
    const max = Math.max(1, ...allVals) * 1.12;
    const x = i => pad.l + (labels.length === 1 ? w/2 : (i/(labels.length-1))*w);
    const y = v => pad.t + h - ((Number(v)||0)/max)*h;
    ctx.strokeStyle = '#1f2125'; ctx.lineWidth = 1;
    ctx.fillStyle = '#a0a2a5';
    for (let g=0; g<=4; g++) {
      const gy = pad.t + (h*g/4); ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l+w, gy); ctx.stroke();
      const val = max * (1 - g/4); ctx.fillText(this._fmt(val), 8, gy+4);
    }
    ctx.strokeStyle = '#2a2d32'; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+h); ctx.lineTo(pad.l+w, pad.t+h); ctx.stroke();
    const colors = ['#eaebec','#a0a2a5','#6a6c70','#c4c6c9'];
    const barSets = datasets.filter(ds => (ds.type || 'bar') === 'bar');
    const lineSets = datasets.filter(ds => (ds.type || '') === 'line' || (!barSets.length && (ds.type || this.config.type) === 'line'));
    const groupW = w / Math.max(1, labels.length);
    barSets.forEach((ds, sidx) => {
      const barW = Math.max(5, groupW * 0.55 / Math.max(1, barSets.length));
      ctx.fillStyle = ds.backgroundColor || colors[sidx % colors.length];
      (ds.data || []).forEach((v, i) => {
        const bx = pad.l + i*groupW + groupW/2 - (barW*barSets.length)/2 + sidx*barW;
        const by = y(v); ctx.fillRect(bx, by, barW*0.86, pad.t+h-by);
      });
    });
    lineSets.forEach((ds, sidx) => {
      const vals = ds.data || [];
      ctx.strokeStyle = ds.borderColor || colors[(sidx+1)%colors.length]; ctx.lineWidth = 2; ctx.beginPath();
      vals.forEach((v,i) => { const px=x(i), py=y(v); if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }); ctx.stroke();
      ctx.fillStyle = ds.pointBackgroundColor || ds.borderColor || colors[(sidx+1)%colors.length];
      vals.forEach((v,i)=>{ ctx.beginPath(); ctx.arc(x(i), y(v), 2.5, 0, Math.PI*2); ctx.fill(); });
    });
    ctx.fillStyle = '#a0a2a5'; ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace';
    const step = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((lab,i)=>{ if(i%step===0 || i===labels.length-1){ const tx=x(i); ctx.save(); ctx.translate(tx, size.h-18); ctx.rotate(labels.length>5 ? -0.25 : 0); ctx.textAlign='center'; ctx.fillText(String(lab),0,0); ctx.restore(); }});
  };
  OfflineChart.prototype._drawDoughnut = function(ctx, size, labels, ds) {
    const vals = (ds.data || []).map(v => Number(v)||0), total = vals.reduce((a,b)=>a+b,0) || 1;
    const cx = size.w * 0.42, cy = size.h * 0.5, r = Math.min(size.w, size.h) * 0.28, inner = r * 0.62;
    const colors = ds.backgroundColor || ['#eaebec','#c4c6c9','#a0a2a5','#8a9098','#6a6c70','#4a4d52'];
    let start = -Math.PI/2;
    vals.forEach((v,i)=>{ const end = start + (v/total)*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath(); ctx.fillStyle=colors[i%colors.length]; ctx.fill(); start=end; });
    ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#a0a2a5'; ctx.font='11px system-ui, -apple-system, Segoe UI, sans-serif';
    labels.forEach((lab,i)=>{ const lx = size.w*0.72, ly = 28 + i*18; ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(lx,ly-9,10,10); ctx.fillStyle='#a0a2a5'; ctx.fillText(String(lab), lx+16, ly); });
  };
  window.Chart = window.Chart || OfflineChart;
  window.XLSX_OFFLINE_DISABLED = true;
})();

// LZ-string 1.5.0 — MIT License — https://github.com/pieroxy/lz-string
var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();
