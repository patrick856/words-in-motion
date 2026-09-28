# words-in-motion

> Typographic motion for the web.

![words-in-motion demo](https://via.placeholder.com/800x400?text=words-in-motion+demo)

A lightweight collection of standalone, ready-to-use typographic animations, scroll-driven effects, and cursor-reactive interactions for the web built natively on the **Web Animations API (WAAPI)** and inline transforms. Zero dependencies. Tree-shakeable. Accessible.

---

## Features

- ⚡ **Zero Runtime Dependencies** — Pure JavaScript & WAAPI. No GSAP or heavy animation libraries.
- 🌳 **Tree-Shakeable Subpath Exports** — Import only the specific categories or animations you use (`words-in-motion/intro`, `words-in-motion/loop`, `words-in-motion/outro`, `words-in-motion/interact`, `words-in-motion/scroll`).
- 📜 **Scroll-Driven Motion** — Viewport trigger mode (plays on enter) and scrub mode (ties character progress directly to scroll position).
- 🖱️ **Cursor-Reactive Interact Effects** — Long-running interactive text effects with built-in pointer tracking and `destroy()` cleanup.
- ♿ **Accessibility Built-In** — Automatic `aria-label` preservation on split containers and support for `prefers-reduced-motion`.
- ⚡ **SSR & Framework Friendly** — Safe for Next.js, Nuxt, Remix, and SvelteKit. No DOM access at import time.
- 🔤 **Emoji & RTL Safe** — Grapheme-level text splitting via `Intl.Segmenter` with automatic Arabic/cursive script fallback.

---

## Installation

```bash
npm install words-in-motion
```

---

## Quick Start

```ts
import { pixelResolve } from 'words-in-motion/intro';

// Animate an element by CSS selector or HTMLElement reference
const handle = pixelResolve('#title', {
  duration: 800,
  stagger: 40,
});

// Await completion or cancel early
await handle.finished;
// handle.cancel();
```

---

## Animation Categories

### Intro Animations (`words-in-motion/intro`)

Available: `directionalReveal`, `lampFlicker`, `rise`, `chunkedScramble`, `stripRealign`, and `pixelResolve`.

---

### Loop Animations (`words-in-motion/loop`)

| Effect     | Motion                        | Default cycle |
| ---------- | ----------------------------- | ------------- |
| `wave`     | Traveling vertical wave       | 2400ms        |
| `float`    | Gentle elliptical drift       | 4200ms        |
| `breathe`  | Word-level expansion and rest | 3600ms        |
| `shimmer`  | Subtle opacity sweep          | 2800ms        |
| `pendulum` | Phased letter tilts           | 3000ms        |

```ts
import { wave } from 'words-in-motion/loop';

const loop = wave('.headline', { duration: 2400, intensity: 1, by: 'chars' });
// In your component's unmount / effect cleanup:
loop.cancel();
await loop.finished;
```

Loops repeat until canceled. `finished` resolves on cancellation, reduced motion,
or a missing/empty target. `duration` is one cycle; `delay` is the initial delay;
`stagger` is the phase delay between units. `intensity` ranges from 0 to 4.
`by: 'words'` preserves whole words. Hidden browser tabs pause their WAAPI loops.
A reduced-motion preference change cancels active loops and restores the text.

---

### Outro Animations (`words-in-motion/outro`)

Available: `blackHole` (spiral collapse), `paperCut` (alternating slices), `breakAndFade` (reading-order fracture), `hingeDrop` (pivot and fall), `blurAway` (soft defocus), and `windScatter` (directional gust). All support wrapped text, `delay`, and `keep: true` to restore visibility after completion. By default, completion hides the target; `cancel()` restores its original opacity and content.

---

### Interact Animations (`words-in-motion/interact`)

Available: `pull`, `push`, `obstaclePush`, `proximityFade`, `proximityFlip`, `proximityRotate`, `proximityShake`, `fontWeight`, and `accentColor`. Effects compose on the same target. `pause()` eases back to rest; `resume()` reactivates; `destroy()` restores original nodes and removes observers/listeners when the last effect is destroyed. Weight changes are smoothest with a variable font; color mixing uses native CSS `color-mix()`.

---

### Scroll Animations (`words-in-motion/scroll`)

Scroll animations support two distinct modes:

- **Trigger Mode (`createScrollTrigger`)**: Plays an animation when the element enters the viewport (e.g. `start: "top 80%"`). Can play once or repeat every time it enters the viewport (`repeat: true`). Returns `{ finished, cancel, destroy }`.
- **Scrub Mode (`createScrollScrub`)**: Progress (0..1) is tied directly to the element's Y position as it scrolls through the viewport. Returns `{ destroy, pause, resume }`.

Available scrub effects: `readingLine` (word-by-word opacity), `scatterReassemble` (staggered settling), and `waveRelay` (a traveling character following reading order). Positions refresh on resize and font loading. Endpoints settle exactly, including when scrolling rapidly past the target. These effects change only transforms, opacity, and filters during playback.

---

## Accessibility & SSR Notes

### `prefers-reduced-motion`

`words-in-motion` automatically checks browser and system settings for reduced motion preferences (`prefers-reduced-motion: reduce`). When enabled, intro/loop/outro animations complete instantly or shorten cleanly, interact effects disable displacement, and scroll animations complete cleanly.

### Touch Devices & Cursor Interactions

Interact effects support configurable touch behavior (`touch: 'follow' | 'tap' | 'none'`). On touch devices, interactions react gracefully to touch events or taps without interfering with page scrolling.

### Screen Readers (`aria-label` & `aria-hidden`)

When splitting text into character or word elements, `words-in-motion` preserves original text inside an `aria-label` attribute on the container element while applying `aria-hidden="true"` to generated span nodes.

### Server-Side Rendering (SSR)

All exports are guaranteed free of module-level side effects or immediate `window`/`document` property access. You can safely import `words-in-motion` in Next.js Server Components, Nuxt, or Node.js environments.

---

## License

[MIT](./LICENSE) &copy; 2026 Patrick Marcus

## Pixel resolution and integration notes

```ts
import { pixelResolve } from 'words-in-motion/intro';
const intro = pixelResolve('.headline', { pixelSize: 16, steps: 8, duration: 1600 });
await intro.finished;
```

`pixelResolve` samples the rendered words into a low-resolution canvas and increases
the grid density geometrically until the original text returns. The default block
size follows the font size. Original text remains in the DOM for accessibility.
Nested colors, explicit line breaks, alignment, RTL words and letter spacing use
browser measurements. Resize or font loading ends the effect early to keep text
readable. Call it after your web fonts load for the best visual match.

Canvas text is an approximation of browser typography: text shadows, gradient
fills, decorations and advanced font features are not rasterized. Vertical writing,
transformed hosts, zero-size targets, unavailable canvas, and targets larger than
four million CSS pixels retain their original text. Apply it to a text wrapper
rather than a container containing unrelated visual content.

The updated splitter preserves original nodes (including event listeners), inline
markup, explicit breaks, emoji graphemes, and joined-script word shaping. Avoid
changing the contents while an effect is running; cancel/destroy first, update your
text, then restart. Extremely long unbroken tokens retain word-level wrapping.
Always clean up handles when a component unmounts. Starting a loop, outro, scrub,
or pixel resolution on a target replaces the previous effect that owns its text;
multiple cursor effects can compose together.

## Motion references

Original implementations, informed by these motion studies; no external animation
code or runtime libraries are included:

- [Codrops: Typography Motion Effect](https://tympanus.net/Tutorials/TypographyMotion/) — coordinated letter motion.
- [Codrops: Kinetic Typography Page Transition](https://tympanus.net/codrops/2021/09/29/kinetic-typography-page-transition/) — rotation, scale and staged transitions.

The new defaults favor small displacement, smooth boundaries and readable resting
states. They are intended as adaptable building blocks, not replicas of those sites.

### Solid letter interactions

`pull`, `push`, and `obstaclePush` share contact handling. Letters move their
neighbors when they touch instead of independently overlapping. Collision checks
use measured text rectangles, including word-sized bodies for joined scripts.
They preserve existing tracking at rest; this is not pixel-perfect glyph-outline
physics. Contacts work within each target, including between its wrapped lines.

```ts
import { obstaclePush, proximityRotate } from 'words-in-motion/interact';

// Only the cursor tip touching a letter moves it; there is no surrounding field.
const contact = obstaclePush('.title', { easing: 0.15 });
// A quarter-turn by default; use maxAngle to choose a different range.
const rotation = proximityRotate('.other-title', { maxAngle: 90 });

// On unmount:
contact.destroy();
rotation.destroy();
```

Letters return to their measured home positions when contact ends or the effect
is paused. Fast movement is subdivided before resolving contacts. `pull` and
`push` retain their `radius` and pixel `strength` controls; `obstaclePush` uses
`cursorRadius: 0` by default for contact at the cursor tip. A larger physical
contact area is opt-in through `cursorRadius`; `radius` does not create a force field.
Allow enough surrounding space (or visible overflow) for the displaced letters.
