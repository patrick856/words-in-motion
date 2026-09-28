import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { clamp } from '../core/math';

export interface PullOptions extends BaseInteractOptions {
  /** Maximum pull displacement strength in pixels. Defaults to 18. */
  strength?: number;
}

/**
 * Gravitational pull cursor interact effect.
 * Translates nearby characters toward cursor position with collision boundary clamping to prevent overlapping.
 */
export function pull(
  target: Target,
  options?: PullOptions
): InteractHandle {
  const strength = options?.strength ?? 18;

  return createInteraction(target, options, ({ angle, progress }) => {
    // Limit displacement so characters touch/stop before overlapping neighboring bounds
    const pullDistance = progress * strength;
    const rawX = Math.cos(angle) * pullDistance;
    const rawY = Math.sin(angle) * pullDistance;

    const translateX = clamp(rawX, -14, 14);
    const translateY = clamp(rawY, -14, 14);

    return {
      translateX,
      translateY,
    };
  });
}
