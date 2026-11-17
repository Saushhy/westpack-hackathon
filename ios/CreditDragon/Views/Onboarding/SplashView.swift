import SwiftUI

struct SplashView: View {
    @EnvironmentObject var appState: AppState
    @State private var logoScale: CGFloat = 0.6
    @State private var logoOpacity: Double = 0
    @State private var taglineOpacity: Double = 0
    @State private var dragonOpacity: Double = 0
    @State private var dragonOffset: CGFloat = 20
    @State private var shimmerOffset: CGFloat = -200

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Westpac logo
                WestpacLogoFilled(size: 80)
                    .scaleEffect(logoScale)
                    .opacity(logoOpacity)

                VStack(spacing: 6) {
                    Text("Credit Dragon")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.wbcHero)
                        .opacity(logoOpacity)

                    Text("by Westpac")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.wbcMuted400)
                        .opacity(taglineOpacity)
                }

                Spacer()

                // Dragon teaser
                VStack(spacing: 12) {
                    Text("🐉")
                        .font(.system(size: 56))
                        .opacity(dragonOpacity)
                        .offset(y: dragonOffset)

                    Text("Your credit health coach is hatching...")
                        .font(WestpacFont.body(15))
                        .foregroundColor(.wbcTextMuted)
                        .opacity(dragonOpacity)
                }
                .padding(.bottom, 60)

                Spacer()

                // Bottom Westpac bar
                HStack(spacing: 6) {
                    WestpacLogoFilled(size: 20)
                    Text("Westpac Banking Corporation")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundColor(.wbcMuted400)
                }
                .opacity(taglineOpacity)
                .padding(.bottom, 16)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                logoScale = 1.0
                logoOpacity = 1.0
            }

            withAnimation(.easeOut(duration: 0.5).delay(0.4)) {
                taglineOpacity = 1.0
            }

            withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.8)) {
                dragonOpacity = 1.0
                dragonOffset = 0
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                withAnimation(.easeInOut(duration: 0.4)) {
                    appState.currentScreen = .scanning
                }
            }
        }
    }
}
