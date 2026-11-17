import SwiftUI

// Westpac GEL Design Tokens
// Source: WestpacGEL/GEL-next @ packages/style-config/src/tokens/ios/wbc/*.swift
//         packages/style-config/src/constants/spacing.ts  (SPACING_UNIT = 6)
//         packages/style-config/src/css/shared/typography.css
// GEL is a flat, border-only system: it defines no shadow/elevation tokens.

extension Color {
    // MARK: - Background
    static let wbcBackgroundWhite = Color(hex: "#FFFFFF")
    static let wbcBackgroundPale = Color(hex: "#F5F5F6")
    static let wbcBackgroundFaint = Color(hex: "#F9F9FA")

    // MARK: - Brand
    static let wbcPrimary = Color(hex: "#DA1710")
    static let wbcHero = Color(hex: "#1F1C4F")

    // MARK: - Surface
    static let wbcSurfacePrimary = Color(hex: "#DA1710")
    static let wbcSurfacePrimaryFaint = Color(hex: "#FFF0F0")
    static let wbcSurfaceHero = Color(hex: "#1F1C4F")
    static let wbcSurfaceHeroFaint = Color(hex: "#F1F0FA")
    static let wbcSurfaceSuccessFaint = Color(hex: "#F2F9F2")
    static let wbcSurfaceInfoFaint = Color(hex: "#F2F8FC")
    static let wbcSurfaceWarningFaint = Color(hex: "#FCF5F2")
    static let wbcSurfaceDangerFaint = Color(hex: "#FCF2F2")

    // Hover / active
    static let wbcSurfaceHoverHero = Color(hex: "#423C97")
    static let wbcSurfaceActiveHero = Color(hex: "#6F69C9")

    // MARK: - Muted scale
    static let wbcMuted50 = Color(hex: "#F9F9FA")
    static let wbcMuted100 = Color(hex: "#F5F5F6")
    static let wbcMuted200 = Color(hex: "#DEDEE1")
    static let wbcMuted300 = Color(hex: "#B6B6BC")
    static let wbcMuted400 = Color(hex: "#8E8D98")
    static let wbcMuted500 = Color(hex: "#706F7C")
    static let wbcMuted950 = Color(hex: "#161619")

    // MARK: - Text
    static let wbcTextBody = Color(hex: "#161619")
    static let wbcTextHeading = Color(hex: "#1F1C4F")
    static let wbcTextMuted = Color(hex: "#706F7C")
    static let wbcTextMono = Color(hex: "#FFFFFF")

    // MARK: - Status
    static let wbcSuccess = Color(hex: "#008000")
    static let wbcInfo = Color(hex: "#0074C4")
    static let wbcWarning = Color(hex: "#C53B00")
    static let wbcDanger = Color(hex: "#C40000")

    static let wbcSuccessMild = Color(hex: "#47A447")
    static let wbcInfoMild = Color(hex: "#459AD4")
    static let wbcWarningMild = Color(hex: "#D7784F")
    static let wbcDangerMild = Color(hex: "#DB6363")

    // MARK: - Border
    static let wbcBorder = Color(hex: "#DEDEE1")        // border-muted-soft
    static let wbcBorderMild = Color(hex: "#B6B6BC")
    static let wbcBorderStrong = Color(hex: "#8E8D98")
    static let wbcBorderFocus = Color(hex: "#BC57EB")

    // MARK: - Accent
    static let wbcPop = Color(hex: "#FF3DDB")
    static let wbcHoller = Color(hex: "#991AD6")

    // MARK: - Data visualisation
    static let wbcDataA = Color(hex: "#DA1710")
    static let wbcDataB = Color(hex: "#1F1C4F")
    static let wbcDataBTint = Color(hex: "#6F69C9")
    static let wbcDataC = Color(hex: "#FF3DDB")
    static let wbcDataD = Color(hex: "#991AD6")
    static let wbcDataF = Color(hex: "#F57A0F")
    static let wbcDataFTint = Color(hex: "#F9B071")

    static let wbcDance = Color(hex: "#F57A0F")   // coin / reward accent (data-F)
}

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r, g, b: Double
        switch h.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 1; g = 1; b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Spacing (SPACING_UNIT = 6)

struct WestpacSpace {
    static let x05: CGFloat = 3
    static let x1: CGFloat = 6
    static let x15: CGFloat = 9
    static let x2: CGFloat = 12
    static let x25: CGFloat = 15
    static let x3: CGFloat = 18
    static let x4: CGFloat = 24
    static let x5: CGFloat = 30
    static let x6: CGFloat = 36
    static let x7: CGFloat = 42
    static let x8: CGFloat = 48
}

// MARK: - Border radius

struct WestpacRadius {
    static let none: CGFloat = 0
    static let sm: CGFloat = 3
    static let md: CGFloat = 4
    static let lg: CGFloat = 5
    static let xl: CGFloat = 6
    static let xxl: CGFloat = 8
    static let xxxl: CGFloat = 12
    static let xxxxl: CGFloat = 16
    static let xxxxxl: CGFloat = 24
    static let full: CGFloat = 999
}

// MARK: - Typography
// GEL ladder: 60/54/48/42/36/30/24/18/16/14. There is no type below 14.

struct WestpacType {
    static let s1: CGFloat = 60
    static let s2: CGFloat = 54
    static let s3: CGFloat = 48
    static let s4: CGFloat = 42
    static let s5: CGFloat = 36
    static let s6: CGFloat = 30
    static let s7: CGFloat = 24
    static let s8: CGFloat = 18
    static let s9: CGFloat = 16
    static let s10: CGFloat = 14

    static let lineTight: CGFloat = 1.2
    static let lineNormal: CGFloat = 1.4
}

struct WestpacFont {
    /// GEL headings take their hierarchy from size, not weight.
    static func heading(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    static func heroNumber(_ size: CGFloat = WestpacType.s5) -> Font {
        .system(size: size, weight: .bold, design: .default)
    }
    static func body(_ size: CGFloat = WestpacType.s9, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    static func caption() -> Font {
        .system(size: WestpacType.s10, weight: .regular, design: .default)
    }
}

// MARK: - Gradients
// GEL has no gradient tokens; these are app-level brand moments built from GEL colours.

struct WestpacGradient {
    static let dragonAtmosphere = LinearGradient(
        colors: [.wbcHero, .wbcSurfaceHoverHero],
        startPoint: .top,
        endPoint: .bottom
    )
    static let heroBanner = LinearGradient(
        colors: [.wbcHero, .wbcSurfaceHoverHero],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - GEL surfaces

/// GEL `well` / `panel`: 8px radius, 1px muted-soft border, white fill, no shadow.
struct WestpacCard: ViewModifier {
    var padding: CGFloat = WestpacSpace.x2
    var fill: Color = .wbcBackgroundWhite

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.xxl))
            .overlay(
                RoundedRectangle(cornerRadius: WestpacRadius.xxl)
                    .stroke(Color.wbcBorder, lineWidth: 1)
            )
    }
}

extension View {
    func westpacCard(padding: CGFloat = WestpacSpace.x2, fill: Color = .wbcBackgroundWhite) -> some View {
        modifier(WestpacCard(padding: padding, fill: fill))
    }
}

// MARK: - GEL button

enum WestpacButtonLook {
    case primary, hero, faint, link

    var fill: Color {
        switch self {
        case .primary: return .wbcSurfacePrimary
        case .hero: return .wbcSurfaceHero
        case .faint: return .wbcBackgroundPale
        case .link: return .clear
        }
    }
    var border: Color {
        switch self {
        case .primary: return .wbcPrimary
        case .hero: return .wbcHero
        case .faint: return .wbcBorderStrong
        case .link: return .clear
        }
    }
    var label: Color {
        switch self {
        case .primary, .hero: return .wbcTextMono
        case .faint: return .wbcTextMuted
        case .link: return .wbcPrimary
        }
    }
}

enum WestpacButtonSize {
    case small, medium, large, xlarge

    var height: CGFloat {
        switch self {
        case .small: return 30
        case .medium: return 36
        case .large: return 42
        case .xlarge: return 48
        }
    }
    var radius: CGFloat {
        switch self {
        case .small: return WestpacRadius.sm
        case .medium: return WestpacRadius.md
        case .large: return WestpacRadius.lg
        case .xlarge: return WestpacRadius.xl
        }
    }
    var hPadding: CGFloat {
        switch self {
        case .small: return 9
        case .medium: return 12
        case .large: return 15
        case .xlarge: return 18
        }
    }
    var fontSize: CGFloat {
        switch self {
        case .small: return WestpacType.s10
        case .medium, .large: return WestpacType.s9
        case .xlarge: return WestpacType.s8
        }
    }
}

/// GEL button. `soft` renders the outline variant: white fill, brand border, body text.
struct WestpacButtonStyle: ViewModifier {
    var look: WestpacButtonLook = .primary
    var size: WestpacButtonSize = .large
    var soft: Bool = false
    var block: Bool = true

    private var fill: Color { soft ? .wbcBackgroundWhite : look.fill }
    private var label: Color { soft ? .wbcTextBody : look.label }

    func body(content: Content) -> some View {
        content
            .font(.system(size: size.fontSize, weight: .semibold))
            .foregroundColor(label)
            .padding(.horizontal, size.hPadding)
            .frame(maxWidth: block ? .infinity : nil)
            .frame(height: size.height)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: size.radius))
            .overlay(
                RoundedRectangle(cornerRadius: size.radius)
                    .stroke(look.border, lineWidth: look == .link ? 0 : 1)
            )
    }
}

extension View {
    func westpacButton(
        _ look: WestpacButtonLook = .primary,
        size: WestpacButtonSize = .large,
        soft: Bool = false,
        block: Bool = true
    ) -> some View {
        modifier(WestpacButtonStyle(look: look, size: size, soft: soft, block: block))
    }
}

// MARK: - GEL alert

enum WestpacAlertLook {
    case info, success, warning, danger

    var text: Color {
        switch self {
        case .info: return .wbcInfo
        case .success: return .wbcSuccess
        case .warning: return .wbcWarning
        case .danger: return .wbcDanger
        }
    }
    var fill: Color {
        switch self {
        case .info: return .wbcSurfaceInfoFaint
        case .success: return .wbcSurfaceSuccessFaint
        case .warning: return .wbcSurfaceWarningFaint
        case .danger: return .wbcSurfaceDangerFaint
        }
    }
    var border: Color {
        switch self {
        case .info: return .wbcInfoMild
        case .success: return .wbcSuccessMild
        case .warning: return .wbcWarningMild
        case .danger: return .wbcDangerMild
        }
    }
    var icon: String {
        switch self {
        case .info: return "info.circle.fill"
        case .success: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .danger: return "exclamationmark.octagon.fill"
        }
    }
}

/// GEL `alert` in box mode: faint fill, mild top/bottom rules, text in the look's colour.
struct WestpacAlert<Content: View>: View {
    let look: WestpacAlertLook
    var heading: String?
    @ViewBuilder var content: Content

    var body: some View {
        HStack(alignment: .top, spacing: WestpacSpace.x1) {
            Image(systemName: look.icon)
                .font(.system(size: WestpacType.s9))
                .foregroundColor(look.text)

            VStack(alignment: .leading, spacing: WestpacSpace.x1) {
                if let heading {
                    Text(heading)
                        .font(.system(size: WestpacType.s9, weight: .bold))
                }
                content
                    .font(.system(size: WestpacType.s10))
            }
            .foregroundColor(look.text)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(WestpacSpace.x3)
        .background(look.fill)
        .overlay(Rectangle().frame(height: 1).foregroundColor(look.border), alignment: .top)
        .overlay(Rectangle().frame(height: 1).foregroundColor(look.border), alignment: .bottom)
    }
}

// MARK: - GEL progress bar

/// GEL `progress-bar`: white track, 1px muted-soft border, 1px inset, hero fill, fully rounded.
struct WestpacProgressBar: View {
    var value: Double
    var height: CGFloat = 24
    var fill: Color = .wbcSurfaceHero

    var body: some View {
        GeometryReader { geo in
            let inner = max(0, geo.size.width - 2)
            ZStack(alignment: .leading) {
                Capsule().fill(Color.wbcBackgroundWhite)
                Capsule()
                    .fill(fill)
                    .frame(width: inner * min(max(value, 0), 1))
                    .padding(1)
            }
            .overlay(Capsule().stroke(Color.wbcBorder, lineWidth: 1))
        }
        .frame(height: height)
    }
}

extension WestpacProgressBar {
    /// GEL `skinny` look.
    static func skinny(value: Double, fill: Color = .wbcSurfaceHero) -> WestpacProgressBar {
        WestpacProgressBar(value: value, height: 10, fill: fill)
    }
}
