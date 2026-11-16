# Gamification spec — Credit Dragon

How XP, coins, levels and dragon stages work, and why the rules are credit-health-first
(not engagement-farming).

## 1. Design principle

> Rewards only ever come from behaviours that improve **credit health** — paying on time,
> protecting a debit at risk, and holding off new credit. There is **no XP for spending**,
> opening the app, or the volume of transactions.

Every award is **explainable** and **auditable**: it carries a `why_rewards_you` string and
is written to a ledger (see `data-contracts.md` §3). The dragon is a picture of the credit
file's trajectory — it grows from the small habits that feed the slow-moving score.

## 2. Reward table (`data/rewards.json` → `actions`)

| Action | XP | Coins | Cap | Why it rewards you |
|---|---|---|---|---|
| Set a repayment reminder (`reminder_set`) | 100 | 60 | per finding | On-time repayments are the #1 score factor. |
| Protect a debit at risk (`protected_balance`) | 60 | 40 | per finding | Stops a dishonour becoming a black mark. |
| Track a money pattern (`insight_tracked`) | 40 | 20 | per finding | Lets us watch it and confirm any saving. |
| On-time repayment (`on_time_repayment`) | 150 | 100 | 1 / month | Repayment history is the top factor. |
| No new BNPL this month (`no_new_bnpl_month`) | 250 | 150 | 1 / month | Fewer enquiries & debts protects the file. |
| Completed a plan goal (`goal_completed`) | 100 | 60 | per goal | A real step toward credit health. |
| Verified a saving (`saving_verified`) | 120 | 80 | per finding | Awarded only once the debit stops (proven). |
| 4-week savings streak | 200 | 120 | 1 / month | Consistency moves a score. |
| Answered a question | 25 | 10 | 5 / month | Low value, can't be farmed. |
| Shop purchase | 0 | — | — | Cosmetics never earn XP. |

## 3. Levels and stages

- **Levels**: 10 levels at `0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700` XP.
- **Stages**: egg (0) → baby (250) → **teen (800)** → adult (1500). The demo evolves to
  **Teen** mid-journey.

## 4. The integrity mechanic — predicted vs verified

A saving is **potential** when the AI spots it, and **verified** only when the old debit
stops appearing in the customer's own transactions. XP for acting is given for the
*behaviour* (set a reminder, protect a debit), while `saving_verified` is reserved for the
*proof*. Nothing is claimed that isn't observed.

## 5. Dressing your dragon (wardrobe + scenes + food)

- **Hats / shades / scarves** attach to the dragon and scale with its stage (buying = wearing).
- **Homes** change the scene behind it (`Lava Lair` → volcanic, `Starry Cave` → night sky).
- **Food** is repeatable — feeding makes the dragon hop; it tracks a `feeds` counter, never XP.
- The dragon is tappable — it gives a credit-health tip.

All cosmetic, spends coins, never awards XP — the economy stays credit-health-first.

## 6. Demo click-path (lands at 940 XP → Teen dragon)

1. **Score** — see 612, the forecast band, the four factors, BNPL, Westpac's own card.
2. **Insights** — set a reminder (+100), protect the debit (+60), track four patterns (+40×4).
3. **Goals** — complete all three (+100×3). The dragon **evolves to Teen** crossing 800.
4. **Dragon / Shop** — spend ~480 coins (a hat + a cave) and watch it wear them.

Ends at **940 XP · 480 coins · Level 5 · Teen dragon**.
