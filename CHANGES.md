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
   or Goodlife is their own data. Recommending anyone else is promotion, so we do not. The
   Bill check may suggest *a* cheaper provider against an average, but never names one.
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

### Onboarding: the first run, from Carlos's questions

The web app now opens with the journey the brief always described (AI scan, then
personalised questions) before the tabs. It reads `data/<name>_questions.json`, so all
four personas get their own five questions with no new data.

1. **Welcome.** "Hi Mia. Meet your credit dragon." Three promises: your data stays with
   Westpac, every question says why, nothing happens without you. **Let's start** or
   **Not now** (skips the whole flow).
2. **Scan.** The egg wobbles while four lines tick in. Every number is counted from the
   persona's own transactions: "Reading 100 transactions", "Checking 3 credit repayments,
   1 late", "Finding 10 buy now, pay later payments". Elena gets "No credit repayments
   yet", which is her story.
3. **Questions, one per screen.** Progress dots, an impact chip, the question, a
   **Why we ask** block with the actual transactions behind it (looked up by
   `related_transaction_ids`), the answer options and **Skip this question**.
4. **Done.** How many were answered and the XP and coins earned, then **See my score**.

Rules kept:

- Answering earns the existing `question_answered` action (25 XP, 10 coins, capped at 5 a
  month). Skipping earns nothing. If an answer crosses a stage, the evolution dialog is
  held until the flow ends so it does not interrupt a question.
- Carlos's `impact` sentence is the bureau lecture we took out of the Review sheet, so only
  its level ("High", "Critical") shows, as a chip. "Why am I asking?" is stripped because
  the eyebrow already says it. Dashes in his copy become commas, so the dash lint holds.
- It shows once per persona (`state.onboarded`). Answers are kept in `state.answers`.
  **Replay welcome** on the Dragon tab opens it again; **Reset demo** clears everything.
- `build-data.js` now adds Mia's questions to `data.js`, and looks for her transactions in
  `data/mia_transactions.json` too. On `main` the root copy was gone, so `npm run
  build:data` had stopped working.
- GEL's `check` icon is a cheque, so the onboarding draws its own tick.

Demo numbers: answering all five adds 125 XP and 50 coins (550 to 675 before Insights,
then about 995 after them; the egg still hatches during Insights). Tap **Not now** and the
old 550 to 870 path is unchanged. The audit and screenshot scripts set
`window.CD_SKIP_ONBOARDING` so their journey stays the same, and a new block walks the
onboarding itself. Audit was then **184 assertions**.

### Westpac only acts on Westpac

A service the customer has with another company is their contract with that company.
The bank cannot move a debit date, hold a payment, cancel, switch, negotiate or close
anything outside Westpac. What it can do is move the customer's own money. So when a
payment could fail because the money is not there, the AI now suggests a **Westpac
savings buffer**: top it up on payday, move it across before the debit.

Questions rewritten (Carlos's files, his facts and "why" kept):

| Persona | Was | Now |
|---|---|---|
| Mia q_003 | "Shift this debit to Fridays", "Move my Goodlife debit", "Cancel Goodlife" | Keep a buffer: "Open a Westpac savings buffer and move $40 in each payday" |
| Mia q_005 | "Want your Dragon to negotiate cheaper plans?", "Switch my phone plan" | Set the $217 a month aside in a Westpac bills buffer, or see bills and due dates in one place |
| Marcus qm_005 | "Review refinancing", "Westpac Commercial Asset Finance lower rates" | See how the Toyota loan affects borrowing capacity, reminder before the final repayment |
| Marcus qm_004 | "Flag charges for my bookkeeper" | "Flag personal charges on my business account so I can review them" |
| Elena qe_002 | "Connect utility reporting", "Request refund of my deposit" | Add the on-time payments to her Westpac payment summary, or a reminder so she can ask Origin herself |
| Elena qe_003 | "Switch to a postpaid plan once eligible" | A $21 a month Westpac savings goal so yearly bills are covered |
| David qd_001 | "Close ANZ card" | Lower the Westpac limit only. ANZ is his to change with ANZ |
| David qd_004 | "Optimise", "consolidate telco", "pause streaming", "review health cover" | Set the $876 a month aside in a Westpac bills buffer, or see bills in one place |

Also:

- Mia's gym insight now says **Set up buffer** instead of Protect balance ("Move $40 into a
  savings buffer before Thursday"). Ids (`protect`, `protected_balance`) are unchanged.
- Insight titles and `recommended_goals` that promised outside changes are reworded
  (Elena's deposit "Reclaimable", Mia's "Shift Gym Billing Date", David's "close ANZ").
- All four `*_generate_credit_plan.py` prompts gain a **WESTPAC-ONLY ACTIONS** rule, so
  a regenerated file does not bring these back.
- The audit checks every question in all four files for outside-contract actions, and that
  the gym question offers the savings buffer. Audit is now **189 assertions**.
- Not changed: the iOS app (`ios/CreditDragon`) still has `reschedule_dd` and the bill
  negotiator with switching offers in its own JSON and Swift. Shawn needs to align it.

### Bill check: the bill negotiator, brand-free

For a utility the customer already pays (phone, home internet), the AI compares the
price with an **Australian average** and suggests they **consider a cheaper plan with a
different provider**, without naming or linking one. The Review sheet then shows:

1. **You pay vs Australian average**, with the source of the average.
2. **Potential saving** a month and what it **adds up to** in a year.
3. **Put it toward your debt**: months to clear the debt now vs with the saving, how many
   months sooner, and the interest saved (monthly interest at the card's own rate). If the
   data has no balance, it shows the yearly amount added to the repayment instead.
4. **What it could do for your score**: forecast now vs with this plan, as a range with its
   assumption. The top of the range rises by the AI pipeline's own estimate for its bills
   goal (`estimated_score_delta` in `<name>_insights.json`). "An estimate, not a promise."

| Person | Bill | Pays | Average | Saving | Debt |
|---|---|---|---|---|---|
| Mia | Mobile | $89.00 | $47.00 | $42.00 a month, $504 a year | Flex Card $1,800 (sample) at 19.99%: 14 months to 11, about $51 less interest. Score 635 to 650 becomes 635 to 670 |
| David | NBN 250 | $129.00 | $93.61 (NBN 500, as fast or faster) | $35.39 | Together $42.39 a month, $508.68 a year toward his Westpac Car Loan. Score 830 to 860 becomes 830 to 875 |
| David | Mobile, 4 lines | $195.00 | $188.00 | $7.00 | (as above) |

Averages live in **`data/benchmarks.json`** (brand-free):

- Mobile: Canstar's average Australian phone bill for 2026, about **$47** a month across all
  plan types (prepaid about $30).
- NBN by speed tier: TechRadar's averages from Sept 2025: NBN 25 **$73.11**, 50 **$87.57**,
  100 **$93.34**, 500 **$93.61**, 1000 **$118.18**. NBN 250 is compared with NBN 500,
  which is as fast or faster.

Rules kept:

- No provider is named or linked as a destination. Only the customer's own provider shows,
  because it is their data. The audit fails if another telco's name appears in the sheet.
- A saving stays **potential** until a transaction shows it. Nothing is switched for the
  customer, and the contract stays theirs to change.
- Bills at or below the average get no Bill check. Business plans are skipped, because the
  averages are for households. Mia's internet is her share of a split plan, so it is not
  compared.
- `build-personas.js` builds Bill checks from the transactions (description gives the
  tier and the number of lines, the most common charge is the monthly price, and a 365-day
  prepaid is spread across months). Mia's is in `data/bills.json`.
- Mia's card **balance of $1,800 is a sample** for the demo. The repayment ($150) and the
  rate (19.99% p.a.) come from her data. Replace it with a real balance when one exists.
- The generator prompts now allow this suggestion, on the same terms.
- The insights summary's "Cash you could free" is now **$42.00** for Mia (was $63, which
  came from the old $35 to $45 range and an internet tier change).
- Audit is now **201 assertions**.

**Re-check the averages before you present them.** They are from Canstar and TechRadar
pages read on 17 Nov 2026.

### Open Doors: what your score can open

An idea from a Westpac engineer at the hackathon: the score is a cold number, so show what
it can open in real life, and what opens the next door. A new **Open Doors** card sits on
the Score tab under the goal, and opens a sheet with three parts:

1. **Where you sit.** Equifax's five bands as a ladder (Below average 0 to 459, Average
   460 to 660, Good 661 to 734, Very good 735 to 852, Excellent 853 to 1200), with the
   customer's score, the band their forecast reaches, and "Next: Good at 661, 49 points to go".
2. **Your doors.** Three or four per persona, goal first. Each is **Open**, **Opening** or
   **Not yet**, worked out from checks against the customer's own data: income and rent from
   transactions, late repayments and buy now, pay later from the credit file, the score band,
   and whether they acted on the matching insight. Open when every check passes, Opening when
   at least half do. Every check shows its evidence ("7 rent payments in three months").
3. **What opens it next.** The failing checks link straight to the insight that fixes them,
   and each door can link to the matching Westpac product page ("Explore Westpac car loans").

| Persona | Doors (goal first) |
|---|---|
| Mia | Car loan (Not yet, 1 of 4), Rental application (Opening), Lower rate on your card, First home later on |
| Marcus | Business loan, Equipment finance, Workshop lease renewal (Open) |
| Elena | First credit card, Rental application, Phone plan on contract, First home later on |
| David | Home loan (Opening, 3 of 4), Car loan paid out early (Open), Personal loan for the move |

**Golden Key.** The first time a door opens because of something the customer did, they
earn 150 XP and 60 coins (`door_opened`, once per door) and the **Golden Key**, which the
dragon wears. It shows in the shop as earned, never for sale. A door that is already open on
the first look is a baseline and pays nothing. In Mia's demo, setting up the Safety Buffer
opens her Rental application door.

Rules kept:

- **A guide, never an approval.** Every sheet ends with "A guide, not an approval. Lenders
  decide, and they also look at your income, expenses and full credit report." The audit
  fails on approval wording.
- **No score promised.** The ladder uses the existing forecast range and its condition.
- **Westpac only.** Product links go to westpac.com.au pages only, worded "explore", with no
  rates quoted. The audit fails if another lender is named.
- Data lives in **`data/doors.json`** (bands, products, every persona's doors), built into
  `data.js`. Bands from Equifax's "What is a credit score?" page. Westpac's car loan page
  lists buy now, pay later plans among current debts, which is where Mia's check comes from.

Also:

- The score band pill is now worked out from the score on Equifax's bands, so it always
  matches the ladder. Elena's 530 was labelled "Below Average"; on Equifax's scale it is
  **Average** (her thin file is still explained in her insights).
- Demo numbers: the full Insights journey now ends at **1020 XP and 570 coins** (870 and 510
  plus the Rental door). The egg still hatches during Insights.
- Audit is now **249 assertions**.

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
