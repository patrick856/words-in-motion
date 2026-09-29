import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface ProximityRotateOptions extends BaseInteractOptions {
  /** Default 90 degrees. */ maxAngle?: number;
  direction?: 'clockwise' | 'counter-clockwise';
}
/** A pronounced quarter-turn near the cursor, with a soft return. */
export function proximityRotate(target: Target, options?: ProximityRotateOptions): InteractHandle {
  const angle =
    bounded(options?.maxAngle, 90, -360, 360) *
    (options?.direction === 'counter-clockwise' ? -1 : 1);
  return createInteraction(target, options, ({ progress, options: opts }) => ({
    rotate: angle * Math.min(1, progress * opts.strength),
  }));
}
