# Insights screen — spec (for Shawn's SwiftUI)

> ⚠️ **This replaces the old "Bill Negotiator" screen.** The negotiator (approve-to-switch)
> was retired — see `CHANGES.md`. This is the successor: a list of **credit-health findings**.

## What the screen is

Each card is a *finding* the AI pulled from Mia's own transactions, mapped to what actually
moves an Australian credit score. There is **no "switch provider"** action and **no brand
the customer doesn't already pay** is recommended.

## Screen flow

```
Insights list  →  expand "How we know this"  →  act (remind / protect / track)  →  card → Done
```

## 1. Header + summary

- Title **Insights**, subtitle `"N patterns to act on"`.
- A panel: *"Every finding is mapped to what actually moves an Australian credit score —
  repayment history, enquiries, limits and defaults. Things that only free up cash are
  labelled **Cash**."*
- Three count chips: **Credit** / **Cash** / **Fees**.

## 2. The card

For each `bills[]` entry (ordered `remind` → `protect` → `track` → `keep` / `no_offer`):

- Head: icon · title · provider·plan, and the current amount right-aligned (tabular figures).
- A **factor chip** (`Credit` navy / `Cash` green / `Fees` amber) + a `finding` one-liner.
- `How we know this` disclosure: `evidence` label/value rows, `why` (why it matters), and
  `advice` (the action line).
- A **neutral source link** where relevant (ACCC market band, or Westpac's own product page).

## 3. Actions (never "approve to switch")

| action_type | Button | Result |
|---|---|---|
| `remind` | **Set a reminder** | Card → "Done: reminder set. On-time repayments are the #1 factor." |
| `protect` | **Protect balance** | Card → "Done: protected balance set. No dishonour fee." |
| `track` | **Track this** | Card → "Done: we're watching. We'll confirm any saving when the debit changes." |
| `keep` / `no_offer` | — | Muted, informational. |

Each action also has a **Dismiss** text button (no award, ledgered so we don't nag again).

## 4. Award

Acting awards the mapped action in `rewards.json` (`reminder_set` 100 / `protected_balance`
60 / `insight_tracked` 40), updates the dragon's XP bar, and can trigger an evolution toast.
