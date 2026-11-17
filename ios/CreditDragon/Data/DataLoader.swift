import Foundation

struct DataLoader {
    static func load<T: Decodable>(_ filename: String) -> T {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            fatalError("Missing \(filename).json in bundle")
        }
        guard let data = try? Data(contentsOf: url) else {
            fatalError("Cannot read \(filename).json")
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // Names the offending key path, which matters while the team is still
            // reconciling these files against data/.
            fatalError("Cannot decode \(filename).json as \(T.self): \(error)")
        }
    }

    static var transactions: [Transaction] { load("transactions") }
    static var questions: [AIQuestion] { load("questions") }
    static var bills: [Bill] { load("bills") }
    static var insights: [CreditInsight] { load("insights") }

    static var rewards: Rewards { load("rewards") }

    /// Goals come from the rewards contract so XP and coin values can't drift.
    static var goals: [CreditGoal] {
        RewardsData.shared.goals.map {
            CreditGoal(id: $0.id, title: $0.title, description: $0.description,
                       xpReward: $0.xp, coinReward: $0.coins)
        }
    }
}
