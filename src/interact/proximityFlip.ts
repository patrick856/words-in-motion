import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface ProximityFlipOptions extends BaseInteractOptions {
  /** Rotation axis for flip effect ('X' or 'Y'). Defaults to 'Y'. */
  axis?: 'X' | 'Y';
  /** Maximum rotation angle in degrees. Defaults to 180. */
  maxAngle?: number;
}

/**
 * Proximity flip cursor interact effect.
 * Rotates characters around an axis scaling with cursor proximity.
 */
export function proximityFlip(
  target: Target,
  options?: ProximityFlipOptions
): InteractHandle {
  const { axis = 'Y', maxAngle = 180 } = options || {};

  return createInteraction(target, options, ({ progress }) => {
    const angleDeg = progress * maxAngle;
    const transform = axis === 'X' ? `rotateX(${angleDeg.toFixed(1)}deg)` : `rotateY(${angleDeg.toFixed(1)}deg)`;

    return {
      transform,
    };
  });
}
