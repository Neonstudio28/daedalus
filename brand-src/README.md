# Brand image sources

Source files for the logo, the social image and the icons. They are not deployed.

## The mark

`mark.svg` is the two-heads mark: a head facing right with a second head facing left cut out of it. It is a clean vector redraw of mark #111 on page 13 of *Trademarks & Symbols, Vol. 2: Symbolical Designs* (Yasaburo Kuwayama, 1973). That book collects other companies' trademarks, so check the mark's ownership before registering it or relying on it.

`build-mark.py` builds `mark.svg`. The corners are measured by hand from a scan of the book page; the long curves are fitted to the scan's outline. The scan is not kept in this repo. To rebuild, render page 13 of the PDF 6000px wide, crop the mark, and pass that image with the crop box (see the usage line in the script). The site, `favicon.svg` and `og.html` each carry a copy of the path, so update all three after a rebuild.

- `og.html` renders to `/og.png` (1200×630).
- `icon.html` renders `/favicon.svg` to `/favicon-32.png` and `/apple-touch-icon.png` (180×180).

- `app-demo.html` is the demo Mac app shown in the site hero. It renders at 2x to `img/app-fleet.png`; convert that to WebP for `img/app-fleet.webp`.

To re-render after a change, run from the project root:

```bash
swift brand-src/render.swift brand-src/og.html og.png 1200 630
swift brand-src/render.swift brand-src/icon.html apple-touch-icon.png 180 180
swift brand-src/render.swift brand-src/icon.html favicon-32.png 32 32
swift brand-src/render.swift brand-src/app-demo.html img/app-fleet.png 2560 1320
python3 -c "from PIL import Image; Image.open('img/app-fleet.png').convert('RGB').save('img/app-fleet.webp', quality=90, method=6)"
```
