import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface ObstaclePushOptions extends BaseInteractOptions {
  /** Radius of the solid cursor obstacle body in pixels. Defaults to 35. */
  cursorRadius?: number;
}

/**
 * Cursor-as-obstacle physical push interact effect.
 * Treats the cursor as a solid physical body on the same visual plane.
 * When the cursor hits/touches characters, it physically pushes them aside along the collision vector, and characters spring back when cleared.
 */
export function obstaclePush(
  target: Target,
  options?: ObstaclePushOptions
): InteractHandle {
  const cursorRadius = options?.cursorRadius ?? 35;

  return createInteraction(target, options, ({ dx, dy, distance: dist }) => {
    // If cursor circle collides with character center
    if (dist > 0 && dist < cursorRadius) {
      const overlap = cursorRadius - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // Physically displace character along collision vector out of the cursor body
      const translateX = -nx * overlap;
      const translateY = -ny * overlap;

      return {
        translateX,
        translateY,
      };
    }

    return {
      translateX: 0,
      translateY: 0,
    };
  });
}
