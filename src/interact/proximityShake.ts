import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface ProximityShakeOptions extends BaseInteractOptions {
  /** Default 3px. */ maxAmplitude?: number;
}
/** Low-amplitude, deterministic vibration with a gentle proximity envelope. */
export function proximityShake(target: Target, options?: ProximityShakeOptions): InteractHandle {
  const amplitude = bounded(options?.maxAmplitude, 3, 0, 50);
  return createInteraction(target, options, ({ index, progress, options: opts }) => {
    const t = performance.now() * 0.012 + index * 1.618;
    const a = amplitude * progress * Math.min(4, opts.strength);
    return {
      translateX: Math.sin(t) * a,
      translateY: Math.sin(t * 0.73) * a * 0.5,
      rotate: Math.sin(t * 0.6) * a * 0.7,
    };
  });
}
