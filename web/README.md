# Credit Dragon — web prototype (Santiago)

Standalone **HTML + Tailwind** (no framework) prototype of the **bill negotiator** and
**gamification** (XP, coins, levels, dragon stages, shop). Designed to look like Westpac
using their real GEL token values.

## Run it

Just open `index.html` (double-click). No server, no build, works offline.

- Data loads from `data.js` (auto-generated from `/data/*.json`).
- State persists in `localStorage` (key `credit-dragon:state`).
- The **Dragon** tab has a **Reset demo** button.

## Rebuild (only after editing source)

```bash
npm install            # once
npm run build:data     # regenerate data.js from ../data/bills.json + ../data/rewards.json
npm run build:css      # recompile Tailwind: src/input.css -> styles.css
npm run build          # both
```

## Structure

| File | Purpose |
|---|---|
| `index.html` | Shell: phone frame, header, tab bar. |
| `app.js` | State + gamification logic + rendering. |
| `data.js` | Generated data (do not edit). |
| `styles.css` | Compiled Tailwind (committed, works offline). |
| `src/input.css` | Tailwind source: GEL tokens + theme + component classes. |
| `gel/tokens.css` | Westpac GEL tokens (vendored, attribution in header). |
| `tools/build-data.js` | `data/*.json` → `data.js`. |
| `assets/` | Dragon + shop art (falls back to emoji if missing). |

## Demo click-path (lands at 1080 XP → Teen dragon)

1. **Bills** → approve phone switch, internet switch, cancel Stan, cancel Disney+, reschedule gym.
2. **Goals** → complete "Cut $90+ bills", "Pay card on time", "No new BNPL".
3. **Dragon** → watch it evolve to Teen at 800 XP, then hit Level 6.
4. **Shop** → spend the ~600 coins (e.g. Lava Lair + Feast).
