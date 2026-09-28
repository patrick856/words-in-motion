import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface LampFlickerOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Internal keyframes and stagger timings scale proportionally unless explicitly overridden.
   * @default 1200
   */
  duration?: number;
  /** Number of flicker toggles before stabilizing. Defaults to 4. */
  flickers?: number;
  /** Split granularity. Defaults to 'all'. */
  by?: 'all' | 'words' | 'chars';
}

const DEFAULT_DURATION = 1200;
const DEFAULT_STAGGER = 50;

/**
 * Builds an irregular warm-up sequence followed by one or two tiny final
 * flicks. The final pulses make the light feel like it catches briefly before
 * settling instead of fading smoothly into its finished state.
 */
function createFlickerKeyframes(flickers: number): Keyframe[] {
  const keyframes: Keyframe[] = [{ opacity: 0, offset: 0, easing: 'steps(1, end)' }];
  const requestedFlickers = Number.isFinite(flickers) ? Math.floor(flickers) : 4;
  const toggleCount = Math.max(2, requestedFlickers * 2);
  const lateFlicks = Math.random() < 0.45 ? 2 : 1;
  const warmupEnd = lateFlicks === 2 ? 0.78 : 0.84;
  const warmupStart = 0.06;

  // Random weights are normalized into the available warm-up portion. This
  // keeps the animation duration stable while making every interval distinct.
  const intervals = Array.from({ length: toggleCount }, () => 0.45 + Math.random());
  const intervalTotal = intervals.reduce((total, interval) => total + interval, 0);
  let elapsed = 0;

  intervals.forEach((interval, index) => {
    elapsed += interval;
    const offset = warmupStart + (elapsed / intervalTotal) * (warmupEnd - warmupStart);
    const isLit = index % 2 === 0;
    keyframes.push({
      opacity: isLit ? 0.78 + Math.random() * 0.22 : Math.random() * 0.14,
      offset,
      easing: 'steps(1, end)',
    });
  });

  // Add a final catch or double-catch in the last portion of the timeline.
  // Each pulse is intentionally short, then the light settles at full opacity.
  const lateStart = lateFlicks === 2 ? 0.84 : 0.9;
  const lateStep = lateFlicks === 2 ? 0.035 : 0.025;
  for (let index = 0; index < lateFlicks * 2; index++) {
    const isLit = index % 2 === 0;
    keyframes.push({
      opacity: isLit ? 0.84 + Math.random() * 0.16 : Math.random() * 0.1,
      offset: lateStart + index * lateStep,
      easing: 'steps(1, end)',
    });
  }

  keyframes.push({ opacity: 1, offset: 1, easing: 'steps(1, end)' });
  return keyframes;
}

function runSingleLampFlicker(element: HTMLElement, options?: LampFlickerOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;

  const {
    flickers = 4,
    by = 'all',
    revertOnFinish = true,
  } = options || {};

  const actualStagger = typeof options?.stagger === 'number'
    ? Math.max(0, options.stagger)
    : Math.max(5, Math.round(DEFAULT_STAGGER * timingScale));

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
      const keyframes = createFlickerKeyframes(flickers);

      const anim = unit.animate(keyframes, {
        duration,
        delay: by === 'all' ? 0 : index * actualStagger,
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

/**
 * Lamp flicker-in intro animation.
 * Text flickers at irregular intervals (mimicking a bulb warming up) before settling visible.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function lampFlicker(target: Target, options?: LampFlickerOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleLampFlicker, 'intro');
}

