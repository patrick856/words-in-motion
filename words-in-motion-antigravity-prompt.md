# Prompt for Antigravity — Implement words-in-motion animations

**Repo:** https://github.com/patrick856/words-in-motion

Use this as the build prompt. Implement the animations below as standalone, independently-usable text-animation functions/components for the `words-in-motion` package. Each animation belongs to exactly one category (intro, outro, on-scroll, cursor) and must be usable on its own — no animation should require another one from a different category to work.

## General requirements

- Written in TypeScript.
- Each animation should be its own exported function/component/hook so consumers can import only what they use (tree-shakeable, no bundling everything together).
- Animations operate on arbitrary text content (words/characters split as needed) — don't hardcode example strings into the implementation.
- Expose sensible config props/options per animation (e.g. duration, stagger delay, easing, character set used for scrambling, intensity/radius for cursor effects) with reasonable defaults so it works with zero config out of the box.
- Where an effect references "distance from cursor" or "distance scrolled," implement it as a continuous, smooth function (not discrete jumps) unless the effect description explicitly calls for discrete steps (e.g. Strip Realign's "2–3 fast moves").
- Multi-line text: unless an animation's spec below says single-line only, it should degrade gracefully across wrapped/multi-line text.
- Clean up all timers/listeners/animation frames on unmount — no leaks.
- Respect `prefers-reduced-motion` where reasonably possible (fall back to a simple fade or instant state change).

---

## Intro animations (build 6)

1. **Directional reveal**
   Reveal text word-by-word or character-by-character, sliding in from left-to-right, right-to-left, or simultaneously from both ends converging to the middle (configurable direction). Support an optional vertical drop-in: each unit starts slightly above its final line position and animates down into place as it reveals, instead of appearing flat in place.

2. **Lamp flicker-in**
   Text flickers (toggles between low/zero opacity and full opacity) a few times at irregular intervals — mimicking a lamp warming up — before settling into a fully visible, stable state.

3. **Rise from ground / drop from ceiling**
   Each word/character starts translated below its final line position (hidden below the "ground" of the baseline) and animates upward into place. Provide a variant/config flag to instead start above (the "ceiling") and drop down into place.

4. **Chunked reveal with trailing scramble + letter-travel merges**
   - Split text into chunks of a couple of words each. Reveal chunks sequentially (chunk N+1 begins appearing after chunk N).
   - While a new chunk is revealing, take the previous 1–2 already-revealed chunks and scramble some of their characters to random decoy characters for a short window, then resolve them back to the correct characters after 1–2 more chunks have appeared (a trailing scramble effect that follows just behind the reveal edge).
   - In addition to simple in-place decoy swapping, implement letter-travel merges: instead of a decoy character just changing back in place, animate a character traveling from an adjacent/nearby position to its correct slot, passing over intermediate characters, with the characters on either side of the destination slot shifting slightly to accommodate it as it lands. Example target behavior: a word transiently renders as "WYRD" (wrong placeholder letter where a letter is missing), then the correct "O" emerges from behind the "W", animates across (passing visually over the "R"), and settles into place to complete "WORD", with "R" and "D" making small position adjustments as "O" arrives.
   - Reference for the general scramble/shuffle-text feel: https://www.leeholmes.uk/ (Section 3, "Services" — repeating shuffled-text marquee).

5. **Strip realign**
   Slice the text into horizontal strips (same slicing approach as the Paper Cut outro below, but used here for an intro). On mount, render the strips offset/misaligned from their correct horizontal position. Animate them into correct alignment in just 2–3 fast, discrete sequential moves (not a smooth continuous slide) until the strips line up and the text reads correctly.

6. *(open slot — to be defined; add here once decided)*

---

## Outro animations (build 6)

1. **Black hole collapse**
   Animate all words/characters converging toward a single point (e.g. center of the text block), shrinking/scaling down to nothing as they travel toward that point.

2. **Paper cut**
   Slice the text into horizontal strips. Animate a sequence of "cuts" sweeping across the text (direction configurable: alternating right-to-left then left-to-right, or reverse), and as each cut passes a strip, that strip detaches and falls away or splits off-screen. Cuts progress in a configurable order (top-to-bottom, middle-outward, or bottom-to-top).

3. **Train to the portal**
   Animate the entire text block as a single unit sliding off toward one edge (left, right, or a defined vanishing point), disappearing as if pulled through a portal. This is a single unified transform on the whole block, not a per-character stagger.

4. **Break-and-fade sweep**
   Animate a point/line/arrow marker sweeping left-to-right across the text. As the marker passes over each character, trigger a brief "break" (fracture/glitch) transform on that character, followed by a fade to zero opacity. Single-line only — document this constraint in the code/README; no multi-line requirement for this one.

5. **Train to the portal (reverse)**
   Reuse the "train to the portal" motion mechanic but apply it as an outro that mirrors the intro-style portal-arrival motion in reverse (i.e. exits the way an intro version would enter). Share the underlying transform logic with #3 where possible rather than duplicating it.

6. *(open slot — to be defined; add here once decided)*

---

## On-scroll animations (build 3 — complete)

1. **Wave-relay reposition**
   On scroll progress, animate a specific character (e.g. the last character, or one deliberately mis-positioned at the start) traveling from its initial position to its correct final position within the text. While traveling, any characters currently "in its path" should temporarily displace upward (a wave effect) to let it pass, then return to their normal position. For multi-line text, the traveling character's path should go in a straight line from start position to end position through the visual space (not following normal text-wrapping flow), displacing whatever characters lie along that straight path.

2. **Reading-line opacity follow**
   Render all words immediately at a low opacity (default ~20–30%, configurable). Bind opacity-per-word to scroll progress so that, as the user scrolls, each word's opacity ramps to 100% in sequence — simulating a "reading line" that moves through the text in sync with scroll position. Reference: https://pamidordesign.co/ (flagged as the inspiration for this effect — verify against the live site for exact behavior before finalizing).

3. **Scattered letters reassemble**
   On initial render, position each letter at a randomized offset within a bounded radius/area around its correct position (i.e. letters look "fallen"/scattered near the text, not scattered across the whole page). Bind each letter's position to scroll progress so that as the user scrolls, every letter animates from its scattered position back to its correct position in the word/sentence.

---

## Cursor effects (build 8 — complete)

For all of the following: compute distance from the cursor to each character (or its bounding box), and drive the effect's intensity continuously by that distance (closer = stronger effect), with a configurable falloff radius beyond which the effect is zero. Most should work across multiline text unless noted.

1. **Gravitational pull** — nearby characters translate slightly toward the cursor position, proportional to proximity.
2. **Anti-gravitational push** — nearby characters translate slightly away from the cursor position, proportional to proximity.
3. **Proximity fade** — nearby characters' opacity decreases the closer the cursor is.
4. **Proximity flip** — nearby characters rotate (flip) around an axis, with rotation amount scaling with proximity; full flip at closest distance.
5. **Proximity shake** — nearby characters oscillate/shake with amplitude scaling with proximity (stronger/faster shake when closer).
6. **Cursor-as-obstacle push** — treat the cursor as occupying the same visual plane as the text: characters within its bounding radius are pushed aside (translated) rather than the cursor passing over them; characters spring back to their original position (with an easing/spring animation) once the cursor moves away.
7. **Proximity font-weight increase** — nearby characters' `font-weight` increases proportional to proximity (requires a variable-weight font or a stepped set of font-weight values).
8. **Proximity accent-color fill** — nearby characters' color interpolates toward a configurable accent color proportional to proximity, fading back to the default text color as the cursor moves away.

---

## Open items for the two unassigned slots (Intro #6, Outro #6)

Leave clearly marked placeholders in the codebase (e.g. a `TODO` in the category's index/exports file) for the two not-yet-defined animations so the target counts (6 intros, 6 outros) are visibly tracked as incomplete until we fill them in.
