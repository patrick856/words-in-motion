import type { AnimationHandle, BaseOptions } from '../core/types';
import { createDummyHandle, prefersReducedMotion } from '../core/motion';
import { splitChars, splitWords } from '../core/split';
import { animationGroup, bounded, ownEffect, stopEffect } from '../core/effect';

export interface OutroOptions extends BaseOptions {
  keep?: boolean;
}
export function outro(
  element: HTMLElement,
  options: OutroOptions | undefined,
  by: 'chars' | 'words',
  defaultDuration: number,
  build: (
    unit: HTMLElement,
    index: number,
    total: number,
    animate: (target: HTMLElement, frames: Keyframe[], phase?: number) => void
  ) => void
): AnimationHandle {
  stopEffect(element);
  if (!element.textContent?.trim()) return createDummyHandle();
  const opacity = element.style.opacity;
  let completed = false;
  let canceled = false;
  let release = () => {};
  let handle: AnimationHandle;
  const cancel = () => {
    if (canceled) return;
    canceled = true;
    handle?.cancel();
    element.style.opacity = opacity;
    release();
  };
  if (prefersReducedMotion() || typeof element.animate !== 'function') {
    if (!options?.keep) element.style.opacity = '0';
    handle = createDummyHandle();
    release = ownEffect(element, cancel);
    return { finished: handle.finished, cancel };
  }
  const result = by === 'words' ? splitWords(element) : splitChars(element);
  const units = 'words' in result ? result.words : result.chars;
  const duration = bounded(options?.duration, defaultDuration, 10, 60000);
  const stagger = bounded(
    options?.stagger,
    Math.min(28, (duration * 0.3) / Math.max(1, units.length - 1)),
    0,
    duration / Math.max(1, units.length - 1)
  );
  const animations: Animation[] = [];
  try {
    units.forEach((unit, index) =>
      build(unit, index, units.length, (target, frames, phase = 0) => {
        animations.push(
          target.animate(frames, {
            duration: duration * 0.7,
            delay: bounded(options?.delay, 0, 0, 60000) + index * stagger + phase * duration * 0.1,
            easing: options?.easing || 'cubic-bezier(0.55, 0, 0.85, 0.35)',
            fill: 'both',
          })
        );
      })
    );
  } catch (error) {
    animations.forEach((a) => {
      void a.finished.catch(() => {});
      a.cancel();
    });
    result.revert();
    throw error;
  }
  handle = animationGroup(animations, (natural) => {
    completed = natural;
    result.revert();
    element.style.opacity = natural && !options?.keep ? '0' : opacity;
    if (!natural) release();
  });
  release = ownEffect(element, cancel);
  // Keep ownership after completion so cancel() can restore the original opacity,
  // and a subsequent effect starts from the original DOM and style.
  return {
    finished: handle.finished,
    cancel: () => {
      if (completed || !canceled) cancel();
    },
  };
}
