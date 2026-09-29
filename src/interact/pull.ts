import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface PullOptions extends BaseInteractOptions {
  /** Maximum travel in pixels. Default 15. */ strength?: number;
}
/** Soft magnetic attraction that never overshoots the pointer. */
export function pull(target: Target, options?: PullOptions): InteractHandle {
  const strength = bounded(options?.strength, 15, 0, 300);
  return createInteraction(target, options, ({ angle, distance, progress }) => {
    const travel = Math.min(distance * 0.45, progress * strength);
    return {
      translateX: Math.cos(angle) * travel,
      translateY: Math.sin(angle) * travel,
    };
  });
}
