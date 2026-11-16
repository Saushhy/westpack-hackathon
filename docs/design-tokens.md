# Design tokens — how the prototype runs the real GEL

The web prototype does **not** approximate Westpac's look. It compiles the **actual GEL
stylesheet** from `WestpacGEL/GEL-next` and uses GEL's own token names and component
geometry. There is no React dependency and no build server — GEL's design system is plain
CSS (Tailwind v4), so we can run it directly.

## Pipeline

```
WestpacGEL/GEL-next
  packages/style-config/src/css/shared/*.css      (borders, colours, layout, typography…)
  packages/style-config/src/css/themes/theme-wbc.css
            │
            │  npm run vendor:gel      → web/gel/src/css/**   (verbatim copy)
            ▼
web/src/input.css
  @import "tailwindcss"
  @import GEL shared/*.css + theme-wbc.css + brand-fonts.css
  + .gel-* component classes expressed in GEL token values
            │
            │  npm run build:css       → web/styles.css        (committed, offline-ready)
            ▼
web/index.html   (the app)          web/gel-reference.html   (GEL spec side-by-side)
```

To re-pull GEL at any time: `cd web && npm run vendor:gel`.

## GEL theme tokens (used by name, not by hardcoded hex)

The app sets `<html data-brand="wbc">`, which is what activates GEL's Westpac token block,
so every component reads the same variables GEL's own components read.

| Token | Hex | Used for |
|---|---|---|
| `--surface-primary` | `#DA1710` | Primary buttons, active tab, links |
| `--surface-hover-primary` | `#EE221B` | Button hover |
| `--surface-active-primary` | `#F46E69` | Button press |
| `--surface-hero` | `#1F1C4F` | Panel header, progress-bar fill, icons |
| `--surface-hero-faint` | `#F1F0FA` | Icon tiles |
| `--text-heading` | `#1F1C4F` | Titles, headings |
| `--text-body` | `#161619` | Body copy |
| `--text-muted` | `#706F7C` | Secondary copy |
| `--border-muted-soft` | `#DEDEE1` | Every card / row border |
| `--border-hero` | `#1F1C4F` | Panel outline (GEL Panel) |
| `--background-white` | `#FFFFFF` | Header, cards, tab bar |
| `--background-faint` | `#F9F9FA` | Screen background |
| `--surface-success(-faint)` | `#008000` / `#F2F9F2` | Success alerts, saved badges |
| `--surface-warning(-faint)` | `#C53B00` / `#FCF5F2` | Risk notes |
| `--surface-info(-faint)` | `#0074C4` / `#F2F8FC` | "Why" callouts |

**Prototype-only extension:** GEL has no game palette (coins/dragons are not banking UI).
The two non-GEL colours live in `:root` in `web/src/input.css` as `--game-coin` /
`--game-coin-soft`, kept deliberately separate from GEL tokens.

## Spacing — GEL's base is 6px, not 4px

`packages/style-config/src/css/shared/layout.css` sets `--spacing: 0.375rem`. That means GEL's
scale is `p-1` 6px, `p-2` 12px, `p-3` 18px, `p-4` 24px, `p-7` 42px, `pt-9` 54px. This is why a
GEL button is 42px tall (`h-7`) and the mobile header is 54px (`h-9`) — and why default
Tailwind values look "off" next to GEL.

## Component geometry (copied from component source, not guessed)

| Component | GEL source | Values applied |
|---|---|---|
| Button | `button/button.styles.ts` (`size: large`) | `h-7` 42px, `rounded-lg` 5px, `px-2.5` 15px, `typography-body-9` 16px, filled + `border-primary` |
| FlexiCell (row) | `flexi-cell/flexi-cell.styles.ts` | `rounded-2xl` 8px, `border-border-muted-soft`, `p-2` 12px, `gap-2` 12px, `mb-2` 12px, **no shadow** |
| Panel (hero) | `panel/panel.styles.ts` | `rounded-2xl`, `border-border-hero`, header `bg-surface-hero text-text-mono px-2 py-[0.625rem]` |
| Alert (box) | `alert/alert.styles.ts` | `border-y`, `typography-body-10`, faint surface + *-mild border |
| Badge (default, soft) | `badge/badge.styles.ts` | `h-[1.25rem]` 20px, `rounded-sm` 3px, `px-1`, `text-[0.75rem]`, hairline border |
| ProgressBar | `progress-bar/progress-bar.styles.ts` | `h-4` 24px (skinny 10px), `rounded-full`, white track + `border-muted-soft`, `p-[0.0625rem]`, fill `bg-surface-hero`, label `typography-body-10` bold |
| Modal | `modal/components/modal-dialog` | `rounded-3xl` 12px, title `typography-body-7` 24px bold `px-5 pt-6 pb-4`, close `top-0 right-0 p-3`, backdrop `bg-black/65` |
| BottomSheet | `bottom-sheet/bottom-sheet-dialog` | `rounded-t-3xl`, title `p-7 pt-9 pb-4`, body `px-7 pb-7` |
| Header | `header/header.styles.ts` | white, `border-b border-border-muted-soft`, mobile `h-9` 54px / `px-2` 12px, scroll shadow `0 1px 5px rgba(0,0,0,.3)` |

## Typography

The **real Westpac brand font** is used — `Westpac Bold v2.007`, the same file GEL's
`shared/brand-fonts.css` references. Westpac serves it publicly at
`https://www.westpac.com.au/fonts/Westpac-Bold-v2.007.woff2`; `npm run vendor:gel` downloads it
into `web/assets/fonts/`, and `web/gel/brand-fonts.css` declares the face for `--font-brand`.

| Use | GEL | Size / line-height |
|---|---|---|
| Screen + modal titles | `typography-body-7` + `--font-brand` | 24px / 1.2 |
| Section headings | `typography-body-8` | 18px / 1.4 |
| Body, buttons | `typography-body-9` | 16px / 1.4 |
| Secondary, alerts, badges | `typography-body-10` | 14px / 1.4 |
| Big numbers | `typography-body-5` + brand | 36px / 1.1 |

Body copy uses GEL's declared sans stack (`--font-family-sans`), which is correct: Westpac
only ships a Bold brand face, so body text is system UI.

> **Licence note:** `Westpac-Bold-v2.007` is proprietary. It is committed here so the
> presentation renders exactly like the real app, for a Westpac competition entry. Delete
> `web/assets/fonts/` and the `brand-fonts.css` import to fall back to GEL's system stack.

## Radii (GEL is squarish — never pills)

`rounded-sm` 3px · `rounded-md` 4px · `rounded-lg` 5px · `rounded-xl` 6px ·
`rounded-2xl` 8px · `rounded-3xl` 12px · `rounded-4xl` 16px. Rows/cards use 8px, buttons 5px,
badges 3px, modals 12px.

## Brand assets (vendored from GEL)

| Asset | Source in GEL | Local path |
|---|---|---|
| Westpac logo (red "W") | `packages/ui/assets/logos-symbols/light/WBCLogo-Lm.svg` | `web/assets/gel/wbc-logo.svg` |
| Icons (outlined) | `packages/ui/assets/icons/outlined/*.svg` | `web/assets/gel/icons/*.svg` |
| Westpac Bold font | `brand-fonts.css` → westpac.com.au | `web/assets/fonts/` |

Icons used — bills: `phone`, `desktop`, `video`, `headset`, `barbell`, `house`; tabs: `receipt`,
`target`, `paw`, `shopping-bag`; chrome: `help`, `account`, `close`. GEL ships icons with a
placeholder `fill` (mostly `#0000FF`, some `#1F1C4F`), so `npm run build:icons` rewrites every
fill to `currentColor` and inlines them as SVG — that is how they inherit the app's colour.

## Verify it

```bash
cd web
npm run audit     # 65 assertions against GEL values, computed in a real browser
```

Then open `web/gel-reference.html` — real GEL component markup — and compare it with
`web/index.html`.

## For Naomi (Figma) & Shawn (SwiftUI)

The same tokens exist natively for iOS at
`packages/style-config/src/tokens/ios/wbc/wbc-colors.swift` (`backgroundHero`, `surfacePrimary`,
`textHeading`, `borderMutedSoft`, …). Use those names/values in Figma and SwiftUI so all three
surfaces match.
