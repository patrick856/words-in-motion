# Conventions for `words-in-motion`

This document defines the conventions, architectural rules, and workflows for contributing animations to **words-in-motion**.

---

## Core Rules & Architecture

1. **Zero Runtime Dependencies**
   - All animations must use the native Web Animations API (`element.animate()`), inline style adjustments, `createInteraction()`, or scroll helpers (`createScrollTrigger` / `createScrollScrub`).
   - Do NOT add GSAP, Framer Motion, Anime.js, or any other external animation libraries.
   - Do NOT inject global CSS styles or stylesheets at runtime.

2. **Standard Function Signatures**
   - **Intro / Loop / Outro animations**:
     ```ts
     (target: Target, options?: AnimationOptions) => AnimationHandle
     ```
     Returns `{ finished: Promise<void>, cancel(): void }`.
   - **Interact effects** (cursor-reactive, long-running):
     ```ts
     (target: Target, options?: BaseInteractOptions) => InteractHandle
     ```
     Returns `{ destroy(): void, pause(): void, resume(): void }`.
   - **Scroll Trigger animations** (play once or on repeat when element enters viewport):
     ```ts
     (target: Target, options?: BaseScrollTriggerOptions) => ScrollTriggerHandle
     ```
     Returns `{ finished: Promise<void>, cancel(): void, destroy(): void }`.
   - **Scroll Scrub animations** (progress 0..1 tied directly to scroll position):
     ```ts
     (target: Target, options?: BaseScrollScrubOptions) => ScrollScrubHandle
     ```
     Returns `{ destroy(): void, pause(): void, resume(): void }`.

3. **SSR Safety (Next.js / Nuxt Compatible)**
   - No module-level side effects or direct access to `window` or `document` at evaluation/import time.
   - Always resolve DOM targets inside the function invocation via `resolveElement(target)`.

4. **Accessibility & Reduced Motion**
   - Respect user motion preferences by calling `prefersReducedMotion()`.
   - If reduced motion is requested, immediately complete or shorten intro/loop/outro animations safely, disable displacement for interact effects, or set scroll animations to final state.

5. **Text Splitting**
   - Use internal text splitters (`splitChars` / `splitWords` from `src/core/split`) rather than writing custom splitting logic.
   - Standard splitters handle `aria-label`, grapheme clusters (emojis via `Intl.Segmenter`), and Arabic/RTL script fallbacks automatically.

---

## Category Behaviors

- **Intro Animations** (`src/intro/`)
  - Animate text from hidden/initial state into its final visible state.
  - Must leave text in its final visible state when finished (`fill: 'forwards'` or style persistence).
- **Loop Animations** (`src/loop/`)
  - Continuously repeat until `cancel()` is explicitly called on the returned handle.
- **Outro Animations** (`src/outro/`)
  - Animate text from visible state to hidden.
  - Should end with the text hidden (or make hiding configurable via a `keep?: boolean` option).
- **Interact Effects** (`src/interact/`)
  - Cursor-reactive text effects that extend `createInteraction(el, options, update)`.
  - Run continuously while active without a `finished` promise.
  - Must clean up completely when `destroy()` is called.
- **Scroll Animations** (`src/scroll/`)
  - **Trigger mode** (`createScrollTrigger`): Plays an animation when element enters the viewport threshold. Returns `ScrollTriggerHandle`.
  - **Scrub mode** (`createScrollScrub`): Ties animation progress directly to scroll position through the viewport. Returns `ScrollScrubHandle`.

---

## Step-by-Step: Adding a New Animation or Effect

When implementing a new typographic animation:

1. **Create the Module**
   - File location: `src/<category>/<name>.ts` (e.g., `src/intro/fadeIn.ts` or `src/scroll/revealOnScroll.ts`).
   - Define custom options interface extending `BaseOptions`, `BaseInteractOptions`, or `BaseScrollOptions`.
   - For `scroll` animations, extend `createScrollTrigger()` or `createScrollScrub()`.

2. **Export from Category Index**
   - Re-export the function and its options type in `src/<category>/index.ts`.
   - Example in `src/scroll/index.ts`:
     ```ts
     export { revealOnScroll, type RevealOnScrollOptions } from './revealOnScroll';
     ```

3. **Add Entry to Playground Registry**
   - Register the animation in `playground/registry.ts`:
     ```ts
     import { revealOnScroll } from '../src/scroll';

     registry.push({
       name: 'revealOnScroll',
       category: 'scroll',
       run: (el) => revealOnScroll(el),
     });
     ```

4. **Add Tests**
   - Add unit tests under `tests/<category>/<name>.test.ts` to verify handle behavior, option handling, and `cancel()` / `destroy()` cleanup.

5. **Verify Checklist for Scroll Animations**
   - [ ] Multi-line text works smoothly (tested with 3+ lines)
   - [ ] Text is fully readable and selectable at rest
   - [ ] `prefersReducedMotion()` is respected (skips or sets final state)
   - [ ] `destroy()` fully removes all IntersectionObservers, scroll listeners, and rAF loops, and reverts DOM
   - [ ] Writes ONLY non-layout properties (`transform`, `opacity`, `filter`)

6. **Verify Build & Tests**
   - Run `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` before committing.
