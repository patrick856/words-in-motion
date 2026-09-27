import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { lerp } from '../core/math';

export interface ScatterReassembleOptions extends BaseScrollScrubOptions {
  /** Maximum scatter radius in pixels. Defaults to 60. */
  radius?: number;
}

interface ScatterOffset {
  x: number;
  y: number;
  rotate: number;
}

/**
 * Scattered letters reassemble scroll scrub animation.
 * Positions letters at randomized scattered offsets that smoothly reassemble into place on scroll.
 */
export function scatterReassemble(
  target: Target,
  options?: ScatterReassembleOptions
): ScrollScrubHandle {
  const { radius = 60, ...scrubOptions } = options || {};

  // Deterministic pseudo-random seed per index so offsets are stable across renders
  const getSeedOffset = (index: number): ScatterOffset => {
    const angle = (index * 137.5 * Math.PI) / 180;
    const r = ((index * 37) % radius) + 15;
    const rot = ((index * 53) % 60) - 30;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      rotate: rot,
    };
  };

  return createScrollScrub(target, scrubOptions, ({ progress, index }) => {
    const initial = getSeedOffset(index);
    const currX = lerp(initial.x, 0, progress);
    const currY = lerp(initial.y, 0, progress);
    const currRot = lerp(initial.rotate, 0, progress);
    const currOpacity = lerp(0.4, 1, progress);

    return {
      translateX: currX,
      translateY: currY,
      rotate: currRot,
      opacity: currOpacity,
    };
  });
}
