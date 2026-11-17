import SwiftUI

struct BillNegotiatorView: View {
    @EnvironmentObject var appState: AppState
    @State private var confirmedBill: Bill?

    private let bills = DataLoader.bills

    var totalMonthlySaving: Double {
        bills.reduce(0) { $0 + $1.monthlySaving }
    }
    var totalYearlySaving: Double {
        bills.reduce(0) { $0 + $1.yearlySaving }
    }
    var switchedSaving: Double {
        bills.filter { appState.switchedBills.contains($0.id) }
            .reduce(0) { $0 + $1.monthlySaving }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: WestpacSpace.x2) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Bill negotiator")
                        .font(WestpacFont.heading(WestpacType.s7))
                        .foregroundColor(.wbcTextHeading)
                    Spacer()
                }
                .padding(.horizontal, WestpacSpace.x3)
                .padding(.top, WestpacSpace.x2)

                heroBanner
                    .padding(.horizontal, WestpacSpace.x3)

                ForEach(bills) { bill in
                    BillCard(
                        bill: bill,
                        isSwitched: appState.switchedBills.contains(bill.id),
                        onSwitch: { confirmedBill = bill }
                    )
                    .padding(.horizontal, WestpacSpace.x3)
                }
            }
            .padding(.bottom, WestpacSpace.x5)
        }
        .background(Color.wbcBackgroundPale)
        // sheet(item:) rather than sheet(isPresented:) — the latter builds its body
        // before confirmedBill propagates and presents an empty sheet.
        .sheet(item: $confirmedBill) { bill in
            SwitchConfirmationView(bill: bill) {
                appState.switchBill(bill)
                confirmedBill = nil
            }
        }
    }

    private var heroBanner: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x1) {
            Text("Your dragon found")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.white.opacity(0.75))

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("$\(String(format: "%.2f", totalMonthlySaving))")
                    .font(WestpacFont.heroNumber(WestpacType.s6))
                    .foregroundColor(.white)
                Text("/mo")
                    .font(WestpacFont.body(WestpacType.s8, weight: .semibold))
                    .foregroundColor(.white.opacity(0.8))
            }

            Text("≈ $\(String(format: "%.2f", totalYearlySaving)) a year")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.white.opacity(0.85))

            // Reversed-out progress track; the GEL bar's white fill reads as the
            // filled state against the hero surface.
            GeometryReader { geo in
                let pct = totalMonthlySaving > 0
                    ? min(1.0, switchedSaving / totalMonthlySaving) : 0
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.2))
                    Capsule()
                        .fill(Color.white)
                        .frame(width: geo.size.width * pct)
                }
            }
            .frame(height: 10)
            .padding(.top, WestpacSpace.x1)

            Text("$\(String(format: "%.2f", switchedSaving)) switched of $\(String(format: "%.2f", totalMonthlySaving)) available")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.white.opacity(0.85))
        }
        .padding(WestpacSpace.x3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(WestpacGradient.heroBanner)
        .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.xxl))
    }
}

struct BillCard: View {
    let bill: Bill
    let isSwitched: Bool
    let onSwitch: () -> Void
    @State private var showWhy = false

    var body: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x2) {
            header

            if !isSwitched {
                priceComparison
                whyDisclosure
                if showWhy { whyBody }
                actions
            } else {
                WestpacAlert(look: .success) {
                    Text("Switched! You're saving $\(String(format: "%.2f", bill.monthlySaving))/mo.")
                }
            }
        }
        .westpacCard(padding: WestpacSpace.x3)
        .opacity(isSwitched ? 0.9 : 1.0)
    }

    private var header: some View {
        HStack(alignment: .top, spacing: WestpacSpace.x2) {
            ZStack {
                RoundedRectangle(cornerRadius: WestpacRadius.xl)
                    .fill(Color.wbcSurfaceHeroFaint)
                    .frame(width: 42, height: 42)
                Image(systemName: billIcon)
                    .font(.system(size: WestpacType.s8))
                    .foregroundColor(.wbcHero)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(bill.service)
                    .font(WestpacFont.heading(WestpacType.s9))
                    .foregroundColor(.wbcTextHeading)
                    .fixedSize(horizontal: false, vertical: true)
                Text(bill.currentPlan)
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if isSwitched {
                Label("Switched", systemImage: "checkmark.circle.fill")
                    .font(WestpacFont.body(WestpacType.s10, weight: .bold))
                    .foregroundColor(.wbcSuccess)
                    .fixedSize()
            } else {
                Text("Save $\(String(format: "%.0f", bill.monthlySaving))/mo")
                    .font(WestpacFont.body(WestpacType.s10, weight: .bold))
                    .foregroundColor(.wbcPrimary)
                    .fixedSize()
                    .padding(.horizontal, WestpacSpace.x15)
                    .padding(.vertical, WestpacSpace.x05)
                    .background(Color.wbcSurfacePrimaryFaint)
                    .clipShape(Capsule())
            }
        }
    }

    private var priceComparison: some View {
        HStack {
            VStack(alignment: .leading, spacing: WestpacSpace.x05) {
                Text("Current")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                Text("$\(String(format: "%.2f", bill.currentMonthly))/mo")
                    .font(WestpacFont.body(WestpacType.s9, weight: .semibold))
                    .foregroundColor(.wbcTextMuted)
                    .strikethrough()
            }

            Spacer()

            Image(systemName: "arrow.right")
                .foregroundColor(.wbcBorderStrong)

            Spacer()

            VStack(alignment: .trailing, spacing: WestpacSpace.x05) {
                Text("New")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                Text("$\(String(format: "%.2f", bill.suggestedMonthly))/mo")
                    .font(WestpacFont.body(WestpacType.s9, weight: .bold))
                    .foregroundColor(.wbcSuccess)
            }
        }
    }

    private var whyDisclosure: some View {
        Button {
            withAnimation { showWhy.toggle() }
        } label: {
            HStack(spacing: WestpacSpace.x1) {
                Image(systemName: showWhy ? "minus.circle" : "plus.circle")
                    .font(.system(size: WestpacType.s10))
                Text("Why am I showing you this?")
                    .font(WestpacFont.body(WestpacType.s10, weight: .semibold))
            }
            .foregroundColor(.wbcPrimary)
        }
    }

    private var whyBody: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x1) {
            Text("Your dragon analysed your spending and found a cheaper plan with the same features you use.")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextBody)
            Text("Nothing happens until you approve.")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private var actions: some View {
        HStack(spacing: WestpacSpace.x1) {
            Button { onSwitch() } label: {
                Text("Approve")
                    .westpacButton(.primary, size: .large)
            }

            Button {} label: {
                Text("Not now")
                    .westpacButton(.hero, size: .large, soft: true, block: false)
            }
        }
    }

    private var billIcon: String {
        switch bill.service.lowercased() {
        case let s where s.contains("phone"): return "phone"
        case let s where s.contains("internet") || s.contains("nbn"): return "desktopcomputer"
        case let s where s.contains("netflix") || s.contains("stan") || s.contains("disney"): return "play.tv"
        case let s where s.contains("spotify"): return "headphones"
        case let s where s.contains("gym"): return "dumbbell"
        case let s where s.contains("rent"): return "house"
        default: return "doc.text"
        }
    }
}

struct SwitchConfirmationView: View {
    let bill: Bill
    let onConfirm: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: WestpacSpace.x4) {
            Spacer()

            Text("✅")
                .font(.system(size: WestpacType.s3))

            Text("Confirm switch")
                .font(WestpacFont.heading(WestpacType.s7))
                .foregroundColor(.wbcTextHeading)

            VStack(spacing: WestpacSpace.x1) {
                Text(bill.currentPlan)
                    .foregroundColor(.wbcTextMuted)
                    .strikethrough()
                Image(systemName: "arrow.down")
                    .foregroundColor(.wbcBorderStrong)
                Text(bill.suggestedPlan)
                    .foregroundColor(.wbcTextBody)
                    .fontWeight(.semibold)
            }
            .font(WestpacFont.body())

            Text("You'll save $\(String(format: "%.0f", bill.monthlySaving))/month")
                .font(WestpacFont.heading(WestpacType.s8))
                .foregroundColor(.wbcSuccess)

            if let reward = RewardsData.shared.action(.savingVerified) {
                Text("+\(reward.xp ?? 0) XP  ·  +\(reward.coins ?? 0) coins")
                    .font(WestpacFont.body(WestpacType.s10, weight: .semibold))
                    .foregroundColor(.wbcDance)
            }

            Button {
                onConfirm()
            } label: {
                Text("Confirm & switch")
                    .westpacButton(.primary, size: .large)
            }
            .padding(.horizontal, WestpacSpace.x4)

            Button { dismiss() } label: {
                Text("Cancel")
                    .westpacButton(.hero, size: .large, soft: true)
            }
            .padding(.horizontal, WestpacSpace.x4)

            Spacer()
        }
        .padding(.horizontal, WestpacSpace.x3)
        .frame(maxWidth: .infinity)
        .background(Color.wbcBackgroundWhite)
    }
}
