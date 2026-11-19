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
                if dragonPlaced && arAvailable {
                    Text("Tap your dragon to see its move")
                        .font(WestpacFont.body(WestpacType.s10))
                        .foregroundColor(.white.opacity(0.9))
                        .shadow(color: .black.opacity(0.5), radius: 4)
                        .padding(.bottom, WestpacSpace.x1)
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

        // Apple's own "move your phone around" guidance. Without it there is no
        // feedback while ARKit is still looking for a plane.
        let coaching = ARCoachingOverlayView()
        coaching.session = arView.session
        coaching.goal = .horizontalPlane
        coaching.activatesAutomatically = true
        coaching.translatesAutoresizingMaskIntoConstraints = false
        arView.addSubview(coaching)
        NSLayoutConstraint.activate([
            coaching.leadingAnchor.constraint(equalTo: arView.leadingAnchor),
            coaching.trailingAnchor.constraint(equalTo: arView.trailingAnchor),
            coaching.topAnchor.constraint(equalTo: arView.topAnchor),
            coaching.bottomAnchor.constraint(equalTo: arView.bottomAnchor),
        ])

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

        /// The two imported USDZs share a skeleton and mesh. The Walk clip loops
        /// on the idle model; taps temporarily switch to the Dive_Attack model.
        private var dragon: Entity?
        private var idleDragon: Entity?
        private var actionDragon: Entity?
        private var idling = false
        private var playingTapAnimation = false

        init(dragonPlaced: Binding<Bool>, stage: DragonStage) {
            self.dragonPlaced = dragonPlaced
            self.stage = stage
        }

        @objc func handleTap(_ sender: UITapGestureRecognizer) {
            guard let arView = arView else { return }

            let location = sender.location(in: arView)

            // After placement, only a hit on the dragon triggers its animation.
            if dragonPlaced.wrappedValue {
                guard let hitEntity = arView.entity(at: location),
                      hitBelongsToDragon(hitEntity) else { return }
                playTapAnimation()
                return
            }

            // Prefer a real horizontal surface, then an estimated one at any
            // alignment. Without the fallback a tap on a poorly-lit or low-texture
            // table simply does nothing, which reads as "the dragon is broken".
            let hit = arView.raycast(from: location, allowing: .existingPlaneGeometry, alignment: .horizontal).first
                ?? arView.raycast(from: location, allowing: .estimatedPlane, alignment: .horizontal).first
                ?? arView.raycast(from: location, allowing: .estimatedPlane, alignment: .any).first

            if let hit {
                placeDragon(at: hit.worldTransform, in: arView)
            }
        }

        func placeDragon(at transform: simd_float4x4, in arView: ARView) {
            let anchor = AnchorEntity(world: transform)
            let animationPair = DragonModel.makeAnimationPair(for: stage)
            let entity = animationPair?.container
                ?? DragonModel.makeEntity(for: stage)
                ?? Self.primitiveDragon(for: stage)
            idleDragon = animationPair?.idle
            actionDragon = animationPair?.action

            // Parent and add to the scene BEFORE animating. Moving an unparented
            // entity relativeTo the anchor sets a world-space transform, which
            // addChild then reinterprets as a local offset — landing the dragon
            // at roughly twice the hit distance, usually out of frame.
            anchor.addChild(entity)

            // A dragon lit only by estimated environment texturing reads very dark
            // indoors, so give it its own key light.
            let light = DirectionalLight()
            light.light.intensity = 2500
            light.look(at: .zero, from: [0.4, 1.2, 0.6], relativeTo: anchor)
            anchor.addChild(light)

            arView.scene.addAnchor(anchor)
            dragonAnchor = anchor

            // Settle onto the surface: start just above it, drop to feet-on-plane.
            entity.position = [0, 0.06, 0]
            var landed = entity.transform
            landed.translation = .zero
            entity.move(to: landed, relativeTo: anchor, duration: 0.6, timingFunction: .easeOut)

            dragon = entity
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
                self?.startIdle()
            }

            DispatchQueue.main.async {
                self.dragonPlaced.wrappedValue = true
            }
        }

        // MARK: - Imported animation

        private func hitBelongsToDragon(_ hit: Entity) -> Bool {
            var current: Entity? = hit
            while let entity = current {
                if entity === dragon { return true }
                current = entity.parent
            }
            return false
        }

        private func playTapAnimation() {
            guard !playingTapAnimation,
                  let idleDragon,
                  let actionDragon,
                  let animation = actionDragon.availableAnimations.first else {
                hop()
                return
            }

            idling = false
            playingTapAnimation = true
            idleDragon.stopAllAnimations(recursive: true)
            idleDragon.isEnabled = false
            actionDragon.isEnabled = true

            let playback = actionDragon.playAnimation(animation)
            DispatchQueue.main.asyncAfter(deadline: .now() + playback.duration) { [weak self] in
                guard let self else { return }
                actionDragon.stopAllAnimations(recursive: true)
                actionDragon.isEnabled = false
                idleDragon.isEnabled = true
                self.playingTapAnimation = false
                self.startIdle()
            }
        }

        // MARK: - Idle animation

        private static let bobHeight: Float = 0.018
        private static let bobDuration: TimeInterval = 1.5

        func startIdle() {
            guard !idling else { return }
            idling = true

            if let idleDragon,
               let animation = idleDragon.availableAnimations.first {
                actionDragon?.stopAllAnimations(recursive: true)
                actionDragon?.isEnabled = false
                idleDragon.isEnabled = true
                idleDragon.playAnimation(animation.repeat())
                return
            }

            // Keep the previous procedural float as a graceful fallback if an
            // animation asset cannot be loaded on a device.
            bob(up: true)
        }

        /// Gentle float, alternating each half-cycle. Reads as breathing at a
        /// distance and is the main thing that stops it looking pasted on.
        private func bob(up: Bool) {
            guard idling, let dragon, dragon.scene != nil else { return }

            var target = dragon.transform
            target.translation.y = up ? Self.bobHeight : 0
            dragon.move(to: target,
                        relativeTo: dragon.parent,
                        duration: Self.bobDuration,
                        timingFunction: .easeInOut)

            DispatchQueue.main.asyncAfter(deadline: .now() + Self.bobDuration) { [weak self] in
                self?.bob(up: !up)
            }
        }

        /// Fallback tap response used when the animated assets are unavailable.
        private func hop() {
            guard let dragon, dragon.scene != nil else { return }
            idling = false

            var jump = dragon.transform
            jump.translation.y = 0.09
            jump.rotation = simd_quatf(angle: .pi / 2, axis: [0, 1, 0]) * dragon.transform.rotation
            dragon.move(to: jump, relativeTo: dragon.parent, duration: 0.28, timingFunction: .easeOut)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) { [weak self] in
                guard let self, let dragon = self.dragon else { return }
                var down = dragon.transform
                down.translation.y = 0
                dragon.move(to: down, relativeTo: dragon.parent, duration: 0.22, timingFunction: .easeIn)

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) { [weak self] in
                    self?.startIdle()
                }
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
