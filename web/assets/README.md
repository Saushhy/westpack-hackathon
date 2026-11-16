# Dragon & shop art

Where the art goes. The app renders these files and **falls back to emoji** if a file is
missing, so the prototype works before art is ready.

## Dragon stages (`assets/dragon/`)

| File | Stage |
|---|---|
| `egg.png` | Dragon Egg |
| `baby.png` | Baby Dragon |
| `teen.png` | Teen Dragon |
| `adult.png` | Adult Dragon |

## Shop items (`assets/shop/`)

| File | Item |
|---|---|
| `feast.png` | Dragon Feast |
| `sunnies.png` | Sunset Sunnies |
| `tophat.png` | Top Hat |
| `scarf.png` | Westpac Scarf |
| `lair.png` | Lava Lair |
| `perk.png` | 0.25% bonus savings rate |

Guidance for Naomi: square PNG (ideally ~512×512), transparent or solid white background,
flat vector mascot style using Westpac red `#DA1710` and navy `#1F1C4F`. The filenames above
are referenced by `data/rewards.json` — keep them exact (or update the `image` fields there
and run `npm run build:data` in `web/`).
