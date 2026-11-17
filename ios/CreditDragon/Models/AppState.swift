import SwiftUI

enum AppScreen: Hashable {
    case splash
    case scanning
    case questions
    case main
    case arView
}

enum MainTab: Hashable {
    case bills
    case goals
    case dragon
    case shop
}

class AppState: ObservableObject {
    @Published var currentScreen: AppScreen = .splash
    @Published var selectedTab: MainTab = .bills
    @Published var dragon = DragonState()
    @Published var creditScore = CreditScore(current: 542, potential: 680)
    @Published var completedGoals: Set<String> = []
    @Published var switchedBills: Set<String> = []
    @Published var answeredQuestions: [String: String] = [:]
    @Published var totalMonthlySavings: Double = 0

    func completeGoal(_ goal: CreditGoal) {
        guard !completedGoals.contains(goal.id) else { return }
        completedGoals.insert(goal.id)
        dragon.addXP(goal.xpReward)
        dragon.addCoins(goal.coinReward)
        creditScore.current = min(creditScore.current + 15, creditScore.potential)
    }

    func switchBill(_ bill: Bill) {
        guard !switchedBills.contains(bill.id) else { return }
        switchedBills.insert(bill.id)
        totalMonthlySavings += bill.monthlySaving
        dragon.addXP(30)
        dragon.addCoins(10)
    }
}
