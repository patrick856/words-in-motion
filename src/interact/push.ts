import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface PushOptions extends BaseInteractOptions {
  /** Maximum push displacement strength in pixels. Defaults to 30. */
  strength?: number;
}

/**
 * Anti-gravitational push cursor interact effect.
 * Translates nearby characters away from the cursor position proportional to proximity.
 */
export function push(
  target: Target,
  options?: PushOptions
): InteractHandle {
  const strength = options?.strength ?? 30;

  return createInteraction(target, options, ({ angle, progress }) => {
    const pushDistance = progress * strength;
    const translateX = -Math.cos(angle) * pushDistance;
    const translateY = -Math.sin(angle) * pushDistance;

    return {
      translateX,
      translateY,
    };
  });
}
