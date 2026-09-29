import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { createDummyHandle, prefersReducedMotion, runAnimationWithTrigger } from '../core/motion';
import { splitChars, splitWords } from '../core/split';
import { animationGroup, bounded, ownEffect, stopEffect } from '../core/effect';

export interface LoopOptions extends BaseOptions {
  /** Characters (default) or whole words. Joined scripts always use words. */
  by?: 'chars' | 'words';
  /** Motion amplitude multiplier, 0..4. Defaults to 1. */
  intensity?: number;
}

export function runLoop(
  target: Target,
  options: LoopOptions | undefined,
  period: number,
  frames: (amount: number) => Keyframe[]
): AnimationHandle {
  return runAnimationWithTrigger(
    target,
    options,
    (element, opts) => {
      stopEffect(element);
      if (
        prefersReducedMotion() ||
        !element.textContent?.trim() ||
        typeof element.animate !== 'function'
      )
        return createDummyHandle();
      const result = opts?.by === 'words' ? splitWords(element) : splitChars(element);
      const units = 'words' in result ? result.words : result.chars;
      if (!units.length) {
        result.revert();
        return createDummyHandle();
      }
      const duration = bounded(opts?.duration, period, 100, 60000);
      const stagger = bounded(
        opts?.stagger,
        duration * 0.045,
        0,
        duration / Math.max(1, units.length - 1)
      );
      const animations: Animation[] = [];
      try {
        units.forEach((unit, i) => {
          const animation = unit.animate(frames(bounded(opts?.intensity, 1, 0, 4)), {
            duration,
            delay: bounded(opts?.delay, 0, 0, 60000) + i * stagger,
            easing: opts?.easing || 'linear',
            iterations: Infinity,
            fill: 'both',
          });
          animations.push(animation);
        });
      } catch (error) {
        animations.forEach((a) => {
          void a.finished.catch(() => {});
          a.cancel();
        });
        result.revert();
        throw error;
      }
      let release = () => {};
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      const handle = animationGroup(
        animations,
        () => {
          document.removeEventListener('visibilitychange', visibility);
          media?.removeEventListener?.('change', preference);
          result.revert();
          release();
        },
        true
      );
      const visibility = () => animations.forEach((a) => (document.hidden ? a.pause() : a.play()));
      const preference = () => {
        if (media?.matches) handle.cancel();
      };
      release = ownEffect(element, handle.cancel);
      document.addEventListener('visibilitychange', visibility);
      media?.addEventListener?.('change', preference);
      visibility();
      return handle;
    },
    'loop'
  );
}
