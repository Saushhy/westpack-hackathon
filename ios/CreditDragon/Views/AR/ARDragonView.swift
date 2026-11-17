import SwiftUI
import ARKit
import RealityKit

struct ARDragonView: View {
    @EnvironmentObject var appState: AppState
    @State private var dragonPlaced = false
    @State private var showLevelUp = false

    var body: some View {
        ZStack {
            ARViewContainer(dragonPlaced: $dragonPlaced, stage: appState.dragon.stage)
                .ignoresSafeArea()

            VStack {
                // Top bar
                HStack {
                    Button {
                        withAnimation {
                            appState.selectedTab = .dragon
                            appState.currentScreen = .main
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                            .shadow(radius: 4)
                    }
                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(appState.dragon.name)
                            .font(WestpacFont.heading(16))
                            .foregroundColor(.white)
                            .shadow(radius: 4)
                        Text("Level: \(appState.dragon.stage.displayName)")
                            .font(WestpacFont.caption())
                            .foregroundColor(.white.opacity(0.8))
                            .shadow(radius: 4)
                    }
                }
                .padding(20)

                Spacer()

                if !dragonPlaced {
                    VStack(spacing: 8) {
                        Image(systemName: "viewfinder")
                            .font(.system(size: 40))
                            .foregroundColor(.white)

                        Text("Point at a flat surface\nthen tap to place your dragon")
                            .font(WestpacFont.body(16))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .shadow(radius: 4)
                    }
                    .padding(.bottom, 60)
                }

                if dragonPlaced {
                    HStack(spacing: 16) {
                        Button {
                            showLevelUp = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                showLevelUp = false
                            }
                        } label: {
                            Label("Level Up!", systemImage: "sparkles")
                                .font(WestpacFont.heading(14))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 12)
                                .background(Color.wbcPrimary)
                                .clipShape(Capsule())
                                .shadow(radius: 4)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }

            if showLevelUp {
                VStack {
                    Spacer()
                    Text("⬆️ LEVEL UP!")
                        .font(WestpacFont.heading(32))
                        .foregroundColor(.wbcDance)
                        .shadow(color: .black, radius: 8)
                        .scaleEffect(showLevelUp ? 1.2 : 0.5)
                        .animation(.spring(response: 0.4, dampingFraction: 0.5), value: showLevelUp)
                    Spacer()
                }
            }
        }
    }
}

struct ARViewContainer: UIViewRepresentable {
    @Binding var dragonPlaced: Bool
    let stage: DragonStage

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)

        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal]
        config.environmentTexturing = .automatic
        arView.session.run(config)

        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        arView.addGestureRecognizer(tapGesture)

        context.coordinator.arView = arView
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(dragonPlaced: $dragonPlaced, stage: stage)
    }

    class Coordinator: NSObject {
        var arView: ARView?
        var dragonPlaced: Binding<Bool>
        let stage: DragonStage
        var dragonAnchor: AnchorEntity?

        init(dragonPlaced: Binding<Bool>, stage: DragonStage) {
            self.dragonPlaced = dragonPlaced
            self.stage = stage
        }

        @objc func handleTap(_ sender: UITapGestureRecognizer) {
            guard let arView = arView, !dragonPlaced.wrappedValue else { return }

            let location = sender.location(in: arView)
            let results = arView.raycast(from: location, allowing: .estimatedPlane, alignment: .horizontal)

            if let first = results.first {
                placeDragon(at: first.worldTransform, in: arView)
            }
        }

        func placeDragon(at transform: simd_float4x4, in arView: ARView) {
            let anchor = AnchorEntity(world: transform)

            let mesh: MeshResource
            let scale: Float

            switch stage {
            case .egg:
                mesh = .generateSphere(radius: 0.06)
                scale = 1.0
            case .baby:
                mesh = .generateSphere(radius: 0.08)
                scale = 1.2
            case .teen:
                mesh = .generateBox(size: [0.12, 0.15, 0.12], cornerRadius: 0.02)
                scale = 1.0
            case .adult:
                mesh = .generateBox(size: [0.18, 0.22, 0.18], cornerRadius: 0.03)
                scale = 1.0
            }

            // Westpac red dragon material
            var material = SimpleMaterial()
            material.color = .init(tint: UIColor(red: 0.855, green: 0.09, blue: 0.063, alpha: 1.0))
            material.metallic = .float(0.3)
            material.roughness = .float(0.4)

            let entity = ModelEntity(mesh: mesh, materials: [material])
            entity.scale = [scale, scale, scale]

            // Hover animation
            let startPos = entity.position
            entity.position.y = startPos.y + 0.05
            entity.move(
                to: Transform(
                    scale: entity.scale,
                    rotation: entity.orientation,
                    translation: SIMD3(startPos.x, startPos.y + 0.12, startPos.z)
                ),
                relativeTo: anchor,
                duration: 1.5,
                timingFunction: .easeInOut
            )

            anchor.addChild(entity)
            arView.scene.addAnchor(anchor)
            dragonAnchor = anchor

            DispatchQueue.main.async {
                self.dragonPlaced.wrappedValue = true
            }
        }
    }
}
