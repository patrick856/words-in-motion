import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { outro } from './shared';
export interface BlackHoleOptions extends BaseOptions {
  by?: 'chars' | 'words';
  /** Restore visible text after completion instead of keeping it hidden. */
  keep?: boolean;
}
/** A controlled spiral collapse into the center of the text block. */
export function blackHole(target: Target, options?: BlackHoleOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) => {
      const box = element.getBoundingClientRect();
      return outro(element, opts, opts?.by ?? 'chars', 900, (unit, index, total, animate) => {
        const rect = unit.getBoundingClientRect();
        const x = box.left + box.width / 2 - rect.left - rect.width / 2;
        const y = box.top + box.height / 2 - rect.top - rect.height / 2;
        const turn = (index / Math.max(1, total - 1) - 0.5) * 35;
        animate(unit, [
          { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
          {
            offset: 0.35,
            opacity: 1,
            transform: `translate3d(${-x * 0.035}px,${-y * 0.035}px,0) rotate(${-turn * 0.15}deg) scale(1.025)`,
          },
          { opacity: 0, transform: `translate3d(${x}px,${y}px,0) rotate(${turn}deg) scale(0.05)` },
        ]);
      });
    },
    'outro'
  );
}
