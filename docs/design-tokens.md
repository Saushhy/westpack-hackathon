# Design tokens — Westpac GEL mapping

The web prototype looks "Westpac" because it uses **Westpac's actual GEL token values**,
vendored from their public design system (not eyeballed hex codes).

- Source: `WestpacGEL/GEL-next` → `packages/style-config/src/tokens/css/wbc/style.css`
- Vendored (with attribution) at `web/gel/tokens.css`.
- The app sets `<html data-brand="wbc">` so GEL's semantic `--color-*` tokens are in scope.
- Our Tailwind theme (`web/src/input.css`) maps GEL primitives to clean utility names.

## Colour mapping

| Utility | GEL token | Hex | Used for |
|---|---|---|---|
| `primary` | `wbc-primary-500` | `#DA1710` | Buttons, links, active states, save badges |
| `primary-hover` | `wbc-primary-400` | `#EE221B` | Button hover |
| `primary-active` | `wbc-primary-200` | `#F46E69` | Button press |
| `primary-faint` | `wbc-primary-50` | `#FFF0F0` | Subtle red tint |
| `hero` | `wbc-hero-500` | `#1F1C4F` | Header bar, headings |
| `hero-faint` | `wbc-hero-50` | `#F1F0FA` | Subtle navy tint |
| `ink` | `wbc-muted-950` | `#161619` | Body text |
| `muted` | `wbc-muted-500` | `#706F7C` | Secondary text |
| `line` | `wbc-muted-200` | `#DEDEE1` | Card / input borders |
| `page` | `wbc-muted-100` | `#F5F5F6` | Page background |
| `faint` | `wbc-muted-50` | `#F9F9FA` | Hover / faint fill |
| `success` / `success-mild` / `success-faint` | `success-500/300/50` | `#008000` / `#47A447` / `#F2F9F2` | Switched / approved states |
| `warning` / `warning-faint` | `warning-500/50` | `#C53B00` / `#FCF5F2` | Risk notes |
| `info` / `info-faint` | `info-500/50` | `#0074C4` / `#F2F8FC` | "Why" callouts |
| `coin` | `wbc-dance-500` *(data-f-solid)* | `#F57A0F` | Coin counter / coin bar |
| `xp` | `wbc-primary-500` *(data-a-solid)* | `#DA1710` | XP progress bar |

> `data-a-solid` and `data-f-solid` are GEL's **reserved chart colours** — using them for the
> XP and coin bars is exactly their intended use (data visualisation).

## Radius (GEL radii are tight — not pill-shaped)

| Tailwind | GEL token | px |
|---|---|---|
| `rounded-sm` | `border-rounded-sm` | 3 |
| `rounded-md` | `border-rounded-md` | 4 |
| `rounded-lg` | `border-rounded-lg` | 5 |
| `rounded-xl` | `border-rounded-xl` | 6 |
| `rounded-2xl` | `border-rounded-2xl` | 8 |
| `rounded-3xl` | `border-rounded-3xl` | 12 |
| `rounded-4xl` | `border-rounded-4xl` | 16 |

Cards use `rounded-2xl` (8px). The single biggest "looks like Westpac" detail is **avoiding
20px pill cards** — GEL is squarish.

## Typography

GEL's brand font is proprietary and not in the public repo, so we use the system stack:

`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Headings use `hero` navy; body uses `ink`; hints use `muted`.

## For Naomi (Figma) & Shawn (SwiftUI)

These exact tokens exist natively in GEL's iOS palette at
`packages/style-config/src/tokens/ios/wbc/wbc-colors.swift` (e.g. `backgroundHero`,
`surfacePrimary`, `textHeading`, `borderMutedSoft`). Use the same values so the Figma,
SwiftUI app and this web prototype all match pixel-for-pixel.
