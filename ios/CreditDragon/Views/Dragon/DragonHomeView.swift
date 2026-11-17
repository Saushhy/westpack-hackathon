import SwiftUI

struct DragonHomeView: View {
    @EnvironmentObject var appState: AppState

    var dragon: DragonState { appState.dragon }

    var body: some View {
        ScrollView {
            VStack(spacing: WestpacSpace.x2) {
                avatarCard
                    .padding(.horizontal, WestpacSpace.x3)
                    .padding(.top, WestpacSpace.x2)

                levelCard
                    .padding(.horizontal, WestpacSpace.x3)

                evolutionCard
                    .padding(.horizontal, WestpacSpace.x3)

                Button {
                    withAnimation { appState.currentScreen = .arView }
                } label: {
                    Label("See your dragon in AR", systemImage: "arkit")
                        .westpacButton(.primary, size: .large)
                }
                .padding(.horizontal, WestpacSpace.x3)
                .padding(.top, WestpacSpace.x05)
            }
            .padding(.bottom, WestpacSpace.x5)
        }
        .background(Color.wbcBackgroundPale)
    }

    private var avatarCard: some View {
        VStack(spacing: WestpacSpace.x2) {
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.wbcSurfaceHeroFaint, .clear],
                            center: .center,
                            startRadius: 10,
                            endRadius: 80
                        )
                    )
                    .frame(width: 168, height: 168)

                Text(dragonEmoji)
                    .font(.system(size: 100))
            }

            Text(dragon.name)
                .font(WestpacFont.heading(WestpacType.s7))
                .foregroundColor(.wbcTextHeading)

            Text("Level \(dragon.level) · \(dragon.xp) XP · 3-week streak")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextMuted)

            CoinPill(count: dragon.coins, showsLabel: true)
        }
        .frame(maxWidth: .infinity)
        .westpacCard(padding: WestpacSpace.x4)
    }

    private var levelCard: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x1) {
            HStack {
                Text("Level \(dragon.level)")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                Spacer()
                Text(dragon.stage.nextStage != nil ? "Level \(dragon.level + 1)" : "Max level")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
            }

            WestpacProgressBar.skinny(value: dragon.xpProgress)

            if let next = dragon.stage.nextStage {
                Text("\(next.xpThreshold - dragon.xp) XP to level up")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
            }
        }
        .westpacCard(padding: WestpacSpace.x3)
    }

    private var evolutionCard: some View {
        VStack(alignment: .leading, spacing: WestpacSpace.x1) {
            HStack {
                Text("Evolution")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
                Spacer()
                Text(dragon.stage.nextStage?.displayName ?? "Adult")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.wbcTextMuted)
            }

            HStack(spacing: WestpacSpace.x1) {
                ForEach(DragonStage.allCases, id: \.self) { stage in
                    let reached = dragon.xp >= stage.xpThreshold
                    Text(stageEmoji(stage))
                        .font(.system(size: reached ? WestpacType.s7 : WestpacType.s8))
                        .opacity(reached ? 1 : 0.3)
                    if stage != .adult {
                        Rectangle()
                            .fill(Color.wbcBorder)
                            .frame(width: 12, height: 1)
                    }
                }
                Spacer()
            }
            .padding(.vertical, WestpacSpace.x05)

            WestpacProgressBar.skinny(value: evolutionProgress)

            Text(dragon.stage.nextStage.map { "\($0.xpThreshold - dragon.xp) XP to evolve" } ?? "Fully grown")
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextMuted)
        }
        .westpacCard(padding: WestpacSpace.x3)
    }

    private var dragonEmoji: String { stageEmoji(dragon.stage) }

    private func stageEmoji(_ stage: DragonStage) -> String {
        switch stage {
        case .egg: return "🥚"
        case .baby: return "🐣"
        case .teen: return "🐉"
        case .adult: return "🐲"
        }
    }

    private var evolutionProgress: Double {
        guard let next = dragon.stage.nextStage else { return 1.0 }
        let current = dragon.stage.xpThreshold
        let total = next.xpThreshold - current
        guard total > 0 else { return 1.0 }
        return Double(dragon.xp - current) / Double(total)
    }
}

/// Reward currency is an app concept, not a GEL one; it borrows the data-F accent.
struct CoinPill: View {
    let count: Int
    var showsLabel: Bool = false

    var body: some View {
        HStack(spacing: WestpacSpace.x1) {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.wbcDataFTint, .wbcDance],
                        center: UnitPoint(x: 0.32, y: 0.28),
                        startRadius: 0,
                        endRadius: 7
                    )
                )
                .frame(width: 14, height: 14)
            Text(showsLabel ? "\(count) coins" : "\(count)")
                .font(WestpacFont.body(WestpacType.s10, weight: .bold))
                .foregroundColor(.wbcDance)
        }
        .padding(.horizontal, WestpacSpace.x2)
        .padding(.vertical, WestpacSpace.x1)
        .background(Color.wbcDance.opacity(0.08))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.wbcDance.opacity(0.35), lineWidth: 1))
    }
}
