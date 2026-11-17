import Foundation
import RealityKit
import simd

/// Loads the Westpac dragon USDZ and sizes it for a tabletop.
///
/// The asset is a Blender export: Z-up, 1.64 m tall, ~20.7k triangles, PBR textures.
/// Two things therefore have to be corrected at load time — see `upAxisCorrection`
/// and `targetSize`.
enum DragonModel {
    static let resourceName = "westpac_dragon"

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

    /// Returns the dragon wrapped in a container that has been scaled to
    /// `targetSize` and shifted so its feet sit on y = 0.
    /// Returns nil when the asset is missing or fails to load, so callers can
    /// fall back to primitive geometry rather than crash mid-demo.
    static func makeEntity(for stage: DragonStage, rotation: simd_quatf = upAxisCorrection) -> Entity? {
        guard let model = try? Entity.load(named: resourceName) else { return nil }

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
