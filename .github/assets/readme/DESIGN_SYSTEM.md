# SpeakIt README Design System & Asset Maintenance

This document governs the visual identity and reproducible asset pipeline for `README.md`.

## 1. Visual Concept & Tokens
SpeakIt's public documentation uses **Charcoal-Volt Kinetic Instrumentation**, derived directly from [`src/renderer/shared/theme.css`](../../../src/renderer/shared/theme.css) and [`src/renderer/bar/bar.css`](../../../src/renderer/bar/bar.css):

| Token | Dark Theme (`oklch` → sRGB) | Light Theme (`oklch` → sRGB) | Role |
|---|---|---|---|
| Canvas | `#090a09` (`0.145 0.004 135`) | `#ecedeb` (`0.945 0.003 135`) | Outer card ground |
| Surface | `#121311` (`0.185 0.005 135`) | `#fdfefd` (`0.995 0.001 135`) | Primary content surface |
| Surface 2 | `#1b1c1a` (`0.225 0.006 135`) | `#f1f2f0` (`0.96 0.003 135`) | Inset wells, sub-cards |
| Line | `#262825` (`0.275 0.006 135`) | `#dddfdc` (`0.9 0.004 135`) | 1 px hairline borders |
| Ink | `#f2f4f1` (`0.965 0.004 135`) | `#151714` (`0.2 0.006 135`) | Primary copy & headings |
| Muted | `#969994` (`0.68 0.008 135`) | `#616460` (`0.5 0.008 135`) | Captions, metadata |
| Accent Fill | `#b7f652` (`0.9 0.2 128`) | `#aff03c` (`0.88 0.21 128`) | Logo mark, active pill fills |
| Accent Text | `#b7f652` | `#397500` (`0.5 0.15 135`) | High-contrast labels on surface |
| Floating Bar | `#0e100e` (`0.17 0.005 135`) | `#0e100e` (always charcoal) | Bar UI across both modes |

## 2. Motion Choreography
- **Equalizer Bars (`eq-1`..`eq-9`)**: Staggered `scaleY` keyframes (`0.64s–0.94s`, phase offsets `0s–0.24s`) anchored via `transform-box: fill-box; transform-origin: center` to prevent coordinate-origin drift across renderers.
- **Live Indicator**: Smooth `1.7s` radial scale/opacity breath pulse.
- **Signal Buses**: Orthogonal dashed SVG trace (`stroke-dashoffset`) illustrating continuous flow across process boundaries.

## 3. Regenerating Assets
All 8 dual-theme SVGs (`*-dark.svg`, `*-light.svg`) are generated deterministically with zero external dependencies:

```bash
node .github/scripts/build-readme-assets.mjs
```

The product screenshots (`product/speakit-hub-*.png`) and Floating Bar film (`motion/speakit-bar-cinema.gif`) are captured directly from the built Electron renderer (`out/renderer/hub` and `out/renderer/bar`) so they stay faithful to the real UI.
