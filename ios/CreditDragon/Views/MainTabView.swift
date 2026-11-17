import SwiftUI

struct GelHeader: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: WestpacSpace.x15) {
                    WestpacLogoFilled(size: 28)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Westpac")
                            .font(WestpacFont.heading(WestpacType.s9, weight: .bold))
                            .foregroundColor(.wbcHero)
                        Text("Credit Dragon")
                            .font(WestpacFont.body(WestpacType.s10))
                            .foregroundColor(.wbcTextMuted)
                    }
                }

                Spacer()

                CoinPill(count: appState.dragon.coins)
            }
            .padding(.horizontal, WestpacSpace.x3)
            .padding(.vertical, WestpacSpace.x2)

            Divider()
                .background(Color.wbcBorder)
        }
        .background(Color.white)
    }
}

struct GelTabBar: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            Divider()
                .background(Color.wbcBorder)

            HStack(spacing: 0) {
                tabButton(.bills, icon: "doc.text", label: "Bills")
                tabButton(.goals, icon: "target", label: "Goals")
                tabButton(.dragon, icon: "pawprint.fill", label: "Dragon")
                tabButton(.shop, icon: "bag", label: "Shop")
            }
            .padding(.horizontal, WestpacSpace.x1)
            .padding(.vertical, WestpacSpace.x1)
        }
        .background(Color.wbcBackgroundWhite)
    }

    private func tabButton(_ tab: MainTab, icon: String, label: String) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                appState.selectedTab = tab
            }
        } label: {
            VStack(spacing: WestpacSpace.x05) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                Text(label)
                    .font(WestpacFont.body(WestpacType.s10, weight: appState.selectedTab == tab ? .bold : .regular))
            }
            .foregroundColor(appState.selectedTab == tab ? .wbcPrimary : .wbcTextMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, WestpacSpace.x1)
            .background(
                appState.selectedTab == tab
                    ? Color.wbcSurfacePrimaryFaint
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.xxl))
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            GelHeader()

            Group {
                switch appState.selectedTab {
                case .bills:
                    BillNegotiatorView()
                case .goals:
                    CreditPlanView()
                case .dragon:
                    DragonHomeView()
                case .shop:
                    DragonShopView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            GelTabBar()
        }
        .background(Color.wbcBackgroundPale)
    }
}
