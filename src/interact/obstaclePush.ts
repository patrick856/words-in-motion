import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface ObstaclePushOptions extends BaseInteractOptions {
  /** Contact radius in CSS pixels. Default 0: only the cursor tip touches letters. */
  cursorRadius?: number;
}
/** A solid 2D cursor pushes letters and their neighbors; each letter springs home afterward. */
export function obstaclePush(target: Target, options?: ObstaclePushOptions): InteractHandle {
  const radius = bounded(options?.cursorRadius, 0, 0, 500);
  return createInteraction(target, options, ({ options: opts }) => ({
    collide: true,
    cursorObstacle: opts.strength > 0 ? radius : undefined,
  }));
}
