import type { AnimationHandle, Target } from '../core/types';
import { runLoop, type LoopOptions } from './shared';
export type BreatheOptions = LoopOptions;
/** A soft expansion followed by a longer exhale and a readable resting beat. */
export function breathe(target: Target, options?: BreatheOptions): AnimationHandle {
  return runLoop(target, { by: 'words', stagger: 100, ...options }, 3600, (a) => [
    { offset: 0, transform: 'scale(1)', easing: 'cubic-bezier(0.45,0,0.55,1)' },
    { offset: 0.4, transform: `scale(${1 + 0.045 * a})`, easing: 'cubic-bezier(0.45,0,0.55,1)' },
    { offset: 0.9, transform: 'scale(1)' },
    { offset: 1, transform: 'scale(1)' },
  ]);
}
