/**
 * Target element(s) for animation functions.
 * Can be a CSS selector string, an HTMLElement instance, an array of elements, or a NodeList.
 */
export type Target =
  | string
  | HTMLElement
  | (HTMLElement | null | undefined)[]
  | NodeListOf<HTMLElement>
  | HTMLCollectionOf<HTMLElement>;

/**
 * Handle returned by intro, loop, and outro animation functions in words-in-motion.
 */
export interface AnimationHandle {
  /** Promise that resolves when the animation finishes naturally or is canceled. */
  finished: Promise<void>;
  /** Cancels the animation immediately and resets affected elements. */
  cancel: () => void;
}

/**
 * Handle returned by cursor-reactive interact animation functions.
 */
export interface InteractHandle {
  /** Completely destroys the interaction, removes all listeners and observers, and reverts DOM changes. */
  destroy: () => void;
  /** Alias for destroy() to support unified cancellation syntax across all animation handles. */
  cancel?: () => void;
  /** Pauses the interaction loop and updates. */
  pause: () => void;
  /** Resumes the interaction loop and updates. */
  resume: () => void;
}

/**
 * Handle returned by scroll trigger animations (plays on viewport enter).
 */
export interface ScrollTriggerHandle {
  /** Promise that resolves when the trigger animation finishes naturally or is canceled. */
  finished: Promise<void>;
  /** Cancels the active trigger animation. */
  cancel: () => void;
  /** Completely destroys the trigger observer and reverts DOM changes. */
  destroy: () => void;
}

/**
 * Handle returned by scroll scrub animations (progress tied directly to scroll position).
 */
export interface ScrollScrubHandle {
  /** Completely destroys the scrub observer and scroll listeners, and reverts DOM changes. */
  destroy: () => void;
  /** Pauses progress updates. */
  pause: () => void;
  /** Resumes progress updates. */
  resume: () => void;
}

/**
 * Options controlling scroll-based activation of intro, outro, and trigger animations.
 */
export interface TriggerOptions {
  /**
   * Animation trigger mode:
   * - 'immediate': runs as soon as called (default).
   * - 'enter': starts when element reaches `start` scroll position.
   * - 'leave': starts when element reaches `start` scroll position while leaving viewport.
   * @default 'immediate'
   */
  trigger?: 'immediate' | 'enter' | 'leave';

  /**
   * Scroll trigger position string in format "[element anchor] [viewport anchor]".
   * Supported element anchors: 'top', 'center', 'bottom'.
   * Supported viewport anchors: 'top', 'center', 'bottom', percentage (e.g. '80%'), or pixels (e.g. '100px').
   * Defaults to "top 80%" for enter, "bottom 20%" for leave.
   */
  start?: string;

  /**
   * Whether the animation triggers only once (true) or can re-trigger when re-crossing the threshold (false).
   * @default true
   */
  once?: boolean;
}

/**
 * Common options accepted by typographic animation functions.
 */
export interface BaseOptions extends TriggerOptions {
  /** Total animation duration in milliseconds. Defaults vary by animation. */
  duration?: number;
  /** Initial delay before starting the animation in milliseconds. */
  delay?: number;
  /** CSS easing function string (e.g., 'cubic-bezier(0.16, 1, 0.3, 1)'). */
  easing?: string;
  /** Delay step between staggered elements (chars/words) in milliseconds. */
  stagger?: number;
  /**
   * When true (default), restores the target's original innerHTML and aria-label
   * after the animation completes naturally. When false, the final visual state persists.
   * @default true
   */
  revertOnFinish?: boolean;
}

/**
 * Common options accepted by cursor-reactive interact animation functions.
 */
export interface BaseInteractOptions {
  /** Radius of influence in pixels. Defaults to 150. */
  radius?: number;
  /** Effect strength multiplier. Defaults to 1. */
  strength?: number;
  /** Interpolation / lerp easing factor between 0 and 1. Defaults to 0.1. */
  easing?: number;
  /** Touch device behavior mode. Defaults to 'follow'. */
  touch?: 'follow' | 'tap' | 'none';
  /** Whether to respect user prefers-reduced-motion preference. Defaults to true. */
  respectReducedMotion?: boolean;
  /**
   * Pointer activation area.
   * - 'viewport': pointer is tracked globally; characters react when within radius anywhere in viewport (default).
   * - 'target': pointer is only active while inside the target element's bounding box.
   * @default 'viewport'
   */
  pointerArea?: 'viewport' | 'target';
}

/**
 * Common options accepted by scroll-based animations and effects.
 */
export interface BaseScrollOptions {
  /** Viewport start trigger position (e.g. "top 80%"). Defaults to "top 80%". */
  start?: string;
  /** Viewport end trigger position (e.g. "top 20%"). Defaults to "top 20%". */
  end?: string;
  /** Intersection threshold ratio (0..1). Defaults to 0. */
  threshold?: number;
  /** Whether to respect user prefers-reduced-motion preference. Defaults to true. */
  respectReducedMotion?: boolean;
}

/**
 * Options accepted by scroll trigger mode animations.
 */
export interface BaseScrollTriggerOptions extends BaseScrollOptions, BaseOptions {
  /** Whether the animation should re-trigger every time the element enters the viewport instead of playing once. Defaults to false. */
  repeat?: boolean;
  /** Alias for repeat = false. If true, animation triggers only once. Defaults to true. */
  once?: boolean;
}

/**
 * Options accepted by scroll scrub mode animations.
 */
export interface BaseScrollScrubOptions extends BaseScrollOptions {
  /** Smoothing lerp factor for scrub progress (0..1). 1 means instant scroll tracking. Defaults to 1. */
  smooth?: number;
}

/**
 * Options accepted by scroll scrub animations (progress tied directly to scroll position).
 */
export type ScrollScrubOptions = BaseScrollScrubOptions;

