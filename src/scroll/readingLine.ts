import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { bounded } from '../core/effect';
export interface ReadingLineOptions extends BaseScrollScrubOptions {
  baseOpacity?: number;
}
/** A word-by-word reading sweep with a soft leading edge and a fully opaque final state. */
export function readingLine(target: Target, options?: ReadingLineOptions): ScrollScrubHandle {
  const base = bounded(options?.baseOpacity, 0.25, 0, 1);
  return createScrollScrub(target, { ...options, by: 'words' }, ({ progress, index, total }) => {
    const p = Math.min(1, Math.max(0, progress * (total + 1) - index));
    return { opacity: base + (1 - base) * p * p * (3 - 2 * p) };
  });
}
