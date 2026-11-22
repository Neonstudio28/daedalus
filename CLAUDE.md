# Daedalus Systems website: handoff for Claude Code

This folder holds the company website for **Daedalus Systems LLC** (a Texas LLC, assumed in the Terms). It was built in a Claude chat and moved here to keep working on it in Claude Code. Read this file first.

## The company (context for copy)

- **What it is:** robot fleet financing. "The bank for robot fleets."
- **The pitch:** Construction robots are rented to contractors by the month (Dusty's layout robot rents for about $4,500 to $7,000 a month). That leaves robot startups paying for every robot with venture money, so in effect they lend to their own customers. Daedalus funds those fleets through capital partners and prices each deal using the robot's own telemetry: hours, uptime, output and location. It underwrites, services (collects rent, flags idle robots, sends monthly reports) and resells robots at the end of the term, which builds a record of real resale prices.
- **Customers:**
  - Robot companies, who keep the customer and keep their cash.
  - Capital partners, who get live data on every asset.
  - Nothing changes for contractors.
- **Founder:** solo founder, applying to YC (W27). Based in Pune, India now. The company plans to base itself in **Dallas–Fort Worth, Texas**.
- **Name clash:** there is an existing YC-backed company also called "Daedalus" (AI robotic factories). This was flagged; it hasn't been decided yet.

### Copy rules (agreed with the founder)

- **No invented traction.** No customers, partners, logos, testimonials or results. Example data must be labelled "Example", "illustrative" or "assumed".
- **No fee rates or revenue projections on the public site.** The FAQ says fees are "quoted per deal". The internal assumptions are 1–3% origination plus 0.5–1.5% a year servicing, and they stay off the site.
- **Avoid these phrases**, which the founder rejected:
  - "next financeable asset class"
  - "fees first, then interest and data"
  - "no one is neutral" / "neutral finance arm"
- **Style:** plain, direct sentences. No em-dash asides and no "not X, but Y" constructions in new copy.

### Sourced figures in use (footer sources 1–5)

1. 349,000 new US construction workers needed in 2026, and US data-center construction spending at a $50.7B annual rate in April 2026. Both from ABC and US Census figures via [Metaintro](https://www.metaintro.com/blog/ai-boom-data-center-construction-jobs-worker-shortage-2026).
2. $3–6K a month for one layout robot (Dusty Robotics FieldPrinter): [$3,000 a month to lease](https://robotomated.com/explore/construction/dusty-fieldprinter) and [$6,000 a month on subscription](https://robotomated.com/explore/construction/dusty-fieldprinter-2), both on Robotomated. The earlier $4.5–7K figure came from a Robotomated buying guide that now returns 410 Gone, so it was replaced in November 2026. Dusty's own pricing page says pricing is usage-based and gives no numbers.
3. More than $20B of GPU-backed loans: [Wing VC, "How the GPU Became Collateral"](https://www.wing.vc/content/how-the-gpu-became-collateral), September 2026.
4. DEWALT and August Robotics' drilling robot (DALE): 99.97% accuracy on 230,000+ holes, July 2026, via [Let's Data Science](https://letsdatascience.com/news/downward-drilling-robot-accelerates-data-center-construction-b0035c38).
5. Formic raised $50M in October 2026: [Manufacturing.net](https://www.manufacturing.net/automation/news/22977055/formic-raises-50-million-to-scale-physical-ai-across-us-manufacturing).

## Files

| File | What it is |
|---|---|
| `index.html` | **The current site.** Eight pages in one file: plain HTML/CSS/JS, no React, no build step. |
| `v1-single-page.html` | The earlier one-page version, kept for reference. |
| `fonts/` | Redaction 35 font files (OFL 1.1, from npm `@fontsource/redaction-35`) and their licence. `index.html` loads the italic from here. |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.png` | Icons and the 1200×630 social image. |
| `img/` | The hero app screenshot (`app-fleet.webp`, `app-fleet.png`). |
| `brand-src/` | Sources for the logo, icons, social image and hero screenshot, plus `render.swift`, which renders them with WebKit. See its README. Not deployed. |
| `privacy.html`, `terms.html` | Draft Privacy and Terms pages in the site style, linked from the footer's bottom line. They describe what the site does today (no cookies, cookieless Vercel Web Analytics, a form that doesn't send). Update them if that changes, and have counsel review them before launch. |
| `404.html`, `robots.txt` | Hosting extras. |
| `vercel.json`, `.vercelignore` | Vercel config: font caching, basic security headers, and an ignore list that keeps `CLAUDE.md`, `v1-single-page.html` and `brand-src/` off the live site. |
| `.claude/launch.json` | Local preview server (`python3 -m http.server 4173`). |

The same site, the pitch deck and the full plan doc also live as claude.ai artifacts:

- Website: https://claude.ai/artifact/4KggBPMyB1Het1YYvkL9PZ
- Deck (5 slides): https://claude.ai/artifact/XEb6FjFuNJiLH9HffVkUa8
- Plan doc, including the YC answers: https://claude.ai/artifact/KcjWrPUcrWzfpGjpXcMwhY

## How `index.html` works

- **Preview:** run `npx serve .` (or `python3 -m http.server`) and open the printed URL. Serve it rather than opening the file directly, so the font and icons load.
- **The file is a full HTML document** with charset and `viewport-fit=cover` metas, a meta description, Open Graph and Twitter tags, and favicon links. `[hidden]{display:none!important}` and the Redaction `@font-face` sit at the top of the main `<style>`. It is no longer shaped for the claude.ai artifact host, so the artifact copy is now the older version.
- **Pages** are `<div class="page" data-page="…">` blocks, switched by hash routing:
  - `#home`
  - `#how-it-works`
  - `#robot-companies`
  - `#capital-partners`
  - `#why-now`
  - `#compare`
  - `#quote`
  - `#contact`

  The router sits at the bottom of the main script (`go()`, `swap()`, `setup()`). A curtain animation plays between pages. `swap()` sets `document.title` from `TITLES` and moves focus to the new page's `h1` (`focusTitle()`). A "Skip to content" link at the top of the body does the same. Without JavaScript, a `<noscript>` style shows all eight pages and the FAQ answers stacked.
- **Per-page animation** is in the `SETUP` object. Each page runs inside a `gsap.context` and a `gsap.matchMedia`, and both are reverted when you leave the page (`teardown()`). Shared reveal behaviour is driven by attributes:
  - `data-split`: the heading's lines rise in
  - `data-reveal`: the element fades up
  - `data-stagger`: the element's children fade up one after another
  - `data-count`: the number counts up
  - `data-scramble`: the text scrambles in
  - `data-intro`: the page hero animates in on load

  These start from content that is already visible, and are triggered when the element scrolls into view.
- **Libraries:** loaded from jsDelivr and pinned to [GSAP 3.15.0](https://github.com/greensock/GSAP) (ScrollTrigger, SplitText, ScrambleText, MotionPath) and [Lenis 1.3.27](https://github.com/darkroomengineering/lenis) (smooth scroll).
- **Fallbacks:** if GSAP is missing, or the visitor has reduced motion turned on, the site still works with no motion.
- **Notable pieces:**
  - Home: the hero is a screenshot of a demo Mac app (`img/app-fleet.webp`, PNG fallback), rendered from `brand-src/app-demo.html`. It uses the same example fleet as the Capital partners fleet monitor and carries an "Example data" badge plus a caption. To change it, edit the demo page and re-render (see `brand-src/README.md`). On phones the image is cropped to the table. On screens 768px and wider it has an Apple-style scroll reveal (in `SETUP.home`): the window starts tilted back and dimmed, flattens and lights up as you scroll, then pins under the nav for a short hold while it scales to full size and the caption fades in. The founder asked to remove the canvas floor-plan animation, the custom cursor, the hero card and the mono "Robot fleet financing" pill.
  - How it works:
    - a money/data diagram that pins while you scroll through four stages (`data-s` attributes on SVG groups, `setStage()`)
    - dots flowing along the arrows (MotionPath)
    - steps that scroll sideways
  - Robot companies: the payback calculator (`calc()`, `drawCash()`, fleet grid).
  - Capital partners: the fleet monitor (`fleet`, `select()`, `drawBars()`), a live rent ledger and a status ring.
  - Why now: the overlapping-circles diagram, a positioning chart and a quote that brightens word by word.
  - Compare: a table of funding it yourself, an equipment lender and Daedalus. On phones each row becomes a stacked card (`data-l` labels).
  - Get a quote: an example offer from robot type, cost, rent, fleet size, uptime and term (`quoteCalc()`, presets in `QDEF`). Its assumptions sit in a code comment and stay off the page as rates: 50–85% of cost funded depending on uptime, the payment capped at 70% of rent, and an 11% a year cost of capital. Every output is labelled illustrative. The nav shows a "Get a quote" button from 1181px wide; below that it's in the menu.
- **Logo:** the two-heads mark is the `#mk` symbol in the shared SVG defs at the top of the body. It is used in the nav, the footer and the page-transition curtain. The master is `brand-src/mark.svg`.
- **Theme:** dark by default. The sun/moon button in the nav sets `data-theme="light"` on `<html>`, which swaps the same tokens for a light palette, and saves the choice in `localStorage` (`theme`). A tiny script in the `<head>` applies it before paint, and the Privacy, Terms and 404 pages read it too. On toggle, `readTokens()` refreshes the JS colour cache `C` and the current page is set up again so JS-drawn colours follow. The hero app screenshot stays dark in both themes.
- **Design tokens** are CSS custom properties on `:root`: a dark look with `--bg #141414`, `--accent #FF3616`, `--green #66CC64`, `--blue #3DB4C7` and `--amber #E8B34A`. Fonts:
  - Funnel Display (headings) and Funnel Sans (body), from Google Fonts
  - Geist Mono (labels), from Google Fonts
  - Redaction 35 italic (accent serif), loaded from `fonts/redaction-35-latin-400-italic.woff2` and preloaded in the `<head>`

  The style is inspired by hoplite.sh: hatched side strips, hairline grid lines with "+" marks, bordered dark panels and an orange glow.

## Open to-dos

- [ ] Replace the fictional email `hello@daedalus.tech` (contact copybox, note panel, Privacy and Terms) with a real one. `daedalus.tech` is not a domain the company owns, so mail sent there goes nowhere useful.
- [ ] Replace the placeholder office address before launch. "1847 Labyrinth Way, Suite 300, Dallas, TX 75201" is made up. It appears in the contact page Office box, the footer legal line, the "Where are you based?" FAQ and the Contact sections of `privacy.html` and `terms.html`, each marked with a `PLACEHOLDER` HTML comment.
- [ ] The contact form only prepares a note for the visitor to copy. Connect it to a real form backend once the site is hosted (for example Formspree or a small serverless function).
- [x] Add a proper HTML skeleton, meta description, Open Graph image and favicon for real hosting.
- [ ] Deploy (the founder has used Vercel before) and connect a domain. Then make `og:image` and `twitter:image` absolute URLs and add `og:url` and a canonical link.
- [ ] Get counsel to review the footer disclaimer (marked `LEGAL REVIEW`), `privacy.html`, `terms.html` and the "bank for robot fleets" tagline. The Terms assume a Texas LLC with disputes heard in Dallas County; change that section if the LLC is formed elsewhere.
- [ ] Replace the fictional founder on the Home page ("Jordan Hale", initials badge, made-up bio, `jordan@daedalus.tech`), marked with a `PLACEHOLDER founder` comment, with the real founder before launch.
- [ ] Turn on Web Analytics in the Vercel project. `index.html` loads `/_vercel/insights/script.js` on any host except localhost; the Privacy page describes it. Check after deploying that each hash page (`#how-it-works` and so on) is counted.
- [ ] Decide on the company name, given the clash above.
- [ ] Check the logo's ownership. The two-heads mark is redrawn from mark #111 in a 1973 book of other companies' trademarks (see `brand-src/README.md`). The founder chose to use it as is; confirm it is free to use before registering it.
- [x] Move the Redaction font out of base64 into `fonts/` (`index.html` went from 222 KB to 157 KB).
