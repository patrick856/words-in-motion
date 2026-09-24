# Conventions for `words-in-motion`

This document defines the conventions, architectural rules, and workflows for contributing animations to **words-in-motion**.

---

## Core Rules & Architecture

1. **Zero Runtime Dependencies**
   - All animations must use the native Web Animations API (`element.animate()`), inline style adjustments, or `createInteraction()`.
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

3. **SSR Safety (Next.js / Nuxt Compatible)**
   - No module-level side effects or direct access to `window` or `document` at evaluation/import time.
   - Always resolve DOM targets inside the function invocation via `resolveElement(target)`.

4. **Accessibility & Reduced Motion**
   - Respect user motion preferences by calling `prefersReducedMotion()`.
   - If reduced motion is requested, immediately complete or shorten intro/loop/outro animations safely, or disable displacement for interact effects.

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

---

## Step-by-Step: Adding a New Animation or Effect

When implementing a new typographic animation:

1. **Create the Module**
   - File location: `src/<category>/<name>.ts` (e.g., `src/intro/fadeIn.ts` or `src/interact/magnet.ts`).
   - Define custom options interface extending `BaseOptions` or `BaseInteractOptions` (with JSDoc comments and sensible defaults).
   - For `interact` effects, extend `createInteraction(target, options, update)`.

2. **Export from Category Index**
   - Re-export the function and its options type in `src/<category>/index.ts`.
   - Example in `src/interact/index.ts`:
     ```ts
     export { magnet, type MagnetOptions } from './magnet';
     ```

3. **Add Entry to Playground Registry**
   - Register the animation in `playground/registry.ts`:
     ```ts
     import { magnet } from '../src/interact';

     registry.push({
       name: 'magnet',
       category: 'interact',
       run: (el) => magnet(el),
     });
     ```

4. **Add Tests**
   - Add unit tests under `tests/<category>/<name>.test.ts` to verify handle behavior, option handling, and `cancel()` / `destroy()` cleanup.

5. **Verify Checklist for Interact Effects**
   - [ ] Multi-line text works smoothly (tested with 3+ lines)
   - [ ] Text is fully readable and selectable at rest
   - [ ] Sensible touch behavior configured via `touch` option ('follow' | 'tap' | 'none')
   - [ ] `prefersReducedMotion()` is respected (disables/minimizes displacement)
   - [ ] `destroy()` fully removes all event listeners, observers, and rAF loops, and reverts DOM
   - [ ] Writes ONLY non-layout properties (`transform`, `opacity`, `filter`)

6. **Verify Build & Tests**
   - Run `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` before committing.
