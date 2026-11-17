# CHANGES: Credit Dragon, a credit-score coach

> **Read this first if you are an AI or a teammate picking up this branch.**
> Branch: `feat/santiago-credit-trajectory` · Owner: Santiago · Updated Tue 17 Nov 2026

This records the product direction we agreed in person and the exact data and UI that
implements it. It supersedes the earlier "bill negotiator" framing entirely.

---

## 1. What the product is

> **The dragon is a picture of your credit score's trajectory.** It reads Westpac's own
> transaction data, finds the habits that move an Australian credit score (money you have
> borrowed, whether you pay on time, debits that could bounce), and gives you one action at
> a time. Acting on them grows and dresses the dragon.

There is no "switch provider", no promoted brand, and no manual "mark as done".

---

## 2. The rules that shape the UI

1. **No brand the customer does not already pay.** Naming Afterpay, Zip, Vodafone, Netflix
   or Goodlife is their own data. Recommending anyone else is promotion, so we do not.
2. **The AI never claims a saving.** A finding is *potential* until the transaction shows it
   happened.
3. **The score is the ground truth, XP comes from behaviour.** Nobody can promise points, so
   the forecast is a range with a stated assumption, and factors are direction only.
4. **Goals fill themselves.** A goal completes when the data says it happened, never when
   someone taps a button.

---

## 3. The dragon is the real model now

There are **three stages, not four**: egg (0 XP) → baby (800) → adult (1500). The baby is
the model in `/assets/dragon_3d`; the adult model is still to be supplied, so 🐉 stands in.
The demo therefore opens on 550 XP as an **egg**, and the egg hatches into the baby during
the insights journey. "See it in your room" only appears once the dragon exists.

`/assets/dragon_3d` (an OBJ with separate PBR maps and no material file) is assembled into
`web/assets/dragon/dragon.glb` by `npm run build:dragon`. 19,782 triangles, three maps
embedded, 915 kB, all inside the file so it works offline.

- `npm run build:dragon` reads the OBJ, downscales the maps with sharp (base colour and
  normal to 1024, a packed ORM map to 512) and attaches them to the glTF. The source has
  no `.mtl`, so the material is wired by hand. `--src` and `--out` let it build the adult
  from a second object later.
- `npm run render:dragon` renders the model in headless Edge through three.js and writes
  `assets/dragon/baby.png` with a transparent background. The app already looked for that
  filename, so no rendering code ships to the browser.
- Lighting was toned down after the first pass blew the highlights out: Neutral tone
  mapping at 0.82 exposure, key 1.15, rim 0.35, hemisphere 0.32, environment 0.35, plus a
  baked contact shadow so the model sits instead of floating. The tool reports luminance
  and clipping per stage (`lum 139/255, clipping 0.0%`).
- The render fits the wider axis, because the wingspan is wider than the body is tall and
  fitting the height clipped the wings at the frame edge.
- `WEAR_ANCHOR` was re-measured from the alpha silhouette (>200, which excludes the contact
  shadow), so hats, shades and scarves land on the real head.
- The model has **no rig**, so the app wears items at measured offsets and the AR build
  uses transforms only. See `docs/ar-dragon-handoff.md`.

### UI changes in this pass

- **Header**: the help and profile buttons are gone. They did nothing, and a dead control on
  a bank screen is worse than no control.
- **Insights**: the "N patterns to look at" subtitle is gone. "How we know this" is now a
  full-width **Review** button (38px, bordered, soft fill) instead of a text link.
- **What we found**: rebuilt as a flat card with an eyebrow label, three large figures and
  the two dollar totals as tinted tiles, instead of the navy panel header and key/value
  rows.
- **Your plan**: the "1 of 3 done" subtitle and the explanatory note are gone. The cards and
  their self-filling bars carry it on their own.
- **The bureau band** ("Average", "Very Good") now sits inside the score panel, opposite the
  "Credit score" label, instead of under the page title. It describes the number, so it lives
  with the number. Carlos writes Elena's as "Below Average / Thin File"; only the part before
  the slash is shown, because the pill has to stay one line.

### The Review sheet, rebuilt

The user's note: the credit-scoring lecture ("Repayment history is the biggest thing in your
score") was the wrong voice. The advice and the Westpac provenance were the right voice.

- The `why` sentence is **gone** from the sheet. It still exists in `bills.json` and still
  renders on the informational `keep` / `no_offer` cards, which have no action.
- The sheet now opens with a **compact header**: the brand tile, the finding's label, the
  `provider · plan` line, and the amount on the right. It reads like a row from the app that
  expanded, which is the point.
- The evidence sits in a soft grey block with a **"What we saw"** eyebrow.
- The advice is a **callout**, tinted with the hero colour, icon on the left, 16px sentence.
  It is now the loudest thing after the header, because it is the only thing the customer
  has to act on.
- The Westpac line stays at the foot: `Westpac transaction history · 17 Nov 2026`.
- The secondary action reads **Not now** instead of Dismiss.

### The dragon was off centre

Measured, not guessed: the silhouette's bounding box sat at **51.9%** of the frame, with an
11.3% left margin against 7.5% right, because the bounding box includes the wings and the
camera is at a 20° yaw. `tools/render-dragon.mjs` now renders once, measures the opaque
silhouette (alpha > 200, which excludes the contact shadow), pans the camera along its own
right vector by the error, and renders again. The output is **49.9%**, and the tool prints
`centre 51.9% -> 49.9%` on every build.

Audit is now **121 assertions**.

### The dragon speaks, and only from our data

The compliance rule for this build: **no free chat, no generation at runtime.** The
dragon's bubble is composed by `dragonSaid()` in `web/app.js` from `bills.json` and the
saved state, so every line quotes a figure the transaction file proves:

- "Afterpay takes $84.50 on 18 Nov. Keep cash aside for it."
- "Your card payment was 3 days late in October."
- "2 of 4 instalments paid on time."

The audit asserts that the first line matches the real payment, that goal progress is
live, and that no other provider is ever named.

---

### Four personas, one app

Carlos supplied mock data for four people: Mia (student, BNPL, late card), Marcus (sole
trader, ATO, commercial enquiries), Elena (thin file, no credit history) and David ($35k of
limits, wants a mortgage).

- `web/tools/build-personas.js` converts `data/<name>_{transactions,questions,insights}.json`
  into the schema this app already renders, and writes `personas.js` plus `marcus.html`,
  `elena.html` and `david.html`, generated from `index.html` so the shell cannot drift.
- Mia keeps her hand-authored data, because the demo and the audit are tuned against it.
- **`bureau_explanation` is dropped.** That field is the CCR lecture the team asked us to
  remove from the UI. The `summary` is what the Review sheet shows, followed by advice.
- **`estimated_score_delta` and `projected_score_after_plan` are not shown as promises.** The
  projection becomes a range with an assumption, same rule as Mia's forecast.
- The plan is the same three goals for everyone and only the targets change, derived from
  each person's `credit_repayment`, `late_payment` and `*_enquiry` flags. Mia's BNPL goals
  stay, because she is the only person with BNPL.
- State is scoped per persona, so the four demos never share XP.

The Review sheet also lost the credit-scoring lecture and gained a `detail` paragraph, which
is where a persona's own `summary` lands.

### Credit accounts, with the institution's own logo

The Score tab used to show BNPL only. It now lists **every credit facility the person
actually repays**, because that is what a lender sees:

| Person | Accounts |
|---|---|
| Mia | Westpac Credit Card (late), Afterpay, Zip |
| Marcus | Westpac Credit Card (late), Toyota Finance loan, business overdraft |
| Elena | none, which is the point of her persona |
| David | Westpac Credit Card, Westpac Car Loan, ANZ |

- Rows come from transaction flags, not a hand-written list: `bnpl`, `credit_repayment`,
  `credit_facility`, `late_payment`. A bureau search (`*_enquiry`) is deliberately excluded,
  because an enquiry is not an account.
- Each row carries the institution's own mark on a white tile: the Westpac W for Westpac
  products, fetched logos for Afterpay, Zip, Toyota, ANZ and Plenti. `fetch-logos.mjs` now
  decodes BMP-only `.ico` files, which is how ANZ is served.
- `monthly` is the average commitment over the transaction window, so the row reads
  `$5,519/mo` for Marcus and `$91.67/mo` for Mia. The list sorts by it.
- `status` drives a chip: amber **Late**, green **On time**.
- Elena gets a written empty state instead of a blank list: "Nothing to repay yet. That is
  why your file is thin, and why the first small limit matters."
- Tapping any row opens the movements sheet filtered to that institution.

Audit is now **140 assertions**, including the four persona pages.

### One disclosure component, used everywhere

The score tab's pattern (title and number up front, explanation on demand) is now the rule
for the whole app. There is a single `<details>` component, `.gel-disc`, with a soft circular
plus that rotates into a cross:

| Where | What moved behind it |
|---|---|
| How your score is built | each factor's explanation, at large type |
| Your plan | "Why this one", the goal's description |
| Shop | "What it is", the item blurb that used to sit under every tile |

Also removed: the `why` sentence on the informational Spotify and rent cards. Those cards now
carry a label, a provider line, an amount and a status badge, and nothing else. The activity
log on the Dragon tab already used a disclosure and is unchanged.

The reason this matters beyond tidiness: with the paragraphs gone, the main screens read as
numbers and actions instead of essays, which is what made the score tab feel designed rather
than generated.

Audit is now **165 assertions**.

## 4. What changed before that (v3)

### Deleted
- **Low Rate Card panel** and the `westpac_products` array. It read as an advert with no
  clear purpose.
- **"Last check" predicted-vs-actual block**, plus `score.forecast.previous`.
- **"A debit is at risk" block** on the Score tab. It duplicated the gym finding in Insights.
- **The three-bucket strip** (score / cash / fees). The big score panel does that job better.
  The two dollar figures moved into the Insights summary.
- **Every "mark done" / "complete goal" button.** Goals are computed.

### Added
- **Real brand logos** in `web/assets/brands/` (9 files), fetched once by
  `npm run fetch:logos` and committed so the prototype still works offline. `adorn()` prefers
  the logo and falls back to the GEL icon when a file is missing.
- **Movements sheet.** Tapping Afterpay or Zip lists the real payments from Carlos's
  transaction file, grouped by month with subtotals.
- **Self-filling goals**, three of them, each driven by a real signal.
- **A generic slide-up sheet** (`openSheet`) used by every detail view.
- **Daily check-in** on boot (`daily_checkin` 10 XP, `checkin_week` 120 XP).

### Rewritten
- **All user-facing copy.** No em dashes or en dashes anywhere in the app, one idea per
  sentence, `why` under about 14 words. The audit fails the build if a dash comes back.
- **BNPL rows** now read `Next payment $84.50 on 18 Nov` instead of `2 facilities · 3 due`.

---

## 7. Where the data comes from

| Tier | Source | In the app |
|---|---|---|
| 1. Westpac transactions | Recurring debits, repayment timing, dishonours, BNPL | Every finding's `evidence`, and the movements sheets |
| 2. Neutral benchmark | ACCC price monitoring (brand-free range, link out) | The phone finding's `benchmark` |

Tier 2 (Westpac's own CDR product data) is no longer shown in the UI. The endpoint is
recorded here for later: `GET https://digital-api.westpac.com.au/cds-au/v1/banking/products`
(list `x-v: 5`, detail `x-v: 7`).

---

## 6. Schema

### `data/bills.json`
- `score` is now `{ value, scale, max, source, refreshed_at, consent, demo_sample, forecast:
  { range, horizon_months, assumption } }`. No `previous`.
- `credit_file.bnpl.providers[]` gained `logo`, `match` (regex for the transactions),
  `paid_on_time`, `instalments_cycle`, `plans`. `bnpl` also has `last_facility_date`.
- `totals.fees_avoided` added (was a hardcoded fallback in `app.js`).
- `bills[]` entries gained `logo` and `provider_match`, and lost `offer`, `risk_notes` and
  `requires_approval` where they were noise.
- `westpac_products` and `recommendations` are gone.

### `data/rewards.json`
- `starting_state.checkins[]` seeds six days so the seventh (demo day) completes the week.
- New actions: `daily_checkin` (10 XP), `checkin_week` (120 XP).
- `goals[]` are now `{ id, title, description, xp, coins, source, target, unit, watching,
  next_check }` where `source` is `checkin` / `bnpl_on_time` / `no_new_bnpl`.

---

## 7. The demo journey

1. **Score**: 612/1200 Equifax, forecast 635 to 650, "Your goal: Car loan in 12 months",
   Afterpay and Zip with next payment dates, and a "What moves your score" sheet.
2. **Opening the app** records the daily check-in, which completes the seven-day goal:
   **550 XP, 330 coins** before you touch anything.
3. **Insights**: six findings, each opening a sheet with the evidence and one action.
   Acting on all six takes you to **870 XP and 510 coins**, and the dragon **evolves to Teen**
   in the middle of them (it crosses 800).
4. **Goals**: 1 of 3 done. The other two sit at 2 of 4 instalments and 27 of 30 days, and
   will complete themselves when the payments land.
5. **Dragon and Shop**: spend coins on a hat and a cave and watch it wear them.

The old "1080 XP / 600 coins / $92.99 saved" numbers are retired. There is no switching total.

---

## 7. Still to do as a team

1. **Carlos** owns the insight text and questions. Santiago owns the factor to action to
   dragon mapping. Confirm the split.
2. **Carlos's transaction file** still lives at the repo root as `mia_transactions.json`.
   `build-data.js` reads it from either the root or `/data/transactions.json`, so moving it is
   safe whenever he is ready.
3. **Verify before the slide**: the Equifax score scale, and the current BNPL reporting rules.
4. **Naomi's dragon and shop PNGs** are still pending. The emoji is the designed fallback.

---

## 8. How to see it

Open `web/index.html` by double-click, or look at `%TEMP%\opencode\cd-shots`.
From `web/`: `npm run audit` (89 assertions) and `npm run shots`.
