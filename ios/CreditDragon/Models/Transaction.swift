import Foundation

struct Transaction: Codable, Identifiable {
    let id: String
    let date: String
    let description: String
    let merchant: String
    let category: String
    let amount: Double
    let type: TransactionType
    let flags: [TransactionFlag]

    enum TransactionType: String, Codable {
        case debit, credit
    }

    enum TransactionFlag: String, Codable {
        case bnpl, late_payment, dishonoured, subscription, recurring
    }
}
