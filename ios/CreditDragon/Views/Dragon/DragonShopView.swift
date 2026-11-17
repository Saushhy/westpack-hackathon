import SwiftUI

struct DragonShopView: View {
    @EnvironmentObject var appState: AppState
    @State private var purchasedItem: ShopItem?
    @State private var showPurchaseAlert = false

    var dragon: DragonState { appState.dragon }

    let columns = [
        GridItem(.flexible(), spacing: WestpacSpace.x2),
        GridItem(.flexible(), spacing: WestpacSpace.x2)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WestpacSpace.x2) {
                Text("Dragon shop")
                    .font(WestpacFont.heading(WestpacType.s7))
                    .foregroundColor(.wbcTextHeading)
                    .padding(.horizontal, WestpacSpace.x3)
                    .padding(.top, WestpacSpace.x2)

                HStack(spacing: WestpacSpace.x1) {
                    Text("You have")
                        .font(WestpacFont.body(WestpacType.s10))
                        .foregroundColor(.wbcTextMuted)
                    CoinPill(count: dragon.coins, showsLabel: true)
                }
                .padding(.horizontal, WestpacSpace.x3)

                LazyVGrid(columns: columns, spacing: WestpacSpace.x2) {
                    ForEach(DragonState.shopItems) { item in
                        ShopItemCard(
                            item: item,
                            owned: dragon.ownedItems.contains(item.id),
                            canAfford: dragon.coins >= item.price,
                            onBuy: {
                                if dragon.buyItem(item) {
                                    purchasedItem = item
                                    showPurchaseAlert = true
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal, WestpacSpace.x3)
            }
            .padding(.bottom, WestpacSpace.x5)
        }
        .background(Color.wbcBackgroundPale)
        .alert("Item purchased", isPresented: $showPurchaseAlert) {
            Button("Nice") {}
        } message: {
            if let item = purchasedItem {
                Text("\(item.emoji) \(item.name) added to your dragon.")
            }
        }
    }
}

struct ShopItemCard: View {
    let item: ShopItem
    let owned: Bool
    let canAfford: Bool
    let onBuy: () -> Void

    var body: some View {
        VStack(spacing: WestpacSpace.x1) {
            Text(item.emoji)
                .font(.system(size: WestpacType.s4))
                .frame(height: 54)

            Text(item.name)
                .font(WestpacFont.heading(WestpacType.s9))
                .foregroundColor(.wbcTextHeading)
                .multilineTextAlignment(.center)

            Text(item.description)
                .font(WestpacFont.body(WestpacType.s10))
                .foregroundColor(.wbcTextMuted)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(minHeight: 40)

            CoinPill(count: item.price)
                .padding(.vertical, WestpacSpace.x05)

            if owned {
                Text("Owned")
                    .font(WestpacFont.body(WestpacType.s10, weight: .bold))
                    .foregroundColor(.wbcPrimary)
                    .padding(.horizontal, WestpacSpace.x15)
                    .padding(.vertical, WestpacSpace.x05)
                    .frame(height: 36)
                    .background(Color.wbcSurfacePrimaryFaint)
                    .clipShape(Capsule())
            } else {
                Button { onBuy() } label: {
                    Text(canAfford ? "Buy" : "Not enough")
                        .westpacButton(canAfford ? .primary : .faint, size: .medium)
                }
                .disabled(!canAfford)
            }
        }
        .frame(maxWidth: .infinity)
        .westpacCard(padding: WestpacSpace.x2)
    }
}
