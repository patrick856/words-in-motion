import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { clamp, lerp } from '../core/math';

export interface ReadingLineOptions extends BaseScrollScrubOptions {
  /** Baseline opacity for unread words. Defaults to 0.25. */
  baseOpacity?: number;
}

/**
 * Reading-line opacity follow scroll scrub animation.
 * Renders text at low opacity and ramps each word's opacity to 100% sequentially based on scroll progress.
 */
export function readingLine(
  target: Target,
  options?: ReadingLineOptions
): ScrollScrubHandle {
  const { baseOpacity = 0.25, ...scrubOptions } = options || {};

  return createScrollScrub(target, scrubOptions, ({ progress, index, total }) => {
    const wordStep = 1 / total;
    const wordStartProgress = index * wordStep;
    const wordEndProgress = (index + 1) * wordStep;

    const wordProgress = clamp(
      (progress - wordStartProgress) / (wordEndProgress - wordStartProgress),
      0,
      1
    );

    const currentOpacity = lerp(baseOpacity, 1, wordProgress);

    return {
      opacity: currentOpacity,
    };
  });
}
