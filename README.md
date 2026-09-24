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
import { fadeIn } from 'words-in-motion/intro';

// Animate an element by CSS selector or HTMLElement reference
const handle = fadeIn('#title', {
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

*No intro animations added yet.*

---

### Loop Animations (`words-in-motion/loop`)

*No loop animations added yet.*

---

### Outro Animations (`words-in-motion/outro`)

*No outro animations added yet.*

---

### Interact Animations (`words-in-motion/interact`)

*No interact effects added yet.*

---

### Scroll Animations (`words-in-motion/scroll`)

Scroll animations support two distinct modes:

- **Trigger Mode (`createScrollTrigger`)**: Plays an animation when the element enters the viewport (e.g. `start: "top 80%"`). Can play once or repeat every time it enters the viewport (`repeat: true`). Returns `{ finished, cancel, destroy }`.
- **Scrub Mode (`createScrollScrub`)**: Progress (0..1) is tied directly to the element's Y position as it scrolls through the viewport. Returns `{ destroy, pause, resume }`.

*No scroll animations added yet.*

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
