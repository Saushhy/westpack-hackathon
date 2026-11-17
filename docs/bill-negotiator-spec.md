# Insights screen: spec for Shawn's SwiftUI

> This replaces the old Bill Negotiator screen. See `CHANGES.md`. There is no
> approve-to-switch flow and no recommended brand.

## What the screen is

A list of **credit-health findings** the AI pulled from Mia's own transactions, mapped to
what actually moves an Australian credit score. The card stays short. Tapping it opens a
sheet with the evidence and the one action.

## Screen flow

```
Insights list  →  "How we know this"  →  bottom sheet (evidence + why + action)  →  Done
```

## 1. Header and summary

- Title **Insights**, subtitle `"N patterns to look at"`.
- Summary panel: three counts (`affect your score`, `free up cash`, `avoid a fee`), then two
  rows for the money: **Cash you could free** (`$63.00 a month`, green) and **Fees you could
  avoid** (`$19.00 a month`).
- One closing line: "Repayment history matters most. Everything else is smaller."

## 2. The card

- Head: brand logo tile (or GEL icon), title, `provider · plan`, current amount on the right.
- A factor chip (`Credit` navy / `Cash` green / `Fees` amber) and the one-line `finding`.
- A **How we know this** row that opens the sheet.
- No action button on the card. The action lives in the sheet, which keeps the list calm.

## 3. The sheet (GEL BottomSheet)

Slides up from the bottom, rounded top corners (12px), black/65 backdrop, close button, tap
outside or Escape to dismiss.

Contents, in order:

1. `evidence` rows (`k` muted left, `v` bold right, hairline between).
2. `why`, one sentence on why it matters to the score.
3. `advice`, one short line, in the warning colour.
4. A neutral source link when there is one (ACCC market band, or the customer's own provider).
5. A verified line: `Westpac transaction history · 17 Nov 2026`.
6. Actions: the primary button (**Set a reminder** / **Set up buffer** / **Track this**),
   then a **Dismiss** text button.

## 4. After acting

The card switches to a Done state with a short confirmation:

| action_type | Done copy |
|---|---|
| `remind` | "Reminder set. Your next repayment should land on time." |
| `protect` | "Savings buffer set. $40 moves in on payday, ready for Thursday." |
| `track` | "We're watching this and will report back." |

Awards: `reminder_set` 100 XP / 60 coins, `protected_balance` 60 / 40, `insight_tracked`
40 / 20. Acting can also complete a goal, which shows one combined toast.

## 5. Status cards

`keep` (Spotify) and `no_offer` (rent) render muted and informational: reason only, no
button, no sheet.
