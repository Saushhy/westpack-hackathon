# Credit Dragon: web prototype (Santiago)

Standalone **HTML + Tailwind** (no framework) prototype of a **credit-score coach**. It reads
Westpac's own transaction data, finds the habits that move an Australian credit score
(borrowed money, on-time payments, debit risk), and rewards acting on them with XP and coins
that grow and dress a dragon. There is no bill switching, and no brand the customer does not
already pay is ever recommended.

It uses the **real Westpac GEL design system**: GEL's own stylesheet, tokens and component
geometry, compiled locally. See `../docs/design-tokens.md` for the mapping.

> The full product reasoning is in **`../CHANGES.md`**.

## Run it

Open `index.html` (double-click). No server, no build, works offline.

- Data loads from `data.js`, generated from `/data/*.json` plus Carlos's transactions.
- Brand logos live in `assets/brands/`, committed so nothing needs the network.
- State persists in `localStorage` (key `credit-dragon:state`).
- The **Dragon** tab has a **Reset demo** button.
- The app runs on a fixed demo clock (`bills.as_of`), so every recording behaves the same.

## Compare against real GEL

Open **`gel-reference.html`** in the same browser. It renders the same components with GEL's
own utility class strings from `WestpacGEL/GEL-next`. If the two pages differ, the app is the
one to fix.

## Rebuild (only after editing source)

```bash
npm install            # once
npm start              # http://localhost:4173, needed for the AR camera only
npm run vendor:gel     # re-download GEL CSS + the Westpac brand font (network)
npm run fetch:logos    # re-download the 9 brand icons into assets/brands (network)
npm run build:dragon   # ../assets/dragon_3d -> assets/dragon/dragon.glb
npm run render:dragon  # dragon.glb -> assets/dragon/baby.png
npm run build:data     # ../data/*.json + transactions -> data.js
npm run build:icons    # assets/gel/icons/*.svg -> icons.js (fill -> currentColor)
npm run build:css      # src/input.css -> styles.css
npm run build          # data + icons + css
```

## Testing

```bash
npm run audit   # 115 headless assertions: GEL tokens, real font, component geometry, logos,
                # sheets, movements, the dash lint, AR, and the whole demo journey
npm run shots   # 12 screenshots into %TEMP%\opencode\cd-shots
```

Both drive the system **Microsoft Edge** (headless) through `playwright-core`, so there is no
browser download. Edit the `EDGE` path in `scripts/*.mjs` if Edge lives elsewhere.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Shell: phone frame, GEL header, tab bar. |
| `gel-reference.html` | Real GEL component markup for side-by-side comparison. |
| `app.js` | State, sheets, gamification logic and rendering. |
| `data.js` | Generated data (do not edit). |
| `icons.js` | Generated inline GEL icons (do not edit). |
| `styles.css` | Compiled Tailwind + GEL (committed, works offline). |
| `src/input.css` | Source: imports GEL theme, then GEL-accurate component classes. |
| `gel/src/css/**` | Verbatim copy of GEL's stylesheet source (`npm run vendor:gel`). |
| `assets/gel/` | Westpac logo and GEL outlined icons. |
| `assets/brands/` | The 9 provider logos Mia actually pays (`npm run fetch:logos`). |
| `assets/dragon/` | `dragon.glb` and the rendered stage portrait (`npm run render:dragon`). |
| `assets/fonts/` | Westpac Bold v2.007 (proprietary, see the note below). |
| `tools/vendor-gel.mjs` | Pulls the GEL CSS and font. |
| `tools/fetch-logos.mjs` | Pulls the brand icons once, picks a real PNG, skips placeholders. |
| `tools/build-dragon.mjs` | OBJ + PBR maps to a single `dragon.glb` (sharp downscales the maps). |
| `tools/render-dragon.mjs` | Renders the GLB in headless three.js to `assets/dragon/baby.png`. |
| `tools/render/` | The render page three.js needs; never loaded by the app. |
| `tools/serve.mjs` | Static server on 4173, so the AR camera has a secure context. |
| `tools/build-data.js` | `data/*.json` + transactions to `data.js`. |
| `tools/build-icons.js` | GEL SVGs to `icons.js`. |

> **Font licence:** `assets/fonts/Westpac-Bold-v2.007` is Westpac's proprietary brand font,
> fetched from westpac.com.au. It is here so the demo renders exactly like the real app for
> this competition entry. Delete the folder and the `brand-fonts.css` import to fall back to
> GEL's system font stack.

> **Logo note:** `assets/brands/` holds each provider's own icon, downloaded once for the
> demo. They are trademarks of those companies and are used only to identify accounts Mia
> already holds.

## Four personas

| Page | Persona | Data source |
|---|---|---|
| `index.html` | Mia, student with BNPL | hand-authored `data/bills.json` + `data/rewards.json` |
| `marcus.html` | Marcus, sole trader | generated from `data/marcus_*.json` |
| `elena.html` | Elena, thin credit file | generated from `data/elena_*.json` |
| `david.html` | David, home buyer | generated from `data/david_*.json` |

`npm run build:personas` reads Carlos's three files per person, converts them into the
schema this app renders, and writes `personas.js` plus the three HTML pages (which are
generated from `index.html`, so they cannot drift from the real shell).

What is converted:

- `credit_score` becomes the score panel. The single `projected_score_after_plan` is turned
  into a **range** with a stated assumption, because nobody can promise points.
- `key_insights` become the Insights cards. `bureau_explanation` is deliberately dropped: it
  is the CCR lecture the team asked us to remove. The `summary` is shown in the sheet.
- `recommended_goals` are not used as-is. The plan is the same three goals for everyone
  (check in daily, pay every credit repayment on time, no new credit for 30 days), because
  credit behaves the same way for everyone. Only the **targets** change, and they come from
  each person's own transaction flags (`credit_repayment`, `late_payment`, `credit_enquiry`,
  `commercial_enquiry`).
- State is saved per persona (`credit-dragon:state:<name>`), so the four demos do not share
  XP or coins.

## Demo click-path (550 → 1020 XP, the egg hatches into the baby dragon)

0. **Welcome** (first run only) → Let's start, a scan built from the real transactions,
   then Carlos's five questions with "Why we ask" and the transactions behind each one.
   Answering all five adds 125 XP and 50 coins. **Not now** skips straight to the app.
   **Replay welcome** on the Dragon tab shows it again.
1. **Score** → 612/1200 (Equifax), forecast 635 to 650, "Your goal: Car loan in 12 months",
   Afterpay and Zip with the next payment date, and "What moves your score" in a sheet.
2. **On open** → the daily check-in lands and the seven-day goal completes: 550 XP, 330 coins.
   Still an egg at that point.
3. **Insights** → six findings, each with a **Review** button that opens a sheet with the
   evidence and one action. Working through them takes you to 1020 XP and 570 coins (setting up the Safety Buffer also opens the Rental application door in **Open Doors** and earns the Golden Key), and the
   egg hatches into the baby dragon at 800 XP.
4. **Goals** → three cards, no buttons. They fill from real payments.
5. **Dragon / Shop** → spend coins on a hat and a cave and watch the dragon wear them.
6. **AR** → "See it in your room": live camera, the dragon drops onto the table, drag it, tap
   it to hear a line built from the customer's own payments.
