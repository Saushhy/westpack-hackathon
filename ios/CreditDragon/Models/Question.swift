import Foundation

struct AIQuestion: Codable, Identifiable {
    let id: String
    let question: String
    let whyAsking: String
    let relatedTransactionIds: [String]
    let answerOptions: [AnswerOption]
    let impact: String

    struct AnswerOption: Codable, Identifiable {
        var id: String { label }
        let label: String
        let action: String?
    }

    enum CodingKeys: String, CodingKey {
        case id, question, impact
        case whyAsking = "why_asking"
        case relatedTransactionIds = "related_transaction_ids"
        case answerOptions = "answer_options"
    }
}
