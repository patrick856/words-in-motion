import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface ObstaclePushOptions extends BaseInteractOptions {
  /** Maximum push distance in pixels. Defaults to 45. */
  strength?: number;
}

/**
 * Cursor-as-obstacle push interact effect.
 * Treats cursor as occupying the same visual plane, pushing nearby characters aside as an obstacle.
 */
export function obstaclePush(
  target: Target,
  options?: ObstaclePushOptions
): InteractHandle {
  const strength = options?.strength ?? 45;

  return createInteraction(target, options, ({ angle, progress }) => {
    if (progress <= 0) {
      return { translateX: 0, translateY: 0 };
    }

    // Exponential push response when cursor enters bounding radius
    const pushFactor = Math.pow(progress, 1.5) * strength;
    const translateX = -Math.cos(angle) * pushFactor;
    const translateY = -Math.sin(angle) * pushFactor;

    return {
      translateX,
      translateY,
    };
  });
}
