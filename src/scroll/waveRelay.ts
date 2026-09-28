import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { measureCharCenters } from '../core/measure';
import { clamp, distance, lerp } from '../core/math';

export interface WaveRelayOptions extends BaseScrollScrubOptions {
  /**
   * Index of the character that travels through the text.
   * Negative values index from the end: -1 means the last character (default).
   * @default -1
   */
  targetCharIndex?: number;
  /**
   * Maximum radial displacement in pixels applied to characters near the traveler.
   * Nearby characters are pushed away from the traveler by up to this amount.
   * @default 14
   */
  pushStrength?: number;
  /**
   * Maximum secondary vertical wave displacement in pixels.
   * Nearby characters briefly rise as the traveler passes, then settle back.
   * This is a secondary accent on top of the primary radial separation.
   * @default 8
   */
  waveHeight?: number;
  /**
   * 2D radius of influence in pixels around the current traveler position.
   * Characters whose center is farther than this from the traveler are unaffected.
   * @default 45
   */
  waveRadius?: number;
}

/**
 * Wave-relay scroll-scrub animation.
 *
 * The target character (last by default) travels in a straight line from the
 * position of the first character at scroll progress 0 to its own original
 * position at progress 1.  While it passes nearby characters, those characters
 * are pushed radially away from the traveler and return smoothly after it passes.
 *
 * The visual effect resembles one character parting a row of text as it moves
 * to its final home position.
 */
export function waveRelay(
  target: Target,
  options?: WaveRelayOptions
): ScrollScrubHandle {
  const {
    targetCharIndex = -1,
    pushStrength = 14,
    waveHeight = 8,
    waveRadius = 45,
    ...scrubOptions
  } = options || {};

  // Original untransformed character centers — measured exactly once after the
  // split stabilises and before any animation frame applies a transform.
  // Stored outside the per-character callback so we never measure while
  // transforms are live (which would contaminate the reference positions).
  let originalCenters: { x: number; y: number }[] | null = null;

  // The resolved traveler index, computed once from the first update context.
  let activeIndex = -1;

  return createScrollScrub(target, scrubOptions, ({ progress, index, total, char, element }) => {
    // ── 1. Measure original positions exactly once, before any transforms ──────
    // We guard on total because the first call initialises cachedMeasures for
    // the full character set; subsequent calls for other indices reuse it.
    if (!originalCenters || originalCenters.length !== total) {
      // Collect all character spans.  createScrollScrub has already split the
      // element, so .wim-char spans are present.
      const charEls = Array.from(element.querySelectorAll<HTMLElement>('.wim-char'));
      const units = charEls.length === total ? charEls : [char]; // fallback: single unit

      // Temporarily clear all transforms so measurement reads the natural layout.
      const savedTransforms = units.map((el) => el.style.transform);
      units.forEach((el) => { el.style.transform = 'none'; });

      const rawMeasures = measureCharCenters(element, units);
      originalCenters = rawMeasures.map((m) => ({ x: m.x, y: m.y }));

      // Restore any previously applied transforms.
      units.forEach((el, i) => { el.style.transform = savedTransforms[i]; });

      // Resolve active index once (total is now known).
      const raw = targetCharIndex < 0 ? total + targetCharIndex : targetCharIndex;
      activeIndex = clamp(raw, 0, total - 1);
    }

    const centers = originalCenters!; // guaranteed non-null at this point

    // ── 2. Traveler path ───────────────────────────────────────────────────────
    // start = original position of the FIRST character (where the traveler appears at p=0)
    // end   = original position of the ACTIVE character (where it arrives at p=1)
    //
    // This means:
    //   progress=0  → travelerX/Y = centers[0]   → offset from activeIndex = centres[0] - centres[activeIndex]
    //   progress=1  → travelerX/Y = centers[activeIndex] → offset = 0  (back home)
    const start = centers[0] ?? { x: 0, y: 0 };
    const end   = centers[activeIndex] ?? { x: 0, y: 0 };

    const travelerX = lerp(start.x, end.x, progress);
    const travelerY = lerp(start.y, end.y, progress);

    // ── 3. Traveling character ─────────────────────────────────────────────────
    if (index === activeIndex) {
      const myPos = centers[index] ?? { x: 0, y: 0 };

      // The span stays in its original layout slot; we move it visually with a
      // transform.  At progress=1, travelerX/Y equals myPos.x/y so both offsets
      // become exactly zero (character is back at home).
      const translateX = travelerX - myPos.x;
      const translateY = travelerY - myPos.y;

      // Render above characters it crosses so it is always visible.
      char.style.position = 'relative';
      char.style.zIndex   = '2';

      return { translateX, translateY };
    }

    // ── 4. Pushed characters ───────────────────────────────────────────────────
    // Reset traveler-specific styles for non-traveler chars (safety guard in case
    // activeIndex changes or measurement ran while this char was previously the traveler).
    char.style.position = '';
    char.style.zIndex   = '';

    const myPos = centers[index] ?? { x: 0, y: 0 };

    const dist = distance(myPos.x, myPos.y, travelerX, travelerY);
    if (dist >= waveRadius) {
      // Outside influence radius — no displacement.
      return { translateX: 0, translateY: 0 };
    }

    // proximity: 1 at center, 0 at waveRadius boundary.
    const proximity = clamp(1 - dist / waveRadius, 0, 1);

    // Smooth monotonic falloff (smoothstep):  strongest at center, exactly 0 at edge.
    // Required: proximity=1 → influence≈1, proximity=0 → influence=0.
    // sin(π) ≈ 0 fallback from the old code is deliberately replaced: that function
    // had influence≈0 at the closest distance, which is the opposite of what we want.
    const influence = proximity * proximity * (3 - 2 * proximity);

    // ── 5. Radial push — away from the traveler ────────────────────────────────
    // Vector from traveler TO this character (direction of push).
    // Characters left of traveler move left; right move right.  If the character
    // is directly on top of the traveler (dist=0), treat angle as purely horizontal.
    const deltaX = myPos.x - travelerX;
    const deltaY = myPos.y - travelerY;

    let pushDirX: number;
    let pushDirY: number;

    if (dist < 0.001) {
      // Degenerate case: character centre coincides with the traveler position
      // (only possible if activeIndex === index, which is guarded above).
      pushDirX = 1;
      pushDirY = 0;
    } else {
      pushDirX = deltaX / dist; // normalised X component
      pushDirY = deltaY / dist; // normalised Y component
    }

    const radialPush = influence * pushStrength;
    const translateX = pushDirX * radialPush;

    // ── 6. Secondary vertical wave ─────────────────────────────────────────────
    // A small upward accent layered on top of the radial separation.
    // Uses a bell curve via sin so it peaks at full proximity and tapers to zero
    // as the character exits the radius.  The primary radial push is NOT cancelled
    // by this: vertical from radial push + vertical wave are additive.
    const wavePeak = -waveHeight * Math.sin(influence * Math.PI);

    // Combine the radial vertical component with the wave accent.
    const translateY = pushDirY * radialPush + wavePeak;

    return { translateX, translateY };
  });
}
