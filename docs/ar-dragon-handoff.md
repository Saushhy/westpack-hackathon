# AR dragon: handoff for Shawn

Everything here comes from the real model in `/assets/dragon_3d`, so there is one
dragon across the web prototype, the video and the phone.

## What we have

| | |
|---|---|
| Source | `/assets/dragon_3d/base.obj`, 19,782 triangles, exported from Blender 4.3.2 |
| Assembled | `web/assets/dragon/dragon.glb`, 915 kB, all three maps embedded |
| Maps | base colour 1024, normal 1024, packed ORM 512 (roughness in G, metallic in B) |
| Height | 1.738 units, feet on `y = 0`, centred on the origin, Y up |
| Rig | **none**. One mesh, no skeleton, no animation clips |
| Rebuild | `cd web && npm run build:dragon` |

Because there is no rig, everything in AR is done with transforms: place, scale,
rotate, hop, and attach wearables at fixed offsets.

## Convert to USDZ

Two ways, either is fine:

1. **Blender 4.3** (Windows, fastest if you have the `.blend`):
   File > Export > Universal Scene Description, format `.usdz`, keep the material.
2. **Reality Converter** on the Mac: open `dragon.glb`, then File > Convert USDZ.

Then drop it in the app bundle as `dragon.usdz` and confirm it appears in
Build Phases > Copy Bundle Resources.

## Placement, in about 40 lines

```swift
import SwiftUI
import RealityKit
import ARKit

struct DragonAR: UIViewRepresentable {
    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero)
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal]
        view.session.run(config)

        let tap = UITapGestureRecognizer(target: context.coordinator,
                                         action: #selector(Coordinator.tap(_:)))
        view.addGestureRecognizer(tap)
        context.coordinator.view = view
        return view
    }

    func updateUIView(_ view: ARView, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject {
        weak var view: ARView?
        var dragon: Entity?

        @objc func tap(_ gesture: UITapGestureRecognizer) {
            guard let view, dragon == nil else { return }
            let point = gesture.location(in: view)

            // A table top, then the floor. One tap, one dragon.
            let hit = view.raycast(from: point, allowing: .estimatedPlane, alignment: .horizontal).first
            guard let hit else { return }
            place(at: hit.worldTransform, in: view)
        }

        func place(at transform: simd_float4x4, in view: ARView) {
            let anchor = AnchorEntity(world: transform)
            view.scene.addAnchor(anchor)

            Task { @MainActor in
                guard let model = try? await Entity(named: "dragon") else { return }
                // 1.738 units tall in the source, so 0.32 reads as a dragon on a desk.
                model.scale = .init(repeating: 0.32 / 1.738)
                anchor.addChild(model)
                dragon = model
                startIdle(in: view)
            }
        }

        /// No animation clips in the GLB, so idle is procedural: a slow turn.
        func startIdle(in view: ARView) {
            rotationSub = view.scene.subscribe(to: SceneEvents.Update.self) { [weak self] event in
                guard let dragon = self?.dragon else { return }
                let step = simd_quatf(angle: Float(event.deltaTime) * 0.4, axis: [0, 1, 0])
                dragon.orientation = simd_mul(step, dragon.orientation)
            }
        }
    }
}
```

Add `var rotationSub: EventSubscription?` next to `var dragon: Entity?` in the
Coordinator.

Scale note: if you would rather hang the dragon in the air beside the phone, skip
the raycast and use `AnchorEntity(anchor: .camera)` with a `0.5m` offset.

## Hats and scarves without a rig

The shop items are attachments, so they need an anchor point. Put one at the top
of the model and parent the worn item to it:

```swift
let head = Entity()
head.position = [0, 0.32 * 0.92, 0]   // 92% up the scaled height
model.addChild(head)

let cap = try await Entity(named: "cap")   // USDZ or a Sprite/Circle plane
head.addChild(cap)
```

Exact percentages used by the web prototype, measured from the rendered
silhouette, are in `web/app.js` under `WEAR_ANCHOR`: hat at 5% of the wrap,
shades at 18%, scarf at 38%. There are only three stages now (egg, baby,
adult), so measure the adult when its model arrives.

## The dragon speaks, and it does not chat

This is the compliance decision, so it applies in the app too. **The dragon never
generates text.** It reads a fixed line that was composed from `bills.json` and
the customer's own state. The web version of that is `dragonSaid()` in
`web/app.js`, and it is the reference implementation.

```swift
let line = "Afterpay takes $84.50 on 18 Nov. Keep cash aside for it."

let voice = AVSpeechSynthesizer()
let utterance = AVSpeechUtterance(string: line)
utterance.voice = AVSpeechSynthesisVoice(language: "en-AU")
utterance.rate = 0.48
voice.speak(utterance)
```

Show the same string in a SwiftUI bubble over the AR view, so the demo still works
with the volume off. `en-AU` and `0.48` are the two settings that make it sound
like a bank and not a satnav.

## What is not done

- No rig, so there is no walk, wing flap or level up animation. If Naomi can
  export one clip from the `.blend`, the level up moment gets much better.
- The USDZ conversion has not been tested here (no Mac on this machine). Open it
  in Reality Composer first and check the material came through.
- The web prototype uses a pre-rendered PNG of the model (`baby.png`) rather than a live
  renderer, because `index.html` has to work by double-click with no server. The GLB is
  there if you want it in AR. The adult stage has no model yet, so it falls back to 🐉.
