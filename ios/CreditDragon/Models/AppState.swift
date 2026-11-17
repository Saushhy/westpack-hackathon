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

    /// Set when an action evolves the dragon, so the UI can celebrate it.
    @Published var justEvolvedTo: DragonStage?

    func completeGoal(_ goal: CreditGoal) {
        guard !completedGoals.contains(goal.id) else { return }
        completedGoals.insert(goal.id)
        dragon.addCoins(goal.coinReward)
        let evolved = dragon.addXP(goal.xpReward)
        creditScore.current = min(creditScore.current + 15, creditScore.potential)
        if evolved { justEvolvedTo = dragon.stage }
    }

    func switchBill(_ bill: Bill) {
        guard !switchedBills.contains(bill.id) else { return }
        switchedBills.insert(bill.id)
        totalMonthlySavings += bill.monthlySaving
        if dragon.award(.savingVerified) { justEvolvedTo = dragon.stage }
    }
}
