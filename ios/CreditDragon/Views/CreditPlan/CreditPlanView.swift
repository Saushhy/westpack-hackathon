import SwiftUI

struct CreditPlanView: View {
    @EnvironmentObject var appState: AppState
    private let insights = DataLoader.insights
    private let goals = DataLoader.goals

    var body: some View {
        ScrollView {
            VStack(spacing: WestpacSpace.x3) {
                HStack {
                    Text("Credit health plan")
                        .font(WestpacFont.heading(WestpacType.s7))
                        .foregroundColor(.wbcTextHeading)
                    Spacer()
                }
                .padding(.horizontal, WestpacSpace.x3)
                .padding(.top, WestpacSpace.x2)

                scoreCard
                    .padding(.horizontal, WestpacSpace.x3)

                section("Key insights") {
                    ForEach(insights) { insight in
                        InsightRow(insight: insight)
                    }
                }

                section("Your 3 goals") {
                    ForEach(goals) { goal in
                        GoalRow(
                            goal: goal,
                            completed: appState.completedGoals.contains(goal.id),
                            onComplete: { appState.completeGoal(goal) }
                        )
                        .padding(.horizontal, WestpacSpace.x3)
                    }
                }
            }
            .padding(.bottom, WestpacSpace.x5)
        }
        .background(Color.wbcBackgroundPale)
    }

    @ViewBuilder
    private func section<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x2) {
            Text(title)
                .font(WestpacFont.heading(WestpacType.s8))
                .foregroundColor(.wbcTextHeading)
                .padding(.horizontal, WestpacSpace.x3)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var scoreBand: WestpacAlertLook {
        switch appState.creditScore.current {
        case ..<600: return .danger
        case 600..<700: return .warning
        default: return .success
        }
    }

    private var scoreCard: some View {
        VStack(spacing: WestpacSpace.x2) {
            Text("Your credit health")
                .font(WestpacFont.heading(WestpacType.s8))
                .foregroundColor(.wbcTextHeading)

            ZStack {
                Circle()
                    .stroke(Color.wbcMuted200, lineWidth: 14)

                Circle()
                    .trim(from: 0, to: CGFloat(appState.creditScore.potential) / 850.0)
                    .stroke(Color.wbcSuccess.opacity(0.25), style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Circle()
                    .trim(from: 0, to: CGFloat(appState.creditScore.current) / 850.0)
                    .stroke(scoreBand.text, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text("\(appState.creditScore.current)")
                        .font(WestpacFont.heroNumber(WestpacType.s5))
                        .foregroundColor(.wbcTextHeading)
                    Text("out of 850")
                        .font(WestpacFont.caption())
                        .foregroundColor(.wbcTextMuted)
                }
            }
            .frame(width: 144, height: 144)

            Text("Potential: \(appState.creditScore.potential)")
                .font(WestpacFont.body(WestpacType.s10, weight: .semibold))
                .foregroundColor(.wbcSuccess)
        }
        .frame(maxWidth: .infinity)
        .westpacCard(padding: WestpacSpace.x4)
    }
}

struct InsightRow: View {
    let insight: CreditInsight

    private var look: WestpacAlertLook {
        switch insight.severity {
        case .good: return .success
        case .warning: return .warning
        case .danger: return .danger
        }
    }

    var body: some View {
        WestpacAlert(look: look, heading: insight.title) {
            Text(insight.detail)
        }
    }
}

struct GoalRow: View {
    let goal: CreditGoal
    let completed: Bool
    let onComplete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x2) {
            Text(goal.title)
                .font(WestpacFont.heading(WestpacType.s9))
                .foregroundColor(.wbcTextHeading)
                .strikethrough(completed)

            Text(goal.description)
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextMuted)

            WestpacProgressBar.skinny(
                value: completed ? 1.0 : 0.0,
                fill: completed ? .wbcSuccess : .wbcSurfaceHero
            )

            HStack {
                Text(completed ? "Completed" : "Not started")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                Spacer()
                Text("+\(goal.xpReward) XP · +\(goal.coinReward) coins")
                    .font(WestpacFont.body(WestpacType.s10, weight: .semibold))
                    .foregroundColor(.wbcTextMuted)
                    .padding(.horizontal, WestpacSpace.x15)
                    .padding(.vertical, WestpacSpace.x05)
                    .background(Color.wbcBackgroundFaint)
                    .clipShape(Capsule())
            }

            if !completed {
                Button { onComplete() } label: {
                    Text("Mark done")
                        .westpacButton(.primary, size: .large)
                }
            }
        }
        .westpacCard(padding: WestpacSpace.x3)
    }
}
