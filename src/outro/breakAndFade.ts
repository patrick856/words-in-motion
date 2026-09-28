import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { bounded } from '../core/effect';
import { outro } from './shared';
export interface BreakAndFadeOptions extends BaseOptions {
  /** Time allotted to the reading-order fracture sweep. Defaults to 240ms. */
  sweepDuration?: number;
  keep?: boolean;
}
/** A reading-order fracture with restrained alternating displacement, suitable for wrapped text. */
export function breakAndFade(target: Target, options?: BreakAndFadeOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) =>
      outro(element, opts, 'chars', 850, (unit, i, total, animate) => {
        const sign = i % 2 ? -1 : 1;
        const phase =
          ((bounded(opts?.sweepDuration, 240, 0, 2000) / bounded(opts?.duration, 850, 10, 60000)) *
            10 *
            i) /
          Math.max(1, total - 1);
        animate(
          unit,
          [
            { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' },
            {
              offset: 0.28,
              opacity: 1,
              transform: `translate3d(${sign * 0.055}em,-0.025em,0) rotate(${sign * 3}deg)`,
            },
            {
              opacity: 0,
              transform: `translate3d(${sign * 0.22}em,0.35em,0) rotate(${sign * 12}deg)`,
            },
          ],
          phase
        );
      }),
    'outro'
  );
}
