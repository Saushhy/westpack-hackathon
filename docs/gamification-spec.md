# Gamification spec: Credit Dragon

How XP, coins, levels and dragon stages work, and why every rule is credit-health-first.

## 1. Design principle

> Rewards only ever come from behaviours that improve **credit health**: paying on time,
> protecting a debit at risk, and holding off new credit. There is no XP for spending.

Every award is explainable and auditable. It carries a `why_rewards_you` string and is
written to a ledger (see `data-contracts.md` §3).

## 2. Reward table (`data/rewards.json` → `actions`)

| Action | XP | Coins | Cap | Why it rewards you |
|---|---|---|---|---|
| Daily check-in (`daily_checkin`) | 10 | 10 | one per day | Tiny on purpose. It cannot be farmed. |
| Seven days in a row (`checkin_week`) | 120 | 60 | once per 7-day window | A week of checking turns awareness into habit. |
| Set a repayment reminder (`reminder_set`) | 100 | 60 | per finding | The step that makes an on-time payment happen. |
| Protect a debit at risk (`protected_balance`) | 60 | 40 | per finding | Stops a dishonour becoming a black mark. |
| Track a money pattern (`insight_tracked`) | 40 | 20 | per finding | Lets us watch it and confirm what happens. |
| Completed a plan goal (`goal_completed`) | 100 | 60 | per goal | Only fires when the data says it happened. |
| On-time repayment (`on_time_repayment`) | 150 | 100 | 1 per month | Repayment history is the biggest factor. |
| No new BNPL this month (`no_new_bnpl_month`) | 250 | 150 | 1 per month | Fewer enquiries and less debt. |
| Verified a saving (`saving_verified`) | 120 | 80 | per finding | Reserved for a saving proven by transactions. |
| Shop purchase | 0 | spend | none | Cosmetics never earn XP. |

## 3. Levels and stages

- **Levels**: 10 levels at `0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700` XP.
- **Stages**: egg (0) → baby (250) → **teen (800)** → adult (1500).

## 4. Goals fill themselves

There are no goal buttons in the app. `syncGoals()` reads a real signal and completes the
goal, and the XP follows:

| Goal | Signal | Target |
|---|---|---|
| Your dragon checks your file daily | `state.checkins` inside the last 7 days | 7 |
| Pay every Afterpay and Zip on time | `bnpl.providers[].paid_on_time` | cycle total |
| Go a month without new BNPL | days since `bnpl.last_facility_date` | 30 |

Because only real payments can move goals 2 and 3, they sit at 2 of 4 and 27 of 30 during
the demo. That is the point: the bar does not lie.

## 5. Dressing your dragon (wardrobe, scenes, food)

- **Hats, shades and scarves** attach to the dragon and scale with its stage.
- **Homes** change the scene behind it (`Starry Cave` → night sky, `Lava Lair` → volcanic).
- **Food** is repeatable and counts `feeds`. It never awards XP.
- The dragon is tappable and answers with a credit-health line.

## 6. Demo click-path (550 → 870 XP, Teen dragon)

1. **Score**: 612/1200 Equifax, forecast 635 to 650, the goal card, Afterpay and Zip with
   next payment dates, the factors sheet.
2. **On open** the daily check-in and the seven-day goal land: **550 XP, 330 coins**.
3. **Insights**: six findings, each opening a sheet with evidence and one action. All six
   take you to **870 XP, 510 coins**, and the dragon evolves to **Teen** partway through.
4. **Goals**: 1 of 3 done, the other two honestly in progress.
5. **Dragon and Shop**: spend coins on a hat and a cave and watch it wear them.
