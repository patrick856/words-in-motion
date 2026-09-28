import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface ProximityFlipOptions extends BaseInteractOptions {
  axis?: 'X' | 'Y';
  /** Maximum tilt, default 55 degrees. */ maxAngle?: number;
}
/** Perspective letter tilts that remain readable at the default strength. */
export function proximityFlip(target: Target, options?: ProximityFlipOptions): InteractHandle {
  const angle = bounded(options?.maxAngle, 55, -180, 180);
  return createInteraction(target, options, ({ progress, options: opts }) => ({
    transform: progress > 0 ? 'perspective(600px)' : '',
    rotateX: options?.axis === 'X' ? angle * Math.min(1, progress * opts.strength) : 0,
    rotateY: options?.axis !== 'X' ? angle * Math.min(1, progress * opts.strength) : 0,
  }));
}
