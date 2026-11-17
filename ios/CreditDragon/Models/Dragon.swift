import Foundation

enum DragonStage: String, Codable, CaseIterable {
    case egg, baby, teen, adult

    private var spec: Rewards.Stage? {
        RewardsData.shared.stages.first { $0.id == rawValue }
    }

    /// Product naming, not the contract's: Egg → Hatched → Dragon L1 → Dragon L2.
    var displayName: String {
        switch self {
        case .egg: return "Egg"
        case .baby: return "Hatched"
        case .teen: return "Dragon L1"
        case .adult: return "Dragon L2"
        }
    }

    var emoji: String {
        spec?.emoji ?? "🥚"
    }

    /// From `rewards.json`: egg 0 → baby 250 → teen 800 → adult 1500.
    var xpThreshold: Int {
        spec?.xpRequired ?? 0
    }

    var nextStage: DragonStage? {
        switch self {
        case .egg: return .baby
        case .baby: return .teen
        case .teen: return .adult
        case .adult: return nil
        }
    }

    static func forXP(_ xp: Int) -> DragonStage {
        allCases.last { xp >= $0.xpThreshold } ?? .egg
    }
}

struct ShopItem: Identifiable, Codable {
    let id: String
    let name: String
    let emoji: String
    let price: Int
    let description: String
}

class DragonState: ObservableObject {
    @Published var name: String = "Westpac Dragon"
    @Published var xp: Int
    @Published var coins: Int
    @Published var stage: DragonStage
    @Published var streakWeeks: Int
    @Published var ownedItems: [String] = []

    /// The demo opens fully grown so AR shows Dragon L2. Drop this back to
    /// `start.xpTotal` to restore the evolution arc from Hatched.
    static let opensAtAdult = true

    init() {
        let start = RewardsData.shared.startingState
        let openingXP = Self.opensAtAdult
            ? max(start.xpTotal, DragonStage.adult.xpThreshold)
            : start.xpTotal
        xp = openingXP
        coins = start.coins
        streakWeeks = start.streakWeeks
        stage = DragonStage.forXP(openingXP)
    }

    /// From `rewards.json`: 0/100/250/450/700/1000/1350/1750/2200/2700.
    var level: Int {
        RewardsData.shared.levels
            .filter { xp >= $0.xpRequired }
            .map(\.level)
            .max() ?? 1
    }

    var nextLevelXP: Int? {
        RewardsData.shared.levels
            .first { $0.xpRequired > xp }?
            .xpRequired
    }

    /// Progress toward the next level, not the next evolution.
    var xpProgress: Double {
        let levels = RewardsData.shared.levels
        guard let next = nextLevelXP else { return 1.0 }
        let current = levels.filter { xp >= $0.xpRequired }.map(\.xpRequired).max() ?? 0
        let span = next - current
        guard span > 0 else { return 1.0 }
        return Double(xp - current) / Double(span)
    }

    var evolutionProgress: Double {
        guard let next = stage.nextStage else { return 1.0 }
        let current = stage.xpThreshold
        let span = next.xpThreshold - current
        guard span > 0 else { return 1.0 }
        return min(1.0, max(0.0, Double(xp - current) / Double(span)))
    }

    /// Returns true when the dragon evolved, so the UI can celebrate it.
    @discardableResult
    func addXP(_ amount: Int) -> Bool {
        let before = stage
        xp += amount
        stage = DragonStage.forXP(xp)
        return stage != before
    }

    func addCoins(_ amount: Int) {
        coins += amount
    }

    /// Applies a reward from the contract. Returns true if the dragon evolved.
    @discardableResult
    func award(_ action: RewardAction) -> Bool {
        guard let spec = RewardsData.shared.action(action) else { return false }
        addCoins(spec.coins ?? 0)
        return addXP(spec.xp ?? 0)
    }

    func buyItem(_ item: ShopItem) -> Bool {
        guard coins >= item.price, !ownedItems.contains(item.id) else { return false }
        coins -= item.price
        ownedItems.append(item.id)
        return true
    }

    static var shopItems: [ShopItem] {
        RewardsData.shared.shop.map {
            ShopItem(id: $0.id, name: $0.name, emoji: $0.emoji, price: $0.cost, description: $0.description)
        }
    }
}
