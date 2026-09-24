# Conventions for `words-in-motion`

This document defines the conventions, architectural rules, and workflows for contributing animations to **words-in-motion**.

---

## Core Rules & Architecture

1. **Zero Runtime Dependencies**
   - All animations must use the native Web Animations API (`element.animate()`) and inline style adjustments.
   - Do NOT add GSAP, Framer Motion, Anime.js, or any other external animation libraries.
   - Do NOT inject global CSS styles or stylesheets at runtime.

2. **Standard Function Signature**
   - Every animation function must adhere to the signature:
     ```ts
     (target: Target, options?: AnimationOptions) => AnimationHandle
     ```
   - Return an object with `{ finished: Promise<void>, cancel(): void }`.

3. **SSR Safety (Next.js / Nuxt Compatible)**
   - No module-level side effects or direct access to `window` or `document` at evaluation/import time.
   - Always resolve DOM targets inside the function invocation via `resolveElement(target)`.

4. **Accessibility & Reduced Motion**
   - Respect user motion preferences by calling `prefersReducedMotion()`.
   - If reduced motion is requested, immediately complete or shorten the animation safely.

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

---

## Step-by-Step: Adding a New Animation

When implementing a new typographic animation:

1. **Create the Animation Module**
   - File location: `src/<category>/<name>.ts` (e.g., `src/intro/fadeIn.ts`).
   - Define custom options interface extending `BaseOptions` (with JSDoc comments and sensible defaults).
   - Implement target resolution, reduced motion check, splitting, and WAAPI animation.

2. **Export from Category Index**
   - Re-export the function and its options type in `src/<category>/index.ts`.
   - Example in `src/intro/index.ts`:
     ```ts
     export { fadeIn, type FadeInOptions } from './fadeIn';
     ```

3. **Add Entry to Playground Registry**
   - Register the animation in `playground/registry.ts`:
     ```ts
     import { fadeIn } from '../src/intro';

     registry.push({
       name: 'fadeIn',
       category: 'intro',
       run: (el) => fadeIn(el),
     });
     ```

4. **Add Tests (if logic exists)**
   - Add unit tests under `tests/<category>/<name>.test.ts` to verify handle behavior, option handling, and `cancel()` cleanup.

5. **Verify**
   - Run `npm run build`, `npm run typecheck`, and `npm test` before committing.
