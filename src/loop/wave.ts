import type { AnimationHandle, Target } from '../core/types';
import { runLoop, type LoopOptions } from './shared';
export type WaveOptions = LoopOptions;
/** A continuous traveling sine wave, sized relative to the text. */
export function wave(target: Target, options?: WaveOptions): AnimationHandle {
  return runLoop(target, options, 2400, (a) =>
    Array.from({ length: 17 }, (_, i) => ({
      offset: i / 16,
      transform: `translate3d(0, ${i === 16 ? 0 : -Math.sin((i / 16) * Math.PI * 2) * 0.12 * a}em, 0)`,
    }))
  );
}
