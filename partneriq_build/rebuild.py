#!/usr/bin/env python3
"""Regenerates dist/partneriq.html.

This is a byte-for-byte reimplementation of Cell 1 in build.ipynb, for use from
a terminal where Jupyter isn't available. build.ipynb remains the source of
truth for the build and is deliberately untouched — if you change the build,
change it there and mirror it here.

Usage:  python3 rebuild.py
"""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
OUT = DIST / 'partneriq.html'


def build_partner_logos_js() -> str:
    logos_dir = ROOT / 'logos'
    if not logos_dir.exists():
        print('  ! logos/ folder not found — no partner logos will appear')
        return 'const PARTNER_LOGOS = {}; // logos/ folder not found'
    logo_files = sorted(
        f for pat in ('*.png', '*.jpg', '*.jpeg', '*.svg') for f in logos_dir.glob(pat)
    )
    if not logo_files:
        print('  ! logos/ is empty — no partner logos will appear')
        return 'const PARTNER_LOGOS = {}; // no logos loaded'
    entries = {}
    for lf in logo_files:
        ext = lf.suffix.lower()
        if ext == '.svg':
            entries[lf.stem] = {'type': 'svg', 'data': lf.read_text(encoding='utf-8')}
        else:
            mime = 'image/jpeg' if ext in ('.jpg', '.jpeg') else 'image/png'
            b64 = base64.b64encode(lf.read_bytes()).decode('ascii')
            entries[lf.stem] = {'type': 'img', 'data': f'data:{mime};base64,{b64}'}
    return f'const PARTNER_LOGOS = {json.dumps(entries, ensure_ascii=False)};'


def main() -> None:
    DIST.mkdir(exist_ok=True)
    js_files = sorted(SRC.glob('[0-9][0-9]_*.js'))
    vendor_shim = (SRC / '00_vendor_shims.js').read_text(encoding='utf-8')
    styles = (SRC / '01_styles.css').read_text(encoding='utf-8')
    shell = (SRC / 'shell.html').read_text(encoding='utf-8')
    main_js_files = sorted(f for f in js_files if not f.name.startswith('00_'))
    main_js = '\n\n'.join(f.read_text(encoding='utf-8') for f in main_js_files)
    partner_logos_js = build_partner_logos_js()

    html = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
<meta charset=\"UTF-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
<title>PartnerIQ · Brand Performance Intelligence</title>
<script>
{vendor_shim}
</script>
<style>
{styles}
</style>
</head>
{shell}
<script>
{partner_logos_js}
</script>
<script>
{main_js}
</script>
</body>
</html>
"""

    OUT.write_text(html, encoding='utf-8')
    print(f'Built: {OUT}')
    print(f'  Size:  {OUT.stat().st_size // 1024} KB')
    print(f'  JS files assembled: {len(main_js_files)}')
    for f in main_js_files:
        print(f'    {f.name:40s}  {f.read_text(encoding="utf-8").count(chr(10)):5d} lines')


if __name__ == '__main__':
    main()
