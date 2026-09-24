/**
 * Target element(s) for animation functions.
 * Can be a CSS selector string or an HTMLElement instance.
 */
export type Target = string | HTMLElement;

/**
 * Handle returned by every animation function in words-in-motion.
 */
export interface AnimationHandle {
  /** Promise that resolves when the animation finishes naturally or is canceled. */
  finished: Promise<void>;
  /** Cancels the animation immediately and resets affected elements. */
  cancel: () => void;
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
