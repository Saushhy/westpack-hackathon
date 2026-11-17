import SwiftUI

struct WestpacLogoShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 69.0
        let sy = rect.height / 28.0
        var p = Path()

        // Left stroke
        p.move(to: CGPoint(x: 24.0303 * sx, y: 25.0896 * sy))
        p.addCurve(
            to: CGPoint(x: 12.4091 * sx, y: 0),
            control1: CGPoint(x: 24.0303 * sx, y: 25.0896 * sy),
            control2: CGPoint(x: 17.3333 * sx, y: 4.1147 * sy)
        )
        // Simplified: use the actual path data from GEL
        // We'll draw the three shapes directly

        p = Path()

        // Left angled shape
        p.move(to: CGPoint(x: 24.0303 * sx, y: 25.0896 * sy))
        p.addLine(to: CGPoint(x: 17.3333 * sx, y: 4.1147 * sy))
        p.addCurve(
            to: CGPoint(x: 12.4091 * sx, y: 0),
            control1: CGPoint(x: 16.447 * sx, y: 0.903226 * sy),
            control2: CGPoint(x: 14.7727 * sx, y: 0)
        )
        p.addLine(to: CGPoint(x: 0, y: 0))
        p.addCurve(
            to: CGPoint(x: 1.57576 * sx, y: 2.91039 * sy),
            control1: CGPoint(x: 0.984848 * sx, y: 0.401434 * sy),
            control2: CGPoint(x: 1.57576 * sx, y: 2.91039 * sy)
        )
        p.addLine(to: CGPoint(x: 7.58333 * sx, y: 23.9857 * sy))
        p.addCurve(
            to: CGPoint(x: 12.9015 * sx, y: 28.0 * sy),
            control1: CGPoint(x: 8.27273 * sx, y: 26.595 * sy),
            control2: CGPoint(x: 10.4394 * sx, y: 28.0 * sy)
        )
        p.addLine(to: CGPoint(x: 26.0 * sx, y: 28.0 * sy))
        p.addCurve(
            to: CGPoint(x: 24.0303 * sx, y: 25.0896 * sy),
            control1: CGPoint(x: 25.0152 * sx, y: 27.8996 * sy),
            control2: CGPoint(x: 24.0303 * sx, y: 25.0896 * sy)
        )
        p.closeSubpath()

        // Right angled shape (mirrored)
        p.move(to: CGPoint(x: 44.9697 * sx, y: 25.0896 * sy))
        p.addLine(to: CGPoint(x: 51.6667 * sx, y: 4.1147 * sy))
        p.addCurve(
            to: CGPoint(x: 56.5909 * sx, y: 0),
            control1: CGPoint(x: 52.553 * sx, y: 0.903226 * sy),
            control2: CGPoint(x: 54.2273 * sx, y: 0)
        )
        p.addLine(to: CGPoint(x: 69.0 * sx, y: 0))
        p.addCurve(
            to: CGPoint(x: 67.4242 * sx, y: 2.91039 * sy),
            control1: CGPoint(x: 68.0152 * sx, y: 0.401434 * sy),
            control2: CGPoint(x: 67.4242 * sx, y: 2.91039 * sy)
        )
        p.addLine(to: CGPoint(x: 61.4167 * sx, y: 23.9857 * sy))
        p.addCurve(
            to: CGPoint(x: 56.0985 * sx, y: 28.0 * sy),
            control1: CGPoint(x: 60.7273 * sx, y: 26.595 * sy),
            control2: CGPoint(x: 58.5606 * sx, y: 28.0 * sy)
        )
        p.addLine(to: CGPoint(x: 43.0 * sx, y: 28.0 * sy))
        p.addCurve(
            to: CGPoint(x: 44.9697 * sx, y: 25.0896 * sy),
            control1: CGPoint(x: 43.9848 * sx, y: 27.8996 * sy),
            control2: CGPoint(x: 44.9697 * sx, y: 25.0896 * sy)
        )
        p.closeSubpath()

        // Center rectangle
        p.addRect(CGRect(x: 27.0 * sx, y: 0, width: 15.0 * sx, height: 28.0 * sy))

        return p
    }
}

struct WestpacLogo: View {
    var color: Color = .wbcPrimary
    var height: CGFloat = 28

    var body: some View {
        WestpacLogoShape()
            .fill(color)
            .frame(width: height * (69.0 / 28.0), height: height)
    }
}

struct WestpacLogoFilled: View {
    var size: CGFloat = 60

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.wbcPrimary)
                .frame(width: size, height: size)

            WestpacLogoShape()
                .fill(.white)
                .frame(width: size * 0.55, height: size * 0.55 * (28.0 / 69.0))
        }
    }
}

struct WestpacWordmark: View {
    var body: some View {
        HStack(spacing: 8) {
            WestpacLogoFilled(size: 36)
            Text("Westpac")
                .font(.system(size: 20, weight: .bold, design: .default))
                .foregroundColor(.wbcHero)
        }
    }
}

struct WestpacNavHeader: View {
    var title: String
    var showLogo: Bool = true

    var body: some View {
        HStack(spacing: 10) {
            if showLogo {
                WestpacLogoFilled(size: 32)
            }
            Text(title)
                .font(WestpacFont.heading(18))
                .foregroundColor(.wbcTextHeading)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
