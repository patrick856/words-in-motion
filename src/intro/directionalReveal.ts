import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface DirectionalRevealOptions extends BaseOptions {
  /** Reveal direction ordering across elements. Defaults to 'left-to-right'. */
  direction?: 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in';
  /** Split granularity. Defaults to 'chars'. */
  by?: 'chars' | 'words';
  /** Whether elements drop in vertically from above as they reveal. Defaults to false. */
  dropIn?: boolean;
  /** Vertical drop-in distance in pixels when dropIn is true. Defaults to 20. */
  dropDistance?: number;
}

/**
 * Directional reveal intro animation.
 * Reveals text word-by-word or char-by-char sliding in directionally or dropping from above.
 */
export function directionalReveal(
  target: Target,
  options?: DirectionalRevealOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  const {
    direction = 'left-to-right',
    by = 'chars',
    dropIn = false,
    dropDistance = 20,
    duration = 600,
    stagger = 40,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  } = options || {};

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    return createDummyHandle();
  }

  const count = units.length;
  const animations: Animation[] = [];

  units.forEach((unit: HTMLElement, index: number) => {
    let staggerIndex = index;
    if (direction === 'right-to-left') {
      staggerIndex = count - 1 - index;
    } else if (direction === 'center-out') {
      staggerIndex = Math.abs(index - (count - 1) / 2);
    } else if (direction === 'edges-in') {
      staggerIndex = (count - 1) / 2 - Math.abs(index - (count - 1) / 2);
    }

    let startTransform = 'none';
    if (dropIn) {
      startTransform = `translate3d(0, -${dropDistance}px, 0)`;
    } else if (direction === 'left-to-right') {
      startTransform = 'translate3d(-15px, 0, 0)';
    } else if (direction === 'right-to-left') {
      startTransform = 'translate3d(15px, 0, 0)';
    }

    unit.style.opacity = '0';

    if (typeof unit.animate === 'function') {
      const anim = unit.animate(
        [
          { opacity: 0, transform: startTransform },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        {
          duration,
          delay: Math.max(0, staggerIndex * stagger),
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
