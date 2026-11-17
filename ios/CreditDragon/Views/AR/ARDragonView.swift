import SwiftUI
import ARKit
import RealityKit

struct ARDragonView: View {
    @EnvironmentObject var appState: AppState
    @State private var dragonPlaced = false
    @State private var celebrating: DragonStage?

    /// False in the Simulator and on any device without world tracking.
    private var arAvailable: Bool { ARWorldTrackingConfiguration.isSupported }

    var body: some View {
        ZStack {
            if arAvailable {
                ARViewContainer(dragonPlaced: $dragonPlaced, stage: appState.dragon.stage)
                    .ignoresSafeArea()
            } else {
                unavailableBackdrop
            }

            VStack {
                topBar
                Spacer()
                if arAvailable && !dragonPlaced {
                    placementPrompt
                }
                if dragonPlaced || !arAvailable {
                    replayButton
                }
            }

            if let stage = celebrating {
                celebration(stage)
            }
        }
        .onAppear(perform: consumePendingEvolution)
    }

    // MARK: - Chrome

    private var topBar: some View {
        HStack(alignment: .top) {
            Button {
                withAnimation {
                    appState.selectedTab = .dragon
                    appState.currentScreen = .main
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.white)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(appState.dragon.name)
                    .font(WestpacFont.heading(WestpacType.s9))
                    .foregroundColor(.white)
                Text("Level \(appState.dragon.level) · \(appState.dragon.stage.displayName)")
                    .font(WestpacFont.body(WestpacType.s10))
                    .foregroundColor(.white.opacity(0.85))
            }
        }
        .shadow(color: .black.opacity(0.5), radius: 4)
        .padding(WestpacSpace.x3)
    }

    private var placementPrompt: some View {
        VStack(spacing: WestpacSpace.x1) {
            Image(systemName: "viewfinder")
                .font(.system(size: 40))
                .foregroundColor(.white)
            Text("Point at a flat surface\nthen tap to place your dragon")
                .font(WestpacFont.body(WestpacType.s9))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
        }
        .shadow(color: .black.opacity(0.5), radius: 4)
        .padding(.bottom, WestpacSpace.x6)
    }

    /// Replays the evolution animation for filming retakes. Awards nothing —
    /// progression is earned on the Bills and Goals tabs, never here.
    private var replayButton: some View {
        Button {
            play(appState.dragon.stage)
        } label: {
            Label("Replay animation", systemImage: "sparkles")
                .font(WestpacFont.body(WestpacType.s9, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, WestpacSpace.x3)
                .frame(height: 42)
                .background(Color.wbcPrimary)
                .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.lg))
        }
        .padding(.bottom, WestpacSpace.x6)
    }

    private var unavailableBackdrop: some View {
        ZStack {
            WestpacGradient.dragonAtmosphere.ignoresSafeArea()

            VStack(spacing: WestpacSpace.x3) {
                DragonPreviewView(stage: appState.dragon.stage)
                    .frame(height: 260)

                Text("AR needs a real device")
                    .font(WestpacFont.heading(WestpacType.s7))
                    .foregroundColor(.white)

                Text("This is your dragon, but the Simulator has no camera to place it in. Run Credit Dragon on an iPhone to put it on the table.")
                    .font(WestpacFont.body(WestpacType.s9))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, WestpacSpace.x5)
        }
    }

    // MARK: - Evolution celebration

    private func celebration(_ stage: DragonStage) -> some View {
        VStack(spacing: WestpacSpace.x2) {
            Text(stage.emoji)
                .font(.system(size: 96))

            Text("\(appState.dragon.name) is now a \(stage.displayName)")
                .font(WestpacFont.heading(WestpacType.s7))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text("Level \(appState.dragon.level) · \(appState.dragon.xp) XP")
                .font(WestpacFont.body(WestpacType.s9))
                .foregroundColor(.white.opacity(0.85))
        }
        .padding(WestpacSpace.x4)
        .background(Color.wbcHero)
        .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.xxl))
        .overlay(
            RoundedRectangle(cornerRadius: WestpacRadius.xxl)
                .stroke(Color.white.opacity(0.25), lineWidth: 1)
        )
        .padding(.horizontal, WestpacSpace.x4)
        .transition(.scale(scale: 0.6).combined(with: .opacity))
    }

    /// The dragon evolves on the Bills and Goals tabs; AR just celebrates it
    /// the next time you open this screen.
    private func consumePendingEvolution() {
        guard let stage = appState.justEvolvedTo else { return }
        appState.justEvolvedTo = nil
        play(stage)
    }

    private func play(_ stage: DragonStage) {
        withAnimation(.spring(response: 0.45, dampingFraction: 0.6)) {
            celebrating = stage
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) {
            withAnimation { celebrating = nil }
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
            let entity = DragonModel.makeEntity(for: stage) ?? Self.primitiveDragon(for: stage)

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

        /// Fallback if the USDZ is missing or fails to load, so a demo never
        /// ends up with an empty table.
        static func primitiveDragon(for stage: DragonStage) -> Entity {
            let mesh: MeshResource
            switch stage {
            case .egg: mesh = .generateSphere(radius: 0.06)
            case .baby: mesh = .generateSphere(radius: 0.08)
            case .teen: mesh = .generateBox(size: [0.12, 0.15, 0.12], cornerRadius: 0.02)
            case .adult: mesh = .generateBox(size: [0.18, 0.22, 0.18], cornerRadius: 0.03)
            }

            var material = SimpleMaterial()
            material.color = .init(tint: UIColor(red: 0.855, green: 0.09, blue: 0.063, alpha: 1.0))
            material.metallic = .float(0.3)
            material.roughness = .float(0.4)

            return ModelEntity(mesh: mesh, materials: [material])
        }
    }
}

/// Renders the dragon with RealityKit but no camera feed, so the model can be
/// seen (and checked) on the Simulator and used as a filming backup.
struct DragonPreviewView: UIViewRepresentable {
    let stage: DragonStage

    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        view.environment.background = .color(.clear)

        guard let dragon = DragonModel.makeEntity(for: stage) else { return view }

        let anchor = AnchorEntity(world: .zero)
        anchor.addChild(dragon)

        let light = DirectionalLight()
        light.light.intensity = 3000
        light.look(at: .zero, from: [1, 2, 2], relativeTo: nil)
        anchor.addChild(light)

        // Frame the camera off the model's size so every stage fills the preview.
        let size = DragonModel.targetSize(for: stage)
        let focus: SIMD3<Float> = [0, size * 0.5, 0]
        let camera = PerspectiveCamera()
        camera.position = [0, size * 0.75, size * 1.9]
        camera.look(at: focus, from: camera.position, relativeTo: nil)
        anchor.addChild(camera)

        view.scene.addAnchor(anchor)

        dragon.transform.rotation = .init(angle: 0, axis: [0, 1, 0])
        spin(dragon)
        return view
    }

    func updateUIView(_ uiView: ARView, context: Context) {}

    private func spin(_ entity: Entity) {
        var turned = entity.transform
        turned.rotation = .init(angle: .pi, axis: [0, 1, 0])
        entity.move(to: turned, relativeTo: entity.parent, duration: 6, timingFunction: .linear)
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak entity] in
            guard let entity else { return }
            entity.transform.rotation = .init(angle: 0, axis: [0, 1, 0])
            spin(entity)
        }
    }
}
