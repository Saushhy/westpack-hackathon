# Dragon & shop art

Where the art goes. The app renders these files and **falls back to emoji** if a file is
missing, so the prototype works before art is ready.

## Dragon stages (`assets/dragon/`)

Three stages only.

| File | Stage | Source |
|---|---|---|
| `egg.png` | Dragon Egg | none yet, the 🥚 emoji stands in on purpose |
| `baby.png` | Baby Dragon, at 800 XP | rendered from `../assets/dragon_3d/base.obj` |
| `adult.png` | Adult Dragon, at 1500 XP | **still to be supplied** |

Both PNGs are generated, not hand-drawn. `npm run render:dragon` renders the real model
through three.js in headless Edge and writes a transparent portrait. Re-run it after any
change to the model or the lighting.

When the adult model arrives, build and render it, then add one line to
`tools/render-dragon.mjs`:

```bash
cd web
npm run build:dragon -- --src adult.obj --out adult.glb
```

```js
// tools/render-dragon.mjs
{ id: "adult", model: "/assets/dragon/adult.glb", fill: 0.92, yaw: 16, pitch: 5 }
```

Then re-measure `WEAR_ANCHOR.adult` in `app.js`, which currently holds the emoji defaults.

## Shop items (`assets/shop/`)

| File | Item |
|---|---|
| `feast.png` | Dragon Feast |
| `sunnies.png` | Sunset Sunnies |
| `tophat.png` | Top Hat |
| `scarf.png` | Westpac Scarf |
| `lair.png` | Lava Lair |
| `perk.png` | 0.25% bonus savings rate |

Square PNG, ideally ~512x512, transparent background. The filenames are referenced by
`data/rewards.json`, so keep them exact (or update the `image` fields there and run
`npm run build:data` in `web/`). Until they exist, the shop shows the item emoji.
