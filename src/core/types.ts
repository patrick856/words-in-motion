/**
 * Target element(s) for animation functions.
 * Can be a CSS selector string or an HTMLElement instance.
 */
export type Target = string | HTMLElement;

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
  /** Pauses the interaction loop and updates. */
  pause: () => void;
  /** Resumes the interaction loop and updates. */
  resume: () => void;
}

/**
 * Common options accepted by typographic animation functions.
 */
export interface BaseOptions {
  /** Total animation duration in milliseconds. Defaults vary by animation. */
  duration?: number;
  /** Initial delay before starting the animation in milliseconds. */
  delay?: number;
  /** CSS easing function string (e.g., 'cubic-bezier(0.16, 1, 0.3, 1)'). */
  easing?: string;
  /** Delay step between staggered elements (chars/words) in milliseconds. */
  stagger?: number;
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
}
