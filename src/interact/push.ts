import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { clamp } from '../core/math';

export interface PushOptions extends BaseInteractOptions {
  /** Maximum push displacement strength in pixels. Defaults to 20. */
  strength?: number;
}

/**
 * Anti-gravitational push cursor interact effect.
 * Translates nearby characters away from cursor with collision boundary clamping to prevent overlapping.
 */
export function push(
  target: Target,
  options?: PushOptions
): InteractHandle {
  const strength = options?.strength ?? 20;

  return createInteraction(target, options, ({ angle, progress }) => {
    // Limit displacement so pushed characters stop before overlapping neighbors
    const pushDistance = progress * strength;
    const rawX = -Math.cos(angle) * pushDistance;
    const rawY = -Math.sin(angle) * pushDistance;

    const translateX = clamp(rawX, -16, 16);
    const translateY = clamp(rawY, -16, 16);

    return {
      translateX,
      translateY,
    };
  });
}
