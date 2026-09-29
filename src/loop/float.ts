import type { AnimationHandle, Target } from '../core/types';
import { runLoop, type LoopOptions } from './shared';
export type FloatOptions = LoopOptions;
/** Slow elliptical drift with a seamless return to rest. */
export function float(target: Target, options?: FloatOptions): AnimationHandle {
  return runLoop(target, options, 4200, (a) =>
    Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * Math.PI * 2;
      return {
        offset: i / 24,
        transform: `translate3d(${i === 24 ? 0 : Math.sin(t) * 0.035 * a}em, ${i === 24 ? 0 : (Math.cos(t) - 1) * 0.055 * a}em, 0) rotate(${i === 24 ? 0 : Math.sin(t) * 1.5 * a}deg)`,
      };
    })
  );
}
