import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface LampFlickerOptions extends BaseOptions {
  /** Number of flicker toggles before stabilizing. Defaults to 4. */
  flickers?: number;
  /** Split granularity. Defaults to 'chars'. */
  by?: 'chars' | 'words';
}

/**
 * Lamp flicker-in intro animation.
 * Text flickers at irregular intervals (mimicking a bulb warming up) before settling visible.
 */
export function lampFlicker(
  target: Target,
  options?: LampFlickerOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  const {
    flickers = 4,
    duration = 800,
    stagger = 50,
    by = 'chars',
  } = options || {};

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    return createDummyHandle();
  }

  const animations: Animation[] = [];

  units.forEach((unit: HTMLElement, index: number) => {
    unit.style.opacity = '0';

    if (typeof unit.animate === 'function') {
      const keyframes: Keyframe[] = [{ opacity: 0, offset: 0 }];
      const totalSteps = flickers * 2;

      for (let s = 1; s < totalSteps; s++) {
        const offset = s / totalSteps;
        const opacity = s % 2 === 1 ? 0.8 + Math.random() * 0.2 : Math.random() * 0.15;
        keyframes.push({ opacity, offset });
      }

      keyframes.push({ opacity: 1, offset: 1 });

      const anim = unit.animate(keyframes, {
        duration,
        delay: index * stagger,
        easing: 'steps(2, end)',
        fill: 'forwards',
      });

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
