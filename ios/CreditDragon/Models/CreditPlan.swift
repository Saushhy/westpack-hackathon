import Foundation

struct CreditGoal: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let xpReward: Int
    let coinReward: Int

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case xpReward = "xp_reward"
        case coinReward = "coin_reward"
    }
}

struct CreditInsight: Codable, Identifiable {
    let id: String
    let title: String
    let detail: String
    let severity: Severity
    let relatedTransactionIds: [String]

    enum Severity: String, Codable {
        case good, warning, danger
    }

    enum CodingKeys: String, CodingKey {
        case id, title, detail, severity
        case relatedTransactionIds = "related_transaction_ids"
    }
}

struct CreditScore {
    var current: Int
    var potential: Int
}
