import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface RiseOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Internal stagger and rise timings scale proportionally unless explicitly overridden.
   * @default 800
   */
  duration?: number;
  /** Direction from which elements arrive. 'ground' starts below, 'ceiling' starts above. Defaults to 'ground'. */
  from?: 'ground' | 'ceiling';
  /** Distance in pixels for initial offset when not masked. Defaults to 30. */
  distance?: number;
  /** Split granularity. Defaults to 'words'. */
  by?: 'words' | 'chars';
  /** Whether to clip the animation within a bounding box. Defaults to true. */
  mask?: boolean;
  /** Whether to fade opacity during reveal. Defaults to true when unmasked, false when masked. */
  fade?: boolean;
}

const DEFAULT_DURATION = 800;
const DEFAULT_STAGGER = 30;

function runSingleRise(element: HTMLElement, options?: RiseOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;

  const {
    from = 'ground',
    distance = 30,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    by = 'words',
    mask = true,
    revertOnFinish = true,
  } = options || {};

  const actualStagger = typeof options?.stagger === 'number'
    ? Math.max(0, options.stagger)
    : Math.max(5, Math.round(DEFAULT_STAGGER * timingScale));

  const fade = options?.fade ?? (mask ? false : true);

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

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
    splitResult.revert();
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element, { cancel });

  if (mask) {
    units.forEach((unit: HTMLElement, index: number) => {
      // wrap in mask
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.overflow = 'hidden';
      wrapper.style.paddingTop = '0.3em';
      wrapper.style.marginTop = '-0.3em';
      wrapper.style.paddingBottom = '0.3em';
      wrapper.style.marginBottom = '-0.3em';
      wrapper.style.verticalAlign = 'top';

      unit.parentNode?.insertBefore(wrapper, unit);
      wrapper.appendChild(unit);

      unit.style.display = 'inline-block';

      if (fade) {
        unit.style.opacity = '0';
      }

      if (typeof unit.animate === 'function') {
        const initialY = from === 'ground' ? '100%' : '-100%';
        const keyframes: Keyframe[] = [
          { transform: `translateY(${initialY})` },
          { transform: 'translateY(0)' }
        ];
        if (fade) {
          keyframes[0].opacity = 0;
          keyframes[1].opacity = 1;
        }

        const anim = unit.animate(keyframes, {
          duration,
          delay: index * actualStagger,
          easing,
          fill: 'forwards',
        });
        animations.push(anim);
      } else {
        unit.style.opacity = '1';
        unit.style.transform = 'translateY(0)';
      }
    });
  } else {
    const initialY = from === 'ground' ? distance : -distance;
    units.forEach((unit: HTMLElement, index: number) => {
      if (fade) {
        unit.style.opacity = '0';
      }

      if (typeof unit.animate === 'function') {
        const keyframes: Keyframe[] = [
          { transform: `translate3d(0, ${initialY}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' }
        ];
        if (fade) {
          keyframes[0].opacity = 0;
          keyframes[1].opacity = 1;
        }

        const anim = unit.animate(keyframes, {
          duration,
          delay: index * actualStagger,
          easing,
          fill: 'forwards',
        });
        animations.push(anim);
      } else {
        unit.style.opacity = '1';
        unit.style.transform = 'translate3d(0, 0, 0)';
      }
    });
  }

  Promise.all(animations.map(a => a.finished)).then(() => {
    if (!isCanceled) {
      if (revertOnFinish) splitResult.revert();
      unregisterIntro(element);
      resolveFinished();
    }
  }).catch(() => {});

  return { finished, cancel };
}

/**
 * Rise from ground / drop from ceiling intro animation.
 * Each word/character starts translated below (ground) or above (ceiling) its baseline and moves into place.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function rise(target: Target, options?: RiseOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleRise, 'intro');
}

