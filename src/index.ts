export type {
  AnimationHandle,
  InteractHandle,
  ScrollTriggerHandle,
  ScrollScrubHandle,
  BaseOptions,
  BaseInteractOptions,
  BaseScrollOptions,
  BaseScrollTriggerOptions,
  BaseScrollScrubOptions,
  Target,
} from './core/types';

export { prefersReducedMotion } from './core/motion';
export { splitChars, splitWords } from './core/split';
export { createInteraction } from './core/interact';
export { createScrollTrigger, createScrollScrub } from './core/scrollHelpers';
export { lerp, clamp, distance, angle, mapRange } from './core/math';
