import SwiftUI

struct ScanningView: View {
    @EnvironmentObject var appState: AppState
    @State private var progress: Double = 0
    @State private var statusText = "Waking up your dragon..."
    @State private var pulseScale: CGFloat = 1.0
    @State private var ringRotation: Double = 0
    @State private var glowOpacity: Double = 0.3

    private let stages = [
        (0.2, "Reading your transactions..."),
        (0.4, "Spotting patterns..."),
        (0.6, "Checking repayment history..."),
        (0.8, "Finding savings opportunities..."),
        (1.0, "Your dragon is ready!")
    ]

    var body: some View {
        ZStack {
            WestpacGradient.dragonAtmosphere
                .ignoresSafeArea()

            // Radial glow behind dragon
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.wbcPrimary.opacity(glowOpacity), .clear],
                        center: .center,
                        startRadius: 20,
                        endRadius: 160
                    )
                )
                .frame(width: 320, height: 320)
                .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: glowOpacity)

            VStack(spacing: 32) {
                Spacer()

                // Dragon with orbiting ring
                ZStack {
                    Circle()
                        .stroke(
                            AngularGradient(
                                colors: [.wbcPrimary, .wbcDance, .wbcPop, .wbcPrimary],
                                center: .center
                            ),
                            lineWidth: 3
                        )
                        .frame(width: 140, height: 140)
                        .rotationEffect(.degrees(ringRotation))

                    Text("🐉")
                        .font(.system(size: 80))
                        .scaleEffect(pulseScale)
                }
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulseScale)
                .onAppear {
                    pulseScale = 1.15
                    glowOpacity = 0.6
                    withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                        ringRotation = 360
                    }
                }

                VStack(spacing: 12) {
                    Text("Your dragon is studying\nyour last 3 months")
                        .font(WestpacFont.heading(22))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)

                    Text(statusText)
                        .font(WestpacFont.body())
                        .foregroundColor(.white.opacity(0.7))
                        .animation(.easeInOut, value: statusText)
                }

                // Custom progress ring
                ZStack {
                    RoundedRectangle(cornerRadius: WestpacRadius.full)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 8)

                    GeometryReader { geo in
                        RoundedRectangle(cornerRadius: WestpacRadius.full)
                            .fill(Color.white)
                            .frame(width: geo.size.width * progress, height: 8)
                    }
                    .frame(height: 8)
                }
                .padding(.horizontal, 40)

                Spacer()

                if progress >= 1.0 {
                    Button {
                        withAnimation { appState.currentScreen = .questions }
                    } label: {
                        Text("See what your dragon found")
                            .westpacButton(.primary, size: .xlarge)
                    }
                    .padding(.horizontal, WestpacSpace.x4)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                Spacer().frame(height: 40)
            }
        }
        .onAppear { runScan() }
    }

    private func runScan() {
        for (i, stage) in stages.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.8) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    progress = stage.0
                    statusText = stage.1
                }
            }
        }
    }
}
