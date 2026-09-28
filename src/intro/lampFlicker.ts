import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface LampFlickerOptions extends BaseOptions {
  /** Number of flicker toggles before stabilizing. Defaults to 4. */
  flickers?: number;
  /** Split granularity. Defaults to 'all'. */
  by?: 'all' | 'words' | 'chars';
}

/**
 * Lamp flicker-in intro animation.
 * Text flickers at irregular intervals (mimicking a bulb warming up) before settling visible.
 */
export function lampFlicker(target: Target, options?: LampFlickerOptions): AnimationHandle {
  const element = resolveElement(target);
  if (!element) return createDummyHandle();
  if (prefersReducedMotion()) return createDummyHandle();

  const {
    flickers = 4,
    duration = 800,
    stagger = 50,
    by = 'all',
    revertOnFinish = true,
  } = options || {};

  let units: HTMLElement[] = [];
  let revert = () => {};

  if (by === 'words') {
    const splitResult = splitWords(element);
    units = splitResult.words;
    revert = splitResult.revert;
  } else if (by === 'chars') {
    const splitResult = splitChars(element);
    units = splitResult.chars;
    revert = splitResult.revert;
  } else {
    units = [element];
    const originalOpacity = element.style.opacity;
    revert = () => { element.style.opacity = originalOpacity; };
  }

  if (units.length === 0) {
    return createDummyHandle();
  }

  let isCanceled = false;
  const animations: Animation[] = [];

  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => { resolveFinished = res; });

  const cancel = () => {
    isCanceled = true;
    animations.forEach((a) => a.cancel());
    revert();
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element as HTMLElement, { cancel });

  units.forEach((unit: HTMLElement, index: number) => {
    unit.style.opacity = '0';

    if (typeof unit.animate === 'function') {
      const keyframes: Keyframe[] = [{ opacity: 0, offset: 0, easing: 'steps(1, end)' }];
      const totalSteps = flickers * 2;

      for (let s = 1; s < totalSteps; s++) {
        const offset = s / totalSteps;
        const opacity = s % 2 === 1 ? 0.8 + Math.random() * 0.2 : Math.random() * 0.15;
        keyframes.push({ opacity, offset, easing: 'steps(1, end)' });
      }

      keyframes.push({ opacity: 1, offset: 1 });

      const anim = unit.animate(keyframes, {
        duration,
        delay: by === 'all' ? 0 : index * stagger,
        easing: 'linear',
        fill: 'forwards',
      });
      animations.push(anim);
    } else {
      unit.style.opacity = '1';
    }
  });

  Promise.all(animations.map(a => a.finished)).then(() => {
    if (!isCanceled) {
      if (revertOnFinish) revert();
      unregisterIntro(element);
      resolveFinished();
    }
  }).catch(() => {});

  return { finished, cancel };
}
