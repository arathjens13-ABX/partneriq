LOGOS
=====

This folder contains two types of logos:

  1. PARTNER LOGOS — one file per partner, auto-displayed throughout the
     dashboard (partner pages, browse grid, search dropdown, exported reports).

  2. ORG LOGO — TrailBlazers.png — the Portland Trail Blazers logo mark.
     Displayed in the dashboard header and in the exported report header.
     The filename must stay exactly "TrailBlazers.png".

──────────────────────────────────────────────────────────────────────────────
PARTNER LOGOS
──────────────────────────────────────────────────────────────────────────────
The filename (minus extension) must match the canonical partner name
exactly as it appears in the PartnerIQ dashboard.

Examples:
  Alaska Airlines.png
  Toyota.png
  Moda Health.png
  McDonald's.png
  First Tech.png

──────────────────────────────────────────────────────────────────────────────
SHARED RULES (both logo types)
──────────────────────────────────────────────────────────────────────────────
Supported formats: PNG (preferred, use transparent background), SVG, JPG
Recommended size: 200x200px minimum, 400x400px ideal

After adding or changing any logo, run Cell 1 in build.ipynb to rebuild.

Name mismatches for partner logos are reported as warnings during the build —
check the Cell 1 output to confirm all logos were matched correctly.
