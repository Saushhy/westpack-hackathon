# CHANGES — Credit Dragon: from "bill negotiator" to "credit trajectory"

> **Read this first if you're an AI or teammate picking up this branch.**
> Branch: `feat/santiago-credit-trajectory` · Owner: Santiago · Date: Mon 16 Nov 2026

This document records the product pivot agreed in person and the exact data/UI changes
that implement it. It supersedes the old "negotiator" framing in places, but every change
is **additive** — nothing here breaks the JSON contracts Shawn's SwiftUI app reads.

---

## 1. What changed (the pivot)

**Old story:** the AI negotiates your bills down so you save money.
**New story:** the AI predicts your **credit file**, not your bill total.

> **The dragon is a picture of your credit score's trajectory.** Bills and habits are the
> inputs. The bureau score is the ground truth we get checked against.

The problem with the old story: **switching a telco does not move your credit score.** It
frees cash, but the score only responds to *credit conduct*. A Westpac mentor will catch
that in the first minute. The new model separates the three honest outcomes:

| Bucket | What it is | What moves it | Example |
|---|---|---|---|
| **Credit score** | The bureau number (Equifax) | Repayment history, enquiries, limits, defaults | Pay card on time; don't open a 3rd BNPL |
| **Cash freed** | Money kept each month | Cheaper bills / fewer subscriptions | Switching plans, pausing a stream |
| **Fees avoided** | Charges that never happen | Stopping a dishonour before it lands | Gym debit bounced the day before payday |

Blending these three is what made the old demo look like a savings-invention machine.
Separating them is what makes it look like a bank built it.

---

## 2. The data-integrity principle (this is the pitch)

> **The AI never claims a saving. It predicts one, then proves it from your own
> transactions.**

Nothing is claimed that isn't observed. Each saving has a status:

| `savings_status` | Meaning | XP |
|---|---|---|
| `potential` | Above-market / repeated — a *prediction* | 0 |
| `pending` | "We'll watch your debits for 30 days" | 0 |
| `verified` | The old debit stopped appearing — proven | **full award** |
| `lapsed` | The debit came back — no award | 0 |

Only a bank can do this, because only a bank sees both the prediction and the outcome.
The app **scores its own predictions** at the next bureau refresh:

> *"Last check we predicted 600–618. You landed 612. Here's what actually did the work."*

That accountability loop is the defensible, Westpac-only feature.

---

## 3. Where savings come from — three tiers (verified live)

| Tier | Source | Notes |
|---|---|---|
| **1. Westpac transactions** | Recurring debits, repayment timing, dishonours, BNPL | Already built. Zero external dependency. |
| **2. Westpac's own products** | CDR **Product Reference Data** (public, no auth) | **Verified 16 Nov:** `https://digital-api.westpac.com.au/cds-au/v1/banking/products` (list `x-v: 5`, detail `x-v: 7`) returns 65 live products, `lastUpdated` 2026-11-16. Low Rate Card purchase rate **13.74% p.a.** |
| **3. Neutral external benchmark** | AER **Energy Made Easy**, ACCC telecom price monitoring | Brand-free ranges + link out. **Not yet wired** — see §7. |

**The brand rule** (resolves the earlier "should we promote other businesses?" worry):

> **Naming a provider the customer already pays is not promotion — it's their data.
> Naming a provider they don't pay is a recommendation, and that's where sponsor
> conflicts and affiliate optics live.**

So the app freely says "4 Afterpay payments in October" (evidence) but must never say
"switch to Belong" (promotion). The old `offer` blocks in `bills.json` are therefore
marked as **illustrative sample data** for the demo, and the next step is replacing them
with neutral benchmarks (see §7).

---

## 4. Schema changes (all additive)

### `data/bills.json`

New top-level objects (added between `data_notice` and `payday`):

```json
"score": {
  "value": 612, "scale": "equifax_au", "max": 1200,
  "source": "Equifax", "refreshed_at": "2026-11-03",
  "consent": true, "demo_sample": true,
  "forecast": { "range": [635, 650], "horizon_months": 3,
    "assumption": "You keep repayments on time, make no new BNPL applications, and switch two bills.",
    "previous": { "value": 588, "refreshed_at": "2026-08-05",
      "predicted_range": [600, 618], "actual": 612 } }
},
"credit_file": {
  "goal": "Car loan in 12 months", "goal_date": "2027-11-16",
  "bnpl": {
    "providers": [
      { "name": "Afterpay", "facilities": 2, "instalments_due": 3, "next_due": "2026-11-18", "amount_due": 84.50 },
      { "name": "Zip", "facilities": 1, "instalments_due": 1, "next_due": "2026-11-21", "amount_due": 32.00 }
    ],
    "enquiries_6m": 2, "active_facilities": 3,
    "note": "BNPL is credit. It's reported to bureaus and appears on the file lenders see — even though it doesn't feel like a loan."
  },
  "dishonour": {
    "bill_id": "bill_gym", "risk": "high",
    "reason": "A $34 direct debit lands Thursday 19 Nov, one day before payday. It dishonoured last month.",
    "action": "Set a protected balance so the debit clears even before payday."
  }
}
```

New per-bill fields (added to every `bills[]` entry):

| Field | Values | Meaning |
|---|---|---|
| `factor` | `cash` \| `fees` \| `credit` \| `none` | Which bucket the change feeds. Drives the chip on the card. |
| `evidence_tier` | `westpac_transactions` (today) \| `westpac_prd` \| `gov_benchmark` | Where the claim came from. |
| `savings_status` | `potential` \| `none` (today) \| `pending` \| `verified` \| `lapsed` | The prediction → proof state. |

### `data/rewards.json`

New top-level `credit_factors` (the four bureau factors, direction not points) and one new
action:

```json
"credit_factors": [
  { "id": "repayment_history", "label": "Repayment history", "impact": "largest", "direction": "up",   "what": "Pay credit cards, loans and BNPL on time." },
  { "id": "credit_enquiries", "label": "Credit enquiries",   "impact": "small",   "direction": "down", "what": "Every application sits on your file for 12 months." },
  { "id": "limits_debt",      "label": "Limits & debt",      "impact": "moderate","direction": "down", "what": "High limits and balances read as risk to a lender." },
  { "id": "defaults",         "label": "Defaults",           "impact": "severe",  "direction": "down", "what": "Unpaid debts sent to collection stay for years." }
]
```

```json
{ "id": "saving_verified", "label": "Verified a saving", "xp": 120, "coins": 80,
  "cap": { "type": "per_bill" },
  "why_rewards_you": "Awarded only once the old debit stops appearing in your transactions — a saving we can prove, not just promise." }
```

**No fields were renamed or removed.** `offer`, `provider_url`, `savings_monthly` all still
exist, so Shawn's decoder keeps working and the old banner doesn't go blank.

---

## 5. New UI (web prototype)

A new **Score** tab (first in the tab bar) renders, top to bottom:

1. **Score hero** — `612 / 1200`, source `Equifax · updated 3 Nov 2026 · with your consent`,
   plus a **forecast band** `635–650 in 3 months` with its stated assumption.
2. **Three buckets** — Credit score (held) / Cash freed (potential) / Fees avoided.
3. **"Credit you don't see"** — the BNPL panel: Afterpay + Zip facilities, instalments due,
   next-due dates, and `2 credit enquiries in 6 months`.
4. **Factor checklist** — the four factors as direction chips (`↑` / `↓`, impact label),
   not "+X points".
5. **Goal** — `Car loan in 12 months` with the deadline.
6. **Predicted vs actual** — the accountability loop, mocked from `score.forecast.previous`.
7. **Protected balance** — the dishonour forecast with a `Set a protected balance` action.

Bill cards now show a **factor chip** (`Cash` / `Fees`) next to the savings badge, so the
three-bucket split is visible in the negotiator too.

---

## 6. What I deliberately did *not* change

- **The demo journey still lands at 1080 XP → Teen dragon → 600 coins.** The bill approvals
  still award XP so the video's ending number is unchanged. (Later: retire `bill_switch`
  awards in favour of `saving_verified` once the verified-savings mechanic is wired.)
- **The dragon stays emoji/PNG**, interactive (wardrobe / scene / food).
- **Review-before-approve stays.** Every change opens a GEL BottomSheet with a provider link.

---

## 7. Agreed next steps (not yet built — do these as a team)

1. **Replace named `offer` blocks with neutral `benchmark` ranges** (`source_url` → AER /
   ACCC / Westpac PRD). This is the *only* remaining place a non-customer brand is
   recommended. Decision already made in §3 — needs Carlos (source links) + Naomi (copy).
2. **Wire `saving_verified`** to fire when a recurring debit disappears from Carlos's
   `mia_transactions.json`, replacing the current `bill_switch` award.
3. **Split the score layer with Carlos:** Carlos owns the AI-generated *insight text and
   questions*; Santiago owns the factor→action→dragon mapping and forecast display.
4. **Confirm the score scale** (Equifax AU is not the same range as Experian/illion) and the
   current BNPL reporting status before they go on a slide.

---

## 8. Two facts to verify before the slide deck

1. **Equifax score scale** — the three AU bureaus use different ranges; don't reuse another
   bureau's bands, and print the scale (`/1200`) next to the number.
2. **BNPL reporting + the new BNPL credit regime** — which providers report to which bureau,
   and where the Treasury/ASIC rule change currently sits.

*(Both are mocked correctly in the prototype; only the slide's wording must be checked.)*
