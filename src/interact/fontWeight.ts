import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { lerp } from '../core/math';

export interface FontWeightOptions extends BaseInteractOptions {
  /** Minimum baseline font weight. Defaults to 300. */
  minWeight?: number;
  /** Maximum font weight at peak proximity. Defaults to 900. */
  maxWeight?: number;
}

/**
 * Proximity font-weight increase cursor interact effect.
 * Smoothly ramps CSS font-weight from light (300) to bold/bolder (900) proportional to cursor proximity without scaling element size.
 */
export function fontWeight(
  target: Target,
  options?: FontWeightOptions
): InteractHandle {
  const { minWeight = 300, maxWeight = 900 } = options || {};

  return createInteraction(target, options, ({ char, progress }) => {
    const currentWeight = Math.round(lerp(minWeight, maxWeight, progress));
    char.style.fontWeight = String(currentWeight);
  });
}
