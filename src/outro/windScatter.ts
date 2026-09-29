import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { bounded } from '../core/effect';
import { outro } from './shared';

export interface WindScatterOptions extends BaseOptions {
  /** Gust direction. Default right. */
  direction?: 'left' | 'right';
  /** Horizontal travel in em, 0..8. Default 1.8. */
  distance?: number;
  keep?: boolean;
}
/** A directional gust lifts and carries letters away with deterministic variation. */
export function windScatter(target: Target, options?: WindScatterOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) => {
      const sign = opts?.direction === 'left' ? -1 : 1;
      const distance = bounded(opts?.distance, 1.8, 0, 8);
      return outro(element, opts, 'chars', 1000, (unit, i, _total, animate) => {
        const variation = ((i + 1) * 0.61803398875) % 1;
        const travel = sign * distance * (0.7 + variation * 0.3);
        const lift = -distance * (0.12 + variation * 0.22);
        animate(unit, [
          { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' },
          {
            offset: 0.2,
            opacity: 1,
            transform: `translate3d(${-sign * 0.04}em,0,0) rotate(${-sign * 3}deg)`,
          },
          {
            offset: 0.55,
            opacity: 0.85,
            transform: `translate3d(${travel * 0.25}em,${lift * 0.7}em,0) rotate(${sign * (8 + variation * 8)}deg)`,
          },
          {
            opacity: 0,
            transform: `translate3d(${travel}em,${lift}em,0) rotate(${sign * (20 + variation * 25)}deg)`,
          },
        ]);
      });
    },
    'outro'
  );
}
