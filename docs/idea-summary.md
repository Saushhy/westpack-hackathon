# Credit Dragon: Idea Summary

**Team:** [Team name]  |  **University:** Griffith University
**Members:** Shawn, Carlos, Santiago, Naomi (add full names)
**Theme:** AI and what it means for banking

## What we are trying to achieve

Credit Dragon is an AI feature inside the Westpac app that helps young people understand and improve their credit health. It reads a customer's own Westpac transaction history, asks a few personalised questions, finds ways to cut their bills, and rewards good credit habits by growing a pet dragon, the Westpac mascot, that they can see in augmented reality.

## The problem

Many students and first-job earners don't know what affects their credit profile. Equifax Australia says its credit score draws on credit enquiries and applications, repayment history, adverse events and credit account information. Habits like late repayments and frequent credit applications can therefore matter when someone later applies for a rental, a car loan or a mortgage. Budgeting apps give generic advice and people drop them because they are boring.

Financial stress is common among BNPL users:

- In ASIC's 2021-22 survey, **19% of buy now, pay later users reported at least two signs of financial stress**, compared with 8% of credit card holders in the same survey. ASIC counts indicators such as difficulty paying utilities or rent, going without meals, and seeking help. The figures describe survey responses and don't show what caused the stress. (Source: ASIC submission to Treasury, pp. 14-15, Figure 5: https://treasury.gov.au/sites/default/files/2023-02/c2022-338372-asic.pdf#page=15)
- About one in five BNPL consumers ASIC surveyed said they had missed or paid other bills late so they could make their BNPL payments on time in the preceding 12 months. (Source: ASIC Report 672, p. 16, 2020: https://download.asic.gov.au/media/5852803/rep672-published-16-november-2020-2.pdf#page=16)

## How it works

1. **AI scan.** The AI reviews the last three months of transactions.
2. **Personalised questions.** It asks 4-5 questions based on what it found, for example "You paid Afterpay 4 times in October. Were these planned?" Each card says *why* it is asking, and the customer can skip any of them.
3. **Credit health plan.** The customer gets three goals, such as paying the card on time, no new BNPL this month, and cutting monthly bills.
4. **Bill negotiator.** The AI finds cheaper phone, internet and streaming plans. The customer approves each switch. In our demo this saves about $93 a month (about $1,116 a year).
5. **Dragon grows.** Completing goals earns XP and coins. The dragon evolves from egg to baby, teen and adult, and coins buy items for it.
6. **AR moment.** The customer taps "See your dragon" and it appears on their table through the camera and plays a level-up animation.

## Why we think it is a good idea

- **It is honest about credit.** Spending less does not directly raise a credit score. Equifax lists repayment history, credit enquiries and applications, adverse events and credit account information among its score factors. Credit Dragon frees up cash so customers can make repayments on time, pay down debt and avoid new credit. These are the habits it rewards most. The on-screen number in our demo is an illustrative goal-progress score, not a bureau score, and we don't claim any specific transaction appears in a credit report. (Source: Equifax score explainer, https://equifax.com.au/personal/node/252)
- **It is feasible for Westpac.** It uses data Westpac already holds: transactions, card and loan repayments, direct debits and recurring bills. Other banks' data would only come in through Open Banking (CDR) with the customer's consent, and the credit score is shown only if the customer opts in.
- **It is safe and explainable.** It is opt-in. Every question explains why it is asked, and nothing happens without the customer's approval.
- **It has a business case.** Healthier customers mean lower defaults and more engagement. A friendly mascot builds loyalty with younger customers. Coins could later unlock real perks, such as bonus savings interest or a small rate discount.
- **It is engaging.** Gamification and AR make credit health something people want to open the app for.

## What we built

- A native iOS app (SwiftUI) with the full journey for our demo persona, Mia, a 21-year-old uni student.
- An AR dragon (ARKit/RealityKit).
- A working AI pipeline: a script that sends transaction data to an LLM and generates the personalised questions and credit insights shown in the app.
- Gamification logic (XP, coins, levels, shop) and a bill-negotiator flow.
- Transaction data, bill offers and the credit score are mocked for the demo, with Westpac's GEL design tokens used for the look and feel.

## Next steps

Integrate a real, customer-consented credit score, connect other banks through CDR, partner with real providers for bill switching, add real rewards, and add accessibility features such as voice mode.

## Links

- GitHub: https://github.com/Saushhy/westpack-hackathon
- Figma: [add link]
- Demo video (YouTube, Unlisted): [add link]
