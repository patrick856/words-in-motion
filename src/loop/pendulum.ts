import type { AnimationHandle, Target } from '../core/types';
import { runLoop, type LoopOptions } from './shared';
export type PendulumOptions = LoopOptions;
/** Alternating, softly phased letter tilts without mirrored or unreadable text. */
export function pendulum(target: Target, options?: PendulumOptions): AnimationHandle {
  return runLoop(target, options, 3000, (a) =>
    Array.from({ length: 25 }, (_, i) => ({
      offset: i / 24,
      transform: `rotate(${i === 24 ? 0 : Math.sin((i / 24) * Math.PI * 2) * 7 * a}deg)`,
    }))
  );
}
