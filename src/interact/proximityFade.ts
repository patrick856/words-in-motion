import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { lerp } from '../core/math';

export interface ProximityFadeOptions extends BaseInteractOptions {
  /** Minimum opacity at closest proximity (0..1). Defaults to 0.1. */
  minOpacity?: number;
}

/**
 * Proximity fade cursor interact effect.
 * Decreases character opacity proportional to cursor proximity.
 */
export function proximityFade(
  target: Target,
  options?: ProximityFadeOptions
): InteractHandle {
  const minOpacity = options?.minOpacity ?? 0.1;

  return createInteraction(target, options, ({ progress }) => {
    const opacity = lerp(1, minOpacity, progress);
    return {
      opacity,
    };
  });
}
