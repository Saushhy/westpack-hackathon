import Foundation

enum DragonStage: String, Codable, CaseIterable {
    case egg, baby, teen, adult

    var displayName: String {
        switch self {
        case .egg: return "Egg"
        case .baby: return "Baby Dragon"
        case .teen: return "Teen Dragon"
        case .adult: return "Adult Dragon"
        }
    }

    var xpThreshold: Int {
        switch self {
        case .egg: return 0
        case .baby: return 100
        case .teen: return 350
        case .adult: return 700
        }
    }

    var nextStage: DragonStage? {
        switch self {
        case .egg: return .baby
        case .baby: return .teen
        case .teen: return .adult
        case .adult: return nil
        }
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
    @Published var name: String = "Sparky"
    @Published var xp: Int = 0
    @Published var coins: Int = 0
    @Published var stage: DragonStage = .egg
    @Published var ownedItems: [String] = []

    private static let levelCurve = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]

    var level: Int {
        var lvl = 1
        for (i, threshold) in Self.levelCurve.enumerated() {
            if xp >= threshold { lvl = i + 1 }
        }
        return lvl
    }

    var xpProgress: Double {
        guard let next = stage.nextStage else { return 1.0 }
        let current = stage.xpThreshold
        let needed = next.xpThreshold - current
        return Double(xp - current) / Double(needed)
    }

    func addXP(_ amount: Int) {
        xp += amount
        while let next = stage.nextStage, xp >= next.xpThreshold {
            stage = next
        }
    }

    func addCoins(_ amount: Int) {
        coins += amount
    }

    func buyItem(_ item: ShopItem) -> Bool {
        guard coins >= item.price, !ownedItems.contains(item.id) else { return false }
        coins -= item.price
        ownedItems.append(item.id)
        return true
    }

    static let shopItems: [ShopItem] = [
        ShopItem(id: "hat_top", name: "Top Hat", emoji: "🎩", price: 50, description: "A classy top hat"),
        ShopItem(id: "food_steak", name: "Dragon Steak", emoji: "🥩", price: 30, description: "Boosts dragon energy"),
        ShopItem(id: "lair_cave", name: "Crystal Cave", emoji: "🏔️", price: 100, description: "A sparkling home"),
        ShopItem(id: "toy_ball", name: "Fire Ball", emoji: "🔥", price: 20, description: "Play fetch with fire"),
        ShopItem(id: "armor_gold", name: "Gold Armor", emoji: "🛡️", price: 80, description: "Shiny protection"),
        ShopItem(id: "wing_boost", name: "Wing Polish", emoji: "✨", price: 40, description: "Extra sparkle on wings"),
    ]
}
