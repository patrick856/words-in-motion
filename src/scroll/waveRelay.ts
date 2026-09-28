import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { measureCharCenters } from '../core/measure';
import { clamp, distance, lerp } from '../core/math';

export interface WaveRelayOptions extends BaseScrollScrubOptions {
  /** Index of character to animate along the relay path. Defaults to last character (-1). */
  targetCharIndex?: number;
  /** Maximum upward displacement height in pixels for wave push. Defaults to 20. */
  waveHeight?: number;
  /** Radius of influence around traveling character for wave displacement. Defaults to 45. */
  waveRadius?: number;
}

/**
 * Wave-relay reposition scroll scrub animation.
 * Travels a character from start to end of text while pushing characters along its path away in a wave.
 */
export function waveRelay(
  target: Target,
  options?: WaveRelayOptions
): ScrollScrubHandle {
  const {
    targetCharIndex = -1,
    waveHeight = 20,
    waveRadius = 45,
    ...scrubOptions
  } = options || {};

  let cachedMeasures: { x: number; y: number }[] | null = null;

  return createScrollScrub(target, scrubOptions, ({ progress, index, total, char, element }) => {
    if (!cachedMeasures || cachedMeasures.length !== total) {
      // Collect character center measurements
      const charsList = Array.from(element.querySelectorAll<HTMLElement>('.wim-char'));
      const units = charsList.length > 0 ? charsList : [char];
      cachedMeasures = measureCharCenters(element, units).map((m) => ({ x: m.x, y: m.y }));
    }

    const firstPos = cachedMeasures[0] || { x: 0, y: 0 };
    const lastPos = cachedMeasures[total - 1] || { x: 100, y: 0 };

    const activeIndex = targetCharIndex < 0 ? total + targetCharIndex : targetCharIndex;

    // Current traveling point along straight line path from firstPos to lastPos
    const travelerX = lerp(firstPos.x, lastPos.x, progress);
    const travelerY = lerp(firstPos.y, lastPos.y, progress);

    const myPos = cachedMeasures[index] || { x: 0, y: 0 };

    if (index === activeIndex) {
      // Traveling character moves along travelerPos relative to its original slot
      const dx = travelerX - myPos.x;
      const dy = travelerY - myPos.y;
      return {
        translateX: dx,
        translateY: dy,
      };
    }

    // Distance from this character's original slot to current traveling point
    const distToTraveler = distance(myPos.x, myPos.y, travelerX, travelerY);
    const waveFactor = clamp(1 - distToTraveler / waveRadius, 0, 1);

    if (waveFactor > 0) {
      const angle = Math.atan2(myPos.y - travelerY, myPos.x - travelerX);
      const pushY = -waveHeight * Math.sin(waveFactor * Math.PI);
      const pushX = Math.cos(angle) * (waveFactor * 8);

      return {
        translateX: pushX,
        translateY: pushY,
      };
    }

    return {
      translateX: 0,
      translateY: 0,
    };
  });
}
