import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { clamp, distance, lerp } from '../core/math';

export interface WaveRelayOptions extends BaseScrollScrubOptions {
  /** Index of character to animate along the relay path. Defaults to last character (-1). */
  targetCharIndex?: number;
  /** Initial starting offset for traveling character. Defaults to { x: -80, y: -60 }. */
  startOffset?: { x: number; y: number };
  /** Maximum upward displacement height in pixels for wave effect. Defaults to 15. */
  waveHeight?: number;
  /** Radius of influence around traveling character for wave displacement. Defaults to 40. */
  waveRadius?: number;
}

/**
 * Wave-relay reposition scroll scrub animation.
 * Travels a character to its final slot while displacing characters along its path upward in a wave.
 */
export function waveRelay(
  target: Target,
  options?: WaveRelayOptions
): ScrollScrubHandle {
  const {
    targetCharIndex = -1,
    startOffset = { x: -80, y: -60 },
    waveHeight = 15,
    waveRadius = 40,
    ...scrubOptions
  } = options || {};

  return createScrollScrub(target, scrubOptions, ({ progress, index, total }) => {
    const activeIndex = targetCharIndex < 0 ? total + targetCharIndex : targetCharIndex;

    if (index === activeIndex) {
      // Traveling character interpolates from startOffset to (0,0)
      const currentX = lerp(startOffset.x, 0, progress);
      const currentY = lerp(startOffset.y, 0, progress);
      return {
        translateX: currentX,
        translateY: currentY,
      };
    }

    // For non-traveling characters, compute distance to traveling character's current position
    // Estimating traveling character position progress along path
    const travelerProgressX = lerp(startOffset.x, 0, progress);
    const travelerProgressY = lerp(startOffset.y, 0, progress);

    const distToTraveler = distance(0, 0, travelerProgressX, travelerProgressY);
    const waveFactor = clamp(1 - distToTraveler / waveRadius, 0, 1);
    const bumpY = -waveHeight * Math.sin(waveFactor * Math.PI);

    return {
      translateY: bumpY,
    };
  });
}
