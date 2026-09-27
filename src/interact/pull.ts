import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface PullOptions extends BaseInteractOptions {
  /** Maximum pull displacement strength in pixels. Defaults to 25. */
  strength?: number;
}

/**
 * Gravitational pull cursor interact effect.
 * Translates nearby characters toward the cursor position proportional to proximity.
 */
export function pull(
  target: Target,
  options?: PullOptions
): InteractHandle {
  const strength = options?.strength ?? 25;

  return createInteraction(target, options, ({ angle, progress }) => {
    const pullDistance = progress * strength;
    const translateX = Math.cos(angle) * pullDistance;
    const translateY = Math.sin(angle) * pullDistance;

    return {
      translateX,
      translateY,
    };
  });
}
