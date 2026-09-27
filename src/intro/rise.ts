import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface RiseOptions extends BaseOptions {
  /** Direction from which elements arrive. 'ground' starts below, 'ceiling' starts above. Defaults to 'ground'. */
  from?: 'ground' | 'ceiling';
  /** Distance in pixels for initial offset. Defaults to 30. */
  distance?: number;
  /** Split granularity. Defaults to 'words'. */
  by?: 'words' | 'chars';
}

/**
 * Rise from ground / drop from ceiling intro animation.
 * Each word/character starts translated below (ground) or above (ceiling) its baseline and moves into place.
 */
export function rise(
  target: Target,
  options?: RiseOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  const {
    from = 'ground',
    distance = 30,
    duration = 600,
    stagger = 30,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    by = 'words',
  } = options || {};

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    return createDummyHandle();
  }

  const initialY = from === 'ground' ? distance : -distance;
  const animations: Animation[] = [];

  units.forEach((unit: HTMLElement, index: number) => {
    unit.style.opacity = '0';

    if (typeof unit.animate === 'function') {
      const anim = unit.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${initialY}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        {
          duration,
          delay: index * stagger,
          easing,
          fill: 'forwards',
        }
      );
      animations.push(anim);
    } else {
      unit.style.opacity = '1';
    }
  });

  const finished = Promise.all(animations.map((a) => a.finished)).then(() => undefined);

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    splitResult.revert();
  };

  return { finished, cancel };
}
