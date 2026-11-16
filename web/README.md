# Credit Dragon — web prototype (Santiago)

Standalone **HTML + Tailwind** (no framework) prototype of a **credit-score coach** — it
reads Westpac's own transaction data, finds the habits and patterns that move an Australian
credit score (borrowed money, on-time payments, debit risk), and rewards acting on them
with XP/coins that grow and dress a dragon. There is **no bill-switching** and **no brand
the customer doesn't already pay** is recommended.

It is styled with the **real Westpac GEL design system** — GEL's own stylesheet, tokens and
component geometry, compiled locally. See `../docs/design-tokens.md` for the full mapping.

> The full product pivot is documented in **`../CHANGES.md`**.

## Run it

Just open `index.html` (double-click). No server, no build, works offline.

- Data loads from `data.js` (auto-generated from `/data/*.json`).
- State persists in `localStorage` (key `credit-dragon:state`).
- The **Dragon** tab has a **Reset demo** button.

## Compare against real GEL

Open **`gel-reference.html`** in the same browser. It renders the same components using GEL's
**own utility class strings** copied from `WestpacGEL/GEL-next`. If a component looks different
between the two pages, the app is the one to fix.

## Rebuild (only after editing source)

```bash
npm install            # once
npm run vendor:gel     # re-download GEL CSS + the Westpac brand font (network)
npm run build:data     # ../data/bills.json + ../data/rewards.json -> data.js
npm run build:icons    # assets/gel/icons/*.svg -> icons.js (fill -> currentColor)
npm run build:css      # src/input.css -> styles.css
npm run build          # data + icons + css
```

## Testing

```bash
npm run audit   # 65 headless assertions: GEL tokens, real font loaded, component geometry,
                # icons, overflow, contrast, score + insights tabs, and the full demo journey
npm run shots   # screenshots each screen into %TEMP%\opencode\cd-shots
```

These drive the system **Microsoft Edge** (headless) via `playwright-core`, so no browser
download is needed. Edit the `EDGE` path in `scripts/*.mjs` if Edge lives elsewhere.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Shell: phone frame, GEL header, tab bar. |
| `gel-reference.html` | Real GEL component markup for side-by-side comparison. |
| `app.js` | State + gamification logic + rendering. |
| `data.js` | Generated data (do not edit). |
| `icons.js` | Generated inline GEL icons (do not edit). |
| `styles.css` | Compiled Tailwind + GEL (committed, works offline). |
| `src/input.css` | Source: imports GEL theme, then GEL-accurate component classes. |
| `gel/src/css/**` | Verbatim copy of GEL's stylesheet source (`npm run vendor:gel`). |
| `gel/brand-fonts.css` | `@font-face` for the real Westpac Bold face. |
| `assets/gel/` | Westpac logo + GEL outlined icons. |
| `assets/fonts/` | Westpac Bold v2.007 (proprietary — see note below). |
| `tools/vendor-gel.mjs` | Pulls GEL CSS + font. |
| `tools/build-data.js` | `data/*.json` → `data.js`. |
| `tools/build-icons.js` | GEL SVGs → `icons.js`. |

> **Font licence:** `assets/fonts/Westpac-Bold-v2.007` is Westpac's proprietary brand font,
> fetched from westpac.com.au. It is here so the demo renders exactly like the real app for
> this competition entry. Delete the folder and the `brand-fonts.css` import to fall back to
> GEL's system font stack.

## Demo click-path (lands at 940 XP → Teen dragon)

1. **Score** → 612 / 1200 (Equifax), forecast 635–650, the four factors, BNPL "credit you
   don't see", Westpac's own Low Rate Card, predicted-vs-actual, protected balance.
2. **Insights** → act on 6 findings: set a reminder (card), protect balance (gym), track ×4.
3. **Goals** → complete all three; the dragon **evolves to Teen** crossing 800 XP.
4. **Dragon / Shop** → spend ~480 coins (a hat + a cave) and watch the dragon wear them.
