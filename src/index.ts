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
  ScrollScrubOptions,
  TriggerOptions,
  Target,
} from './core/types';

export { prefersReducedMotion, resolveElements } from './core/motion';
export { parseScrollAnchor } from './core/scroll';
export { splitChars, splitWords } from './core/split';
export { createInteraction } from './core/interact';
export { createScrollTrigger, createScrollScrub } from './core/scrollHelpers';
export { lerp, clamp, distance, angle, mapRange } from './core/math';

