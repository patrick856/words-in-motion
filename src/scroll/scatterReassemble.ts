import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { bounded } from '../core/effect';
export interface ScatterReassembleOptions extends BaseScrollScrubOptions {
  maxScatter?: number;
}
/** Deterministic scattered letters settle in a short reading-order cascade. */
export function scatterReassemble(
  target: Target,
  options?: ScatterReassembleOptions
): ScrollScrubHandle {
  const distance = bounded(options?.maxScatter, 22, 0, 500);
  return createScrollScrub(target, options, ({ progress, index, total }) => {
    const seed = ((index + 1) * 0.61803398875) % 1;
    const angle = index * 2.3999632297;
    const local = Math.min(
      1,
      Math.max(0, (progress - (index / Math.max(1, total - 1)) * 0.18) / 0.82)
    );
    const remaining = (1 - local) ** 3;
    return {
      translateX: Math.cos(angle) * distance * (0.5 + seed * 0.5) * remaining,
      translateY: Math.sin(angle) * distance * remaining,
      rotate: (seed - 0.5) * 24 * remaining,
      opacity: 1 - remaining * 0.65,
    };
  });
}
