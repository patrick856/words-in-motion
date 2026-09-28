import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { lerp } from '../core/math';

export interface ScatterReassembleOptions extends BaseScrollScrubOptions {
  /** Maximum scatter distance in pixels (tightly bounded to 1-2 letter widths). Defaults to 22. */
  maxScatter?: number;
}

interface ScatterOffset {
  x: number;
  y: number;
  rotate: number;
}

/**
 * Scattered letters reassemble scroll scrub animation.
 * Positions letters at tightly bounded scattered offsets (1-2 letters away) that smoothly assemble into place on scroll.
 */
export function scatterReassemble(
  target: Target,
  options?: ScatterReassembleOptions
): ScrollScrubHandle {
  const { maxScatter = 22, ...scrubOptions } = options || {};

  // Deterministic pseudo-random seed per character index for organic 2D scattering
  const getSeedOffset = (index: number): ScatterOffset => {
    const seed = (index * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const angle = (index * 137.5 * Math.PI) / 180 + rnd * Math.PI;
    const dist = (0.5 + rnd * 0.5) * maxScatter;
    const rot = (rnd - 0.5) * 24;

    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rotate: rot,
    };
  };

  return createScrollScrub(target, scrubOptions, ({ progress, index }) => {
    const initial = getSeedOffset(index);
    const currX = lerp(initial.x, 0, progress);
    const currY = lerp(initial.y, 0, progress);
    const currRot = lerp(initial.rotate, 0, progress);
    const currOpacity = lerp(0.5, 1, progress);

    return {
      translateX: currX,
      translateY: currY,
      rotate: currRot,
      opacity: currOpacity,
    };
  });
}
