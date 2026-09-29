import type { AnimationHandle, Target } from '../core/types';
import { runLoop, type LoopOptions } from './shared';
export type ShimmerOptions = LoopOptions;
/** A restrained light sweep that retains the site's text color. */
export function shimmer(target: Target, options?: ShimmerOptions): AnimationHandle {
  return runLoop(target, options, 2800, (a) => [
    { offset: 0, opacity: 1 },
    { offset: 0.25, opacity: 1, easing: 'ease-in-out' },
    { offset: 0.45, opacity: Math.max(0.35, 1 - a * 0.4), easing: 'ease-in-out' },
    { offset: 0.7, opacity: 1 },
    { offset: 1, opacity: 1 },
  ]);
}
