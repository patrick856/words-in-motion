import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { runAnimationWithTrigger } from '../core/motion';
import { bounded } from '../core/effect';
import { outro } from './shared';
export interface PaperCutOptions extends BaseOptions {
  /** Horizontal strips per word, 2..12. Defaults to 4. */
  strips?: number;
  /** Horizontal travel in CSS pixels. Defaults to 35. */
  maxOffset?: number;
  keep?: boolean;
}
/** Alternating horizontal slices slide apart without reconstructing or flattening lines. */
export function paperCut(target: Target, options?: PaperCutOptions): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) =>
      outro(element, opts, 'words', 850, (unit, index, _total, animate) => {
        const count = Math.round(bounded(opts?.strips, 4, 2, 12));
        const distance = bounded(opts?.maxOffset, 35, 0, 500);
        const color = getComputedStyle(unit).color;
        const text = unit.textContent;
        unit.style.position = 'relative';
        unit.style.color = 'transparent';
        for (let i = 0; i < count; i++) {
          const slice = document.createElement('span');
          slice.textContent = text;
          slice.setAttribute('aria-hidden', 'true');
          Object.assign(slice.style, {
            position: 'absolute',
            inset: '0',
            color,
            pointerEvents: 'none',
            clipPath: `inset(${(i / count) * 100}% 0 ${((count - i - 1) / count) * 100}% 0)`,
          });
          unit.append(slice);
          const sign = (i + index) % 2 ? -1 : 1;
          animate(
            slice,
            [
              { opacity: 1, transform: 'translate3d(0,0,0)' },
              {
                offset: 0.22,
                opacity: 1,
                transform: `translate3d(${-sign * distance * 0.04}px,0,0)`,
              },
              { opacity: 0, transform: `translate3d(${sign * distance}px,0,0)` },
            ],
            i / count
          );
        }
      }),
    'outro'
  );
}
