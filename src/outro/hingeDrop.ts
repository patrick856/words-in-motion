import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { bounded } from '../core/effect';
import { outro } from './shared';

export interface HingeDropOptions extends BaseOptions {
  /** Drop distance in em. Default 1.2. */
  distance?: number;
  /** Restore visible text after completion. */
  keep?: boolean;
}
/** Letters pivot from their upper corner, release, and fall out of the line. */
export function hingeDrop(target: Target, options?: HingeDropOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) => {
      const distance = bounded(opts?.distance, 1.2, 0, 8);
      return outro(element, opts, 'chars', 1100, (unit, i, _total, animate) => {
        const sign = i % 2 ? -1 : 1;
        unit.style.transformOrigin = sign > 0 ? '0% 0%' : '100% 0%';
        animate(unit, [
          { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' },
          {
            offset: 0.36,
            opacity: 1,
            transform: `translate3d(0,0,0) rotate(${sign * 32}deg)`,
            easing: 'cubic-bezier(0.2,0.8,0.3,1)',
          },
          {
            offset: 0.55,
            opacity: 1,
            transform: `translate3d(0,0,0) rotate(${sign * 22}deg)`,
            easing: 'cubic-bezier(0.55,0,1,0.45)',
          },
          {
            opacity: 0,
            transform: `translate3d(${sign * 0.15}em,${distance}em,0) rotate(${sign * 75}deg)`,
          },
        ]);
      });
    },
    'outro'
  );
}
