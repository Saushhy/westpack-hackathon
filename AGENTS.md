# Westpac Innovation & Coding Competition 2026: Team Brief

**Team:** Shawn · Carlos · Santiago · Naomi
**Working title:** *Credit Dragon* (placeholder, rename as a team)
**Theme:** "AI and what it means for banking" (open challenge)
**Last updated:** Mon 16 Nov 2026

---

## 1. Key dates and logistics

| When | What |
|---|---|
| **Mon 16 Nov, 10:00am–3:00pm** | Day 1 build (Griffith Gold Coast, G23 labs). Lunch 12–1 (not provided) |
| **Tue 17 Nov, 10:00am–3:00pm** | Day 2 build + record video |
| **Tue 17 Nov, 4:00pm HARD DEADLINE** | Submission email received by **GoldCoastEngineeringHub@westpac.com.au**. Nothing accepted after 4pm |
| **Thu 19 Nov, by 2:00pm** | Westpac tells shortlisted teams |
| **Fri 20 Nov, 9:30am–1:30pm** | Awards Day, Westpac Gold Coast Engineering Hub, 3168 Surfers Paradise Blvd. Shortlisted teams get **5 minutes** to present live. Must attend in person |

**Shawn has an interview Mon 16 Nov 2:15pm.** He is away from about 2:10pm until the end of Day 1. Plan around it.

Westpac mentors are in the room on both days. Use them to validate ideas, check banking assumptions (credit reporting, BNPL, hardship) and get feedback on the demo.

---

## 2. How we're judged (and what that means for us)

| Criterion | Weight | What it means for us |
|---|---|---|
| Innovation | 25% | Not "another budgeting app". The AI-personalised questions + autonomous bill negotiator + a pet that grows with your credit health is the novel combo |
| Creativity | 25% | The Westpac dragon mascot, gamification, AR. This is where we win the room |
| Feasibility | 20% | Uses data Westpac **already has** (its own transaction history). Clear path to ship. Opt-in, explainable, user approves every action |
| Impact | 20% | Credit health affects rent, car loans, mortgages. Young people + BNPL users are the target |
| Technical excellence | 10% | Lowest weight. Mock data and hard-coding are explicitly fine per the handbook. Show *one* real AI call so it's genuine |

**Takeaway:** ~50% of marks are idea + creativity. Polish the *story and experience*, not the backend. The handbook says: *"if you need to hard code some things to get your solution working, that won't be judged negatively."*

### What past winners did
- **2024 Westpac 1st place (team PacMan, Griffith):** VR bank + AI financial advisor + accessibility (sign-language translation, eye tracking, voice).
- **2024 Westpac 2nd place (VisBank):** mixed-reality visualisation of customer goals and Westpac products.
- **Pattern:** a novel *interaction* (VR/MR/AR) + a clearly defined user + a working demo of one story beats a generic chatbot. Our AR dragon follows this pattern.

---

## 3. The idea

### One-liner
> **Your Westpac dragon grows as your credit health does.** An AI inside the Westpac app reads your transactions, asks you a few smart questions, cuts your bills for you, and rewards good credit habits by levelling up your pet dragon.

### The problem
- Many people (especially young people, students, first-jobbers) don't know what actually affects their credit score.
- Buy-now-pay-later (Afterpay, Zip etc.), late card repayments, dishonoured direct debits and too many credit applications quietly hurt their credit profile.
- Budgeting apps are boring and people drop them. Advice is generic, not personal.
- *(Naomi: find 1–2 real stats from a credible source, e.g. Equifax, ASIC Moneysmart, ACCC. **Do not make up numbers.**)*

### Important framing (judges WILL check this)
Spending less does **not** directly raise your credit score. Australian credit bureaus (Equifax, Experian, illion) mainly look at:
- **Repayment history**: paying credit cards, loans and BNPL on time
- **Credit enquiries**: how many times you've applied for credit recently
- **Credit limits and debt levels**
- **Defaults**: unpaid debts sent to collection

*(Verify the exact factors on Equifax's own site before putting them on a slide.)*

So our pitch is: **the app frees up cash (cheaper bills, less overspending) so you can make every repayment on time, pay down debt and avoid new credit.** Reward those behaviours most.

### Why Westpac (feasibility hook)
- The AI lives **inside the Westpac app** and uses Westpac's own data: transaction history, card/loan repayments, direct debits to BNPL providers, recurring bills, overdrafts and dishonours.
- External data (other banks) only if the customer connects it via **Open Banking (CDR)**.
- Credit score shown only if the customer opts in to share it.
- **Human in the loop:** the AI explains every insight ("Why am I asking? You made 4 Afterpay payments in October") and the customer approves every action (e.g. switching plans). Nothing happens automatically.

### User journey (this IS the demo)
1. **AI scan:** "Your dragon is studying your last 3 months…" animation. AI analyses transactions.
2. **Personalised questions:** 4–5 cards based on what it found, e.g.
   - "You paid Afterpay 4 times in October. Were these planned purchases?"
   - "Your card repayment was 3 days late on 12 Oct. Would a reminder or autopay help?"
   - "You have Netflix, Stan and Disney+. Do you watch all three?"
   - "A direct debit to your gym bounced last month. Want to move the date to after payday?"
   Each card shows **why** it's asking. User can skip any.
3. **Credit health plan:** 3 personalised goals, e.g. pay card on time, no new BNPL this month, cut $X/month in bills.
4. **Bill negotiator:** AI finds cheaper plans (phone, internet, energy, streaming). User taps **Approve** → mock confirmation "Switched! Saving $25/month."
5. **Dragon grows:** completing goals earns **XP + coins**. Dragon evolves (egg → baby → teen → adult). Coins buy items for the dragon (hats, food, a lair).
6. **AR moment:** tap "See your dragon" → dragon appears on the table through the camera, plays a level-up animation.
7. **(Pitch idea)** Coins could also unlock real Westpac perks, e.g. bonus savings interest or a small rate discount. This gives Westpac a real business reason to build it.

### Demo persona
**"Mia", 21, uni student, part-time job.**
- 2–3 Afterpay/Zip debits per month
- One late credit card repayment
- One dishonoured direct debit (gym)
- Overlapping streaming subs (Netflix, Stan, Disney+, Spotify)
- Expensive phone plan
- Payday fortnightly

---

## 4. Scope: what's real vs mocked

| Piece | Real or mock? |
|---|---|
| iOS app UI (SwiftUI) | **Real** |
| AR dragon (ARKit/RealityKit) | **Real** |
| Transaction history | **Mock** (`transactions.json`) |
| AI questions | **Mock in-app** (`questions.json`), but generated once by a **real LLM call** (Carlos) that we show in the video |
| Bill negotiator offers | **Mock** (`bills.json`) |
| Plan switching | **Mock** (confirmation screen only) |
| Credit score | **Mock** number that moves with goals |
| Gamification (XP, coins, levels, shop) | **Real logic, local data** |
| Backend / auth / real bank APIs | **Not built** |

"AI scanning your transactions" is shown as an animated screen in-app. The honest backup is Carlos's script that really does it, shown in the video.

---

## 5. Tech stack

- **iOS app:** Swift + SwiftUI, Xcode. Local JSON bundled in the app (no backend needed).
- **AR:** ARKit + RealityKit (`ARView`, horizontal plane detection, tap to place). Dragon model in **USDZ** (free rigged model from Sketchfab or Apple's Reality Composer / sample assets; convert with Reality Converter if needed).
- **AI (real call):** Python script (or tiny FastAPI endpoint) → LLM API (whichever key the team has) → reads `transactions.json` → outputs `questions.json` + credit insights. The prompt includes the credit-score factors from section 3.
- **Design:** Figma. Westpac's design system **GEL** (https://github.com/WestpacGEL/GEL-next) has native iOS colour tokens at `packages/style-config/src/tokens/ios/wbc/` (Westpac red `#DA1710`, navy `#1F1C4F`). Use those so it looks like a real Westpac app.
- **Optional web piece:** if anyone builds a web prototype, `@westpac/ui` + `@westpac/style-config` give real Westpac React components (Tailwind).
- **Repo:** one GitHub repo, folders `/ios`, `/ai`, `/data`, `/docs`. Commit often.
- **Video:** screen recording (QuickTime/iPhone screen record) + face-cam, edit in CapCut/iMovie, upload to YouTube as **Unlisted**.

---

## 6. Roles

### Shawn: iOS app + AR dragon
- SwiftUI app with these screens:
  1. AI scanning animation
  2. Question cards (swipe/answer/skip, show "why")
  3. Credit health plan (3 goals, mock score)
  4. Bill negotiator list + Approve flow + confirmation
  5. Dragon home (level, XP bar, coins, evolution stage)
  6. Dragon shop (spend coins on items)
  7. AR view (place dragon, level-up animation)
- Load all data from Carlos's and Santiago's JSON files.
- Apply Westpac GEL colours.
- **Priority before 2:10pm today:** get the dragon placing on a table in AR.

### Carlos: mock data + AI
- `transactions.json`: ~3 months for Mia (see persona). Fields: `id, date, description, merchant, category, amount, type (debit/credit), flags (bnpl, late_payment, dishonoured, subscription)`.
- `questions.json`: 4–5 personalised questions with `id, question, why_asking, related_transaction_ids, answer_options, impact`.
- `insights.json`: credit-health insights (e.g. "Late repayment on 12 Oct", "4 BNPL payments in Oct") and a mock score with before/after.
- **Real AI script:** reads transactions → LLM → outputs questions/insights in the same format. Record it running for the video.
- Write the LLM system prompt (bank credit-coach role, AU credit factors, explain why, never take action without approval).

### Santiago: bill negotiator + gamification logic
- `bills.json`: Mia's current plans vs cheaper alternatives (mock providers/prices), monthly + yearly savings, and a "switch" action.
- **Reward rules** (`rewards.json` or a spec):
  - XP for: on-time repayment, no new BNPL this month, switching a bill, savings streak, answering questions
  - Coins earned per action
  - Dragon stages + XP thresholds (egg → baby → teen → adult)
  - Shop items + coin prices
- Spec the Approve → confirmation flow (copy + states) for Shawn.
- Support Shawn with SwiftUI screens on Day 2 if ahead.

### Naomi: product, design, story, submission
- Figma mockups for key screens (Westpac look), dragon item art for the shop.
- Find **real** stats/facts with sources (credit factors from Equifax; BNPL/financial stress stat from a credible source).
- Write the **idea summary** (submission requirement).
- Write the **video script** and storyboard (section 8).
- Own recording/editing on Day 2 and **send the submission email**.
- Prepare a 5-minute version of the pitch in case we're shortlisted for Friday.

### Everyone
- Agree JSON formats **by 1:00pm today** so Shawn can build against them.
- Test the demo as "Mia".
- Ask mentors: *"Would Westpac actually build this? What would stop it?"* Use their answers in the pitch.

---

## 7. Timeline

### Day 1: Mon 16 Nov
| Time | Goal |
|---|---|
| 12:30–1:00 | Read this brief, agree app name, lock JSON formats |
| 1:00–2:10 | Shawn: AR dragon placing. Carlos: transactions + questions. Santiago: bills + rewards. Naomi: Figma + stats + script draft |
| ~2:00 | Quick sync before Shawn leaves |
| 2:10–3:00 | Carlos: real AI script working. Santiago: rewards finalised. Naomi: summary draft |
| Tonight (optional) | Shawn: screens 1–5 roughly working with mock data |

### Day 2: Tue 17 Nov
| Time | Goal |
|---|---|
| 10:00–11:30 | Merge everything into the iOS app. Full Mia journey works end to end |
| 11:30–12:30 | **Feature freeze.** Polish, fix bugs, mentor feedback |
| 12:30–1:00 | Lunch + final rehearsal |
| 1:00–2:30 | **Record video** (don't leave this late) |
| 2:30–3:15 | Edit, upload to YouTube (Unlisted), finish summary |
| **By 3:30** | **Send submission email** (30-min buffer before 4pm) |

---

## 8. Video plan (10 min max)

| Time | Section | Who |
|---|---|---|
| 0:00–1:00 | **Hook:** real stat + "Meet Mia" problem | Naomi |
| 1:00–2:00 | **Idea:** one-liner, why credit health matters, why Westpac is perfectly placed | Santiago |
| 2:00–6:30 | **Live demo:** Mia's full journey: AI scan → questions → plan → bill switch → dragon levels up → **AR dragon on the table** | Shawn |
| 6:30–7:30 | **How the AI works:** show Carlos's script reading transactions and generating questions | Carlos |
| 7:30–9:00 | **Impact + feasibility:** uses Westpac's own data, opt-in, explainable, user approves everything; next steps (real credit score integration, CDR, real perks) | Santiago / Naomi |
| 9:00–10:00 | **Team + close** | All |

Tips: one story, not a feature tour. Show the problem → product → outcome. Make the AR moment big. Record demo segments separately so mistakes are easy to redo.

---

## 9. Deliverables (submission checklist)

Email to **GoldCoastEngineeringHub@westpac.com.au** by **4:00pm Tue 17 Nov** containing:
- [ ] University name: Griffith University
- [ ] Team name
- [ ] Team members' full names (Shawn, Carlos, Santiago, Naomi)
- [ ] **Idea summary**: what we're trying to achieve + why we believe it's a good idea
- [ ] **YouTube link** (Unlisted, ≤10 min) of the team presenting + software demo
- [ ] Supporting links: GitHub repo, Figma, any TestFlight/build info
- [ ] Note: Westpac may not be able to open external links from their network, so **the video must show everything working**

For Friday (if shortlisted):
- [ ] 5-minute live pitch, with the app running on a phone (bring a charged iPhone + backup screen recording)

---

## 10. Pitch talking points / judge Q&A prep

- **"Does spending less raise my credit score?"** Not directly. We help you free up cash to make repayments on time, reduce debt and avoid new credit applications, which are what bureaus look at.
- **"Privacy?"** Opt-in only. Uses Westpac's own data. Every question shows why it's asked. Users can skip. No action without approval.
- **"Why would Westpac build this?"** Healthier customers mean lower defaults, more engagement, a stronger brand with young customers, and real perks drive loyalty.
- **"Is the AI real?"** Yes. Show the script generating questions from transaction data. The app uses cached output for demo reliability.
- **"What's next?"** Real credit score integration (customer-consented), Open Banking/CDR for other banks, real bill-switch partners, accessibility (voice mode).

---

## 11. Open decisions (decide as a team)
- [ ] App name + team name
- [ ] Dragon look (Westpac colours?) and which USDZ model
- [ ] Which LLM/API key we use
- [ ] Do coins unlock real perks in the pitch? (recommended)
