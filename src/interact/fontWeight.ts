import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { lerp } from '../core/math';

export interface FontWeightOptions extends BaseInteractOptions {
  /** Maximum scale multiplier at peak proximity. Defaults to 1.35. */
  maxScale?: number;
}

/**
 * Proximity font-weight / scale increase cursor interact effect.
 * Increases character scale and weight proportional to cursor proximity.
 */
export function fontWeight(
  target: Target,
  options?: FontWeightOptions
): InteractHandle {
  const maxScale = options?.maxScale ?? 1.35;

  return createInteraction(target, options, ({ progress }) => {
    const scale = lerp(1, maxScale, progress);
    return {
      scale,
    };
  });
}
