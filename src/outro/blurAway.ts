import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { bounded } from '../core/effect';
import { outro } from './shared';

export interface BlurAwayOptions extends BaseOptions {
  /** Final blur radius in CSS pixels, 0..32. Default 10. */
  blur?: number;
  /** Upward travel in em, 0..4. Default 0.3. */
  distance?: number;
  keep?: boolean;
}
/** Words softly lift, lose focus, and dissolve in reading order. */
export function blurAway(target: Target, options?: BlurAwayOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) => {
      const blur = bounded(opts?.blur, 10, 0, 32);
      const distance = bounded(opts?.distance, 0.3, 0, 4);
      return outro(
        element,
        { easing: 'cubic-bezier(0.4,0,0.6,1)', ...opts },
        'words',
        900,
        (unit, _i, _total, animate) => {
          animate(unit, [
            { opacity: 1, filter: 'blur(0px)', transform: 'translate3d(0,0,0) scale(1)' },
            {
              offset: 0.3,
              opacity: 0.95,
              filter: `blur(${blur * 0.08}px)`,
              transform: `translate3d(0,${-distance * 0.15}em,0) scale(1.01)`,
            },
            {
              opacity: 0,
              filter: `blur(${blur}px)`,
              transform: `translate3d(0,${-distance}em,0) scale(1.06)`,
            },
          ]);
        }
      );
    },
    'outro'
  );
}
