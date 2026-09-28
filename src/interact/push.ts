import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface PushOptions extends BaseInteractOptions {
  /** Maximum travel in pixels. Default 20. */ strength?: number;
}
/** A soft repulsion field with a smooth boundary and bounded travel. */
export function push(target: Target, options?: PushOptions): InteractHandle {
  const strength = bounded(options?.strength, 20, 0, 300);
  return createInteraction(target, options, ({ angle, progress }) => ({
    collide: true,
    translateX: -Math.cos(angle) * progress * strength,
    translateY: -Math.sin(angle) * progress * strength,
  }));
}
