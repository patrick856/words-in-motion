import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface BlackHoleOptions extends BaseOptions {
  /** Split granularity. Defaults to 'chars'. */
  by?: 'chars' | 'words';
  /** Whether to keep text hidden or restore original state after completion. Defaults to false (hidden). */
  keep?: boolean;
}

/**
 * Black hole collapse outro animation.
 * Words/characters converge toward a central point while scaling down to 0 opacity.
 */
export function blackHole(
  target: Target,
  options?: BlackHoleOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    by = 'chars',
    duration = 700,
    stagger = 30,
    easing = 'cubic-bezier(0.7, 0, 0.84, 0)',
    keep = false,
  } = options || {};

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    return createDummyHandle();
  }

  const containerRect = element.getBoundingClientRect();
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  const animations: Animation[] = [];

  units.forEach((unit: HTMLElement, index: number) => {
    const unitRect = unit.getBoundingClientRect();
    const unitCenterX = unitRect.left + unitRect.width / 2 - containerRect.left;
    const unitCenterY = unitRect.top + unitRect.height / 2 - containerRect.top;

    const deltaX = centerX - unitCenterX;
    const deltaY = centerY - unitCenterY;

    if (typeof unit.animate === 'function') {
      const anim = unit.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          { opacity: 0, transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0)` },
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
      unit.style.opacity = '0';
    }
  });

  const finished = Promise.all(animations.map((a) => a.finished)).then(() => {
    if (!keep) {
      element.style.opacity = '0';
      splitResult.revert();
    }
  });

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    splitResult.revert();
    element.style.opacity = '';
  };

  return { finished, cancel };
}
