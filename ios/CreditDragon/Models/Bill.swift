import Foundation

struct Bill: Codable, Identifiable {
    let id: String
    let service: String
    let provider: String
    let currentPlan: String
    let currentMonthly: Double
    let suggestedProvider: String
    let suggestedPlan: String
    let suggestedMonthly: Double
    let monthlySaving: Double
    let yearlySaving: Double
    let category: String

    enum CodingKeys: String, CodingKey {
        case id, service, provider, category
        case currentPlan = "current_plan"
        case currentMonthly = "current_monthly"
        case suggestedProvider = "suggested_provider"
        case suggestedPlan = "suggested_plan"
        case suggestedMonthly = "suggested_monthly"
        case monthlySaving = "monthly_saving"
        case yearlySaving = "yearly_saving"
    }
}
