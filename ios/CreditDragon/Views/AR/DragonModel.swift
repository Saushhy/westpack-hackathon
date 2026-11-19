import Foundation
import RealityKit
import simd

/// Loads the Westpac dragon USDZ and sizes it for a tabletop.
///
/// The asset is a Blender export: Z-up, 1.64 m tall, ~20.7k triangles, PBR textures.
/// Two things therefore have to be corrected at load time — see `upAxisCorrection`
/// and `targetSize`.
struct DragonAnimationPair {
    let container: Entity
    let idle: Entity
    let action: Entity
}

enum DragonModel {
    /// Only the two grown stages have sculpted models. Hatched reuses the L1
    /// dragon at a smaller size; the egg has none and falls back to a sphere,
    /// which reads as an egg anyway.
    static func resourceName(for stage: DragonStage) -> String? {
        switch stage {
        case .egg: return nil
        case .baby: return "westpac_dragon_l1"
        case .teen: return "westpac_dragon_l1"
        case .adult: return "westpac_dragon_l2"
        }
    }

    /// Longest dimension the dragon should occupy on a table, per evolution stage.
    /// Scaling by the *longest* extent rather than height keeps the model a sane
    /// size whichever way up the importer decides the asset is.
    static func targetSize(for stage: DragonStage) -> Float {
        switch stage {
        case .egg: return 0.14
        case .baby: return 0.18
        case .teen: return 0.24
        case .adult: return 0.30
        }
    }

    /// The USDZ declares `upAxis = "Z"` with no compensating root transform, and
    /// RealityKit's importer does not convert it — verified on the Simulator, where
    /// the dragon loaded lying on its back. This quarter turn maps +Z up to +Y up.
    static let upAxisCorrection: simd_quatf = .init(angle: -.pi / 2, axis: [1, 0, 0])

    /// Loads the shared dragon mesh twice so each USDZ can keep its own baked
    /// skeletal clip. Both files use the same skeleton: Walk idles, Dive_Attack
    /// plays once on touch. The action model is hidden until needed.
    static func makeAnimationPair(for stage: DragonStage) -> DragonAnimationPair? {
        guard stage != .egg else { return nil }
        guard let idle = try? Entity.load(named: "dragon_walk_idle"),
              let action = try? Entity.load(named: "dragon_dive_attack") else { return nil }
        guard !idle.availableAnimations.isEmpty,
              !action.availableAnimations.isEmpty else { return nil }

        idle.orientation = upAxisCorrection
        action.orientation = upAxisCorrection

        let bounds = idle.visualBounds(relativeTo: nil)
        let extents = bounds.extents
        let longest = max(extents.x, max(extents.y, extents.z))
        guard longest > 0 else { return nil }

        let scale = targetSize(for: stage) / longest
        idle.scale = [scale, scale, scale]
        action.scale = [scale, scale, scale]

        let scaled = idle.visualBounds(relativeTo: nil)
        let floorOffset = -scaled.min.y
        idle.position.y += floorOffset
        action.position.y += floorOffset
        action.isEnabled = false

        let container = Entity()
        container.addChild(idle)
        container.addChild(action)

        // Imported USDZ meshes don't carry RealityKit collision shapes by
        // default. Add an invisible bounds collider so ARView.entity(at:) can
        // recognize taps on the dragon and its animated replacement.
        let boundsInContainer = idle.visualBounds(relativeTo: container)
        let tapTarget = Entity()
        tapTarget.position = boundsInContainer.center
        tapTarget.components.set(
            CollisionComponent(shapes: [.generateBox(size: boundsInContainer.extents)])
        )
        container.addChild(tapTarget)

        return DragonAnimationPair(container: container, idle: idle, action: action)
    }

    /// Returns the dragon wrapped in a container that has been scaled to
    /// `targetSize` and shifted so its feet sit on y = 0.
    /// Returns nil when the asset is missing or fails to load, so callers can
    /// fall back to primitive geometry rather than crash mid-demo.
    static func makeEntity(for stage: DragonStage, rotation: simd_quatf = upAxisCorrection) -> Entity? {
        guard let name = resourceName(for: stage),
              let model = try? Entity.load(named: name) else { return nil }

        model.orientation = rotation

        let bounds = model.visualBounds(relativeTo: nil)
        let extents = bounds.extents
        let longest = max(extents.x, max(extents.y, extents.z))
        guard longest > 0 else { return nil }

        let scale = targetSize(for: stage) / longest
        model.scale = [scale, scale, scale]

        // Re-measure after scaling, then lift so the lowest point rests on the plane.
        let scaled = model.visualBounds(relativeTo: nil)
        model.position.y -= scaled.min.y

        let container = Entity()
        container.addChild(model)
        return container
    }
}
