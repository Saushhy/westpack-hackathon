import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch appState.currentScreen {
            case .splash:
                SplashView()
            case .scanning:
                ScanningView()
            case .questions:
                QuestionsView()
            case .main:
                MainTabView()
            case .arView:
                ARDragonView()
            }
        }
        .tint(.wbcPrimary)
    }
}
