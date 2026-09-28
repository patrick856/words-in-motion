import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface ProximityFadeOptions extends BaseInteractOptions {
  /** Minimum opacity. Default 0.25. */ minOpacity?: number;
}
/** A smooth, legible fade around the pointer. */
export function proximityFade(target: Target, options?: ProximityFadeOptions): InteractHandle {
  const min = bounded(options?.minOpacity, 0.25, 0, 1);
  return createInteraction(target, options, ({ progress, options: opts }) => ({
    opacity: 1 - (1 - min) * Math.min(1, progress * opts.strength),
  }));
}
