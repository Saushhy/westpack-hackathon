# CHANGES — Credit Dragon: a credit-score coach, not a bill negotiator

> **Read this first if you're an AI or teammate picking up this branch.**
> Branch: `feat/santiago-credit-trajectory` · Owner: Santiago · Date: Mon 16 Nov 2026

This records the product direction we agreed in person and the exact data/UI that implements it.
It supersedes the earlier "bill negotiator" framing entirely.

---

## 1. What this product is now (in one breath)

> **The dragon is a picture of your credit score's trajectory.** It reads Westpac's own
> transaction data, finds the habits and patterns that move an Australian credit score —
> money you've borrowed (BNPL, cards, loans), whether you pay on time, and debit-risk that
> could become a black mark — then gives you one action at a time. Acting on them earns XP
> and coins, which grow and dress the dragon. **There is no "switch provider" and no brand
> you don't already pay is ever recommended.**

The tool is **not** a financial advisor and **not** a telco/energy broker. It is a
credit-health coach that shows you your own file and helps you improve it.

---

## 2. The honest rule that shapes everything

> **We don't predict your credit score. We predict your credit *file*.** The score is just
> what the bureau says about it.

Three buckets, never blended:

| Bucket | What it is | What moves it | In the app |
|---|---|---|---|
| **Credit score** | The bureau number | Repayment history · enquiries · limits · defaults | Score tab: score, factors, BNPL, reminders |
| **Cash freed** | Money kept each month | Cheaper bills / fewer subscriptions | Insights labelled **Cash** |
| **Fees avoided** | Charges that never happen | Stopping a dishonour | Insights labelled **Fees** (protected balance) |

And the data-integrity loop:

> **Nothing is claimed that isn't observed.** A saving starts as *potential*, becomes
> *verified* only when the old debit stops appearing in transactions, and only then earns
> the full `saving_verified` award.

---

## 3. The brand rule (the fix for "should Westpac promote other businesses?")

> **Naming a provider the customer already pays is not promotion — it's their own data.
> Naming a provider they don't pay is a recommendation, and that's where sponsor conflicts
> and affiliate optics live.**

**This is now fully implemented.** The old "switch to Belong" offer is gone. The phone
finding is a neutral **market band** (`$35–$45`, ACCC), linked to a neutral source, with the
advice *"we don't pick a provider for you — check it yourself."* Every brand shown in the
app is one Mia already transacts with (Vodafone, Netflix, Afterpay, Goodlife), or Westpac
itself.

---

## 4. Where the data comes from — three tiers (tier 2 + 3 are wired now)

| Tier | Source | In the app |
|---|---|---|
| **1. Westpac transactions** | Recurring debits, repayment timing, dishonours, BNPL | Every finding's `evidence` rows |
| **2. Westpac's own products** | CDR **Product Reference Data** (public, no auth) | `westpac_products` — Low Rate Card **13.74% p.a.**, live endpoint verified |
| **3. Neutral benchmark** | ACCC / AER (brand-free ranges, link out) | Phone finding's `benchmark` |

Westpac PRD endpoint (verified live): `GET https://digital-api.westpac.com.au/cds-au/v1/banking/products`
(list `x-v: 5`, detail `x-v: 7`) → 65 products, `lastUpdated` 2026-11-16.

---

## 5. Schema (what changed)

### `data/bills.json`
- `score` — the bureau score anchor + forecast (range + assumption + previous, for the
  predicted-vs-actual loop).
- `credit_file` — the goal, BNPL panel, dishonour risk.
- `westpac_products[]` — Westpac's own products (tier 2).
- `bills[]` — now **findings**, each with:
  - `factor` → `credit` / `cash` / `fees` / `none` (the three-bucket chip)
  - `action_type` → `remind` / `protect` / `track` / `keep` / `no_offer` (**no more
    `switch` / `cancel` / `reschedule`**)
  - `advice` → the one action-oriented line
  - `evidence_tier` → `westpac_transactions` / `gov_benchmark` / `westpac_prd`
  - `benchmark` (phone only) → neutral market band + source link
- `recommendations` → `[]` (the streaming "keep one" mechanic was removed; streaming is a
  single `track` finding).

### `data/rewards.json`
- `credit_factors[]` — the four bureau factors (direction, not points).
- Actions replaced: `bill_switch` / `bill_cancel` / `bill_reschedule` → `reminder_set` (100)
  / `protected_balance` (60) / `insight_tracked` (40). `saving_verified` (120) retained.
- Goals re-aimed at credit health: pay card on time, protect a debit at risk, no new BNPL.

---

## 6. The demo journey (new numbers)

1. **Score** — 612 / 1200 (Equifax, consent-gated), forecast 635–650, the four factors,
   BNPL "credit you don't see", Westpac's own Low Rate Card, predicted-vs-actual.
2. **Insights** — act on 6 findings: *set a reminder* (card), *protect balance* (gym),
   *track* ×4 (BNPL, phone, internet, streaming).
3. **Goals** — complete the 3 goals; the dragon **evolves to Teen** crossing 800 XP.
4. **Dragon / Shop** — spend coins on a hat / cave, see the dragon wear it.

**Ends at 940 XP · 480 coins · Level 5 · Teen dragon.** (The old "1080 XP / 600 coins /
$92.99 saved" numbers are retired — there is no bill-switching total anymore.)

---

## 7. Still to do as a team (not built)

1. **Split the score layer with Carlos** — Carlos owns the AI-generated *insight text and
   questions*; Santiago owns the factor→action→dragon mapping and forecast display.
2. **Fill `detected_from`** on `bill_card` and `bill_bnpl` — they're placeholders until
   Carlos maps them to real transaction ids.
3. **Verify before the slide**: (a) the Equifax score scale (differs from Experian/illion —
   print `/1200` next to it), (b) current BNPL reporting + the new BNPL credit regime.

---

## 8. How to see it

Open `web/index.html` (double-click, works offline) or the screenshots in
`%TEMP%\opencode\cd-shots`. Run `npm run audit` (65 assertions) and `npm run shots` from `web/`.
