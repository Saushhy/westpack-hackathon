import Foundation

/// Mirrors `data/rewards.json` (Santiago's gamification contract).
/// This is the single source of truth for the economy — XP, coins, levels,
/// dragon stages, plan goals and shop stock. Nothing here is hard-coded in Swift.
struct Rewards: Codable {
    struct StartingState: Codable {
        let xpTotal: Int
        let coins: Int
        let streakWeeks: Int

        enum CodingKeys: String, CodingKey {
            case xpTotal = "xp_total"
            case coins
            case streakWeeks = "streak_weeks"
        }
    }

    struct Action: Codable {
        let id: String
        let label: String
        /// Null in the contract for actions that spend rather than earn (e.g. shop_purchase).
        let xp: Int?
        let coins: Int?
    }

    struct Level: Codable {
        let level: Int
        let xpRequired: Int

        enum CodingKeys: String, CodingKey {
            case level
            case xpRequired = "xp_required"
        }
    }

    struct Stage: Codable {
        let id: String
        let name: String
        let xpRequired: Int
        let emoji: String

        enum CodingKeys: String, CodingKey {
            case id, name, emoji
            case xpRequired = "xp_required"
        }
    }

    struct Goal: Codable {
        let id: String
        let title: String
        let description: String
        let xp: Int
        let coins: Int
    }

    struct Item: Codable {
        let id: String
        let name: String
        let slot: String
        let cost: Int
        let emoji: String
        let description: String
    }

    let startingState: StartingState
    let actions: [Action]
    let levels: [Level]
    let stages: [Stage]
    let goals: [Goal]
    let shop: [Item]

    enum CodingKeys: String, CodingKey {
        case startingState = "starting_state"
        case actions, levels, stages, goals, shop
    }

    func action(_ id: RewardAction) -> Action? {
        actions.first { $0.id == id.rawValue }
    }
}

/// The reward events the app can fire, keyed to `rewards.json` action ids.
///
/// The credit-coach reframe renamed the bill actions: `bill_switch` became
/// `saving_verified` and `bill_reschedule` became `protected_balance`, both
/// keeping their original values. `bill_cancel` has no successor.
enum RewardAction: String {
    case dailyCheckin = "daily_checkin"
    case checkinWeek = "checkin_week"
    case questionAnswered = "question_answered"
    case goalCompleted = "goal_completed"
    case onTimeRepayment = "on_time_repayment"
    case noNewBnplMonth = "no_new_bnpl_month"
    case reminderSet = "reminder_set"
    case protectedBalance = "protected_balance"
    case insightTracked = "insight_tracked"
    case savingVerified = "saving_verified"
    case savingsStreak4wk = "savings_streak_4wk"
    case shopPurchase = "shop_purchase"
}

enum RewardsData {
    static let shared: Rewards = DataLoader.rewards
}
